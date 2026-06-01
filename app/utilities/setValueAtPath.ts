import { JSONHeroPath } from "@jsonhero/path";
import { cloneDeep } from "lodash-es";

export class InvalidPathError extends Error {
  constructor(path: string) {
    super(`Invalid path: ${path}`);
    this.name = "InvalidPathError";
  }
}

export function pathExists(json: unknown, path: string): boolean {
  if (path === "$") {
    return true;
  }

  return new JSONHeroPath(path).first(json) !== undefined;
}

export function setValueAtPath(
  json: unknown,
  path: string,
  value: unknown
): unknown {
  if (path === "$") {
    return value;
  }

  const heroPath = new JSONHeroPath(path);
  const segments = heroPath.jsonPointer().split("/").filter(Boolean);

  if (segments.length === 0) {
    return value;
  }

  if (!pathExists(json, path)) {
    throw new InvalidPathError(path);
  }

  const result = cloneDeep(json);
  let current: unknown = result;

  for (const segment of segments.slice(0, -1)) {
    current = getSegmentChild(current, segment, path);
  }

  setSegmentChild(current, segments[segments.length - 1], value, path);

  return result;
}

function getSegmentChild(
  current: unknown,
  segment: string,
  path: string
): unknown {
  if (Array.isArray(current)) {
    const index = parseInt(segment, 10);
    if (Number.isNaN(index) || index < 0 || index >= current.length) {
      throw new InvalidPathError(path);
    }
    return current[index];
  }

  if (current != null && typeof current === "object") {
    if (!(segment in current)) {
      throw new InvalidPathError(path);
    }
    return (current as Record<string, unknown>)[segment];
  }

  throw new InvalidPathError(path);
}

function setSegmentChild(
  current: unknown,
  segment: string,
  value: unknown,
  path: string
): void {
  if (Array.isArray(current)) {
    const index = parseInt(segment, 10);
    if (Number.isNaN(index) || index < 0 || index >= current.length) {
      throw new InvalidPathError(path);
    }
    current[index] = value;
    return;
  }

  if (current != null && typeof current === "object") {
    (current as Record<string, unknown>)[segment] = value;
    return;
  }

  throw new InvalidPathError(path);
}
