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

  it("blocks overwriting an unseen file via vfs_write until it is read", () => {
    const session = new VfsSession();
    session.writeFile(
      "outline/progress.json",
      JSON.stringify({ a: 1 }),
      "application/json",
    );
    const ctx = { vfsSession: session };

    const overwriteResult = dispatchToolCall(
      "vfs_write",
      {
        files: [
          {
            path: "current/outline/progress.json",
            content: JSON.stringify({ a: 2 }),
            contentType: "application/json",
          },
        ],
      },
      ctx,
    ) as { success: boolean; code?: string; error?: string };

    expect(overwriteResult.success).toBe(false);
    expect(overwriteResult.code).toBe("INVALID_ACTION");
    expect(overwriteResult.error ?? "").toContain("must read file before overwrite");

    const readResult = dispatchToolCall(
      "vfs_read",
      { path: "current/outline/progress.json" },
      ctx,
    ) as { success: boolean };

    expect(readResult.success).toBe(true);

    const overwriteOk = dispatchToolCall(
      "vfs_write",
      {
        files: [
          {
            path: "current/outline/progress.json",
            content: JSON.stringify({ a: 2 }),
            contentType: "application/json",
          },
        ],
      },
      ctx,
    ) as { success: boolean };

    expect(overwriteOk.success).toBe(true);
  });

  it("blocks vfs_edit until the file is read in this session", () => {
    const session = new VfsSession();
    session.writeFile(
      "outline/progress.json",
      JSON.stringify({ a: 1 }),
      "application/json",
    );
    const ctx = { vfsSession: session };

    const editBlocked = dispatchToolCall(
      "vfs_edit",
      {
        edits: [
          { path: "current/outline/progress.json", patch: [{ op: "replace", path: "/a", value: 2 }] },
        ],
      },
      ctx,
    ) as { success: boolean; code?: string; error?: string };

    expect(editBlocked.success).toBe(false);
    expect(editBlocked.code).toBe("INVALID_ACTION");
    expect(editBlocked.error ?? "").toContain("must read file before edit");

    dispatchToolCall("vfs_read", { path: "current/outline/progress.json" }, ctx);

    const editOk = dispatchToolCall(
      "vfs_edit",
      {
        edits: [
          { path: "current/outline/progress.json", patch: [{ op: "replace", path: "/a", value: 2 }] },
        ],
      },
      ctx,
    ) as { success: boolean };

    expect(editOk.success).toBe(true);
  });

  it("blocks vfs_merge until the file is read", () => {
    const session = new VfsSession();
    session.writeFile(
      "outline/progress.json",
      JSON.stringify({ a: 1 }),
      "application/json",
    );
    const ctx = { vfsSession: session };

    const mergeBlocked = dispatchToolCall(
      "vfs_merge",
      {
        files: [{ path: "current/outline/progress.json", content: { a: 2 } }],
      },
      ctx,
    ) as { success: boolean; code?: string; error?: string };

    expect(mergeBlocked.success).toBe(false);
    expect(mergeBlocked.code).toBe("INVALID_ACTION");
    expect(mergeBlocked.error ?? "").toContain("must read file before merge");

    dispatchToolCall("vfs_read", { path: "current/outline/progress.json" }, ctx);

    const mergeOk = dispatchToolCall(
      "vfs_merge",
      {
        files: [{ path: "current/outline/progress.json", content: { a: 2 } }],
      },
      ctx,
    ) as { success: boolean };

    expect(mergeOk.success).toBe(true);
  });

  it("blocks vfs_delete until the file is read", () => {
    const session = new VfsSession();
    session.writeFile(
      "outline/progress.json",
      JSON.stringify({ a: 1 }),
      "application/json",
    );
    const ctx = { vfsSession: session };

    const deleteBlocked = dispatchToolCall(
      "vfs_delete",
      { paths: ["current/outline/progress.json"] },
      ctx,
    ) as { success: boolean; code?: string; error?: string };

    expect(deleteBlocked.success).toBe(false);
    expect(deleteBlocked.code).toBe("INVALID_ACTION");
    expect(deleteBlocked.error ?? "").toContain("must read file before delete");

    dispatchToolCall("vfs_read", { path: "current/outline/progress.json" }, ctx);

    const deleteOk = dispatchToolCall(
      "vfs_delete",
      { paths: ["current/outline/progress.json"] },
      ctx,
    ) as { success: boolean };

    expect(deleteOk.success).toBe(true);
  });

  it("enforces read-before-overwrite inside vfs_tx", () => {
    const session = new VfsSession();
    session.writeFile(
      "outline/progress.json",
      JSON.stringify({ a: 1 }),
      "application/json",
    );
    const ctx = { vfsSession: session };

    const txBlocked = dispatchToolCall(
      "vfs_tx",
      {
        ops: [
          {
            op: "write",
            path: "current/outline/progress.json",
            content: JSON.stringify({ a: 2 }),
            contentType: "application/json",
          },
        ],
      },
      ctx,
    ) as { success: boolean; code?: string; error?: string };

    expect(txBlocked.success).toBe(false);
    expect(txBlocked.code).toBe("INVALID_ACTION");
    expect(txBlocked.error ?? "").toContain("must read file before overwrite");
  });

  it("does not treat grep results as reading (still blocks edits)", () => {
    const session = new VfsSession();
    session.writeFile(
      "outline/progress.json",
      JSON.stringify({ a: 1, needle: "yes" }),
      "application/json",
    );
    const ctx = { vfsSession: session };

    const grepResult = dispatchToolCall(
      "vfs_grep",
      { pattern: "needle", flags: "", path: "current/outline/progress.json", limit: 5 },
      ctx,
    ) as { success: boolean; data?: { results?: Array<{ path: string }> } };

    expect(grepResult.success).toBe(true);
    expect(grepResult.data?.results?.[0]?.path).toBe("current/outline/progress.json");

    const editBlocked = dispatchToolCall(
      "vfs_edit",
      {
        edits: [
          { path: "current/outline/progress.json", patch: [{ op: "replace", path: "/a", value: 2 }] },
        ],
      },
      ctx,
    ) as { success: boolean; code?: string; error?: string };

    expect(editBlocked.success).toBe(false);
    expect(editBlocked.code).toBe("INVALID_ACTION");
    expect(editBlocked.error ?? "").toContain("must read file before edit");

    dispatchToolCall("vfs_read", { path: "current/outline/progress.json" }, ctx);

    const editOkAfterRead = dispatchToolCall(
      "vfs_edit",
      {
        edits: [
          { path: "current/outline/progress.json", patch: [{ op: "replace", path: "/a", value: 2 }] },
        ],
      },
      ctx,
    ) as { success: boolean };

    expect(editOkAfterRead.success).toBe(true);
  });

  it("does not treat search results as reading (still blocks edits)", async () => {
    const session = new VfsSession();
    session.writeFile(
      "outline/progress.json",
      JSON.stringify({ a: 1, needle: "yes" }),
      "application/json",
    );
    const ctx = { vfsSession: session };

    const searchResult = (await dispatchToolCallAsync(
      "vfs_search",
      { query: "needle", path: "current/outline/progress.json", limit: 5 },
      ctx,
    )) as { success: boolean; data?: { results?: Array<{ path: string }> } };

    expect(searchResult.success).toBe(true);
    expect(searchResult.data?.results?.[0]?.path).toBe("current/outline/progress.json");

    const editBlocked = dispatchToolCall(
      "vfs_edit",
      {
        edits: [
          { path: "current/outline/progress.json", patch: [{ op: "replace", path: "/a", value: 2 }] },
        ],
      },
      ctx,
    ) as { success: boolean; code?: string; error?: string };

    expect(editBlocked.success).toBe(false);
    expect(editBlocked.code).toBe("INVALID_ACTION");
    expect(editBlocked.error ?? "").toContain("must read file before edit");

    dispatchToolCall("vfs_read", { path: "current/outline/progress.json" }, ctx);

    const editOkAfterRead = dispatchToolCall(
      "vfs_edit",
      {
        edits: [
          { path: "current/outline/progress.json", patch: [{ op: "replace", path: "/a", value: 2 }] },
        ],
      },
      ctx,
    ) as { success: boolean };

    expect(editOkAfterRead.success).toBe(true);
  });

  it("reads global skills via vfs_read and blocks writes", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    const readResult = dispatchToolCall(
      "vfs_read",
      { path: "current/skills/README.md" },
      ctx,
    ) as { success: boolean; data?: { content?: string; contentType?: string } };

    expect(readResult.success).toBe(true);
    expect(readResult.data?.contentType).toBe("text/plain");
    expect(readResult.data?.content ?? "").toContain("read-only");

    const writeResult = dispatchToolCall(
      "vfs_write",
      {
        files: [
          {
            path: "current/skills/custom.txt",
            content: "x",
            contentType: "text/plain",
          },
        ],
      },
      ctx,
    ) as { success: boolean; code?: string; error?: string };

    expect(writeResult.success).toBe(false);
    expect(writeResult.code).toBe("INVALID_ACTION");
    expect(writeResult.error ?? "").toContain("read-only");
  });

  it("supports truncation in vfs_read via maxChars", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    dispatchToolCall(
      "vfs_write",
      {
        files: [
          {
            path: "current/world/global.json",
            content: JSON.stringify({ big: "x".repeat(100) }),
            contentType: "application/json",
          },
        ],
      },
      ctx,
    );

    const readResult = dispatchToolCall(
      "vfs_read",
      { path: "current/world/global.json", maxChars: 20 },
      ctx,
    ) as { success: boolean; data?: { content?: string; truncated?: boolean } };

    expect(readResult.success).toBe(true);
    expect(readResult.data?.truncated).toBe(true);
    expect((readResult.data?.content ?? "").length).toBe(20);
  });

  it("supports slicing in vfs_read via start+offset", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    dispatchToolCall(
      "vfs_write",
      {
        files: [
          {
            path: "current/world/global.json",
            content: "abcdefghijklmnopqrstuvwxyz",
            contentType: "text/plain",
          },
        ],
      },
      ctx,
    );

    const readResult = dispatchToolCall(
      "vfs_read",
      { path: "current/world/global.json", start: 5, offset: 3 },
      ctx,
    ) as {
      success: boolean;
      data?: {
        content?: string;
        truncated?: boolean;
        sliceStart?: number;
        sliceEndExclusive?: number;
        totalChars?: number;
      };
    };

    expect(readResult.success).toBe(true);
    expect(readResult.data?.content).toBe("fgh");
    expect(readResult.data?.truncated).toBe(true);
    expect(readResult.data?.sliceStart).toBe(5);
    expect(readResult.data?.sliceEndExclusive).toBe(8);
    expect(readResult.data?.totalChars).toBe(26);
  });

  it("reads JSON subfields via vfs_read_json", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    dispatchToolCall(
      "vfs_write",
      {
        files: [
          {
            path: "current/world/npcs/npc:1.json",
            content: JSON.stringify({ id: "npc:1", visible: { name: "Bob" } }),
            contentType: "application/json",
          },
        ],
      },
      ctx,
    );

    const result = dispatchToolCall(
      "vfs_read_json",
      { path: "current/world/npcs/npc:1.json", pointers: ["/visible/name"] },
      ctx,
    ) as {
      success: boolean;
      data?: { extracts?: Array<{ pointer: string; json: string }> };
    };

    expect(result.success).toBe(true);
    expect(result.data?.extracts?.[0]?.pointer).toBe("/visible/name");
    expect(result.data?.extracts?.[0]?.json).toBe("\"Bob\"");
  });

	  it("describes schemas via vfs_schema", () => {
	    const session = new VfsSession();
	    const ctx = { vfsSession: session };

	    const result = dispatchToolCall(
	      "vfs_schema",
	      { paths: ["world/global.json", "world/characters/char:npc_1/profile.json"] },
	      ctx,
	    ) as {
	      success: boolean;
	      data?: { schemas?: Array<{ path: string; hint: string }>; missing?: any[] };
	    };

	    expect(result.success).toBe(true);
	    expect(result.data?.missing).toEqual([]);
	    expect(result.data?.schemas?.[0]?.path).toBe("current/world/global.json");
	    expect(result.data?.schemas?.[0]?.hint).toContain("time");
	    expect(result.data?.schemas?.[1]?.path).toBe(
	      "current/world/characters/char:npc_1/profile.json",
	    );
	    expect(result.data?.schemas?.[1]?.hint).toContain("visible");
	    expect(result.data?.schemas?.[1]?.hint).toContain("id");
	  });

  it("stats files and directories via vfs_stat", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    dispatchToolCall(
      "vfs_write",
      {
        files: [
          {
            path: "current/world/global.json",
            content: "{}",
            contentType: "application/json",
          },
          {
            path: "current/world/npcs/npc:1.json",
            content: JSON.stringify({ id: "npc:1" }),
            contentType: "application/json",
          },
        ],
      },
      ctx,
    );

    const statResult = dispatchToolCall(
      "vfs_stat",
      { paths: ["current/world/global.json", "current/world"] },
      ctx,
    ) as {
      success: boolean;
      data?: {
        stats?: Array<
          | { kind: "file"; path: string; size: number; contentType: string }
          | { kind: "dir"; path: string; fileCount: number; entries: string[] }
        >;
        missing?: string[];
      };
    };

    expect(statResult.success).toBe(true);
    expect(statResult.data?.missing).toEqual([]);
    expect(statResult.data?.stats?.[0]).toMatchObject({
      kind: "file",
      path: "current/world/global.json",
      contentType: "application/json",
    });
    expect(statResult.data?.stats?.[1]).toMatchObject({
      kind: "dir",
      path: "current/world",
    });
    const dir = statResult.data?.stats?.[1] as
      | undefined
      | { kind: "dir"; fileCount: number; entries: string[] };
    expect((dir?.fileCount ?? 0) >= 2).toBe(true);
    expect(dir?.entries?.includes("global.json")).toBe(true);
  });

  it("finds matches via vfs_glob", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    dispatchToolCall(
      "vfs_write",
      {
        files: [
          {
            path: "current/world/a.json",
            content: "{}",
            contentType: "application/json",
          },
          {
            path: "current/world/b.txt",
            content: "x",
            contentType: "text/plain",
          },
          {
            path: "current/world/sub/c.json",
            content: "{}",
            contentType: "application/json",
          },
        ],
      },
      ctx,
    );

    const globResult = dispatchToolCall(
      "vfs_glob",
      { patterns: ["world/**/*.json"] },
      ctx,
    ) as {
      success: boolean;
      data?: { matches?: string[]; truncated?: boolean; totalMatches?: number };
    };

    expect(globResult.success).toBe(true);
    expect(globResult.data?.truncated).toBe(false);
    expect(globResult.data?.totalMatches).toBe(2);
    expect(globResult.data?.matches).toEqual([
      "current/world/a.json",
      "current/world/sub/c.json",
    ]);
  });

  it("supports excludes in vfs_glob", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    dispatchToolCall(
      "vfs_write",
      {
        files: [
          {
            path: "current/world/a.json",
            content: "{}",
            contentType: "application/json",
          },
          {
            path: "current/world/sub/c.json",
            content: "{}",
            contentType: "application/json",
          },
        ],
      },
      ctx,
    );

    const globResult = dispatchToolCall(
      "vfs_glob",
      {
        patterns: ["world/**/*.json"],
        excludePatterns: ["world/sub/**"],
      },
      ctx,
    ) as {
      success: boolean;
      data?: { matches?: string[]; truncated?: boolean; totalMatches?: number };
    };

    expect(globResult.success).toBe(true);
    expect(globResult.data?.totalMatches).toBe(1);
    expect(globResult.data?.matches).toEqual(["current/world/a.json"]);
  });

  it("returns metadata via vfs_glob returnMeta", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    dispatchToolCall(
      "vfs_write",
      {
        files: [
          {
            path: "current/world/a.json",
            content: "{}",
            contentType: "application/json",
          },
        ],
      },
      ctx,
    );

    const globResult = dispatchToolCall(
      "vfs_glob",
      { patterns: ["world/**/*.json"], returnMeta: true },
      ctx,
    ) as {
      success: boolean;
      data?: {
        matches?: string[];
        entries?: Array<{
          path: string;
          contentType: string;
          totalChars: number;
          size: number;
          hash: string;
          updatedAt: number;
        }>;
      };
    };

    expect(globResult.success).toBe(true);
    expect(globResult.data?.matches).toEqual(["current/world/a.json"]);
    expect(globResult.data?.entries?.[0]).toMatchObject({
      path: "current/world/a.json",
      contentType: "application/json",
      totalChars: 2,
      size: 2,
    });
    expect(typeof globResult.data?.entries?.[0]?.hash).toBe("string");
    expect(typeof globResult.data?.entries?.[0]?.updatedAt).toBe("number");
  });

  it("returns only selected metadata fields via vfs_glob metaFields", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    dispatchToolCall(
      "vfs_write",
      {
        files: [
          {
            path: "current/world/a.json",
            content: "{}",
            contentType: "application/json",
          },
        ],
      },
      ctx,
    );

    const globResult = dispatchToolCall(
      "vfs_glob",
      { patterns: ["world/**/*.json"], metaFields: ["size"] },
      ctx,
    ) as {
      success: boolean;
      data?: { entries?: Array<Record<string, unknown>> };
    };

    expect(globResult.success).toBe(true);
    const entry = globResult.data?.entries?.[0] ?? {};
    expect(entry).toHaveProperty("path");
    expect(entry).toHaveProperty("size");
    expect(entry).not.toHaveProperty("hash");
    expect(entry).not.toHaveProperty("updatedAt");
    expect(entry).not.toHaveProperty("contentType");
    expect(entry).not.toHaveProperty("totalChars");
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
            path: "current/world/characters/char:player/profile.json",
            content: JSON.stringify({
              id: "char:player",
              kind: "player",
              currentLocation: "loc:1",
              knownBy: ["char:player"],
              visible: { name: "Hero" },
              relations: [],
            }),
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
          "current/world/characters/char:player/profile.json",
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

  it("lists catalog entries via vfs_ls_entries", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    session.writeFile(
      "world/characters/char:player/inventory/inv:1.json",
      JSON.stringify({
        id: "inv:1",
        knownBy: ["char:player"],
        name: "Rusty Key",
        visible: { description: "x" },
        unlocked: true,
      }),
      "application/json",
    );
    session.writeFile(
      "world/characters/char:npc_1/profile.json",
      JSON.stringify({
        id: "char:npc_1",
        kind: "npc",
        currentLocation: "loc:1",
        knownBy: ["char:player"],
        visible: { name: "Bob", description: "x", roleTag: "Friend" },
        relations: [],
      }),
      "application/json",
    );
    session.writeFile(
      "world/characters/char:player/profile.json",
      JSON.stringify({
        id: "char:player",
        kind: "player",
        currentLocation: "loc:1",
        knownBy: ["char:player"],
        visible: { name: "Hero", title: "Wanderer", attributes: [] },
        relations: [],
      }),
      "application/json",
    );
    session.writeFile(
      "world/characters/char:player/skills/skill:1.json",
      JSON.stringify({
        id: "skill:1",
        name: "Tracking",
        level: "Novice",
        visible: { description: "Find tracks.", knownEffects: [] },
      }),
      "application/json",
    );

    const result = dispatchToolCall(
      "vfs_ls_entries",
      {
        categories: ["inventory", "npcs", "character_profile", "character_skills"],
        limitPerCategory: null,
      },
      ctx,
    ) as {
      success: boolean;
      data?: {
        categories?: Record<string, { total: number; truncated: boolean; entries: any[] }>;
      };
    };

    expect(result.success).toBe(true);
    expect(result.data?.categories?.inventory?.entries?.[0]?.displayName).toBe(
      "Rusty Key",
    );
    expect(result.data?.categories?.npcs?.entries?.[0]?.displayName).toBe("Bob");
    expect(result.data?.categories?.character_profile?.entries?.[0]?.displayName).toBe(
      "Hero",
    );
    expect(result.data?.categories?.character_skills?.entries?.[0]?.displayName).toBe(
      "Tracking",
    );
  });

  it("suggests duplicate groups via vfs_suggest_duplicates", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    session.writeFile(
      "world/characters/char:player/inventory/inv:1.json",
      JSON.stringify({ id: "inv:1", knownBy: ["char:player"], name: "Rusty Key", visible: { description: "x" } }),
      "application/json",
    );
    session.writeFile(
      "world/characters/char:player/inventory/inv:2.json",
      JSON.stringify({ id: "inv:2", knownBy: ["char:player"], name: "Rusted Key", visible: { description: "x" } }),
      "application/json",
    );

    const result = dispatchToolCall(
      "vfs_suggest_duplicates",
      { category: "inventory", threshold: 0.35, limitGroups: 5, maxCandidatesPerGroup: 5 },
      ctx,
    ) as {
      success: boolean;
      data?: { groups?: Array<{ candidates: Array<{ displayName: string }> }> };
    };

    expect(result.success).toBe(true);
    const groupNames = (result.data?.groups?.[0]?.candidates || []).map(
      (c) => c.displayName,
    );
    expect(groupNames).toEqual(expect.arrayContaining(["Rusty Key", "Rusted Key"]));
  });

  it("finishes summary via vfs_finish_summary and writes summary/state.json", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    const result = dispatchToolCall(
      "vfs_finish_summary",
      {
        displayText: "Short summary.",
        visible: {
          narrative: "Visible summary.",
          majorEvents: ["A"],
          characterDevelopment: "Changed",
          worldState: "World",
        },
        hidden: {
          truthNarrative: "Truth",
          hiddenPlots: [],
          npcActions: [],
          worldTruth: "Truth world",
          unrevealed: [],
        },
        timeRange: { from: "t1", to: "t2" },
        nodeRange: { fromIndex: 0, toIndex: 2 },
        lastSummarizedIndex: 3,
      },
      ctx,
    ) as { success: boolean };

    expect(result.success).toBe(true);

    const file = session.readFile("summary/state.json");
    expect(file).not.toBeNull();
    const state = JSON.parse(file!.content);
    expect(state.lastSummarizedIndex).toBe(3);
    expect(state.summaries).toHaveLength(1);
    expect(state.summaries[0].displayText).toBe("Short summary.");
  });

  it("rejects vfs_finish_summary when lastSummarizedIndex does not match nodeRange", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    const result = dispatchToolCall(
      "vfs_finish_summary",
      {
        displayText: "Bad summary.",
        visible: {
          narrative: "Visible summary.",
          majorEvents: [],
          characterDevelopment: "Changed",
          worldState: "World",
        },
        hidden: {
          truthNarrative: "Truth",
          hiddenPlots: [],
          npcActions: [],
          worldTruth: "Truth world",
          unrevealed: [],
        },
        nodeRange: { fromIndex: 0, toIndex: 2 },
        lastSummarizedIndex: 2,
      },
      ctx,
    ) as { success: boolean; code?: string };

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_DATA");
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
      "world/characters/char:npc_1/profile.json",
      JSON.stringify({
        id: "char:npc_1",
        kind: "npc",
        currentLocation: "loc:1",
        knownBy: ["char:player"],
        visible: { name: "A", description: "x", roleTag: "Friend" },
        relations: [],
      }),
      "application/json",
    );

    dispatchToolCall(
      "vfs_read",
      { path: "current/world/characters/char:npc_1/profile.json" },
      ctx,
    );

    const mergeResult = dispatchToolCall(
      "vfs_merge",
      {
        files: [
          {
            path: "current/world/characters/char:npc_1/profile.json",
            content: { visible: { name: "B" } },
          },
        ],
      },
      ctx,
    ) as { success: boolean };

    expect(mergeResult.success).toBe(true);

    const updated = JSON.parse(
      session.readFile("world/characters/char:npc_1/profile.json")!.content,
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

    dispatchToolCall(
      "vfs_read",
      { path: "current/conversation/turn.json" },
      ctx,
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
