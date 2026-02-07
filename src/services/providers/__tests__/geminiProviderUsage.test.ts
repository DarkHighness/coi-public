import { describe, expect, it } from "vitest";
import { parseGeminiUsageMetadata } from "../geminiProvider";

describe("parseGeminiUsageMetadata", () => {
  it("parses camelCase usage metadata", () => {
    const usage = parseGeminiUsageMetadata({
      promptTokenCount: 120,
      candidatesTokenCount: 30,
      totalTokenCount: 150,
      cachedContentTokenCount: 40,
    });

    expect(usage).toEqual({
      promptTokens: 120,
      completionTokens: 30,
      totalTokens: 150,
      cacheRead: 40,
      reported: true,
    });
  });

  it("parses snake_case usage metadata", () => {
    const usage = parseGeminiUsageMetadata({
      prompt_token_count: 80,
      candidates_token_count: 20,
      total_token_count: 100,
      cached_content_token_count: 10,
    });

    expect(usage).toEqual({
      promptTokens: 80,
      completionTokens: 20,
      totalTokens: 100,
      cacheRead: 10,
      reported: true,
    });
  });

  it("derives completion tokens from total when completion is missing", () => {
    const usage = parseGeminiUsageMetadata({
      promptTokenCount: 55,
      totalTokenCount: 70,
    });

    expect(usage.promptTokens).toBe(55);
    expect(usage.completionTokens).toBe(15);
    expect(usage.totalTokens).toBe(70);
    expect(usage.reported).toBe(true);
  });

  it("returns reported=false when usage shape is unknown", () => {
    const usage = parseGeminiUsageMetadata({
      unknown_field: 1,
    });

    expect(usage).toEqual({
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      reported: false,
    });
  });
});
