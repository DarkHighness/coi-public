/**
 * Embedding Service
 * Provides text embedding generation using various AI providers
 */

import type {
  EmbeddingConfig,
  EmbeddingDocument,
  EmbeddingIndex,
} from "../../types";
import { getEnvApiKey } from "../../utils/env";

// Provider-specific configurations
interface ProviderCredentials {
  apiKey?: string;
  baseUrl?: string;
}

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
// Provider Implementations
// ============================================================================

/**
 * Generate embeddings using Gemini API
 */
async function generateGeminiEmbedding(
  apiKey: string,
  modelId: string,
  texts: string[],
  dimensions?: number,
): Promise<EmbeddingBatchResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:batchEmbedContents?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: texts.map((text) => ({
        model: `models/${modelId}`,
        content: { parts: [{ text }] },
        outputDimensionality: dimensions,
      })),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini embedding failed: ${error}`);
  }

  const data = await response.json();
  const embeddings = data.embeddings.map(
    (e: any) => new Float32Array(e.values),
  );

  return {
    embeddings,
    usage: {
      promptTokens: texts.reduce((acc, t) => acc + Math.ceil(t.length / 4), 0),
      totalTokens: texts.reduce((acc, t) => acc + Math.ceil(t.length / 4), 0),
    },
  };
}

/**
 * Generate embeddings using OpenAI API
 */
async function generateOpenAIEmbedding(
  apiKey: string,
  baseUrl: string,
  modelId: string,
  texts: string[],
  dimensions?: number,
): Promise<EmbeddingBatchResult> {
  const url = `${baseUrl}/embeddings`;

  const body: any = {
    model: modelId,
    input: texts,
    encoding_format: "float",
  };

  if (dimensions) {
    body.dimensions = dimensions;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI embedding failed: ${error}`);
  }

  const data = await response.json();
  const embeddings = data.data
    .sort((a: any, b: any) => a.index - b.index)
    .map((item: any) => new Float32Array(item.embedding));

  return {
    embeddings,
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
  };
}

/**
 * Generate embeddings using OpenRouter API
 * OpenRouter uses OpenAI-compatible API
 */
async function generateOpenRouterEmbedding(
  apiKey: string,
  modelId: string,
  texts: string[],
  dimensions?: number,
): Promise<EmbeddingBatchResult> {
  return generateOpenAIEmbedding(
    apiKey,
    "https://openrouter.ai/api/v1",
    modelId,
    texts,
    dimensions,
  );
}

// ============================================================================
// Main Embedding Service Class
// ============================================================================

export class EmbeddingService {
  private config: EmbeddingConfig;
  private credentials: {
    gemini: ProviderCredentials;
    openai: ProviderCredentials;
    openrouter: ProviderCredentials;
  };

  constructor(
    config: EmbeddingConfig,
    credentials: {
      gemini: ProviderCredentials;
      openai: ProviderCredentials;
      openrouter: ProviderCredentials;
    },
  ) {
    this.config = config;
    this.credentials = credentials;
  }

  /**
   * Generate embeddings for a batch of texts
   */
  async generateEmbeddings(texts: string[]): Promise<EmbeddingBatchResult> {
    if (!this.config.enabled) {
      throw new Error("Embedding service is disabled");
    }

    const { provider, modelId, dimensions } = this.config;

    switch (provider) {
      case "gemini": {
        const apiKey = this.credentials.gemini.apiKey || getEnvApiKey();
        if (!apiKey) throw new Error("Gemini API key not configured");
        return generateGeminiEmbedding(apiKey, modelId, texts, dimensions);
      }
      case "openai": {
        const { apiKey, baseUrl } = this.credentials.openai;
        if (!apiKey) throw new Error("OpenAI API key not configured");
        return generateOpenAIEmbedding(
          apiKey,
          baseUrl || "https://api.openai.com/v1",
          modelId,
          texts,
          dimensions,
        );
      }
      case "openrouter": {
        const apiKey = this.credentials.openrouter.apiKey;
        if (!apiKey) throw new Error("OpenRouter API key not configured");
        return generateOpenRouterEmbedding(apiKey, modelId, texts, dimensions);
      }
      default:
        throw new Error(`Unknown embedding provider: ${provider}`);
    }
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    const result = await this.generateEmbeddings([text]);
    return {
      embedding: result.embeddings[0],
      usage: result.usage,
    };
  }

  /**
   * Split text into chunks for embedding
   */
  chunkText(text: string): string[] {
    const { chunkSize = 512, chunkOverlap = 64 } = this.config;
    const chunks: string[] = [];

    // Split by sentences first
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let currentChunk = "";

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length <= chunkSize) {
        currentChunk += sentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          // Keep overlap from end of previous chunk
          const overlapText = currentChunk.slice(-chunkOverlap);
          currentChunk = overlapText + sentence;
        } else {
          // Single sentence is too long, split by words
          const words = sentence.split(/\s+/);
          let wordChunk = "";
          for (const word of words) {
            if ((wordChunk + " " + word).length <= chunkSize) {
              wordChunk += (wordChunk ? " " : "") + word;
            } else {
              if (wordChunk) chunks.push(wordChunk.trim());
              wordChunk = word;
            }
          }
          if (wordChunk) currentChunk = wordChunk;
        }
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [text];
  }

  /**
   * Create embedding documents from game entities
   */
  async createDocuments(
    entities: Array<{
      id: string;
      type: EmbeddingDocument["type"];
      content: string;
      metadata?: EmbeddingDocument["metadata"];
    }>,
  ): Promise<EmbeddingDocument[]> {
    const documents: EmbeddingDocument[] = [];
    const textsToEmbed: string[] = [];
    const docMappings: Array<{ docIndex: number; entityIndex: number }> = [];

    // Collect all texts to embed
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const chunks = this.chunkText(entity.content);

      for (let j = 0; j < chunks.length; j++) {
        const docId = `${entity.id}_chunk_${j}`;
        documents.push({
          id: docId,
          type: entity.type,
          entityId: entity.id,
          content: chunks[j],
          metadata: entity.metadata,
        });
        textsToEmbed.push(chunks[j]);
        docMappings.push({ docIndex: documents.length - 1, entityIndex: i });
      }
    }

    // Generate embeddings in batches
    const batchSize = 100;
    for (let i = 0; i < textsToEmbed.length; i += batchSize) {
      const batch = textsToEmbed.slice(i, i + batchSize);
      const result = await this.generateEmbeddings(batch);

      for (let j = 0; j < result.embeddings.length; j++) {
        const docIndex = i + j;
        documents[docIndex].embedding = result.embeddings[j];
      }
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
  ],
};
