import { describe, expect, it, vi } from "vitest";
import { VfsSession } from "../vfsSession";
import {
  DEFAULT_SESSION_HISTORY_LRU_LIMIT,
  buildTurnId,
  buildTurnPath,
  getActiveSessionHistoryPath,
  readSessionHistoryJsonl,
  readSessionLineage,
  setSessionHistoryLruLimit,
  readConversationIndex,
  readTurnFile,
  writeSessionHistoryJsonl,
  writeConversationIndex,
  writeTurnFile,
} from "../conversation";

describe("VFS conversation helpers", () => {
  it("builds ids and paths", () => {
    expect(buildTurnId(0, 3)).toBe("fork-0/turn-3");
    expect(buildTurnPath(0, 3)).toBe("conversation/turns/fork-0/turn-3.json");
  });

  it("writes and reads index + turn files", () => {
    const session = new VfsSession();
    writeConversationIndex(session, {
      activeForkId: 0,
      activeTurnId: "fork-0/turn-0",
      rootTurnIdByFork: { "0": "fork-0/turn-0" },
      latestTurnNumberByFork: { "0": 0 },
      turnOrderByFork: { "0": ["fork-0/turn-0"] },
    });

    writeTurnFile(session, 0, 0, {
      turnId: "fork-0/turn-0",
      forkId: 0,
      turnNumber: 0,
      parentTurnId: null,
      createdAt: 1,
      userAction: "",
      assistant: { narrative: "", choices: [] },
    });

    const index = readConversationIndex(session.snapshot());
    const turn = readTurnFile(session.snapshot(), 0, 0);

    expect(index?.activeTurnId).toBe("fork-0/turn-0");
    expect(turn?.turnNumber).toBe(0);
  });

  it("writes and reads provider-native session mirror as jsonl", () => {
    const session = new VfsSession();
    const nativeHistory = [
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi" },
    ];

    writeSessionHistoryJsonl(session, nativeHistory, {
      sessionId: "session-a",
      operation: "finish_commit",
    });

    const snapshot = session.snapshot();
    const historyPath = getActiveSessionHistoryPath(snapshot);
    expect(historyPath).toMatch(/^session\/[^/]+\.jsonl$/);

    const file = session.readFile(historyPath!);
    expect(file?.contentType).toBe("application/jsonl");
    expect(file?.content).toContain('{"role":"user","content":"hello"}');
    expect(
      readSessionHistoryJsonl(snapshot, { sessionId: "session-a" }),
    ).toEqual(nativeHistory);
  });

  it("throws when requested session mirror is missing or wrong type", () => {
    const missing = new VfsSession();
    expect(() =>
      readSessionHistoryJsonl(missing.snapshot(), {
        path: "session/missing.jsonl",
      }),
    ).toThrow("not found");

    const wrongType = new VfsSession();
    wrongType.writeFile("session/custom.jsonl", "{}", "application/json");
    expect(() =>
      readSessionHistoryJsonl(wrongType.snapshot(), {
        path: "session/custom.jsonl",
      }),
    ).toThrow("not jsonl");
  });

  it("skips malformed jsonl lines while keeping valid entries", () => {
    const session = new VfsSession();
    session.writeFile(
      "session/custom.jsonl",
      '{"role":"user"}\n{invalid}\n{"role":"assistant"}',
      "application/jsonl",
    );
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const parsed = readSessionHistoryJsonl(session.snapshot(), {
      path: "session/custom.jsonl",
    });

    expect(parsed).toEqual([{ role: "user" }, { role: "assistant" }]);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("throws when a history entry cannot be serialized to jsonl", () => {
    const session = new VfsSession();
    expect(() =>
      writeSessionHistoryJsonl(session, [
        () => "not serializable",
      ] as unknown[]),
    ).toThrow("Failed to serialize provider-native history entry at index 0");
  });

  it("applies LRU pruning for session mirrors with configurable limit", () => {
    const session = new VfsSession();
    setSessionHistoryLruLimit(2);

    try {
      writeSessionHistoryJsonl(session, [{ id: "a" }], {
        sessionId: "session-a",
        operation: "finish_commit",
      });
      writeSessionHistoryJsonl(session, [{ id: "b" }], {
        sessionId: "session-b",
        operation: "finish_commit",
      });
      writeSessionHistoryJsonl(session, [{ id: "c" }], {
        sessionId: "session-c",
        operation: "finish_commit",
      });

      const snapshot = session.snapshot();
      const lineage = readSessionLineage(snapshot);
      expect(Object.keys(lineage.nodesByPath)).toHaveLength(2);
      expect(lineage.latestPathBySessionId["session-a"]).toBeUndefined();
      expect(lineage.latestPathBySessionId["session-b"]).toBeDefined();
      expect(lineage.latestPathBySessionId["session-c"]).toBeDefined();

      const sessionJsonlPaths = Object.keys(snapshot).filter((path) =>
        path.startsWith("session/"),
      );
      expect(sessionJsonlPaths.filter((path) => path.endsWith(".jsonl"))).toHaveLength(2);
    } finally {
      setSessionHistoryLruLimit(DEFAULT_SESSION_HISTORY_LRU_LIMIT);
    }
  });
});
