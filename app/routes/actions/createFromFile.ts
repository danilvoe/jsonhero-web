import { ActionFunction, json, redirect } from "remix";
import { sendEvent } from "~/graphJSON.server";
import { createFromRawJson } from "~/jsonDoc.server";
import { MAX_JSON_UPLOAD_BYTES } from "~/uploadLimits";
import {
  readRequestBodyWithLimit,
  RequestBodyTooLargeError,
} from "~/utilities/readRequestBody";

async function readFormField(
  value: FormDataEntryValue | null
): Promise<string | null> {
  if (value == null) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  return value.text();
}

export const action: ActionFunction = async ({ request, context }) => {
  const contentType = request.headers.get("content-type") ?? "";

  let filename: string | null = null;
  let rawJson: string | null = null;

  try {
    if (
      contentType.includes("application/json") &&
      !contentType.includes("multipart")
    ) {
      const contentLength = request.headers.get("content-length");

      if (
        contentLength != null &&
        Number(contentLength) > MAX_JSON_UPLOAD_BYTES
      ) {
        return json({ error: "File is too large" }, { status: 413 });
      }

      const filenameHeader = request.headers.get("x-filename");

      if (filenameHeader) {
        try {
          filename = decodeURIComponent(filenameHeader);
        } catch {
          filename = filenameHeader;
        }
      } else {
        filename = "Untitled.json";
      }
      rawJson = await readRequestBodyWithLimit(request, MAX_JSON_UPLOAD_BYTES);
    } else {
      const formData = await request.formData();
      filename = await readFormField(formData.get("filename"));
      rawJson = await readFormField(formData.get("rawJson"));
    }

    if (!filename || !rawJson) {
      return json({ error: "Missing filename or JSON content" }, { status: 400 });
    }

    const byteLength = new TextEncoder().encode(rawJson).byteLength;

    if (byteLength > MAX_JSON_UPLOAD_BYTES) {
      return json({ error: "File is too large" }, { status: 413 });
    }

    const doc = await createFromRawJson(filename, rawJson);

    const url = new URL(request.url);

    context.waitUntil(
      sendEvent({
        type: "create",
        from: "file",
        id: doc.id,
        source: url.searchParams.get("utm_source") ?? url.hostname,
      })
    );

    const location = `/j/${doc.id}?fromUpload=1`;

    if (request.headers.get("x-jsonhero-upload") === "1") {
      return json({ id: doc.id, location });
    }

    return redirect(location);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return json({ error: "File is too large" }, { status: 413 });
    }

    const message =
      error instanceof Error ? error.message : "Failed to upload file";

    if (
      error instanceof SyntaxError ||
      message.toLowerCase().includes("json")
    ) {
      return json({ error: "Invalid JSON" }, { status: 400 });
    }

    console.error("createFromFile failed:", error);

    return json({ error: message }, { status: 500 });
  }
};
