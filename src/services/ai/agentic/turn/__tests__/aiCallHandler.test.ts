import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { UnifiedMessage } from "../../../../messageTypes";
import { handleAICall } from "../aiCallHandler";
import { sessionManager } from "../../../sessionManager";
import {
  ContextOverflowError,
  HistoryCorruptedError,
} from "../../../contextCompressor";
import { callWithAgenticRetry } from "../../retry";

vi.mock("../../retry", () => ({
  callWithAgenticRetry: vi.fn(),
}));

const mockedCallWithAgenticRetry = vi.mocked(callWithAgenticRetry);

const createSettings = (forceAutoToolChoice = false) =>
  ({
    story: {
      providerId: "provider-1",
      modelId: "model-1",
      mediaResolution: "high",
      temperature: 0.6,
      topP: 0.9,
      topK: 20,
      minP: 0.1,
      thinkingEffort: "medium",
    },
    extra: {
      forceAutoToolChoice,
    },
  }) as any;

const createLoopState = () =>
  ({
    activeTools: [
      {
        name: "vfs_ls",
        description: "list files",
        parameters: {},
      },
    ],
    budgetState: {
      toolCallsUsed: 0,
      toolCallsMax: 20,
      retriesUsed: 0,
      retriesMax: 3,
      loopIterationsUsed: 0,
      loopIterationsMax: 10,
    },
    finishToolName: "vfs_commit_turn",
    requiredPresetSkillPaths: [],
  }) as any;

const baseUsage = {
  promptTokens: 10,
  completionTokens: 5,
  totalTokens: 15,
};

describe("handleAICall", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses effective tool choice and backfills missing tool call ids", async () => {
    const toolChoiceSpy = vi
      .spyOn(sessionManager, "getEffectiveToolChoice")
      .mockReturnValue("none");

    mockedCallWithAgenticRetry.mockResolvedValue({
      result: {
        text: "ok",
        functionCalls: [{ name: "vfs_ls", args: { path: "current" } }],
      },
      usage: baseUsage,
      retries: 0,
    } as any);

    const result = await handleAICall({
      provider: {} as any,
      modelId: "model-1",
      systemInstruction: "sys",
      conversationHistory: [],
      loopState: createLoopState(),
      settings: createSettings(false),
      sessionId: "session-1",
      requiredToolName: "vfs_ls",
    });

    expect(toolChoiceSpy).toHaveBeenCalledWith(
      "session-1",
      "required",
      false,
    );

    expect(mockedCallWithAgenticRetry).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        modelId: "model-1",
        systemInstruction: "sys",
        toolChoice: "none",
        mediaResolution: "high",
        temperature: 0.6,
        topP: 0.9,
      }),
      expect.any(Array),
      expect.objectContaining({
        requiredToolName: "vfs_ls",
      }),
    );

    expect(result.text).toBe("ok");
    expect(result.usage).toEqual(baseUsage);
    expect(result.functionCalls?.[0].id).toMatch(/^call_/);
  });

  it("maps context length errors to ContextOverflowError", async () => {
    mockedCallWithAgenticRetry.mockRejectedValue(
      new Error("maximum context length exceeded"),
    );

    await expect(
      handleAICall({
        provider: {} as any,
        modelId: "model-1",
        systemInstruction: "sys",
        conversationHistory: [],
        loopState: createLoopState(),
        settings: createSettings(),
        sessionId: "session-1",
      }),
    ).rejects.toBeInstanceOf(ContextOverflowError);
  });

  it("maps invalid argument errors to HistoryCorruptedError", async () => {
    mockedCallWithAgenticRetry.mockRejectedValue(
      new Error("INVALID_ARGUMENT: malformed content"),
    );

    await expect(
      handleAICall({
        provider: {} as any,
        modelId: "model-1",
        systemInstruction: "sys",
        conversationHistory: [],
        loopState: createLoopState(),
        settings: createSettings(),
        sessionId: "session-1",
      }),
    ).rejects.toBeInstanceOf(HistoryCorruptedError);
  });

  it("injects budget update message and increments retry counter via onRetry", async () => {
    const conversationHistory: UnifiedMessage[] = [];
    const loopState = createLoopState();

    mockedCallWithAgenticRetry.mockImplementation(
      async (_provider, _request, _history, options) => {
        options?.onRetry?.("temporary failure", 1);
        return {
          result: { text: "ok", functionCalls: [] },
          usage: baseUsage,
          retries: 1,
        } as any;
      },
    );

    await handleAICall({
      provider: {} as any,
      modelId: "model-1",
      systemInstruction: "sys",
      conversationHistory,
      loopState,
      settings: createSettings(),
      sessionId: "session-1",
    });

    expect(loopState.budgetState.retriesUsed).toBe(1);
    expect(conversationHistory).toHaveLength(1);
    expect(conversationHistory[0]?.role).toBe("user");

    const budgetText =
      conversationHistory[0]?.content.find((part) => part.type === "text")?.text ??
      "";
    expect(budgetText).toContain("[SYSTEM: BUDGET UPDATE]");
  });
});
