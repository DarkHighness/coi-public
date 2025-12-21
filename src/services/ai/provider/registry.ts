import type {
  AISettings,
  ModelInfo,
  ProviderInstance,
  ProviderProtocol,
} from "../../../types";

import type {
  GeminiConfig,
  OpenAIConfig,
  OpenRouterConfig,
  ClaudeConfig,
} from "../../providers/types";

import {
  getModels as getGeminiModels,
  validateConnection as validateGeminiConnection,
} from "../../providers/geminiProvider";

import {
  getModels as getOpenAIModels,
  validateConnection as validateOpenAIConnection,
} from "../../providers/openaiProvider";

import {
  getModels as getOpenRouterModels,
  validateConnection as validateOpenRouterConnection,
} from "../../providers/openRouterProvider";

import {
  getModels as getClaudeModels,
  validateConnection as validateClaudeConnection,
} from "../../providers/claudeProvider";

interface ModelListCacheEntry {
  timestamp: number;
  configHash: string;
  models: ModelInfo[];
}

const MODEL_LIST_CACHE: Record<string, ModelListCacheEntry> = {};
const MODEL_LIST_TTL_MS = 60 * 1000;

export type FunctionType =
  | "story"
  | "image"
  | "video"
  | "audio"
  | "translation"
  | "lore"
  | "script";

export interface ProviderConfigResult {
  instance: ProviderInstance;
  config: GeminiConfig | OpenAIConfig | OpenRouterConfig | ClaudeConfig;
  modelId: string;
  enabled: boolean;
  resolution?: string;
  thinkingEffort?:
    | "xhigh"
    | "high"
    | "medium"
    | "low"
    | "minimal"
    | "none"
    | (string & {});
  mediaResolution?: "low" | "medium" | "high";
  temperature?: number;
  topP?: number;
  topK?: number;
  minP?: number;
}

export function getProviderInstance(
  settings: AISettings,
  providerId: string,
  requireEnabled: boolean = true,
): ProviderInstance | null {
  const instance = settings.providers.instances.find(
    (p) => p.id === providerId,
  );
  if (!instance) {
    console.error(`Provider instance not found: ${providerId}`);
    return null;
  }
  if (requireEnabled && !instance.enabled) {
    console.warn(`Provider instance is disabled: ${providerId}`);
    return null;
  }
  return instance;
}

export function createProviderConfig(
  instance: ProviderInstance,
): GeminiConfig | OpenAIConfig | OpenRouterConfig | ClaudeConfig {
  switch (instance.protocol) {
    case "gemini":
      return {
        apiKey: instance.apiKey,
        baseUrl: instance.baseUrl || undefined,
      };
    case "openai":
      return {
        apiKey: instance.apiKey,
        baseUrl: instance.baseUrl,
        modelId: "",
        geminiCompatibility: instance.geminiCompatibility,
        geminiMessageFormat: instance.geminiMessageFormat,
        claudeCompatibility: instance.claudeCompatibility,
        claudeMessageFormat: instance.claudeMessageFormat,
      };
    case "openrouter":
      return {
        apiKey: instance.apiKey,
      };
    case "claude":
      return {
        apiKey: instance.apiKey,
        baseUrl: instance.baseUrl || undefined,
      };
    default:
      throw new Error(
        `Unknown protocol: ${(instance as ProviderInstance).protocol}`,
      );
  }
}

export function getProviderConfig(
  settings: AISettings,
  func: FunctionType,
): ProviderConfigResult | null {
  const funcConfig = settings[func];
  const instance = getProviderInstance(settings, funcConfig.providerId);
  if (!instance) return null;

  const config = createProviderConfig(instance);

  return {
    instance,
    config,
    modelId: funcConfig.modelId,
    enabled: funcConfig.enabled !== false,
    resolution: funcConfig.resolution,
    thinkingEffort: funcConfig.thinkingEffort,
    mediaResolution: funcConfig.mediaResolution,
    temperature: funcConfig.temperature,
    topP: funcConfig.topP,
    topK: funcConfig.topK,
    minP: funcConfig.minP,
  };
}

export async function getModelsForInstance(
  instance: ProviderInstance,
): Promise<ModelInfo[]> {
  if (!instance.apiKey || instance.apiKey.trim() === "") {
    return [];
  }

  const cacheKey = instance.id;
  const configHash = JSON.stringify({
    protocol: instance.protocol,
    baseUrl: instance.baseUrl,
  });
  const cached = MODEL_LIST_CACHE[cacheKey];
  if (
    cached &&
    cached.configHash === configHash &&
    Date.now() - cached.timestamp < MODEL_LIST_TTL_MS
  ) {
    return cached.models;
  }

  const config = createProviderConfig(instance);

  switch (instance.protocol) {
    case "gemini": {
      const models = await getGeminiModels(config as GeminiConfig);
      MODEL_LIST_CACHE[cacheKey] = {
        timestamp: Date.now(),
        configHash,
        models,
      };
      return models;
    }
    case "openai": {
      const models = await getOpenAIModels(config as OpenAIConfig);
      MODEL_LIST_CACHE[cacheKey] = {
        timestamp: Date.now(),
        configHash,
        models,
      };
      return models;
    }
    case "openrouter": {
      const models = await getOpenRouterModels(config as OpenRouterConfig);
      MODEL_LIST_CACHE[cacheKey] = {
        timestamp: Date.now(),
        configHash,
        models,
      };
      return models;
    }
    case "claude": {
      const models = await getClaudeModels(config as ClaudeConfig);
      MODEL_LIST_CACHE[cacheKey] = {
        timestamp: Date.now(),
        configHash,
        models,
      };
      return models;
    }
    default:
      throw new Error(
        `Unknown protocol: ${(instance as ProviderInstance).protocol}`,
      );
  }
}

export async function validateConnectionForInstance(
  instance: ProviderInstance,
): Promise<void> {
  const config = createProviderConfig(instance);

  switch (instance.protocol) {
    case "gemini":
      await validateGeminiConnection(config as GeminiConfig);
      return;
    case "openai":
      await validateOpenAIConnection(config as OpenAIConfig);
      return;
    case "openrouter":
      await validateOpenRouterConnection(config as OpenRouterConfig);
      return;
    case "claude":
      await validateClaudeConnection(config as ClaudeConfig);
      return;
    default:
      throw new Error(
        `Unknown protocol: ${(instance as ProviderInstance).protocol}`,
      );
  }
}
