import { describe, expect, it, vi } from "vitest";
import {
  createClaudeClient,
  generateEmbedding,
  generateImage,
  generateSpeech,
  generateVideo,
  getEmbeddingModels,
  getModels,
  parseClaudeUsage,
  validateConnection,
} from "./claudeProvider";

describe("claudeProvider usage parsing", () => {
  it("derives completion from total when output missing", () => {
    const usage = parseClaudeUsage({
      input_tokens: 60,
      total_tokens: 75,
      cache_read_input_tokens: 10,
    });

    expect(usage).toEqual({
      promptTokens: 60,
      completionTokens: 15,
      totalTokens: 75,
      cacheRead: 10,
      reported: true,
    });
  });

  it("fills prompt from total when only total is present", () => {
    const usage = parseClaudeUsage({
      totalTokens: "33",
    });

    expect(usage).toEqual({
      promptTokens: 33,
      completionTokens: 0,
      totalTokens: 33,
      reported: true,
    });
  });

  it("normalizes string and invalid values", () => {
    const usage = parseClaudeUsage({
      input_tokens: "42",
      output_tokens: " 8 ",
      cache_creation_input_tokens: -1,
      cache_read_input_tokens: "invalid",
    });

    expect(usage).toEqual({
      promptTokens: 42,
      completionTokens: 8,
      totalTokens: 50,
      cacheWrite: 0,
      reported: true,
    });
  });

  it("returns reported false when payload has no known usage fields", () => {
    expect(parseClaudeUsage({ foo: "bar" })).toEqual({
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      reported: false,
    });
  });

  it("derives total when prompt and completion are present", () => {
    const usage = parseClaudeUsage({
      promptTokens: 11,
      completionTokens: 9,
    });

    expect(usage).toEqual({
      promptTokens: 11,
      completionTokens: 9,
      totalTokens: 20,
      reported: true,
    });
  });
});

describe("claudeProvider fallbacks and unsupported features", () => {
  it("throws when creating client without api key", () => {
    expect(() => createClaudeClient({ apiKey: "" })).toThrow(
      "Claude API key is required",
    );
  });

  it("wraps validation failures with provider context", async () => {
    await expect(validateConnection({ apiKey: "" })).rejects.toThrow(
      "Failed to connect to Claude API",
    );
  });

  it("returns default model list on sdk failure", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const models = await getModels({ apiKey: "" });

    expect(models.length).toBeGreaterThan(3);
    expect(models.map((m) => m.id)).toEqual(
      expect.arrayContaining([
        "claude-sonnet-4-5-20250929",
        "claude-opus-4-20250514",
      ]),
    );

    warnSpy.mockRestore();
  });

  it("returns empty embedding model list", async () => {
    await expect(getEmbeddingModels({ apiKey: "x" })).resolves.toEqual([]);
  });

  it("rejects unsupported image/video/speech/embedding generation", async () => {
    await expect(
      generateImage({ apiKey: "x" }, "model", "prompt"),
    ).rejects.toThrow("Image generation is not supported");
    await expect(
      generateVideo({ apiKey: "x" }, "model", "base64", "prompt"),
    ).rejects.toThrow("Video generation is not supported");
    await expect(
      generateSpeech({ apiKey: "x" }, "model", "hello"),
    ).rejects.toThrow("Speech generation is not supported");
    await expect(
      generateEmbedding({ apiKey: "x" }, "model", ["hello"]),
    ).rejects.toThrow("Embedding generation is not supported");
  });
});
