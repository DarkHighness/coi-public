import { describe, expect, it } from "vitest";
import { resolveTokenBudget } from "./tokenBudgetManager";

describe("resolveTokenBudget", () => {
  it("routes OpenAI compatibility model families to provider-specific caps", () => {
    const claudeCompat = resolveTokenBudget({
      providerProtocol: "openai",
      modelId: "anthropic/claude-sonnet-4-5",
    });

    expect(claudeCompat.resolvedProviderProtocol).toBe("claude");
    expect(claudeCompat.modelMaxOutputTokens).toBe(64000);
    expect(claudeCompat.maxOutputTokens).toBe(64000);
  });

  it("routes OpenRouter vendor prefixes to provider-specific caps", () => {
    const geminiRouted = resolveTokenBudget({
      providerProtocol: "openrouter",
      modelId: "google/gemini-2.5-pro",
    });

    expect(geminiRouted.resolvedProviderProtocol).toBe("gemini");
    expect(geminiRouted.modelMaxOutputTokens).toBe(65536);
    expect(geminiRouted.maxOutputTokens).toBe(65536);
  });

  it("clamps output cap using context window and total estimate", () => {
    const budget = resolveTokenBudget({
      providerProtocol: "openrouter",
      modelId: "unknown/vendor-model",
      tokenBudget: {
        maxOutputTokensFallback: 128000,
        contextWindowTokens: 204800,
        totalTokenEstimate: 82000,
      },
    });

    expect(budget.modelMaxOutputTokens).toBe(128000);
    expect(budget.maxOutputTokens).toBe(120752);
  });

  it("resolves context window from defaults when not explicitly provided", () => {
    const budget = resolveTokenBudget({
      providerProtocol: "openai",
      modelId: "o3",
    });

    expect(budget.contextWindowTokens).toBe(200000);
    expect(budget.modelMaxOutputTokens).toBe(100000);
    expect(budget.maxOutputTokens).toBe(100000);
  });

  it("supports explicit fallback override for unknown models", () => {
    const budget = resolveTokenBudget({
      providerProtocol: "openai",
      modelId: "openai/unknown-model",
      tokenBudget: { maxOutputTokensFallback: 48000 },
    });

    expect(budget.modelMaxOutputTokens).toBe(48000);
    expect(budget.maxOutputTokens).toBe(48000);
  });
});
