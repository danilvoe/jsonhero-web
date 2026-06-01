import { useEffect } from "react";
import { useFetcher } from "remix";
import { useJsonDoc } from "~/hooks/useJsonDoc";
import { useJsonEdit } from "~/hooks/useJsonEdit";
import { usePreferences } from "~/components/PreferencesProvider";
import { Body } from "./Primitives/Body";

export function JsonEditStatus() {
  const { doc } = useJsonDoc();
  const { isDirty, parseError, getExportText, markSaved } = useJsonEdit();
  const [preferences] = usePreferences();
  const saveFetcher = useFetcher();
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
    if (saveFetcher.type === "done" && !saveFetcher.data?.error) {
      markSaved();
    }
  }, [saveFetcher.type, saveFetcher.data, markSaved]);

  if (!isDirty) {
    return null;
  }

  const handleSave = () => {
    if (!canPersist) {
      return;
    }

    saveFetcher.submit(
      { contents: getExportText(indent) },
      {
        method: "post",
        action: `/actions/${doc.id}/update-contents`,
      }
    );
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
          onClick={handleSave}
          disabled={saveFetcher.state !== "idle"}
          className="text-lime-700 dark:text-lime-400 font-semibold hover:text-lime-800 dark:hover:text-lime-300 transition disabled:opacity-50"
        >
          {saveFetcher.state !== "idle" ? "Saving…" : "Save"}
        </button>
      )}
      {saveFetcher.data?.error && (
        <Body className="text-red-700 dark:text-red-300 whitespace-nowrap">
          {saveFetcher.data.error}
        </Body>
      )}
    </div>
  );
}
