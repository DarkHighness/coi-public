import { describe, expect, it } from "vitest";
import { pickModelMatchedPrompt, type ModelPromptEntry } from "../utils";

describe("pickModelMatchedPrompt", () => {
  it("skips empty matched entries and picks the first non-empty matched prompt", () => {
    const entries: ModelPromptEntry[] = [
      {
        keywords: ["gpt", "openai"],
        prompt: "   ",
      },
      {
        keywords: ["openai"],
        prompt: "  use concise, concrete prose  ",
      },
      {
        keywords: ["gpt"],
        prompt: "this should never win",
      },
    ];

    const result = pickModelMatchedPrompt(entries, "OpenAI/GPT-5");
    expect(result).toBe("use concise, concrete prose");
  });

  it("keeps deterministic order when multiple non-empty entries match", () => {
    const entries: ModelPromptEntry[] = [
      {
        keywords: ["gpt"],
        prompt: "first matched prompt wins",
      },
      {
        keywords: ["openai", "gpt"],
        prompt: "later prompt should not override",
      },
    ];

    const result = pickModelMatchedPrompt(entries, "openai/gpt-5");
    expect(result).toBe("first matched prompt wins");
  });
});
