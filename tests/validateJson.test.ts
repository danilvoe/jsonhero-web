import { assertValidJson } from "../app/utilities/validateJson";

describe("assertValidJson", () => {
  it("throws on invalid JSON by default", () => {
    expect(() => assertValidJson("{not json")).toThrow(SyntaxError);
  });

  it("throws on empty content", () => {
    expect(() => assertValidJson("")).toThrow("Document content is empty");
    expect(() => assertValidJson("   ")).toThrow("Document content is empty");
  });

  it("skips syntax validation when validateSyntax is false", () => {
    expect(() =>
      assertValidJson("{not json", { validateSyntax: false })
    ).not.toThrow();
  });
});
