import {
  buildCreatePutOptions,
  buildUpdatePutOptions,
  isDocumentExpired,
  parseEnvTtlSeconds,
  resolveDocumentTtlSeconds,
} from "../app/documentTtl.server";

describe("parseEnvTtlSeconds", () => {
  it("returns undefined for empty values", () => {
    expect(parseEnvTtlSeconds(undefined)).toBeUndefined();
    expect(parseEnvTtlSeconds("")).toBeUndefined();
    expect(parseEnvTtlSeconds("0")).toBeUndefined();
  });

  it("enforces minimum ttl of 60 seconds", () => {
    expect(parseEnvTtlSeconds("30")).toBe(60);
    expect(parseEnvTtlSeconds("120")).toBe(120);
  });
});

describe("resolveDocumentTtlSeconds", () => {
  it("prefers explicit ttl over default", () => {
    expect(resolveDocumentTtlSeconds(3600)).toBe(3600);
    expect(resolveDocumentTtlSeconds(10)).toBe(60);
  });
});

describe("buildCreatePutOptions", () => {
  it("sets expirationTtl and expiresAt metadata when ttl is provided", () => {
    const now = 1_700_000_000;
    jest.spyOn(Date, "now").mockReturnValue(now * 1000);

    const options = buildCreatePutOptions(3600);

    expect(options.expirationTtl).toBe(3600);
    expect(options.metadata?.expiresAt).toBe(now + 3600);

    jest.restoreAllMocks();
  });

  it("omits expiration when ttl is not provided", () => {
    const options = buildCreatePutOptions(undefined);

    expect(options.expirationTtl).toBeUndefined();
    expect(options.expiration).toBeUndefined();
    expect(options.metadata?.expiresAt).toBeUndefined();
  });
});

describe("buildUpdatePutOptions", () => {
  it("preserves absolute expiration when document is not expired", () => {
    const now = 1_700_000_000;
    jest.spyOn(Date, "now").mockReturnValue(now * 1000);

    const options = buildUpdatePutOptions({ expiresAt: now + 7200 });

    expect(options.expiration).toBe(now + 7200);
    expect(options.expirationTtl).toBeUndefined();

    jest.restoreAllMocks();
  });
});

describe("isDocumentExpired", () => {
  it("detects expired metadata and kv expiration", () => {
    const now = 1_700_000_000;
    jest.spyOn(Date, "now").mockReturnValue(now * 1000);

    expect(isDocumentExpired({ expiresAt: now - 1 })).toBe(true);
    expect(isDocumentExpired({ expiresAt: now + 60 })).toBe(false);
    expect(isDocumentExpired(undefined, now - 1)).toBe(true);
    expect(isDocumentExpired(undefined, now + 60)).toBe(false);

    jest.restoreAllMocks();
  });
});
