import { beforeEach, describe, expect, it, vi } from "vitest";

const getProviderConfig = vi.hoisted(() => vi.fn());
const createLogEntry = vi.hoisted(() =>
  vi.fn((payload: Record<string, unknown>) => ({ id: "log", ...payload })),
);
const getSceneImagePrompt = vi.hoisted(() =>
  vi.fn((prompt: string) => `styled:${prompt}`),
);
const getVeoScriptPrompt = vi.hoisted(() => vi.fn(() => "veo-script-prompt"));
const createProvider = vi.hoisted(() => vi.fn());

const generateOpenAIImage = vi.hoisted(() => vi.fn());
const generateOpenAISpeech = vi.hoisted(() => vi.fn());
const generateOpenRouterImage = vi.hoisted(() => vi.fn());
const generateOpenRouterSpeech = vi.hoisted(() => vi.fn());
const generateGeminiImage = vi.hoisted(() => vi.fn());
const generateGeminiVideo = vi.hoisted(() => vi.fn());
const generateGeminiSpeech = vi.hoisted(() => vi.fn());
const generateClaudeSpeech = vi.hoisted(() => vi.fn());

vi.mock("./utils", () => ({
  getProviderConfig,
  createLogEntry,
}));

vi.mock("../prompts/index", () => ({
  getSceneImagePrompt,
  getVeoScriptPrompt,
}));

vi.mock("./provider/createProvider", () => ({
  createProvider,
}));

vi.mock("../providers/openaiProvider", () => ({
  generateImage: generateOpenAIImage,
  generateSpeech: generateOpenAISpeech,
}));

vi.mock("../providers/openRouterProvider", () => ({
  generateImage: generateOpenRouterImage,
  generateSpeech: generateOpenRouterSpeech,
}));

vi.mock("../providers/geminiProvider", () => ({
  generateImage: generateGeminiImage,
  generateVideo: generateGeminiVideo,
  generateSpeech: generateGeminiSpeech,
}));

vi.mock("../providers/claudeProvider", () => ({
  generateSpeech: generateClaudeSpeech,
}));

import { generateSceneImage, generateSpeech, generateVeoScript } from "./media";

describe("media service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns disabled image result when provider is unavailable", async () => {
    getProviderConfig.mockReturnValue({ enabled: false });

    const result = await generateSceneImage(
      "draw scene",
      {} as any,
      {} as any,
      undefined,
    );

    expect(result.url).toBeNull();
    expect(createLogEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "none",
        endpoint: "image",
        request: { disabled: true },
      }),
    );
  });

  it("generates image via OpenAI path and fetches blob", async () => {
    getProviderConfig.mockReturnValue({
      enabled: true,
      instance: { protocol: "openai" },
      config: { apiKey: "k" },
      modelId: "gpt-image-1",
      resolution: "1024x1024",
    });

    generateOpenAIImage.mockResolvedValue({
      url: "https://example.com/image.png",
      usage: { promptTokens: 10, completionTokens: 0, totalTokens: 10 },
      raw: { ok: true },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        blob: async () => new Blob(["img"], { type: "image/png" }),
      })),
    );

    const result = await generateSceneImage("forest", {} as any, {} as any);

    expect(getSceneImagePrompt).toHaveBeenCalledWith("forest", {}, undefined);
    expect(generateOpenAIImage).toHaveBeenCalled();
    expect(result.url).toBe("https://example.com/image.png");
    expect(result.blob).toBeInstanceOf(Blob);
    expect(createLogEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: "generateImage",
        imagePrompt: "styled:forest",
      }),
    );
  });

  it("selects tone-based default voice for OpenRouter speech", async () => {
    getProviderConfig.mockImplementation((_settings, endpoint: string) => {
      if (endpoint === "audio") {
        return {
          enabled: true,
          instance: { protocol: "openrouter" },
          config: { apiKey: "k" },
          modelId: "openrouter-tts",
        };
      }
      return null;
    });

    generateOpenRouterSpeech.mockResolvedValue({
      audio: new ArrayBuffer(8),
    });

    const audio = await generateSpeech(
      { audio: { speed: 1.0, format: "mp3", voice: "alloy" } } as any,
      "hello",
      undefined,
      "suspense and danger",
    );

    expect(generateOpenRouterSpeech).toHaveBeenCalledWith(
      expect.anything(),
      "openrouter-tts",
      "hello",
      "onyx",
      expect.objectContaining({ format: "mp3", speed: 1.0 }),
    );
    expect(audio).toBeInstanceOf(ArrayBuffer);
  });

  it("returns null when speech protocol is unsupported", async () => {
    getProviderConfig.mockImplementation((_settings, endpoint: string) => {
      if (endpoint === "audio") {
        return {
          enabled: true,
          instance: { protocol: "unknown_protocol" },
          config: {},
          modelId: "x",
        };
      }
      return null;
    });

    const result = await generateSpeech(
      { audio: { speed: 1.0, format: "mp3", voice: "alloy" } } as any,
      "text",
    );

    expect(result).toBeNull();
  });

  it("returns fallback script payload when veo generation fails", async () => {
    getProviderConfig.mockImplementation((_settings, endpoint: string) => {
      if (endpoint === "script") {
        return {
          instance: { id: "provider-1", protocol: "openai" },
          modelId: "gpt-4.1",
          thinkingEffort: "medium",
          mediaResolution: "720p",
          temperature: 0.4,
          topP: 0.9,
          topK: 40,
          minP: 0,
        };
      }
      return null;
    });

    createProvider.mockReturnValue({
      generateChat: vi.fn(async () => {
        throw new Error("provider unavailable");
      }),
    });

    const result = await generateVeoScript(
      {} as any,
      {} as any,
      [] as any,
      "English",
    );

    expect(getVeoScriptPrompt).toHaveBeenCalled();
    expect(result.script).toBe("Failed to generate script.");
    expect(result.log).toMatchObject({
      provider: "openai",
      endpoint: "generateVeoScript",
    });
    expect((result.log as any).response.error).toContain(
      "provider unavailable",
    );
  });

  it("keeps veo system instruction distinct from user prompt content", async () => {
    getProviderConfig.mockImplementation((_settings, endpoint: string) => {
      if (endpoint === "script") {
        return {
          instance: { id: "provider-1", protocol: "openai" },
          modelId: "gpt-4.1",
          thinkingEffort: "medium",
          mediaResolution: "720p",
          temperature: 0.4,
          topP: 0.9,
          topK: 40,
          minP: 0,
        };
      }
      return null;
    });

    getVeoScriptPrompt.mockReturnValueOnce("<veo_context/>");

    const generateChat = vi.fn(async (_request: { messages?: unknown[] }) => ({
      result: "veo script",
      usage: { promptTokens: 12, completionTokens: 34, totalTokens: 46 },
      raw: { ok: true },
    }));
    createProvider.mockReturnValue({ generateChat });

    const result = await generateVeoScript(
      {} as any,
      {} as any,
      [] as any,
      "English",
    );

    expect(result.script).toBe("veo script");
    expect(generateChat).toHaveBeenCalledWith(
      expect.objectContaining({
        systemInstruction:
          "You are an expert cinematographer and director with deep knowledge of lens choice, camera movement, lighting design, and visual storytelling. Transform the narrative into a precise, visually rich video generation script. Specify exact camera angles, focal lengths, movement speeds, lighting motivation, color temperature, and atmospheric effects. Every technical choice must serve the emotional core of the scene. Output the structured script directly.",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "<veo_context/>",
              },
            ],
          },
        ],
      }),
    );
    const firstPromptText = generateChat.mock.calls.at(0)?.at(0)
      ?.messages?.[0] as { content?: Array<{ text?: string }> } | undefined;
    expect(firstPromptText?.content?.[0]?.text).not.toContain(
      "expert cinematographer",
    );
  });
});
