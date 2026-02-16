import type {
  AISettings,
  ToolCallContextUsageSnapshot,
  ToolCallRecord,
} from "../../types";
import {
  resolveModelContextWindowTokens,
  type ContextWindowSource,
} from "../modelContextWindows";

export const DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS = 32_000;
export const CONTEXT_WINDOW_READ_CAP_PERCENT = 0.01;
export const APPROX_CHARS_PER_TOKEN = 4;
const DEFAULT_AUTO_COMPACT_THRESHOLD = 0.7;

const FALLBACK_RESOLUTION_SOURCE: ContextWindowSource = "fallback.default";

const toNonNegativeInt = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
};

const normalizeThreshold = (value: number | undefined): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_AUTO_COMPACT_THRESHOLD;
  }
  return Math.min(0.99, Math.max(0.01, value));
};

const resolveProviderProtocol = (
  settings: AISettings,
  providerId: string,
): AISettings["providers"]["instances"][number]["protocol"] | undefined =>
  settings.providers?.instances?.find((instance) => instance.id === providerId)
    ?.protocol;

export interface ResolvedStoryContextWindow {
  contextWindowTokens: number;
  source: ContextWindowSource;
}

export function resolveStoryContextWindow(
  settings: AISettings | undefined,
  options?: {
    fallbackTokens?: number;
    providerReportedContextLength?: number;
  },
): ResolvedStoryContextWindow {
  const fallbackTokens =
    options?.fallbackTokens ?? DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS;
  const providerId = settings?.story?.providerId;
  const modelId = settings?.story?.modelId;

  if (!settings || !providerId || !modelId) {
    return {
      contextWindowTokens: fallbackTokens,
      source: FALLBACK_RESOLUTION_SOURCE,
    };
  }

  const providerProtocol = resolveProviderProtocol(settings, providerId);
  const resolution = resolveModelContextWindowTokens({
    settings,
    providerId,
    providerProtocol,
    modelId,
    providerReportedContextLength: options?.providerReportedContextLength,
    fallback: fallbackTokens,
  });

  return {
    contextWindowTokens: resolution.value,
    source: resolution.source,
  };
}

export const computeReadCapCharsFromContextWindow = (
  contextWindowTokens: number,
): number =>
  Math.max(
    1,
    Math.floor(
      contextWindowTokens *
        CONTEXT_WINDOW_READ_CAP_PERCENT *
        APPROX_CHARS_PER_TOKEN,
    ),
  );

export interface ResolvedVfsReadHardCap {
  hardCapChars: number;
  contextWindowTokens: number;
  source: ContextWindowSource;
}

export function resolveVfsReadHardCapChars(
  settings: AISettings | undefined,
): ResolvedVfsReadHardCap {
  const resolution = resolveStoryContextWindow(settings);
  return {
    hardCapChars: computeReadCapCharsFromContextWindow(
      resolution.contextWindowTokens,
    ),
    contextWindowTokens: resolution.contextWindowTokens,
    source: resolution.source,
  };
}

export function buildToolCallContextUsageSnapshot(params: {
  settings: AISettings | undefined;
  promptTokens: number;
  autoCompactThreshold?: number;
}): ToolCallContextUsageSnapshot {
  const resolution = resolveStoryContextWindow(params.settings);
  const contextWindowTokens = Math.max(1, resolution.contextWindowTokens);
  const promptTokens = toNonNegativeInt(params.promptTokens);
  const autoCompactThreshold = normalizeThreshold(params.autoCompactThreshold);
  const thresholdTokens = Math.max(
    1,
    Math.floor(contextWindowTokens * autoCompactThreshold),
  );
  const usageRatio = promptTokens / contextWindowTokens;
  const tokensToThreshold = Math.max(0, thresholdTokens - promptTokens);

  return {
    promptTokens,
    contextWindowTokens,
    usageRatio,
    autoCompactThreshold,
    thresholdTokens,
    tokensToThreshold,
    source: resolution.source,
  };
}

export function pickLatestToolCallContextUsage(
  calls: ToolCallRecord[] | undefined,
): ToolCallContextUsageSnapshot | null {
  if (!Array.isArray(calls) || calls.length === 0) {
    return null;
  }

  for (let i = calls.length - 1; i >= 0; i -= 1) {
    const usage = calls[i]?.contextUsage;
    if (usage) {
      return usage;
    }
  }

  return null;
}
