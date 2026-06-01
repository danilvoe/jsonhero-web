export type AssertValidJsonOptions = {
  /** When false, only size checks elsewhere apply (for large uploads). */
  validateSyntax?: boolean;
};

/** Validates JSON text; throws SyntaxError on invalid input. */
export function assertValidJson(
  contents: string,
  options?: AssertValidJsonOptions
): void {
  if (options?.validateSyntax === false) {
    return;
  }

  if (contents.trim() === "") {
    throw new SyntaxError("Document content is empty");
  }

  JSON.parse(contents);
}

export function jsonByteLength(contents: string): number {
  return new TextEncoder().encode(contents).byteLength;
}
