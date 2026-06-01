import { LoaderFunction } from "remix";
import invariant from "tiny-invariant";
import { getDocumentContents, getDocumentMeta } from "~/jsonDoc.server";
import safeFetch from "~/utilities/safeFetch";

export const loader: LoaderFunction = async ({ params }) => {
  invariant(params.id, "expected params.id");

  const doc = await getDocumentMeta(params.id);

  if (!doc) {
    throw new Response("Not Found", {
      status: 404,
    });
  }

  if (doc.type === "url") {
    const jsonResponse = await safeFetch(doc.url);

    if (!jsonResponse.ok) {
      throw new Response("Failed to fetch URL", {
        status: jsonResponse.status,
      });
    }

    return new Response(jsonResponse.body, {
      headers: {
        "Content-Type":
          jsonResponse.headers.get("Content-Type") ?? "application/json",
        "Cache-Control": "private, max-age=60",
      },
    });
  }

  const contents = await getDocumentContents(params.id);

  if (contents == null) {
    throw new Response("Not Found", {
      status: 404,
    });
  }

  return new Response(contents, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, max-age=60",
    },
  });
};
