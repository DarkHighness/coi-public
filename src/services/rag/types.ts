/**
 * RAG Service Types (VFS-first)
 *
 * File-granular semantic indexing model.
 */

// ============================================================================
// Document Types
// ============================================================================

export type DocumentType = "json" | "markdown" | "text";

export type ChunkStrategy =
  | "json_path_object"
  | "markdown_heading"
  | "text_window";

export interface ChunkMeta {
  strategy: ChunkStrategy;
  overlapChars: number;
}

export type LocalEmbeddingBackend = "webgpu" | "webgl" | "cpu";

export type LocalEmbeddingEngine = "transformers_js" | "tfjs";

export type LocalTransformersDevice = "webgpu" | "wasm" | "cpu";

export type LocalEmbeddingRuntimeBackend = "webgpu" | "webgl" | "wasm" | "cpu";

export interface LocalEmbeddingRuntimeInfo {
  engine: LocalEmbeddingEngine;
  backend: LocalEmbeddingRuntimeBackend;
  model: string;
}

export interface LocalEmbeddingRuntimeConfig {
  backend?: LocalEmbeddingEngine;
  model?: "use-lite-512";
  transformersModel?: string;
  backendOrder?: LocalEmbeddingBackend[];
  deviceOrder?: LocalTransformersDevice[];
  batchSize?: number;
  quantized?: boolean;
}

export interface RAGDocument {
  id: string;

  // File identity
  sourcePath: string;
  canonicalPath: string;
  type: DocumentType;
  contentType: string;
  fileHash: string;
  chunkIndex: number;
  chunkCount: number;

  // Version status (within save + fork + source path)
  isLatest: boolean;
  supersededAtTurn: number | null;

  // Content
  content: string;
  embedding?: Float32Array;

  // Source tracking
  saveId: string;
  forkId: number;
  turnNumber: number;

  // Model tracking
  embeddingModel: string;
  embeddingProvider: string;

  // Metadata
  importance: number;
  createdAt: number;
  lastAccess: number;
  estimatedBytes: number;

  // Optional tags for filtering/debugging
  tags?: string[];
}

export type RAGDocumentMeta = Omit<RAGDocument, "embedding">;

export interface FileChunkInput {
  sourcePath: string;
  canonicalPath?: string;
  type: DocumentType;
  contentType: string;
  fileHash: string;
  chunkIndex: number;
  chunkCount: number;
  content: string;
  saveId: string;
  forkId: number;
  turnNumber: number;
  importance?: number;
  tags?: string[];
  embedding?: number[];
  chunkMeta?: ChunkMeta;
}

// ============================================================================
// Search Types
// ============================================================================

export interface SearchOptions {
  topK?: number;
  threshold?: number;

  // File-granularity filters
  pathPrefixes?: string[];
  contentTypes?: string[];
  types?: DocumentType[];

  saveId?: string;
  forkId?: number;
  beforeTurn?: number;
  /** Legacy option, preserved for compatibility. Runtime now enforces current fork only. */
  currentForkOnly?: boolean;
}

export interface SearchResult {
  document: RAGDocumentMeta;
  score: number;
  adjustedScore: number;
}

// ============================================================================
// Service Configuration
// ============================================================================

export interface RAGConfig {
  dbName: string;
  schemaVersion: number;

  // Storage limits
  maxDocumentsPerSave: number;
  maxTotalStorageDocuments: number;
  /** Byte-budget for reclaimable tiers (historical/other-fork/inactive-game). */
  maxStorageBytes: number;

  // Priority settings
  currentForkBonus: number;
  ancestorForkBonus: number;
  turnDecayFactor: number;

  // Embedding settings
  dimensions: number;
  provider:
    | "gemini"
    | "openai"
    | "openrouter"
    | "claude"
    | "local_tfjs"
    | "local_transformers";
  modelId: string;
  contextLength?: number;
  local?: LocalEmbeddingRuntimeConfig;
}

export const DEFAULT_RAG_CONFIG: RAGConfig = {
  dbName: "coi_rag",
  schemaVersion: 5,
  maxDocumentsPerSave: 12000,
  maxTotalStorageDocuments: 120000,
  maxStorageBytes: 512 * 1024 * 1024,
  currentForkBonus: 0.5,
  ancestorForkBonus: 0.25,
  turnDecayFactor: 0.01,
  dimensions: 384,
  provider: "local_transformers",
  modelId: "Xenova/all-MiniLM-L6-v2",
  local: {
    backend: "transformers_js",
    model: "use-lite-512",
    transformersModel: "Xenova/all-MiniLM-L6-v2",
    backendOrder: ["webgpu", "webgl", "cpu"],
    deviceOrder: ["webgpu", "wasm", "cpu"],
    quantized: true,
  },
};

// ============================================================================
// Model Mismatch Detection
// ============================================================================

export interface ModelMismatchInfo {
  currentModel: string;
  currentProvider: string;
  storedModel: string;
  storedProvider: string;
  documentCount: number;
}

export type ModelMismatchAction = "rebuild" | "disable" | "continue";

// ============================================================================
// Storage Overflow Handling
// ============================================================================

export interface StorageOverflowInfo {
  currentTotal: number;
  maxTotal: number;
  saveStats: Array<{
    saveId: string;
    documentCount: number;
    lastAccessed: number;
  }>;
  suggestedDeletions: string[];
  protectedBytes?: number;
  currentForkHistoryBytes?: number;
  activeOtherForkBytes?: number;
  inactiveGameBytes?: number;
  storageLimitBytes?: number;
  protectedOverflow?: boolean;
}

// ============================================================================
// Worker Message Types
// ============================================================================

export type RAGWorkerMessageType =
  | "init"
  | "upsertFileChunks"
  | "deleteByPaths"
  | "retireLatestByPaths"
  | "lookupReusableEmbeddings"
  | "reindexAll"
  // Legacy aliases (kept for transitional callers)
  | "addDocuments"
  | "updateDocument"
  | "deleteDocuments"
  | "search"
  | "getRecentDocuments"
  | "getDocumentsPaginated"
  | "switchSave"
  | "getSaveStats"
  | "getAllSaveStats"
  | "cleanup"
  | "updateConfig"
  | "getStatus"
  | "clearSave"
  | "checkModelMismatch"
  | "rebuildForModel"
  | "checkStorageOverflow"
  | "deleteOldestSaves"
  | "exportSaveData"
  | "importSaveData";

export interface RAGWorkerRequest {
  id: string;
  type: RAGWorkerMessageType;
  payload: unknown;
}

export interface RAGWorkerResponse {
  id: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

// ============================================================================
// Init Message
// ============================================================================

export interface InitPayload {
  config: Partial<RAGConfig>;
  credentials: {
    gemini?: { apiKey: string; baseUrl?: string };
    openai?: { apiKey: string; baseUrl?: string };
    openrouter?: { apiKey: string };
    claude?: { apiKey: string; baseUrl?: string };
  };
}

// ============================================================================
// Upsert File Chunks Message
// ============================================================================

export interface UpsertFileChunksPayload {
  documents: FileChunkInput[];
}

export interface RetireLatestByPathsPayload {
  saveId: string;
  forkId: number;
  turnNumber: number;
  paths: string[];
}

export interface ReusableEmbeddingLookupItem {
  saveId: string;
  sourcePath: string;
  fileHash: string;
  chunkIndex: number;
}

export interface LookupReusableEmbeddingsPayload {
  items: ReusableEmbeddingLookupItem[];
}

export interface LookupReusableEmbeddingsResult {
  embeddings: Array<number[] | null>;
}

// ============================================================================
// Legacy Add/Update/Delete Messages (compat)
// ============================================================================

export interface AddDocumentsPayload {
  documents: FileChunkInput[];
}

export interface UpdateDocumentPayload extends FileChunkInput {}

export interface DeleteDocumentsPayload {
  // Legacy field names (entityIds) accepted as source paths
  entityIds?: string[];
  saveId?: string;
  forkId?: number;
  olderThanTurn?: number;

  // New field names
  paths?: string[];
}

export interface DeleteByPathsPayload {
  saveId: string;
  forkId?: number;
  paths: string[];
}

export interface ReindexAllPayload {
  saveId: string;
  forkId: number;
  turnNumber: number;
  documents: FileChunkInput[];
}

// ============================================================================
// Search Message
// ============================================================================

export interface SearchPayload {
  query: string;
  queryEmbedding?: Float32Array;
  options: SearchOptions;
}

export interface GetRecentDocumentsPayload {
  limit?: number;
  types?: DocumentType[];
}

export interface GetDocumentsPaginatedPayload {
  offset: number;
  limit: number;
  types?: DocumentType[];
}

export interface SwitchSavePayload {
  saveId: string;
  forkId: number;
  forkTree: {
    nodes: Record<
      number,
      {
        id: number;
        parentId: number | null;
      }
    >;
  };
  expectedModel?: string;
  expectedProvider?: string;
}

// ============================================================================
// Save Stats / Status
// ============================================================================

export interface SaveStats {
  saveId: string;
  totalDocuments: number;
  documentsByType: Record<DocumentType, number>;
  memoryUsage: number;
  lastUpdated: number;
  embeddingModel?: string;
  embeddingProvider?: string;
}

export interface GlobalStorageStats {
  totalDocuments: number;
  totalSaves: number;
  saves: SaveStats[];
  estimatedStorageBytes: number;
}

export interface RAGStatus {
  initialized: boolean;
  currentSaveId: string | null;
  currentModel: string;
  currentProvider: string;
  localRuntime?: LocalEmbeddingRuntimeInfo | null;
  storageDocuments: number;
  isSearching: boolean;
  pending: number;
  lastError: string | null;
  modelMismatch?: ModelMismatchInfo;
  protectedBytes?: number;
  currentForkHistoryBytes?: number;
  activeOtherForkBytes?: number;
  inactiveGameBytes?: number;
  storageLimitBytes?: number;
  protectedOverflow?: boolean;
}

// ============================================================================
// Event Types (Worker -> Main)
// ============================================================================

export type RAGEventType =
  | "ready"
  | "error"
  | "indexUpdated"
  | "searchComplete"
  | "cleanupComplete"
  | "progress"
  | "modelMismatch"
  | "storageOverflow";

export interface RAGEvent {
  type: RAGEventType;
  data?: unknown;
}

export interface ProgressEvent extends RAGEvent {
  type: "progress";
  data: {
    phase: "embedding" | "indexing" | "searching" | "cleanup";
    current: number;
    total: number;
    message?: string;
    runtime?: LocalEmbeddingRuntimeInfo;
    messageKey?: string;
    messageParams?: Record<string, string | number>;
  };
}

export interface ModelMismatchEvent extends RAGEvent {
  type: "modelMismatch";
  data: ModelMismatchInfo;
}

export interface StorageOverflowEvent extends RAGEvent {
  type: "storageOverflow";
  data: StorageOverflowInfo;
}

// ============================================================================
// Export / Import Types
// ============================================================================

export interface ExportableRAGDocument {
  id: string;
  sourcePath: string;
  canonicalPath: string;
  type: DocumentType;
  contentType: string;
  fileHash: string;
  chunkIndex: number;
  chunkCount: number;
  isLatest: boolean;
  supersededAtTurn: number | null;
  content: string;
  embedding: number[];
  saveId: string;
  forkId: number;
  turnNumber: number;
  embeddingModel: string;
  embeddingProvider: string;
  importance: number;
  createdAt: number;
  lastAccess: number;
  estimatedBytes: number;
  tags?: string[];
}

export interface RAGExportData {
  saveId: string;
  documents: ExportableRAGDocument[];
  metadata: {
    totalDocuments: number;
    embeddingModel: string;
    embeddingProvider: string;
    dimensions: number;
    exportedAt: number;
    schemaVersion: number;
  };
}

export interface ExportSaveDataPayload {
  saveId: string;
}

export interface ImportSaveDataPayload {
  data: RAGExportData;
  newSaveId: string;
}
