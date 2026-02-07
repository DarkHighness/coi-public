import { describe, expect, it } from "vitest";
import { parseOpenAIUsage } from "../openaiProvider";

describe("parseOpenAIUsage", () => {
  it("parses snake_case usage payload", () => {
    const usage = parseOpenAIUsage({
      prompt_tokens: 100,
      completion_tokens: 25,
      total_tokens: 125,
      prompt_tokens_details: { cached_tokens: 18 },
    });

    expect(usage).toEqual({
      promptTokens: 100,
      completionTokens: 25,
      totalTokens: 125,
      cacheRead: 18,
      reported: true,
    });
  });

  it("parses camelCase usage payload", () => {
    const usage = parseOpenAIUsage({
      promptTokens: 44,
      completionTokens: 11,
      totalTokens: 55,
      promptTokensDetails: { cachedTokens: 7 },
    });

    expect(usage).toEqual({
      promptTokens: 44,
      completionTokens: 11,
      totalTokens: 55,
      cacheRead: 7,
      reported: true,
    });
  });

  it("derives completion when only prompt and total are available", () => {
    const usage = parseOpenAIUsage({
      prompt_tokens: 30,
      total_tokens: 42,
    });

    expect(usage.promptTokens).toBe(30);
    expect(usage.completionTokens).toBe(12);
    expect(usage.totalTokens).toBe(42);
    expect(usage.reported).toBe(true);
  });

  it("returns reported=false when shape has no known usage fields", () => {
    const usage = parseOpenAIUsage({
      foo: "bar",
    });

    expect(usage).toEqual({
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      reported: false,
    });
  });
});
