import { useJson } from "./useJson";
import { inferType, JSONValueType } from "@jsonhero/json-infer-types";
import { JSONHeroPath } from "@jsonhero/path";
import { IconComponent } from "~/useColumnView";
import { formatValue } from "~/utilities/formatter";
import { iconForType } from "~/utilities/icons";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useVirtualTree, UseVirtualTreeInstance } from "./useVirtualTree";
import invariant from "tiny-invariant";
import { useJsonDoc } from "./useJsonDoc";
import { isLargeDocument } from "~/uploadLimits";
import { isLargeContainer } from "~/performanceLimits";
import {
  ancestorPathIds,
  generateShallowTreeViewNodes,
  materializeTreeViewPath,
  treeNodeIsExpandable,
} from "~/utilities/shallowJsonNodes";

const initialRect = { width: 800, height: 600 };

export type JsonTreeOptions = {
  overscan?: number;
};

export type UseJsonTreeInstance = {
  tree: UseVirtualTreeInstance<JsonTreeViewNode>;
  parentRef: React.RefObject<HTMLDivElement>;
  toggleNode: (id: string, source?: KeyboardEvent | MouseEvent) => void;
};

export type JsonTreeViewType = UseJsonTreeInstance;

const JsonTreeViewContext = createContext<JsonTreeViewType>(
  {} as JsonTreeViewType
);

export function JsonTreeViewProvider({
  children,
  ...options
}: { children: ReactNode } & JsonTreeOptions) {
  const instance = useJsonTree(options);

  return (
    <JsonTreeViewContext.Provider value={instance}>
      {children}
    </JsonTreeViewContext.Provider>
  );
}

function findTreeNodeById(
  nodes: JsonTreeViewNode[],
  id: string
): JsonTreeViewNode | undefined {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }

    if (node.children !== undefined) {
      const found = findTreeNodeById(node.children, id);

      if (found) {
        return found;
      }
    }
  }

  return undefined;
}

export { treeNodeIsExpandable } from "~/utilities/shallowJsonNodes";

export function useJsonTree(options: JsonTreeOptions): UseJsonTreeInstance {
  const parentRef = useRef<HTMLDivElement>(null);

  const { doc } = useJsonDoc();
  const [json] = useJson();
  const isLarge = isLargeDocument(doc);
  const [materializedNodes, setMaterializedNodes] =
    useState<JsonTreeViewNode[] | null>(null);
  const pendingExpandIds = useRef<string[]>([]);

  useEffect(() => {
    setMaterializedNodes(null);
    pendingExpandIds.current = [];
  }, [json]);

  const jsonNodes = useMemo(() => {
    if (isLarge) {
      return materializedNodes ?? generateShallowTreeViewNodes(json);
    }

    return generateTreeViewNodes(json);
  }, [json, isLarge, materializedNodes]);

  const tree = useVirtualTree({
    id: doc.id,
    nodes: jsonNodes,
    parentRef,
    estimateSize: useCallback((index) => 32, []),
    initialRect,
    overscan: options.overscan,
    persistState: true,
  });

  useEffect(() => {
    if (!pendingExpandIds.current.length) {
      return;
    }

    const ids = pendingExpandIds.current;
    pendingExpandIds.current = [];

    for (const pathId of ids) {
      tree.expandNode(pathId);
    }
  }, [jsonNodes, tree]);

  const toggleNode = useCallback(
    (id: string, source?: KeyboardEvent | MouseEvent) => {
      const node = findTreeNodeById(jsonNodes, id);

      if (
        node &&
        treeNodeIsExpandable(node) &&
        (!node.children || node.children.length === 0)
      ) {
        pendingExpandIds.current = ancestorPathIds(id).filter(
          (pathId) => pathId !== "$"
        );

        setMaterializedNodes((current) =>
          materializeTreeViewPath(
            current ??
              (isLarge
                ? generateShallowTreeViewNodes(json)
                : generateTreeViewNodes(json)),
            id,
            json
          )
        );
        return;
      }

      tree.toggleNode(id, source);
    },
    [isLarge, json, jsonNodes, tree]
  );

  return { tree, parentRef, toggleNode };
}

export function useJsonTreeViewContext(): JsonTreeViewType {
  const context = useContext(JsonTreeViewContext);

  invariant(
    context,
    "useJsonTreeViewContext must be used within a JsonTreeViewContext.Provider"
  );

  return context;
}

export type JsonTreeViewNode = {
  id: string;
  name: string;
  title: string;
  subtitle?: string;
  longTitle?: string;
  icon?: IconComponent;
  children?: Array<JsonTreeViewNode>;
  /** Set on shallow nodes before children are materialized. */
  hasChildren?: boolean;
};

export function generateTreeViewNodes(json: unknown): Array<JsonTreeViewNode> {
  const info = inferType(json);
  const path = new JSONHeroPath("$");

  return generateChildren(info, path) ?? [];
}

function generateChildren(
  info: JSONValueType,
  path: JSONHeroPath
): Array<JsonTreeViewNode> | undefined {
  if (info.name === "array") {
    return info.value.map((item, index) => {
      const itemInfo = inferType(item);
      const itemPath = path.child(index.toString());

      return {
        id: itemPath.toString(),
        name: index.toString(),
        title: index.toString(),
        longTitle: `Index ${index.toString()}`,
        subtitle: formatValue(itemInfo),
        icon: iconForType(itemInfo),
        children: childrenForValue(item, itemInfo, itemPath),
        hasChildren: isLargeContainer(item) || undefined,
      };
    });
  }

  if (info.name === "object") {
    return Object.entries(info.value).map(([key, value]) => {
      const cleanKey = key.replace(/\./g, "\\.");
      const itemInfo = inferType(value);
      const itemPath = path.child(cleanKey);
      return {
        id: itemPath.toString(),
        name: key,
        title: key,
        subtitle: formatValue(itemInfo),
        icon: iconForType(itemInfo),
        children: childrenForValue(value, itemInfo, itemPath),
        hasChildren: isLargeContainer(value) || undefined,
      };
    });
  }
}

function childrenForValue(
  value: unknown,
  info: JSONValueType,
  path: JSONHeroPath
): Array<JsonTreeViewNode> | undefined {
  if (isLargeContainer(value)) {
    return [];
  }

  return generateChildren(info, path);
}
