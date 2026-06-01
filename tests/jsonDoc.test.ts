import { webcrypto } from "crypto";
import { documentBodyKey } from "../app/documentKeys.server";
import { LARGE_DOC_CLIENT_BYTES } from "../app/uploadLimits";
import {
  createFromRawJson,
  getDocumentContents,
  getDocumentMeta,
  updateDocumentContents,
} from "../app/jsonDoc.server";

type KvEntry = {
  value: string;
  metadata?: Record<string, unknown>;
  expiration?: number;
};

function createMockKv(initial: Record<string, KvEntry> = {}) {
  const store = new Map<string, KvEntry>(Object.entries(initial));

  const kv = {
    get: async (key: string) => store.get(key)?.value ?? null,
    getWithMetadata: async (key: string) => {
      const entry = store.get(key);

      return {
        value: entry?.value ?? null,
        metadata: entry?.metadata ?? null,
      };
    },
    put: async (
      key: string,
      value: string,
      options?: {
        metadata?: Record<string, unknown>;
        expiration?: number;
        expirationTtl?: number;
      }
    ) => {
      store.set(key, {
        value,
        metadata: options?.metadata,
        expiration: options?.expiration,
      });
    },
    delete: async (key: string) => {
      store.delete(key);
    },
    list: async () => ({
      keys: [...store.keys()].map((name) => ({
        name,
        expiration: store.get(name)?.expiration,
      })),
      list_complete: true,
    }),
  } as unknown as KVNamespace;

  return { kv, store };
}

describe("jsonDoc split storage", () => {
  beforeEach(() => {
    Object.defineProperty(global, "crypto", {
      value: webcrypto,
      configurable: true,
    });

    const { kv } = createMockKv();
    (global as typeof globalThis & { DOCUMENTS: KVNamespace }).DOCUMENTS = kv;
  });

  it("stores metadata and body in separate keys", async () => {
    const doc = await createFromRawJson("test.json", '{"a":1}');

    expect(doc.contentBytes).toBeGreaterThan(0);

    const meta = await getDocumentMeta(doc.id);

    expect(meta).toMatchObject({
      id: doc.id,
      type: "raw",
      title: "test.json",
      contentBytes: doc.contentBytes,
    });
    expect(meta && "contents" in meta).toBe(false);

    const contents = await getDocumentContents(doc.id);

    expect(contents).toBe('{"a":1}');
  });

  it("reads legacy documents with inline contents", async () => {
    const legacy = {
      id: "legacy12",
      type: "raw" as const,
      title: "legacy.json",
      readOnly: false,
      contents: '{"legacy":true}',
    };

    const { kv } = createMockKv({
      legacy12: { value: JSON.stringify(legacy) },
    });
    (global as typeof globalThis & { DOCUMENTS: KVNamespace }).DOCUMENTS = kv;

    const meta = await getDocumentMeta("legacy12");

    expect(meta).toMatchObject({
      id: "legacy12",
      contentBytes: expect.any(Number),
    });

    const contents = await getDocumentContents("legacy12");

    expect(contents).toBe('{"legacy":true}');
    expect(documentBodyKey("legacy12")).toBe("legacy12__body__");
  });

  it("does not parse large JSON on the server during create", async () => {
    const padding = "x".repeat(LARGE_DOC_CLIENT_BYTES + 1);
    const contents = `{"pad":"${padding}"}`;

    const doc = await createFromRawJson("large.json", contents);

    expect(doc.contentBytes).toBeGreaterThan(LARGE_DOC_CLIENT_BYTES);

    const stored = await getDocumentContents(doc.id);

    expect(stored).toBe(contents);
  });

  it("updates document contents in split storage", async () => {
    const doc = await createFromRawJson("test.json", '{"a":1}');

    const updated = await updateDocumentContents(doc.id, '{"a":2,"b":3}');

    expect(updated?.contents).toBe('{"a":2,"b":3}');

    const meta = await getDocumentMeta(doc.id);

    expect(meta).toMatchObject({
      contentBytes: new TextEncoder().encode('{"a":2,"b":3}').byteLength,
    });
    expect(meta && "contents" in meta).toBe(false);

    const stored = await getDocumentContents(doc.id);

    expect(stored).toBe('{"a":2,"b":3}');
  });
});
