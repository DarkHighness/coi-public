import { describe, expect, it } from "vitest";
import { VfsSession } from "../../vfs/vfsSession";
import { dispatchToolCall } from "../handlers";

const readForMutation = (session: VfsSession, path: string): void => {
  dispatchToolCall(
    "vfs_read_chars",
    { path: `current/${path}` },
    { vfsSession: session },
  );
};

describe("vfs_write_markdown", () => {
  it("adds markdown section under parent and keeps hierarchy", () => {
    const session = new VfsSession();
    session.writeFile("world/notes.md", "# Root\n\nbody\n", "text/markdown");
    readForMutation(session, "world/notes.md");

    const writeResult = dispatchToolCall(
      "vfs_write_markdown",
      {
        path: "current/world/notes.md",
        action: "add_section",
        parent: { index: "1" },
        section: { title: "Child", content: "child body" },
      },
      { vfsSession: session },
    ) as any;

    expect(writeResult.success).toBe(true);

    const readResult = dispatchToolCall(
      "vfs_read_markdown",
      { path: "current/world/notes.md", headings: ["Child"] },
      { vfsSession: session },
    ) as any;
    expect(readResult.success).toBe(true);
    expect(readResult.data.sections[0].index).toBe("1.1");
  });

  it("falls back to append-at-end when add_section parent is missing", () => {
    const session = new VfsSession();
    session.writeFile("world/notes.md", "# One\n\nbody\n", "text/markdown");
    readForMutation(session, "world/notes.md");

    const writeResult = dispatchToolCall(
      "vfs_write_markdown",
      {
        path: "current/world/notes.md",
        action: "add_section",
        parent: { index: "9.9" },
        section: { title: "Tail", content: "tail" },
      },
      { vfsSession: session },
    ) as any;

    expect(writeResult.success).toBe(true);

    const readResult = dispatchToolCall(
      "vfs_read_markdown",
      { path: "current/world/notes.md", headings: ["Tail"] },
      { vfsSession: session },
    ) as any;
    expect(readResult.success).toBe(true);
    expect(readResult.data.sections[0].index).toBe("2");
  });

  it("replaces and deletes markdown sections by unique selector", () => {
    const session = new VfsSession();
    session.writeFile(
      "world/notes.md",
      ["# A", "", "old", "", "# B", "", "keep"].join("\n"),
      "text/markdown",
    );
    readForMutation(session, "world/notes.md");

    const replaceResult = dispatchToolCall(
      "vfs_write_markdown",
      {
        path: "current/world/notes.md",
        action: "replace_section",
        target: { index: "1" },
        content: "new body",
      },
      { vfsSession: session },
    ) as any;
    expect(replaceResult.success).toBe(true);

    readForMutation(session, "world/notes.md");
    const deleteResult = dispatchToolCall(
      "vfs_write_markdown",
      {
        path: "current/world/notes.md",
        action: "delete_section",
        target: { index: "2" },
      },
      { vfsSession: session },
    ) as any;
    expect(deleteResult.success).toBe(true);

    const readResult = dispatchToolCall(
      "vfs_read_markdown",
      { path: "current/world/notes.md", indices: ["1"] },
      { vfsSession: session },
    ) as any;
    expect(readResult.success).toBe(true);
    expect(readResult.data.sections[0].content).toContain("new body");
  });

  it("rejects ambiguous heading target for replace/delete", () => {
    const session = new VfsSession();
    session.writeFile(
      "world/notes.md",
      ["# Repeat", "", "a", "", "# Repeat", "", "b"].join("\n"),
      "text/markdown",
    );
    readForMutation(session, "world/notes.md");

    const result = dispatchToolCall(
      "vfs_write_markdown",
      {
        path: "current/world/notes.md",
        action: "replace_section",
        target: { heading: "Repeat" },
        content: "updated",
      },
      { vfsSession: session },
    ) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_DATA");
    expect(result.error).toContain("ambiguous");
  });

  it("updates outline story plan markdown when read-before-mutate is satisfied", () => {
    const session = new VfsSession();
    session.writeFile(
      "outline/story_outline/plan.md",
      ["# Plan", "", "## Phase 1", "", "- [ ] Reach the gate"].join("\n"),
      "text/markdown",
    );
    readForMutation(session, "outline/story_outline/plan.md");

    const writeResult = dispatchToolCall(
      "vfs_write_markdown",
      {
        path: "current/outline/story_outline/plan.md",
        action: "add_section",
        parent: { heading: "Plan" },
        section: {
          title: "Branch Update",
          content: "Major divergence confirmed. Rewrite arc priorities.",
        },
      },
      { vfsSession: session },
    ) as any;

    expect(writeResult.success).toBe(true);

    const readResult = dispatchToolCall(
      "vfs_read_markdown",
      {
        path: "current/outline/story_outline/plan.md",
        headings: ["Branch Update"],
      },
      { vfsSession: session },
    ) as any;
    expect(readResult.success).toBe(true);
    expect(readResult.data.sections[0].content).toContain(
      "Major divergence confirmed",
    );
  });

  it("enforces read-before-mutate for existing outline story plan markdown", () => {
    const session = new VfsSession();
    session.writeFile(
      "outline/story_outline/plan.md",
      "# Plan\n\n## Phase 1\n\n- [ ] Reach the gate",
      "text/markdown",
    );

    const result = dispatchToolCall(
      "vfs_write_markdown",
      {
        path: "current/outline/story_outline/plan.md",
        action: "add_section",
        section: { title: "Next", content: "x" },
      },
      { vfsSession: session },
    ) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_ACTION");
    expect(result.error).toContain("must read file");
  });

  it("enforces read-before-mutate for existing markdown files", () => {
    const session = new VfsSession();
    session.writeFile("world/notes.md", "# R\n\nbody", "text/markdown");

    const result = dispatchToolCall(
      "vfs_write_markdown",
      {
        path: "current/world/notes.md",
        action: "add_section",
        section: { title: "Next", content: "x" },
      },
      { vfsSession: session },
    ) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_ACTION");
    expect(result.error).toContain("must read file");
  });
});
