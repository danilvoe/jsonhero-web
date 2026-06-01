import {
  InvalidPathError,
  pathExists,
  setValueAtPath,
} from "../app/utilities/setValueAtPath";

describe("setValueAtPath", () => {
  const json = {
    string: "foo",
    count: 1,
    active: true,
    empty: null,
    "a.b": "escaped",
    data: { nested: "value" },
    users: [{ name: "Alice" }, { name: "Bob" }],
  };

  test("replaces root document", () => {
    expect(setValueAtPath(json, "$", { replaced: true })).toEqual({
      replaced: true,
    });
  });

  test("updates nested object property", () => {
    expect(setValueAtPath(json, "$.data.nested", "updated")).toEqual({
      ...json,
      data: { nested: "updated" },
    });
  });

  test("updates array element property", () => {
    expect(setValueAtPath(json, "$.users.0.name", "Charlie")).toEqual({
      ...json,
      users: [{ name: "Charlie" }, { name: "Bob" }],
    });
  });

  test("updates scalar values", () => {
    expect(setValueAtPath(json, "$.string", "bar")).toEqual({
      ...json,
      string: "bar",
    });
    expect(setValueAtPath(json, "$.count", 42)).toEqual({
      ...json,
      count: 42,
    });
    expect(setValueAtPath(json, "$.active", false)).toEqual({
      ...json,
      active: false,
    });
    expect(setValueAtPath(json, "$.empty", "filled")).toEqual({
      ...json,
      empty: "filled",
    });
  });

  test("updates escaped key", () => {
    expect(setValueAtPath(json, "$.a\\.b", "new")).toEqual({
      ...json,
      "a.b": "new",
    });
  });

  test("does not mutate original json", () => {
    const original = { data: { value: 1 } };
    const copy = { data: { value: 1 } };
    setValueAtPath(original, "$.data.value", 2);
    expect(original).toEqual(copy);
  });

  test("throws for invalid paths", () => {
    expect(() => setValueAtPath(json, "$.missing", "x")).toThrow(
      InvalidPathError
    );
    expect(() => setValueAtPath(json, "$.users.99.name", "x")).toThrow(
      InvalidPathError
    );
  });
});

describe("pathExists", () => {
  const json = { a: null, b: { c: 1 } };

  test("returns true for existing paths including null values", () => {
    expect(pathExists(json, "$")).toBe(true);
    expect(pathExists(json, "$.a")).toBe(true);
    expect(pathExists(json, "$.b.c")).toBe(true);
  });

  test("returns false for missing paths", () => {
    expect(pathExists(json, "$.missing")).toBe(false);
    expect(pathExists(json, "$.b.d")).toBe(false);
  });
});
