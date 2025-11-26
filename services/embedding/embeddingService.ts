/**
 * Embedding Service
 * Provides text embedding generation using various AI providers
 */

import {
  EmbeddingConfig,
  EmbeddingDocument,
  EmbeddingTaskType,
  EmbeddingIndex,
} from "../../types";
import {
  GeminiConfig,
  generateEmbedding as generateGeminiEmbedding,
} from "../providers/geminiProvider";
import {
  OpenAIConfig,
  generateEmbedding as generateOpenAIEmbedding,
} from "../providers/openaiProvider";
import {
  OpenRouterConfig,
  generateEmbedding as generateOpenRouterEmbedding,
} from "../providers/openRouterProvider";

interface EmbeddingResult {
  embedding: Float32Array;
  usage?: {
    promptTokens: number;
    totalTokens: number;
  };
}

interface EmbeddingBatchResult {
  embeddings: Float32Array[];
  usage?: {
    promptTokens: number;
    totalTokens: number;
  };
}

// ============================================================================
// Main Embedding Service Class
// ============================================================================

export class EmbeddingService {
  private config: EmbeddingConfig;
  private credentials: {
    gemini: GeminiConfig;
    openai: OpenAIConfig;
    openrouter: OpenRouterConfig;
  };

  constructor(
    config: EmbeddingConfig,
    credentials: {
      gemini: GeminiConfig;
      openai: OpenAIConfig;
      openrouter: OpenRouterConfig;
    },
  ) {
    this.config = config;
    this.credentials = credentials;
  }

  /**
   * Generate embeddings for a batch of texts
   */
  async generateEmbeddings(
    texts: string[],
    taskType: EmbeddingTaskType = "retrieval_document",
  ): Promise<EmbeddingBatchResult> {
    if (!this.config.enabled) {
      throw new Error("Embedding service is disabled");
    }

    const { provider, modelId, dimensions } = this.config;

    switch (provider) {
      case "gemini": {
        return generateGeminiEmbedding(
          this.credentials.gemini,
          modelId,
          texts,
          dimensions,
          taskType,
        );
      }
      case "openai": {
        return generateOpenAIEmbedding(
          this.credentials.openai,
          modelId,
          texts,
          dimensions,
          taskType,
        );
      }
      case "openrouter": {
        return generateOpenRouterEmbedding(
          this.credentials.openrouter,
          modelId,
          texts,
          dimensions,
          taskType,
        );
      }
      default:
        throw new Error(`Unknown embedding provider: ${provider}`);
    }
  }

  /**
   * Generate embedding for a single text (usually a query)
   */
  async generateEmbedding(
    text: string,
    taskType: EmbeddingTaskType = "retrieval_query",
  ): Promise<{ embedding: Float32Array; usage: any }> {
    const { provider, modelId, dimensions } = this.config;

    let result;
    if (provider === "gemini") {
      result = await generateGeminiEmbedding(
        this.credentials.gemini,
        modelId,
        [text],
        dimensions,
        taskType,
      );
    } else if (provider === "openrouter") {
      result = await generateOpenRouterEmbedding(
        this.credentials.openrouter,
        modelId,
        [text],
        dimensions,
        taskType,
      );
    } else {
      result = await generateOpenAIEmbedding(
        this.credentials.openai,
        modelId,
        [text],
        dimensions,
        taskType,
      );
    }

    return {
      embedding: result.embeddings[0],
      usage: result.usage,
    };
  }

  // NOTE: Text chunking has been removed.
  // For game RAG, each entity (story segment, NPC, item, etc.) is embedded as a complete unit
  // without splitting. This preserves semantic integrity of each game entity.

  /**
   * Create documents with embeddings for a list of entities
   */
  async createDocuments(
    entities: Array<{
      id: string;
      type: EmbeddingDocument["type"];
      content: string;
      metadata?: EmbeddingDocument["metadata"];
    }>,
    taskType: EmbeddingTaskType = "retrieval_document",
  ): Promise<EmbeddingDocument[]> {
    const { provider, modelId, dimensions } = this.config;
    const documents: EmbeddingDocument[] = [];
    const texts = entities.map((e) => e.content);

    // Process in batches (e.g., 100 at a time)
    const BATCH_SIZE = 20; // Conservative batch size
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batchTexts = texts.slice(i, i + BATCH_SIZE);
      const batchEntities = entities.slice(i, i + BATCH_SIZE);

      let result;
      if (provider === "gemini") {
        result = await generateGeminiEmbedding(
          this.credentials.gemini,
          modelId,
          batchTexts,
          dimensions,
          taskType,
        );
      } else if (provider === "openrouter") {
        result = await generateOpenRouterEmbedding(
          this.credentials.openrouter,
          modelId,
          batchTexts,
          dimensions,
          taskType,
        );
      } else {
        result = await generateOpenAIEmbedding(
          this.credentials.openai,
          modelId,
          batchTexts,
          dimensions,
          taskType,
        );
      }

      batchEntities.forEach((entity, index) => {
        documents.push({
          id: `${entity.id}_doc`, // Simple ID for now, since we aren't chunking yet
          entityId: entity.id,
          type: entity.type,
          content: entity.content,
          embedding: result.embeddings[index],
          metadata: entity.metadata,
        });
      });
    }

    return documents;
  }
}

// ============================================================================
// Embedding Index Management
// ============================================================================

/**
 * Compress embeddings into a single ArrayBuffer for efficient storage
 */
export function compressEmbeddings(
  documents: EmbeddingDocument[],
  dimensions: number,
): ArrayBuffer {
  const totalFloats = documents.length * dimensions;
  const buffer = new ArrayBuffer(totalFloats * 4); // 4 bytes per float32
  const view = new Float32Array(buffer);

  for (let i = 0; i < documents.length; i++) {
    const embedding = documents[i].embedding;
    if (embedding) {
      view.set(embedding, i * dimensions);
    }
  }

  return buffer;
}

/**
 * Decompress embeddings from ArrayBuffer
 */
export function decompressEmbeddings(
  buffer: ArrayBuffer,
  numDocuments: number,
  dimensions: number,
): Float32Array[] {
  const view = new Float32Array(buffer);
  const embeddings: Float32Array[] = [];

  for (let i = 0; i < numDocuments; i++) {
    const start = i * dimensions;
    const embedding = new Float32Array(dimensions);
    for (let j = 0; j < dimensions; j++) {
      embedding[j] = view[start + j];
    }
    embeddings.push(embedding);
  }

  return embeddings;
}

/**
 * Create an embedding index from documents
 */
export function createEmbeddingIndex(
  documents: EmbeddingDocument[],
  modelId: string,
  dimensions: number,
): EmbeddingIndex {
  // Remove embeddings from documents (stored separately for compression)
  const docsWithoutEmbeddings = documents.map((doc) => ({
    ...doc,
    embedding: undefined,
  }));

  return {
    version: 1,
    dimensions,
    modelId,
    documents: docsWithoutEmbeddings,
    embeddings: compressEmbeddings(documents, dimensions),
  };
}

/**
 * Restore embeddings to documents from index
 */
export function restoreEmbeddingsFromIndex(
  index: EmbeddingIndex,
): EmbeddingDocument[] {
  if (!index.embeddings) {
    return index.documents;
  }

  const embeddings = decompressEmbeddings(
    index.embeddings,
    index.documents.length,
    index.dimensions,
  );

  return index.documents.map((doc, i) => ({
    ...doc,
    embedding: embeddings[i],
  }));
}

// ============================================================================
// Available Embedding Models
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
    {
      id: "google/gecko",
      name: "Google Gecko",
      dimensions: 768,
    },
    {
      id: "voyage/voyage-large-2",
      name: "Voyage Large 2",
      dimensions: 1536,
    },
    {
      id: "nomic-ai/nomic-embed-text-v1.5",
      name: "Nomic Embed Text v1.5",
      dimensions: 768,
    },
  ],
};
