import { describe, expect, it } from "vitest";
import { VfsSession } from "../../vfs/vfsSession";
import { dispatchToolCall, dispatchToolCallAsync } from "../handlers";
import {
  getCustomRulesAckState,
  syncCustomRulesAckState,
} from "../../customRulesAckState";
import { createSummaryPayload } from "./vfsHandlers.helpers";

describe("VFS handlers search/commit", () => {
  it("supports regex/fuzzy search and validates invalid regex", async () => {
    const session = new VfsSession();
    session.writeFile("world/notes.md", "dragon knight", "text/markdown");
    const ctx = { vfsSession: session, embeddingEnabled: false };

    const regex = (await dispatchToolCallAsync(
      "vfs_search",
      { query: "drag.n", regex: true, path: "current/world" },
      ctx,
    )) as any;

    expect(regex.success).toBe(true);
    expect(regex.data.results[0].path).toBe("current/world/notes.md");

    const fuzzy = (await dispatchToolCallAsync(
      "vfs_search",
      { query: "dragn", fuzzy: true, path: "current/world" },
      ctx,
    )) as any;

    expect(fuzzy.success).toBe(true);
    expect(fuzzy.data.results[0].path).toBe("current/world/notes.md");

    const invalidRegex = (await dispatchToolCallAsync(
      "vfs_search",
      { query: "[", regex: true, path: "current/world" },
      ctx,
    )) as any;

    expect(invalidRegex.success).toBe(false);
    expect(invalidRegex.code).toBe("INVALID_DATA");
  });

  it("returns RAG_DISABLED when semantic search is requested without embeddings", async () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session, embeddingEnabled: false };

    const result = (await dispatchToolCallAsync(
      "vfs_search",
      { query: "anything", semantic: true },
      ctx,
    )) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("RAG_DISABLED");
  });

  it("commits turn with finish tool and updates conversation index", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session, vfsTurnUserAction: "look around" };

    const commit = dispatchToolCall(
      "vfs_finish_turn",
      {
        assistant: {
          narrative: "You scan the room.",
          choices: [{ text: "Inspect desk" }, { text: "Open door" }],
        },
      },
      ctx,
    ) as any;

    expect(commit.success).toBe(true);
    expect(commit.data.turnId).toBe("fork-0/turn-1");

    const index = dispatchToolCall(
      "vfs_read_chars",
      { path: "current/conversation/index.json" },
      ctx,
    ) as any;

    expect(index.success).toBe(true);
    expect(JSON.parse(index.data.content).activeTurnId).toBe("fork-0/turn-1");
  });

  it("ignores legacy finish_turn runtime-only fields and keeps system userAction", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session, vfsTurnUserAction: "system action" };

    const commit = dispatchToolCall(
      "vfs_finish_turn",
      {
        userAction: "legacy action that should be ignored",
        assistant: {
          narrative: "You review the ledger.",
          choices: [{ text: "Proceed" }, { text: "Pause" }],
        },
        retconAck: { hash: "legacy-hash" },
      },
      ctx,
    ) as any;

    expect(commit.success).toBe(true);
    const turnPath = `current/conversation/turns/${commit.data.turnId}.json`;
    const turnFile = dispatchToolCall(
      "vfs_read_chars",
      { path: turnPath },
      ctx,
    ) as any;
    expect(turnFile.success).toBe(true);
    const parsedTurn = JSON.parse(turnFile.data.content);
    expect(parsedTurn.userAction).toBe("system action");
  });

  it("accepts pending retcon acknowledgement with summary and ignores legacy hash", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session, vfsTurnUserAction: "advance timeline" };

    session.writeFile(
      "custom_rules/12-custom/rule.md",
      "rule v1",
      "text/markdown",
    );
    syncCustomRulesAckState(session);
    session.writeFile(
      "custom_rules/12-custom/rule.md",
      "rule v2",
      "text/markdown",
    );
    syncCustomRulesAckState(session);

    const commit = dispatchToolCall(
      "vfs_finish_turn",
      {
        assistant: {
          narrative: "You adjust continuity and move forward.",
          choices: [{ text: "Continue" }, { text: "Re-evaluate" }],
        },
        retconAck: {
          hash: "wrong-legacy-hash",
          summary: "Continuity updated after rule change.",
        },
      },
      ctx,
    ) as any;

    expect(commit.success).toBe(true);
    const ackState = getCustomRulesAckState(session);
    expect(ackState?.pendingHash).toBeUndefined();
  });

  it("requires runtime-injected fields for summary finish tool", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    const invalid = dispatchToolCall(
      "vfs_finish_summary",
      {
        ...createSummaryPayload(),
      },
      ctx,
    ) as any;

    expect(invalid.success).toBe(false);
    expect(invalid.code).toBe("INVALID_DATA");
  });

  it("ends player-rate loop with empty finish tool payload", () => {
    const session = new VfsSession();
    const ctx = { vfsSession: session };

    const commit = dispatchToolCall(
      "vfs_end_turn",
      {},
      ctx,
    ) as any;

    expect(commit.success).toBe(true);
    expect(commit.data).toMatchObject({ ended: true });

    const invalid = dispatchToolCall(
      "vfs_end_turn",
      { currentSoul: "legacy" },
      ctx,
    ) as any;
    expect(invalid.success).toBe(false);
    expect(invalid.code).toBe("INVALID_PARAMS");
  });
});
