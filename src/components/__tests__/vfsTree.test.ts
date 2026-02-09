import { describe, it, expect } from "vitest";
import { buildVfsTree, isReadonlyPath } from "../vfsExplorer/tree";

describe("vfs tree builder", () => {
  it("includes core directories even when snapshot is empty", () => {
    const tree = buildVfsTree({});
    const rootNames = (tree.children || []).map((n) => n.name);

    expect(rootNames).toEqual(
      expect.arrayContaining([
        "world",
        "conversation",
        "outline",
        "summary",
        "custom_rules",
        "refs",
        "skills",
      ]),
    );

    const outline = (tree.children || []).find((n) => n.name === "outline");
    expect(outline?.children?.some((n) => n.name === "story_outline")).toBe(true);
  });

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

  it("enforces system readonly boundaries", () => {
    expect(isReadonlyPath("skills/theme/x/SKILL.md")).toBe(true);
    expect(isReadonlyPath("conversation/index.json")).toBe(true);
    expect(isReadonlyPath("refs/atmosphere/options.md")).toBe(true);
    expect(isReadonlyPath("outline/progress.json")).toBe(false);
    expect(isReadonlyPath("summary/state.json")).toBe(true);
    expect(isReadonlyPath("outline/outline.json")).toBe(false);
    expect(isReadonlyPath("outline/story_outline/plan.md")).toBe(false);
    expect(isReadonlyPath("world/characters/char:player/profile.json")).toBe(false);
  });
});
