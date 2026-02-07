import { describe, expect, it } from "vitest";
import { parseOpenRouterUsage } from "../openRouterProvider";

describe("parseOpenRouterUsage", () => {
  it("parses camelCase usage payload", () => {
    const usage = parseOpenRouterUsage({
      promptTokens: 150,
      completionTokens: 60,
      totalTokens: 210,
      cacheReadInputTokens: 20,
      cacheCreationInputTokens: 5,
    });

    expect(usage).toEqual({
      promptTokens: 150,
      completionTokens: 60,
      totalTokens: 210,
      cacheRead: 20,
      cacheWrite: 5,
      reported: true,
    });
  });

  it("parses snake_case usage payload", () => {
    const usage = parseOpenRouterUsage({
      prompt_tokens: 90,
      completion_tokens: 10,
      total_tokens: 100,
      cache_read_input_tokens: 8,
      cache_creation_input_tokens: 2,
    });

    expect(usage).toEqual({
      promptTokens: 90,
      completionTokens: 10,
      totalTokens: 100,
      cacheRead: 8,
      cacheWrite: 2,
      reported: true,
    });
  });

  it("derives completion from total when missing", () => {
    const usage = parseOpenRouterUsage({
      promptTokens: 77,
      totalTokens: 88,
    });

    expect(usage.promptTokens).toBe(77);
    expect(usage.completionTokens).toBe(11);
    expect(usage.totalTokens).toBe(88);
    expect(usage.reported).toBe(true);
  });
});
