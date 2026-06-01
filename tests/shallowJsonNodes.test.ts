import {
  ancestorPathIds,
  generateShallowColumnViewNode,
  generateShallowTreeViewNodes,
  materializeColumnPath,
  materializeTreeViewPath,
} from "../app/utilities/shallowJsonNodes";
import { generateColumnViewNode } from "../app/utilities/jsonColumnView";

describe("shallow column nodes", () => {
  const json = {
    string: "foo bar",
    data: { foo: "bar", nested: { deep: true } },
    array: [{ string: "item" }],
  };

  it("builds only one level of children for large-document mode", () => {
    const shallow = generateShallowColumnViewNode(json);

    expect(shallow.children).toHaveLength(3);
    expect(shallow.children[1].id).toBe("$.data");
    expect(shallow.children[1].children).toEqual([]);

    const arrayNode = shallow.children.find((child) => child.id === "$.array");

    expect(arrayNode?.children).toEqual([]);
    expect(arrayNode?.hasChildren).toBe(true);
  });

  it("matches the full tree at the first level", () => {
    const full = generateColumnViewNode(json);
    const shallow = generateShallowColumnViewNode(json);

    expect(shallow.children.map((child) => child.id)).toEqual(
      full.children.map((child) => child.id)
    );
  });

  it("materializes children along a path", () => {
    const shallow = generateShallowColumnViewNode(json);
    const materialized = materializeColumnPath(shallow, json, [
      "$",
      "$.data",
      "$.data.nested",
    ]);

    const dataNode = materialized.children.find((child) => child.id === "$.data");

    expect(dataNode?.children.map((child) => child.id)).toEqual([
      "$.data.foo",
      "$.data.nested",
    ]);
    expect(
      dataNode?.children.find((child) => child.id === "$.data.nested")?.children
    ).toHaveLength(1);
  });

  it("returns ancestor paths including root", () => {
    expect(ancestorPathIds("$.data.foo")).toEqual([
      "$",
      "$.data",
      "$.data.foo",
    ]);
  });

  it("materializes nested tree paths level by level", () => {
    const shallow = generateShallowTreeViewNodes(json);
    const afterData = materializeTreeViewPath(shallow, "$.data", json);
    const dataNode = afterData.find((node) => node.id === "$.data");

    expect(dataNode?.children?.map((child) => child.id)).toEqual([
      "$.data.foo",
      "$.data.nested",
    ]);

    const afterNested = materializeTreeViewPath(afterData, "$.data.nested", json);
    const nestedNode = afterData
      .find((node) => node.id === "$.data")
      ?.children?.find((node) => node.id === "$.data.nested");

    const nestedAfter = afterNested
      .find((node) => node.id === "$.data")
      ?.children?.find((node) => node.id === "$.data.nested");

    expect(nestedNode?.children).toEqual([]);
    expect(nestedAfter?.children?.map((child) => child.id)).toEqual([
      "$.data.nested.deep",
    ]);
  });
});
