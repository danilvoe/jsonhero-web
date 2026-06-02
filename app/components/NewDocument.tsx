import { DragAndDropForm } from "./DragAndDropForm";
import { UrlForm } from "./UrlForm";

export function NewDocument() {
  return (
    <div className="bg-indigo-700 text-white rounded-sm shadow-md w-96 max-w-max p-3 transition">
      <div className="flex flex-col">
        <UrlForm className="mb-2" />
        <DragAndDropForm />
        <div className="mt-4">
          <a
            href="http://srv-fh2.uofis.tec/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-3 py-1.5 bg-slate-200 text-slate-800 bg-opacity-90 text-base font-bold rounded uppercase hover:bg-opacity-100 transition"
          >
            FHv2
          </a>
        </div>
      </div>
    </div>
  );
}
