import { ActionFunction, json } from "remix";
import invariant from "tiny-invariant";
import { sendEvent } from "~/graphJSON.server";
import { updateDocumentContents } from "~/jsonDoc.server";

export const action: ActionFunction = async ({ params, request, context }) => {
  invariant(params.id, "expected params.id");

  const contents = (await request.formData()).get("contents");

  invariant(typeof contents === "string", "expected contents");

  try {
    const document = await updateDocumentContents(params.id, contents);

    if (!document) return json({ error: "No document with that slug" });

    context.waitUntil(
      sendEvent({
        type: "update-doc",
        id: document.id,
        title: document.title,
      })
    );

    return json(document);
  } catch (error) {
    if (error instanceof Error) {
      return json({ error: error.message });
    }

    return json({ error: "Unknown error" });
  }
};
