import { describe, expect, it } from "vitest";
import { VfsSession } from "../../vfs/vfsSession";
import { dispatchToolCall } from "../handlers";

describe("vfs_ls v5", () => {
  it("supports plain directory listing", () => {
    const session = new VfsSession();
    session.writeFile("world/notes.md", "hello", "text/markdown");

    const result = dispatchToolCall(
      "vfs_ls",
      { path: "current/world" },
      {
        vfsSession: session,
      },
    ) as any;

    expect(result.success).toBe(true);
    expect(result.data.entries).toContain("notes.md");
    expect(Array.isArray(result.data.stats)).toBe(true);
    expect(Array.isArray(result.data.hints)).toBe(true);
    expect(result.data.stats[0]?.kind).toBe("file");
    expect(typeof result.data.stats[0]?.chars).toBe("number");
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
    expect(Array.isArray(result.data.stats)).toBe(true);
    expect(Array.isArray(result.data.hints)).toBe(true);
    expect(result.data.stats[0]?.path).toBe("current/world/notes.md");
  });

  it("returns lines/mimeType/category metadata by default", () => {
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
      },
      { vfsSession: session },
    ) as any;

    expect(skillResult.success).toBe(true);
    const skillEntry = (skillResult.data.stats as any[]).find(
      (entry) => entry.category === "skill",
    );
    expect(skillEntry).toBeDefined();
    expect(skillEntry.lines).toBeGreaterThan(0);
    expect(skillEntry.chars).toBeGreaterThan(0);
    expect(skillEntry.mimeType).toBe("text/markdown");

    const refResult = dispatchToolCall(
      "vfs_ls",
      {
        path: "refs",
        patterns: ["**/*.md"],
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
      },
      { vfsSession: session },
    ) as any;

    expect(unknownResult.success).toBe(true);
    expect(unknownResult.data.stats[0]?.category).toBe("unknown");
  });

  it("can return expected layout and access metadata for plain listing", () => {
    const session = new VfsSession();

    const result = dispatchToolCall(
      "vfs_ls",
      {
        path: "current/world",
        includeExpected: true,
        includeAccess: true,
      },
      { vfsSession: session },
    ) as any;

    expect(result.success).toBe(true);
    expect(Array.isArray(result.data.layout)).toBe(true);
    expect(Array.isArray(result.data.hints)).toBe(true);

    const scaffold = (result.data.layout as any[]).find(
      (entry) => entry.path === "current/world/characters/README.md",
    );
    expect(scaffold).toBeDefined();
    expect(scaffold.exists).toBe(false);
    expect(scaffold.expected).toBe(true);
    expect(scaffold.sources).toContain("directory_scaffold");
    expect(scaffold.permissionClass).toBe("default_editable");
  });

  it("rejects includeExpected in glob mode", () => {
    const session = new VfsSession();

    const result = dispatchToolCall(
      "vfs_ls",
      {
        path: "current/world",
        patterns: ["**/*.json"],
        includeExpected: true,
      },
      { vfsSession: session },
    ) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_DATA");
  });

  it("can include access metadata in glob mode", () => {
    const session = new VfsSession();
    session.writeFile("world/global.json", "{}", "application/json");

    const result = dispatchToolCall(
      "vfs_ls",
      {
        path: "current/world",
        patterns: ["**/*.json"],
        includeAccess: true,
      },
      { vfsSession: session },
    ) as any;

    expect(result.success).toBe(true);
    expect(Array.isArray(result.data.access)).toBe(true);
    expect(Array.isArray(result.data.hints)).toBe(true);
    expect(result.data.access[0].templateId).toBe("template.story.world");
    expect(result.data.access[0].readability).toBe("read_write");
  });
});
