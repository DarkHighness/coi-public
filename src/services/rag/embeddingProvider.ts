/**
 * Embedding Provider for RAG Worker
 *
 * Handles embedding generation within the SharedWorker context.
 * Supports Gemini, OpenAI, and OpenRouter providers.
 */

import type { RAGConfig } from "./types";

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
  | "retrieval_query"
  | "retrieval_document"
  | "semantic_similarity"
  | "classification"
  | "clustering";

interface IndexedEmbeddingRecord {
  index: number;
  embedding: number[];
}

interface EmbeddingUsage {
  promptTokens: number;
  totalTokens: number;
}

const isObject = (value: unknown): value is JsonObject =>
  value !== null && typeof value === "object";

const toNumberArray = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry));
};

const extractErrorMessage = (payload: unknown): string | null => {
  if (!isObject(payload)) {
    return null;
  }
  const nested = payload.error;
  if (isObject(nested) && typeof nested.message === "string") {
    return nested.message;
  }
  return null;
};

const parseGeminiEmbeddings = (payload: unknown): Float32Array[] => {
  if (!isObject(payload) || !Array.isArray(payload.embeddings)) {
    return [];
  }

  return payload.embeddings.map((entry) => {
    if (!isObject(entry)) {
      return new Float32Array();
    }
    return new Float32Array(toNumberArray(entry.values));
  });
};

const parseIndexedEmbeddings = (payload: unknown): Float32Array[] => {
  if (!isObject(payload) || !Array.isArray(payload.data)) {
    return [];
  }

  const records: IndexedEmbeddingRecord[] = payload.data
    .map((entry): IndexedEmbeddingRecord | null => {
      if (!isObject(entry)) {
        return null;
      }

      const index = Number(entry.index);
      if (!Number.isFinite(index)) {
        return null;
      }

      return {
        index,
        embedding: toNumberArray(entry.embedding),
      };
    })
    .filter((entry): entry is IndexedEmbeddingRecord => entry !== null);

  return records
    .sort((a, b) => a.index - b.index)
    .map((entry) => new Float32Array(entry.embedding));
};

const parseUsage = (payload: unknown): EmbeddingUsage | undefined => {
  if (!isObject(payload) || !isObject(payload.usage)) {
    return undefined;
  }

  const promptTokens = Number(payload.usage.prompt_tokens);
  const totalTokens = Number(payload.usage.total_tokens);
  if (!Number.isFinite(promptTokens) || !Number.isFinite(totalTokens)) {
    return undefined;
  }

  return { promptTokens, totalTokens };
};

const isRateLimitError = (error: unknown): boolean => {
  if (!isObject(error)) {
    return false;
  }

  const status = Number(error.status);
  const message =
    typeof error.message === "string" ? error.message.toLowerCase() : "";

  return (
    status === 429 ||
    message.includes("429") ||
    message.includes("too many requests") ||
    message.includes("rate limit")
  );
};

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
    taskType: EmbeddingTaskType = "retrieval_document",
  ): Promise<Float32Array> {
    const result = await this.embedBatch([text], taskType);
    return result.embeddings[0];
  }

  /**
   * Generate embeddings for multiple texts
   */
  async embedBatch(
    texts: string[],
    taskType: EmbeddingTaskType = "retrieval_document",
  ): Promise<EmbeddingResult> {
    const { provider } = this.config;

    return this.withRetry(async () => {
      switch (provider) {
        case "gemini":
          return this.generateGeminiEmbedding(texts, taskType);
        case "openai":
          return this.generateOpenAIEmbedding(texts, taskType);
        case "openrouter":
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
    return this.embed(query, "retrieval_query");
  }

  // ==========================================================================
  // Provider Implementations
  // ==========================================================================

  private async generateGeminiEmbedding(
    texts: string[],
    taskType: EmbeddingTaskType,
  ): Promise<EmbeddingResult> {
    const creds = this.credentials.gemini;
    if (!creds?.apiKey) {
      throw new Error("Gemini API key not configured");
    }

    const { modelId, dimensions } = this.config;

    // Map task type to Gemini task type
    const geminiTaskType = this.mapToGeminiTaskType(taskType);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:batchEmbedContents?key=${creds.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: texts.map((text) => ({
            model: `models/${modelId}`,
            content: { parts: [{ text }] },
            taskType: geminiTaskType,
            outputDimensionality: dimensions,
          })),
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(
        `Gemini embedding failed: ${extractErrorMessage(error) || response.statusText}`,
      );
    }

    const data: unknown = await response.json();
    const embeddings = parseGeminiEmbeddings(data);

    return { embeddings };
  }

  private async generateOpenAIEmbedding(
    texts: string[],
    taskType: EmbeddingTaskType,
  ): Promise<EmbeddingResult> {
    const creds = this.credentials.openai;
    if (!creds?.apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const { modelId, dimensions } = this.config;
    const baseUrl = creds.baseUrl || "https://api.openai.com/v1";

    const response = await fetch(`${baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${creds.apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        input: texts,
        dimensions: dimensions,
        encoding_format: "float",
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(
        `OpenAI embedding failed: ${extractErrorMessage(error) || response.statusText}`,
      );
    }

    const data: unknown = await response.json();
    const embeddings = parseIndexedEmbeddings(data);
    const usage = parseUsage(data);

    return {
      embeddings,
      usage,
    };
  }

  private async generateOpenRouterEmbedding(
    texts: string[],
    taskType: EmbeddingTaskType,
  ): Promise<EmbeddingResult> {
    const creds = this.credentials.openrouter;
    if (!creds?.apiKey) {
      throw new Error("OpenRouter API key not configured");
    }

    const { modelId, dimensions } = this.config;

    const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${creds.apiKey}`,
        "HTTP-Referer":
          typeof location !== "undefined"
            ? location.origin
            : "https://coi.game",
        "X-Title": "Chain of Infinity",
      },
      body: JSON.stringify({
        model: modelId,
        input: texts,
        dimensions: dimensions,
        encoding_format: "float",
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(
        `OpenRouter embedding failed: ${extractErrorMessage(error) || response.statusText}`,
      );
    }

    const data: unknown = await response.json();
    const embeddings = parseIndexedEmbeddings(data);
    const usage = parseUsage(data);

    return {
      embeddings,
      usage,
    };
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private mapToGeminiTaskType(taskType: EmbeddingTaskType): string {
    const mapping: Record<EmbeddingTaskType, string> = {
      retrieval_query: "RETRIEVAL_QUERY",
      retrieval_document: "RETRIEVAL_DOCUMENT",
      semantic_similarity: "SEMANTIC_SIMILARITY",
      classification: "CLASSIFICATION",
      clustering: "CLUSTERING",
    };
    return mapping[taskType] || "RETRIEVAL_DOCUMENT";
  }

  private async withRetry<T>(
    fn: () => Promise<T>,
    retries = 3,
    baseDelay = 1000,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error: unknown) {
      const isRateLimited = isRateLimitError(error);

      if (retries > 0 && isRateLimited) {
        const delay = baseDelay * Math.pow(2, 3 - retries);
        console.warn(
          `[EmbeddingProvider] Rate limited. Retrying in ${delay}ms... (${retries} retries left)`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
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

export const EMBEDDING_MODELS: Record<
  "gemini" | "openai" | "openrouter",
  EmbeddingModelInfo[]
> = {
  gemini: [
    {
      id: "text-embedding-004",
      name: "Gemini Text Embedding 004",
      dimensions: 768,
    },
    { id: "embedding-001", name: "Gemini Embedding 001", dimensions: 768 },
  ],
  openai: [
    {
      id: "text-embedding-3-small",
      name: "OpenAI Text Embedding 3 Small",
      dimensions: 1536,
    },
    {
      id: "text-embedding-3-large",
      name: "OpenAI Text Embedding 3 Large",
      dimensions: 3072,
    },
    { id: "text-embedding-ada-002", name: "OpenAI Ada 002", dimensions: 1536 },
  ],
  openrouter: [
    {
      id: "openai/text-embedding-3-small",
      name: "OpenAI Text Embedding 3 Small",
      dimensions: 1536,
    },
    {
      id: "openai/text-embedding-3-large",
      name: "OpenAI Text Embedding 3 Large",
      dimensions: 3072,
    },
    {
      id: "cohere/embed-english-v3.0",
      name: "Cohere Embed English v3",
      dimensions: 1024,
    },
    {
      id: "cohere/embed-multilingual-v3.0",
      name: "Cohere Embed Multilingual v3",
      dimensions: 1024,
    },
    { id: "google/gecko", name: "Google Gecko", dimensions: 768 },
    { id: "voyage/voyage-large-2", name: "Voyage Large 2", dimensions: 1536 },
    {
      id: "nomic-ai/nomic-embed-text-v1.5",
      name: "Nomic Embed Text v1.5",
      dimensions: 768,
    },
  ],
};
