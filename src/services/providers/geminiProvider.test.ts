import { describe, expect, it, vi } from "vitest";
import {
  buildFunctionResponseMessage,
  createGeminiClient,
  extractTextContent,
  fromUnifiedMessage,
  fromUnifiedMessages,
  getModels,
  parseGeminiUsageMetadata,
  resolveGeminiMaxOutputTokens,
  validateConnection,
} from "./geminiProvider";

describe("geminiProvider helpers", () => {
  it("parses tool-use and thoughts usage fallbacks", () => {
    const usage = parseGeminiUsageMetadata({
      tool_use_prompt_token_count: 12,
      thoughts_token_count: 8,
      total_token_count: 20,
    });

    expect(usage).toEqual({
      promptTokens: 12,
      completionTokens: 8,
      totalTokens: 20,
      reported: true,
    });
  });

  it("converts assistant tool_use to functionCall and preserves thought signature", () => {
    const content = fromUnifiedMessage({
      role: "assistant",
      content: [
        { type: "text", text: "I will read state" },
        {
          type: "tool_use",
          toolUse: {
            id: "call-1",
            name: "vfs_read_chars",
            args: { path: "current/world/README.md" },
            thoughtSignature: "sig-1",
          },
        },
      ],
    } as any);

    expect(content.role).toBe("model");
    expect(content.parts[0]).toMatchObject({ text: "I will read state" });
    expect(content.parts[1]).toMatchObject({
      functionCall: {
        name: "vfs_read_chars",
        args: { path: "current/world/README.md" },
      },
      thoughtSignature: "sig-1",
    });
  });

  it("builds function response payload with content envelope", () => {
    const content = buildFunctionResponseMessage([
      { name: "vfs_read_chars", response: { ok: true, text: "body" } },
    ]);

    expect(content).toEqual({
      role: "user",
      parts: [
        {
          functionResponse: {
            name: "vfs_read_chars",
            response: { content: { ok: true, text: "body" } },
          },
        },
      ],
    });
  });

  it("extracts text from candidate parts", () => {
    const response = {
      candidates: [
        {
          content: {
            parts: [{ text: "alpha" }, { text: "beta" }],
          },
        },
      ],
    };

    expect(extractTextContent(response)).toBe("alphabeta");
  });

  it("maps unified tool_result to gemini functionResponse", () => {
    const converted = fromUnifiedMessage({
      role: "tool",
      content: [
        {
          type: "tool_result",
          toolResult: {
            id: "call-1",
            name: "vfs_read_chars",
            content: { lines: ["a", "b"] },
          },
        },
      ],
    } as any);

    expect(converted.role).toBe("user");
    expect(converted.parts[0]).toMatchObject({
      functionResponse: {
        name: "vfs_read_chars",
        response: { content: { lines: ["a", "b"] } },
      },
    });
  });

  it("passes through already-native gemini content in batch conversion", () => {
    const nativeContent = {
      role: "model",
      parts: [{ text: "ready" }],
    } as any;

    const converted = fromUnifiedMessages([
      {
        role: "system",
        content: "ignore",
      },
      nativeContent,
      {
        role: "assistant",
        content: [{ type: "text", text: "hello" }],
      },
    ] as any);

    expect(converted).toHaveLength(2);
    expect(converted[0]).toBe(nativeContent);
    expect(converted[1]).toMatchObject({ role: "model" });
  });

  it("parses cache read token usage and totals", () => {
    const usage = parseGeminiUsageMetadata({
      promptTokenCount: "9",
      candidatesTokenCount: "3",
      cachedContentTokenCount: 4,
    });

    expect(usage).toEqual({
      promptTokens: 9,
      completionTokens: 3,
      totalTokens: 12,
      cacheRead: 4,
      reported: true,
    });
  });

  it("returns unreported usage for non-object payload", () => {
    expect(parseGeminiUsageMetadata(undefined)).toEqual({
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      reported: false,
    });
  });

  it("converts data-url image parts into inlineData", () => {
    const converted = fromUnifiedMessage({
      role: "user",
      content: [
        {
          type: "image",
          image: { url: "data:image/png;base64,QUJD" },
        },
      ],
    } as any);

    expect(converted).toEqual({
      role: "user",
      parts: [
        {
          inlineData: {
            mimeType: "image/png",
            data: "QUJD",
          },
        },
      ],
    });
  });

  it("warns and injects empty part for unsupported image-only messages", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const converted = fromUnifiedMessage({
      role: "assistant",
      content: [
        {
          type: "image",
          image: { url: "https://example.com/file.png" },
        },
      ],
    } as any);

    expect(converted.role).toBe("model");
    expect(converted.parts).toEqual([{ text: "" }]);
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("converts mixed tool_use and text from assistant role", () => {
    const converted = fromUnifiedMessage({
      role: "assistant",
      content: [
        { type: "text", text: "prep" },
        {
          type: "tool_use",
          toolUse: {
            id: "x",
            name: "vfs_write_file",
            args: { path: "current/world/story.json" },
            thoughtSignature: "sig-x",
          },
        },
      ],
    } as any);

    expect(converted).toEqual({
      role: "model",
      parts: [
        { text: "prep" },
        {
          functionCall: {
            name: "vfs_write_file",
            args: { path: "current/world/story.json" },
          },
          thoughtSignature: "sig-x",
        },
      ],
    });
  });

  it("resolves default max output tokens from model defaults", () => {
    expect(resolveGeminiMaxOutputTokens("gemini-2.5-pro")).toBe(65536);
    expect(resolveGeminiMaxOutputTokens("google/gemini-2.5-flash")).toBe(65536);
    expect(resolveGeminiMaxOutputTokens("gemini-unknown-model")).toBe(65536);
  });

  it("uses player-configured fallback for unknown models", () => {
    expect(
      resolveGeminiMaxOutputTokens("gemini-unknown-model", {
        maxOutputTokensFallback: 36000,
      }),
    ).toBe(36000);
  });
});

describe("geminiProvider fallbacks and errors", () => {
  it("throws when creating client without api key", () => {
    expect(() => createGeminiClient({ apiKey: "" } as any)).toThrow(
      "Gemini API key is required",
    );
  });

  it("wraps validation errors into AIProviderError", async () => {
    await expect(validateConnection({ apiKey: "" } as any)).rejects.toThrow(
      "Failed to connect to Gemini API",
    );
  });

  it("falls back to default model list when sdk and rest fetch fail", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("network blocked");
    });
    vi.stubGlobal("fetch", fetchMock as any);

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const models = await getModels({ apiKey: "" } as any);

    expect(models.length).toBeGreaterThan(0);
    expect(models.map((m) => m.id)).toEqual(
      expect.arrayContaining([
        "gemini-2.0-flash",
        "gemini-2.0-pro-exp-02-05",
        "imagen-3.0-generate-002",
        "veo-2.0-generate-001",
      ]),
    );
    expect(fetchMock).toHaveBeenCalled();

    warnSpy.mockRestore();
    vi.unstubAllGlobals();
  });
});
