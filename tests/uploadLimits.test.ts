import { isLargeDocument, LARGE_DOC_CLIENT_BYTES } from "../app/uploadLimits";

describe("isLargeDocument", () => {
  it("returns true for raw documents above the client threshold", () => {
    expect(
      isLargeDocument({
        type: "raw",
        contentBytes: LARGE_DOC_CLIENT_BYTES + 1,
      })
    ).toBe(true);
  });

  it("returns false for url documents and small raw documents", () => {
    expect(
      isLargeDocument({
        type: "url",
        contentBytes: LARGE_DOC_CLIENT_BYTES + 1,
      })
    ).toBe(false);

    expect(
      isLargeDocument({
        type: "raw",
        contentBytes: LARGE_DOC_CLIENT_BYTES,
      })
    ).toBe(false);
  });
});
