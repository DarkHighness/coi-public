/**
 * RAG Service Module (VFS-first)
 */

export type {
  DocumentType,
  FileChunkInput,
  RAGDocument,
  RAGDocumentMeta,
  SearchOptions,
  SearchResult,
  RAGConfig,
  SaveStats,
  RAGStatus,
  ProgressEvent,
  ModelMismatchInfo,
  ModelMismatchAction,
  StorageOverflowInfo,
  GlobalStorageStats,
  UpsertFileChunksPayload,
  DeleteByPathsPayload,
  ReindexAllPayload,
} from "./types";

export { DEFAULT_RAG_CONFIG } from "./types";

export {
  RAGService,
  getRAGService,
  initializeRAGService,
  terminateRAGService,
  type RAGServiceEvents,
  type RAGEventCallback,
} from "./service";

export { EMBEDDING_MODELS, type EmbeddingModelInfo } from "./embeddingProvider";
