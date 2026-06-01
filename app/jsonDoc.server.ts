import { customRandom } from "nanoid";
import {
  documentBodyKey,
  legacyDocumentBodyKey,
} from "./documentKeys.server";
import {
  deleteDocumentKeys,
  putDocument,
  putDocumentBody,
  updateDocumentBody,
  updateDocumentValue,
} from "./documentKv.server";
import safeFetch from "./utilities/safeFetch";
import { LARGE_DOC_CLIENT_BYTES } from "./uploadLimits";
import { assertValidJson, jsonByteLength } from "./utilities/validateJson";
import createFromRawXml from "./utilities/xml/createFromRawXml";
import isXML from "./utilities/xml/isXML";

type BaseJsonDocument = {
  id: string;
  title: string;
  readOnly: boolean;
};

/** Metadata stored in KV (no JSON body). */
export type RawJsonDocumentMeta = BaseJsonDocument & {
  type: "raw";
  contentBytes: number;
};

export type UrlJsonDocument = BaseJsonDocument & {
  type: "url";
  url: string;
};

/** Full raw document including body (API responses, legacy reads). */
export type RawJsonDocument = RawJsonDocumentMeta & {
  contents: string;
};

export type JSONDocumentMeta = RawJsonDocumentMeta | UrlJsonDocument;
export type JSONDocument = RawJsonDocument | UrlJsonDocument;

export type CreateJsonOptions = {
  ttl?: number;
  readOnly?: boolean;
  injest?: boolean;
  metadata?: any;
};

type LegacyStoredRawDocument = BaseJsonDocument & {
  type: "raw";
  contents?: string;
  contentBytes?: number;
};

function isLegacyRawDocument(
  doc: LegacyStoredRawDocument
): doc is LegacyStoredRawDocument & { contents: string } {
  return doc.type === "raw" && typeof doc.contents === "string";
}

function toRawMeta(
  doc: LegacyStoredRawDocument & { contents: string }
): RawJsonDocumentMeta {
  return {
    id: doc.id,
    title: doc.title,
    readOnly: doc.readOnly,
    type: "raw",
    contentBytes:
      doc.contentBytes ?? jsonByteLength(doc.contents),
  };
}

export async function createFromUrlOrRawJson(
  urlOrJson: string,
  title?: string
): Promise<JSONDocument | undefined> {
  if (isUrl(urlOrJson)) {
    return createFromUrl(new URL(urlOrJson), title);
  }

  if (isJSON(urlOrJson)) {
    return createFromRawJson("Untitled", urlOrJson);
  }

  if (isXML(urlOrJson)) {
    return createFromRawXml("Untitled", urlOrJson);
  }
}

export async function createFromUrl(
  url: URL,
  title?: string,
  options?: CreateJsonOptions
): Promise<JSONDocument> {
  if (options?.injest) {
    const response = await safeFetch(url.href);

    if (!response.ok) {
      throw new Error(`Failed to injest ${url.href}`);
    }

    return createFromRawJson(title || url.href, await response.text(), options);
  }

  const docId = createId();

  const doc: UrlJsonDocument = {
    id: docId,
    type: <const>"url",
    url: url.href,
    title: title ?? url.hostname,
    readOnly: options?.readOnly ?? false,
  };

  await putDocument(docId, JSON.stringify(doc), {
    ttl: options?.ttl,
    metadata: options?.metadata,
  });

  return doc;
}

export async function createFromRawJson(
  filename: string,
  contents: string,
  options?: CreateJsonOptions
): Promise<RawJsonDocument> {
  const contentBytes = jsonByteLength(contents);

  assertValidJson(contents, {
    validateSyntax: contentBytes <= LARGE_DOC_CLIENT_BYTES,
  });

  const docId = createId();
  const meta: RawJsonDocumentMeta = {
    id: docId,
    type: <const>"raw",
    title: filename,
    readOnly: options?.readOnly ?? false,
    contentBytes,
  };

  const putOptions = {
    ttl: options?.ttl,
    metadata: options?.metadata,
  };

  await Promise.all([
    putDocument(docId, JSON.stringify(meta), putOptions),
    putDocumentBody(docId, contents, putOptions),
  ]);

  return { ...meta, contents };
}

export async function getDocumentMeta(
  slug: string
): Promise<JSONDocumentMeta | undefined> {
  const stored = await DOCUMENTS.get(slug);

  if (!stored) {
    return undefined;
  }

  const parsed = JSON.parse(stored) as JSONDocumentMeta | LegacyStoredRawDocument;

  if (parsed.type === "raw" && isLegacyRawDocument(parsed)) {
    return toRawMeta(parsed);
  }

  return parsed as JSONDocumentMeta;
}

/** @deprecated Prefer getDocumentMeta + getDocumentContents for large docs. */
export async function getDocument(
  slug: string
): Promise<JSONDocument | undefined> {
  const meta = await getDocumentMeta(slug);

  if (!meta) {
    return undefined;
  }

  if (meta.type === "url") {
    return meta;
  }

  const contents = await getDocumentContents(slug);

  if (contents == null) {
    return undefined;
  }

  return { ...meta, contents };
}

export async function getDocumentContents(
  slug: string
): Promise<string | undefined> {
  const body =
    (await DOCUMENTS.get(documentBodyKey(slug))) ??
    (await DOCUMENTS.get(legacyDocumentBodyKey(slug)));

  if (body != null) {
    return body;
  }

  const stored = await DOCUMENTS.get(slug);

  if (!stored) {
    return undefined;
  }

  const parsed = JSON.parse(stored) as LegacyStoredRawDocument;

  if (isLegacyRawDocument(parsed)) {
    return parsed.contents;
  }

  return undefined;
}

export async function updateDocument(
  slug: string,
  title: string
): Promise<JSONDocumentMeta | undefined> {
  const document = await getDocumentMeta(slug);

  if (!document) {
    return undefined;
  }

  const updated = { ...document, title };

  await updateDocumentValue(slug, JSON.stringify(updated));

  return updated;
}

export async function updateDocumentContents(
  slug: string,
  contents: string
): Promise<RawJsonDocument | undefined> {
  const document = await getDocumentMeta(slug);

  if (!document) {
    return undefined;
  }

  if (document.readOnly) {
    throw new Error("Document is read-only");
  }

  if (document.type !== "raw") {
    throw new Error("Only uploaded JSON documents can be saved");
  }

  assertValidJson(contents);

  const contentBytes = jsonByteLength(contents);
  const updatedMeta: RawJsonDocumentMeta = { ...document, contentBytes };

  await Promise.all([
    updateDocumentValue(slug, JSON.stringify(updatedMeta)),
    updateDocumentBody(slug, contents),
  ]);

  return { ...updatedMeta, contents };
}

export async function deleteDocument(slug: string): Promise<void> {
  await deleteDocumentKeys(slug);
}

function createId(): string {
  const nanoid = customRandom(
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
    12,
    (bytes: number): Uint8Array => {
      const array = new Uint8Array(bytes);
      crypto.getRandomValues(array);
      return array;
    }
  );
  return nanoid();
}

function isUrl(possibleUrl: string): boolean {
  try {
    new URL(possibleUrl);
    return true;
  } catch {
    return false;
  }
}

function isJSON(possibleJson: string): boolean {
  try {
    JSON.parse(possibleJson);
    return true;
  } catch (e: any) {
    throw new Error(e.message);
  }
}
