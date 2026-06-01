import { hydrate } from "react-dom";
import { RemixBrowser } from "remix";
import { load } from "fathom-client";

hydrate(<RemixBrowser />, document);

if (document.documentElement.dataset.offline !== "true") {
  load("ROBFNTET", {
    spa: "history",
    excludedDomains: ["localhost"],
    includedDomains: ["jsonhero.io"],
  });
}
