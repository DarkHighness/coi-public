/**
 * Embedding Module Index
 * Exports all embedding-related functionality
 */

export {
  EmbeddingService,
  compressEmbeddings,
  decompressEmbeddings,
  createEmbeddingIndex,
  restoreEmbeddingsFromIndex,
  EMBEDDING_MODELS,
  type EmbeddingModelInfo,
} from "./embeddingService";

export {
  SimilaritySearchManager,
  getSimilaritySearchManager,
  resetSimilaritySearchManager,
  type SearchResult,
} from "./similaritySearch";

export {
  isWebGPUAvailable,
  getWebGPUEngine,
  resetWebGPUEngine,
  WebGPUSimilarityEngine,
  type WebGPUSimilarityResult,
} from "./webgpuSimilarity";

export {
  EmbeddingManager,
  getEmbeddingManager,
  resetEmbeddingManager,
  createEmbeddingManager,
  type EmbeddingManagerConfig,
  type EmbeddingProgress,
  type RAGContext,
} from "./embeddingManager";
