import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UnifiedMessage } from "@/services/messageTypes";
import {
  appendToHistory,
  createCheckpoint,
  handleRetryDetection,
  rollbackToTurnAnchor,
  setupSession,
} from "../sessionContext";

const sessionManagerMock = vi.hoisted(() => ({
  getOrCreateSession: vi.fn(),
  isEmpty: vi.fn(),
  setHistory: vi.fn(),
  setCacheHint: vi.fn(),
  setSystemInstruction: vi.fn(),
  getHistory: vi.fn(),
  rollbackToLastCheckpoint: vi.fn(),
  checkpoint: vi.fn(),
  appendHistory: vi.fn(),
}));

const cacheHintMock = vi.hoisted(() => ({
  buildCacheHint: vi.fn(),
}));

const messageTypesMock = vi.hoisted(() => ({
  toGeminiFormat: vi.fn(),
  fromGeminiFormat: vi.fn(),
  createUserMessage: vi.fn(),
}));

const runtimeCheckpointMock = vi.hoisted(() => ({
  checkpointVfsSession: vi.fn(),
  rollbackVfsSessionToCheckpoint: vi.fn(),
}));

const conversationMock = vi.hoisted(() => ({
  writeSessionHistoryJsonl: vi.fn(),
}));

vi.mock("@/services/ai/sessionManager", () => ({
  sessionManager: sessionManagerMock,
}));

vi.mock("@/services/ai/provider/cacheHint", () => ({
  buildCacheHint: cacheHintMock.buildCacheHint,
}));

vi.mock("@/services/messageTypes", () => ({
  toGeminiFormat: messageTypesMock.toGeminiFormat,
  fromGeminiFormat: messageTypesMock.fromGeminiFormat,
  createUserMessage: messageTypesMock.createUserMessage,
}));

vi.mock("@/services/vfs/runtimeCheckpoints", () => ({
  checkpointVfsSession: runtimeCheckpointMock.checkpointVfsSession,
  rollbackVfsSessionToCheckpoint:
    runtimeCheckpointMock.rollbackVfsSessionToCheckpoint,
}));

vi.mock("@/services/vfs/conversation", () => ({
  writeSessionHistoryJsonl: conversationMock.writeSessionHistoryJsonl,
}));

const createTextMessage = (role: "user" | "assistant" | "system", text: string) =>
  ({
    role,
    content: [{ type: "text" as const, text }],
  }) as UnifiedMessage;

describe("sessionContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionManagerMock.getOrCreateSession.mockResolvedValue({ id: "session-1" });
    cacheHintMock.buildCacheHint.mockReturnValue({
      protocol: "openai",
      cacheKey: "cache-1",
    });
    sessionManagerMock.getHistory.mockReturnValue([]);
    messageTypesMock.toGeminiFormat.mockImplementation((messages: unknown[]) =>
      messages.map((_, idx) => ({ role: "model", parts: [{ text: `gemini-${idx}` }] })),
    );
    messageTypesMock.fromGeminiFormat.mockReturnValue([]);
    messageTypesMock.createUserMessage.mockImplementation((text: string) =>
      createTextMessage("user", text),
    );
    runtimeCheckpointMock.rollbackVfsSessionToCheckpoint.mockReturnValue(true);
  });

  it("initializes empty session with hydrated history and clears init session", async () => {
    sessionManagerMock.isEmpty
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    sessionManagerMock.getHistory.mockReturnValue([
      { role: "command", content: [{ type: "text", text: "legacy" }] },
    ]);

    const contextMessages = [createTextMessage("system", "seed")];
    const recentHistory = [
      { role: "user", text: "look around" },
      { role: "command", text: "grant access" },
      { role: "model", text: "response" },
    ] as any[];

    const result = await setupSession({
      slotId: "slot-a",
      forkId: 0,
      vfsSession: { setActiveForkId: vi.fn() } as any,
      providerId: "provider-a",
      modelId: "model-a",
      protocol: "openai",
      systemInstruction: "system-inst",
      contextMessages,
      recentHistory,
      isInit: true,
    });

    expect(sessionManagerMock.getOrCreateSession).toHaveBeenCalledWith({
      slotId: "slot-a",
      forkId: 0,
      providerId: "provider-a",
      modelId: "model-a",
      protocol: "openai",
    });

    expect(sessionManagerMock.setHistory).toHaveBeenNthCalledWith(
      1,
      "session-1",
      [],
    );

    const initializedHistory = sessionManagerMock.setHistory.mock.calls[1]?.[1] as
      | UnifiedMessage[]
      | undefined;
    expect(initializedHistory?.[0]).toEqual(createTextMessage("system", "seed"));
    expect(
      initializedHistory?.some((msg) =>
        msg.content.some(
          (part) =>
            part.type === "text" &&
            part.text.includes("[SYSTEM: COLD_START_SOFT_GUIDANCE]"),
        ),
      ),
    ).toBe(true);
    const coldStartText = initializedHistory
      ?.flatMap((msg) => msg.content)
      .find(
        (part) =>
          part.type === "text" &&
          part.text.includes("[SYSTEM: COLD_START_SOFT_GUIDANCE]"),
      ) as { type: "text"; text: string } | undefined;
    expect(coldStartText?.text).toContain("current/skills/commands/runtime/SKILL.md");
    expect(coldStartText?.text).toContain("current/skills/commands/runtime/turn/SKILL.md");
    expect(coldStartText?.text).toContain("current/skills/core/protocols/SKILL.md");
    expect(coldStartText?.text).toContain("current/skills/craft/writing/SKILL.md");
    expect(coldStartText?.text).toContain("current/conversation/session.jsonl");
    expect(coldStartText?.text).toContain("lines/search windows");
    expect(initializedHistory).toEqual(
      expect.arrayContaining([
        createTextMessage("user", "[PLAYER_ACTION] look around"),
        createTextMessage("user", "[SUDO] grant access"),
        createTextMessage("assistant", "response"),
      ]),
    );

    expect(cacheHintMock.buildCacheHint).toHaveBeenCalledWith(
      "openai",
      "system-inst",
      contextMessages,
    );
    expect(sessionManagerMock.setCacheHint).toHaveBeenCalledWith("session-1", {
      protocol: "openai",
      cacheKey: "cache-1",
    });
    expect(sessionManagerMock.setSystemInstruction).toHaveBeenCalledWith(
      "session-1",
      "system-inst",
    );

    expect(result.sessionId).toBe("session-1");
    expect(result.activeHistory[0]?.role).toBe("user");
    expect(conversationMock.writeSessionHistoryJsonl).toHaveBeenCalled();
  });

  it("initializes gemini history through native conversion", async () => {
    sessionManagerMock.isEmpty.mockReturnValue(true);
    const geminiHistory = [{ role: "model", parts: [{ text: "native" }] }];
    sessionManagerMock.getHistory.mockReturnValue(geminiHistory);
    messageTypesMock.toGeminiFormat.mockReturnValue([{ role: "model", parts: [] }]);
    messageTypesMock.fromGeminiFormat.mockReturnValue([
      { role: "command", content: [{ type: "text", text: "cmd" }] },
    ]);

    const result = await setupSession({
      slotId: "slot-a",
      forkId: 1,
      vfsSession: { setActiveForkId: vi.fn() } as any,
      providerId: "provider-g",
      modelId: "model-g",
      protocol: "gemini",
      systemInstruction: "gemini-system",
      contextMessages: [createTextMessage("user", "hi")],
      isInit: false,
    });

    expect(messageTypesMock.toGeminiFormat).toHaveBeenCalledTimes(1);
    const geminiInitMessages = messageTypesMock.toGeminiFormat.mock.calls[0]?.[0] as
      | UnifiedMessage[]
      | undefined;
    expect(geminiInitMessages).toEqual(
      expect.arrayContaining([createTextMessage("user", "hi")]),
    );
    expect(
      geminiInitMessages?.some((msg) =>
        msg.content.some(
          (part) =>
            part.type === "text" &&
            part.text.includes("[SYSTEM: COLD_START_SOFT_GUIDANCE]"),
        ),
      ),
    ).toBe(true);
    expect(sessionManagerMock.setHistory).toHaveBeenCalledWith("session-1", [
      { role: "model", parts: [] },
    ]);
    expect(messageTypesMock.fromGeminiFormat).toHaveBeenCalledWith(geminiHistory);
    expect(result.activeHistory[0]?.role).toBe("user");
  });

  it("reuses existing non-empty session without resetting history", async () => {
    sessionManagerMock.isEmpty.mockReturnValue(false);
    const existingHistory = [createTextMessage("assistant", "persisted")];
    sessionManagerMock.getHistory.mockReturnValue(existingHistory);

    const result = await setupSession({
      slotId: "slot-a",
      forkId: 2,
      vfsSession: { setActiveForkId: vi.fn() } as any,
      providerId: "provider-b",
      modelId: "model-b",
      protocol: "openai",
      systemInstruction: "system-inst",
      contextMessages: [createTextMessage("system", "seed")],
    });

    expect(sessionManagerMock.setHistory).not.toHaveBeenCalled();
    expect(result.activeHistory).toEqual(existingHistory);
  });

  it("rolls back checkpoint when retry action matches last user input", () => {
    const activeHistory = [
      createTextMessage("assistant", "old"),
      createTextMessage("user", "[PLAYER_ACTION] open door"),
    ];
    const rolledBack = [createTextMessage("assistant", "new")];
    sessionManagerMock.getHistory.mockReturnValue(rolledBack);

    const result = handleRetryDetection(
      "session-1",
      activeHistory,
      "open door",
      "openai",
      {} as any,
    );

    expect(sessionManagerMock.rollbackToLastCheckpoint).toHaveBeenCalledWith(
      "session-1",
    );
    expect(
      runtimeCheckpointMock.rollbackVfsSessionToCheckpoint,
    ).toHaveBeenCalledWith("session-1", expect.any(Object));
    expect(result).toEqual(rolledBack);
  });

  it("supports sudo retry detection and ignores mismatches", () => {
    const sudoHistory = [createTextMessage("user", "[SUDO] reset")];

    handleRetryDetection(
      "session-1",
      sudoHistory,
      "[SUDO] reset",
      "openai",
      {} as any,
    );

    expect(sessionManagerMock.rollbackToLastCheckpoint).toHaveBeenCalledTimes(1);

    const unmatchedHistory = [createTextMessage("user", "[PLAYER_ACTION] inspect")];
    const untouched = handleRetryDetection(
      "session-1",
      unmatchedHistory,
      "attack",
      "openai",
      {} as any,
    );

    expect(sessionManagerMock.rollbackToLastCheckpoint).toHaveBeenCalledTimes(1);
    expect(untouched).toBe(unmatchedHistory);
  });

  it("creates checkpoints and appends history per protocol", () => {
    const messages = [createTextMessage("user", "next")];
    const vfsSession = { setActiveForkId: vi.fn() } as any;

    createCheckpoint("session-1", {} as any);
    expect(sessionManagerMock.checkpoint).toHaveBeenCalledWith("session-1");
    expect(runtimeCheckpointMock.checkpointVfsSession).toHaveBeenCalledWith(
      "session-1",
      expect.any(Object),
    );

    appendToHistory("session-1", messages, "openai", vfsSession, 0);
    expect(sessionManagerMock.appendHistory).toHaveBeenNthCalledWith(
      1,
      "session-1",
      messages,
    );

    messageTypesMock.toGeminiFormat.mockReturnValue([{ role: "model", parts: [] }]);
    appendToHistory("session-1", messages, "gemini", vfsSession, 0);
    expect(messageTypesMock.toGeminiFormat).toHaveBeenCalledWith(messages);
    expect(sessionManagerMock.appendHistory).toHaveBeenNthCalledWith(
      2,
      "session-1",
      [{ role: "model", parts: [] }],
    );
    expect(conversationMock.writeSessionHistoryJsonl).toHaveBeenCalledTimes(2);
  });

  it("returns null when vfs checkpoint rollback is unavailable", () => {
    runtimeCheckpointMock.rollbackVfsSessionToCheckpoint.mockReturnValue(false);

    const result = rollbackToTurnAnchor(
      "session-1",
      "openai",
      {} as any,
    );

    expect(sessionManagerMock.rollbackToLastCheckpoint).toHaveBeenCalledWith(
      "session-1",
    );
    expect(conversationMock.writeSessionHistoryJsonl).toHaveBeenCalled();
    expect(result).toBeNull();
  });
});
