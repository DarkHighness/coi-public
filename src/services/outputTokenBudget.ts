import type { ProviderProtocol } from "../types";
import type { TokenBudgetConfig } from "./tokenBudget";
import {
  DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS,
  getDefaultModelContextWindow,
} from "./modelContextWindows";
import { estimateTokensForMixedText } from "./ai/contextUsage";

const DEFAULT_OUTPUT_TOKEN_SAFETY_MARGIN = 2_048;
const CONTAINER_OVERHEAD_TOKENS = 1;
const ARRAY_ITEM_OVERHEAD_TOKENS = 1;
const OBJECT_ENTRY_OVERHEAD_TOKENS = 2;
const MAX_ESTIMATE_DEPTH = 24;
const DEEP_VALUE_FALLBACK_TOKENS = 64;

const sanitizePositiveInt = (value: unknown): number | undefined => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : undefined;
};

const normalizeModelId = (modelId: string): string =>
  modelId.trim().toLowerCase();

const estimateTokensFromUnknown = (
  value: unknown,
  seen: WeakSet<object>,
  depth: number,
): number => {
  if (value === null || value === undefined) {
    return 0;
  }

  if (depth > MAX_ESTIMATE_DEPTH) {
    return DEEP_VALUE_FALLBACK_TOKENS;
  }

  if (typeof value === "string") {
    return estimateTokensForMixedText(value);
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return estimateTokensForMixedText(String(value));
  }

  if (typeof value !== "object") {
    return 0;
  }

  if (Array.isArray(value)) {
    let total = CONTAINER_OVERHEAD_TOKENS;
    for (const item of value) {
      total += ARRAY_ITEM_OVERHEAD_TOKENS;
      total += estimateTokensFromUnknown(item, seen, depth + 1);
    }
    return total;
  }

  const record = value as Record<string, unknown>;
  if (seen.has(record)) {
    return CONTAINER_OVERHEAD_TOKENS;
  }
  seen.add(record);

  let total = CONTAINER_OVERHEAD_TOKENS;
  for (const [key, nested] of Object.entries(record)) {
    total += OBJECT_ENTRY_OVERHEAD_TOKENS;
    total += estimateTokensForMixedText(key);
    total += estimateTokensFromUnknown(nested, seen, depth + 1);
  }
  return total;
};

const estimatePromptTokensFromPayload = (params: {
  systemInstruction?: string;
  messages?: unknown;
  tools?: unknown;
  schema?: unknown;
}): number | undefined => {
  const seen = new WeakSet<object>();
  let estimated = 0;

  if (params.systemInstruction) {
    estimated += estimateTokensForMixedText(params.systemInstruction);
  }

  estimated += estimateTokensFromUnknown(params.messages, seen, 0);
  estimated += estimateTokensFromUnknown(params.tools, seen, 0);
  estimated += estimateTokensFromUnknown(params.schema, seen, 0);

  return estimated > 0 ? estimated : undefined;
};

export const resolveContextWindowTokensForBudget = (params: {
  providerProtocol: ProviderProtocol;
  modelId: string;
  tokenBudget?: TokenBudgetConfig;
}): number => {
  const explicit = sanitizePositiveInt(params.tokenBudget?.contextWindowTokens);
  if (explicit) {
    return explicit;
  }

  const normalizedModel = normalizeModelId(params.modelId);
  const mapped =
    getDefaultModelContextWindow(params.providerProtocol, normalizedModel) ||
    getDefaultModelContextWindow(params.providerProtocol, params.modelId);

  return mapped || DEFAULT_CONTEXT_WINDOW_FALLBACK_TOKENS;
};

export interface ResolveContextBoundMaxOutputTokensParams {
  providerProtocol: ProviderProtocol;
  modelId: string;
  maxOutputTokens: number;
  tokenBudget?: TokenBudgetConfig;
  systemInstruction?: string;
  messages?: unknown;
  tools?: unknown;
  schema?: unknown;
  safetyMarginTokens?: number;
}

export const resolveContextBoundMaxOutputTokens = (
  params: ResolveContextBoundMaxOutputTokensParams,
): number => {
  const resolvedMaxOutputTokens =
    sanitizePositiveInt(params.maxOutputTokens) || 1;
  const estimatedPromptTokensFromPayload =
    sanitizePositiveInt(params.tokenBudget?.promptTokenEstimate) ||
    estimatePromptTokensFromPayload({
      systemInstruction: params.systemInstruction,
      messages: params.messages,
      tools: params.tools,
      schema: params.schema,
    });
  const promptTokens = sanitizePositiveInt(estimatedPromptTokensFromPayload);

  if (!promptTokens) {
    return resolvedMaxOutputTokens;
  }

  const contextWindowTokens = resolveContextWindowTokensForBudget({
    providerProtocol: params.providerProtocol,
    modelId: params.modelId,
    tokenBudget: params.tokenBudget,
  });
  const safetyMarginTokens =
    sanitizePositiveInt(params.safetyMarginTokens) ||
    DEFAULT_OUTPUT_TOKEN_SAFETY_MARGIN;
  const availableOutputTokens =
    contextWindowTokens - promptTokens - safetyMarginTokens;

  return Math.max(1, Math.min(resolvedMaxOutputTokens, availableOutputTokens));
};
