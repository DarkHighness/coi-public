import { beforeEach, describe, expect, it, vi } from "vitest";

const sdkMocks = vi.hoisted(() => ({
  generateContent: vi.fn(),
  generateContentStream: vi.fn(),
  generateImages: vi.fn(),
  generateVideos: vi.fn(),
  listModels: vi.fn(),
  embedContent: vi.fn(),
  getVideosOperation: vi.fn(),
}));

vi.mock("@google/genai", () => {
  class GoogleGenAI {
    models = {
      generateContent: sdkMocks.generateContent,
      generateContentStream: sdkMocks.generateContentStream,
      generateImages: sdkMocks.generateImages,
      generateVideos: sdkMocks.generateVideos,
      list: sdkMocks.listModels,
      embedContent: sdkMocks.embedContent,
    };

    operations = {
      getVideosOperation: sdkMocks.getVideosOperation,
    };

    constructor(_opts: any) {}
  }

  return {
    GoogleGenAI,
    Modality: {
      TEXT: "TEXT",
      IMAGE: "IMAGE",
      AUDIO: "AUDIO",
    },
    Type: {},
    HarmCategory: {
      HARM_CATEGORY_HARASSMENT: "HARM_CATEGORY_HARASSMENT",
      HARM_CATEGORY_HATE_SPEECH: "HARM_CATEGORY_HATE_SPEECH",
      HARM_CATEGORY_SEXUALLY_EXPLICIT: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
      HARM_CATEGORY_DANGEROUS_CONTENT: "HARM_CATEGORY_DANGEROUS_CONTENT",
    },
    HarmBlockThreshold: {
      BLOCK_NONE: "BLOCK_NONE",
    },
  };
});

import {
  generateContent,
  generateEmbedding,
  generateImage,
  generateSpeech,
  generateVideo,
  getEmbeddingModels,
} from "./geminiProvider";

describe("geminiProvider media and embedding branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("generates compatibility image from inlineData", async () => {
    sdkMocks.generateContent.mockResolvedValueOnce({
      candidates: [
        {
          content: {
            parts: [{ inlineData: { mimeType: "image/png", data: "QUJD" } }],
          },
        },
      ],
      usageMetadata: {
        promptTokenCount: 6,
        candidatesTokenCount: 2,
        totalTokenCount: 8,
      },
    });

    const result = await generateImage(
      { apiKey: "k", compatibleImageGeneration: true } as any,
      "gemini-image",
      "moon harbor",
    );

    expect(result.url).toBe("data:image/png;base64,QUJD");
    expect(result.usage).toMatchObject({
      promptTokens: 6,
      completionTokens: 2,
      totalTokens: 8,
    });
  });

  it("returns null image when quota is exhausted on fallback endpoint", async () => {
    sdkMocks.generateContent.mockResolvedValueOnce({
      candidates: [{ content: { parts: [{ text: "no image" }] } }],
    });
    sdkMocks.generateImages.mockRejectedValueOnce(
      new Error("429 RESOURCE_EXHAUSTED"),
    );

    const result = await generateImage(
      { apiKey: "k", compatibleImageGeneration: true } as any,
      "imagen-3.0-generate-002",
      "storm",
      "1536x672",
    );

    expect(result.url).toBeNull();
    expect(result.raw).toBeInstanceOf(Error);
    expect(sdkMocks.generateImages).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          aspectRatio: "21:9",
        }),
      }),
    );
  });

  it("polls video operation until done and fetches final blob", async () => {
    const fetchMock = vi.fn(async () => ({
      blob: async () => new Blob(["video"]),
    }));
    vi.stubGlobal("fetch", fetchMock as any);

    const createObjectUrl = vi.fn(() => "blob:video-url");
    vi.stubGlobal("URL", {
      createObjectURL: createObjectUrl,
    } as any);

    const timeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((
      fn: any,
    ) => {
      fn();
      return 0 as any;
    }) as any);

    sdkMocks.generateVideos.mockResolvedValueOnce({ done: false });
    sdkMocks.getVideosOperation.mockResolvedValueOnce({
      done: true,
      response: {
        generatedVideos: [{ video: { uri: "https://video.example/file.mp4" } }],
      },
    });

    const result = await generateVideo(
      { apiKey: "k" } as any,
      "veo-2.0-generate-001",
      "data:image/png;base64,QUJD",
      "make it cinematic",
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://video.example/file.mp4&key=k",
    );
    expect(result.url).toBe("blob:video-url");
    expect(timeoutSpy).toHaveBeenCalled();
  });

  it("generates speech with instructions and wraps PCM audio", async () => {
    const pcmBase64 = Buffer.from(Uint8Array.from([1, 2, 3, 4])).toString(
      "base64",
    );

    sdkMocks.generateContent.mockResolvedValueOnce({
      candidates: [
        {
          content: {
            parts: [{ inlineData: { data: pcmBase64 } }],
          },
        },
      ],
      usageMetadata: {
        promptTokenCount: 10,
        candidatesTokenCount: 5,
        totalTokenCount: 15,
      },
    });

    const result = await generateSpeech(
      { apiKey: "k" } as any,
      "gemini-2.5-pro",
      "hello",
      "Kore",
      { instructions: "calm" } as any,
    );

    expect(sdkMocks.generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-2.5-flash-preview-tts",
        contents: [
          {
            parts: [{ text: 'Say in a calm tone: "hello"' }],
          },
        ],
      }),
    );

    const bytes = new Uint8Array(result.audio);
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("RIFF");
    expect(result.usage).toMatchObject({
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
    });
  });

  it("throws when speech response has no audio content", async () => {
    sdkMocks.generateContent.mockResolvedValueOnce({
      candidates: [{ content: { parts: [{ text: "no audio" }] } }],
    });

    await expect(
      generateSpeech({ apiKey: "k" } as any, "gemini-2.5-pro", "hello"),
    ).rejects.toThrow("No audio content generated");
  });

  it("lists embedding models and falls back on failures", async () => {
    sdkMocks.listModels.mockResolvedValueOnce(
      (async function* () {
        yield {
          name: "models/gemini-embedding-001",
          displayName: "Gemini Embed",
        };
        yield { name: "models/gemini-2.5-pro", displayName: "Gemini Pro" };
      })(),
    );

    const listed = await getEmbeddingModels({ apiKey: "k" } as any);
    expect(listed).toEqual([
      {
        id: "gemini-embedding-001",
        name: "Gemini Embed",
        dimensions: 768,
      },
    ]);

    sdkMocks.listModels.mockRejectedValueOnce(new Error("list failed"));
    await expect(getEmbeddingModels({ apiKey: "k" } as any)).resolves.toEqual([
      {
        id: "gemini-embedding-001",
        name: "Gemini Embedding 001",
        dimensions: 768,
      },
    ]);
  });

  it("generates embeddings per text with optional dimensionality", async () => {
    sdkMocks.embedContent
      .mockResolvedValueOnce({ embeddings: [{ values: [0.1, 0.2] }] })
      .mockResolvedValueOnce({ embeddings: [{ values: [0.3, 0.4] }] });

    const result = await generateEmbedding(
      { apiKey: "k" } as any,
      "gemini-embedding-001",
      ["abcd", "abcdefgh"],
      256,
    );

    expect(sdkMocks.embedContent).toHaveBeenCalledTimes(2);
    expect(sdkMocks.embedContent).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        config: expect.objectContaining({ outputDimensionality: 256 }),
      }),
    );

    expect(Array.from(result.embeddings[0])[0]).toBeCloseTo(0.1, 6);
    expect(Array.from(result.embeddings[1])[1]).toBeCloseTo(0.4, 6);
    expect(result.usage).toEqual({
      promptTokens: 3,
      totalTokens: 3,
    });
  });

  it("throws safety error when streaming candidate finishReason is SAFETY", async () => {
    sdkMocks.generateContentStream.mockResolvedValueOnce({
      async *[Symbol.asyncIterator]() {
        yield {
          text: "",
          candidates: [
            {
              finishReason: "SAFETY",
              finishMessage: "blocked",
              content: { parts: [] },
            },
          ],
        };
      },
    });

    await expect(
      generateContent(
        { apiKey: "k" } as any,
        "gemini-2.5-flash",
        "sys",
        [{ role: "user", content: [{ type: "text", text: "hello" }] }] as any,
        undefined,
        { onChunk: vi.fn() } as any,
      ),
    ).rejects.toMatchObject({ code: "SAFETY" });
  });

  it("throws non-stream malformed tool-call error with tool name details", async () => {
    sdkMocks.generateContent.mockResolvedValueOnce({
      candidates: [
        {
          content: {
            parts: [
              {
                functionCall: {
                  name: "vfs_read_chars",
                  args: "not-an-object",
                },
              },
            ],
          },
        },
      ],
      usageMetadata: {
        promptTokenCount: 3,
        candidatesTokenCount: 1,
        totalTokenCount: 4,
      },
    });

    try {
      await generateContent(
        { apiKey: "k" } as any,
        "gemini-2.5-flash",
        "sys",
        [{ role: "user", content: [{ type: "text", text: "hello" }] }] as any,
      );
      throw new Error("expected non-stream malformed tool-call rejection");
    } catch (error) {
      expect(error).toMatchObject({ code: "MALFORMED_TOOL_CALL" });
      expect(String(error)).toContain("vfs_read_chars");
    }
  });

  it("deduplicates repeated streaming functionCall parts across chunks", async () => {
    sdkMocks.generateContentStream.mockResolvedValueOnce({
      async *[Symbol.asyncIterator]() {
        yield {
          text: "",
          candidates: [
            {
              content: {
                parts: [
                  {
                    functionCall: {
                      name: "vfs_read_chars",
                      args: { path: "current/world/README.md" },
                    },
                  },
                ],
              },
            },
          ],
          usageMetadata: {
            promptTokenCount: 5,
            candidatesTokenCount: 2,
            totalTokenCount: 7,
          },
        };
        yield {
          text: "",
          candidates: [
            {
              content: {
                parts: [
                  {
                    functionCall: {
                      name: "vfs_read_chars",
                      args: { path: "current/world/README.md" },
                    },
                  },
                ],
              },
            },
          ],
          usageMetadata: {
            promptTokenCount: 5,
            candidatesTokenCount: 2,
            totalTokenCount: 7,
          },
        };
      },
    });

    const result = await generateContent(
      { apiKey: "k" } as any,
      "gemini-2.5-flash",
      "sys",
      [{ role: "user", content: [{ type: "text", text: "hello" }] }] as any,
      undefined,
      { onChunk: vi.fn() } as any,
    );

    const functionCalls = (result.result as { functionCalls?: Array<any> })
      .functionCalls;
    expect(functionCalls).toHaveLength(1);
    expect(functionCalls?.[0]).toMatchObject({
      name: "vfs_read_chars",
      args: { path: "current/world/README.md" },
    });
  });

  it("throws when stream emits functionCall parts but none are valid", async () => {
    sdkMocks.generateContentStream.mockResolvedValueOnce({
      async *[Symbol.asyncIterator]() {
        yield {
          text: "",
          candidates: [
            {
              content: {
                parts: [
                  {
                    functionCall: {
                      name: "",
                      args: { path: "current/world/README.md" },
                    },
                  },
                ],
              },
            },
          ],
        };
      },
    });

    await expect(
      generateContent(
        { apiKey: "k" } as any,
        "gemini-2.5-flash",
        "sys",
        [{ role: "user", content: [{ type: "text", text: "hello" }] }] as any,
        undefined,
        { onChunk: vi.fn() } as any,
      ),
    ).rejects.toMatchObject({ code: "MALFORMED_TOOL_CALL" });
  });
});
