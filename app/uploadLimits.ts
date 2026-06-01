/** Max JSON upload size (KV value limit is 25 MiB; body is stored separately). */
export const MAX_JSON_UPLOAD_BYTES = 20 * 1024 * 1024;

/** Above this size, JSON is loaded on the client (avoids huge HTML responses). */
export const LARGE_DOC_CLIENT_BYTES = 1024 * 1024;

export function isLargeDocument(doc: {
  type: string;
  contentBytes?: number;
}): boolean {
  return doc.type === "raw" && (doc.contentBytes ?? 0) > LARGE_DOC_CLIENT_BYTES;
}

const IMPORT_JSON_STORAGE_PREFIX = "jsonhero-import:";

export function importJsonStorageKey(docId: string): string {
  return `${IMPORT_JSON_STORAGE_PREFIX}${docId}`;
}
