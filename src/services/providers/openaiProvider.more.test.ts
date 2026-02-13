import { beforeEach, describe, expect, it, vi } from "vitest";

const sdkMocks = vi.hoisted(() => ({
  chatCreate: vi.fn(),
  modelsList: vi.fn(),
  imagesGenerate: vi.fn(),
  audioSpeechCreate: vi.fn(),
  embeddingsCreate: vi.fn(),
}));

vi.mock("openai", () => {
  class OpenAI {
    chat = { completions: { create: sdkMocks.chatCreate } };
    models = { list: sdkMocks.modelsList };
    images = { generate: sdkMocks.imagesGenerate };
    audio = { speech: { create: sdkMocks.audioSpeechCreate } };
    embeddings = { create: sdkMocks.embeddingsCreate };

    constructor(_opts: any) {}
  }

  return { default: OpenAI };
});

import {
  generateEmbedding,
  generateImage,
  generateSpeech,
  generateVideo,
  getEmbeddingModels,
  getModels,
  parseOpenAIUsage,
} from "./openaiProvider";

describe("openaiProvider additional branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses usage with direct cache preference and string totals", () => {
    expect(
      parseOpenAIUsage({
        prompt_tokens: "12",
        completion_tokens: "8",
        total_tokens: "20",
        cache_read_tokens: 3,
        prompt_tokens_details: { cached_tokens: 99 },
      }),
    ).toEqual({
      promptTokens: 12,
      completionTokens: 8,
      totalTokens: 20,
      cacheRead: 3,
      reported: true,
    });

    expect(parseOpenAIUsage({ total_tokens: "9" })).toEqual({
      promptTokens: 9,
      completionTokens: 0,
      totalTokens: 9,
      reported: true,
    });
  });

  it("maps capabilities from model IDs and falls back on errors", async () => {
    sdkMocks.modelsList.mockResolvedValueOnce({
      data: [
        { id: "dall-e-3" },
        { id: "whisper-audio-1" },
        { id: "runway-video-v1" },
        { id: "gpt-4o-mini" },
        { id: "o1-preview" },
      ],
    });

    const models = await getModels({ apiKey: "k" } as any);

    const byId = Object.fromEntries(models.map((m) => [m.id, m]));
    expect(byId["dall-e-3"].capabilities.image).toBe(true);
    expect(byId["whisper-audio-1"].capabilities.audio).toBe(true);
    expect(byId["runway-video-v1"].capabilities.video).toBe(true);
    expect(byId["gpt-4o-mini"].capabilities.tools).toBe(true);
    expect(byId["o1-preview"].capabilities.parallelTools).toBe(false);

    sdkMocks.modelsList.mockRejectedValueOnce(new Error("model down"));
    await expect(getModels({ apiKey: "k" } as any)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "gpt-4o" }),
        expect.objectContaining({ id: "gpt-4-turbo" }),
      ]),
    );
  });

  it("generates images from compatibility markdown and url formats", async () => {
    sdkMocks.chatCreate.mockResolvedValueOnce({
      choices: [{ message: { content: "![result](https://img.test/a.png)" } }],
      usage: { prompt_tokens: 2, completion_tokens: 1, total_tokens: 3 },
    });

    const markdownResult = await generateImage(
      { apiKey: "k", compatibleImageGeneration: true } as any,
      "gemini-3-pro-image",
      "harbor",
    );
    expect(markdownResult.url).toBe("https://img.test/a.png");
    expect(markdownResult.usage?.totalTokens).toBe(3);

    sdkMocks.chatCreate.mockResolvedValueOnce({
      choices: [
        { message: { content: "use this https://img.test/b.png now" } },
      ],
      usage: { prompt_tokens: 1, total_tokens: 1 },
    });

    const urlResult = await generateImage(
      { apiKey: "k", compatibleImageGeneration: true } as any,
      "gemini-3-pro-image",
      "forest",
    );
    expect(urlResult.url).toBe("https://img.test/b.png");
  });

  it("falls back from compatibility chat to image endpoint", async () => {
    sdkMocks.chatCreate.mockResolvedValueOnce({
      choices: [{ message: { content: "no image here" } }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    });
    sdkMocks.imagesGenerate.mockResolvedValueOnce({
      data: [{ b64_json: "QUJD" }],
    });

    const result = await generateImage(
      { apiKey: "k", compatibleImageGeneration: true } as any,
      "dall-e-3",
      "castle",
      "768x1344",
    );

    expect(result.url).toBe("data:image/png;base64,QUJD");
    expect(sdkMocks.imagesGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "dall-e-3",
        size: "1024x1792",
      }),
    );
  });

  it("maps wide resolution for dall-e-3", async () => {
    sdkMocks.imagesGenerate.mockResolvedValueOnce({
      data: [{ b64_json: "R0lG" }],
    });

    await generateImage(
      { apiKey: "k", compatibleImageGeneration: false } as any,
      "dall-e-3",
      "city",
      "1344x768",
    );

    expect(sdkMocks.imagesGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ size: "1792x1024" }),
    );
  });

  it("generates speech with custom format and speed", async () => {
    const audioBuffer = new Uint8Array([1, 2, 3]).buffer;
    sdkMocks.audioSpeechCreate.mockResolvedValueOnce({
      arrayBuffer: async () => audioBuffer,
    });

    const result = await generateSpeech(
      { apiKey: "k" } as any,
      "tts-1",
      "hello world",
      "nova",
      { format: "wav", speed: 1.25 } as any,
    );

    expect(sdkMocks.audioSpeechCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "tts-1",
        input: "hello world",
        voice: "nova",
        response_format: "wav",
        speed: 1.25,
      }),
    );
    expect(result.audio).toBe(audioBuffer);
  });

  it("returns embedding models from listing and falls back", async () => {
    sdkMocks.modelsList.mockResolvedValueOnce({
      data: [
        { id: "text-embedding-3-small" },
        { id: "text-embedding-3-large" },
        { id: "gpt-4o-mini" },
      ],
    });

    const listed = await getEmbeddingModels({ apiKey: "k" } as any);
    expect(listed).toEqual([
      {
        id: "text-embedding-3-small",
        name: "text-embedding-3-small",
        dimensions: 1536,
        contextLength: 8192,
      },
      {
        id: "text-embedding-3-large",
        name: "text-embedding-3-large",
        dimensions: 3072,
        contextLength: 8192,
      },
    ]);

    sdkMocks.modelsList.mockRejectedValueOnce(new Error("embedding down"));
    await expect(getEmbeddingModels({ apiKey: "k" } as any)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "text-embedding-3-small" }),
        expect.objectContaining({ id: "text-embedding-ada-002" }),
      ]),
    );
  });

  it("sorts embedding vectors by index and preserves prompt usage", async () => {
    sdkMocks.embeddingsCreate.mockResolvedValueOnce({
      data: [
        { index: 1, embedding: [0.2, 0.3] },
        { index: 0, embedding: [0.1] },
      ],
      usage: {
        prompt_tokens: 7,
        total_tokens: 7,
      },
    });

    const result = await generateEmbedding(
      { apiKey: "k" } as any,
      "text-embedding-3-small",
      ["alpha", "beta"],
      256,
    );

    expect(Array.from(result.embeddings[0])[0]).toBeCloseTo(0.1, 6);
    expect(Array.from(result.embeddings[1])[0]).toBeCloseTo(0.2, 6);
    expect(Array.from(result.embeddings[1])[1]).toBeCloseTo(0.3, 6);
    expect(result.usage).toEqual({ promptTokens: 7, totalTokens: 7 });
    expect(sdkMocks.embeddingsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ dimensions: 256 }),
    );
  });

  it("rejects unsupported video generation", async () => {
    await expect(
      generateVideo({ apiKey: "k" } as any, "any", "", ""),
    ).rejects.toThrow("Video generation is not supported");
  });
});
