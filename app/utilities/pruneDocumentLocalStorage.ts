const DOCUMENT_ID_PATTERN = /^[0-9A-Za-z]{12}$/;
const VIRTUAL_TREE_KEY_PATTERN = /^[0-9A-Za-z]{12}-virtual-tree-state$/;

type StoredUiState = {
  updatedAt?: number;
};

function isDocumentStorageKey(key: string): boolean {
  return (
    DOCUMENT_ID_PATTERN.test(key) || VIRTUAL_TREE_KEY_PATTERN.test(key)
  );
}

function readUpdatedAt(key: string, raw: string): number | undefined {
  try {
    const parsed = JSON.parse(raw) as StoredUiState;
    if (typeof parsed.updatedAt === "number") {
      return parsed.updatedAt;
    }
  } catch {
    // Non-JSON values are not pruned (legacy keys stay until manual clear).
  }

  return undefined;
}

/** Removes browser UI state for documents older than `maxAgeMs`. */
export function pruneDocumentLocalStorage(maxAgeMs: number): void {
  if (typeof localStorage === "undefined" || maxAgeMs <= 0) {
    return;
  }

  const cutoff = Date.now() - maxAgeMs;
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);

    if (key == null || !isDocumentStorageKey(key)) {
      continue;
    }

    const raw = localStorage.getItem(key);

    if (raw == null) {
      continue;
    }

    const updatedAt = readUpdatedAt(key, raw);

    if (updatedAt != null && updatedAt < cutoff) {
      keysToRemove.push(key);
    }
  }

  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }
}
