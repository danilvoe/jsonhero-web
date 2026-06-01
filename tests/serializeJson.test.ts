import { serializeJson } from "../app/utilities/serializeJson";

describe("serializeJson", () => {
  it("serializes objects with json-source-map", () => {
    const text = serializeJson({ a: 1 }, 2);

    expect(text).toContain('"a"');
    expect(JSON.parse(text)).toEqual({ a: 1 });
  });

  it("falls back to native JSON.stringify for unsupported values", () => {
    const text = serializeJson(BigInt(42), 2);

    expect(text).toBe("42");
    expect(JSON.parse(text)).toBe(42);
  });

  it("uses compact native stringify when requested", () => {
    const text = serializeJson({ a: 1 }, 2, { compact: true });

    expect(text).toBe('{"a":1}');
  });

  it("throws for empty output", () => {
    expect(() => serializeJson(undefined, 2)).toThrow(
      "Cannot serialize JSON document"
    );
  });
});
