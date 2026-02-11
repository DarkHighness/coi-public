import { describe, expect, it } from "vitest";
import { VfsSession } from "../../vfs/vfsSession";
import { dispatchToolCall } from "../handlers";
import { createValidGlobal } from "./vfsHandlers.helpers";

describe("VFS handlers read/schema/ls", () => {
  it("supports char slicing and guards invalid start-only char reads", () => {
    const session = new VfsSession();
    session.writeFile("world/slice.txt", "abcdefghijklmnopqrstuvwxyz", "text/plain");
    const ctx = { vfsSession: session };

    const ok = dispatchToolCall(
      "vfs_read",
      { path: "current/world/slice.txt", start: 5, offset: 3 },
      ctx,
    ) as any;

    expect(ok.success).toBe(true);
    expect(ok.data.content).toBe("fgh");
    expect(ok.data.truncated).toBe(true);

    const invalid = dispatchToolCall(
      "vfs_read",
      { path: "current/world/slice.txt", start: 1 },
      ctx,
    ) as any;

    expect(invalid.success).toBe(false);
    expect(invalid.code).toBe("INVALID_DATA");
  });

  it("supports JSON pointer extraction in vfs_read", () => {
    const session = new VfsSession();
    session.writeFile(
      "world/global.json",
      JSON.stringify(createValidGlobal()),
      "application/json",
    );
    const ctx = { vfsSession: session };

    const result = dispatchToolCall(
      "vfs_read",
      { path: "current/world/global.json", mode: "json", pointers: ["/theme", "/missing"] },
      ctx,
    ) as any;

    expect(result.success).toBe(true);
    expect(result.data.extracts[0].pointer).toBe("/theme");
    expect(result.data.extracts[0].json).toBe('"fantasy"');
    expect(result.data.missing[0].pointer).toBe("/missing");
  });

  it("rejects oversized char reads and guides chunked strategies", () => {
    const session = new VfsSession();
    session.writeFile("world/huge.txt", "x".repeat(17_000), "text/plain");
    const ctx = { vfsSession: session };

    const result = dispatchToolCall(
      "vfs_read",
      { path: "current/world/huge.txt" },
      ctx,
    ) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_DATA");
    expect(result.error).toContain("Hard cap is 16384 chars");
    expect(result.error).toContain("chars(start+offset)");
    expect(result.details?.tool).toBe("vfs_read");
    expect(result.details?.issues?.[0]?.code).toBe("READ_LIMIT_EXCEEDED");
    expect(result.details?.refs).toContain("current/refs/tools/vfs_read.md");
  });

  it("rejects oversized line-window reads and guides chunked strategies", () => {
    const session = new VfsSession();
    const longLine = "1234567890".repeat(200);
    const content = Array.from({ length: 12 }, () => longLine).join("\n");
    session.writeFile("world/huge-lines.txt", content, "text/plain");
    const ctx = { vfsSession: session };

    const result = dispatchToolCall(
      "vfs_read",
      { path: "current/world/huge-lines.txt", mode: "lines", startLine: 1, endLine: 12 },
      ctx,
    ) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_DATA");
    expect(result.error).toContain("Hard cap is 16384 chars");
    expect(result.error).toContain("lines/chars(start+offset)");
  });

  it("rejects oversized json pointer reads without truncation", () => {
    const session = new VfsSession();
    session.writeFile(
      "world/big.json",
      JSON.stringify({ big: "x".repeat(17_000) }),
      "application/json",
    );
    const ctx = { vfsSession: session };

    const result = dispatchToolCall(
      "vfs_read",
      { path: "current/world/big.json", mode: "json", pointers: ["/big"] },
      ctx,
    ) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_DATA");
    expect(result.error).toContain("Hard cap is 16384 chars");
    expect(result.error).toContain("JSON pointers");
  });

  it("returns schema metadata for known paths", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    const result = dispatchToolCall(
      "vfs_schema",
      { paths: ["current/world/global.json", "current/outline/phases/phase42.json"] },
      ctx,
    ) as any;

    expect(result.success).toBe(true);
    expect(result.data.missing).toEqual([]);
    expect(result.data.schemas[0].classification.templateId).toBe("template.story.world");
    expect(result.data.schemas[1].classification.templateId).toBe(
      "template.narrative.outline.phases",
    );
  });

  it("supports vfs_ls includeExpected/includeAccess in plain mode", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    const result = dispatchToolCall(
      "vfs_ls",
      { path: "current/world", includeExpected: true, includeAccess: true },
      ctx,
    ) as any;

    expect(result.success).toBe(true);
    expect(Array.isArray(result.data.layout)).toBe(true);

    const scaffold = result.data.layout.find(
      (entry: any) => entry.path === "current/world/characters/README.md",
    );
    expect(scaffold).toBeDefined();
    expect(scaffold.expected).toBe(true);
    expect(scaffold.permissionClass).toBe("default_editable");
  });

  it("supports vfs_ls includeAccess in glob mode", () => {
    const session = new VfsSession();
    session.writeFile(
      "world/global.json",
      JSON.stringify(createValidGlobal()),
      "application/json",
    );
    const ctx = { vfsSession: session };

    const result = dispatchToolCall(
      "vfs_ls",
      {
        path: "current/world",
        patterns: ["**/*.json"],
        includeAccess: true,
      },
      ctx,
    ) as any;

    expect(result.success).toBe(true);
    expect(result.data.entries).toContain("current/world/global.json");
    expect(result.data.access[0].templateId).toBe("template.story.world");
  });
});
