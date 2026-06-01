import { createEventHandler } from "@remix-run/cloudflare-workers";

import * as build from "../build";
import { cleanupExpiredDocuments } from "../app/documentKv.server";

addEventListener(
  "fetch",
  createEventHandler({
    build,
    getLoadContext(event) {
      return {
        waitUntil(promise) {
          return event.waitUntil(promise);
        },
      };
    },
  })
);

addEventListener("scheduled", (event) => {
  event.waitUntil(cleanupExpiredDocuments());
});
