import { inferType, JSONValueType } from "@jsonhero/json-infer-types";
import { JSONHeroPath } from "@jsonhero/path";
import { ColumnViewNode } from "~/useColumnView";
import { JsonTreeViewNode } from "~/hooks/useJsonTree";
import { isLargeContainer } from "~/performanceLimits";
import { formatValue } from "./formatter";
import { iconForType } from "./icons";

export { isLargeContainer, containerChildCount } from "~/performanceLimits";

export function jsonValueAtPath(json: unknown, pathId: string): unknown {
  if (pathId === "$") {
    return json;
  }

  return new JSONHeroPath(pathId).first(json);
}

export function isContainerType(info: JSONValueType): boolean {
  return info.name === "object" || info.name === "array";
}

export function ancestorPathIds(pathId: string): string[] {
  if (pathId === "$") {
    return ["$"];
  }

  const heroPath = new JSONHeroPath(pathId);
  const ids = ["$"];
  const components: JSONHeroPath["components"] = [];

  for (const component of heroPath.components) {
    components.push(component);
    const nextId = new JSONHeroPath(components).toString();

    if (ids[ids.length - 1] !== nextId) {
      ids.push(nextId);
    }
  }

  return ids;
}

function createShallowColumnChild(
  info: JSONValueType,
  path: JSONHeroPath,
  key: string,
  title: string,
  longTitle?: string
): ColumnViewNode {
  const expandable = isContainerType(info);

  return {
    id: path.toString(),
    name: key,
    title,
    longTitle,
    subtitle: formatValue(info),
    icon: iconForType(info),
    children: expandable ? [] : [],
    hasChildren: expandable || undefined,
  };
}

export function generateShallowColumnChildren(
  jsonValue: unknown,
  pathId: string
): ColumnViewNode[] {
  const info = inferType(jsonValue);
  const path = new JSONHeroPath(pathId);

  if (info.name === "array") {
    return info.value.map((item, index) => {
      const itemInfo = inferType(item);
      const itemPath = path.child(index.toString());

      return createShallowColumnChild(
        itemInfo,
        itemPath,
        index.toString(),
        index.toString(),
        `Index ${index.toString()}`
      );
    });
  }

  if (info.name === "object") {
    return Object.entries(info.value).map(([key, value]) => {
      const cleanKey = key.replace(/\./g, "\\.");
      const itemInfo = inferType(value);
      const itemPath = path.child(cleanKey);

      return createShallowColumnChild(itemInfo, itemPath, key, key);
    });
  }

  return [];
}

export function generateShallowColumnViewNode(json: unknown): ColumnViewNode {
  const info = inferType(json);

  return {
    id: "$",
    name: "root",
    title: "root",
    icon: iconForType(info),
    children: generateShallowColumnChildren(json, "$"),
  };
}

export function materializeColumnNodeChildren(
  node: ColumnViewNode,
  json: unknown
): ColumnViewNode {
  const value = jsonValueAtPath(json, node.id);
  const children = generateShallowColumnChildren(value, node.id);

  return {
    ...node,
    children,
  };
}

export function materializeColumnPath(
  root: ColumnViewNode,
  json: unknown,
  pathIds: string[]
): ColumnViewNode {
  if (pathIds.length === 0) {
    return root;
  }

  const uniquePathIds = [...new Set(pathIds)];

  function visit(node: ColumnViewNode): ColumnViewNode {
    let nextNode = node;

    if (uniquePathIds.includes(node.id) && node.children.length === 0) {
      nextNode = materializeColumnNodeChildren(node, json);
    }

    if (!nextNode.children.length) {
      return nextNode;
    }

    return {
      ...nextNode,
      children: nextNode.children.map((child) => visit(child)),
    };
  }

  return visit(root);
}

function createShallowTreeChild(
  info: JSONValueType,
  path: JSONHeroPath,
  key: string,
  title: string,
  longTitle?: string
): JsonTreeViewNode {
  const expandable = isContainerType(info);

  return {
    id: path.toString(),
    name: key,
    title,
    longTitle,
    subtitle: formatValue(info),
    icon: iconForType(info),
    children: expandable ? [] : undefined,
    hasChildren: expandable || undefined,
  };
}

export function generateShallowTreeViewNodes(
  json: unknown,
  pathId = "$"
): JsonTreeViewNode[] {
  const info = inferType(json);
  const path = new JSONHeroPath(pathId);

  if (info.name === "array") {
    return info.value.map((item, index) => {
      const itemInfo = inferType(item);
      const itemPath = path.child(index.toString());

      return createShallowTreeChild(
        itemInfo,
        itemPath,
        index.toString(),
        index.toString(),
        `Index ${index.toString()}`
      );
    });
  }

  if (info.name === "object") {
    return Object.entries(info.value).map(([key, value]) => {
      const cleanKey = key.replace(/\./g, "\\.");
      const itemInfo = inferType(value);
      const itemPath = path.child(cleanKey);

      return createShallowTreeChild(itemInfo, itemPath, key, key);
    });
  }

  return [];
}

export function materializeTreeViewChildren(
  nodeId: string,
  json: unknown
): JsonTreeViewNode[] {
  const value = jsonValueAtPath(json, nodeId);

  return generateShallowTreeViewNodes(value, nodeId);
}

export function materializeTreeViewNode(
  nodes: JsonTreeViewNode[],
  nodeId: string,
  json: unknown
): JsonTreeViewNode[] {
  return nodes.map((node) => {
    if (node.id === nodeId) {
      return {
        ...node,
        children: materializeTreeViewChildren(nodeId, json),
        hasChildren: undefined,
      };
    }

    if (node.children !== undefined) {
      return {
        ...node,
        children: materializeTreeViewNode(node.children, nodeId, json),
      };
    }

    return node;
  });
}

export function materializeTreeViewPath(
  nodes: JsonTreeViewNode[],
  nodeId: string,
  json: unknown
): JsonTreeViewNode[] {
  let result = nodes;

  for (const pathId of ancestorPathIds(nodeId)) {
    if (pathId === "$") {
      continue;
    }

    result = materializeTreeViewNode(result, pathId, json);
  }

  return result;
}

export function treeNodeIsExpandable(node: JsonTreeViewNode): boolean {
  if (node.children && node.children.length > 0) {
    return true;
  }

  return node.hasChildren === true;
}
