/**
 * Body keys must not contain ":" — Miniflare KV persist maps keys to paths and
 * "docId:body" creates a directory named docId, breaking reads of docId (EISDIR).
 */
const BODY_KEY_SUFFIX = "__body__";

/** Legacy suffix from an earlier split-storage format (filesystem-unsafe). */
const LEGACY_BODY_KEY_SUFFIX = ":body";

export function documentBodyKey(documentId: string): string {
  return `${documentId}${BODY_KEY_SUFFIX}`;
}

export function legacyDocumentBodyKey(documentId: string): string {
  return `${documentId}${LEGACY_BODY_KEY_SUFFIX}`;
}

export function isDocumentBodyKey(key: string): boolean {
  return (
    key.endsWith(BODY_KEY_SUFFIX) || key.endsWith(LEGACY_BODY_KEY_SUFFIX)
  );
}

export function documentIdFromBodyKey(bodyKey: string): string {
  if (bodyKey.endsWith(BODY_KEY_SUFFIX)) {
    return bodyKey.slice(0, -BODY_KEY_SUFFIX.length);
  }

  if (bodyKey.endsWith(LEGACY_BODY_KEY_SUFFIX)) {
    return bodyKey.slice(0, -LEGACY_BODY_KEY_SUFFIX.length);
  }

  return bodyKey;
}
