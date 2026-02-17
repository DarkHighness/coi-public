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

  it("allows partial execution for mixed valid/invalid calls in one batch", async () => {
    const provider = createProvider([
      {
        result: {
          functionCalls: [
            {
              id: "call_write",
              name: "vfs_write_file",
              args: {
                ops: [
                  {
                    op: "patch_json",
                    path: "current/world/characters/char:player/profile.json",
                  },
                ],
              },
            },
            {
              id: "call_commit",
              name: "vfs_finish_turn",
              args: {
                assistant: {
                  userAction: "black out the cameras",
                  narrative: "You cut the surveillance feed in a clean sweep.",
                  choices: [
                    { text: "Slip into the hallway" },
                    { text: "Plant a decoy ping" },
                  ],
                },
                meta: {
                  playerRate: {
                    vote: "up",
                  },
                },
              },
            },
          ],
        },
        usage: makeUsage(2, 2),
        raw: null,
      },
    ]);

    const request = {
      ...makeRequest(),
      tools: [
        {
          name: "vfs_write_file",
          description: "write",
          parameters: z
            .object({
              ops: z.array(
                z
                  .object({
                    op: z.string(),
                    path: z.string(),
                  })
                  .strict(),
              ),
            })
            .strict(),
        },
        {
          name: "vfs_finish_turn",
          description: "commit turn",
          parameters: z
            .object({
              userAction: z.string(),
              assistant: z
                .object({
                  narrative: z.string(),
                  choices: z
                    .array(
                      z
                        .object({
                          text: z.string(),
                          consequence: z.string().nullish(),
                        })
                        .strict(),
                    )
                    .min(2)
                    .max(4),
                })
                .strict(),
            })
            .strict(),
        },
      ],
    };

    const history: any[] = [];

    const result = await callWithAgenticRetry(
      provider,
      request as any,
      history,
      { maxRetries: 0 },
    );

    expect(result.retries).toBe(0);
    expect(history).toHaveLength(0);
    expect(
      (
        (result.result as { functionCalls?: Array<any> }).functionCalls ?? []
      ).map((call) => call.id),
    ).toEqual(["call_write", "call_commit"]);
    expect(provider.generateChat).toHaveBeenCalledTimes(1);
  });

  it("marks each invalid tool as INVALID_PARAMETERS in retry feedback", async () => {
    const provider = createProvider([
      {
        result: {
          functionCalls: [
            {
              id: "call_write",
              name: "vfs_write_file",
              args: {
                invalid: true,
              },
            },
            {
              id: "call_commit_invalid",
              name: "vfs_finish_turn",
              args: {
                assistant: {
                  userAction: "nested-legacy-shape",
                  narrative: "narrative",
                  choices: [{ text: "a" }, { text: "b" }],
                },
              },
            },
          ],
        },
        usage: makeUsage(2, 2),
        raw: null,
      },
      {
        result: {
          functionCalls: [
            {
              id: "call_ok",
              name: "vfs_write_file",
              args: {
                ops: [
                  {
                    op: "patch_json",
                    path: "current/world/characters/char:player/profile.json",
                  },
                ],
              },
            },
          ],
        },
        usage: makeUsage(1, 1),
        raw: null,
      },
    ]);

    const request = {
      ...makeRequest(),
      tools: [
        {
          name: "vfs_write_file",
          description: "write",
          parameters: z
            .object({
              ops: z.array(
                z
                  .object({
                    op: z.string(),
                    path: z.string(),
                  })
                  .strict(),
              ),
            })
            .strict(),
        },
        {
          name: "vfs_finish_turn",
          description: "commit turn",
          parameters: z
            .object({
              userAction: z.string(),
              assistant: z
                .object({
                  narrative: z.string(),
                  choices: z
                    .array(
                      z
                        .object({
                          text: z.string(),
                          consequence: z.string().nullish(),
                        })
                        .strict(),
                    )
                    .min(2)
                    .max(4),
                })
                .strict(),
            })
            .strict(),
        },
      ],
    };

    const history: any[] = [];

    const result = await callWithAgenticRetry(
      provider,
      request as any,
      history,
      { maxRetries: 1 },
    );

    expect(result.retries).toBe(1);
    expect(history).toHaveLength(2);
    expect(history[0]?.role).toBe("assistant");
    expect(history[1]?.role).toBe("tool");

    const toolParts =
      history[1]?.content?.filter((part: any) => part.type === "tool_result") ??
      [];
    expect(toolParts).toHaveLength(2);

    const writeResult = toolParts.find(
      (part: any) => part.toolResult.name === "vfs_write_file",
    )?.toolResult?.content as any;
    const commitResult = toolParts.find(
      (part: any) => part.toolResult.name === "vfs_finish_turn",
    )?.toolResult?.content as any;

    expect(writeResult?.code).toBe("INVALID_PARAMETERS");
    expect(writeResult?.error).toContain(
      'arguments you provided to "vfs_write_file" were invalid',
    );

    expect(commitResult?.code).toBe("INVALID_PARAMETERS");
    expect(commitResult?.error).toContain(
      'arguments you provided to "vfs_finish_turn" were invalid',
    );
  });

  it("caps INVALID_PARAMETERS issue list for oversized schema failures", async () => {
    const provider = createProvider([
      {
        result: {
          functionCalls: [{ id: "call_invalid", name: "big_tool", args: {} }],
        },
        usage: makeUsage(1, 1),
        raw: null,
      },
    ]);

    const request = {
      modelId: "model-1",
      systemInstruction: "system",
      messages: [],
      tools: [
        {
          name: "big_tool",
          description: "big schema tool",
          parameters: z
            .object({
              a: z.string(),
              b: z.string(),
              c: z.string(),
              d: z.string(),
              e: z.string(),
              f: z.string(),
              g: z.string(),
            })
            .strict(),
        },
      ],
    };

    await expect(
      callWithAgenticRetry(provider, request as any, [], { maxRetries: 0 }),
    ).rejects.toThrow("and 3 more issue(s)");
  });

  it("adds numeric discriminator type hint for outline phase parameter errors", async () => {
    const provider = createProvider([
      {
        result: {
          functionCalls: [
            {
              id: "call_outline_invalid",
              name: "vfs_finish_outline_phase_0",
              args: {
                phase: "1",
                data: { storyPlanMarkdown: "# x" },
              },
            },
          ],
        },
        usage: makeUsage(1, 1),
        raw: null,
      },
    ]);

    const request = {
      modelId: "model-1",
      systemInstruction: "system",
      messages: [],
      tools: [
        {
          name: "vfs_finish_outline_phase_0",
          description: "outline submit",
          parameters: z.discriminatedUnion("phase", [
            z
              .object({
                phase: z.literal(0),
                data: z.object({ title: z.string() }).strict(),
              })
              .strict(),
            z
              .object({
                phase: z.literal(1),
                data: z
                  .object({
                    storyPlanMarkdown: z.string(),
                  })
                  .strict(),
              })
              .strict(),
          ]),
        },
      ],
    };

    await expect(
      callWithAgenticRetry(provider, request as any, [], { maxRetries: 0 }),
    ).rejects.toThrow(
      'phase must be integer literal, e.g. `phase: 1` (not `"1"`). If your previous call used `"phase":"1"`, resend with `"phase":1`',
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
        finishToolName: "vfs_finish_turn",
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
      'If you call "vfs_finish_turn", it must be the LAST tool call.',
    );
  });

  it("switches to internal streaming without consuming retry budget when required", async () => {
    const generateChat = vi
      .fn()
      .mockRejectedValueOnce(
        new Error(
          "Streaming is required for operations that may take longer than 10 minutes.",
        ),
      )
      .mockResolvedValueOnce({
        result: {
          functionCalls: [{ id: "call_ok", name: toolName, args: { foo: "ok" } }],
        },
        usage: makeUsage(1, 1),
        raw: null,
      });

    const provider = {
      protocol: "claude",
      instanceId: "provider-1",
      instance: {} as any,
      generateChat,
    } as any;

    const onRetry = vi.fn();
    const result = await callWithAgenticRetry(
      provider,
      makeRequest() as any,
      [],
      {
        requiredToolName: toolName,
        maxRetries: 1,
        onRetry,
      },
    );

    expect(result.retries).toBe(0);
    expect(generateChat).toHaveBeenCalledTimes(2);
    expect(generateChat.mock.calls[0]?.[0]?.onChunk).toBeUndefined();
    expect(typeof generateChat.mock.calls[1]?.[0]?.onChunk).toBe("function");
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("throws unknown provider errors without automatic retry", async () => {
    const provider = createProvider([
      new Error("backend panic without classification"),
    ]);

    await expect(
      callWithAgenticRetry(provider, makeRequest() as any, [], {
        maxRetries: 2,
      }),
    ).rejects.toThrow("Confirm provider health");

    expect(provider.generateChat).toHaveBeenCalledTimes(1);
  });

  it("adds actionable feedback for model-fixable provider call failures", async () => {
    const provider = createProvider([
      new Error("schema validation failed by provider"),
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

    const history: any[] = [];
    const result = await callWithAgenticRetry(
      provider,
      makeRequest() as any,
      history,
      {
        requiredToolName: toolName,
        maxRetries: 1,
      },
    );

    expect(result.retries).toBe(1);
    expect(history).toHaveLength(2);
    const feedbackText =
      history[1]?.content?.find((part: any) => part.type === "text")?.text ??
      "";
    expect(feedbackText).toContain("[ERROR: PROVIDER_CALL_FAILED]");
    expect(feedbackText).toContain("Validate the tool payload");
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
    expect(thrown?.message).toContain("current/refs/tools/test_tool/README.md");
    expect(thrown?.message).not.toContain("<tool_info>");
    expect(thrown?.message).toContain("already provided earlier");
  });
});
