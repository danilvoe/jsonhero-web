import { JSONHeroPath } from "@jsonhero/path";
import { pick } from "lodash-es";
import React, { useEffect, useMemo, useRef } from "react";
import { createContext, ReactNode, useContext } from "react";
import invariant from "tiny-invariant";
import {
  ColumnViewState,
  ColumnViewAction,
  useColumnView,
  ColumnViewInstanceState,
  ColumnViewAPI,
} from "~/useColumnView";
import {
  generateColumnViewNode,
  calculateStablePath,
  firstChildToDescendant,
} from "~/utilities/jsonColumnView";
import {
  ancestorPathIds,
  generateShallowColumnViewNode,
  materializeColumnPath,
} from "~/utilities/shallowJsonNodes";
import { pathExists } from "~/utilities/setValueAtPath";
import { isLargeDocument } from "~/uploadLimits";
import { useJson } from "./useJson";
import { useJsonDoc } from "./useJsonDoc";

export type JsonColumnViewState = ColumnViewInstanceState;
export type JsonColumnViewAPI = ColumnViewAPI;

const JsonColumnViewStateContext = createContext<JsonColumnViewState>(
  {} as JsonColumnViewState
);

const JsonColumnViewAPIContext = createContext<JsonColumnViewAPI>(
  {} as JsonColumnViewAPI
);

type PendingNavigation = {
  nodeId: string;
  source: string;
};

export function JsonColumnViewProvider({ children }: { children: ReactNode }) {
  const [json] = useJson();
  const { doc, path: initialNodeId } = useJsonDoc();
  const isLarge = isLargeDocument(doc);
  const materializedPathIdsRef = useRef(new Set<string>(["$"]));
  const pendingNavigationRef = useRef<PendingNavigation | null>(null);
  const pendingActionRef = useRef<(() => void) | null>(null);
  const previousDocIdRef = useRef(doc.id);
  const [rootVersion, setRootVersion] = React.useState(0);

  const rootNode = useMemo(() => {
    const base = isLarge
      ? generateShallowColumnViewNode(json)
      : generateColumnViewNode(json);

    return materializeColumnPath(
      base,
      json,
      [...materializedPathIdsRef.current]
    );
  }, [json, isLarge, rootVersion]);

  const materializePath = (nodeId: string) => {
    let changed = false;

    for (const pathId of ancestorPathIds(nodeId)) {
      if (!materializedPathIdsRef.current.has(pathId)) {
        materializedPathIdsRef.current.add(pathId);
        changed = true;
      }
    }

    if (changed) {
      setRootVersion((version) => version + 1);
    }

    return changed;
  };

  const jsonReducer = React.useCallback(
    (
      state: ColumnViewState,
      action: ColumnViewAction,
      changes: ColumnViewState
    ): ColumnViewState => {
      if (action.type === "MOVE_UP" || action.type == "MOVE_DOWN") {
        const { selectedNodeId } = state;
        const { highlightedNodeId } = changes;

        invariant(selectedNodeId, "expected selectedNodeId");
        invariant(highlightedNodeId, "expected highlightedNodeId");

        const calculatedPath = calculateStablePath(
          selectedNodeId,
          highlightedNodeId,
          json
        );

        return {
          ...changes,
          selectedNodeId: calculatedPath,
        };
      }

      if (
        action.type === "MOVE_TO_PARENT" &&
        action.source &&
        action.source.altKey
      ) {
        const { selectedNodeId } = state;

        return {
          ...changes,
          selectedNodeId,
        };
      }

      if (action.type === "MOVE_TO_CHILDREN") {
        const { selectedNodeId, highlightedNodeId } = state;

        invariant(selectedNodeId, "expected selectedNodeId");
        invariant(highlightedNodeId, "expected highlightedNodeId");

        if (isAncestorOf(highlightedNodeId, selectedNodeId)) {
          const highlightedPath = new JSONHeroPath(highlightedNodeId);
          const selectedPath = new JSONHeroPath(selectedNodeId);

          const childPath = firstChildToDescendant(
            highlightedPath,
            selectedPath
          );

          if (!childPath) {
            return changes;
          }

          return {
            ...changes,
            highlightedNodeId: childPath,
            selectedNodeId,
          };
        } else {
          return changes;
        }
      }

      return changes;
    },
    [json]
  );

  const { state, api: baseApi } = useColumnView({
    rootNode,
    initialState: initialNodeId ?? "$",
    stateReducer: jsonReducer,
  });

  useEffect(() => {
    const docChanged = previousDocIdRef.current !== doc.id;
    previousDocIdRef.current = doc.id;

    materializedPathIdsRef.current = new Set(["$"]);

    for (const nodeId of [state.selectedNodeId, state.highlightedNodeId]) {
      if (!nodeId) {
        continue;
      }

      for (const pathId of ancestorPathIds(nodeId)) {
        materializedPathIdsRef.current.add(pathId);
      }
    }

    if (docChanged) {
      pendingNavigationRef.current = null;
      pendingActionRef.current = null;
      setRootVersion(0);
    } else {
      setRootVersion((version) => version + 1);
    }
  }, [json, doc.id, state.selectedNodeId, state.highlightedNodeId]);

  useEffect(() => {
    if (pendingActionRef.current) {
      const action = pendingActionRef.current;
      pendingActionRef.current = null;
      action();
      return;
    }

    if (!pendingNavigationRef.current) {
      return;
    }

    const pending = pendingNavigationRef.current;
    pendingNavigationRef.current = null;
    baseApi.goToNodeId(pending.nodeId, pending.source);
  }, [rootNode, baseApi]);

  const api = useMemo<JsonColumnViewAPI>(() => {
    const navigate = (nodeId: string, source: string) => {
      if (materializePath(nodeId)) {
        pendingNavigationRef.current = { nodeId, source };
        return;
      }

      baseApi.goToNodeId(nodeId, source);
    };

    return {
      ...baseApi,
      goToNodeId: navigate,
      goToChildren: () => {
        const highlightedNodeId = state.highlightedNodeId;

        if (highlightedNodeId && materializePath(highlightedNodeId)) {
          pendingActionRef.current = () => baseApi.goToChildren();
          return;
        }

        baseApi.goToChildren();
      },
    };
  }, [baseApi, state.highlightedNodeId]);

  const isStateRestored = useRef<boolean>(!!initialNodeId);

  useEffect(() => {
    if (isStateRestored.current) {
      return;
    }

    isStateRestored.current = true;

    const storage = localStorage.getItem(doc.id);
    if (storage == null) {
      api.goToNextSibling();
      return;
    }

    const restoredState = JSON.parse(storage) as ColumnViewInstanceState;
    if (!restoredState.selectedNodeId) {
      api.goToNextSibling();
      return;
    }

    api.goToNodeId(restoredState.selectedNodeId, "localStorage");
  }, [doc.id, isStateRestored.current, state, api]);

  useEffect(() => {
    if (doc == null) {
      return;
    }
    if (!isStateRestored.current) {
      return;
    }
    localStorage.setItem(
      doc.id,
      JSON.stringify({
        ...pick(state, "selectedNodeId", "highlightedNodeId"),
        updatedAt: Date.now(),
      })
    );
  }, [
    isStateRestored.current,
    doc.id,
    state.selectedNodeId,
    state.highlightedNodeId,
  ]);

  useEffect(() => {
    if (!state.selectedNodeId) {
      return;
    }

    if (!pathExists(json, state.selectedNodeId)) {
      api.goToNodeId("$", "edit-recovery");
    }
  }, [json, state.selectedNodeId, api]);

  return (
    <JsonColumnViewAPIContext.Provider value={api}>
      <JsonColumnViewStateContext.Provider value={state}>
        {children}
      </JsonColumnViewStateContext.Provider>
    </JsonColumnViewAPIContext.Provider>
  );
}

export function useJsonColumnViewState(): JsonColumnViewState {
  const context = useContext(JsonColumnViewStateContext);

  invariant(
    context,
    "useJsonColumnViewState must be used within a JsonColumnViewStateContext.Provider"
  );

  return context;
}

export function useJsonColumnViewAPI(): JsonColumnViewAPI {
  const context = useContext(JsonColumnViewAPIContext);

  invariant(
    context,
    "useJsonColumnViewAPI must be used within a JsonColumnViewAPIContext.Provider"
  );

  return context;
}

function isAncestorOf(ancestor: string, descendant: string) {
  return ancestor != descendant && descendant.startsWith(ancestor);
}
