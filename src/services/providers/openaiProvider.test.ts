import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { OpenAIConfig } from "./types";

const sdkMocks = vi.hoisted(() => ({
  chatCreate: vi.fn(),
  responsesCreate: vi.fn(),
  modelsList: vi.fn(),
}));

let lastChatCreateParams: any = null;
let lastResponsesCreateParams: any = null;

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

async function* fakeResponsesStream() {
  yield {
    type: "response.output_text.delta",
    delta: "hi",
  };
  yield {
    type: "response.completed",
    response: {
      output: [
        {
          type: "message",
          content: [{ type: "output_text", text: "hi" }],
        },
      ],
      usage: {
        input_tokens: 3,
        output_tokens: 2,
        total_tokens: 5,
        input_tokens_details: { cached_tokens: 1 },
      },
    },
  };
}

vi.mock("openai", () => {
  class OpenAI {
    chat = {
      completions: {
        create: vi.fn(async (params: any) => {
          lastChatCreateParams = params;
          return sdkMocks.chatCreate(params);
        }),
      },
    };

    responses = {
      create: vi.fn(async (params: any) => {
        lastResponsesCreateParams = params;
        return sdkMocks.responsesCreate(params);
      }),
    };

    models = {
      list: vi.fn(async () => sdkMocks.modelsList()),
    };

    constructor(_opts: any) {}
  }

  return { default: OpenAI };
});

const setDefaultOpenAIMockImplementations = () => {
  sdkMocks.chatCreate.mockImplementation(async (params: any) => {
    if (params?.stream) return fakeChatCompletionStream();
    return {
      choices: [{ message: { content: "ok" }, finish_reason: "stop" }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    };
  });
  sdkMocks.responsesCreate.mockImplementation(async (params: any) => {
    if (params?.stream) return fakeResponsesStream();
    return {
      output: [
        {
          type: "message",
          content: [{ type: "output_text", text: "ok" }],
        },
      ],
      usage: {
        input_tokens: 1,
        output_tokens: 1,
        total_tokens: 2,
      },
    };
  });
  sdkMocks.modelsList.mockResolvedValue({ data: [] });
};

describe("openaiProvider streaming usage", () => {
  beforeEach(() => {
    lastChatCreateParams = null;
    lastResponsesCreateParams = null;
    setDefaultOpenAIMockImplementations();
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
      {
        apiKey: "test",
        baseUrl: "https://api.openai.com/v1",
        apiMode: "chat",
      } as any,
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
    expect(lastChatCreateParams?.stream).toBe(true);
    expect(lastChatCreateParams?.stream_options).toEqual({
      include_usage: true,
    });
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
      apiMode: "chat",
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
                name: "vfs_read_chars",
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
                name: "vfs_read_chars",
                content: { ok: true },
              },
            },
          ],
        },
      ] as any,
      undefined,
      undefined,
    );

    expect(lastChatCreateParams?.messages).toEqual([
      { role: "system", content: "sys" },
      {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_1",
            type: "function",
            function: {
              name: "vfs_read_chars",
              arguments: JSON.stringify({ path: "a" }),
            },
          },
        ],
      },
      {
        role: "user",
        content: JSON.stringify({
          type: "function_response",
          name: "vfs_read_chars",
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
      apiMode: "chat",
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

    expect(lastChatCreateParams?.messages).toEqual([
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

describe("openaiProvider response mode", () => {
  beforeEach(() => {
    lastChatCreateParams = null;
    lastResponsesCreateParams = null;
    setDefaultOpenAIMockImplementations();
  });

  it("uses responses API by default", async () => {
    const { generateContent } = await import("./openaiProvider");

    await generateContent(
      { apiKey: "test", baseUrl: "https://api.openai.com/v1" } as any,
      "gpt-4o-mini",
      "",
      [{ role: "user", content: [{ type: "text", text: "Hello" }] }] as any,
    );

    expect(lastResponsesCreateParams?.model).toBe("gpt-4o-mini");
    expect(lastChatCreateParams).toBeNull();
  });

  it("uses chat API when apiMode=chat", async () => {
    const { generateContent } = await import("./openaiProvider");

    await generateContent(
      {
        apiKey: "test",
        baseUrl: "https://api.openai.com/v1",
        apiMode: "chat",
      } as any,
      "gpt-4o-mini",
      "",
      [{ role: "user", content: [{ type: "text", text: "Hello" }] }] as any,
    );

    expect(lastChatCreateParams?.model).toBe("gpt-4o-mini");
    expect(lastResponsesCreateParams).toBeNull();
  });

  it("streams text deltas via responses API", async () => {
    const { generateContent } = await import("./openaiProvider");
    const onChunk = vi.fn();

    const res = await generateContent(
      { apiKey: "test", baseUrl: "https://api.openai.com/v1" } as any,
      "gpt-4o-mini",
      "",
      [{ role: "user", content: [{ type: "text", text: "Hello" }] }] as any,
      undefined,
      { onChunk } as any,
    );

    expect(lastResponsesCreateParams?.stream).toBe(true);
    expect(onChunk).toHaveBeenCalledWith("hi");
    expect(res.usage).toMatchObject({
      promptTokens: 3,
      completionTokens: 2,
      totalTokens: 5,
      cacheRead: 1,
    });
  });

  it("parses function calls from responses API output", async () => {
    const { generateContent } = await import("./openaiProvider");
    sdkMocks.responsesCreate.mockResolvedValueOnce({
      output: [
        {
          type: "function_call",
          call_id: "call_1",
          name: "vfs_read_chars",
          arguments: JSON.stringify({ path: "a" }),
        },
      ],
      usage: {
        input_tokens: 2,
        output_tokens: 1,
        total_tokens: 3,
      },
    });

    const res = await generateContent(
      { apiKey: "test", baseUrl: "https://api.openai.com/v1" } as any,
      "gpt-4o-mini",
      "",
      [{ role: "user", content: [{ type: "text", text: "Hello" }] }] as any,
    );

    const result = res.result as { functionCalls?: Array<any> };
    expect(result.functionCalls).toHaveLength(1);
    expect(result.functionCalls?.[0]).toMatchObject({
      id: "call_1",
      name: "vfs_read_chars",
      args: { path: "a" },
    });
  });
});

describe("openaiProvider helper conversions", () => {
  beforeEach(() => {
    lastChatCreateParams = null;
    lastResponsesCreateParams = null;
    setDefaultOpenAIMockImplementations();
  });

  it("parses nested cache usage and derives completion from totals", async () => {
    const { parseOpenAIUsage } = await import("./openaiProvider");

    expect(
      parseOpenAIUsage({
        prompt_tokens: 20,
        total_tokens: 31,
        prompt_tokens_details: { cached_tokens: 4 },
      }),
    ).toEqual({
      promptTokens: 20,
      completionTokens: 11,
      totalTokens: 31,
      cacheRead: 4,
      reported: true,
    });
  });

  it("returns unreported usage when payload has no known keys", async () => {
    const { parseOpenAIUsage } = await import("./openaiProvider");

    expect(parseOpenAIUsage({ foo: "bar" })).toEqual({
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      reported: false,
    });
  });

  it("builds tool call message with thought signature metadata", async () => {
    const { buildToolCallMessage } = await import("./openaiProvider");

    const message = buildToolCallMessage(
      [
        {
          id: "call-1",
          name: "vfs_read_chars",
          args: { path: "current/world/story.json" },
          thoughtSignature: "sig-1",
        },
      ],
      "analysis",
    );

    expect(message).toEqual({
      role: "assistant",
      content: "analysis",
      tool_calls: [
        {
          id: "call-1",
          type: "function",
          function: {
            name: "vfs_read_chars",
            arguments: JSON.stringify({ path: "current/world/story.json" }),
          },
          extra_content: {
            google: {
              thought_signature: "sig-1",
            },
          },
        },
      ],
    });
  });

  it("builds tool response and serializes object payloads", async () => {
    const { buildToolResponseMessage } = await import("./openaiProvider");

    expect(buildToolResponseMessage("call-2", { ok: true })).toEqual({
      role: "tool",
      tool_call_id: "call-2",
      content: JSON.stringify({ ok: true }),
    });
  });

  it("converts user text+image unified message into vision content array", async () => {
    const { fromUnifiedMessage } = await import("./openaiProvider");

    const converted = fromUnifiedMessage({
      role: "user",
      content: [
        { type: "text", text: "Look at this" },
        {
          type: "image",
          mimeType: "image/png",
          data: "QUJD",
        },
      ],
    } as any);

    expect(converted).toEqual({
      role: "user",
      content: [
        { type: "text", text: "Look at this" },
        {
          type: "image_url",
          image_url: { url: "data:image/png;base64,QUJD" },
        },
      ],
    });
  });

  it("converts assistant tool_use message into tool_calls payload", async () => {
    const { fromUnifiedMessage } = await import("./openaiProvider");

    const converted = fromUnifiedMessage({
      role: "assistant",
      content: [
        { type: "text", text: "running tool" },
        {
          type: "tool_use",
          toolUse: {
            id: "call-3",
            name: "vfs_write_file",
            args: { path: "current/world/story.json" },
            thoughtSignature: "sig-3",
          },
        },
      ],
    } as any);

    expect(converted).toEqual({
      role: "assistant",
      content: "running tool",
      tool_calls: [
        {
          id: "call-3",
          type: "function",
          function: {
            name: "vfs_write_file",
            arguments: JSON.stringify({ path: "current/world/story.json" }),
          },
          extra_content: {
            google: {
              thought_signature: "sig-3",
            },
          },
        },
      ],
    });
  });

  it("builds message list with developer role for reasoning models", async () => {
    const { fromUnifiedMessages } = await import("./openaiProvider");

    const converted = fromUnifiedMessages(
      "reasoning-system",
      [
        { role: "system", content: [{ type: "text", text: "skip me" }] },
        { role: "user", content: [{ type: "text", text: "hello" }] },
      ] as any,
      true,
    );

    expect(converted[0]).toEqual({
      role: "developer",
      content: "reasoning-system",
    });
    expect(converted[1]).toEqual({ role: "user", content: "hello" });
  });

  it("omits max token params by default for non-reasoning models", async () => {
    const { generateContent } = await import("./openaiProvider");

    await generateContent(
      {
        apiKey: "test",
        baseUrl: "https://api.openai.com/v1",
        apiMode: "chat",
      } as any,
      "gpt-4o-mini",
      "",
      [
        {
          role: "user",
          content: [{ type: "text", text: "Hello" }],
        },
      ] as any,
      undefined,
      undefined,
    );

    expect(lastChatCreateParams?.max_tokens).toBeUndefined();
    expect(lastChatCreateParams?.max_completion_tokens).toBeUndefined();
  });

  it("omits max token params by default for reasoning models", async () => {
    const { generateContent } = await import("./openaiProvider");

    await generateContent(
      {
        apiKey: "test",
        baseUrl: "https://api.openai.com/v1",
        apiMode: "chat",
      } as any,
      "o3",
      "",
      [
        {
          role: "user",
          content: [{ type: "text", text: "Hello" }],
        },
      ] as any,
      undefined,
      undefined,
    );

    expect(lastChatCreateParams?.max_completion_tokens).toBeUndefined();
    expect(lastChatCreateParams?.max_tokens).toBeUndefined();
  });

  it("caps max_tokens when provider-managed mode is disabled", async () => {
    const { generateContent } = await import("./openaiProvider");

    await generateContent(
      {
        apiKey: "test",
        baseUrl: "https://api.openai.com/v1",
        apiMode: "chat",
      } as any,
      "openai/unknown-model",
      "",
      [
        {
          role: "user",
          content: [{ type: "text", text: "Hello" }],
        },
      ] as any,
      undefined,
      {
        tokenBudget: {
          providerManagedMaxTokens: false,
          contextWindowTokens: 204800,
          promptTokenEstimate: 82000,
        },
      } as any,
    );

    expect(lastChatCreateParams?.max_tokens).toBe(120752);
  });
});
