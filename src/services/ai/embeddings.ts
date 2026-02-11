import { AISettings, EmbeddingModelInfo } from "../../types";

import {
  GeminiConfig,
  OpenAIConfig,
  OpenRouterConfig,
  ClaudeConfig,
} from "../providers/types";

import {
  getEmbeddingModels as getGeminiEmbeddingModels,
} from "../providers/geminiProvider";

import {
  getEmbeddingModels as getOpenAIEmbeddingModels,
} from "../providers/openaiProvider";

import {
  getEmbeddingModels as getOpenRouterEmbeddingModels,
} from "../providers/openRouterProvider";

import {
  getEmbeddingModels as getClaudeEmbeddingModels,
} from "../providers/claudeProvider";

import { getProviderInstance, createProviderConfig } from "./utils";

// ============================================================================
// Embedding Functions
// ============================================================================

/**
 * 获取可用的嵌入模型列表
 * @param settings 设置对象
 * @param providerId Provider ID
 */
export const getEmbeddingModels = async (
  settings: AISettings,
  providerId: string,
): Promise<EmbeddingModelInfo[]> => {
  const instance = getProviderInstance(settings, providerId);
  if (!instance) {
    return [];
  }

  const config = createProviderConfig(instance);

  try {
    switch (instance.protocol) {
      case "gemini":
        return await getGeminiEmbeddingModels(config as GeminiConfig);
      case "openai":
        return await getOpenAIEmbeddingModels(config as OpenAIConfig);
      case "openrouter":
        return await getOpenRouterEmbeddingModels(config as OpenRouterConfig);
      case "claude":
        return await getClaudeEmbeddingModels(config as ClaudeConfig);
      default:
        return [];
    }
  } catch (error) {
    console.error(
      `Failed to get embedding models from provider ${providerId}:`,
      error,
    );
    return [];
  }
};

export type { EmbeddingModelInfo };
