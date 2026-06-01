import {
  importJsonStorageKey,
  LARGE_DOC_CLIENT_BYTES,
} from "~/uploadLimits";

export type UploadPhase = "reading" | "uploading" | "opening";

export type UploadProgress = {
  phase: UploadPhase;
  percent: number;
};

export type UploadJsonFileResult = {
  id: string;
  location: string;
};

export type UploadJsonFileOptions = {
  onProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal;
};

function getUploadLocation(xhr: XMLHttpRequest): string | null {
  if (xhr.status >= 200 && xhr.status < 300 && xhr.responseText) {
    try {
      const data = JSON.parse(xhr.responseText) as {
        id?: string;
        location?: string;
      };
      if (typeof data.location === "string") {
        return data.location;
      }
    } catch {
      // not a JSON body
    }
  }

  const remixRedirect = xhr.getResponseHeader("X-Remix-Redirect");
  if (remixRedirect) {
    return remixRedirect;
  }

  const location = xhr.getResponseHeader("Location");
  if (location) {
    return location;
  }

  return null;
}

function parseErrorMessage(xhr: XMLHttpRequest): string {
  try {
    const data = JSON.parse(xhr.responseText) as { error?: string };
    if (typeof data.error === "string") {
      return data.error;
    }
  } catch {
    // ignore
  }

  if (xhr.status === 413) {
    return "File is too large.";
  }

  if (xhr.status >= 400) {
    return `Upload failed (HTTP ${xhr.status}).`;
  }

  return "Upload failed.";
}

function extractDocId(location: string): string | null {
  try {
    const url = new URL(location, window.location.origin);
    const match = url.pathname.match(/^\/j\/([^/]+)/);

    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function withFromUploadParam(location: string): string {
  const url = new URL(location, window.location.origin);

  if (url.searchParams.get("fromUpload") === "1") {
    return url.pathname + url.search;
  }

  url.searchParams.set("fromUpload", "1");

  return url.pathname + url.search;
}

type UploadRequestOptions = UploadJsonFileOptions & {
  body: Blob | string;
  filename: string;
  cacheText?: string;
  readingPercent?: number;
};

function sendUploadRequest({
  body,
  filename,
  cacheText,
  readingPercent = 0,
  onProgress,
  signal,
}: UploadRequestOptions): Promise<UploadJsonFileResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    const abort = () => {
      xhr.abort();
    };

    signal?.addEventListener("abort", abort, { once: true });

    xhr.open("POST", "/actions/createFromFile");
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("X-Filename", encodeURIComponent(filename));
    xhr.setRequestHeader("X-Jsonhero-Upload", "1");

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      const uploadStart = 10 + readingPercent;
      const uploadRange = 45 - readingPercent;

      onProgress?.({
        phase: "uploading",
        percent:
          uploadStart + Math.round((event.loaded / event.total) * uploadRange),
      });
    };

    xhr.onload = () => {
      signal?.removeEventListener("abort", abort);

      const location = getUploadLocation(xhr);

      if (!location || xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(parseErrorMessage(xhr)));
        return;
      }

      const id = extractDocId(location);

      if (!id) {
        reject(new Error("Upload succeeded but document id was not returned."));
        return;
      }

      onProgress?.({ phase: "opening", percent: 55 });

      const openUrl = withFromUploadParam(location);

      if (cacheText) {
        try {
          sessionStorage.setItem(importJsonStorageKey(id), cacheText);
        } catch {
          // sessionStorage quota — document page will download JSON with progress
        }
      }

      onProgress?.({ phase: "opening", percent: 70 });

      window.location.assign(openUrl);
      resolve({ id, location: openUrl });
    };

    xhr.onerror = () => {
      signal?.removeEventListener("abort", abort);
      reject(new Error("Network error during upload."));
    };

    xhr.onabort = () => {
      signal?.removeEventListener("abort", abort);
      reject(new DOMException("Upload aborted", "AbortError"));
    };

    onProgress?.({ phase: "uploading", percent: 10 + readingPercent });
    xhr.send(body);
  });
}

function uploadSmallFile(
  file: File,
  options: UploadJsonFileOptions
): Promise<UploadJsonFileResult> {
  const { onProgress, signal } = options;

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Upload aborted", "AbortError"));
      return;
    }

    const reader = new FileReader();

    const abort = () => {
      reader.abort();
    };

    signal?.addEventListener("abort", abort, { once: true });

    onProgress?.({ phase: "reading", percent: 0 });

    reader.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      onProgress?.({
        phase: "reading",
        percent: Math.round((event.loaded / event.total) * 10),
      });
    };

    reader.onerror = () => {
      signal?.removeEventListener("abort", abort);
      reject(new Error("Failed to read the file."));
    };

    reader.onabort = () => {
      signal?.removeEventListener("abort", abort);
      reject(new DOMException("Upload aborted", "AbortError"));
    };

    reader.onload = () => {
      signal?.removeEventListener("abort", abort);

      if (reader.result == null) {
        reject(new Error("Failed to read the file."));
        return;
      }

      const jsonValue =
        typeof reader.result === "string"
          ? reader.result
          : new TextDecoder("utf-8").decode(reader.result);

      try {
        JSON.parse(jsonValue);
      } catch {
        reject(new Error("The file does not contain valid JSON."));
        return;
      }

      sendUploadRequest({
        body: jsonValue,
        filename: file.name,
        cacheText: jsonValue,
        readingPercent: 10,
        onProgress,
        signal,
      }).then(resolve, reject);
    };

    reader.readAsArrayBuffer(file);
  });
}

function uploadLargeFile(
  file: File,
  options: UploadJsonFileOptions
): Promise<UploadJsonFileResult> {
  const { onProgress, signal } = options;

  if (signal?.aborted) {
    return Promise.reject(new DOMException("Upload aborted", "AbortError"));
  }

  onProgress?.({ phase: "uploading", percent: 0 });

  return sendUploadRequest({
    body: file,
    filename: file.name,
    onProgress,
    signal,
  });
}

export function uploadJsonFile(
  file: File,
  options: UploadJsonFileOptions = {}
): Promise<UploadJsonFileResult> {
  if (file.size > LARGE_DOC_CLIENT_BYTES) {
    return uploadLargeFile(file, options);
  }

  return uploadSmallFile(file, options);
}
