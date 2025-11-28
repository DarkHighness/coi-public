/**
 * Embedding Provider for RAG Worker
 *
 * Handles embedding generation within the SharedWorker context.
 * Supports Gemini, OpenAI, and OpenRouter providers.
 */

import type { RAGConfig } from './types';

export interface EmbeddingCredentials {
  gemini?: { apiKey: string };
  openai?: { apiKey: string; baseUrl?: string };
  openrouter?: { apiKey: string };
}

export interface EmbeddingResult {
  embeddings: Float32Array[];
  usage?: {
    promptTokens: number;
    totalTokens: number;
  };
}

export type EmbeddingTaskType =
  | 'retrieval_query'
  | 'retrieval_document'
  | 'semantic_similarity'
  | 'classification'
  | 'clustering';

// ============================================================================
// Embedding Provider Class
// ============================================================================

export class EmbeddingProvider {
  private config: RAGConfig;
  private credentials: EmbeddingCredentials;

  constructor(config: RAGConfig, credentials: EmbeddingCredentials) {
    this.config = config;
    this.credentials = credentials;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RAGConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Generate embedding for a single text
   */
  async embed(
    text: string,
    taskType: EmbeddingTaskType = 'retrieval_document'
  ): Promise<Float32Array> {
    const result = await this.embedBatch([text], taskType);
    return result.embeddings[0];
  }

  /**
   * Generate embeddings for multiple texts
   */
  async embedBatch(
    texts: string[],
    taskType: EmbeddingTaskType = 'retrieval_document'
  ): Promise<EmbeddingResult> {
    const { provider } = this.config;

    return this.withRetry(async () => {
      switch (provider) {
        case 'gemini':
          return this.generateGeminiEmbedding(texts, taskType);
        case 'openai':
          return this.generateOpenAIEmbedding(texts, taskType);
        case 'openrouter':
          return this.generateOpenRouterEmbedding(texts, taskType);
        default:
          throw new Error(`Unknown embedding provider: ${provider}`);
      }
    });
  }

  /**
   * Generate embedding for query (search)
   */
  async embedQuery(query: string): Promise<Float32Array> {
    return this.embed(query, 'retrieval_query');
  }

  // ==========================================================================
  // Provider Implementations
  // ==========================================================================

  private async generateGeminiEmbedding(
    texts: string[],
    taskType: EmbeddingTaskType
  ): Promise<EmbeddingResult> {
    const creds = this.credentials.gemini;
    if (!creds?.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const { modelId, dimensions } = this.config;

    // Map task type to Gemini task type
    const geminiTaskType = this.mapToGeminiTaskType(taskType);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:batchEmbedContents?key=${creds.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: texts.map(text => ({
            model: `models/${modelId}`,
            content: { parts: [{ text }] },
            taskType: geminiTaskType,
            outputDimensionality: dimensions,
          })),
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Gemini embedding failed: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const embeddings = data.embeddings.map((e: any) => new Float32Array(e.values));

    return { embeddings };
  }

  private async generateOpenAIEmbedding(
    texts: string[],
    taskType: EmbeddingTaskType
  ): Promise<EmbeddingResult> {
    const creds = this.credentials.openai;
    if (!creds?.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { modelId, dimensions } = this.config;
    const baseUrl = creds.baseUrl || 'https://api.openai.com/v1';

    const response = await fetch(`${baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${creds.apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        input: texts,
        dimensions: dimensions,
        encoding_format: 'float',
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`OpenAI embedding failed: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const embeddings = data.data
      .sort((a: any, b: any) => a.index - b.index)
      .map((e: any) => new Float32Array(e.embedding));

    return {
      embeddings,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
    };
  }

  private async generateOpenRouterEmbedding(
    texts: string[],
    taskType: EmbeddingTaskType
  ): Promise<EmbeddingResult> {
    const creds = this.credentials.openrouter;
    if (!creds?.apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const { modelId, dimensions } = this.config;

    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${creds.apiKey}`,
        'HTTP-Referer': typeof location !== 'undefined' ? location.origin : 'https://coi.game',
        'X-Title': 'Chain of Infinity',
      },
      body: JSON.stringify({
        model: modelId,
        input: texts,
        dimensions: dimensions,
        encoding_format: 'float',
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`OpenRouter embedding failed: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const embeddings = data.data
      .sort((a: any, b: any) => a.index - b.index)
      .map((e: any) => new Float32Array(e.embedding));

    return {
      embeddings,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
    };
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private mapToGeminiTaskType(taskType: EmbeddingTaskType): string {
    const mapping: Record<EmbeddingTaskType, string> = {
      'retrieval_query': 'RETRIEVAL_QUERY',
      'retrieval_document': 'RETRIEVAL_DOCUMENT',
      'semantic_similarity': 'SEMANTIC_SIMILARITY',
      'classification': 'CLASSIFICATION',
      'clustering': 'CLUSTERING',
    };
    return mapping[taskType] || 'RETRIEVAL_DOCUMENT';
  }

  private async withRetry<T>(
    fn: () => Promise<T>,
    retries = 3,
    baseDelay = 1000
  ): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      const isRateLimited =
        error?.status === 429 ||
        error?.message?.includes('429') ||
        error?.message?.includes('Too Many Requests') ||
        error?.message?.includes('rate limit');

      if (retries > 0 && isRateLimited) {
        const delay = baseDelay * Math.pow(2, 3 - retries);
        console.warn(
          `[EmbeddingProvider] Rate limited. Retrying in ${delay}ms... (${retries} retries left)`
        );
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.withRetry(fn, retries - 1, baseDelay);
      }
      throw error;
    }
  }
}

// ============================================================================
// Embedding Model Definitions
// ============================================================================

export interface EmbeddingModelInfo {
  id: string;
  name: string;
  dimensions: number;
}

export const EMBEDDING_MODELS: Record<'gemini' | 'openai' | 'openrouter', EmbeddingModelInfo[]> = {
  gemini: [
    { id: 'text-embedding-004', name: 'Gemini Text Embedding 004', dimensions: 768 },
    { id: 'embedding-001', name: 'Gemini Embedding 001', dimensions: 768 },
  ],
  openai: [
    { id: 'text-embedding-3-small', name: 'OpenAI Text Embedding 3 Small', dimensions: 1536 },
    { id: 'text-embedding-3-large', name: 'OpenAI Text Embedding 3 Large', dimensions: 3072 },
    { id: 'text-embedding-ada-002', name: 'OpenAI Ada 002', dimensions: 1536 },
  ],
  openrouter: [
    { id: 'openai/text-embedding-3-small', name: 'OpenAI Text Embedding 3 Small', dimensions: 1536 },
    { id: 'openai/text-embedding-3-large', name: 'OpenAI Text Embedding 3 Large', dimensions: 3072 },
    { id: 'cohere/embed-english-v3.0', name: 'Cohere Embed English v3', dimensions: 1024 },
    { id: 'cohere/embed-multilingual-v3.0', name: 'Cohere Embed Multilingual v3', dimensions: 1024 },
    { id: 'google/gecko', name: 'Google Gecko', dimensions: 768 },
    { id: 'voyage/voyage-large-2', name: 'Voyage Large 2', dimensions: 1536 },
    { id: 'nomic-ai/nomic-embed-text-v1.5', name: 'Nomic Embed Text v1.5', dimensions: 768 },
  ],
};
