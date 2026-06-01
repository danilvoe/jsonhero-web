import { CodeEditor } from "./CodeEditor";
import { useJson } from "~/hooks/useJson";
import { useJsonEdit } from "~/hooks/useJsonEdit";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useJsonColumnViewAPI,
  useJsonColumnViewState,
} from "~/hooks/useJsonColumnView";
import { ViewUpdate } from "@uiw/react-codemirror";
import jsonMap from "json-source-map";
import { JSONHeroPath } from "@jsonhero/path";
import { usePreferences } from "~/components/PreferencesProvider";
import { debounce } from "lodash-es";
import { Body } from "./Primitives/Body";
import { useJsonDoc } from "~/hooks/useJsonDoc";
import { isLargeDocument } from "~/uploadLimits";
import { serializeJson } from "~/utilities/serializeJson";

export function JsonEditor() {
  const { doc } = useJsonDoc();
  const isLarge = isLargeDocument(doc);

  const stringifyJson = useCallback(
    (value: unknown, indent: number) =>
      serializeJson(value, indent, { compact: isLarge }),
    [isLarge]
  );

  const [json] = useJson();
  const {
    updateJson,
    setParseError,
    parseError,
    jsonVersion,
    registerEditorExport,
  } = useJsonEdit();
  const { selectedNodeId } = useJsonColumnViewState();
  const { goToNodeId } = useJsonColumnViewAPI();
  const [preferences] = usePreferences();
  const indent = preferences?.indent || 2;

  const skipExternalSyncRef = useRef(false);
  const [editorText, setEditorText] = useState(() => stringifyJson(json, indent));

  const jsonMapped = useMemo(() => {
    return jsonMap.stringify(json, null, indent);
  }, [json, indent]);

  useEffect(() => {
    if (skipExternalSyncRef.current) {
      skipExternalSyncRef.current = false;
      return;
    }

    setEditorText(stringifyJson(json, indent));
  }, [jsonVersion, json, indent, stringifyJson]);

  const debouncedParse = useMemo(
    () =>
      debounce((value: string) => {
        try {
          const parsed = JSON.parse(value);
          skipExternalSyncRef.current = true;
          updateJson(parsed);
        } catch (error) {
          if (error instanceof Error) {
            setParseError(error.message);
          } else {
            setParseError("Invalid JSON");
          }
        }
      }, 300),
    [updateJson, setParseError]
  );

  useEffect(() => {
    return registerEditorExport(() => editorText);
  }, [registerEditorExport, editorText]);

  useEffect(() => {
    return () => {
      debouncedParse.flush();
    };
  }, [debouncedParse]);

  const handleChange = useCallback(
    (value: string) => {
      setEditorText(value);
      debouncedParse(value);
    },
    [debouncedParse]
  );

  const selection = useMemo<{ start: number; end: number } | undefined>(() => {
    if (!selectedNodeId) {
      return;
    }

    const path = new JSONHeroPath(selectedNodeId);
    const pointer = path.jsonPointer();

    const location = jsonMapped.pointers[pointer];

    if (location) {
      if (location.key) {
        return { start: location.key.pos, end: location.valueEnd.pos };
      }

      return { start: location.value.pos, end: location.valueEnd.pos };
    }
  }, [selectedNodeId, jsonMapped]);

  const currentSelectedLine = useRef<number | undefined>(undefined);

  const onUpdate = useCallback(
    (update: ViewUpdate) => {
      if (!update.selectionSet) {
        return;
      }

      const range = update.state.selection.ranges[0];
      const line = update.state.doc.lineAt(range.anchor);

      if (
        currentSelectedLine.current &&
        currentSelectedLine.current === line.number
      ) {
        return;
      }

      currentSelectedLine.current = line.number;

      const pointerEntry = Object.entries(jsonMapped.pointers).find(
        ([, info]) => {
          return info.value.line === line.number - 1;
        }
      );

      if (!pointerEntry) {
        return;
      }

      const [pointer] = pointerEntry;

      const path = JSONHeroPath.fromPointer(pointer);

      goToNodeId(path.toString(), "editor");
    },
    [goToNodeId, jsonMapped]
  );

  return (
    <div className="flex flex-col h-full">
      {isLarge ? (
        <div className="border-b border-slate-700 bg-slate-800/80 px-3 py-2">
          <Body className="text-slate-300 text-sm">
            Large documents open in read-only mode in the editor to keep the
            browser responsive. Use column or tree view to explore and edit
            smaller sections via save when available.
          </Body>
        </div>
      ) : null}
      <CodeEditor
        language="json"
        content={editorText}
        readOnly={isLarge}
        onChange={isLarge ? undefined : handleChange}
        onUpdate={isLarge ? undefined : onUpdate}
        selection={isLarge ? undefined : selection}
      />
      {parseError && (
        <div className="px-3 py-2 bg-red-100 border-t border-red-300 dark:bg-red-900/40 dark:border-red-700">
          <Body className="text-red-800 dark:text-red-200">{parseError}</Body>
        </div>
      )}
    </div>
  );
}
