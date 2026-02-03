import { describe, it, expect } from "vitest";
import { VfsSession } from "../../vfs/vfsSession";
import { dispatchToolCall, dispatchToolCallAsync } from "../handlers";

describe("VFS handlers", () => {
  it("writes and reads files via dispatch", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

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

  it("reads multiple files via dispatch", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    const writeResult = dispatchToolCall(
      "vfs_write",
      {
        files: [
          {
            path: "current/world/global.json",
            content: JSON.stringify({ time: "Day 1" }),
            contentType: "application/json",
          },
          {
            path: "current/world/character.json",
            content: JSON.stringify({ name: "Hero" }),
            contentType: "application/json",
          },
        ],
      },
      ctx,
    ) as { success: boolean };

    expect(writeResult.success).toBe(true);

    const readMany = dispatchToolCall(
      "vfs_read_many",
      {
        paths: [
          "current/world/global.json",
          "current/world/character.json",
          "current/world/missing.json",
        ],
        maxChars: 10,
      },
      ctx,
    ) as {
      success: boolean;
      data?: {
        files?: Array<{ path: string; content: string; truncated: boolean }>;
        missing?: string[];
      };
    };

    expect(readMany.success).toBe(true);
    expect(readMany.data?.files?.length).toBe(2);
    expect(readMany.data?.files?.[0]?.path).toBe("current/world/global.json");
    expect(readMany.data?.files?.[0]?.truncated).toBe(true);
    expect(readMany.data?.missing).toEqual(["current/world/missing.json"]);
  });

  it("falls back to text search for semantic queries", async () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    session.writeFile("world/global.json", "hello world", "text/plain");

    const searchResult = (await dispatchToolCallAsync(
      "vfs_search",
      { query: "hello", semantic: true },
      ctx,
    )) as { success: boolean; data?: { results?: Array<{ text: string }> } };

    expect(searchResult.success).toBe(true);
    expect(searchResult.data?.results?.[0]?.text).toContain("hello");
  });

  it("supports fuzzy search for typo-tolerant queries", async () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    session.writeFile("world/global.json", "hello world", "text/plain");

    const searchResult = (await dispatchToolCallAsync(
      "vfs_search",
      { query: "helo world", fuzzy: true },
      ctx,
    )) as { success: boolean; data?: { results?: Array<{ text: string }> } };

    expect(searchResult.success).toBe(true);
    expect(searchResult.data?.results?.[0]?.text).toContain("hello world");
  });

  it("prefers semantic indexer results when provided", async () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    session.writeFile("world/semantic.json", "semantic-hit", "text/plain");
    session.writeFile("world/global.json", "hello world", "text/plain");
    session.setSemanticIndexer(() => [
      { path: "world/semantic.json", line: 1, text: "semantic-hit" },
    ]);

    const searchResult = (await dispatchToolCallAsync(
      "vfs_search",
      { query: "does not matter", semantic: true, path: "current/world" },
      ctx,
    )) as {
      success: boolean;
      data?: { results?: Array<{ path: string; text: string }> };
    };

    expect(searchResult.success).toBe(true);
    expect(searchResult.data?.results?.[0]?.path).toBe("current/world/semantic.json");
    expect(searchResult.data?.results?.[0]?.text).toBe("semantic-hit");
  });

  it("rejects non-current paths and returns current-prefixed paths", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

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
    const ctx = { vfsSession: session };

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
    const ctx = { vfsSession: session };

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

  it("self-heals missing conversation index on vfs_commit_turn", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    const result = dispatchToolCall(
      "vfs_commit_turn",
      {
        userAction: "Look around",
        assistant: {
          narrative: "You look around.",
          choices: [{ text: "Continue", consequence: null }],
          narrativeTone: null,
          atmosphere: null,
          ending: null,
          forceEnd: null,
        },
        createdAt: null,
      },
      ctx,
    ) as { success: boolean; data?: { turnId?: string } };

    expect(result.success).toBe(true);
    expect(result.data?.turnId).toBe("fork-0/turn-1");

    const indexFile = session.readFile("conversation/index.json");
    expect(indexFile).not.toBeNull();
    const index = JSON.parse(indexFile!.content);
    expect(index.activeTurnId).toBe("fork-0/turn-1");

    const turnFile = session.readFile("conversation/turns/fork-0/turn-1.json");
    expect(turnFile).not.toBeNull();
  });

  it("applies mixed ops atomically via vfs_tx (write + commit_turn)", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    const result = dispatchToolCall(
      "vfs_tx",
      {
        ops: [
          {
            op: "write",
            path: "current/world/global.json",
            content: JSON.stringify({ time: "Day 1" }),
            contentType: "application/json",
          },
          {
            op: "commit_turn",
            userAction: "Wait",
            assistant: {
              narrative: "Time passes.",
              choices: [{ text: "Continue", consequence: null }],
              narrativeTone: null,
              atmosphere: null,
              ending: null,
              forceEnd: null,
            },
            createdAt: null,
          },
        ],
      },
      ctx,
    ) as {
      success: boolean;
      data?: {
        written?: string[];
        committed?: { turnId: string; turnNumber: number };
      };
    };

    expect(result.success).toBe(true);
    expect(result.data?.written).toContain("current/world/global.json");
    expect(result.data?.committed?.turnId).toBe("fork-0/turn-1");
    expect(result.data?.committed?.turnNumber).toBe(1);

    const global = session.readFile("world/global.json");
    expect(global).not.toBeNull();
    expect(JSON.parse(global!.content).time).toBe("Day 1");
  });

  it("rejects vfs_tx when commit_turn is not the last op", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    const result = dispatchToolCall(
      "vfs_tx",
      {
        ops: [
          {
            op: "commit_turn",
            userAction: "Wait",
            assistant: {
              narrative: "Time passes.",
              choices: [{ text: "Continue", consequence: null }],
              narrativeTone: null,
              atmosphere: null,
              ending: null,
              forceEnd: null,
            },
            createdAt: null,
          },
          {
            op: "write",
            path: "current/world/global.json",
            content: "{}",
            contentType: "application/json",
          },
        ],
      },
      ctx,
    ) as { success: boolean; code?: string };

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_DATA");
  });
});
