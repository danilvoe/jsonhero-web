import { DragAndDropForm } from "./DragAndDropForm";
import { UrlForm } from "./UrlForm";

export function NewFile() {
  return (
    <div>
      <div className="mb-4">
        <UrlForm />
      </div>
      <DragAndDropForm />
      <div className="mt-4 pt-5">
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
  );
}
