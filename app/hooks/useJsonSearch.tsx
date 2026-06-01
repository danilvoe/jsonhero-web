import { isLargeDocument } from "~/uploadLimits";
import { useJsonDoc } from "./useJsonDoc";
import { useJson } from "./useJson";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from "react";

import { SearchResult } from "@jsonhero/fuzzy-json-search";

export type InitializeIndexEvent = {
  type: "initialize-index";
  payload: { json: unknown };
};

export type SearchEvent = {
  type: "search";
  payload: { query: string; generation: number };
};

export type SearchSendWorkerEvent = InitializeIndexEvent | SearchEvent;

export type IndexInitializedEvent = {
  type: "index-initialized";
};

export type SearchResultsEvent = {
  type: "search-results";
  payload: { results: Array<SearchResult<string>>; query: string };
};

export type SearchReceiveWorkerEvent =
  | IndexInitializedEvent
  | SearchResultsEvent;

export type JsonSearchApi = {
  search: (query: string) => void;
  reset: () => void;
};

const JsonSearchStateContext = createContext<JsonSearchState>(
  {} as JsonSearchState
);

const JsonSearchApiContext = createContext<JsonSearchApi>({} as JsonSearchApi);

const SEARCH_DEBOUNCE_MS = 200;

export type JsonSearchState = {
  status: "initializing" | "idle" | "searching";
  query?: string;
  results?: Array<SearchResult<string>>;
};

type SearchAction = {
  type: "search";
  payload: { query: string };
};

type ResetAction = {
  type: "reset";
};

type ReindexAction = {
  type: "reindex";
};

type JsonSearchAction =
  | SearchReceiveWorkerEvent
  | SearchAction
  | ResetAction
  | ReindexAction;

function reducer(
  state: JsonSearchState,
  action: JsonSearchAction
): JsonSearchState {
  if (action.type === "reindex") {
    return { ...state, status: "initializing" };
  }

  switch (state.status) {
    case "initializing": {
      if (action.type === "index-initialized") {
        return {
          ...state,
          status: "idle",
        };
      }

      return state;
    }
    case "idle": {
      if (action.type === "reset") {
        return {
          ...state,
          query: undefined,
          results: undefined,
        };
      }

      if (action.type === "search") {
        return {
          ...state,
          status: "searching",
          query: action.payload.query,
        };
      }

      return state;
    }
    case "searching": {
      if (action.type === "reset") {
        return {
          ...state,
          status: "idle",
          query: undefined,
          results: undefined,
        };
      }

      if (action.type === "search") {
        return {
          ...state,
          query: action.payload.query,
        };
      }

      if (
        action.type === "search-results" &&
        state.query === action.payload.query
      ) {
        return {
          ...state,
          status: "idle",
          results: action.payload.results,
        };
      }

      return state;
    }
  }
}

export function JsonSearchProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [json] = useJson();
  const { doc } = useJsonDoc();

  const [state, dispatch] = useReducer<
    React.Reducer<JsonSearchState, JsonSearchAction>
  >(reducer, { status: "initializing" });

  const search = useCallback(
    (query: string) => {
      dispatch({ type: "search", payload: { query } });
    },
    [dispatch]
  );

  const reset = useCallback(() => {
    dispatch({ type: "reset" });
  }, [dispatch]);

  const handleWorkerMessage = useCallback(
    (e: MessageEvent<SearchReceiveWorkerEvent>) => dispatch(e.data),
    [dispatch]
  );

  const workerRef = useRef<Worker | null>();
  const searchGenerationRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.Worker === "undefined") {
      return;
    }

    if (!workerRef.current) {
      const worker = new Worker("/entry.worker.js");
      worker.onmessage = handleWorkerMessage;
      workerRef.current = worker;
    }

    dispatch({ type: "reindex" });

    const initializeIndex = () => {
      workerRef.current?.postMessage({
        type: "initialize-index",
        payload: {
          json,
        },
      });
    };

    if (isLargeDocument(doc) && typeof requestIdleCallback === "function") {
      const idleId = requestIdleCallback(initializeIndex, { timeout: 4000 });

      return () => {
        cancelIdleCallback(idleId);
      };
    }

    if (isLargeDocument(doc)) {
      const timeoutId = setTimeout(initializeIndex, 0);

      return () => {
        clearTimeout(timeoutId);
      };
    }

    initializeIndex();
  }, [doc, json, handleWorkerMessage]);

  const prevStatusRef = useRef(state.status);

  useEffect(() => {
    const becameIdle =
      prevStatusRef.current === "initializing" && state.status === "idle";

    prevStatusRef.current = state.status;

    if (becameIdle && state.query) {
      dispatch({ type: "search", payload: { query: state.query } });
    }
  }, [state.status, state.query]);

  useEffect(() => {
    if (state.status !== "searching" || !state.query) {
      return;
    }

    const timeoutId = setTimeout(() => {
      const generation = ++searchGenerationRef.current;
      workerRef.current?.postMessage({
        type: "search",
        payload: { query: state.query, generation },
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [state.status, state.query]);

  return (
    <JsonSearchStateContext.Provider value={state}>
      <JsonSearchApiContext.Provider value={{ search, reset }}>
        {children}
      </JsonSearchApiContext.Provider>
    </JsonSearchStateContext.Provider>
  );
}

export function useJsonSearchState(): JsonSearchState {
  return useContext(JsonSearchStateContext);
}

export function useJsonSearchApi(): JsonSearchApi {
  return useContext(JsonSearchApiContext);
}
