import { JSONValueType } from "@jsonhero/json-infer-types";
import { PencilAltIcon } from "@heroicons/react/outline";
import { useCallback, useEffect, useRef, useState } from "react";
import { useJsonEdit } from "~/hooks/useJsonEdit";
import { formatRawValue } from "~/utilities/formatter";

export type EditableScalarValueProps = {
  path: string;
  info: JSONValueType;
  className?: string;
  compact?: boolean;
  onEditingChange?: (editing: boolean) => void;
};

export function isEditableScalar(info: JSONValueType): boolean {
  switch (info.name) {
    case "string":
    case "int":
    case "float":
    case "bool":
    case "null":
      return true;
    default:
      return false;
  }
}

export function EditableScalarValue({
  path,
  info,
  className = "",
  compact = false,
  onEditingChange,
}: EditableScalarValueProps) {
  const { updateValueAtPath } = useJsonEdit();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(formatRawValue(info));
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraft(formatRawValue(info));
    }
  }, [info, isEditing]);

  useEffect(() => {
    onEditingChange?.(isEditing);
  }, [isEditing, onEditingChange]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const startEditing = useCallback(() => {
    setDraft(formatRawValue(info));
    setError(null);
    setIsEditing(true);
  }, [info]);

  const cancelEditing = useCallback(() => {
    setDraft(formatRawValue(info));
    setError(null);
    setIsEditing(false);
  }, [info]);

  const commitEditing = useCallback(() => {
    try {
      const value = parseDraftValue(info, draft);
      updateValueAtPath(path, value);
      setError(null);
      setIsEditing(false);
    } catch (commitError) {
      if (commitError instanceof Error) {
        setError(commitError.message);
      } else {
        setError("Invalid value");
      }
    }
  }, [draft, info, path, updateValueAtPath]);

  if (!isEditableScalar(info)) {
    return <span className={className}>{formatRawValue(info)}</span>;
  }

  if (isEditing) {
    const inputClassName = `${
      compact ? "text-xs px-1 py-0" : "text-sm px-2 py-1"
    } w-full rounded-sm border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-lime-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100`;

    return (
      <div className={className} onClick={(e) => e.stopPropagation()}>
        {info.name === "bool" ? (
          <select
            className={inputClassName}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commitEditing();
              }
              if (e.key === "Escape") {
                cancelEditing();
              }
            }}
            onBlur={commitEditing}
            autoFocus
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        ) : info.name === "string" && draft.length > 80 ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            className={`${inputClassName} min-h-[4rem] resize-y`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                cancelEditing();
              }
            }}
            onBlur={commitEditing}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            className={inputClassName}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commitEditing();
              }
              if (e.key === "Escape") {
                cancelEditing();
              }
            }}
            onBlur={commitEditing}
          />
        )}
        {error && (
          <span className="mt-1 block text-xs text-red-600 dark:text-red-300">
            {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <span
      className={`group/edit inline-flex items-center gap-1 ${className}`}
      onDoubleClick={(e) => {
        e.stopPropagation();
        startEditing();
      }}
    >
      <span>{formatRawValue(info)}</span>
      <button
        type="button"
        className={`opacity-0 group-hover/edit:opacity-100 transition ${
          compact ? "p-0" : "p-0.5"
        } text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200`}
        onClick={(e) => {
          e.stopPropagation();
          startEditing();
        }}
        aria-label="Edit value"
      >
        <PencilAltIcon className={compact ? "h-3 w-3" : "h-4 w-4"} />
      </button>
    </span>
  );
}

function parseDraftValue(info: JSONValueType, draft: string): unknown {
  switch (info.name) {
    case "string":
      return draft;
    case "int": {
      const value = Number(draft);
      if (!Number.isInteger(value)) {
        throw new Error("Expected an integer");
      }
      return value;
    }
    case "float": {
      const value = Number(draft);
      if (Number.isNaN(value)) {
        throw new Error("Expected a number");
      }
      return value;
    }
    case "bool":
      if (draft === "true") {
        return true;
      }
      if (draft === "false") {
        return false;
      }
      throw new Error("Expected true or false");
    case "null":
      if (draft === "null") {
        return null;
      }
      throw new Error('Use "null" for null values');
    default:
      throw new Error("This value cannot be edited inline");
  }
}
