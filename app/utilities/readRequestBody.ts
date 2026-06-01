export class RequestBodyTooLargeError extends Error {
  constructor(maxBytes: number) {
    super(`Request body exceeds ${maxBytes} bytes`);
    this.name = "RequestBodyTooLargeError";
  }
}

export async function readRequestBodyWithLimit(
  request: Request,
  maxBytes: number
): Promise<string> {
  if (!request.body) {
    const text = await request.text();
    const byteLength = new TextEncoder().encode(text).byteLength;

    if (byteLength > maxBytes) {
      throw new RequestBodyTooLargeError(maxBytes);
    }

    return text;
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let result = "";
  let bytesRead = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    bytesRead += value.byteLength;

    if (bytesRead > maxBytes) {
      await reader.cancel();
      throw new RequestBodyTooLargeError(maxBytes);
    }

    result += decoder.decode(value, { stream: true });
  }

  result += decoder.decode();

  return result;
}
