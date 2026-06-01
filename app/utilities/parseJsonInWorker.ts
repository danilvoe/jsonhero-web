import { LARGE_DOC_CLIENT_BYTES } from "~/uploadLimits";

let parseWorker: Worker | null = null;

function getParseWorker(): Worker {
  if (parseWorker) {
    return parseWorker;
  }

  const script = `
    self.onmessage = (event) => {
      try {
        const value = JSON.parse(event.data);
        self.postMessage({ type: "ok", value });
      } catch (error) {
        self.postMessage({
          type: "error",
          message: error instanceof Error ? error.message : "Invalid JSON",
        });
      }
    };
  `;

  parseWorker = new Worker(
    URL.createObjectURL(new Blob([script], { type: "application/javascript" }))
  );

  return parseWorker;
}

export function shouldParseJsonInWorker(text: string): boolean {
  return new TextEncoder().encode(text).byteLength > LARGE_DOC_CLIENT_BYTES;
}

export function parseJsonInWorker(text: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const worker = getParseWorker();

    const onMessage = (event: MessageEvent<{ type: string; value?: unknown; message?: string }>) => {
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);

      if (event.data.type === "ok") {
        resolve(event.data.value);
        return;
      }

      reject(new Error(event.data.message ?? "Invalid JSON"));
    };

    const onError = () => {
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      reject(new Error("Failed to parse JSON."));
    };

    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    worker.postMessage(text);
  });
}

export async function parseJsonText(text: string): Promise<unknown> {
  if (shouldParseJsonInWorker(text)) {
    return parseJsonInWorker(text);
  }

  return JSON.parse(text);
}
