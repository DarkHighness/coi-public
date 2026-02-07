import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { OpenAIConfig } from "./types";

let lastCreateParams: any = null;

async function* fakeChatCompletionStream() {
  yield {
    choices: [{ delta: { content: "hi" } }],
  };
  yield {
    choices: [{ delta: {} }],
    usage: {
      prompt_tokens: 3,
      completion_tokens: 2,
      total_tokens: 5,
      prompt_tokens_details: { cached_tokens: 1 },
    },
  };
}

vi.mock("openai", () => {
  class OpenAI {
    chat = {
      completions: {
        create: vi.fn(async (params: any) => {
          lastCreateParams = params;
          if (params?.stream) return fakeChatCompletionStream();
          return {
            choices: [{ message: { content: "ok" }, finish_reason: "stop" }],
            usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
          };
        }),
      },
    };

    models = {
      list: vi.fn(async () => ({ data: [] })),
    };

    constructor(_opts: any) {}
  }

  return { default: OpenAI };
});

describe("openaiProvider streaming usage", () => {
  beforeEach(() => {
    lastCreateParams = null;
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requests include_usage and propagates streamed usage", async () => {
    const { generateContent } = await import("./openaiProvider");

    const onChunk = vi.fn();
    const res = await generateContent(
      { apiKey: "test", baseUrl: "https://api.openai.com/v1" } as any,
      "gpt-4o-mini",
      "",
      [
        {
          role: "user",
          content: [{ type: "text", text: "Hello" }],
        },
      ] as any,
      undefined,
      { onChunk } as any,
    );

    expect(onChunk).toHaveBeenCalledWith("hi");
    expect(lastCreateParams?.stream).toBe(true);
    expect(lastCreateParams?.stream_options).toEqual({ include_usage: true });
    expect(res.usage).toMatchObject({
      promptTokens: 3,
      completionTokens: 2,
      totalTokens: 5,
      cacheRead: 1,
    });
  });

  it("applies gemini message format conversion when enabled", async () => {
    const { generateContent } = await import("./openaiProvider");

    const config: OpenAIConfig = {
      apiKey: "test",
      baseUrl: "https://api.openai.com/v1",
      geminiCompatibility: true,
      geminiMessageFormat: true,
    };

    await generateContent(
      config,
      "gemini-2.5-pro",
      "sys",
      [
        {
          role: "assistant",
          content: [
            {
              type: "tool_use",
              toolUse: {
                id: "call_1",
                name: "vfs_read",
                args: { path: "a" },
              },
            },
          ],
        },
        {
          role: "tool",
          content: [
            {
              type: "tool_result",
              toolResult: {
                id: "call_1",
                name: "vfs_read",
                content: { ok: true },
              },
            },
          ],
        },
      ] as any,
      undefined,
      undefined,
    );

    expect(lastCreateParams?.messages).toEqual([
      { role: "system", content: "sys" },
      {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_1",
            type: "function",
            function: {
              name: "vfs_read",
              arguments: JSON.stringify({ path: "a" }),
            },
          },
        ],
      },
      {
        role: "user",
        content: JSON.stringify({
          type: "function_response",
          name: "vfs_read",
          response: { content: { ok: true } },
        }),
      },
    ]);
  });

  it("applies claude message format conversion when enabled", async () => {
    const { generateContent } = await import("./openaiProvider");

    const config: OpenAIConfig = {
      apiKey: "test",
      baseUrl: "https://api.openai.com/v1",
      claudeCompatibility: true,
      claudeMessageFormat: true,
    };

    await generateContent(
      config,
      "claude-3-5-sonnet",
      "sys",
      [
        {
          role: "assistant",
          content: [
            {
              type: "tool_use",
              toolUse: {
                id: "call_2",
                name: "vfs_ls",
                args: { path: "current" },
              },
            },
          ],
        },
        {
          role: "tool",
          content: [
            {
              type: "tool_result",
              toolResult: {
                id: "call_2",
                name: "vfs_ls",
                content: "ok",
              },
            },
          ],
        },
      ] as any,
      undefined,
      undefined,
    );

    expect(lastCreateParams?.messages).toEqual([
      { role: "system", content: "sys" },
      {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_2",
            type: "function",
            function: {
              name: "vfs_ls",
              arguments: JSON.stringify({ path: "current" }),
            },
          },
        ],
      },
      {
        role: "user",
        content: JSON.stringify([
          {
            type: "tool_result",
            tool_use_id: "call_2",
            content: "ok",
          },
        ]),
      },
    ]);
  });
});
