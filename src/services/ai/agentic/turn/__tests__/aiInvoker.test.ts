import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  ContextOverflowError,
  HistoryCorruptedError,
} from "@/services/ai/contextCompressor";
import { invokeAI, ensureToolCallIds } from "../aiInvoker";
import { callWithAgenticRetry } from "../../retry";

vi.mock("../../retry", () => ({
  callWithAgenticRetry: vi.fn(),
}));

const mockedCallWithAgenticRetry = vi.mocked(callWithAgenticRetry);

const createBudgetState = () => ({
  toolCallsUsed: 0,
  toolCallsMax: 20,
  retriesUsed: 0,
  retriesMax: 3,
  loopIterationsUsed: 0,
  loopIterationsMax: 10,
});

const createConfig = () => ({
  modelId: "model-1",
  systemInstruction: "sys",
  tools: [
    {
      name: "vfs_ls",
      description: "list",
      parameters: z.object({ path: z.string().optional() }),
    },
  ],
  toolChoice: "required",
  temperature: 0.6,
  topP: 0.95,
  topK: 20,
  minP: 0.1,
  mediaResolution: "high",
  thinkingEffort: "medium",
});

const usage = {
  promptTokens: 9,
  completionTokens: 3,
  totalTokens: 12,
};

describe("aiInvoker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("invokes provider with mapped tool config and returns response data", async () => {
    mockedCallWithAgenticRetry.mockResolvedValue({
      result: {
        text: "ok",
        functionCalls: [
          { id: "call-1", name: "vfs_ls", args: { path: "current" } },
        ],
      },
      usage,
      retries: 0,
    } as any);

    const history: any[] = [];
    const budgetState = createBudgetState();

    const result = await invokeAI(
      {} as any,
      createConfig() as any,
      history,
      budgetState as any,
      "vfs_commit_turn",
    );

    expect(mockedCallWithAgenticRetry).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        modelId: "model-1",
        systemInstruction: "sys",
        toolChoice: "required",
        mediaResolution: "high",
        temperature: 0.6,
        topP: 0.95,
        topK: 20,
        minP: 0.1,
      }),
      history,
      expect.objectContaining({ maxRetries: 3 }),
    );

    expect(result).toEqual({
      text: "ok",
      functionCalls: [
        { id: "call-1", name: "vfs_ls", args: { path: "current" } },
      ],
      usage,
      retries: 0,
    });
  });

  it("ignores silent retries when updating budget/history", async () => {
    mockedCallWithAgenticRetry.mockImplementation(
      async (_provider, _request, _history, options) => {
        options?.onRetry?.("429 rate limit", 1, {
          silent: true,
          classification: "silent_retry",
        });
        return {
          result: { content: "fallback" },
          usage,
          retries: 1,
        } as any;
      },
    );

    const history: any[] = [];
    const budgetState = createBudgetState();

    await invokeAI(
      {} as any,
      createConfig() as any,
      history,
      budgetState as any,
      "vfs_commit_turn",
    );

    expect(budgetState.retriesUsed).toBe(0);
    expect(history).toHaveLength(0);
  });

  it("injects budget update prompt and increments retry count via onRetry", async () => {
    mockedCallWithAgenticRetry.mockImplementation(
      async (_provider, _request, _history, options) => {
        options?.onRetry?.("temporary", 1);
        return {
          result: { content: "fallback" },
          usage,
          retries: 1,
        } as any;
      },
    );

    const history: any[] = [];
    const budgetState = createBudgetState();

    const result = await invokeAI(
      {} as any,
      createConfig() as any,
      history,
      budgetState as any,
      "vfs_commit_turn",
    );

    expect(result.text).toBe("fallback");
    expect(budgetState.retriesUsed).toBe(1);
    expect(history).toHaveLength(1);
    expect(history[0]?.role).toBe("user");
    expect(history[0]?.content?.[0]?.text).toContain("[SYSTEM: BUDGET UPDATE]");
  });

  it("maps context overflow and invalid-argument errors to typed errors", async () => {
    mockedCallWithAgenticRetry.mockRejectedValueOnce(
      new Error("maximum context length exceeded"),
    );

    await expect(
      invokeAI(
        {} as any,
        createConfig() as any,
        [],
        createBudgetState() as any,
        "vfs_commit_turn",
      ),
    ).rejects.toBeInstanceOf(ContextOverflowError);

    mockedCallWithAgenticRetry.mockRejectedValueOnce(
      new Error("INVALID_ARGUMENT: malformed content"),
    );

    await expect(
      invokeAI(
        {} as any,
        createConfig() as any,
        [],
        createBudgetState() as any,
        "vfs_commit_turn",
      ),
    ).rejects.toBeInstanceOf(HistoryCorruptedError);
  });

  it("assigns ids to tool calls missing id and keeps existing ids", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.123456789);

    const functionCalls = [
      { name: "vfs_ls", args: { path: "a" } },
      { id: "keep-id", name: "vfs_read", args: { path: "b" } },
    ] as any;

    ensureToolCallIds(functionCalls);

    expect(functionCalls[0].id).toMatch(/^call_/);
    expect(functionCalls[1].id).toBe("keep-id");

    expect(() => ensureToolCallIds(undefined)).not.toThrow();
  });
});
