import { describe, expect, it } from "vitest";
import { resolveContextBoundMaxOutputTokens } from "./outputTokenBudget";

describe("resolveContextBoundMaxOutputTokens", () => {
  it("returns model output cap unchanged when prompt size is unknown", () => {
    expect(
      resolveContextBoundMaxOutputTokens({
        providerProtocol: "openai",
        modelId: "openai/unknown-model",
        maxOutputTokens: 128000,
      }),
    ).toBe(128000);
  });

  it("caps output tokens to remaining context window from total estimate", () => {
    expect(
      resolveContextBoundMaxOutputTokens({
        providerProtocol: "openai",
        modelId: "openai/unknown-model",
        maxOutputTokens: 128000,
        tokenBudget: {
          contextWindowTokens: 204800,
          totalTokenEstimate: 82000,
        },
      }),
    ).toBe(120752);
  });

  it("derives prompt estimate from payload when explicit estimate is absent", () => {
    const bounded = resolveContextBoundMaxOutputTokens({
      providerProtocol: "openai",
      modelId: "openai/unknown-model",
      maxOutputTokens: 50000,
      tokenBudget: { contextWindowTokens: 6000 },
      systemInstruction: "你".repeat(2000),
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: "世界".repeat(1200) }],
        },
      ],
      tools: [{ name: "vfs_read_chars", description: "read", parameters: {} }],
    });

    expect(bounded).toBeGreaterThan(0);
    expect(bounded).toBeLessThan(50000);
  });

  it("prefers explicit prompt estimate over derived payload estimate", () => {
    expect(
      resolveContextBoundMaxOutputTokens({
        providerProtocol: "openai",
        modelId: "openai/unknown-model",
        maxOutputTokens: 128000,
        tokenBudget: {
          contextWindowTokens: 204800,
          promptTokenEstimate: 82000,
        },
        systemInstruction: "x".repeat(500),
        messages: [{ role: "user", content: [{ type: "text", text: "y" }] }],
      }),
    ).toBe(120752);
  });

  it("prefers total estimate over prompt estimate when both are provided", () => {
    expect(
      resolveContextBoundMaxOutputTokens({
        providerProtocol: "openai",
        modelId: "openai/unknown-model",
        maxOutputTokens: 128000,
        tokenBudget: {
          contextWindowTokens: 204800,
          promptTokenEstimate: 1000,
          totalTokenEstimate: 82000,
        },
      }),
    ).toBe(120752);
  });

  it("uses mapped OpenRouter upstream defaults instead of 128k fallback", () => {
    expect(
      resolveContextBoundMaxOutputTokens({
        providerProtocol: "openrouter",
        modelId: "google/gemini-3-flash-preview",
        maxOutputTokens: 128000,
        tokenBudget: {
          totalTokenEstimate: 100000,
        },
      }),
    ).toBe(128000);
  });
});
