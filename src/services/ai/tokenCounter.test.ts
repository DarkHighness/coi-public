import { beforeEach, describe, expect, it, vi } from "vitest";
import { estimateTokensForMixedText } from "./contextUsage";

const geminiCountTokensMock = vi.hoisted(() => vi.fn());
const claudeCountTokensMock = vi.hoisted(() => vi.fn());

vi.mock("../providers/geminiProvider", () => ({
  countTokens: geminiCountTokensMock,
}));

vi.mock("../providers/claudeProvider", () => ({
  countTokens: claudeCountTokensMock,
}));

import { createReadTokenCounter } from "./tokenCounter";

const createSettings = (
  protocol: "gemini" | "claude" | "openai" | "openrouter",
  overrides: Partial<Record<string, unknown>> = {},
) =>
  ({
    providers: {
      instances: [
        {
          id: "provider-1",
          name: "Provider 1",
          protocol,
          enabled: true,
          apiKey: "sk-test",
          baseUrl: "",
          createdAt: 0,
          lastModified: 0,
          ...overrides,
        },
      ],
    },
    story: {
      providerId: "provider-1",
      modelId: "model-1",
    },
  }) as any;

describe("createReadTokenCounter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses Gemini provider count_tokens when supported", async () => {
    geminiCountTokensMock.mockResolvedValueOnce(321);
    const counter = createReadTokenCounter({
      settings: createSettings("gemini"),
      calibrationFactor: 1,
    });

    const result = await counter.count("hello world");

    expect(counter.usesProviderCountTokens).toBe(true);
    expect(result).toEqual({
      tokens: 321,
      source: "provider_count_tokens",
    });
    expect(geminiCountTokensMock).toHaveBeenCalledTimes(1);
    expect(claudeCountTokensMock).not.toHaveBeenCalled();
  });

  it("uses Claude provider count_tokens when supported", async () => {
    claudeCountTokensMock.mockResolvedValueOnce(222);
    const counter = createReadTokenCounter({
      settings: createSettings("claude"),
      calibrationFactor: 1,
    });

    const result = await counter.count("hello world");

    expect(counter.usesProviderCountTokens).toBe(true);
    expect(result).toEqual({
      tokens: 222,
      source: "provider_count_tokens",
    });
    expect(claudeCountTokensMock).toHaveBeenCalledTimes(1);
    expect(geminiCountTokensMock).not.toHaveBeenCalled();
  });

  it("falls back to local estimate when provider does not support remote counting", () => {
    const counter = createReadTokenCounter({
      settings: createSettings("openai"),
      calibrationFactor: 1,
    });
    const content = "fallback content";
    const result = counter.count(content);

    expect(result).not.toBeInstanceOf(Promise);
    expect(counter.usesProviderCountTokens).toBe(false);
    expect(result).toEqual({
      tokens: estimateTokensForMixedText(content, { calibrationFactor: 1 }),
      source: "local_estimate",
    });
    expect(geminiCountTokensMock).not.toHaveBeenCalled();
    expect(claudeCountTokensMock).not.toHaveBeenCalled();
  });

  it("retries once when remote counting fails then succeeds", async () => {
    geminiCountTokensMock
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce(88);
    const counter = createReadTokenCounter({
      settings: createSettings("gemini"),
      calibrationFactor: 1,
    });

    const result = await counter.count("retry content");

    expect(result).toEqual({
      tokens: 88,
      source: "provider_count_tokens",
    });
    expect(geminiCountTokensMock).toHaveBeenCalledTimes(2);
  });

  it("falls back to local estimate after retry still fails", async () => {
    geminiCountTokensMock
      .mockRejectedValueOnce(new Error("failure #1"))
      .mockRejectedValueOnce(new Error("failure #2"));
    const counter = createReadTokenCounter({
      settings: createSettings("gemini"),
      calibrationFactor: 1,
    });
    const content = "fallback after retry";

    const result = await counter.count(content);

    expect(result.source).toBe("local_estimate");
    expect(result.tokens).toBe(
      estimateTokensForMixedText(content, { calibrationFactor: 1 }),
    );
    expect(result.fallbackReason).toContain("failure #2");
    expect(geminiCountTokensMock).toHaveBeenCalledTimes(2);
  });

  it("falls back to local estimate when remote response is malformed", async () => {
    geminiCountTokensMock
      .mockResolvedValueOnce(Number.NaN)
      .mockResolvedValueOnce(Number.NaN);
    const counter = createReadTokenCounter({
      settings: createSettings("gemini"),
      calibrationFactor: 1,
    });
    const content = "malformed remote";

    const result = await counter.count(content);

    expect(result.source).toBe("local_estimate");
    expect(result.tokens).toBe(
      estimateTokensForMixedText(content, { calibrationFactor: 1 }),
    );
    expect(result.fallbackReason).toContain("Invalid provider token count");
    expect(geminiCountTokensMock).toHaveBeenCalledTimes(2);
  });
});
