import {
  documentBodyKey,
  documentIdFromBodyKey,
  isDocumentBodyKey,
  legacyDocumentBodyKey,
} from "./documentKeys.server";
import {
  buildCreatePutOptions,
  buildUpdatePutOptions,
  DocumentKvMetadata,
  isDocumentExpired,
  resolveDocumentTtlSeconds,
} from "./documentTtl.server";

export type DocumentPutInput = {
  ttl?: number;
  metadata?: DocumentKvMetadata;
};

async function putKvValue(
  key: string,
  value: string,
  putOptions: ReturnType<typeof buildCreatePutOptions>
): Promise<void> {
  await DOCUMENTS.put(key, value, putOptions);
}

export async function putDocument(
  key: string,
  value: string,
  options?: DocumentPutInput
): Promise<void> {
  const ttl = resolveDocumentTtlSeconds(options?.ttl);
  const putOptions = buildCreatePutOptions(ttl, options?.metadata);

  await putKvValue(key, value, putOptions);
}

export async function putDocumentBody(
  documentId: string,
  contents: string,
  options?: DocumentPutInput
): Promise<void> {
  const ttl = resolveDocumentTtlSeconds(options?.ttl);
  const putOptions = buildCreatePutOptions(ttl, options?.metadata);

  await putKvValue(documentBodyKey(documentId), contents, putOptions);
}

export async function updateDocumentValue(
  key: string,
  value: string
): Promise<void> {
  const { metadata } = await DOCUMENTS.getWithMetadata<DocumentKvMetadata>(
    key
  );
  const putOptions = buildUpdatePutOptions(metadata);

  await DOCUMENTS.put(key, value, putOptions);
}

export async function updateDocumentBody(
  documentId: string,
  contents: string
): Promise<void> {
  const key = documentBodyKey(documentId);
  const { metadata } = await DOCUMENTS.getWithMetadata<DocumentKvMetadata>(
    key
  );
  const putOptions = buildUpdatePutOptions(metadata);

  await DOCUMENTS.put(key, contents, putOptions);
}

export async function deleteDocumentKeys(documentId: string): Promise<void> {
  await Promise.all([
    DOCUMENTS.delete(documentId),
    DOCUMENTS.delete(documentBodyKey(documentId)),
    DOCUMENTS.delete(legacyDocumentBodyKey(documentId)),
  ]);
}

export async function cleanupExpiredDocuments(): Promise<{ deleted: number }> {
  let deleted = 0;
  let cursor: string | undefined;

  do {
    const list = await DOCUMENTS.list({ cursor });

    for (const { name, expiration } of list.keys) {
      if (isDocumentBodyKey(name)) {
        const parentId = documentIdFromBodyKey(name);
        const parent = await DOCUMENTS.get(parentId);

        if (!parent) {
          await DOCUMENTS.delete(name);
          deleted++;
        }

        continue;
      }

      const { metadata } = await DOCUMENTS.getWithMetadata<DocumentKvMetadata>(
        name
      );

      if (isDocumentExpired(metadata, expiration)) {
        await DOCUMENTS.delete(name);
        await DOCUMENTS.delete(documentBodyKey(name));
        await DOCUMENTS.delete(legacyDocumentBodyKey(name));
        deleted++;
      }
    }

    cursor = list.list_complete ? undefined : list.cursor;
  } while (cursor);

  return { deleted };
}
