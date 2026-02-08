import { beforeEach, describe, expect, it } from "vitest";
import {
  readConversationIndex,
  readTurnFile,
  writeConversationIndex,
  writeTurnFile,
} from "../../conversation";
import { VfsSession } from "../../vfsSession";
import { conversationHistoryRewriteService } from "../conversationHistoryRewriteService";
import { vfsElevationTokenManager } from "../elevation";
import { VfsWriteAccessError } from "../../vfsSession";

const createElevatedContext = () => ({
  actor: "ai" as const,
  mode: "sudo" as const,
  elevationIntent: "history_rewrite" as const,
  elevationScopeTemplateIds: "all_elevated" as const,
  elevationToken: vfsElevationTokenManager.issueAiElevationToken({
    intent: "history_rewrite",
    scopeTemplateIds: "all_elevated",
  }),
});

describe("conversationHistoryRewriteService", () => {
  beforeEach(() => {
    vfsElevationTokenManager.reset();
  });

  it("rewrites turn payload while preserving canonical turn identity", () => {
    const session = new VfsSession();

    writeTurnFile(session, 0, 0, {
      turnId: "fork-0/turn-0",
      forkId: 0,
      turnNumber: 0,
      parentTurnId: null,
      createdAt: 1,
      userAction: "start",
      assistant: {
        narrative: "old",
        choices: [],
      },
    });

    const rewritten = conversationHistoryRewriteService.rewriteTurn(session, {
      forkId: 0,
      turnNumber: 0,
      writeContext: createElevatedContext(),
      mutate: (turn) => ({
        ...turn,
        assistant: {
          ...turn.assistant,
          narrative: "new",
        },
      }),
    });

    expect(rewritten.turnId).toBe("fork-0/turn-0");
    expect(rewritten.assistant.narrative).toBe("new");

    const stored = readTurnFile(session.snapshot(), 0, 0);
    expect(stored?.assistant.narrative).toBe("new");
  });

  it("normalizes and rewrites conversation index", () => {
    const session = new VfsSession();

    writeConversationIndex(session, {
      activeForkId: 0,
      activeTurnId: "fork-0/turn-0",
      rootTurnIdByFork: { "0": "fork-0/turn-0" },
      latestTurnNumberByFork: { "0": 0 },
      turnOrderByFork: { "0": ["fork-0/turn-0"] },
    });

    const rewritten = conversationHistoryRewriteService.rewriteIndex(session, {
      writeContext: createElevatedContext(),
      mutate: (index) => ({
        ...index,
        activeTurnId: "fork-0/turn-999",
        turnOrderByFork: {
          ...index.turnOrderByFork,
          "0": ["fork-0/turn-0", "fork-0/turn-1", "fork-0/turn-1"],
        },
      }),
    });

    expect(rewritten.turnOrderByFork["0"]).toEqual([
      "fork-0/turn-0",
      "fork-0/turn-1",
    ]);
    expect(rewritten.activeTurnId).toBe("fork-0/turn-1");
    expect(rewritten.latestTurnNumberByFork["0"]).toBe(1);

    const stored = readConversationIndex(session.snapshot());
    expect(stored?.activeTurnId).toBe("fork-0/turn-1");
  });

  it("records rewrite events under elevated history_rewrites path", () => {
    const session = new VfsSession();

    const path = conversationHistoryRewriteService.recordRewriteEvent(session, {
      requestId: "req:1",
      reason: "unit-test",
      payload: { ok: true },
      writeContext: createElevatedContext(),
    });

    expect(path.startsWith("forks/0/ops/history_rewrites/")).toBe(true);
    const file = session.readFile(path);
    expect(file).not.toBeNull();
  });

  it("denies rewrite event writes when token intent mismatches", () => {
    const session = new VfsSession();

    expect(() =>
      conversationHistoryRewriteService.recordRewriteEvent(session, {
        requestId: "req:2",
        reason: "unit-test",
        payload: { ok: true },
        writeContext: {
          actor: "ai",
          mode: "sudo",
          elevationIntent: "history_rewrite",
          elevationScopeTemplateIds: "all_elevated",
          elevationToken: vfsElevationTokenManager.issueAiElevationToken({
            intent: "sudo_command",
            scopeTemplateIds: "all_elevated",
          }),
        },
      }),
    ).toThrow(VfsWriteAccessError);
  });
});
