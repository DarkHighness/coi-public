import type {
  AISettings,
  ToolCallContextUsageSnapshot,
  ToolCallRecord,
} from "../../types";
import {
  DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS,
  resolveModelContextWindowTokens,
  type ContextWindowSource,
} from "../modelContextWindows";

export { DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS };
export const CONTEXT_WINDOW_READ_CAP_PERCENT = 0.1;
export const CONTEXT_WINDOW_READ_CAP_PERCENT_MIN = 0.01;
export const CONTEXT_WINDOW_READ_CAP_PERCENT_MAX = 0.5;
export const READ_CAP_SAFE_CHARS_PER_TOKEN_HINT = 2;
const MIN_CALIBRATION_PROMPT_TOKENS = 32;
const CALIBRATION_EMA_ALPHA = 0.2;
const CALIBRATION_RATIO_MIN = 0.85;
const CALIBRATION_RATIO_MAX = 1.15;
const CALIBRATION_MIN_SAMPLES_TO_APPLY = 8;
const CALIBRATION_WARMUP_SAMPLES = 6;

const ASCII_ALNUM_TOKEN_WEIGHT = 0.28;
const ASCII_PUNCT_TOKEN_WEIGHT = 0.2;
const ASCII_WHITESPACE_TOKEN_WEIGHT = 0.08;
const CJK_TOKEN_WEIGHT = 1.05;
const EMOJI_TOKEN_WEIGHT = 1.8;
const OTHER_UNICODE_TOKEN_WEIGHT = 0.7;
const ESTIMATOR_NON_EMPTY_OVERHEAD_TOKENS = 1;
const DEFAULT_AUTO_COMPACT_THRESHOLD = 0.7;
export const AUTO_QUERY_DANGER_THRESHOLD = 0.9;

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

interface PromptTokenCalibrationRecord {
  sampleCount: number;
  emaRatio: number;
  reportedPromptTokensSum: number;
  estimatedPromptTokensSum: number;
  updatedAt: number;
}

const promptTokenCalibrationByModel = new Map<
  string,
  PromptTokenCalibrationRecord
>();

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const normalizeReadCapPercent = (value: number | undefined): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return CONTEXT_WINDOW_READ_CAP_PERCENT;
  }
  return clamp(
    value,
    CONTEXT_WINDOW_READ_CAP_PERCENT_MIN,
    CONTEXT_WINDOW_READ_CAP_PERCENT_MAX,
  );
};

const toCalibrationKey = (
  providerProtocol: string | null | undefined,
  modelId: string | null | undefined,
): string | null => {
  const protocol =
    typeof providerProtocol === "string" ? providerProtocol.trim() : "";
  const model = typeof modelId === "string" ? modelId.trim() : "";
  if (!protocol || !model) {
    return null;
  }
  return `${protocol}::${model}`;
};

const getCalibrationFactor = (
  providerProtocol: string | null | undefined,
  modelId: string | null | undefined,
): number => {
  const key = toCalibrationKey(providerProtocol, modelId);
  if (!key) return 1;
  const record = promptTokenCalibrationByModel.get(key);
  if (!record) return 1;
  if (record.sampleCount < CALIBRATION_MIN_SAMPLES_TO_APPLY) return 1;
  const warmup = clamp(
    (record.sampleCount - CALIBRATION_MIN_SAMPLES_TO_APPLY + 1) /
      CALIBRATION_WARMUP_SAMPLES,
    0,
    1,
  );
  return 1 + (record.emaRatio - 1) * warmup;
};

const isAsciiAlnum = (codePoint: number): boolean =>
  (codePoint >= 0x30 && codePoint <= 0x39) ||
  (codePoint >= 0x41 && codePoint <= 0x5a) ||
  (codePoint >= 0x61 && codePoint <= 0x7a);

const isAsciiWhitespace = (codePoint: number): boolean =>
  codePoint === 0x20 ||
  codePoint === 0x09 ||
  codePoint === 0x0a ||
  codePoint === 0x0d ||
  codePoint === 0x0b ||
  codePoint === 0x0c;

const isCombiningMark = (codePoint: number): boolean =>
  (codePoint >= 0x0300 && codePoint <= 0x036f) ||
  (codePoint >= 0x1ab0 && codePoint <= 0x1aff) ||
  (codePoint >= 0x1dc0 && codePoint <= 0x1dff) ||
  (codePoint >= 0x20d0 && codePoint <= 0x20ff) ||
  (codePoint >= 0xfe20 && codePoint <= 0xfe2f);

const isVariationSelector = (codePoint: number): boolean =>
  (codePoint >= 0xfe00 && codePoint <= 0xfe0f) ||
  (codePoint >= 0xe0100 && codePoint <= 0xe01ef);

const isCjkCodePoint = (codePoint: number): boolean =>
  (codePoint >= 0x4e00 && codePoint <= 0x9fff) ||
  (codePoint >= 0x3400 && codePoint <= 0x4dbf) ||
  (codePoint >= 0x20000 && codePoint <= 0x2a6df) ||
  (codePoint >= 0x2a700 && codePoint <= 0x2b73f) ||
  (codePoint >= 0x2b740 && codePoint <= 0x2b81f) ||
  (codePoint >= 0x2b820 && codePoint <= 0x2ceaf) ||
  (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
  (codePoint >= 0x3040 && codePoint <= 0x30ff) ||
  (codePoint >= 0x31f0 && codePoint <= 0x31ff) ||
  (codePoint >= 0xac00 && codePoint <= 0xd7af) ||
  (codePoint >= 0x1100 && codePoint <= 0x11ff);

const isEmojiCodePoint = (codePoint: number): boolean =>
  (codePoint >= 0x1f300 && codePoint <= 0x1f5ff) ||
  (codePoint >= 0x1f600 && codePoint <= 0x1f64f) ||
  (codePoint >= 0x1f680 && codePoint <= 0x1f6ff) ||
  (codePoint >= 0x1f700 && codePoint <= 0x1f77f) ||
  (codePoint >= 0x1f780 && codePoint <= 0x1f7ff) ||
  (codePoint >= 0x1f800 && codePoint <= 0x1f8ff) ||
  (codePoint >= 0x1f900 && codePoint <= 0x1f9ff) ||
  (codePoint >= 0x1fa70 && codePoint <= 0x1faff) ||
  (codePoint >= 0x2600 && codePoint <= 0x27bf);

const estimateCodePointTokens = (codePoint: number): number => {
  if (
    isCombiningMark(codePoint) ||
    isVariationSelector(codePoint) ||
    codePoint === 0x200d
  ) {
    return 0;
  }
  if (codePoint <= 0x7f) {
    if (isAsciiWhitespace(codePoint)) return ASCII_WHITESPACE_TOKEN_WEIGHT;
    if (isAsciiAlnum(codePoint)) return ASCII_ALNUM_TOKEN_WEIGHT;
    return ASCII_PUNCT_TOKEN_WEIGHT;
  }
  if (isCjkCodePoint(codePoint)) {
    return CJK_TOKEN_WEIGHT;
  }
  if (isEmojiCodePoint(codePoint)) {
    return EMOJI_TOKEN_WEIGHT;
  }
  return OTHER_UNICODE_TOKEN_WEIGHT;
};

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

export const computeReadTokenBudgetFromContextWindow = (
  contextWindowTokens: number,
  readCapPercent: number = CONTEXT_WINDOW_READ_CAP_PERCENT,
): number =>
  Math.max(
    1,
    Math.floor(contextWindowTokens * normalizeReadCapPercent(readCapPercent)),
  );

export const estimateSafeCharsFromTokenBudget = (tokenBudget: number): number =>
  Math.max(
    1,
    Math.floor(Math.max(1, tokenBudget) * READ_CAP_SAFE_CHARS_PER_TOKEN_HINT),
  );

const normalizeCalibrationFactor = (factor: number | undefined): number => {
  if (typeof factor !== "number" || !Number.isFinite(factor)) {
    return 1;
  }
  return clamp(factor, CALIBRATION_RATIO_MIN, CALIBRATION_RATIO_MAX);
};

export const estimateTokensForMixedText = (
  content: string,
  options?: { calibrationFactor?: number },
): number => {
  if (!content) {
    return 0;
  }

  let weightedTokens = 0;

  for (let i = 0; i < content.length; ) {
    const codePoint = content.codePointAt(i);
    if (typeof codePoint !== "number") {
      i += 1;
      continue;
    }
    weightedTokens += estimateCodePointTokens(codePoint);
    i += codePoint > 0xffff ? 2 : 1;
  }

  const calibrationFactor = normalizeCalibrationFactor(
    options?.calibrationFactor,
  );

  return Math.max(
    1,
    Math.ceil(
      (weightedTokens + ESTIMATOR_NON_EMPTY_OVERHEAD_TOKENS) *
        calibrationFactor,
    ),
  );
};

export const computeReadCapCharsFromContextWindow = (
  contextWindowTokens: number,
): number =>
  estimateSafeCharsFromTokenBudget(
    computeReadTokenBudgetFromContextWindow(contextWindowTokens),
  );

export interface ResolvedVfsReadHardCap {
  hardCapChars: number;
  tokenBudget: number;
  calibrationFactor: number;
  contextWindowTokens: number;
  source: ContextWindowSource;
}

export interface ResolvedVfsReadTokenBudget {
  tokenBudget: number;
  projectedSafeChars: number;
  calibrationFactor: number;
  contextWindowTokens: number;
  source: ContextWindowSource;
}

export function resolveVfsReadTokenBudget(
  settings: AISettings | undefined,
): ResolvedVfsReadTokenBudget {
  const resolution = resolveStoryContextWindow(settings);
  const providerId = settings?.story?.providerId;
  const modelId = settings?.story?.modelId;
  const providerProtocol =
    settings && providerId
      ? resolveProviderProtocol(settings, providerId)
      : undefined;
  const calibrationFactor = getCalibrationFactor(providerProtocol, modelId);
  const normalizedReadCapPercent = normalizeReadCapPercent(
    settings?.extra?.vfsReadTokenBudgetPercent,
  );
  const tokenBudget = computeReadTokenBudgetFromContextWindow(
    resolution.contextWindowTokens,
    normalizedReadCapPercent,
  );
  const projectedSafeChars = Math.max(
    1,
    Math.floor(
      estimateSafeCharsFromTokenBudget(tokenBudget) /
        normalizeCalibrationFactor(calibrationFactor),
    ),
  );
  return {
    tokenBudget,
    projectedSafeChars,
    calibrationFactor,
    contextWindowTokens: resolution.contextWindowTokens,
    source: resolution.source,
  };
}

export function resolveVfsReadHardCapChars(
  settings: AISettings | undefined,
): ResolvedVfsReadHardCap {
  const resolution = resolveVfsReadTokenBudget(settings);
  return {
    hardCapChars: resolution.projectedSafeChars,
    tokenBudget: resolution.tokenBudget,
    calibrationFactor: resolution.calibrationFactor,
    contextWindowTokens: resolution.contextWindowTokens,
    source: resolution.source,
  };
}

export function recordPromptTokenCalibrationSample(params: {
  providerProtocol: string | null | undefined;
  modelId: string | null | undefined;
  reportedPromptTokens: number;
  estimatedPromptTokens: number;
  usageReported?: boolean;
}): void {
  if (params.usageReported === false) {
    return;
  }

  const reportedPromptTokens = toNonNegativeInt(params.reportedPromptTokens);
  const estimatedPromptTokens = toNonNegativeInt(params.estimatedPromptTokens);
  if (
    reportedPromptTokens < MIN_CALIBRATION_PROMPT_TOKENS ||
    estimatedPromptTokens < MIN_CALIBRATION_PROMPT_TOKENS
  ) {
    return;
  }

  const key = toCalibrationKey(params.providerProtocol, params.modelId);
  if (!key) {
    return;
  }

  const ratio = clamp(
    reportedPromptTokens / Math.max(1, estimatedPromptTokens),
    CALIBRATION_RATIO_MIN,
    CALIBRATION_RATIO_MAX,
  );

  const current = promptTokenCalibrationByModel.get(key);
  const nextSampleCount = (current?.sampleCount ?? 0) + 1;
  const nextEmaRatio = current
    ? current.emaRatio * (1 - CALIBRATION_EMA_ALPHA) +
      ratio * CALIBRATION_EMA_ALPHA
    : ratio;

  promptTokenCalibrationByModel.set(key, {
    sampleCount: nextSampleCount,
    emaRatio: nextEmaRatio,
    reportedPromptTokensSum:
      (current?.reportedPromptTokensSum ?? 0) + reportedPromptTokens,
    estimatedPromptTokensSum:
      (current?.estimatedPromptTokensSum ?? 0) + estimatedPromptTokens,
    updatedAt: Date.now(),
  });
}

export function getPromptTokenCalibrationSnapshot(params: {
  providerProtocol: string | null | undefined;
  modelId: string | null | undefined;
}): PromptTokenCalibrationRecord | null {
  const key = toCalibrationKey(params.providerProtocol, params.modelId);
  if (!key) return null;
  return promptTokenCalibrationByModel.get(key) ?? null;
}

export function resetPromptTokenCalibrationForTests(): void {
  promptTokenCalibrationByModel.clear();
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
