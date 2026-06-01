import { ActionFunction, json } from "remix";
import invariant from "tiny-invariant";
import { sendEvent } from "~/graphJSON.server";
import { updateDocumentContents } from "~/jsonDoc.server";
import { MAX_JSON_UPLOAD_BYTES } from "~/uploadLimits";
import {
  readRequestBodyWithLimit,
  RequestBodyTooLargeError,
} from "~/utilities/readRequestBody";

async function readSaveContents(request: Request): Promise<string> {
  const contentType = request.headers.get("content-type") ?? "";

  if (
    request.headers.get("X-Jsonhero-Save") === "1" ||
    (contentType.includes("application/json") &&
      !contentType.includes("multipart"))
  ) {
    const contentLength = request.headers.get("content-length");

    if (
      contentLength != null &&
      Number(contentLength) > MAX_JSON_UPLOAD_BYTES
    ) {
      throw new RequestBodyTooLargeError(MAX_JSON_UPLOAD_BYTES);
    }

    return readRequestBodyWithLimit(request, MAX_JSON_UPLOAD_BYTES);
  }

  const formContents = (await request.formData()).get("contents");

  invariant(typeof formContents === "string", "expected contents");

  return formContents;
}

export const action: ActionFunction = async ({ params, request, context }) => {
  invariant(params.id, "expected params.id");

  try {
    const contents = await readSaveContents(request);
    const document = await updateDocumentContents(params.id, contents);

    if (!document) return json({ error: "No document with that slug" });

    context.waitUntil(
      sendEvent({
        type: "update-doc",
        id: document.id,
        title: document.title,
      })
    );

    return json({ ok: true, id: document.id });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return json({ error: "File is too large" }, { status: 413 });
    }

    if (error instanceof Error) {
      return json({ error: error.message });
    }

    return json({ error: "Unknown error" });
  }
};
