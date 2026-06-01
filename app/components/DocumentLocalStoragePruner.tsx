import { useEffect } from "react";
import { pruneDocumentLocalStorage } from "~/utilities/pruneDocumentLocalStorage";

export function DocumentLocalStoragePruner({
  retentionMs,
}: {
  retentionMs?: number;
}) {
  useEffect(() => {
    if (retentionMs == null || retentionMs <= 0) {
      return;
    }

    pruneDocumentLocalStorage(retentionMs);
  }, [retentionMs]);

  return null;
}
