import {
  containerChildCount,
  isLargeContainer,
  LARGE_CONTAINER_CHILD_COUNT,
} from "../app/performanceLimits";
import { generateColumnViewNode } from "../app/utilities/jsonColumnView";
import {
  generateShallowTreeViewNodes,
  materializeTreeViewPath,
  treeNodeIsExpandable,
} from "../app/utilities/shallowJsonNodes";

describe("performanceLimits", () => {
  it("detects large arrays and objects", () => {
    expect(containerChildCount([1, 2, 3])).toBe(3);
    expect(isLargeContainer(Array(LARGE_CONTAINER_CHILD_COUNT + 1).fill(0))).toBe(
      true
    );
    expect(
      isLargeContainer(
        Object.fromEntries(
          Array(LARGE_CONTAINER_CHILD_COUNT + 1)
            .fill(0)
            .map((_, index) => [`k${index}`, index])
        )
      )
    ).toBe(true);
  });

  it("uses lazy placeholders for large containers in column and tree views", () => {
    const big = Array(LARGE_CONTAINER_CHILD_COUNT + 1).fill({ nested: true });
    const json = { small: { ok: true }, big };

    const columnRoot = generateColumnViewNode(json);
    const columnBig = columnRoot.children.find((node) => node.id === "$.big");

    expect(columnBig?.children).toEqual([]);
    expect(columnBig?.hasChildren).toBe(true);

    const treeNodes = generateShallowTreeViewNodes(json);
    const treeBig = treeNodes.find((node) => node.id === "$.big");

    expect(treeBig?.children).toEqual([]);
    expect(treeNodeIsExpandable(treeBig!)).toBe(true);

    const materialized = materializeTreeViewPath(treeNodes, "$.big", json);
    const expandedBig = materialized.find((node) => node.id === "$.big");

    expect(expandedBig?.children).toHaveLength(LARGE_CONTAINER_CHILD_COUNT + 1);
  });
});
