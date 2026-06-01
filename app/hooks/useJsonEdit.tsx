import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import invariant from "tiny-invariant";
import { useDocumentSourceText } from "~/hooks/useDocumentSourceText";
import { useJson } from "~/hooks/useJson";
import { useJsonDoc } from "~/hooks/useJsonDoc";
import { isLargeDocument } from "~/uploadLimits";
import { serializeJson } from "~/utilities/serializeJson";
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
  const { doc } = useJsonDoc();
  const isLarge = isLargeDocument(doc);
  const documentSourceText = useDocumentSourceText();
  const initialJsonRef = useRef(isLarge ? json : stableJson(json));
  const sourceTextRef = useRef<string | null>(documentSourceText);
  const editorExportRef = useRef<(() => string | undefined) | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [parseError, setParseErrorState] = useState<string | null>(null);
  const [jsonVersion, setJsonVersion] = useState(0);

  useEffect(() => {
    if (documentSourceText != null && documentSourceText.trim() !== "") {
      sourceTextRef.current = documentSourceText;
    }
  }, [documentSourceText]);

  const rememberSourceText = useCallback((text: string) => {
    if (text.trim() !== "") {
      sourceTextRef.current = text;
    }
  }, []);

  const bump = useCallback(() => {
    setJsonVersion((version) => version + 1);
  }, []);

  const stabilize = useCallback(
    (value: unknown) => (isLarge ? value : stableJson(value)),
    [isLarge]
  );

  const updateJson = useCallback(
    (parsed: unknown) => {
      const stabilized = stabilize(parsed);
      setJson(stabilized);
      setIsDirty(true);
      setParseErrorState(null);
      bump();
    },
    [setJson, bump, stabilize]
  );

  const updateValueAtPath = useCallback(
    (path: string, value: unknown) => {
      const updated = setValueAtPath(json, path, value);
      const stabilized = stabilize(updated);
      setJson(stabilized);
      setIsDirty(true);
      setParseErrorState(null);
      bump();
    },
    [json, setJson, bump, stabilize]
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

  const registerEditorExport = useCallback((getter: () => string | undefined) => {
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

      if (editorText != null && editorText.trim() !== "") {
        try {
          JSON.parse(editorText);
          return editorText;
        } catch {
          // fall through to in-memory json when editor has invalid JSON
        }
      }

      try {
        const serialized = serializeJson(json, indent, { compact: isLarge });
        rememberSourceText(serialized);
        return serialized;
      } catch {
        const fallback = sourceTextRef.current;

        if (fallback != null && fallback.trim() !== "") {
          return fallback;
        }

        throw new Error("Cannot export JSON document");
      }
    },
    [json, rememberSourceText, isLarge]
  );

  const markSaved = useCallback(() => {
    initialJsonRef.current = stabilize(json);
    setIsDirty(false);
    setParseErrorState(null);
  }, [json, stabilize]);

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
