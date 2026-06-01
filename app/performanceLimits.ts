/** Containers with more children than this use lazy loading and virtualized columns. */
export const LARGE_CONTAINER_CHILD_COUNT = 250;

export function containerChildCount(value: unknown): number {
  if (Array.isArray(value)) {
    return value.length;
  }

  if (value !== null && typeof value === "object") {
    return Object.keys(value as object).length;
  }

  return 0;
}

export function isLargeContainer(value: unknown): boolean {
  return containerChildCount(value) > LARGE_CONTAINER_CHILD_COUNT;
}
