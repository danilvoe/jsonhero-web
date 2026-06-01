import { useEffect, useRef, useState } from "react";
import { useJsonDoc } from "~/hooks/useJsonDoc";
import { useJsonEdit } from "~/hooks/useJsonEdit";
import { usePreferences } from "~/components/PreferencesProvider";
import { saveDocumentContents } from "~/utilities/saveDocumentContents";
import { Body } from "./Primitives/Body";

export function JsonEditStatus() {
  const { doc } = useJsonDoc();
  const { isDirty, parseError, getExportText, markSaved } = useJsonEdit();
  const [preferences] = usePreferences();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const saveAbortRef = useRef<AbortController | null>(null);
  const indent = preferences?.indent || 2;

  const canPersist =
    doc.type === "raw" && !doc.readOnly && !parseError && isDirty;

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);

    return () => {
      window.removeEventListener("beforeunload", handler);
    };
  }, [isDirty]);

  useEffect(() => {
    return () => {
      saveAbortRef.current?.abort();
    };
  }, []);

  if (!isDirty) {
    return null;
  }

  const handleSave = async () => {
    if (!canPersist || isSaving) {
      return;
    }

    let contents: string;

    try {
      contents = getExportText(indent);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Cannot export JSON document";
      setSaveError(message);
      return;
    }

    if (contents.trim() === "") {
      setSaveError("Cannot save an empty document");
      return;
    }

    saveAbortRef.current?.abort();
    const controller = new AbortController();
    saveAbortRef.current = controller;

    setSaveError(null);
    setIsSaving(true);

    const result = await saveDocumentContents(doc.id, contents, controller.signal);

    if (controller.signal.aborted) {
      return;
    }

    setIsSaving(false);

    if (!result.ok) {
      setSaveError(result.error);
      return;
    }

    markSaved();
    setSaveError(null);
  };

  return (
    <div className="flex items-center gap-3">
      <Body className="text-amber-800 dark:text-amber-300 whitespace-nowrap">
        {parseError
          ? "Fix JSON errors before saving"
          : canPersist
            ? "Unsaved changes"
            : "Unsaved changes (download to keep a copy)"}
      </Body>
      {canPersist && (
        <button
          type="button"
          onClick={() => {
            void handleSave();
          }}
          disabled={isSaving}
          className="text-lime-700 dark:text-lime-400 font-semibold hover:text-lime-800 dark:hover:text-lime-300 transition disabled:opacity-50"
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
      )}
      {saveError && (
        <Body className="text-red-700 dark:text-red-300 whitespace-nowrap">
          {saveError}
        </Body>
      )}
    </div>
  );
}
