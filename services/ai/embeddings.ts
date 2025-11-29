import {
  AISettings,
  EmbeddingModelInfo,
  EmbeddingConfig,
} from "../../types";

import {
  GeminiConfig,
  OpenAIConfig,
  OpenRouterConfig,
  ClaudeConfig,
} from "../providers/types";

import {
  getEmbeddingModels as getGeminiEmbeddingModels,
  generateEmbedding as generateGeminiEmbedding,
} from "../providers/geminiProvider";

import {
  getEmbeddingModels as getOpenAIEmbeddingModels,
  generateEmbedding as generateOpenAIEmbedding,
} from "../providers/openaiProvider";

import {
  getEmbeddingModels as getOpenRouterEmbeddingModels,
  generateEmbedding as generateOpenRouterEmbedding,
} from "../providers/openRouterProvider";

import {
  getEmbeddingModels as getClaudeEmbeddingModels,
  generateEmbedding as generateClaudeEmbedding,
} from "../providers/claudeProvider";

import {
  getProviderInstance,
  createProviderConfig,
} from "./utils";

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

interface EmbeddingUsage {
  promptTokens: number;
  totalTokens: number;
}

/**
 * 生成嵌入向量
 * @param settings 设置对象
 * @param texts 要生成嵌入的文本数组
 * @param embeddingConfig 嵌入配置（如果不提供则使用 settings 中的嵌入配置）
 */
export const generateEmbeddings = async (
  settings: AISettings,
  texts: string[],
  embeddingConfig?: EmbeddingConfig,
): Promise<{ embeddings: Float32Array[]; usage: EmbeddingUsage }> => {
  const config = embeddingConfig || settings.embedding;

  if (!config?.enabled) {
    throw new Error("Embedding is disabled");
  }

  const instance = getProviderInstance(settings, config.providerId);
  if (!instance) {
    throw new Error(`Provider not found: ${config.providerId}`);
  }

  const providerConfig = createProviderConfig(instance);

  let response;
  switch (instance.protocol) {
    case "gemini":
      response = await generateGeminiEmbedding(
        providerConfig as GeminiConfig,
        config.modelId,
        texts,
        config.dimensions,
        undefined,
      );
      break;
    case "openai":
      response = await generateOpenAIEmbedding(
        providerConfig as OpenAIConfig,
        config.modelId,
        texts,
        config.dimensions,
        undefined,
      );
      break;
    case "openrouter":
      response = await generateOpenRouterEmbedding(
        providerConfig as OpenRouterConfig,
        config.modelId,
        texts,
        config.dimensions,
        undefined,
      );
      break;
    case "claude":
      response = await generateClaudeEmbedding(
        providerConfig as ClaudeConfig,
        config.modelId,
        texts,
        config.dimensions,
        undefined,
      );
      break;
    default:
      throw new Error(`Unknown protocol: ${instance.protocol}`);
  }

  return {
    embeddings: response.embeddings,
    usage: {
      promptTokens: response.usage.promptTokens,
      totalTokens: response.usage.totalTokens,
    },
  };
};

export type { EmbeddingModelInfo };
