import { describe, expect, it } from "vitest";
import type { AISettings, ModelInfo } from "../types";
import {
  DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS,
  applyDefaultContextWindowsToModels,
  buildModelContextWindowKey,
  deriveLearnedContextWindowFromOverflow,
  getCopyableModelContextWindowDefaults,
  parseContextOverflowDiagnostics,
  relaxLearnedContextWindowOnSuccess,
  resolveModelContextWindowTokens,
  upsertLearnedModelContextWindow,
} from "./modelContextWindows";

describe("modelContextWindows", () => {
  const withContextWindows = (
    modelContextWindows: Record<string, number>,
    learnedModelContextWindows?: Record<string, number>,
  ): AISettings =>
    ({
      modelContextWindows,
      learnedModelContextWindows,
    }) as unknown as AISettings;

  it("builds normalized provider-model key", () => {
    expect(buildModelContextWindowKey("provider-1", "GPT-4.1")).toBe(
      "provider-1::gpt-4.1",
    );
  });

  it("caps learned value by current system upper bound", () => {
    const resolvedWithProviderCap = resolveModelContextWindowTokens({
      settings: withContextWindows({}, { "provider-1::gpt-4.1": 9999999 }),
      providerId: "provider-1",
      providerProtocol: "openai",
      modelId: "gpt-4.1",
      providerReportedContextLength: 777777,
      fallback: DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS,
    });

    expect(resolvedWithProviderCap).toEqual({
      value: 777777,
      source: "settings.learnedModelContextWindows",
    });
  });

  it("resolves precedence: manual override > learned > provider metadata > defaults > fallback", () => {
    const settings = withContextWindows({
      "provider-1::gpt-4.1": 888888,
    });

    const resolvedWithOverride = resolveModelContextWindowTokens({
      settings,
      providerId: "provider-1",
      providerProtocol: "openai",
      modelId: "gpt-4.1",
      providerReportedContextLength: 777777,
      fallback: DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS,
    });

    expect(resolvedWithOverride).toEqual({
      value: 888888,
      source: "settings.modelContextWindows",
    });

    const resolvedWithLearned = resolveModelContextWindowTokens({
      settings: withContextWindows({}, { "provider-1::gpt-4.1": 666666 }),
      providerId: "provider-1",
      providerProtocol: "openai",
      modelId: "gpt-4.1",
      providerReportedContextLength: 777777,
      fallback: DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS,
    });

    expect(resolvedWithLearned).toEqual({
      value: 666666,
      source: "settings.learnedModelContextWindows",
    });

    const resolvedWithMetadata = resolveModelContextWindowTokens({
      settings: withContextWindows({}),
      providerId: "provider-1",
      providerProtocol: "openai",
      modelId: "gpt-4.1",
      providerReportedContextLength: 777777,
      fallback: DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS,
    });

    expect(resolvedWithMetadata).toEqual({
      value: 777777,
      source: "provider.modelMetadata",
    });

    const resolvedWithDefaults = resolveModelContextWindowTokens({
      settings: withContextWindows({}),
      providerId: "provider-1",
      providerProtocol: "openai",
      modelId: "gpt-4.1",
      fallback: DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS,
    });

    expect(resolvedWithDefaults).toEqual({
      value: 1047576,
      source: "defaults.modelMap",
    });

    const resolvedFallback = resolveModelContextWindowTokens({
      settings: withContextWindows({}),
      providerId: "provider-1",
      providerProtocol: "openrouter",
      modelId: "unknown-model",
      fallback: DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS,
    });

    expect(resolvedFallback).toEqual({
      value: DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS,
      source: "fallback.default",
    });
  });

  it("applies default context window to models without metadata", () => {
    const models: ModelInfo[] = [
      { id: "gpt-4.1", name: "gpt-4.1" },
      { id: "gpt-4o", name: "gpt-4o", contextLength: 99999 },
    ];

    const patched = applyDefaultContextWindowsToModels("openai", models);

    expect(patched[0].contextLength).toBe(1047576);
    expect(patched[1].contextLength).toBe(99999);
  });

  it("exposes copyable default mapping", () => {
    const defaults = getCopyableModelContextWindowDefaults();
    expect(defaults["openai/gpt-4.1"]).toBe(1047576);
    expect(defaults["claude/claude-sonnet-4-20250514"]).toBe(200000);
  });

  it("parses overflow diagnostics and derives learned window", () => {
    const parsed = parseContextOverflowDiagnostics(
      new Error(
        "maximum context length is 128,000 tokens, however you requested 145,321 tokens",
      ),
    );

    expect(parsed).toEqual({
      requestedTokens: 145321,
      limitTokens: 128000,
    });

    expect(deriveLearnedContextWindowFromOverflow(parsed)).toBe(115200);
  });

  it("clamps learned upsert to provided upper bound", () => {
    const key = "provider-1::gpt-4.1";

    const inserted = upsertLearnedModelContextWindow(
      {},
      "provider-1",
      "gpt-4.1",
      900000,
      200000,
    );
    expect(inserted[key]).toBe(200000);

    const keptLower = upsertLearnedModelContextWindow(
      inserted,
      "provider-1",
      "gpt-4.1",
      300000,
      400000,
    );
    expect(keptLower[key]).toBe(200000);
  });

  it("derives learned window from requested tokens when limit is missing", () => {
    const parsed = parseContextOverflowDiagnostics(
      new Error("input too long: requested 200000 tokens"),
    );

    expect(parsed).toEqual({
      requestedTokens: 200000,
      limitTokens: undefined,
    });

    expect(deriveLearnedContextWindowFromOverflow(parsed)).toBe(170000);
  });

  it("relaxes learned window gradually after success streak", () => {
    const notYet = relaxLearnedContextWindowOnSuccess({
      currentLearned: 100000,
      successStreak: 1,
      providerProtocol: "openai",
      modelId: "gpt-4.1",
      fallback: DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS,
    });

    expect(notYet).toEqual({
      nextLearned: 100000,
      nextSuccessStreak: 2,
      relaxed: false,
    });

    const relaxed = relaxLearnedContextWindowOnSuccess({
      currentLearned: 100000,
      successStreak: 2,
      providerProtocol: "openai",
      modelId: "gpt-4.1",
      fallback: DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS,
    });

    expect(relaxed.nextLearned).toBe(102000);
    expect(relaxed.nextSuccessStreak).toBe(0);
    expect(relaxed.relaxed).toBe(true);
  });

  it("clamps oversized learned value even before relax threshold", () => {
    const clamped = relaxLearnedContextWindowOnSuccess({
      currentLearned: 1200000,
      successStreak: 0,
      providerProtocol: "openai",
      modelId: "gpt-4.1",
      fallback: DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS,
    });

    // floor(1,047,576 * 0.95) = 995,197
    expect(clamped.nextLearned).toBe(995197);
    expect(clamped.nextSuccessStreak).toBe(0);
    expect(clamped.relaxed).toBe(false);
  });

  it("caps relaxed learned window under default cap", () => {
    const capped = relaxLearnedContextWindowOnSuccess({
      currentLearned: 995000,
      successStreak: 2,
      providerProtocol: "openai",
      modelId: "gpt-4.1",
      fallback: DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS,
    });

    // floor(1,047,576 * 0.95) = 995,197
    expect(capped.nextLearned).toBe(995197);
    expect(capped.relaxed).toBe(true);
  });
});
