/** @jest-environment jsdom */

import { pruneDocumentLocalStorage } from "../app/utilities/pruneDocumentLocalStorage";

describe("pruneDocumentLocalStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("removes stale document ui state with updatedAt", () => {
    const docId = "abcdefghijkl";

    localStorage.setItem(
      docId,
      JSON.stringify({ selectedNodeId: "a", updatedAt: Date.now() - 100_000 })
    );
    localStorage.setItem(
      `${docId}-virtual-tree-state`,
      JSON.stringify({ collapsedState: {}, updatedAt: Date.now() - 100_000 })
    );
    localStorage.setItem(
      docId.slice(0, 11) + "z",
      JSON.stringify({ selectedNodeId: "b", updatedAt: Date.now() })
    );

    pruneDocumentLocalStorage(60_000);

    expect(localStorage.getItem(docId)).toBeNull();
    expect(localStorage.getItem(`${docId}-virtual-tree-state`)).toBeNull();
    expect(localStorage.getItem(docId.slice(0, 11) + "z")).not.toBeNull();
  });

  it("keeps legacy entries without updatedAt", () => {
    const docId = "abcdefghijkl";

    localStorage.setItem(
      docId,
      JSON.stringify({ selectedNodeId: "a" })
    );

    pruneDocumentLocalStorage(60_000);

    expect(localStorage.getItem(docId)).not.toBeNull();
  });
});
