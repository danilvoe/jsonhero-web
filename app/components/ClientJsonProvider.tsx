import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "remix";
import { DocumentLoadingOverlay } from "~/components/DocumentLoadingOverlay";
import { DocumentSourceTextProvider } from "~/hooks/useDocumentSourceText";
import { JsonProvider } from "~/hooks/useJson";
import { JSONDocumentMeta } from "~/jsonDoc.server";
import { importJsonStorageKey, isLargeDocument } from "~/uploadLimits";
import { fetchTextWithProgress } from "~/utilities/fetchTextWithProgress";
import { parseJsonText } from "~/utilities/parseJsonInWorker";

type ClientJsonProviderProps = {
  doc: JSONDocumentMeta;
  initialJson: unknown | null;
  initialSourceText?: string | null;
  clientFetch?: boolean;
  children: ReactNode;
};

type LoadPhase = "idle" | "downloading" | "parsing" | "ready";

export function ClientJsonProvider({
  doc,
  initialJson,
  initialSourceText = null,
  clientFetch,
  children,
}: ClientJsonProviderProps) {
  const location = useLocation();
  const [json, setJson] = useState<unknown | null>(initialJson);
  const [sourceText, setSourceText] = useState<string | null>(initialSourceText);
  const [error, setError] = useState<string | null>(null);
  const [loadPhase, setLoadPhase] = useState<LoadPhase>(
    initialJson != null ? "ready" : "idle"
  );
  const [downloadPercent, setDownloadPercent] = useState(0);
  const [hasCachedImport, setHasCachedImport] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);

    if (url.searchParams.has("fromUpload")) {
      url.searchParams.delete("fromUpload");
      const search = url.searchParams.toString();
      window.history.replaceState(
        {},
        "",
        url.pathname + (search ? `?${search}` : "")
      );
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!clientFetch || json != null) {
      return;
    }

    const storageKey = importJsonStorageKey(doc.id);
    const cached = sessionStorage.getItem(storageKey);

    if (cached) {
      setHasCachedImport(true);
      setLoadPhase("parsing");

      let cancelled = false;

      parseJsonText(cached)
        .then((parsed) => {
          if (cancelled) {
            return;
          }

          sessionStorage.removeItem(storageKey);
          setSourceText(cached);
          setJson(parsed);
          setLoadPhase("ready");
        })
        .catch(() => {
          if (cancelled) {
            return;
          }

          sessionStorage.removeItem(storageKey);
          setError("Файл не содержит валидный JSON");
          setLoadPhase("idle");
        });

      return () => {
        cancelled = true;
      };
    }

    let cancelled = false;

    setLoadPhase("downloading");

    fetchTextWithProgress(`/j/${doc.id}.json`, (percent) => {
      if (!cancelled) {
        setDownloadPercent(percent);
      }
    })
      .then(async (text) => {
        if (cancelled) {
          return;
        }

        setLoadPhase("parsing");

        const parsed = await parseJsonText(text);

        if (cancelled) {
          return;
        }

        setSourceText(text);
        setJson(parsed);
        setLoadPhase("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }

        const message =
          err instanceof Error ? err.message : "Не удалось загрузить документ";
        setError(message);
        setLoadPhase("idle");
      });

    return () => {
      cancelled = true;
    };
  }, [clientFetch, doc.id, json]);

  if (error) {
    return (
      <DocumentSourceTextProvider sourceText={sourceText}>
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90">
          <div className="max-w-md px-8 text-center">
            <p className="mb-4 text-lg text-red-400">{error}</p>
            <a
              href="/"
              className="inline-block rounded-sm bg-lime-500 px-4 py-2 text-slate-900"
            >
              На главную
            </a>
          </div>
        </div>
      </DocumentSourceTextProvider>
    );
  }

  if (json == null) {
    const isParsing = loadPhase === "parsing";
    const isDownloading = loadPhase === "downloading";

    const overlayPercent = isParsing
      ? 85
      : isDownloading
      ? Math.round(downloadPercent * 0.7)
      : hasCachedImport
      ? 0
      : 0;

    return (
      <DocumentSourceTextProvider sourceText={sourceText}>
        <DocumentLoadingOverlay
          title={
            isParsing
              ? "Экран загрузки файла…"
              : hasCachedImport && !isDownloading
              ? "Экран загрузки документа…"
              : "Экран парсинга документа…"
          }
          subtitle={
            isParsing
              ? "Обработка в фоновом режиме"
              : hasCachedImport && !isDownloading
              ? "Подготовка отображения"
              : "Загрузка JSON с сервера"
          }
          percent={overlayPercent}
          indeterminate={hasCachedImport && !isDownloading && !isParsing}
        />
      </DocumentSourceTextProvider>
    );
  }

  return (
    <DocumentSourceTextProvider sourceText={sourceText}>
      <JsonProvider initialJson={json} skipStableJson={isLargeDocument(doc)}>
        {children}
      </JsonProvider>
    </DocumentSourceTextProvider>
  );
}
