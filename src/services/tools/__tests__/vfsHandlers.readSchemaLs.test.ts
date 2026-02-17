import { describe, expect, it } from "vitest";
import { VfsSession } from "../../vfs/vfsSession";
import { resolveVfsReadTokenBudget } from "../../ai/contextUsage";
import { dispatchToolCall } from "../handlers";
import { createValidGlobal } from "./vfsHandlers.helpers";

const DEFAULT_READ_TOKEN_BUDGET =
  resolveVfsReadTokenBudget(undefined).tokenBudget;

describe("VFS handlers read/schema/ls", () => {
  it("supports char slicing and guards invalid start-only char reads", () => {
    const session = new VfsSession();
    session.writeFile(
      "world/slice.txt",
      "abcdefghijklmnopqrstuvwxyz",
      "text/plain",
    );
    const ctx = { vfsSession: session };

    const ok = dispatchToolCall(
      "vfs_read_chars",
      { path: "current/world/slice.txt", start: 5, offset: 3 },
      ctx,
    ) as any;

    expect(ok.success).toBe(true);
    expect(ok.data.content).toBe("fgh");
    expect(ok.data.truncated).toBe(true);
    expect(ok.data.warnings).toBeUndefined();

    const clamped = dispatchToolCall(
      "vfs_read_chars",
      { path: "current/world/slice.txt", start: 24, offset: 99 },
      ctx,
    ) as any;
    expect(clamped.success).toBe(true);
    expect(clamped.data.content).toBe("yz");
    expect(clamped.data.sliceStart).toBe(24);
    expect(clamped.data.requestedEndExclusive).toBe(123);
    expect(clamped.data.sliceEndExclusive).toBe(26);
    expect(clamped.data.warnings?.[0]).toContain("requested end=123");
    expect(clamped.data.warnings?.[0]).toContain("max end=26");
    expect(clamped.data.warnings?.[0]).toContain("clamped to 26");

    const invalid = dispatchToolCall(
      "vfs_read_chars",
      { path: "current/world/slice.txt", start: 1 },
      ctx,
    ) as any;

    expect(invalid.success).toBe(false);
    expect(invalid.code).toBe("INVALID_DATA");
  });

  it("clamps line ranges whose end exceeds file lines and returns warning", () => {
    const session = new VfsSession();
    session.writeFile("world/lines.txt", "a\nb\nc", "text/plain");
    const ctx = { vfsSession: session };

    const result = dispatchToolCall(
      "vfs_read_lines",
      { path: "current/world/lines.txt", startLine: 2, endLine: 99 },
      ctx,
    ) as any;

    expect(result.success).toBe(true);
    expect(result.data.content).toBe("b\nc");
    expect(result.data.lineStart).toBe(2);
    expect(result.data.requestedLineEnd).toBe(99);
    expect(result.data.lineEnd).toBe(3);
    expect(result.data.totalLines).toBe(3);
    expect(result.data.warnings?.[0]).toContain("requested endLine=99");
    expect(result.data.warnings?.[0]).toContain("max endLine=3");
    expect(result.data.warnings?.[0]).toContain("clamped to 3");
  });

  it("supports JSON pointer extraction in vfs_read_json", () => {
    const session = new VfsSession();
    session.writeFile(
      "world/global.json",
      JSON.stringify(createValidGlobal()),
      "application/json",
    );
    const ctx = { vfsSession: session };

    const result = dispatchToolCall(
      "vfs_read_json",
      { path: "current/world/global.json", pointers: ["/theme", "/missing"] },
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
      "vfs_read_chars",
      { path: "current/world/huge.txt" },
      ctx,
    ) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_DATA");
    expect(result.error).toContain(
      `Token budget is ${DEFAULT_READ_TOKEN_BUDGET}`,
    );
    expect(result.error).toContain("requested char range");
    expect(result.details?.tool).toBe("vfs_read_chars");
    expect(result.details?.issues?.[0]?.code).toBe("READ_LIMIT_EXCEEDED");
    expect(result.details?.recovery?.[0]).toContain("details.hint.nextCalls");
    expect(result.details?.hint?.code).toBe("READ_LIMIT_HINT");
    expect(result.details?.hint?.summary).toContain("Do not retry path-only");
    expect(result.details?.hint?.avoid).toContain(
      'vfs_read_chars({ path: "current/world/huge.txt" })',
    );
    expect(result.details?.hint?.nextCalls?.[0]).toContain(
      'vfs_read_lines({ path: "current/world/huge.txt", startLine: 1, lineCount: 200 })',
    );
    expect(result.details?.hint?.metadata?.path).toBe("current/world/huge.txt");
    expect(result.details?.refs).toContain(
      "current/refs/tools/vfs_read_chars/README.md",
    );
  });

  it("rejects oversized line-window reads and guides chunked strategies", () => {
    const session = new VfsSession();
    const longLine = "1234567890".repeat(200);
    const content = Array.from({ length: 12 }, () => longLine).join("\n");
    session.writeFile("world/huge-lines.txt", content, "text/plain");
    const ctx = { vfsSession: session };

    const result = dispatchToolCall(
      "vfs_read_lines",
      { path: "current/world/huge-lines.txt", startLine: 1, endLine: 12 },
      ctx,
    ) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_DATA");
    expect(result.error).toContain(
      `Token budget is ${DEFAULT_READ_TOKEN_BUDGET}`,
    );
    expect(result.error).toContain("requested line range");
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
      "vfs_read_json",
      { path: "current/world/big.json", pointers: ["/big"] },
      ctx,
    ) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_DATA");
    expect(result.error).toContain(
      `Token budget is ${DEFAULT_READ_TOKEN_BUDGET}`,
    );
    expect(result.error).toContain("JSON pointers");
  });

  it("derives dynamic read token budget from model context window and enforces it consistently", () => {
    const session = new VfsSession();
    const dynamicContextTokens = 100_000;
    const dynamicTokenBudget = Math.floor(dynamicContextTokens * 0.01);
    const oversizedText = "x".repeat(dynamicTokenBudget * 5);

    session.writeFile("world/large.txt", oversizedText, "text/plain");
    session.writeFile(
      "world/large.json",
      JSON.stringify({ big: oversizedText }),
      "application/json",
    );

    const ctx = {
      vfsSession: session,
      settings: {
        story: { providerId: "provider-1", modelId: "model-1" },
        providers: { instances: [{ id: "provider-1", protocol: "openai" }] },
        modelContextWindows: { "provider-1::model-1": dynamicContextTokens },
      },
    };

    const charsDefaultRead = dispatchToolCall(
      "vfs_read_chars",
      { path: "current/world/large.txt" },
      ctx as any,
    ) as any;
    expect(charsDefaultRead.success).toBe(false);
    expect(charsDefaultRead.error).toContain(
      `Token budget is ${dynamicTokenBudget}`,
    );

    const charsOffsetTooLarge = dispatchToolCall(
      "vfs_read_chars",
      {
        path: "current/world/large.txt",
        start: 0,
        offset: oversizedText.length + 1,
      },
      ctx as any,
    ) as any;
    expect(charsOffsetTooLarge.success).toBe(false);
    expect(charsOffsetTooLarge.error).toContain(
      `Token budget is ${dynamicTokenBudget}`,
    );

    const linesTooLarge = dispatchToolCall(
      "vfs_read_lines",
      { path: "current/world/large.txt", startLine: 1, endLine: 1 },
      ctx as any,
    ) as any;
    expect(linesTooLarge.success).toBe(false);
    expect(linesTooLarge.error).toContain(
      `Token budget is ${dynamicTokenBudget}`,
    );

    const jsonTooLarge = dispatchToolCall(
      "vfs_read_json",
      { path: "current/world/large.json", pointers: ["/big"] },
      ctx as any,
    ) as any;
    expect(jsonTooLarge.success).toBe(false);
    expect(jsonTooLarge.error).toContain(
      `Token budget is ${dynamicTokenBudget}`,
    );
  });

  it("returns schema metadata for known paths", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    const result = dispatchToolCall(
      "vfs_schema",
      {
        paths: [
          "current/world/global.json",
          "current/outline/phases/phase42.json",
        ],
      },
      ctx,
    ) as any;

    expect(result.success).toBe(true);
    expect(result.data.missing).toEqual([]);
    expect(result.data.schemas[0].classification.templateId).toBe(
      "template.story.world",
    );
    expect(result.data.schemas[1].classification.templateId).toBe(
      "template.narrative.outline.phases",
    );
  });

  it("returns template-hint schema metadata for session jsonl path", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    const result = dispatchToolCall(
      "vfs_schema",
      { paths: ["current/conversation/session.jsonl"] },
      ctx,
    ) as any;

    expect(result.success).toBe(true);
    expect(result.data.missing).toEqual([]);
    expect(result.data.schemas[0].classification.templateId).toBe(
      "template.story.conversation.session_jsonl",
    );
    expect(result.data.schemas[0].hint).toContain(
      "Template: template.story.conversation.session_jsonl",
    );
  });

  it("returns markdown section tree in vfs_schema for markdown paths", () => {
    const session = new VfsSession();
    session.writeFile(
      "world/notes.md",
      ["# Root", "", "text", "", "## Child", "", "more"].join("\n"),
      "text/markdown",
    );
    const ctx = { vfsSession: session };

    const result = dispatchToolCall(
      "vfs_schema",
      { paths: ["current/world/notes.md"] },
      ctx,
    ) as any;

    expect(result.success).toBe(true);
    expect(result.data.schemas[0].markdownSections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          index: "1",
          title: "Root",
          children: expect.arrayContaining([
            expect.objectContaining({
              index: "1.1",
              title: "Child",
            }),
          ]),
        }),
      ]),
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
    expect(Array.isArray(result.data.stats)).toBe(true);
    expect(Array.isArray(result.data.hints)).toBe(true);

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
    expect(Array.isArray(result.data.stats)).toBe(true);
    expect(Array.isArray(result.data.hints)).toBe(true);
    expect(result.data.access[0].templateId).toBe("template.story.world");
  });

  it("includes expected session jsonl path in conversation layout", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    const result = dispatchToolCall(
      "vfs_ls",
      {
        path: "current/conversation",
        includeExpected: true,
        includeAccess: true,
      },
      ctx,
    ) as any;

    expect(result.success).toBe(true);
    const sessionJsonl = result.data.layout.find(
      (entry: any) => entry.path === "current/conversation/session.jsonl",
    );
    expect(sessionJsonl).toBeDefined();
    expect(sessionJsonl.exists).toBe(false);
    expect(sessionJsonl.expected).toBe(true);
    expect(sessionJsonl.permissionClass).toBe("finish_guarded");
    expect(Array.isArray(result.data.hints)).toBe(true);
  });
});
