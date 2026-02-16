import { describe, expect, it } from "vitest";
import {
  buildToolCallContextUsageSnapshot,
  estimateTokensForMixedText,
  resolveVfsReadTokenBudget,
  resolveVfsReadHardCapChars,
} from "./contextUsage";

describe("contextUsage", () => {
  it("computes vfs read token budget from 1% context window", () => {
    const fallbackBudget = resolveVfsReadTokenBudget(undefined);
    expect(fallbackBudget.contextWindowTokens).toBe(32000);
    expect(fallbackBudget.tokenBudget).toBe(320);
    expect(fallbackBudget.projectedSafeChars).toBe(640);

    const overriddenBudget = resolveVfsReadTokenBudget({
      story: { providerId: "provider-1", modelId: "model-1" },
      providers: { instances: [{ id: "provider-1", protocol: "openai" }] },
      modelContextWindows: { "provider-1::model-1": 100000 },
    } as any);
    expect(overriddenBudget.contextWindowTokens).toBe(100000);
    expect(overriddenBudget.tokenBudget).toBe(1000);
    expect(overriddenBudget.projectedSafeChars).toBe(2000);
  });

  it("keeps backwards-compatible hardCapChars as conservative safe-char projection", () => {
    const fallbackCap = resolveVfsReadHardCapChars(undefined);
    expect(fallbackCap.contextWindowTokens).toBe(32000);
    expect(fallbackCap.tokenBudget).toBe(320);
    expect(fallbackCap.hardCapChars).toBe(640);

    const overriddenCap = resolveVfsReadHardCapChars({
      story: { providerId: "provider-1", modelId: "model-1" },
      providers: { instances: [{ id: "provider-1", protocol: "openai" }] },
      modelContextWindows: { "provider-1::model-1": 100000 },
    } as any);
    expect(overriddenCap.contextWindowTokens).toBe(100000);
    expect(overriddenCap.tokenBudget).toBe(1000);
    expect(overriddenCap.hardCapChars).toBe(2000);
  });

  it("estimates token density higher for CJK than ASCII at same char length", () => {
    const ascii = "a".repeat(2000);
    const cjk = "你".repeat(2000);
    const emoji = "😀".repeat(500);

    const asciiTokens = estimateTokensForMixedText(ascii);
    const cjkTokens = estimateTokensForMixedText(cjk);
    const emojiTokens = estimateTokensForMixedText(emoji);

    expect(asciiTokens).toBeLessThan(cjkTokens);
    expect(emojiTokens).toBeGreaterThan(asciiTokens);
    expect(estimateTokensForMixedText("")).toBe(0);
  });

  it("builds usage snapshot with threshold and ratio metadata", () => {
    const snapshot = buildToolCallContextUsageSnapshot({
      settings: {
        story: { providerId: "provider-1", modelId: "model-1" },
        providers: { instances: [{ id: "provider-1", protocol: "openai" }] },
        modelContextWindows: { "provider-1::model-1": 50000 },
      } as any,
      promptTokens: 26000,
      autoCompactThreshold: 0.7,
    });

    expect(snapshot.contextWindowTokens).toBe(50000);
    expect(snapshot.thresholdTokens).toBe(35000);
    expect(snapshot.usageRatio).toBeCloseTo(0.52, 4);
    expect(snapshot.tokensToThreshold).toBe(9000);
  });
});
