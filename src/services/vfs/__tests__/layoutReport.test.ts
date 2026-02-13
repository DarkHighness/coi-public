import { describe, expect, it } from "vitest";
import { VfsSession } from "../vfsSession";
import { buildVfsLayoutReport } from "../layoutReport";

describe("vfs layout report", () => {
  it("includes expected scaffold files even when they are not created yet", () => {
    const session = new VfsSession();

    const layout = buildVfsLayoutReport(session, {
      rootPath: "current/world",
      includeExpected: true,
      activeForkId: 0,
    });

    const scaffoldReadme = layout.find(
      (entry) => entry.path === "current/world/characters/README.md",
    );

    expect(scaffoldReadme).toBeDefined();
    expect(scaffoldReadme?.exists).toBe(false);
    expect(scaffoldReadme?.expected).toBe(true);
    expect(scaffoldReadme?.sources).toContain("directory_scaffold");
    expect(scaffoldReadme?.permissionClass).toBe("default_editable");
  });

  it("marks finish-guarded summary path and update trigger correctly", () => {
    const session = new VfsSession();

    const layout = buildVfsLayoutReport(session, {
      includeExpected: true,
      activeForkId: 0,
    });

    const summaryState = layout.find(
      (entry) => entry.canonicalPath === "forks/0/story/summary/state.json",
    );

    expect(summaryState).toBeDefined();
    expect(summaryState?.exists).toBe(false);
    expect(summaryState?.permissionClass).toBe("finish_guarded");
    expect(summaryState?.readability).toBe("finish_guarded");
    expect(summaryState?.writable).toBe(false);
    expect(summaryState?.updateTriggers).toContain("summary_commit");
  });

  it("includes expected session mirror path with finish commit trigger", () => {
    const session = new VfsSession();

    const layout = buildVfsLayoutReport(session, {
      rootPath: "current/conversation",
      includeExpected: true,
      activeForkId: 0,
    });

    const sessionMirror = layout.find(
      (entry) => entry.path === "current/conversation/session.jsonl",
    );

    expect(sessionMirror).toBeDefined();
    expect(sessionMirror?.exists).toBe(false);
    expect(sessionMirror?.expected).toBe(true);
    expect(sessionMirror?.permissionClass).toBe("finish_guarded");
    expect(sessionMirror?.readability).toBe("finish_guarded");
    expect(sessionMirror?.updateTriggers).toContain("turn_commit");
  });

  it("preserves existing file metadata for live files", () => {
    const session = new VfsSession();
    session.writeFile("world/notes.md", "hello", "text/markdown");

    const layout = buildVfsLayoutReport(session, {
      rootPath: "current/world",
      includeExpected: true,
      activeForkId: 0,
    });

    const notes = layout.find(
      (entry) => entry.path === "current/world/notes.md",
    );

    expect(notes).toBeDefined();
    expect(notes?.exists).toBe(true);
    expect(notes?.sources).toContain("existing");
    expect(notes?.contentType).toBe("text/markdown");
    expect(notes?.size).toBe(5);
  });
});
