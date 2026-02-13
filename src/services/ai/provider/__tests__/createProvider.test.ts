import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const mocks = vi.hoisted(() => ({
  createProviderConfig: vi.fn(),

  geminiGenerateContent: vi.fn(),
  geminiGenerateImage: vi.fn(),
  geminiGenerateVideo: vi.fn(),
  geminiGenerateSpeech: vi.fn(),
  geminiGenerateEmbedding: vi.fn(),
  fromUnifiedToGemini: vi.fn(),

  openaiGenerateContent: vi.fn(),
  openaiGenerateImage: vi.fn(),
  openaiGenerateSpeech: vi.fn(),
  openaiGenerateEmbedding: vi.fn(),

  openrouterGenerateContent: vi.fn(),
  openrouterGenerateImage: vi.fn(),
  openrouterGenerateSpeech: vi.fn(),
  openrouterGenerateEmbedding: vi.fn(),

  claudeGenerateContent: vi.fn(),
  claudeGenerateEmbedding: vi.fn(),
}));

vi.mock("../registry", () => ({
  createProviderConfig: mocks.createProviderConfig,
}));

vi.mock("../../../providers/geminiProvider", () => ({
  generateContent: mocks.geminiGenerateContent,
  generateImage: mocks.geminiGenerateImage,
  generateVideo: mocks.geminiGenerateVideo,
  generateSpeech: mocks.geminiGenerateSpeech,
  generateEmbedding: mocks.geminiGenerateEmbedding,
  fromUnifiedMessages: mocks.fromUnifiedToGemini,
}));

vi.mock("../../../providers/openaiProvider", () => ({
  generateContent: mocks.openaiGenerateContent,
  generateImage: mocks.openaiGenerateImage,
  generateSpeech: mocks.openaiGenerateSpeech,
  generateEmbedding: mocks.openaiGenerateEmbedding,
}));

vi.mock("../../../providers/openRouterProvider", () => ({
  generateContent: mocks.openrouterGenerateContent,
  generateImage: mocks.openrouterGenerateImage,
  generateSpeech: mocks.openrouterGenerateSpeech,
  generateEmbedding: mocks.openrouterGenerateEmbedding,
}));

vi.mock("../../../providers/claudeProvider", () => ({
  generateContent: mocks.claudeGenerateContent,
  generateEmbedding: mocks.claudeGenerateEmbedding,
}));

import { createProvider } from "../createProvider";

const usage = {
  promptTokens: 1,
  completionTokens: 2,
  totalTokens: 3,
};

const createInstance = (protocol: string) =>
  ({
    id: `${protocol}-1`,
    name: protocol,
    protocol,
    apiKey: "k",
    enabled: true,
  }) as any;

describe("createProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createProviderConfig.mockReturnValue({
      apiKey: "k",
      baseUrl: "https://api",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("routes gemini chat through unified-message conversion", async () => {
    mocks.fromUnifiedToGemini.mockReturnValue([
      { role: "user", parts: [{ text: "converted" }] },
    ]);
    mocks.geminiGenerateContent.mockResolvedValue({
      result: { text: "ok" },
      usage,
      raw: { raw: 1 },
    });

    const provider = createProvider(createInstance("gemini"));
    const schema = z.object({ foo: z.string() });

    const result = await provider.generateChat({
      modelId: "gemini-pro",
      systemInstruction: "sys",
      messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
      schema,
      toolChoice: "required",
      mediaResolution: "high",
    } as any);

    expect(mocks.fromUnifiedToGemini).toHaveBeenCalledWith([
      { role: "user", content: [{ type: "text", text: "hi" }] },
    ]);
    expect(mocks.geminiGenerateContent).toHaveBeenCalledWith(
      { apiKey: "k", baseUrl: "https://api" },
      "gemini-pro",
      "sys",
      [{ role: "user", parts: [{ text: "converted" }] }],
      schema,
      expect.objectContaining({
        toolChoice: "required",
        mediaResolution: "high",
      }),
    );
    expect(result).toEqual({ result: { text: "ok" }, usage, raw: { raw: 1 } });
  });

  it("routes openai chat and preserves options", async () => {
    mocks.openaiGenerateContent.mockResolvedValue({
      result: { text: "openai" },
      usage,
      raw: { raw: 2 },
    });

    const provider = createProvider(createInstance("openai"));

    await provider.generateChat({
      modelId: "gpt-4o",
      systemInstruction: "sys2",
      messages: [{ role: "user", content: "hello" }],
      tools: [
        { name: "vfs_ls", description: "list", parameters: z.object({}) },
      ],
      toolChoice: "auto",
      temperature: 0.6,
      topP: 0.9,
      topK: 20,
      minP: 0.1,
      thinkingEffort: "medium",
    } as any);

    expect(mocks.openaiGenerateContent).toHaveBeenCalledWith(
      { apiKey: "k", baseUrl: "https://api" },
      "gpt-4o",
      "sys2",
      [{ role: "user", content: "hello" }],
      undefined,
      expect.objectContaining({
        toolChoice: "auto",
        temperature: 0.6,
        topP: 0.9,
        topK: 20,
        minP: 0.1,
        thinkingEffort: "medium",
      }),
    );
  });

  it("fetches image blob when URL is returned and tolerates fetch failure", async () => {
    const blob = new Blob(["img"], { type: "image/png" });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        blob: vi.fn().mockResolvedValue(blob),
      })
      .mockRejectedValueOnce(new Error("network"));
    vi.stubGlobal("fetch", fetchMock as any);

    mocks.openaiGenerateImage
      .mockResolvedValueOnce({
        url: "https://img.test/1.png",
        usage,
        raw: { img: 1 },
      })
      .mockResolvedValueOnce({
        url: "https://img.test/2.png",
        usage,
        raw: { img: 2 },
      });

    const provider = createProvider(createInstance("openai"));

    const first = await provider.generateImage!({
      modelId: "gpt-image-1",
      prompt: "castle",
      resolution: "1024x1024",
    });
    expect(first.url).toBe("https://img.test/1.png");
    expect(first.blob).toBe(blob);

    const second = await provider.generateImage!({
      modelId: "gpt-image-1",
      prompt: "forest",
      resolution: "1024x1024",
    });
    expect(second.url).toBe("https://img.test/2.png");
    expect(second.blob).toBeUndefined();
  });

  it("supports video only for gemini", async () => {
    mocks.geminiGenerateVideo.mockResolvedValue({
      url: "https://video.test/v.mp4",
      usage,
      raw: { v: 1 },
    });

    const geminiProvider = createProvider(createInstance("gemini"));
    const video = await geminiProvider.generateVideo!({
      modelId: "veo",
      prompt: "sunrise",
      resolution: "720p",
    });

    expect(video).toEqual({
      url: "https://video.test/v.mp4",
      usage,
      raw: { v: 1 },
    });

    const openaiProvider = createProvider(createInstance("openai"));
    await expect(
      openaiProvider.generateVideo!({ modelId: "x", prompt: "p" }),
    ).rejects.toThrow("Video generation not supported by protocol: openai");
  });

  it("routes speech defaults by protocol", async () => {
    mocks.openrouterGenerateSpeech.mockResolvedValue({
      audio: new ArrayBuffer(1),
      usage,
      raw: { s: 1 },
    });
    mocks.geminiGenerateSpeech.mockResolvedValue({
      audio: new ArrayBuffer(2),
      usage,
      raw: { s: 2 },
    });

    const openrouterProvider = createProvider(createInstance("openrouter"));
    const geminiProvider = createProvider(createInstance("gemini"));

    await openrouterProvider.generateSpeech!({
      modelId: "or-speech",
      text: "hello",
      speed: 1.1,
      format: "mp3",
      instructions: "cheerful",
    });
    expect(mocks.openrouterGenerateSpeech).toHaveBeenCalledWith(
      { apiKey: "k", baseUrl: "https://api" },
      "or-speech",
      "hello",
      "alloy",
      expect.objectContaining({
        speed: 1.1,
        format: "mp3",
        instructions: "cheerful",
      }),
    );

    await geminiProvider.generateSpeech!({
      modelId: "gem-speech",
      text: "world",
      format: "wav",
    });
    expect(mocks.geminiGenerateSpeech).toHaveBeenCalledWith(
      { apiKey: "k", baseUrl: "https://api" },
      "gem-speech",
      "world",
      "Kore",
      expect.objectContaining({ format: "wav" }),
    );
  });

  it("routes embedding and maps usage shape", async () => {
    const embeddings = [new Float32Array([0.1, 0.2])];
    mocks.claudeGenerateEmbedding.mockResolvedValue({
      embeddings,
      usage: { promptTokens: 7, totalTokens: 7 },
      raw: { emb: 1 },
    });

    const provider = createProvider(createInstance("claude"));

    const result = await provider.generateEmbedding!({
      modelId: "claude-embed",
      texts: ["one", "two"],
      dimensions: 512,
    });

    expect(mocks.claudeGenerateEmbedding).toHaveBeenCalledWith(
      { apiKey: "k", baseUrl: "https://api" },
      "claude-embed",
      ["one", "two"],
      512,
      undefined,
    );
    expect(result).toEqual({
      embeddings,
      usage: { promptTokens: 7, totalTokens: 7 },
    });
  });
});
