import { describe, expect, it } from "vitest";
import { VfsSession } from "../../vfs/vfsSession";
import { dispatchToolCallAsync } from "../handlers";

const createTurnFinishArgs = () => ({
  assistant: {
    narrative: "You confirm the ledger and close the cycle.",
    choices: [{ text: "Move forward" }, { text: "Wait and observe" }],
  },
});

describe("VFS handlers vm", () => {
  it("executes async main(ctx) and returns only main result with bounded logs", async () => {
    const session = new VfsSession();
    const ctx = {
      vfsSession: session,
      allowedToolNames: ["vfs_vm", "vfs_write_file", "vfs_read_chars"],
    };

    const result = (await dispatchToolCallAsync(
      "vfs_vm",
      {
        scripts: [
          [
            "async function main(ctx) {",
            "  ctx.state.path = 'current/world/vm.txt';",
            "  await ctx.vfs_write_file({ path: ctx.state.path, content: 'alpha', contentType: 'text/plain' });",
            "  console.log('write', ctx.state.path);",
            "  const read = await ctx.vfs_read_chars({ path: ctx.state.path, start: 0, offset: 16 });",
            "  console.log({ step: 'read', content: read.data?.content });",
            "  return read.data?.content;",
            "}",
          ].join("\n"),
        ],
      },
      ctx,
    )) as any;

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe("alpha");
    expect(result.data?.vmMeta?.scriptsCompleted).toBe(1);
    expect(result.data?.vmMeta?.toolCallsUsed).toBe(2);
    expect(Array.isArray(result.data?.logs)).toBe(true);
    expect(result.data?.logs?.[0]?.message).toContain("write");
    expect(result.data?.logs?.[1]?.message).toContain("read");
    expect(result.data?.emitted).toBeUndefined();
    expect(session.readFile("world/vm.txt")?.content).toBe("alpha");
  });

  it("rejects multiple scripts in one vm call", async () => {
    const session = new VfsSession();
    const ctx = {
      vfsSession: session,
      allowedToolNames: ["vfs_vm", "vfs_read_chars"],
    };

    const result = (await dispatchToolCallAsync(
      "vfs_vm",
      {
        scripts: ["async function main(ctx) { return 'a'; }", "return 'b';"],
      },
      ctx,
    )) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_PARAMS");
    expect(result.error).toContain("Provide exactly one script");
  });

  it("requires scripts to declare async main(ctx)", async () => {
    const session = new VfsSession();
    const ctx = {
      vfsSession: session,
      allowedToolNames: ["vfs_vm"],
    };

    const result = (await dispatchToolCallAsync(
      "vfs_vm",
      {
        scripts: ["const x = 1;"],
      },
      ctx,
    )) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_PARAMS");
    expect(result.error).toContain("VFS_VM_MISSING_MAIN");
  });

  it("requires main(ctx) to be async", async () => {
    const session = new VfsSession();
    const ctx = {
      vfsSession: session,
      allowedToolNames: ["vfs_vm"],
    };

    const result = (await dispatchToolCallAsync(
      "vfs_vm",
      {
        scripts: ["function main(ctx) { return 1; }"],
      },
      ctx,
    )) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_PARAMS");
    expect(result.error).toContain("VFS_VM_MAIN_NOT_ASYNC");
  });

  it("rejects inner tool calls outside runtime allowlist", async () => {
    const session = new VfsSession();
    const ctx = {
      vfsSession: session,
      allowedToolNames: ["vfs_vm", "vfs_read_chars"],
    };

    const result = (await dispatchToolCallAsync(
      "vfs_vm",
      {
        scripts: [
          [
            "async function main(ctx) {",
            "  await ctx.call('vfs_write_file', { path: 'current/world/vm.txt', content: 'x', contentType: 'text/plain' });",
            "}",
          ].join("\n"),
        ],
      },
      ctx,
    )) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_ACTION");
    expect(result.error).toContain("VFS_VM_TOOL_NOT_ALLOWED");
  });

  it("rejects recursive vfs_vm calls", async () => {
    const session = new VfsSession();
    const ctx = {
      vfsSession: session,
      allowedToolNames: ["vfs_vm"],
    };

    const result = (await dispatchToolCallAsync(
      "vfs_vm",
      {
        scripts: [
          [
            "async function main(ctx) {",
            "  await ctx.call('vfs_vm', { scripts: ['async function main(ctx) { return 1; }'] });",
            "}",
          ].join("\n"),
        ],
      },
      ctx,
    )) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_ACTION");
    expect(result.error).toContain("VFS_VM_RECURSION_BLOCKED");
  });

  it("rejects finish calls that are repeated or not last inside vm", async () => {
    const session = new VfsSession();
    const ctx = {
      vfsSession: session,
      allowedToolNames: ["vfs_vm", "vfs_finish_turn", "vfs_read_chars"],
      vfsTurnUserAction: "Check the checkpoint",
    };

    const finishNotLast = (await dispatchToolCallAsync(
      "vfs_vm",
      {
        scripts: [
          [
            "async function main(ctx) {",
            `  await ctx.vfs_finish_turn(${JSON.stringify(createTurnFinishArgs())});`,
            '  await ctx.vfs_read_chars({ path: "current/workspace/SOUL.md", start: 0, offset: 10 });',
            "}",
          ].join("\n"),
        ],
      },
      ctx,
    )) as any;

    expect(finishNotLast.success).toBe(false);
    expect(finishNotLast.code).toBe("INVALID_ACTION");
    expect(finishNotLast.error).toContain("VFS_VM_FINISH_NOT_LAST");

    const multipleFinish = (await dispatchToolCallAsync(
      "vfs_vm",
      {
        scripts: [
          [
            "async function main(ctx) {",
            `  await ctx.vfs_finish_turn(${JSON.stringify(createTurnFinishArgs())});`,
            `  await ctx.vfs_finish_turn(${JSON.stringify(createTurnFinishArgs())});`,
            "}",
          ].join("\n"),
        ],
      },
      ctx,
    )) as any;

    expect(multipleFinish.success).toBe(false);
    expect(multipleFinish.code).toBe("INVALID_ACTION");
    expect(multipleFinish.error).toContain("VFS_VM_MULTIPLE_FINISH_CALLS");
  });

  it("rejects scripts containing dangerous keywords", async () => {
    const session = new VfsSession();
    const ctx = {
      vfsSession: session,
      allowedToolNames: ["vfs_vm"],
    };

    const result = (await dispatchToolCallAsync(
      "vfs_vm",
      {
        scripts: [
          [
            "async function main(ctx) {",
            "  const leak = globalThis;",
            "  console.log(leak);",
            "}",
          ].join("\n"),
        ],
      },
      ctx,
    )) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_ACTION");
    expect(result.error).toContain("VFS_VM_SCRIPT_FORBIDDEN_TOKEN");
    expect(result.error).toContain("line 2:");
  });

  it("rejects VFS namespace usage and points to ctx helper calls", async () => {
    const session = new VfsSession();
    const ctx = {
      vfsSession: session,
      allowedToolNames: ["vfs_vm", "vfs_read_chars"],
    };

    const result = (await dispatchToolCallAsync(
      "vfs_vm",
      {
        scripts: [
          [
            "async function main(ctx) {",
            "  const data = await VFS.read({ path: 'current/world/global.json' });",
            "  return data;",
            "}",
          ].join("\n"),
        ],
      },
      ctx,
    )) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_ACTION");
    expect(result.error).toContain("VFS_VM_NAMESPACE_BLOCKED");
    expect(result.error).toContain("ctx.vfs_read_chars");
  });

  it("rejects bare VFS variable reads with actionable namespace guidance", async () => {
    const session = new VfsSession();
    const ctx = {
      vfsSession: session,
      allowedToolNames: ["vfs_vm"],
    };

    const result = (await dispatchToolCallAsync(
      "vfs_vm",
      {
        scripts: [
          [
            "async function main(ctx) {",
            "  return VFS;",
            "}",
          ].join("\n"),
        ],
      },
      ctx,
    )) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_ACTION");
    expect(result.error).toContain("VFS_VM_NAMESPACE_BLOCKED");
    expect(result.error).toContain("references \"VFS\" variable");
    expect(result.error).toContain("ctx.vfs_read_chars");
  });

  it("keeps inner tool failure isolated and reports clear failing tool context", async () => {
    const session = new VfsSession();
    const ctx = {
      vfsSession: session,
      allowedToolNames: ["vfs_vm", "vfs_write_file", "vfs_read_json"],
    };

    const result = (await dispatchToolCallAsync(
      "vfs_vm",
      {
        scripts: [
          [
            "async function main(ctx) {",
            "  await ctx.vfs_write_file({ path: 'current/world/notes.md', content: 'vm note', contentType: 'text/markdown' });",
            "  await ctx.vfs_read_json({ path: 'current/world/notes.md', pointers: ['/x'] });",
            "}",
          ].join("\n"),
        ],
      },
      ctx,
    )) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_DATA");
    expect(result.error).toContain("VFS_VM_INNER_TOOL_ERROR");
    expect(result.error).toContain('tool="vfs_read_json"');
    expect(result.error).toContain("scripts[0]");
    expect(result.error).toContain("line ");
    expect(result.data?.vmMeta?.writes?.successfulTargets).toContain(
      "current/world/notes.md",
    );
    expect(session.readFile("world/notes.md")?.content).toContain("vm note");
  });

  it("reports compile-time script errors with clear context", async () => {
    const session = new VfsSession();
    const ctx = {
      vfsSession: session,
      allowedToolNames: ["vfs_vm"],
    };

    const result = (await dispatchToolCallAsync(
      "vfs_vm",
      {
        scripts: ["const broken = ;"],
      },
      ctx,
    )) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_PARAMS");
    expect(result.error).toContain("VFS_VM_SCRIPT_SYNTAX_ERROR");
    expect(result.error).toContain("scripts[0]");
    expect(result.error).toContain("failed to compile as JavaScript");
  });

  it("reports runtime script errors with clear context", async () => {
    const session = new VfsSession();
    const ctx = {
      vfsSession: session,
      allowedToolNames: ["vfs_vm"],
    };

    const result = (await dispatchToolCallAsync(
      "vfs_vm",
      {
        scripts: [
          [
            "async function main(ctx) {",
            "  throw new Error('boom');",
            "}",
          ].join("\n"),
        ],
      },
      ctx,
    )) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("UNKNOWN");
    expect(result.error).toContain("VFS_VM_SCRIPT_RUNTIME_ERROR");
    expect(result.error).toContain("scripts[0]");
    expect(result.error).toContain("boom");
  });

  it("truncates vm logs and marks truncation", async () => {
    const session = new VfsSession();
    const ctx = {
      vfsSession: session,
      allowedToolNames: ["vfs_vm"],
    };

    const result = (await dispatchToolCallAsync(
      "vfs_vm",
      {
        scripts: [
          [
            "async function main(ctx) {",
            "  for (let i = 0; i < 60; i += 1) {",
            "    console.log('entry', i, 'x'.repeat(300));",
            "  }",
            "  return 'ok';",
            "}",
          ].join("\n"),
        ],
      },
      ctx,
    )) as any;

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe("ok");
    expect(result.data?.logs?.length).toBeLessThanOrEqual(40);
    expect(result.data?.logs?.some((entry: any) => entry.truncated)).toBe(true);
  });
});
