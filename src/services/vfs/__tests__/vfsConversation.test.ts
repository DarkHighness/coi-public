import { describe, expect, it, vi } from "vitest";
import { VfsSession } from "../vfsSession";
import {
  SESSION_JSONL_PATH,
  buildTurnId,
  buildTurnPath,
  readSessionHistoryJsonl,
  readConversationIndex,
  readTurnFile,
  writeSessionHistoryJsonl,
  writeConversationIndex,
  writeTurnFile,
} from "../conversation";

describe("VFS conversation helpers", () => {
  it("builds ids and paths", () => {
    expect(buildTurnId(0, 3)).toBe("fork-0/turn-3");
    expect(buildTurnPath(0, 3)).toBe(
      "conversation/turns/fork-0/turn-3.json",
    );
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

    writeSessionHistoryJsonl(session, nativeHistory, { operation: "finish_commit" });

    const file = session.readFile(SESSION_JSONL_PATH);
    expect(file?.contentType).toBe("application/jsonl");
    expect(file?.content).toContain('{"role":"user","content":"hello"}');
    expect(readSessionHistoryJsonl(session.snapshot())).toEqual(nativeHistory);
  });

  it("returns empty session mirror when file is missing or has wrong type", () => {
    const missing = new VfsSession();
    expect(readSessionHistoryJsonl(missing.snapshot())).toEqual([]);

    const wrongType = new VfsSession();
    wrongType.writeFile(SESSION_JSONL_PATH, "{}", "application/json");
    expect(readSessionHistoryJsonl(wrongType.snapshot())).toEqual([]);
  });

  it("skips malformed jsonl lines while keeping valid entries", () => {
    const session = new VfsSession();
    session.writeFile(
      SESSION_JSONL_PATH,
      '{"role":"user"}\n{invalid}\n{"role":"assistant"}',
      "application/jsonl",
    );
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const parsed = readSessionHistoryJsonl(session.snapshot());

    expect(parsed).toEqual([{ role: "user" }, { role: "assistant" }]);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("throws when a history entry cannot be serialized to jsonl", () => {
    const session = new VfsSession();
    expect(() =>
      writeSessionHistoryJsonl(session, [() => "not serializable"] as unknown[]),
    ).toThrow("Failed to serialize provider-native history entry at index 0");
  });
});
