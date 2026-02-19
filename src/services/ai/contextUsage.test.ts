import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS,
  buildToolCallContextUsageSnapshot,
  estimateTokensForMixedText,
  getPromptTokenCalibrationSnapshot,
  recordPromptTokenCalibrationSample,
  resetPromptTokenCalibrationForTests,
  resolveProviderReportedPromptTokens,
  resolveVfsReadTokenBudget,
  resolveVfsReadHardCapChars,
} from "./contextUsage";

describe("contextUsage", () => {
  beforeEach(() => {
    resetPromptTokenCalibrationForTests();
  });

  it("computes vfs read token budget from 10% context window by default", () => {
    const fallbackBudget = resolveVfsReadTokenBudget(undefined);
    expect(fallbackBudget.contextWindowTokens).toBe(
      DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS,
    );
    expect(fallbackBudget.tokenBudget).toBe(12800);
    expect(fallbackBudget.projectedSafeChars).toBe(25600);
    expect(fallbackBudget.calibrationFactor).toBe(1);

    const overriddenBudget = resolveVfsReadTokenBudget({
      story: { providerId: "provider-1", modelId: "model-1" },
      providers: { instances: [{ id: "provider-1", protocol: "openai" }] },
      modelContextWindows: { "provider-1::model-1": 100000 },
    } as any);
    expect(overriddenBudget.contextWindowTokens).toBe(100000);
    expect(overriddenBudget.tokenBudget).toBe(10000);
    expect(overriddenBudget.projectedSafeChars).toBe(20000);
    expect(overriddenBudget.calibrationFactor).toBe(1);
  });

  it("supports configurable vfs read budget percent from settings.extra", () => {
    const configuredBudget = resolveVfsReadTokenBudget({
      story: { providerId: "provider-1", modelId: "model-1" },
      providers: { instances: [{ id: "provider-1", protocol: "openai" }] },
      modelContextWindows: { "provider-1::model-1": 100000 },
      extra: { vfsReadTokenBudgetPercent: 0.2 },
    } as any);
    expect(configuredBudget.tokenBudget).toBe(20000);
    expect(configuredBudget.projectedSafeChars).toBe(40000);

    const clampedLow = resolveVfsReadTokenBudget({
      story: { providerId: "provider-1", modelId: "model-1" },
      providers: { instances: [{ id: "provider-1", protocol: "openai" }] },
      modelContextWindows: { "provider-1::model-1": 100000 },
      extra: { vfsReadTokenBudgetPercent: 0.001 },
    } as any);
    expect(clampedLow.tokenBudget).toBe(1000);

    const clampedHigh = resolveVfsReadTokenBudget({
      story: { providerId: "provider-1", modelId: "model-1" },
      providers: { instances: [{ id: "provider-1", protocol: "openai" }] },
      modelContextWindows: { "provider-1::model-1": 100000 },
      extra: { vfsReadTokenBudgetPercent: 0.9 },
    } as any);
    expect(clampedHigh.tokenBudget).toBe(50000);

    const invalidNaN = resolveVfsReadTokenBudget({
      story: { providerId: "provider-1", modelId: "model-1" },
      providers: { instances: [{ id: "provider-1", protocol: "openai" }] },
      modelContextWindows: { "provider-1::model-1": 100000 },
      extra: { vfsReadTokenBudgetPercent: Number.NaN },
    } as any);
    expect(invalidNaN.tokenBudget).toBe(10000);
  });

  it("keeps backwards-compatible hardCapChars as conservative safe-char projection", () => {
    const fallbackCap = resolveVfsReadHardCapChars(undefined);
    expect(fallbackCap.contextWindowTokens).toBe(
      DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS,
    );
    expect(fallbackCap.tokenBudget).toBe(12800);
    expect(fallbackCap.hardCapChars).toBe(25600);

    const overriddenCap = resolveVfsReadHardCapChars({
      story: { providerId: "provider-1", modelId: "model-1" },
      providers: { instances: [{ id: "provider-1", protocol: "openai" }] },
      modelContextWindows: { "provider-1::model-1": 100000 },
    } as any);
    expect(overriddenCap.contextWindowTokens).toBe(100000);
    expect(overriddenCap.tokenBudget).toBe(10000);
    expect(overriddenCap.hardCapChars).toBe(20000);
    expect(overriddenCap.calibrationFactor).toBe(1);
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

  it("adjusts estimator by provider/model from reported prompt-token history", () => {
    const settings = {
      story: { providerId: "provider-1", modelId: "model-1" },
      providers: { instances: [{ id: "provider-1", protocol: "openai" }] },
      modelContextWindows: { "provider-1::model-1": 50000 },
    } as any;
    const baseline = resolveVfsReadTokenBudget(settings);

    for (let i = 0; i < 12; i += 1) {
      recordPromptTokenCalibrationSample({
        providerProtocol: "openai",
        modelId: "model-1",
        reportedPromptTokens: 1200,
        estimatedPromptTokens: 1000,
        usageReported: true,
      });
    }

    const snapshot = getPromptTokenCalibrationSnapshot({
      providerProtocol: "openai",
      modelId: "model-1",
    });
    expect(snapshot?.sampleCount).toBe(12);

    const calibrated = resolveVfsReadTokenBudget(settings);
    expect(calibrated.calibrationFactor).toBeGreaterThan(1);
    expect(calibrated.projectedSafeChars).toBeLessThan(
      baseline.projectedSafeChars,
    );

    const content = "a".repeat(1000);
    const baseTokens = estimateTokensForMixedText(content);
    const calibratedTokens = estimateTokensForMixedText(content, {
      calibrationFactor: calibrated.calibrationFactor,
    });
    expect(calibratedTokens).toBeGreaterThan(baseTokens);
  });

  it("ignores non-reported or tiny samples for calibration", () => {
    recordPromptTokenCalibrationSample({
      providerProtocol: "openai",
      modelId: "model-1",
      reportedPromptTokens: 1000,
      estimatedPromptTokens: 1000,
      usageReported: false,
    });
    recordPromptTokenCalibrationSample({
      providerProtocol: "openai",
      modelId: "model-1",
      reportedPromptTokens: 12,
      estimatedPromptTokens: 12,
      usageReported: true,
    });

    const snapshot = getPromptTokenCalibrationSnapshot({
      providerProtocol: "openai",
      modelId: "model-1",
    });
    expect(snapshot).toBeNull();
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

  it("accepts threshold input only from provider-reported usage", () => {
    expect(
      resolveProviderReportedPromptTokens({
        promptTokens: 1200,
        reported: true,
      }),
    ).toBe(1200);
    expect(
      resolveProviderReportedPromptTokens({
        promptTokens: 1200,
        reported: false,
      }),
    ).toBeNull();
    expect(
      resolveProviderReportedPromptTokens({
        promptTokens: 0,
        reported: true,
      }),
    ).toBeNull();
    expect(resolveProviderReportedPromptTokens(undefined)).toBeNull();
  });
});
