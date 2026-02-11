import { describe, expect, it } from "vitest";
import { VfsSession } from "../../vfs/vfsSession";
import { dispatchToolCall } from "../handlers";

describe("vfs_ls v5", () => {
  it("supports plain directory listing", () => {
    const session = new VfsSession();
    session.writeFile("world/notes.md", "hello", "text/markdown");

    const result = dispatchToolCall("vfs_ls", { path: "current/world" }, {
      vfsSession: session,
    }) as any;

    expect(result.success).toBe(true);
    expect(result.data.entries).toContain("notes.md");
  });

  it("supports pattern matching with patterns[]", () => {
    const session = new VfsSession();
    session.writeFile("world/notes.md", "note", "text/markdown");
    session.writeFile("world/global.json", "{}", "application/json");

    const result = dispatchToolCall(
      "vfs_ls",
      {
        path: "current/world",
        patterns: ["**/*.md"],
      },
      { vfsSession: session },
    ) as any;

    expect(result.success).toBe(true);
    expect(result.data.entries).toEqual(["current/world/notes.md"]);
  });

  it("returns lines/mimeType/category when stat=true", () => {
    const session = new VfsSession();
    session.writeFile("world/notes.md", "x", "text/markdown");
    session.restore({
      ...(session.snapshotAll() as any),
      "skills/demo/SKILL.md": {
        path: "skills/demo/SKILL.md",
        content: "line1\nline2",
        contentType: "text/markdown",
        hash: "h-skill",
        size: "line1\nline2".length,
        updatedAt: Date.now(),
      },
      "refs/demo.md": {
        path: "refs/demo.md",
        content: "ref",
        contentType: "text/markdown",
        hash: "h-ref",
        size: 3,
        updatedAt: Date.now(),
      },
    });

    const skillResult = dispatchToolCall(
      "vfs_ls",
      {
        path: "skills",
        patterns: ["**/SKILL.md"],
        stat: true,
      },
      { vfsSession: session },
    ) as any;

    expect(skillResult.success).toBe(true);
    const skillEntry = (skillResult.data.stats as any[]).find(
      (entry) => entry.category === "skill",
    );
    expect(skillEntry).toBeDefined();
    expect(skillEntry.lines).toBeGreaterThan(0);
    expect(skillEntry.mimeType).toBe("text/markdown");

    const refResult = dispatchToolCall(
      "vfs_ls",
      {
        path: "refs",
        patterns: ["**/*.md"],
        stat: true,
      },
      { vfsSession: session },
    ) as any;

    expect(refResult.success).toBe(true);
    const refEntry = (refResult.data.stats as any[]).find(
      (entry) => entry.category === "reference",
    );
    expect(refEntry).toBeDefined();

    const unknownResult = dispatchToolCall(
      "vfs_ls",
      {
        path: "current/world",
        patterns: ["**/*.md"],
        stat: true,
      },
      { vfsSession: session },
    ) as any;

    expect(unknownResult.success).toBe(true);
    expect(unknownResult.data.stats[0]?.category).toBe("unknown");
  });
});
