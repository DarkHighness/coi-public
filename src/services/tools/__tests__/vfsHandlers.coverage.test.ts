import { describe, expect, it } from "vitest";
import { VfsSession } from "../../vfs/vfsSession";
import { dispatchToolCall, dispatchToolCallAsync } from "../handlers";

describe("VFS handlers additional coverage", () => {
  it("rejects vfs_ls includeExpected when patterns are provided", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    const result = dispatchToolCall(
      "vfs_ls",
      { path: "current/world", patterns: ["**/*.json"], includeExpected: true },
      ctx,
    ) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_DATA");
    expect(result.error).toContain("includeExpected");
  });

  it("requires pointers for vfs_read_json", () => {
    const session = new VfsSession();
    session.writeFile(
      "world/test.json",
      JSON.stringify({ a: 1 }),
      "application/json",
    );
    const ctx = { vfsSession: session };

    const result = dispatchToolCall(
      "vfs_read_json",
      { path: "current/world/test.json" },
      ctx,
    ) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_PARAMS");
    expect(result.error).toContain("pointers");
  });

  it("rejects vfs_read_json when file contents are invalid JSON", () => {
    const session = new VfsSession();
    session.restore({
      "world/bad.json": {
        path: "world/bad.json",
        content: "{",
        contentType: "application/json",
        hash: "bad",
        size: 1,
        updatedAt: Date.now(),
      },
    });
    const ctx = { vfsSession: session };

    const result = dispatchToolCall(
      "vfs_read_json",
      { path: "current/world/bad.json", pointers: ["/"] },
      ctx,
    ) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_DATA");
    expect(result.error).toContain("Invalid JSON");
  });

  it("supports successful line-window reads in vfs_read_lines", () => {
    const session = new VfsSession();
    session.writeFile(
      "world/lines.txt",
      ["alpha", "beta", "gamma"].join("\n"),
      "text/plain",
    );
    const ctx = { vfsSession: session };

    const result = dispatchToolCall(
      "vfs_read_lines",
      { path: "current/world/lines.txt", startLine: 2, lineCount: 2 },
      ctx,
    ) as any;

    expect(result.success).toBe(true);
    expect(result.data.content).toBe(["beta", "gamma"].join("\n"));
    expect(result.data.lineStart).toBe(2);
    expect(result.data.lineEnd).toBe(3);
    expect(result.data.totalLines).toBe(3);
    expect(result.data.truncated).toBe(true);
  });

  it("rejects vfs_write_file to JSON paths with non-JSON contentType", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    const result = dispatchToolCall(
      "vfs_write_file",
      {
        path: "current/world/global.json",
        content: JSON.stringify({ ok: true }),
        contentType: "text/plain",
      },
      ctx,
    ) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_DATA");
    expect(result.details?.tool).toBe("vfs_write_file");
    expect(result.error).toContain("application/json");
  });

  it("requires explicit contentType when write_file inference is impossible", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    const result = dispatchToolCall(
      "vfs_write_file",
      {
        path: "current/world/mystery_blob",
        content: "opaque",
      },
      ctx,
    ) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_DATA");
    expect(result.error).toContain("Unable to infer contentType");
  });

  it("enforces maxTotalChars on append_text", async () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    const result = (await dispatchToolCallAsync(
      "vfs_append_text",
      {
        path: "current/world/notes.md",
        content: "abcdefghij",
        maxTotalChars: 5,
      },
      ctx,
    )) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_DATA");
    expect(result.details?.tool).toBe("vfs_append_text");
    expect(result.error).toContain("maxTotalChars");
  });

  it("returns compact field-level schema errors for invalid JSON patch", () => {
    const session = new VfsSession();
    session.writeFile(
      "world/global.json",
      JSON.stringify({
        time: "Day 1",
        theme: "fantasy",
        currentLocation: "loc:1",
        atmosphere: {
          envTheme: "fantasy",
          ambience: "forest",
          weather: "clear",
        },
        turnNumber: 1,
        forkId: 0,
      }),
      "application/json",
    );
    const ctx = { vfsSession: session };
    dispatchToolCall("vfs_read_chars", { path: "current/world/global.json" }, ctx);

    const result = dispatchToolCall(
      "vfs_patch_json",
      {
        path: "current/world/global.json",
        patch: [
          {
            op: "replace",
            path: "/atmosphere/weather",
            value: "INVALID_WEATHER",
          },
        ],
      },
      ctx,
    ) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_DATA");
    expect(result.error).toContain("/atmosphere/weather");
    expect(result.error).toContain("directSubfields=[");
    expect(result.error.length).toBeLessThan(900);
  });

  it("rejects append_text when expectedHash mismatches existing file", () => {
    const session = new VfsSession();
    session.writeFile("world/notes.md", "hello", "text/markdown");
    const ctx = { vfsSession: session };

    dispatchToolCall("vfs_read_chars", { path: "current/world/notes.md" }, ctx);

    const result = dispatchToolCall(
      "vfs_append_text",
      {
        path: "current/world/notes.md",
        content: "world",
        expectedHash: "deadbeef",
      },
      ctx,
    ) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_ACTION");
    expect(result.error).toContain("Hash mismatch");
  });

  it("supports semantic search when embeddings are enabled and local semantic index returns hits", async () => {
    const session = new VfsSession();
    session.writeFile("world/notes.md", "alpha", "text/markdown");
    session.setSemanticIndexer(() => [
      { path: "world/notes.md", line: 1, text: "alpha" },
    ]);
    const ctx = { vfsSession: session, embeddingEnabled: true };

    const result = (await dispatchToolCallAsync(
      "vfs_search",
      { query: "alpha", semantic: true, path: "current/world", limit: 5 },
      ctx,
    )) as any;

    expect(result.success).toBe(true);
    expect(result.data.results[0].path).toBe("current/world/notes.md");
  });
});
