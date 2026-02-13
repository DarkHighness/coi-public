import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { callWithAgenticRetry } from "../retry";
import { createUserMessage } from "../../../messageTypes";

const toolSchema = z.object({ foo: z.string() });
const toolName = "test_tool";

const makeRequest = () => ({
  modelId: "model-1",
  systemInstruction: "system",
  messages: [],
  tools: [{ name: toolName, description: "test", parameters: toolSchema }],
});

const makeUsage = (promptTokens: number, completionTokens: number) => ({
  promptTokens,
  completionTokens,
  totalTokens: promptTokens + completionTokens,
});

const createProvider = (responses: Array<any>) => {
  const queue = [...responses];
  return {
    protocol: "openai",
    instanceId: "provider-1",
    instance: {} as any,
    generateChat: vi.fn(async () => {
      const next = queue.shift();
      if (!next) {
        throw new Error("No queued response");
      }
      if (next instanceof Error) {
        throw next;
      }
      return next;
    }),
  } as any;
};

describe("callWithAgenticRetry behavior", () => {
  it("creates a virtual tool call from raw JSON when required tool is configured", async () => {
    const provider = createProvider([
      {
        result: {
          content: '{"foo":"bar"}',
        },
        usage: makeUsage(2, 1),
        raw: null,
      },
    ]);

    const result = await callWithAgenticRetry(
      provider,
      makeRequest() as any,
      [],
      { requiredToolName: toolName, maxRetries: 0 },
    );

    const calls = (result.result as { functionCalls?: Array<any> })
      .functionCalls;
    expect(calls).toHaveLength(1);
    expect(calls?.[0].name).toBe(toolName);
    expect(calls?.[0].args).toEqual({ foo: "bar" });
    expect(calls?.[0].id).toMatch(/^fallback_/);
    expect(result.retries).toBe(0);
    expect(result.usage).toEqual(makeUsage(2, 1));
  });

  it("silently retries empty responses without polluting history", async () => {
    const provider = createProvider([
      {
        result: {
          content: "",
        },
        usage: makeUsage(1, 1),
        raw: null,
      },
      {
        result: {
          functionCalls: [{ name: toolName, args: { foo: "ok" } }],
        },
        usage: makeUsage(3, 2),
        raw: null,
      },
    ]);

    const history = [createUserMessage("seed")];

    const result = await callWithAgenticRetry(
      provider,
      makeRequest() as any,
      history,
      { requiredToolName: toolName, maxRetries: 1 },
    );

    expect(provider.generateChat).toHaveBeenCalledTimes(2);
    expect(result.retries).toBe(1);
    expect(result.usage).toEqual(makeUsage(4, 3));
    expect(history).toHaveLength(1);
    expect(
      ((result.result as any).functionCalls?.[0]?.id as string) || "",
    ).toMatch(/^call_/);
  });

  it("estimates prompt usage when provider does not report usage", async () => {
    const provider = createProvider([
      {
        result: {
          content: "Narrative only",
        },
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          reported: false,
        },
        raw: null,
      },
    ]);

    const history = [createUserMessage("seed")];

    const result = await callWithAgenticRetry(
      provider,
      makeRequest() as any,
      history,
      { maxRetries: 0 },
    );

    expect(result.retries).toBe(0);
    expect(result.usage.reported).toBe(false);
    expect(result.usage.promptTokens).toBeGreaterThan(0);
    expect(result.usage.totalTokens).toBeGreaterThanOrEqual(
      result.usage.promptTokens,
    );
  });

  it("appends assistant+user feedback on missing required tool and calls onRetry", async () => {
    const provider = createProvider([
      {
        result: {
          content: "Narrative only response",
        },
        usage: makeUsage(1, 1),
        raw: null,
      },
      {
        result: {
          functionCalls: [
            { id: "call_2", name: toolName, args: { foo: "ok" } },
          ],
        },
        usage: makeUsage(1, 1),
        raw: null,
      },
    ]);

    const onRetry = vi.fn();
    const history: any[] = [];

    const result = await callWithAgenticRetry(
      provider,
      makeRequest() as any,
      history,
      { requiredToolName: toolName, maxRetries: 1, onRetry },
    );

    expect(result.retries).toBe(1);
    expect(history).toHaveLength(2);
    expect(history[0]?.role).toBe("assistant");
    expect(history[1]?.role).toBe("user");
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry.mock.calls[0]?.[0]).toContain("NO_TOOL_CALL");
    expect(onRetry.mock.calls[0]?.[1]).toBe(1);
  });

  it("retries malformed provider errors with raw feedback in history", async () => {
    const provider = createProvider([
      new Error("MALFORMED_TOOL_CALL: invalid JSON payload"),
      {
        result: {
          functionCalls: [
            { id: "call_2", name: toolName, args: { foo: "ok" } },
          ],
        },
        usage: makeUsage(1, 1),
        raw: null,
      },
    ]);

    const history: any[] = [];

    const result = await callWithAgenticRetry(
      provider,
      makeRequest() as any,
      history,
      {
        requiredToolName: toolName,
        maxRetries: 1,
        finishToolName: "vfs_commit_turn",
      },
    );

    expect(result.retries).toBe(1);
    expect(history).toHaveLength(2);
    expect(history[0]?.role).toBe("assistant");
    const feedbackText =
      history[1]?.content?.find((part: any) => part.type === "text")?.text ??
      "";
    expect(feedbackText).toContain("MALFORMED_TOOL_CALL");
    expect(feedbackText).toContain(
      "Raw provider error: MALFORMED_TOOL_CALL: invalid JSON payload",
    );
    expect(feedbackText).toContain(
      'If you call "vfs_commit_turn", it must be the LAST tool call.',
    );
  });

  it("throws unknown provider errors without automatic retry", async () => {
    const provider = createProvider([
      new Error("backend panic without classification"),
    ]);

    await expect(
      callWithAgenticRetry(provider, makeRequest() as any, [], {
        maxRetries: 2,
      }),
    ).rejects.toThrow("[ERROR: UNKNOWN_PROVIDER_ERROR]");

    expect(provider.generateChat).toHaveBeenCalledTimes(1);
  });

  it("keeps history unchanged for silent provider retries", async () => {
    const provider = createProvider([
      new Error("429 rate limit exceeded"),
      {
        result: {
          functionCalls: [
            { id: "call_ok", name: toolName, args: { foo: "ok" } },
          ],
        },
        usage: makeUsage(1, 1),
        raw: null,
      },
    ]);

    const onRetry = vi.fn();
    const history = [createUserMessage("seed")];

    const result = await callWithAgenticRetry(
      provider,
      makeRequest() as any,
      history,
      {
        requiredToolName: toolName,
        maxRetries: 1,
        onRetry,
      },
    );

    expect(result.retries).toBe(1);
    expect(history).toHaveLength(1);
    expect(onRetry).toHaveBeenCalledWith(
      expect.stringContaining("429"),
      1,
      expect.objectContaining({ silent: true, classification: "silent_retry" }),
    );
  });

  it("prunes history back to initial length after exhausting retries", async () => {
    const provider = createProvider([
      {
        result: {
          functionCalls: [{ id: "call_a", name: toolName, args: {} }],
        },
        usage: makeUsage(1, 1),
        raw: null,
      },
      {
        result: {
          functionCalls: [{ id: "call_b", name: toolName, args: {} }],
        },
        usage: makeUsage(1, 1),
        raw: null,
      },
    ]);

    const seed = createUserMessage("persist me");
    const history = [seed];

    await expect(
      callWithAgenticRetry(provider, makeRequest() as any, history, {
        requiredToolName: toolName,
        maxRetries: 1,
      }),
    ).rejects.toThrow("INVALID_PARAMETERS");

    expect(provider.generateChat).toHaveBeenCalledTimes(2);
    expect(history).toEqual([seed]);
  });

  it("references tool docs and avoids repeating huge schema hints across retries", async () => {
    const provider = createProvider([
      {
        result: {
          functionCalls: [{ id: "call_a", name: toolName, args: {} }],
        },
        usage: makeUsage(1, 1),
        raw: null,
      },
      {
        result: {
          functionCalls: [{ id: "call_b", name: toolName, args: {} }],
        },
        usage: makeUsage(1, 1),
        raw: null,
      },
    ]);

    let thrown: Error | null = null;
    try {
      await callWithAgenticRetry(provider, makeRequest() as any, [], {
        requiredToolName: toolName,
        maxRetries: 1,
      });
    } catch (error) {
      thrown = error as Error;
    }

    expect(thrown).toBeTruthy();
    expect(thrown?.message).toContain("current/refs/tools/test_tool.md");
    expect(thrown?.message).not.toContain("<tool_info>");
    expect(thrown?.message).toContain("already provided earlier");
  });
});
