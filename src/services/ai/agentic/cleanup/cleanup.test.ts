import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateEntityCleanup } from "./cleanup";
import { generateAdventureTurn } from "../turn/adventure";
import { HistoryCorruptedError } from "../../contextCompressor";

const getProviderConfigMock = vi.hoisted(() => vi.fn());
const getOrCreateSessionMock = vi.hoisted(() => vi.fn());
const getSystemInstructionMock = vi.hoisted(() => vi.fn());
const getHistoryMock = vi.hoisted(() => vi.fn());
const estimatePromptTokensMock = vi.hoisted(() => vi.fn());
const buildToolCallContextUsageSnapshotMock = vi.hoisted(() => vi.fn());
const getDefinitionsForToolsetMock = vi.hoisted(() => vi.fn());
const fromGeminiFormatMock = vi.hoisted(() => vi.fn());

vi.mock("../turn/adventure", () => ({
  generateAdventureTurn: vi.fn(),
}));

vi.mock("../../utils", () => ({
  getProviderConfig: getProviderConfigMock,
}));

vi.mock("../../sessionManager", () => ({
  sessionManager: {
    getOrCreateSession: getOrCreateSessionMock,
    getSystemInstruction: getSystemInstructionMock,
    getHistory: getHistoryMock,
  },
}));

vi.mock("../retry", () => ({
  estimatePromptTokens: estimatePromptTokensMock,
}));

vi.mock("../../contextUsage", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    buildToolCallContextUsageSnapshot: buildToolCallContextUsageSnapshotMock,
  };
});

vi.mock("../../../vfs/tools", () => ({
  vfsToolRegistry: {
    getDefinitionsForToolset: getDefinitionsForToolsetMock,
  },
}));

vi.mock("../../../messageTypes", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    fromGeminiFormat: fromGeminiFormatMock,
  };
});

const mockedGenerateAdventureTurn = vi.mocked(generateAdventureTurn);

describe("generateEntityCleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProviderConfigMock.mockReturnValue(null);
    getOrCreateSessionMock.mockResolvedValue({ id: "sess-1" });
    getSystemInstructionMock.mockReturnValue("sys");
    getHistoryMock.mockReturnValue([]);
    estimatePromptTokensMock.mockReturnValue(50);
    buildToolCallContextUsageSnapshotMock.mockReturnValue({
      usageRatio: 0.5,
    });
    getDefinitionsForToolsetMock.mockReturnValue([]);
    fromGeminiFormatMock.mockReturnValue([]);
  });

  it("builds cleanup prompt with guardrails and routes through adventure loop", async () => {
    mockedGenerateAdventureTurn.mockResolvedValue({
      response: { narrative: "cleanup done", choices: [{ text: "Continue" }] },
      logs: [{ endpoint: "cleanup" }],
      usage: { promptTokens: 3, completionTokens: 2, totalTokens: 5 },
      changedEntities: [{ id: "quest:1", type: "quest" }],
      _conversationHistory: [],
    } as any);

    const inputState = { forkId: 7 } as any;
    const context = { slotId: "slot-clean", userAction: "old" } as any;

    const result = await generateEntityCleanup(inputState, context);

    expect(mockedGenerateAdventureTurn).toHaveBeenCalledTimes(1);
    const [, calledContext] = mockedGenerateAdventureTurn.mock
      .calls[0] as any[];

    expect(calledContext.slotId).toBe("slot-clean");
    expect(typeof calledContext.userAction).toBe("string");
    expect(calledContext.userAction.startsWith("[CLEANUP]")).toBe(true);
    expect(calledContext.userAction).toContain("<cleanup_anchor>");
    expect(calledContext.userAction).toContain(
      "<target_fork_id>7</target_fork_id>",
    );
    expect(calledContext.userAction).toContain("required_first_read");
    expect(calledContext.userAction).toContain("Never read/mutate other forks");
    expect(calledContext.userAction).toContain("vfs_ls");
    expect(calledContext.userAction).toContain("vfs_search");
    expect(calledContext.userAction).toContain(
      "CRITICAL NARRATIVE PRIVACY RULE",
    );

    expect(result).toEqual({
      response: { narrative: "cleanup done", choices: [{ text: "Continue" }] },
      logs: [{ endpoint: "cleanup" }],
      usage: { promptTokens: 3, completionTokens: 2, totalTokens: 5 },
      changedEntities: [{ id: "quest:1", type: "quest" }],
    });
  });

  it("keeps input game state untouched and injects generated cleanup action", async () => {
    mockedGenerateAdventureTurn.mockResolvedValue({
      response: { narrative: "ok", choices: [] },
      logs: [],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      changedEntities: [],
      _conversationHistory: [],
    } as any);

    const inputState = { outline: { title: "Demo" } } as any;
    const originalState = JSON.parse(JSON.stringify(inputState));

    await generateEntityCleanup(inputState, { userAction: "ignored" } as any);

    expect(inputState).toEqual(originalState);
    const [, calledContext] = mockedGenerateAdventureTurn.mock
      .calls[0] as any[];
    expect(calledContext.userAction).not.toBe("ignored");
  });

  it("passes recovery trace through when cleanup recovered", async () => {
    const recovery = {
      attempts: [
        { level: 2, kind: "context", attempt: 3, timestamp: Date.now() },
      ],
      finalLevel: 2,
      kind: "context",
      recovered: true,
      durationMs: 88,
    };

    mockedGenerateAdventureTurn.mockResolvedValue({
      response: { narrative: "ok", choices: [] },
      logs: [],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      changedEntities: [],
      _conversationHistory: [],
      recovery,
    } as any);

    const result = await generateEntityCleanup(
      {} as any,
      {
        userAction: "ignored",
      } as any,
    );

    expect(result.recovery).toEqual(recovery);
  });

  it("falls back to query cleanup on context/history failures", async () => {
    mockedGenerateAdventureTurn
      .mockRejectedValueOnce(
        new HistoryCorruptedError(new Error("history mismatch")),
      )
      .mockResolvedValueOnce({
        response: { narrative: "fallback ok", choices: [] },
        logs: [],
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        changedEntities: [],
        _conversationHistory: [],
      } as any);

    const inputState = { forkId: 2 } as any;
    const context = {
      slotId: "slot-main",
      userAction: "ignored",
      recentHistory: [{ role: "user", text: "x" }],
    } as any;

    const result = await generateEntityCleanup(inputState, context);

    expect(result.response.narrative).toBe("fallback ok");
    expect(mockedGenerateAdventureTurn).toHaveBeenCalledTimes(2);

    const [, firstContext] = mockedGenerateAdventureTurn.mock.calls[0] as any[];
    const [, secondContext] = mockedGenerateAdventureTurn.mock
      .calls[1] as any[];
    expect(firstContext.slotId).toBe("slot-main");
    expect(secondContext.slotId).toBe("slot-main:cleanup");
    expect(secondContext.recentHistory).toEqual([]);
  });

  it("supports explicit query cleanup mode", async () => {
    mockedGenerateAdventureTurn.mockResolvedValue({
      response: { narrative: "query mode", choices: [] },
      logs: [],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      changedEntities: [],
      _conversationHistory: [],
    } as any);

    await generateEntityCleanup(
      { forkId: 3 } as any,
      {
        slotId: "slot-clean",
        userAction: "ignored",
        recentHistory: [{ role: "assistant", text: "seed" }],
      } as any,
      "query_cleanup",
    );

    expect(mockedGenerateAdventureTurn).toHaveBeenCalledTimes(1);
    const [, calledContext] = mockedGenerateAdventureTurn.mock
      .calls[0] as any[];
    expect(calledContext.slotId).toBe("slot-clean:cleanup");
    expect(calledContext.recentHistory).toEqual([]);
  });

  it("auto mode prefers session cleanup when context usage is below danger threshold", async () => {
    getProviderConfigMock.mockReturnValue({
      instance: { id: "provider-1", protocol: "openai" },
      modelId: "model-1",
    });
    buildToolCallContextUsageSnapshotMock.mockReturnValue({
      usageRatio: 0.82,
    });

    mockedGenerateAdventureTurn.mockResolvedValueOnce({
      response: { narrative: "session cleanup ok", choices: [] },
      logs: [],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      changedEntities: [],
      _conversationHistory: [],
    } as any);

    await generateEntityCleanup(
      { forkId: 5 } as any,
      {
        slotId: "slot-clean",
        userAction: "ignored",
        recentHistory: [],
        settings: {
          story: { providerId: "provider-1", modelId: "model-1" },
          providers: {
            instances: [{ id: "provider-1", protocol: "openai" }],
          },
          extra: { autoCompactThreshold: 0.7 },
          embedding: { enabled: false },
        },
      } as any,
      "auto",
    );

    expect(mockedGenerateAdventureTurn).toHaveBeenCalledTimes(1);
    const [, calledContext, calledOptions] = mockedGenerateAdventureTurn.mock
      .calls[0] as any[];
    expect(calledContext.slotId).toBe("slot-clean");
    expect(calledOptions?.turnKind).toBe("session_cleanup");
  });

  it("auto mode routes directly to query cleanup when context usage is in danger zone", async () => {
    getProviderConfigMock.mockReturnValue({
      instance: { id: "provider-1", protocol: "openai" },
      modelId: "model-1",
    });
    buildToolCallContextUsageSnapshotMock.mockReturnValue({
      usageRatio: 0.95,
    });

    mockedGenerateAdventureTurn.mockResolvedValueOnce({
      response: { narrative: "query cleanup", choices: [] },
      logs: [],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      changedEntities: [],
      _conversationHistory: [],
    } as any);

    await generateEntityCleanup(
      { forkId: 5 } as any,
      {
        slotId: "slot-clean",
        userAction: "ignored",
        recentHistory: [{ role: "user", text: "x" }],
        settings: {
          story: { providerId: "provider-1", modelId: "model-1" },
          providers: {
            instances: [{ id: "provider-1", protocol: "openai" }],
          },
          extra: { autoCompactThreshold: 0.7 },
          embedding: { enabled: false },
        },
      } as any,
      "auto",
    );

    expect(mockedGenerateAdventureTurn).toHaveBeenCalledTimes(1);
    const [, calledContext, calledOptions] = mockedGenerateAdventureTurn.mock
      .calls[0] as any[];
    expect(calledContext.slotId).toBe("slot-clean:cleanup");
    expect(calledContext.recentHistory).toEqual([]);
    expect(calledOptions?.turnKind).toBe("query_cleanup");
  });
});
