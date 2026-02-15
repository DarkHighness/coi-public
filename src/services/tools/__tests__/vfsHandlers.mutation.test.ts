import { describe, expect, it } from "vitest";
import { VfsSession } from "../../vfs/vfsSession";
import { dispatchToolCall } from "../handlers";
import { createValidGlobal } from "./vfsHandlers.helpers";

const createValidQuest = (id = "quest:test") => ({
  id,
  knownBy: ["char:player"],
  title: "Find the signal",
  type: "main",
  visible: {
    description: "Follow the trail.",
    objectives: ["Reach the old gate"],
  },
  hidden: {
    trueDescription: "A decoy path hides the real trap.",
    trueObjectives: ["Identify the decoy"],
    secretOutcome: "Ambush at dusk",
    twist: "The ally leaked the route",
  },
});

const createInventoryItem = () => ({
  id: "item:key",
  knownBy: ["char:player"],
  name: "Rusty Key",
  visible: {
    description: "A small iron key.",
  },
  hidden: {
    truth: "It opens the archive vault.",
  },
  unlocked: true,
  unlockReason: "Player inspected the maker's mark",
});

describe("VFS handlers mutations", () => {
  it("infers write_file contentType from path when omitted", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    const result = dispatchToolCall(
      "vfs_write",
      {
        ops: [
          {
            op: "write_file",
            path: "current/world/global.json",
            content: JSON.stringify(createValidGlobal()),
          },
        ],
      },
      ctx,
    ) as any;

    expect(result.success).toBe(true);
    const stored = session.readFile("world/global.json");
    expect(stored?.contentType).toBe("application/json");
  });

  it("writes and reads a JSON file via vfs_write ops", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    const writeResult = dispatchToolCall(
      "vfs_write",
      {
        ops: [
          {
            op: "write_file",
            path: "current/world/global.json",
            content: JSON.stringify(createValidGlobal()),
            contentType: "application/json",
          },
        ],
      },
      ctx,
    ) as any;

    expect(writeResult.success).toBe(true);
    expect(writeResult.data.written).toContain("current/world/global.json");

    const readResult = dispatchToolCall(
      "vfs_read",
      { path: "current/world/global.json" },
      ctx,
    ) as any;

    expect(readResult.success).toBe(true);
    expect(JSON.parse(readResult.data.content).time).toBe("Day 1");
  });

  it("enforces read-before-overwrite for existing files", () => {
    const session = new VfsSession();
    session.writeFile(
      "world/global.json",
      JSON.stringify(createValidGlobal()),
      "application/json",
    );
    const ctx = { vfsSession: session };

    const blocked = dispatchToolCall(
      "vfs_write",
      {
        ops: [
          {
            op: "write_file",
            path: "current/world/global.json",
            content: JSON.stringify({ ...createValidGlobal(), time: "Day 2" }),
            contentType: "application/json",
          },
        ],
      },
      ctx,
    ) as any;

    expect(blocked.success).toBe(false);
    expect(blocked.code).toBe("INVALID_ACTION");
    expect(blocked.details?.tool).toBe("vfs_write");
    expect(blocked.details?.batch).toMatchObject({
      index: 1,
      total: 1,
      operation: "write_file",
    });
    expect(blocked.details?.refs).toContain("current/refs/tools/vfs_write.md");

    dispatchToolCall("vfs_read", { path: "current/world/global.json" }, ctx);

    const ok = dispatchToolCall(
      "vfs_write",
      {
        ops: [
          {
            op: "write_file",
            path: "current/world/global.json",
            content: JSON.stringify({ ...createValidGlobal(), time: "Day 2" }),
            contentType: "application/json",
          },
        ],
      },
      ctx,
    ) as any;

    expect(ok.success).toBe(true);
  });

  it("adds per-item batch metadata for move/delete failures", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    const moveFail = dispatchToolCall(
      "vfs_move",
      {
        moves: [
          { from: "current/world/missing.json", to: "current/world/new.json" },
        ],
      },
      ctx,
    ) as any;

    expect(moveFail.success).toBe(false);
    expect(moveFail.details?.tool).toBe("vfs_move");
    expect(moveFail.details?.batch).toMatchObject({
      index: 1,
      total: 1,
      operation: "move",
    });

    const deleteFail = dispatchToolCall(
      "vfs_delete",
      { paths: ["current/world/missing.md"] },
      ctx,
    ) as any;

    expect(deleteFail.success).toBe(false);
    expect(deleteFail.details?.tool).toBe("vfs_delete");
    expect(deleteFail.details?.batch).toMatchObject({
      index: 1,
      total: 1,
      operation: "delete",
    });
  });

  it("supports patch_json after file is read", () => {
    const session = new VfsSession();
    session.writeFile(
      "world/global.json",
      JSON.stringify(createValidGlobal()),
      "application/json",
    );
    const ctx = { vfsSession: session };

    const blocked = dispatchToolCall(
      "vfs_write",
      {
        ops: [
          {
            op: "patch_json",
            path: "current/world/global.json",
            patch: [{ op: "replace", path: "/time", value: "Day 9" }],
          },
        ],
      },
      ctx,
    ) as any;

    expect(blocked.success).toBe(false);
    expect(blocked.code).toBe("INVALID_ACTION");

    dispatchToolCall("vfs_read", { path: "current/world/global.json" }, ctx);

    const ok = dispatchToolCall(
      "vfs_write",
      {
        ops: [
          {
            op: "patch_json",
            path: "current/world/global.json",
            patch: [{ op: "replace", path: "/time", value: "Day 9" }],
          },
        ],
      },
      ctx,
    ) as any;

    expect(ok.success).toBe(true);
  });

  it("returns concise patch_json error when pointer does not exist", () => {
    const session = new VfsSession();
    session.writeFile(
      "world/global.json",
      JSON.stringify(createValidGlobal()),
      "application/json",
    );
    const ctx = { vfsSession: session };
    dispatchToolCall("vfs_read", { path: "current/world/global.json" }, ctx);

    const result = dispatchToolCall(
      "vfs_write",
      {
        ops: [
          {
            op: "patch_json",
            path: "current/world/global.json",
            patch: [{ op: "replace", path: "/missing/path", value: "x" }],
          },
        ],
      },
      ctx,
    ) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_DATA");
    expect(result.error).toContain('pointer "/missing/path" does not exist');
    expect(result.error).toContain("current/world/global.json");
    expect(result.error).not.toContain("forks/0/story/world/global.json");
    expect(result.error).not.toContain("tree:");
  });

  it("supports merge_json after file is read", () => {
    const session = new VfsSession();
    session.writeFile(
      "world/global.json",
      JSON.stringify(createValidGlobal()),
      "application/json",
    );
    const ctx = { vfsSession: session };

    dispatchToolCall("vfs_read", { path: "current/world/global.json" }, ctx);

    const result = dispatchToolCall(
      "vfs_write",
      {
        ops: [
          {
            op: "merge_json",
            path: "current/world/global.json",
            content: { customContext: "merged" },
          },
        ],
      },
      ctx,
    ) as any;

    expect(result.success).toBe(true);
  });

  it("warns and strips canonical unlocked fields on write_file", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    const result = dispatchToolCall(
      "vfs_write",
      {
        ops: [
          {
            op: "write_file",
            path: "current/world/quests/quest:test.json",
            content: JSON.stringify({
              ...createValidQuest("quest:test"),
              unlocked: true,
              unlockReason: "should be ignored",
            }),
          },
        ],
      },
      ctx,
    ) as any;

    expect(result.success).toBe(true);
    expect(result.data.warnings?.length ?? 0).toBeGreaterThan(0);

    const quest = JSON.parse(
      session.readFile("world/quests/quest:test.json")?.content ?? "{}",
    ) as Record<string, unknown>;
    expect(quest.unlocked).toBeUndefined();
    expect(quest.unlockReason).toBeUndefined();
  });

  it("warns and strips canonical unlocked fields on merge_json", () => {
    const session = new VfsSession();
    session.writeFile(
      "world/quests/quest:test.json",
      JSON.stringify(createValidQuest("quest:test")),
      "application/json",
    );
    const ctx = { vfsSession: session };
    dispatchToolCall("vfs_read", { path: "current/world/quests/quest:test.json" }, ctx);

    const result = dispatchToolCall(
      "vfs_write",
      {
        ops: [
          {
            op: "merge_json",
            path: "current/world/quests/quest:test.json",
            content: {
              title: "Updated title",
              unlocked: true,
              unlockReason: "ignored",
            },
          },
        ],
      },
      ctx,
    ) as any;

    expect(result.success).toBe(true);
    expect(result.data.warnings?.length ?? 0).toBeGreaterThan(0);

    const quest = JSON.parse(
      session.readFile("world/quests/quest:test.json")?.content ?? "{}",
    ) as Record<string, unknown>;
    expect(quest.title).toBe("Updated title");
    expect(quest.unlocked).toBeUndefined();
  });

  it("warns and ignores canonical unlocked patch ops", () => {
    const session = new VfsSession();
    session.writeFile(
      "world/quests/quest:test.json",
      JSON.stringify(createValidQuest("quest:test")),
      "application/json",
    );
    const ctx = { vfsSession: session };
    dispatchToolCall("vfs_read", { path: "current/world/quests/quest:test.json" }, ctx);

    const result = dispatchToolCall(
      "vfs_write",
      {
        ops: [
          {
            op: "patch_json",
            path: "current/world/quests/quest:test.json",
            patch: [
              { op: "replace", path: "/unlocked", value: true },
              { op: "replace", path: "/title", value: "Patched title" },
            ],
          },
        ],
      },
      ctx,
    ) as any;

    expect(result.success).toBe(true);
    expect(result.data.warnings?.length ?? 0).toBeGreaterThan(0);

    const quest = JSON.parse(
      session.readFile("world/quests/quest:test.json")?.content ?? "{}",
    ) as Record<string, unknown>;
    expect(quest.title).toBe("Patched title");
    expect(quest.unlocked).toBeUndefined();
  });

  it("injects missing entityId for actor views", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    const result = dispatchToolCall(
      "vfs_write",
      {
        ops: [
          {
            op: "write_file",
            path: "current/world/characters/char:player/views/quests/quest:player-track.json",
            content: JSON.stringify({
              status: "active",
            }),
          },
        ],
      },
      ctx,
    ) as any;

    expect(result.success).toBe(true);
    const view = JSON.parse(
      session.readFile(
        "world/characters/char:player/views/quests/quest:player-track.json",
      )?.content ?? "{}",
    ) as Record<string, unknown>;
    expect(view.entityId).toBe("quest:player-track");
    expect(view.status).toBe("active");
  });

  it("blocks unlocked regression from true to false", () => {
    const session = new VfsSession();
    session.writeFile(
      "world/characters/char:player/inventory/item:key.json",
      JSON.stringify(createInventoryItem()),
      "application/json",
    );
    const ctx = { vfsSession: session };
    dispatchToolCall(
      "vfs_read",
      { path: "current/world/characters/char:player/inventory/item:key.json" },
      ctx,
    );

    const result = dispatchToolCall(
      "vfs_write",
      {
        ops: [
          {
            op: "patch_json",
            path: "current/world/characters/char:player/inventory/item:key.json",
            patch: [{ op: "replace", path: "/unlocked", value: false }],
          },
        ],
      },
      ctx,
    ) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_DATA");
    expect(result.error).toContain("Unlock regression is not allowed");
  });

  it("supports append_text and edit_lines", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    const create = dispatchToolCall(
      "vfs_write",
      {
        ops: [
          {
            op: "append_text",
            path: "current/world/notes.md",
            content: "alpha",
          },
        ],
      },
      ctx,
    ) as any;

    expect(create.success).toBe(true);

    dispatchToolCall("vfs_read", { path: "current/world/notes.md" }, ctx);

    const append = dispatchToolCall(
      "vfs_write",
      {
        ops: [
          {
            op: "append_text",
            path: "current/world/notes.md",
            content: "beta",
          },
        ],
      },
      ctx,
    ) as any;

    expect(append.success).toBe(true);

    dispatchToolCall("vfs_read", { path: "current/world/notes.md" }, ctx);

    const edit = dispatchToolCall(
      "vfs_write",
      {
        ops: [
          {
            op: "edit_lines",
            path: "current/world/notes.md",
            edits: [
              {
                kind: "replace_range",
                startLine: 2,
                endLine: 2,
                content: "gamma",
              },
            ],
          },
        ],
      },
      ctx,
    ) as any;

    expect(edit.success).toBe(true);

    const readBack = dispatchToolCall(
      "vfs_read",
      { path: "current/world/notes.md", mode: "chars" },
      ctx,
    ) as any;

    expect(readBack.success).toBe(true);
    expect(readBack.data.content).toBe("alpha\ngamma");
  });

  it("blocks writes to immutable skill paths", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    const result = dispatchToolCall(
      "vfs_write",
      {
        ops: [
          {
            op: "write_file",
            path: "current/skills/local-test.md",
            content: "x",
            contentType: "text/markdown",
          },
        ],
      },
      ctx,
    ) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("IMMUTABLE_READONLY");
    expect(result.error).toContain("current/skills/local-test.md");
    expect(result.error).not.toContain("shared/system/skills");
  });

  it("blocks generic writes to finish-guarded summary path", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    const result = dispatchToolCall(
      "vfs_write",
      {
        ops: [
          {
            op: "write_file",
            path: "current/summary/state.json",
            content: JSON.stringify({ summaries: [], lastSummarizedIndex: 0 }),
            contentType: "application/json",
          },
        ],
      },
      ctx,
    ) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("FINISH_GUARD_REQUIRED");
  });

  it("enforces read-before-delete for existing files", () => {
    const session = new VfsSession();
    session.writeFile("world/notes.md", "hello", "text/markdown");
    const ctx = { vfsSession: session };

    const blocked = dispatchToolCall(
      "vfs_delete",
      { paths: ["current/world/notes.md"] },
      ctx,
    ) as any;

    expect(blocked.success).toBe(false);
    expect(blocked.code).toBe("INVALID_ACTION");

    dispatchToolCall("vfs_read", { path: "current/world/notes.md" }, ctx);

    const ok = dispatchToolCall(
      "vfs_delete",
      { paths: ["current/world/notes.md"] },
      ctx,
    ) as any;

    expect(ok.success).toBe(true);
    expect(ok.data.deleted).toContain("current/world/notes.md");
  });

  it("does not rebase explicit canonical fork paths across activeForkId", () => {
    const session = new VfsSession();
    const ctx = {
      vfsSession: session,
      gameState: { forkId: 1, turnNumber: 0 } as any,
    };

    const writeResult = dispatchToolCall(
      "vfs_write",
      {
        ops: [
          {
            op: "write_file",
            path: "forks/0/story/world/global.json",
            content: JSON.stringify(createValidGlobal()),
            contentType: "application/json",
          },
        ],
      },
      ctx,
    ) as any;

    expect(writeResult.success).toBe(true);

    const snapshot = session.snapshotCanonical();
    expect(Object.keys(snapshot)).toContain("forks/0/story/world/global.json");
    expect(Object.keys(snapshot)).not.toContain(
      "forks/1/story/world/global.json",
    );
  });

  it("requires reading destination before vfs_move overwrites it", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    const seed = dispatchToolCall(
      "vfs_write",
      {
        ops: [
          {
            op: "write_file",
            path: "current/world/a.txt",
            content: "A",
            contentType: "text/plain",
          },
          {
            op: "write_file",
            path: "current/world/b.txt",
            content: "B",
            contentType: "text/plain",
          },
        ],
      },
      ctx,
    ) as any;

    expect(seed.success).toBe(true);

    const blocked = dispatchToolCall(
      "vfs_move",
      { moves: [{ from: "current/world/a.txt", to: "current/world/b.txt" }] },
      ctx,
    ) as any;

    expect(blocked.success).toBe(false);
    expect(blocked.code).toBe("INVALID_ACTION");
    expect(blocked.details?.tool).toBe("vfs_move");

    dispatchToolCall("vfs_read", { path: "current/world/b.txt" }, ctx);

    const ok = dispatchToolCall(
      "vfs_move",
      { moves: [{ from: "current/world/a.txt", to: "current/world/b.txt" }] },
      ctx,
    ) as any;

    expect(ok.success).toBe(true);
  });
});
