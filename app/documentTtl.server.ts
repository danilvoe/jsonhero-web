export const MIN_DOCUMENT_TTL_SECONDS = 60;

export type DocumentKvMetadata = {
  expiresAt?: number;
  [key: string]: unknown;
};

export function parseEnvTtlSeconds(
  value: string | undefined
): number | undefined {
  if (value == null || value === "") {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return Math.max(MIN_DOCUMENT_TTL_SECONDS, parsed);
}

export function getDefaultDocumentTtlSeconds(): number | undefined {
  return parseEnvTtlSeconds(
    typeof DOCUMENT_DEFAULT_TTL !== "undefined"
      ? DOCUMENT_DEFAULT_TTL
      : undefined
  );
}

export function resolveDocumentTtlSeconds(
  explicitTtl?: number
): number | undefined {
  if (explicitTtl != null) {
    return Math.max(MIN_DOCUMENT_TTL_SECONDS, explicitTtl);
  }

  return getDefaultDocumentTtlSeconds();
}

export function nowUnixSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export type DocumentPutOptions = {
  expirationTtl?: number;
  expiration?: number;
  metadata?: DocumentKvMetadata;
};

export function buildCreatePutOptions(
  ttlSeconds: number | undefined,
  existingMetadata?: DocumentKvMetadata | null
): DocumentPutOptions {
  const metadata: DocumentKvMetadata = { ...(existingMetadata ?? {}) };

  if (ttlSeconds == null) {
    delete metadata.expiresAt;
    return {
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    };
  }

  metadata.expiresAt = nowUnixSeconds() + ttlSeconds;

  return {
    expirationTtl: ttlSeconds,
    metadata,
  };
}

export function buildUpdatePutOptions(
  existingMetadata?: DocumentKvMetadata | null
): DocumentPutOptions {
  const now = nowUnixSeconds();
  const metadata: DocumentKvMetadata = { ...(existingMetadata ?? {}) };

  if (metadata.expiresAt != null && metadata.expiresAt > now) {
    return {
      expiration: metadata.expiresAt,
      metadata,
    };
  }

  const defaultTtl = getDefaultDocumentTtlSeconds();

  if (defaultTtl != null) {
    return buildCreatePutOptions(defaultTtl, metadata);
  }

  delete metadata.expiresAt;

  return {
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  };
}

export function isDocumentExpired(
  metadata: DocumentKvMetadata | null | undefined,
  keyExpiration?: number | null
): boolean {
  const now = nowUnixSeconds();

  if (keyExpiration != null && keyExpiration <= now) {
    return true;
  }

  const expiresAt = metadata?.expiresAt;

  return expiresAt != null && expiresAt <= now;
}
