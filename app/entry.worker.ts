/// <reference lib="WebWorker" />
import { FastJsonSearch, cheapSearchValue } from "./worker/fastJsonSearch";

type SearchWorker = {
  searcher?: FastJsonSearch;
  searchGeneration: number;
};

export type {};
declare let self: DedicatedWorkerGlobalScope & SearchWorker;

type InitializeIndexEvent = {
  type: "initialize-index";
  payload: { json: unknown };
};

type SearchEvent = {
  type: "search";
  payload: { query: string; generation: number };
};

type SearchWorkerEvent = InitializeIndexEvent | SearchEvent;

self.searchGeneration = 0;

self.onmessage = (e: MessageEvent<SearchWorkerEvent>) => {
  const { type, payload } = e.data;

  switch (type) {
    case "initialize-index": {
      const { json } = payload;

      self.searcher = new FastJsonSearch(cheapSearchValue);
      self.searcher.prepareIndex(json);

      self.postMessage({ type: "index-initialized" });

      break;
    }
    case "search": {
      const { query, generation } = payload;

      if (!self.searcher) {
        throw new Error("Search index not initialized");
      }

      self.searchGeneration = generation;
      const results = self.searcher.search(query);

      if (generation !== self.searchGeneration) {
        break;
      }

      self.postMessage({
        type: "search-results",
        payload: { results, query },
      });
    }
  }
};
