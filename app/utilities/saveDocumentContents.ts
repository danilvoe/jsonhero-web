export type SaveDocumentContentsResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveDocumentContents(
  docId: string,
  contents: string,
  signal?: AbortSignal
): Promise<SaveDocumentContentsResult> {
  const response = await fetch(`/actions/${docId}/update-contents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Jsonhero-Save": "1",
    },
    body: contents,
    signal,
  });

  let data: { error?: string } | null = null;

  try {
    const text = await response.text();

    if (text.trim() !== "") {
      data = JSON.parse(text) as { error?: string };
    }
  } catch {
    return {
      ok: false,
      error: "Save failed: invalid server response",
    };
  }

  if (!response.ok || data?.error) {
    return {
      ok: false,
      error: data?.error ?? `Save failed (HTTP ${response.status})`,
    };
  }

  return { ok: true };
}
