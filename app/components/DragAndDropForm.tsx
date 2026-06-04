import { ArrowCircleDownIcon } from "@heroicons/react/outline";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { LoadingIcon } from "~/components/Icons/LoadingIcon";
import { MAX_JSON_UPLOAD_BYTES } from "~/uploadLimits";
import {
  uploadJsonFile,
  type UploadPhase,
} from "~/utilities/uploadJsonFile";
import { formatBytes } from "~/utilities/formatter";

const phaseLabels: Record<UploadPhase, string> = {
  reading: "Чтение файла…",
  uploading: "Загрузка на сервер…",
  opening: "Открытие документа…",
};

export function DragAndDropForm() {
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("reading");
  const [uploadPercent, setUploadPercent] = useState(0);

  const onDrop = useCallback((acceptedFiles: Array<File>) => {
    if (acceptedFiles.length === 0) {
      return;
    }

    const firstFile = acceptedFiles[0];

    setError(null);
    setIsUploading(true);
    setUploadPhase("reading");
    setUploadPercent(0);

    uploadJsonFile(firstFile, {
      onProgress: ({ phase, percent }) => {
        setUploadPhase(phase);
        setUploadPercent(percent);
      },
    }).catch((err: unknown) => {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }

      const message =
        err instanceof Error ? err.message : "Upload failed. Please try again.";
      setError(message);
      setIsUploading(false);
      setUploadPercent(0);
    });
  }, []);

  const onDropRejected = useCallback(
    (fileRejections: Array<{ errors: Array<{ code: string }> }>) => {
      const rejection = fileRejections[0];
      const isTooLarge = rejection?.errors.some(
        (e) => e.code === "file-too-large"
      );

      if (isTooLarge) {
        setError(
          `File is too large. Maximum size is ${formatBytes(MAX_JSON_UPLOAD_BYTES)}.`
        );
        return;
      }

      setError("Пожалуйста, загрузите JSON-файл (.json).");
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDropAccepted: onDrop,
    onDropRejected,
    maxFiles: 1,
    maxSize: MAX_JSON_UPLOAD_BYTES,
    multiple: false,
    disabled: isUploading,
    accept: "application/json, text/json, text/plain, .json",
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className="block min-w-[300px] cursor-pointer rounded-md border-2 border-dashed border-slate-600 bg-slate-900/40 p-4 text-base text-slate-300 focus:border-indigo-500 focus:ring-indigo-500 disabled:cursor-wait disabled:opacity-60"
      >
        <input {...getInputProps()} />
        <div className="flex items-center">
          {isUploading ? (
            <LoadingIcon className="mr-3 inline h-6 w-6 shrink-0 animate-spin" />
          ) : (
            <ArrowCircleDownIcon
              className={`mr-3 inline h-6 w-6 shrink-0 ${
                isDragActive ? "text-lime-500" : ""
              }`}
            />
          )}
          <p className={`${isDragActive ? "text-lime-500" : ""}`}>
            {isUploading
              ? phaseLabels[uploadPhase]
              : isDragActive
              ? "Теперь отпустить, чтобы открыть его…"
              : "Перетащите JSON файл или нажмите для выбора"}
          </p>
        </div>
        <p className="mt-2 text-sm text-slate-400">
          Up to {formatBytes(MAX_JSON_UPLOAD_BYTES)} per file
        </p>
      </div>

      {isUploading ? (
        <div className="mt-3" aria-live="polite" aria-busy="true">
          <div className="mb-1 flex items-center justify-between text-sm text-slate-400">
            <span>{phaseLabels[uploadPhase]}</span>
            <span>{uploadPercent}%</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-slate-700"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={uploadPercent}
          >
            <div
              className="h-full rounded-full bg-lime-500 transition-[width] duration-150 ease-out"
              style={{ width: `${uploadPercent}%` }}
            />
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="mt-2 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
