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
  it("executes scripts in order with shared state + emitted values", async () => {
    const session = new VfsSession();
    const ctx = {
      vfsSession: session,
      allowedToolNames: ["vfs_vm", "vfs_write_file", "vfs_read_chars"],
    };

    const result = (await dispatchToolCallAsync(
      "vfs_vm",
      {
        scripts: [
          "state.path = 'current/world/vm.txt'; await vfs_write_file({ path: state.path, content: 'alpha', contentType: 'text/plain' }); emit({ step: 'write', path: state.path }); const read = await vfs_read_chars({ path: state.path, start: 0, offset: 16 }); emit({ step: 'read', content: read.data?.content }); return read.data?.content;",
        ],
      },
      ctx,
    )) as any;

    expect(result.success).toBe(true);
    expect(result.data?.scriptsCompleted).toBe(1);
    expect(result.data?.toolCallsUsed).toBe(2);
    expect(result.data?.emitted).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ step: "write" }),
        expect.objectContaining({ step: "read", content: "alpha" }),
      ]),
    );
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
        scripts: ["emit('a');", "emit('b');"],
      },
      ctx,
    )) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_PARAMS");
    expect(result.error).toContain("Provide exactly one script");
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
          "await call('vfs_write_file', { path: 'current/world/vm.txt', content: 'x', contentType: 'text/plain' });",
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
        scripts: ['await call("vfs_vm", { scripts: ["emit(1)"] });'],
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
          `await vfs_finish_turn(${JSON.stringify(createTurnFinishArgs())}); await vfs_read_chars({ path: "current/workspace/SOUL.md", start: 0, offset: 10 });`,
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
          `await vfs_finish_turn(${JSON.stringify(createTurnFinishArgs())}); await vfs_finish_turn(${JSON.stringify(createTurnFinishArgs())});`,
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
        scripts: ["const leak = globalThis; emit(leak);"],
      },
      ctx,
    )) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_ACTION");
    expect(result.error).toContain("VFS_VM_SCRIPT_FORBIDDEN_TOKEN");
    expect(result.error).toContain("line 1:");
  });

  it("keeps inner tool success/failure isolated and reports clear failing tool context", async () => {
    const session = new VfsSession();
    const ctx = {
      vfsSession: session,
      allowedToolNames: ["vfs_vm", "vfs_write_file", "vfs_read_json"],
    };

    const result = (await dispatchToolCallAsync(
      "vfs_vm",
      {
        scripts: [
          "await vfs_write_file({ path: 'current/world/notes.md', content: 'vm note', contentType: 'text/markdown' }); await vfs_read_json({ path: 'current/world/notes.md', pointers: ['/x'] });",
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
    expect(result.vmMeta?.callTrace?.length).toBe(2);
    expect(result.vmMeta?.callTrace?.[0]?.toolName).toBe("vfs_write_file");
    expect(result.vmMeta?.callTrace?.[0]?.success).toBe(true);
    expect(result.vmMeta?.callTrace?.[1]?.toolName).toBe("vfs_read_json");
    expect(result.vmMeta?.callTrace?.[1]?.success).toBe(false);
    expect(result.vmMeta?.callTrace?.[1]?.code).toBe("INVALID_DATA");
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
        scripts: ["throw new Error('boom');"],
      },
      ctx,
    )) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("UNKNOWN");
    expect(result.error).toContain("VFS_VM_SCRIPT_RUNTIME_ERROR");
    expect(result.error).toContain("scripts[0]");
    expect(result.error).toContain("boom");
  });
});
