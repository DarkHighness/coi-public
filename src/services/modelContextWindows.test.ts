import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AISettings, ModelInfo } from "../types";
import {
  __resetOpenRouterContextLookupCacheForTests,
  DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS,
  applyDefaultContextWindowsToModels,
  buildModelContextWindowKey,
  deriveLearnedContextWindowFromOverflow,
  getCopyableModelContextWindowDefaults,
  parseContextOverflowDiagnostics,
  relaxLearnedContextWindowOnSuccess,
  resolveModelContextLengthFromModelInfos,
  resolveOpenRouterContextLengthFromModelInfos,
  resolveModelContextWindowTokens,
  resolveModelContextWindowTokensWithLookup,
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

  beforeEach(() => {
    __resetOpenRouterContextLookupCacheForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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

  it("maps OpenRouter upstream Gemini defaults when provider metadata is missing", () => {
    const resolved = resolveModelContextWindowTokens({
      settings: withContextWindows({}),
      providerId: "provider-1",
      providerProtocol: "openrouter",
      modelId: "google/gemini-3-flash-preview",
      fallback: DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS,
    });

    expect(resolved).toEqual({
      value: 1048576,
      source: "defaults.modelMap",
    });
  });

  it("supports OpenRouter canonical Gemini date-suffixed model IDs", () => {
    const resolved = resolveModelContextWindowTokens({
      settings: withContextWindows({}),
      providerId: "provider-1",
      providerProtocol: "openrouter",
      modelId: "google/gemini-3-flash-preview-20251217",
      fallback: DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS,
    });

    expect(resolved).toEqual({
      value: 1048576,
      source: "defaults.modelMap",
    });
  });

  it("fuzzy-resolves OpenRouter context length from loaded model infos", () => {
    const contextLength = resolveOpenRouterContextLengthFromModelInfos(
      "google/gemini-3-flash-preview",
      [
        {
          id: "google/gemini-3-flash-preview-20251217",
          name: "Google: Gemini 3 Flash Preview",
          contextLength: 1048576,
        },
        {
          id: "google/gemini-2.5-flash-lite",
          name: "Google: Gemini 2.5 Flash Lite",
          contextLength: 1048576,
        },
      ],
    );

    expect(contextLength).toBe(1048576);
  });

  it("fuzzy-resolves context length from non-OpenRouter loaded model infos", () => {
    const contextLength = resolveModelContextLengthFromModelInfos(
      "gpt-4o-latest",
      [
        {
          id: "gpt-4o-mini",
          name: "gpt-4o-mini",
          contextLength: 128000,
        },
        {
          id: "gpt-4o-latest-2026-01-17",
          name: "gpt-4o-latest",
          contextLength: 262144,
        },
      ],
    );

    expect(contextLength).toBe(262144);
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

  it("preserves provider metadata priority over OpenRouter lookup", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: [{ id: "openai/gpt-5", context_length: 400000 }],
      }),
    }));
    vi.stubGlobal("fetch", fetchMock as any);

    const resolved = await resolveModelContextWindowTokensWithLookup({
      settings: withContextWindows({}),
      providerId: "provider-1",
      providerProtocol: "openrouter",
      modelId: "openai/gpt-5",
      providerReportedContextLength: 222222,
      providerApiKey: "or-key",
      fallback: DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS,
    });

    expect(resolved).toEqual({
      value: 222222,
      source: "provider.modelMetadata",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("prioritizes user override before any OpenRouter lookup", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: [{ id: "openai/gpt-5", context_length: 400000 }],
      }),
    }));
    vi.stubGlobal("fetch", fetchMock as any);

    const resolved = await resolveModelContextWindowTokensWithLookup({
      settings: withContextWindows({ "provider-1::openai/gpt-5": 333333 }),
      providerId: "provider-1",
      providerProtocol: "openrouter",
      modelId: "openai/gpt-5",
      providerApiKey: "or-key",
      fallback: DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS,
    });

    expect(resolved).toEqual({
      value: 333333,
      source: "settings.modelContextWindows",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("matches OpenRouter /v1/models with fuzzy best-match selection", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url === "https://openrouter.ai/api/v1/models") {
          return {
            ok: true,
            json: async () => ({
              data: [
                {
                  id: "openai/gpt-4o-mini-latest",
                  context_length: 128000,
                },
                {
                  id: "openai/gpt-4o-latest-2026-01-17",
                  context_length: 262144,
                },
              ],
            }),
          };
        }
        return { ok: false, status: 404 };
      }) as any,
    );

    const resolved = await resolveModelContextWindowTokensWithLookup({
      settings: withContextWindows({}),
      providerId: "provider-1",
      providerProtocol: "openrouter",
      modelId: "openai/gpt-4o-latest",
      providerApiKey: "or-key",
      fallback: DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS,
    });

    expect(resolved).toEqual({
      value: 262144,
      source: "provider.modelMetadata",
    });
  });

  it("falls back to static OpenRouter catalog when /v1/models is unavailable", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "https://openrouter.ai/api/v1/models") {
        return { ok: false, status: 503 };
      }
      if (url === "/resources/openrouter_models.json") {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                id: "anthropic/claude-sonnet-4-5-20250929",
                context_length: 200000,
              },
            ],
          }),
        };
      }
      return { ok: false, status: 404 };
    });
    vi.stubGlobal("fetch", fetchMock as any);

    const resolved = await resolveModelContextWindowTokensWithLookup({
      settings: withContextWindows({}),
      providerId: "provider-1",
      providerProtocol: "openrouter",
      modelId: "anthropic/claude-sonnet-4-5",
      providerApiKey: "or-key",
      fallback: DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS,
    });

    expect(resolved).toEqual({
      value: 200000,
      source: "provider.modelMetadata",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/models",
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenCalledWith("/resources/openrouter_models.json");
  });

  it("uses OpenRouter catalog lookup even when provider is not openrouter", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "https://openrouter.ai/api/v1/models") {
        expect(init?.headers).toEqual(
          expect.objectContaining({
            Authorization: "Bearer or-key",
          }),
        );
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                id: "google/gemini-3-flash-preview-20251217",
                context_length: 1048576,
              },
            ],
          }),
        };
      }
      return { ok: false, status: 404 };
    });
    vi.stubGlobal("fetch", fetchMock as any);

    const settings = {
      ...withContextWindows({}),
      providers: {
        instances: [
          {
            id: "provider-or",
            name: "OpenRouter",
            protocol: "openrouter",
            baseUrl: "https://openrouter.ai/api/v1",
            apiKey: "or-key",
            enabled: true,
            createdAt: 0,
            lastModified: 0,
          },
        ],
        nextId: 2,
      },
    } as unknown as AISettings;

    const resolved = await resolveModelContextWindowTokensWithLookup({
      settings,
      providerId: "provider-1",
      providerProtocol: "openai",
      modelId: "google/gemini-3-flash-preview",
      providerApiKey: "non-or-key",
      fallback: DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS,
    });

    expect(resolved).toEqual({
      value: 1048576,
      source: "provider.modelMetadata",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/models",
      expect.any(Object),
    );
  });
});
