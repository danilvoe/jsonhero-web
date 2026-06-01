import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import invariant from "tiny-invariant";
import jsonMap from "json-source-map";
import { useJson } from "~/hooks/useJson";
import { stableJson } from "~/utilities/stableJson";
import { setValueAtPath } from "~/utilities/setValueAtPath";

type JsonEditContextType = {
  isDirty: boolean;
  parseError: string | null;
  jsonVersion: number;
  updateJson: (parsed: unknown) => void;
  updateValueAtPath: (path: string, value: unknown) => void;
  setParseError: (error: string | null) => void;
  reset: () => void;
  registerEditorExport: (getter: () => string) => () => void;
  getExportText: (indent: number) => string;
  markSaved: () => void;
};

const JsonEditContext = createContext<JsonEditContextType | undefined>(
  undefined
);

export function JsonEditProvider({ children }: { children: ReactNode }) {
  const [json, setJson] = useJson();
  const initialJsonRef = useRef(stableJson(json));
  const editorExportRef = useRef<(() => string) | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [parseError, setParseErrorState] = useState<string | null>(null);
  const [jsonVersion, setJsonVersion] = useState(0);

  const bump = useCallback(() => {
    setJsonVersion((version) => version + 1);
  }, []);

  const updateJson = useCallback(
    (parsed: unknown) => {
      const stabilized = stableJson(parsed);
      setJson(stabilized);
      setIsDirty(true);
      setParseErrorState(null);
      bump();
    },
    [setJson, bump]
  );

  const updateValueAtPath = useCallback(
    (path: string, value: unknown) => {
      const updated = setValueAtPath(json, path, value);
      const stabilized = stableJson(updated);
      setJson(stabilized);
      setIsDirty(true);
      setParseErrorState(null);
      bump();
    },
    [json, setJson, bump]
  );

  const setParseError = useCallback(
    (error: string | null) => {
      setParseErrorState(error);
    },
    []
  );

  const reset = useCallback(() => {
    setJson(initialJsonRef.current);
    setIsDirty(false);
    setParseErrorState(null);
    bump();
  }, [setJson, bump]);

  const registerEditorExport = useCallback((getter: () => string) => {
    editorExportRef.current = getter;

    return () => {
      if (editorExportRef.current === getter) {
        editorExportRef.current = null;
      }
    };
  }, []);

  const getExportText = useCallback(
    (indent: number) => {
      const editorText = editorExportRef.current?.();

      if (editorText !== undefined) {
        try {
          JSON.parse(editorText);
          return editorText;
        } catch {
          // fall through to in-memory json when editor has invalid JSON
        }
      }

      return jsonMap.stringify(json, null, indent).json;
    },
    [json]
  );

  const markSaved = useCallback(() => {
    initialJsonRef.current = stableJson(json);
    setIsDirty(false);
    setParseErrorState(null);
  }, [json]);

  return (
    <JsonEditContext.Provider
      value={{
        isDirty,
        parseError,
        jsonVersion,
        updateJson,
        updateValueAtPath,
        setParseError,
        reset,
        registerEditorExport,
        getExportText,
        markSaved,
      }}
    >
      {children}
    </JsonEditContext.Provider>
  );
}

export function useJsonEdit(): JsonEditContextType {
  const context = useContext(JsonEditContext);

  invariant(context, "useJsonEdit must be used within a JsonEditProvider");

  return context;
}
