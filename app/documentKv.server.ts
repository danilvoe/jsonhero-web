import {
  buildCreatePutOptions,
  buildUpdatePutOptions,
  DocumentKvMetadata,
  isDocumentExpired,
  nowUnixSeconds,
  resolveDocumentTtlSeconds,
} from "./documentTtl.server";

export async function putDocument(
  key: string,
  value: string,
  options?: { ttl?: number; metadata?: DocumentKvMetadata }
): Promise<void> {
  const ttl = resolveDocumentTtlSeconds(options?.ttl);
  const putOptions = buildCreatePutOptions(ttl, options?.metadata);

  await DOCUMENTS.put(key, value, putOptions);
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

export async function cleanupExpiredDocuments(): Promise<{ deleted: number }> {
  let deleted = 0;
  let cursor: string | undefined;

  do {
    const list = await DOCUMENTS.list({ cursor });

    for (const { name, expiration } of list.keys) {
      const { metadata } = await DOCUMENTS.getWithMetadata<DocumentKvMetadata>(
        name
      );

      if (isDocumentExpired(metadata, expiration)) {
        await DOCUMENTS.delete(name);
        deleted++;
      }
    }

    cursor = list.list_complete ? undefined : list.cursor;
  } while (cursor);

  return { deleted };
}
