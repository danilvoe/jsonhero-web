import React, { useCallback, useEffect, useState } from "react";
import { Body } from "./Primitives/Body";
import { ClipboardIcon, CheckIcon } from "@heroicons/react/outline";
import { useJsonColumnViewState } from "~/hooks/useJsonColumnView";

const buttonDefault = (
  <div className="flex items-center gap-1 whitespace-nowrap">
    <ClipboardIcon className="h-4 w-4 flex-shrink-0" />
    <span>Копировать</span>
  </div>
);

const buttonCopied = (
  <div className="flex items-center gap-1 whitespace-nowrap">
    <ClipboardIcon className="h-4 w-4 flex-shrink-0 text-green-600" />
    <span>Скопировано!</span>
  </div>
);

const buttonFailed = (
  <div className="flex items-center gap-1 whitespace-nowrap">
    <span>Не удалось скопировать</span>
  </div>
);

export function Share() {
  useEffect(() => {
    setLink(window.location.href);
  }, []);
  const [link, setLink] = useState("");

  const [copyText, setCopyText] = useState<React.ReactNode>(buttonDefault);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => {
        setCopyText(buttonDefault);
        setCopied(false);
      }, 1800);

      return () => clearTimeout(timeout);
    }
  }, [copied]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(link).then(
      function () {
        setCopyText(buttonCopied);
        setCopied(true);
      },
      function (err) {
        setCopyText(buttonFailed);
        setCopied(true);
      }
    );
  }, [link, setCopyText]);

  const { selectedNodeId } = useJsonColumnViewState();

  const handleIncludesPath = useCallback(
    (includesPath: boolean) => {
      if (!selectedNodeId) {
        return;
      }

      if (includesPath) {
        const url = new URL(window.location.href);
        for (const [key] of url.searchParams) {
          url.searchParams.delete(key);
        }

        url.searchParams.append("path", selectedNodeId);

        setLink(url.href);
      } else {
        setLink(window.location.href);
      }
    },
    [link, selectedNodeId] // Убрал link из зависимостей, так как он не используется внутри
  );

  return (
    <div className="bg-indigo-700 text-white rounded-sm shadow-md min-w-[400px] p-4 transition">
      <Body className="text-sm mb-3 text-slate-300">
        Любой, у кого есть эта ссылка, может просмотреть этот файл JSON.
      </Body>
      
      <div className="flex mb-3">
        <div className="flex-grow whitespace-nowrap overflow-hidden rounded-l-sm bg-indigo-900 text-sm p-2 select-all">
          {link}
        </div>
        
        {/* Кнопка с фиксированной шириной */}
        <div
          className="flex items-center justify-center text-slate-800 min-w-[120px] bg-white bg-opacity-80 rounded-r-sm transition hover:bg-opacity-100 cursor-pointer"
          onClick={handleCopy}
        >
          <div className="px-3 py-2">{copyText}</div>
        </div>
      </div>
      
      <div className="form-check form-check-inline">
        <label className="flex items-center text-sm form-check-label text-slate-300 select-none hover:cursor-pointer transition">
          <input
            className="form-check-input appearance-none h-4 w-4 border border-slate-300 rounded-sm bg-white checked:bg-indigo-700 checked:border-indigo-700 focus:outline-none duration-200 align-top bg-no-repeat bg-center bg-contain float-left mr-2 hover:cursor-pointer transition dark:border-slate-300 dark:bg-slate-200 dark:checked:bg-lime-500 dark:checked:border-lime-500"
            type="checkbox"
            id="inlineCheckbox"
            value="option"
            onChange={(e) => handleIncludesPath(e.target.checked)}
          />
          Ссылка содержит путь?
        </label>
      </div>
    </div>
  );
}