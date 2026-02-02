import { describe, it, expect } from "vitest";
import { VfsSession } from "../../vfs/vfsSession";
import { dispatchToolCall } from "../handlers";
import type { GameDatabase } from "../../gameDatabase";

describe("VFS handlers", () => {
  it("writes and reads files via dispatch", () => {
    const session = new VfsSession();
    const ctx = { db: {} as GameDatabase, vfsSession: session };

    const writeResult = dispatchToolCall(
      "vfs_write",
      {
        files: [
          {
            path: "current/world/global.json",
            content: "{}",
            contentType: "application/json",
          },
        ],
      },
      ctx,
    ) as { success: boolean; data?: { written?: string[] } };

    expect(writeResult.success).toBe(true);

    const readResult = dispatchToolCall(
      "vfs_read",
      { path: "current/world/global.json" },
      ctx,
    ) as { success: boolean; data?: { content?: string } };

    expect(readResult.success).toBe(true);
    expect(readResult.data?.content).toBe("{}");
  });

  it("falls back to text search for semantic queries", () => {
    const session = new VfsSession();
    const ctx = { db: {} as GameDatabase, vfsSession: session };

    session.writeFile("world/global.json", "hello world", "text/plain");

    const searchResult = dispatchToolCall(
      "vfs_search",
      { query: "hello", semantic: true },
      ctx,
    ) as { success: boolean; data?: { results?: Array<{ text: string }> } };

    expect(searchResult.success).toBe(true);
    expect(searchResult.data?.results?.[0]?.text).toContain("hello");
  });

  it("rejects non-current paths and returns current-prefixed paths", () => {
    const session = new VfsSession();
    const ctx = { db: {} as GameDatabase, vfsSession: session };

    const badWrite = dispatchToolCall(
      "vfs_write",
      {
        files: [
          {
            path: "world/global.json",
            content: "{}",
            contentType: "application/json",
          },
        ],
      },
      ctx,
    ) as { success: boolean };

    expect(badWrite.success).toBe(false);

    const okWrite = dispatchToolCall(
      "vfs_write",
      {
        files: [
          {
            path: "current/world/global.json",
            content: "{}",
            contentType: "application/json",
          },
        ],
      },
      ctx,
    ) as { success: boolean };

    expect(okWrite.success).toBe(true);

    const readResult = dispatchToolCall(
      "vfs_read",
      { path: "current/world/global.json" },
      ctx,
    ) as { success: boolean; data?: { path?: string } };

    expect(readResult.success).toBe(true);
    expect(readResult.data?.path).toBe("current/world/global.json");
  });

  it("merges JSON objects and preserves existing fields", () => {
    const session = new VfsSession();
    const ctx = { db: {} as GameDatabase, vfsSession: session };

    session.writeFile(
      "world/npcs/npc:1.json",
      JSON.stringify({
        id: "npc:1",
        currentLocation: "loc:1",
        visible: {
          name: "A",
          description: "x",
          npcType: "Friend",
          affinity: 50,
        },
        hidden: {
          realPersonality: "y",
          realMotives: "z",
          npcType: "Tool",
          impression: "neutral",
          status: "idle",
        },
      }),
      "application/json",
    );

    const mergeResult = dispatchToolCall(
      "vfs_merge",
      {
        files: [
          {
            path: "current/world/npcs/npc:1.json",
            content: { visible: { name: "B" } },
          },
        ],
      },
      ctx,
    ) as { success: boolean };

    expect(mergeResult.success).toBe(true);

    const updated = JSON.parse(
      session.readFile("world/npcs/npc:1.json")!.content,
    );
    expect(updated.visible.name).toBe("B");
    expect(updated.visible.description).toBe("x");
  });

  it("replaces arrays on merge", () => {
    const session = new VfsSession();
    const ctx = { db: {} as GameDatabase, vfsSession: session };

    session.writeFile(
      "conversation/turn.json",
      JSON.stringify({
        turn: 1,
        forkId: 0,
        timestamp: 123,
        user: { text: "hi", inputId: "u1" },
        model: { text: "yo", outputId: "m1" },
        toolCalls: ["a", "b"],
      }),
      "application/json",
    );

    const mergeResult = dispatchToolCall(
      "vfs_merge",
      {
        files: [
          {
            path: "current/conversation/turn.json",
            content: { toolCalls: ["c"] },
          },
        ],
      },
      ctx,
    ) as { success: boolean };

    expect(mergeResult.success).toBe(true);

    const updated = JSON.parse(
      session.readFile("conversation/turn.json")!.content,
    );
    expect(updated.toolCalls).toEqual(["c"]);
  });
});
