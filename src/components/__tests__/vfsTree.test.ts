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

  it("supports entity notes.md living under <id>/notes.md alongside <id>.json", () => {
    const tree = buildVfsTree({
      "world/quests/quest:1.json": { path: "world/quests/quest:1.json" } as any,
      "world/quests/quest:1/notes.md": {
        path: "world/quests/quest:1/notes.md",
      } as any,
    });

    const world = tree.children?.find((n) => n.name === "world");
    const quests = world?.children?.find((n) => n.name === "quests");
    expect(quests?.children?.some((n) => n.name === "quest:1.json")).toBe(true);

    const questFolder = quests?.children?.find(
      (n) => n.kind === "folder" && n.name === "quest:1",
    );
    expect(questFolder?.children?.some((n) => n.name === "notes.md")).toBe(true);
  });

  it("marks outline/conversation as readonly by default", () => {
    expect(isReadonlyPath("outline/outline.json", false, false)).toBe(true);
    expect(isReadonlyPath("conversation/index.json", false, false)).toBe(true);
  });
});
