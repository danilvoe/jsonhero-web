import jsonMap from "json-source-map";

export type SerializeJsonOptions = {
  /** Skip json-source-map (faster and safer for large documents). */
  compact?: boolean;
};

/** Serializes JSON for export/save; falls back to native JSON.stringify. */
export function serializeJson(
  json: unknown,
  indent: number,
  options?: SerializeJsonOptions
): string {
  if (!options?.compact) {
    try {
      const mapped = jsonMap.stringify(json, null, indent).json;

      if (typeof mapped === "string" && mapped.trim() !== "") {
        return mapped;
      }
    } catch {
      // fall through to native stringify
    }
  }

  const native = JSON.stringify(json, null, options?.compact ? 0 : indent);

  if (typeof native !== "string" || native.trim() === "") {
    throw new Error("Cannot serialize JSON document");
  }

  return native;
}
