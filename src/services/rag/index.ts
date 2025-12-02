/**
 * RAG Service Module
 *
 * Exports the RAG (Retrieval Augmented Generation) service for semantic search
 * and context retrieval. The service runs in a SharedWorker for performance
 * isolation from the main game thread.
 *
 * Usage:
 *
 * ```typescript
 * import { initializeRAGService, getRAGService } from './services/rag';
 *
 * // Initialize (once at app start or when enabling RAG)
 * await initializeRAGService(
 *   { provider: 'gemini', modelId: 'text-embedding-004' },
 *   { gemini: { apiKey: 'YOUR_API_KEY' } }
 * );
 *
 * // Get service instance
 * const rag = getRAGService();
 *
 * // Switch to a save
 * await rag.switchSave('save-id', 0, forkTree);
 *
 * // Add documents
 * await rag.addDocuments([
 *   { entityId: 'npc:1', type: 'npc', content: '...', saveId: 'save-id', forkId: 0, turnNumber: 1 }
 * ]);
 *
 * // Search
 * const results = await rag.search('player asked about the treasure', {
 *   topK: 5,
 *   threshold: 0.5,
 *   currentForkOnly: true,
 * });
 * ```
 */

// Types
export type {
  DocumentType,
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
} from "./types";

export { DEFAULT_RAG_CONFIG } from "./types";

// Service
export {
  RAGService,
  getRAGService,
  initializeRAGService,
  terminateRAGService,
  type RAGServiceEvents,
  type RAGEventCallback,
} from "./service";

// Embedding Model Information
export { EMBEDDING_MODELS, type EmbeddingModelInfo } from "./embeddingProvider";

// Note: Database is an internal implementation detail
// and should not be imported directly by other modules.
// It is used by the SharedWorker.
