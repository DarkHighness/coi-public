import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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
});
