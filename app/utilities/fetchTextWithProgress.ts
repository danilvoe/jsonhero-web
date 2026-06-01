export function fetchTextWithProgress(
  url: string,
  onProgress: (percent: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = "text";

    xhr.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve(xhr.responseText);
        return;
      }

      reject(new Error(`Request failed (HTTP ${xhr.status}).`));
    };

    xhr.onerror = () => reject(new Error("Network error."));
    xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));
    xhr.send();
  });
}
