import { describe, expect, it } from "vitest";
import { VfsSession } from "../../vfs/vfsSession";
import { dispatchToolCall } from "../handlers";

describe("vfs_read_markdown", () => {
  it("reads markdown sections by heading/index union and dedupes by range", () => {
    const session = new VfsSession();
    session.writeFile(
      "world/notes.md",
      [
        "# Alpha",
        "",
        "alpha body",
        "",
        "# Beta",
        "",
        "beta body",
      ].join("\n"),
      "text/markdown",
    );

    const result = dispatchToolCall(
      "vfs_read_markdown",
      {
        path: "current/world/notes.md",
        headings: ["Alpha", "Beta"],
        indices: ["2"],
      },
      { vfsSession: session },
    ) as any;

    expect(result.success).toBe(true);
    expect(result.data.sections).toHaveLength(2);
    expect(result.data.sections[0].index).toBe("1");
    expect(result.data.sections[1].index).toBe("2");
  });

  it("rejects ambiguous heading selectors", () => {
    const session = new VfsSession();
    session.writeFile(
      "world/notes.md",
      ["# Repeated", "a", "", "# Repeated", "b"].join("\n"),
      "text/markdown",
    );

    const result = dispatchToolCall(
      "vfs_read_markdown",
      {
        path: "current/world/notes.md",
        headings: ["Repeated"],
      },
      { vfsSession: session },
    ) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_DATA");
    expect(result.error).toContain("ambiguous");
  });

  it("returns NOT_FOUND when no section selector matches", () => {
    const session = new VfsSession();
    session.writeFile("world/notes.md", "# One\n\nbody", "text/markdown");

    const result = dispatchToolCall(
      "vfs_read_markdown",
      {
        path: "current/world/notes.md",
        headings: ["Missing"],
      },
      { vfsSession: session },
    ) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("NOT_FOUND");
  });

  it("emits structured read-limit hint when markdown section exceeds maxChars", () => {
    const session = new VfsSession();
    session.writeFile(
      "world/notes.md",
      `# Large\n\n${"x".repeat(1200)}`,
      "text/markdown",
    );

    const result = dispatchToolCall(
      "vfs_read_markdown",
      {
        path: "current/world/notes.md",
        headings: ["Large"],
        maxChars: 100,
      },
      { vfsSession: session },
    ) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_DATA");
    expect(result.details?.issues?.[0]?.code).toBe("READ_LIMIT_EXCEEDED");
    expect(result.details?.hint?.code).toBe("READ_LIMIT_HINT");
    expect(result.details?.hint?.nextCalls?.[0]).toContain("vfs_read_markdown");
  });
});
