import { describe, expect, it } from "vitest";
import { parseClaudeUsage } from "../claudeProvider";

describe("parseClaudeUsage", () => {
  it("parses standard snake_case usage payload", () => {
    const usage = parseClaudeUsage({
      input_tokens: 70,
      output_tokens: 30,
      cache_read_input_tokens: 12,
      cache_creation_input_tokens: 4,
    });

    expect(usage).toEqual({
      promptTokens: 70,
      completionTokens: 30,
      totalTokens: 100,
      cacheRead: 12,
      cacheWrite: 4,
      reported: true,
    });
  });

  it("parses camelCase compatibility payload", () => {
    const usage = parseClaudeUsage({
      inputTokens: 22,
      outputTokens: 8,
      totalTokens: 30,
      cacheReadInputTokens: 3,
      cacheCreationInputTokens: 1,
    });

    expect(usage).toEqual({
      promptTokens: 22,
      completionTokens: 8,
      totalTokens: 30,
      cacheRead: 3,
      cacheWrite: 1,
      reported: true,
    });
  });

  it("returns reported=false for unknown usage shape", () => {
    const usage = parseClaudeUsage({
      hello: "world",
    });

    expect(usage).toEqual({
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      reported: false,
    });
  });
});
