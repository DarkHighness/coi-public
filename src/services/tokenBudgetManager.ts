import type { ProviderProtocol } from "../types";
import {
  DEFAULT_PROTOCOL_MAX_OUTPUT_FALLBACK_TOKENS,
  MIN_RECOMMENDED_OUTPUT_FALLBACK_TOKENS,
  getDefaultModelMaxOutputTokens,
  isLowOutputFallbackSetting,
  sanitizePositiveOutputTokens,
} from "./modelOutputTokens";
import {
  resolveContextBoundMaxOutputTokens,
  resolveContextWindowTokensForBudget,
} from "./outputTokenBudget";
import type { TokenBudgetConfig } from "./tokenBudget";
import { isClaudeModel, isGeminiModel } from "./zodCompiler";

type RoutedProviderProtocol = "openai" | "gemini" | "claude";

const warnedLowFallbacks = new Set<string>();

const shouldInjectMaxOutputTokens = (
  tokenBudget?: TokenBudgetConfig,
): boolean => tokenBudget?.providerManagedMaxTokens === false;

const normalizeModelId = (modelId: string): string => {
  const trimmed = modelId.trim().toLowerCase();
  if (!trimmed) return trimmed;
  const slashIndex = trimmed.lastIndexOf("/");
  return slashIndex >= 0 ? trimmed.slice(slashIndex + 1) : trimmed;
};

const resolveRoutedProviderProtocol = (
  providerProtocol: ProviderProtocol,
  modelId: string,
): RoutedProviderProtocol => {
  if (providerProtocol === "gemini") return "gemini";
  if (providerProtocol === "claude") return "claude";

  const normalizedModel = normalizeModelId(modelId);

  if (providerProtocol === "openai") {
    if (isClaudeModel(modelId) || isClaudeModel(normalizedModel)) {
      return "claude";
    }
    if (isGeminiModel(modelId) || isGeminiModel(normalizedModel)) {
      return "gemini";
    }
    return "openai";
  }

  const lower = modelId.trim().toLowerCase();
  if (
    lower.startsWith("anthropic/") ||
    isClaudeModel(modelId) ||
    isClaudeModel(normalizedModel)
  ) {
    return "claude";
  }
  if (
    lower.startsWith("google/") ||
    isGeminiModel(modelId) ||
    isGeminiModel(normalizedModel)
  ) {
    return "gemini";
  }
  return "openai";
};

const applyConfiguredHardCap = (
  maxOutputTokens: number,
  tokenBudget?: TokenBudgetConfig,
): number => {
  const hardCap = sanitizePositiveOutputTokens(
    tokenBudget?.maxOutputTokensHardCap,
  );
  if (!hardCap) {
    return maxOutputTokens;
  }
  return Math.max(1, Math.min(maxOutputTokens, hardCap));
};

const resolveModelMaxOutputTokens = (params: {
  providerProtocol: ProviderProtocol;
  modelId: string;
  tokenBudget?: TokenBudgetConfig;
}): {
  resolvedProviderProtocol: RoutedProviderProtocol;
  normalizedModelId: string;
  maxOutputTokens: number;
} => {
  const resolvedProviderProtocol = resolveRoutedProviderProtocol(
    params.providerProtocol,
    params.modelId,
  );
  const normalizedModelId = normalizeModelId(params.modelId);

  const mapped =
    getDefaultModelMaxOutputTokens(
      resolvedProviderProtocol,
      normalizedModelId,
    ) ||
    getDefaultModelMaxOutputTokens(resolvedProviderProtocol, params.modelId);
  if (mapped) {
    return {
      resolvedProviderProtocol,
      normalizedModelId,
      maxOutputTokens: applyConfiguredHardCap(mapped, params.tokenBudget),
    };
  }

  const configuredFallback = sanitizePositiveOutputTokens(
    params.tokenBudget?.maxOutputTokensFallback,
  );
  if (configuredFallback) {
    if (isLowOutputFallbackSetting(configuredFallback)) {
      const warningKey = [
        params.providerProtocol,
        resolvedProviderProtocol,
        normalizedModelId,
        configuredFallback,
      ].join(":");
      if (!warnedLowFallbacks.has(warningKey)) {
        warnedLowFallbacks.add(warningKey);
        console.warn(
          `[TokenBudget] maxOutputTokensFallback=${configuredFallback} is below recommended ${MIN_RECOMMENDED_OUTPUT_FALLBACK_TOKENS}; low values can truncate responses and break game flow.`,
        );
      }
    }
    return {
      resolvedProviderProtocol,
      normalizedModelId,
      maxOutputTokens: applyConfiguredHardCap(
        configuredFallback,
        params.tokenBudget,
      ),
    };
  }

  return {
    resolvedProviderProtocol,
    normalizedModelId,
    maxOutputTokens: applyConfiguredHardCap(
      DEFAULT_PROTOCOL_MAX_OUTPUT_FALLBACK_TOKENS[resolvedProviderProtocol],
      params.tokenBudget,
    ),
  };
};

export interface ResolveTokenBudgetParams {
  providerProtocol: ProviderProtocol;
  modelId: string;
  tokenBudget?: TokenBudgetConfig;
  systemInstruction?: string;
  messages?: unknown;
  tools?: unknown;
  schema?: unknown;
  safetyMarginTokens?: number;
}

export interface TokenBudgetResolution {
  resolvedProviderProtocol: RoutedProviderProtocol;
  normalizedModelId: string;
  contextWindowTokens: number;
  modelMaxOutputTokens: number;
  maxOutputTokens: number;
  shouldInjectMaxOutputTokens: boolean;
}

export const resolveTokenBudget = (
  params: ResolveTokenBudgetParams,
): TokenBudgetResolution => {
  const modelOutput = resolveModelMaxOutputTokens({
    providerProtocol: params.providerProtocol,
    modelId: params.modelId,
    tokenBudget: params.tokenBudget,
  });
  const resolvedModelId = modelOutput.normalizedModelId || params.modelId;
  const contextWindowTokens = resolveContextWindowTokensForBudget({
    providerProtocol: modelOutput.resolvedProviderProtocol,
    modelId: resolvedModelId,
    tokenBudget: params.tokenBudget,
  });
  const maxOutputTokens = resolveContextBoundMaxOutputTokens({
    providerProtocol: modelOutput.resolvedProviderProtocol,
    modelId: resolvedModelId,
    maxOutputTokens: modelOutput.maxOutputTokens,
    tokenBudget: {
      ...(params.tokenBudget || {}),
      contextWindowTokens,
    },
    systemInstruction: params.systemInstruction,
    messages: params.messages,
    tools: params.tools,
    schema: params.schema,
    safetyMarginTokens: params.safetyMarginTokens,
  });

  return {
    resolvedProviderProtocol: modelOutput.resolvedProviderProtocol,
    normalizedModelId: modelOutput.normalizedModelId,
    contextWindowTokens,
    modelMaxOutputTokens: modelOutput.maxOutputTokens,
    maxOutputTokens,
    shouldInjectMaxOutputTokens: shouldInjectMaxOutputTokens(
      params.tokenBudget,
    ),
  };
};
