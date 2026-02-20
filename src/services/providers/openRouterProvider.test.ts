import { beforeEach, describe, expect, it, vi } from "vitest";

const sdkMocks = vi.hoisted(() => ({
  modelsList: vi.fn(),
  creditsGet: vi.fn(),
  embeddingsListModels: vi.fn(),
  chatSend: vi.fn(),
}));

const generateOpenAISpeechMock = vi.hoisted(() => vi.fn());

vi.mock("@openrouter/sdk", () => {
  class OpenRouter {
    models = { list: sdkMocks.modelsList };
    credits = { getCredits: sdkMocks.creditsGet };
    embeddings = { listModels: sdkMocks.embeddingsListModels };
    chat = { send: sdkMocks.chatSend };

    constructor(_opts: any) {}
  }

  return { OpenRouter };
});

vi.mock("@openrouter/sdk/models", () => ({}));

vi.mock("./openaiProvider", () => ({
  generateSpeech: generateOpenAISpeechMock,
}));

import {
  generateContent,
  generateEmbedding,
  generateImage,
  generateSpeech,
  generateVideo,
  getCredits,
  getEmbeddingModels,
  getModels,
  parseOpenRouterUsage,
  validateConnection,
} from "./openRouterProvider";

describe("openRouterProvider usage parsing", () => {
  it("reads nested cached tokens when direct cache key is missing", () => {
    const usage = parseOpenRouterUsage({
      prompt_tokens: 40,
      completion_tokens: 10,
      total_tokens: 50,
      prompt_tokens_details: {
        cached_tokens: 7,
      },
    });

    expect(usage).toEqual({
      promptTokens: 40,
      completionTokens: 10,
      totalTokens: 50,
      cacheRead: 7,
      reported: true,
    });
  });

  it("prefers direct cache read when both direct and nested are present", () => {
    const usage = parseOpenRouterUsage({
      promptTokens: 21,
      completionTokens: 9,
      totalTokens: 30,
      cacheReadInputTokens: 5,
      promptTokensDetails: { cachedTokens: 99 },
    });

    expect(usage.cacheRead).toBe(5);
    expect(usage.totalTokens).toBe(30);
    expect(usage.reported).toBe(true);
  });

  it("derives completion and total when fields are partially present", () => {
    const derivedCompletion = parseOpenRouterUsage({
      promptTokens: 70,
      totalTokens: 81,
    });

    expect(derivedCompletion).toMatchObject({
      promptTokens: 70,
      completionTokens: 11,
      totalTokens: 81,
      reported: true,
    });

    const derivedTotal = parseOpenRouterUsage({
      promptTokens: 10,
      completionTokens: 8,
    });

    expect(derivedTotal).toMatchObject({
      promptTokens: 10,
      completionTokens: 8,
      totalTokens: 18,
      reported: true,
    });
  });

  it("returns reported=false when payload has no known usage keys", () => {
    const usage = parseOpenRouterUsage({ foo: "bar" });

    expect(usage).toEqual({
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      reported: false,
    });
  });

  it("normalizes numeric strings and clamps invalid cache write values", () => {
    const usage = parseOpenRouterUsage({
      prompt_tokens: "12",
      completion_tokens: " 7 ",
      cache_creation_input_tokens: -3,
    });

    expect(usage).toEqual({
      promptTokens: 12,
      completionTokens: 7,
      totalTokens: 19,
      cacheWrite: 0,
      reported: true,
    });
  });

  it("marks non-object usage payload as unreported", () => {
    expect(parseOpenRouterUsage("n/a")).toEqual({
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      reported: false,
    });
  });

  it("fills prompt from total when only total is available", () => {
    const usage = parseOpenRouterUsage({ total_tokens: 44 });

    expect(usage).toEqual({
      promptTokens: 44,
      completionTokens: 0,
      totalTokens: 44,
      reported: true,
    });
  });
});

describe("openRouterProvider dynamic output budget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("omits maxTokens by default", async () => {
    sdkMocks.chatSend.mockResolvedValueOnce({
      choices: [
        {
          finish_reason: "stop",
          native_finish_reason: "stop",
          message: { content: "ok" },
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 2,
        total_tokens: 12,
      },
    });

    await generateContent(
      { apiKey: "k" } as any,
      "unknown/vendor-model",
      "sys",
      [{ role: "user", content: [{ type: "text", text: "phase1" }] }] as any,
      undefined,
      {
        tokenBudget: {
          contextWindowTokens: 204800,
          promptTokenEstimate: 82000,
        },
      } as any,
    );

    const requestParams = sdkMocks.chatSend.mock.calls[0]?.[0] as {
      maxTokens?: number;
    };
    expect(requestParams?.maxTokens).toBeUndefined();
  });

  it("caps maxTokens when provider-managed mode is disabled", async () => {
    sdkMocks.chatSend.mockResolvedValueOnce({
      choices: [
        {
          finish_reason: "stop",
          native_finish_reason: "stop",
          message: { content: "ok" },
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 2,
        total_tokens: 12,
      },
    });

    await generateContent(
      { apiKey: "k" } as any,
      "unknown/vendor-model",
      "sys",
      [{ role: "user", content: [{ type: "text", text: "phase1" }] }] as any,
      undefined,
      {
        tokenBudget: {
          providerManagedMaxTokens: false,
          contextWindowTokens: 204800,
          promptTokenEstimate: 82000,
        },
      } as any,
    );

    const requestParams = sdkMocks.chatSend.mock.calls[0]?.[0] as {
      maxTokens?: number;
    };
    expect(requestParams?.maxTokens).toBe(120752);
  });

  it("retries once with clamped maxTokens after explicit context overflow error", async () => {
    const sentMaxTokens: number[] = [];
    let sendAttempt = 0;
    sdkMocks.chatSend.mockImplementation(async (params: any) => {
      sentMaxTokens.push(params?.maxTokens);
      sendAttempt += 1;
      if (sendAttempt === 1) {
        throw new Error(
          "This endpoint's maximum context length is 204800 tokens. However, you requested about 209555 tokens (79688 of text input, 1867 of tool input, 128000 in the output). Please reduce the length of either one.",
        );
      }
      return {
        choices: [
          {
            finish_reason: "stop",
            native_finish_reason: "stop",
            message: { content: "ok" },
          },
        ],
        usage: {
          prompt_tokens: 20,
          completion_tokens: 5,
          total_tokens: 25,
        },
      };
    });

    await generateContent(
      { apiKey: "k" } as any,
      "unknown/vendor-model",
      "sys",
      [{ role: "user", content: [{ type: "text", text: "phase1" }] }] as any,
      undefined,
      {
        tokenBudget: {
          providerManagedMaxTokens: false,
          maxOutputTokensFallback: 128000,
          contextWindowTokens: 1_000_000,
          promptTokenEstimate: 1,
        },
      } as any,
    );

    expect(sdkMocks.chatSend).toHaveBeenCalledTimes(2);
    expect(sentMaxTokens[0]).toBe(128000);
    expect(sentMaxTokens[1]).toBe(122733);
  });
});

describe("openRouterProvider exports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("validates connection via models list", async () => {
    sdkMocks.modelsList.mockResolvedValueOnce({ data: [] });

    await expect(
      validateConnection({ apiKey: "k" } as any),
    ).resolves.toBeUndefined();
    expect(sdkMocks.modelsList).toHaveBeenCalledTimes(1);
  });

  it("wraps validate connection errors", async () => {
    sdkMocks.modelsList.mockRejectedValueOnce(new Error("auth failed"));

    await expect(validateConnection({ apiKey: "k" } as any)).rejects.toThrow(
      "Failed to connect to OpenRouter API: auth failed",
    );
  });

  it("reads credits from nested data payload", async () => {
    sdkMocks.creditsGet.mockResolvedValueOnce({
      data: { totalCredits: 100, usedCredits: 40 },
    });

    await expect(getCredits({ apiKey: "k" } as any)).resolves.toEqual({
      totalCredits: 100,
      usedCredits: 40,
      remainingCredits: 60,
    });
  });

  it("reads credits from top-level payload and wraps errors", async () => {
    sdkMocks.creditsGet.mockResolvedValueOnce({
      totalCredits: 20,
      usedCredits: 5,
    });

    await expect(getCredits({ apiKey: "k" } as any)).resolves.toEqual({
      totalCredits: 20,
      usedCredits: 5,
      remainingCredits: 15,
    });

    sdkMocks.creditsGet.mockRejectedValueOnce(new Error("credits down"));
    await expect(getCredits({ apiKey: "k" } as any)).rejects.toThrow(
      "Failed to fetch OpenRouter credits: credits down",
    );
  });

  it("maps listed models and returns [] on sdk failures", async () => {
    sdkMocks.modelsList.mockResolvedValueOnce({
      data: [
        {
          id: "openai/gpt-4-vision-preview",
          name: "GPT-4 Vision",
          context_length: 128000,
        },
      ],
    });

    const models = await getModels({ apiKey: "k" } as any);
    expect(models).toHaveLength(1);
    expect(models[0].id).toBe("openai/gpt-4-vision-preview");
    expect(models[0].contextLength).toBe(128000);
    expect(models[0].capabilities.image).toBe(true);

    sdkMocks.modelsList.mockRejectedValueOnce(new Error("model list down"));
    await expect(getModels({ apiKey: "k" } as any)).resolves.toEqual([]);
  });

  it("generates images via legacy fetch endpoint", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [
          { message: { images: [{ image_url: { url: "https://img.test" } }] } },
        ],
      }),
    }));
    vi.stubGlobal("fetch", fetchMock as any);

    const result = await generateImage(
      { apiKey: "k" } as any,
      "openai/dall-e-3",
      "harbor at dusk",
      "768x1344",
    );

    expect(result.url).toBe("https://img.test");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("throws api error when image endpoint returns non-2xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: "quota exceeded" } }),
      })) as any,
    );

    await expect(
      generateImage({ apiKey: "k" } as any, "openai/dall-e-3", "p"),
    ).rejects.toThrow("quota exceeded");
  });

  it("delegates speech generation to openai provider with openrouter baseUrl", async () => {
    generateOpenAISpeechMock.mockResolvedValueOnce({
      audio: new ArrayBuffer(0),
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      raw: {},
    });

    await generateSpeech(
      { apiKey: "router-key" } as any,
      "openai/gpt-4o-mini-tts",
      "hello",
      "alloy",
      { instructions: "calm" } as any,
    );

    expect(generateOpenAISpeechMock).toHaveBeenCalledWith(
      {
        apiKey: "router-key",
        baseUrl: "https://openrouter.ai/api/v1",
      },
      "openai/gpt-4o-mini-tts",
      "hello",
      "alloy",
      { instructions: "calm" },
    );
  });

  it("rejects unsupported video generation", async () => {
    await expect(
      generateVideo({ apiKey: "k" } as any, "model", "base64", "prompt"),
    ).rejects.toThrow(
      "Video generation is not supported by OpenRouter provider",
    );
  });

  it("loads embedding models via sdk and filters non-embedding items", async () => {
    sdkMocks.embeddingsListModels.mockResolvedValueOnce({
      data: [
        {
          id: "openai/text-embedding-3-small",
          name: "OpenAI Small",
          output_modalities: ["embeddings"],
          context_length: 8192,
        },
        {
          id: "openai/gpt-4o",
          name: "GPT-4o",
          output_modalities: ["text"],
        },
      ],
    });

    const models = await getEmbeddingModels({ apiKey: "k" } as any);

    expect(models).toEqual([
      {
        id: "openai/text-embedding-3-small",
        name: "OpenAI Small",
        dimensions: 1536,
        contextLength: 8192,
      },
    ]);
  });

  it("falls back to local embedding json when sdk fails", async () => {
    sdkMocks.embeddingsListModels.mockRejectedValueOnce(new Error("cors"));

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          data: [
            {
              id: "cohere/embed-english-v3",
              name: "Cohere English",
              context_length: 4096,
            },
          ],
        }),
      })) as any,
    );

    const models = await getEmbeddingModels({ apiKey: "k" } as any);
    expect(models).toEqual([
      {
        id: "cohere/embed-english-v3",
        name: "Cohere English",
        dimensions: 1024,
        contextLength: 4096,
      },
    ]);
  });

  it("returns default embeddings list when sdk and fallback fail", async () => {
    sdkMocks.embeddingsListModels.mockRejectedValueOnce(new Error("cors"));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
        json: async () => ({}),
      })) as any,
    );

    const models = await getEmbeddingModels({ apiKey: "k" } as any);
    expect(models.map((m) => m.id)).toEqual([
      "openai/text-embedding-3-small",
      "openai/text-embedding-3-large",
    ]);
  });

  it("generates embeddings through fetch endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          data: [
            { index: 1, embedding: [0.2, 0.3] },
            { index: 0, embedding: [0.1] },
          ],
          usage: { prompt_tokens: 7, total_tokens: 7 },
        }),
      })) as any,
    );

    const result = await generateEmbedding(
      { apiKey: "k" } as any,
      "openai/text-embedding-3-small",
      ["alpha", "beta"],
    );

    expect(result.usage).toEqual({ promptTokens: 7, totalTokens: 7 });
    const first = Array.from(result.embeddings[0]);
    const second = Array.from(result.embeddings[1]);
    expect(first).toHaveLength(1);
    expect(first[0]).toBeCloseTo(0.1, 6);
    expect(second).toHaveLength(2);
    expect(second[0]).toBeCloseTo(0.2, 6);
    expect(second[1]).toBeCloseTo(0.3, 6);
  });

  it("wraps embedding endpoint failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 400,
        text: async () => "bad-request",
      })) as any,
    );

    await expect(
      generateEmbedding(
        { apiKey: "k" } as any,
        "openai/text-embedding-3-small",
        ["alpha"],
      ),
    ).rejects.toThrow("OpenRouter embedding failed: HTTP 400: bad-request");
  });
});

describe("openRouterProvider tool-call handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns functionCalls for non-streaming snake_case tool_calls responses", async () => {
    sdkMocks.chatSend.mockResolvedValueOnce({
      choices: [
        {
          finish_reason: "tool_calls",
          native_finish_reason: "tool_calls",
          message: {
            content: "",
            tool_calls: [
              {
                id: "call_1",
                function: {
                  name: "vfs_finish_outline_master_plan",
                  arguments: JSON.stringify({
                    storyPlanMarkdown: "# test plan",
                  }),
                },
              },
            ],
          },
        },
      ],
      usage: {
        prompt_tokens: 11,
        completion_tokens: 7,
        total_tokens: 18,
      },
    });

    const res = await generateContent(
      { apiKey: "k" } as any,
      "z-ai/glm-5",
      "sys",
      [{ role: "user", content: [{ type: "text", text: "phase1" }] }] as any,
    );

    const result = res.result as { functionCalls?: Array<any> };
    expect(result.functionCalls).toHaveLength(1);
    expect(result.functionCalls?.[0]).toMatchObject({
      id: "call_1",
      name: "vfs_finish_outline_master_plan",
      args: { storyPlanMarkdown: "# test plan" },
    });
  });

  it("parses streaming legacy tool call chunks with root-level name/arguments", async () => {
    async function* streamChunks() {
      yield {
        choices: [
          {
            delta: {
              tool_calls: [
                {
                  index: 0,
                  id: "call_legacy",
                  name: "vfs_read_lines",
                  arguments: JSON.stringify({
                    path: "current/world/global.json",
                    startLine: 1,
                    endLine: 3,
                  }),
                },
              ],
            },
          },
        ],
      };
      yield {
        choices: [
          {
            delta: {},
            finish_reason: "tool_calls",
            native_finish_reason: "tool_calls",
          },
        ],
        usage: {
          prompt_tokens: 9,
          completion_tokens: 4,
          total_tokens: 13,
        },
      };
    }

    sdkMocks.chatSend.mockResolvedValueOnce(streamChunks());

    const onChunk = vi.fn();
    const res = await generateContent(
      { apiKey: "k" } as any,
      "z-ai/glm-5",
      "sys",
      [{ role: "user", content: [{ type: "text", text: "phase1" }] }] as any,
      undefined,
      { onChunk } as any,
    );

    const result = res.result as { functionCalls?: Array<any> };
    expect(result.functionCalls).toHaveLength(1);
    expect(result.functionCalls?.[0]).toMatchObject({
      id: "call_legacy",
      name: "vfs_read_lines",
      args: {
        path: "current/world/global.json",
        startLine: 1,
        endLine: 3,
      },
    });
    expect(onChunk).not.toHaveBeenCalled();
  });

  it("throws when non-streaming response finishes with tool_calls but has no valid tool payload", async () => {
    sdkMocks.chatSend.mockResolvedValueOnce({
      choices: [
        {
          finish_reason: "tool_calls",
          native_finish_reason: "tool_calls",
          message: {
            content: "",
            tool_calls: [
              {
                type: "url_citation",
                url_citation: { url: "https://example.com" },
              },
            ],
          },
        },
      ],
      usage: {
        prompt_tokens: 3,
        completion_tokens: 1,
        total_tokens: 4,
      },
    });

    await expect(
      generateContent({ apiKey: "k" } as any, "z-ai/glm-5", "sys", [
        { role: "user", content: [{ type: "text", text: "phase1" }] },
      ] as any),
    ).rejects.toMatchObject({ code: "MALFORMED_TOOL_CALL" });
  });

  it("throws when streaming response finishes with tool_calls but has no valid tool payload", async () => {
    async function* streamChunks() {
      yield {
        choices: [
          {
            delta: {},
            finish_reason: "tool_calls",
            native_finish_reason: "tool_calls",
          },
        ],
        usage: {
          prompt_tokens: 4,
          completion_tokens: 2,
          total_tokens: 6,
        },
      };
    }

    sdkMocks.chatSend.mockResolvedValueOnce(streamChunks());

    await expect(
      generateContent(
        { apiKey: "k" } as any,
        "z-ai/glm-5",
        "sys",
        [{ role: "user", content: [{ type: "text", text: "phase1" }] }] as any,
        undefined,
        { onChunk: vi.fn() } as any,
      ),
    ).rejects.toMatchObject({ code: "MALFORMED_TOOL_CALL" });
  });
});
