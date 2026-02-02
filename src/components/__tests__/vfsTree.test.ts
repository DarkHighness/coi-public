import { describe, it, expect } from "vitest";
import { buildVfsTree, isReadonlyPath } from "../vfsExplorer/tree";

describe("vfs tree builder", () => {
  it("builds a current/ rooted tree from snapshot paths", () => {
    const tree = buildVfsTree({
      "world/global.json": { path: "world/global.json" } as any,
      "conversation/index.json": { path: "conversation/index.json" } as any,
    });
    expect(tree.name).toBe("current");
    expect(tree.children?.some((n) => n.name === "world")).toBe(true);
  });

  it("marks outline/conversation as readonly by default", () => {
    expect(isReadonlyPath("outline/outline.json", false, false)).toBe(true);
    expect(isReadonlyPath("conversation/index.json", false, false)).toBe(true);
  });
});
