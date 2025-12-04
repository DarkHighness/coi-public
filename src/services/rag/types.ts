/**
 * RAG Service Types
 *
 * Defines types for the RAG (Retrieval Augmented Generation) system
 * with PGlite + pgvector backend running in a SharedWorker
 */

// ============================================================================
// Document Types
// ============================================================================

export type DocumentType =
  | "story"
  | "npc"
  | "location"
  | "item"
  | "knowledge"
  | "quest"
  | "event"
  | "outline";

/**
 * An embedding document stored in the vector database
 */
export interface RAGDocument {
  // Primary identifiers
  id: string; // Unique document ID (uuid)
  entityId: string; // Entity reference (e.g., npc:1, loc:2)
  type: DocumentType; // Document type

  // Content
  content: string; // Original text content
  embedding?: Float32Array; // Embedding vector (stored separately in pgvector)

  // Source tracking
  saveId: string; // Which save this belongs to
  forkId: number; // Fork/branch ID
  turnNumber: number; // Game turn when created
  version: number; // Version within same entity (for history)

  // Model tracking (critical for consistency)
  embeddingModel: string; // Model used to generate embedding (e.g., "text-embedding-004")
  embeddingProvider: string; // Provider used

  // Metadata
  importance: number; // 0-1 importance score
  unlocked: boolean; // Whether hidden info is unlocked
  createdAt: number; // Timestamp
  lastAccess: number; // Last access timestamp (for LRU)
}

/**
 * Metadata without the embedding (for listing/queries)
 */
export type RAGDocumentMeta = Omit<RAGDocument, "embedding">;

// ============================================================================
// Search Types
// ============================================================================

export interface SearchOptions {
  topK?: number; // Number of results
  threshold?: number; // Minimum similarity (0-1)
  types?: DocumentType[]; // Filter by types
  saveId?: string; // Filter by save
  forkId?: number; // Current fork ID
  beforeTurn?: number; // Only content before this turn
  currentForkOnly?: boolean; // Only current fork lineage
}

export interface SearchResult {
  document: RAGDocumentMeta;
  score: number; // Similarity score (0-1)
  adjustedScore: number; // Score with priority adjustments
}

// ============================================================================
// Service Configuration
// ============================================================================

export interface RAGConfig {
  // Database settings
  dbName: string; // IndexedDB database name

  // Storage limits (persistent) - Split into per-save and global
  maxDocumentsPerSave: number; // Max documents per save (default: 5000)
  maxTotalStorageDocuments: number; // Max total documents across all saves (default: 50000)
  maxDocumentsPerType: number; // Max per type within a save (default: 1000)
  storyMaxEntries: number; // Max story documents (default: 50)
  maxVersionsPerEntity: number; // Max versions per entity (default: 5)
  maxVersionsAcrossForks: number; // Max versions across different forks (default: 10)

  // Priority settings
  currentForkBonus: number; // Priority bonus for current fork
  ancestorForkBonus: number; // Priority bonus for ancestor forks
  turnDecayFactor: number; // Priority decay per turn difference

  // Embedding settings
  dimensions: number; // Embedding vector dimensions
  provider: "gemini" | "openai" | "openrouter" | "claude";
  modelId: string;
  contextLength?: number;
}

export const DEFAULT_RAG_CONFIG: RAGConfig = {
  dbName: "coi_rag",
  maxDocumentsPerSave: 5000,
  maxTotalStorageDocuments: 50000,
  maxDocumentsPerType: 1000,
  storyMaxEntries: 50,
  maxVersionsPerEntity: 5,
  maxVersionsAcrossForks: 10,
  currentForkBonus: 0.5,
  ancestorForkBonus: 0.25,
  turnDecayFactor: 0.01,
  dimensions: 768,
  provider: "gemini",
  modelId: "text-embedding-004",
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

export type ModelMismatchAction =
  | "rebuild" // Delete all and rebuild with new model
  | "disable" // Temporarily disable RAG
  | "continue"; // Continue with mismatched (not recommended)

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
  suggestedDeletions: string[]; // Save IDs to delete (oldest first)
}

// ============================================================================
// Worker Message Types
// ============================================================================

export type RAGWorkerMessageType =
  | "init"
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
  id: string; // Request ID for response matching
  type: RAGWorkerMessageType;
  payload: any;
}

export interface RAGWorkerResponse {
  id: string; // Matching request ID
  success: boolean;
  data?: any;
  error?: string;
}

// ============================================================================
// Init Message
// ============================================================================

export interface InitPayload {
  config: Partial<RAGConfig>;
  credentials: {
    gemini?: { apiKey: string };
    openai?: { apiKey: string; baseUrl?: string };
    openrouter?: { apiKey: string };
  };
}

// ============================================================================
// Add Documents Message
// ============================================================================

export interface AddDocumentsPayload {
  documents: Array<{
    entityId: string;
    type: DocumentType;
    content: string;
    saveId: string;
    forkId: number;
    turnNumber: number;
    importance?: number;
    unlocked?: boolean;
  }>;
}

// ============================================================================
// Update Document Message
// ============================================================================

export interface UpdateDocumentPayload {
  entityId: string;
  type: DocumentType;
  content: string;
  saveId: string;
  forkId: number;
  turnNumber: number;
  importance?: number;
  unlocked?: boolean;
}

// ============================================================================
// Delete Documents Message
// ============================================================================

export interface DeleteDocumentsPayload {
  entityIds?: string[]; // Delete specific entities
  saveId?: string; // Delete all from save
  forkId?: number; // Delete specific fork
  olderThanTurn?: number; // Delete versions older than turn
}

// ============================================================================
// Search Message
// ============================================================================

export interface SearchPayload {
  query: string;
  queryEmbedding?: Float32Array; // Pre-computed embedding (optional)
  options: SearchOptions;
}

// ============================================================================
// Get Recent Documents Payload
// ============================================================================

export interface GetRecentDocumentsPayload {
  limit?: number; // Max documents to return (default: 20)
  types?: DocumentType[]; // Filter by types
}

// ============================================================================
// Get Documents Paginated Payload
// ============================================================================

export interface GetDocumentsPaginatedPayload {
  offset: number; // Number of documents to skip
  limit: number; // Max documents to return
  types?: DocumentType[]; // Filter by types
}

// ============================================================================
// Switch Save Message
// ============================================================================

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
  expectedModel?: string; // Expected embedding model for this save
  expectedProvider?: string; // Expected embedding provider
}

// ============================================================================
// Get Save Stats Response
// ============================================================================

export interface SaveStats {
  saveId: string;
  totalDocuments: number;
  documentsByType: Record<DocumentType, number>;
  memoryUsage: number; // Estimated bytes
  lastUpdated: number;
  embeddingModel?: string; // Model used for this save's embeddings
  embeddingProvider?: string;
}

// ============================================================================
// Global Storage Stats
// ============================================================================

export interface GlobalStorageStats {
  totalDocuments: number;
  totalSaves: number;
  saves: SaveStats[];
  estimatedStorageBytes: number;
}

// ============================================================================
// Status Response
// ============================================================================

export interface RAGStatus {
  initialized: boolean;
  currentSaveId: string | null;
  currentModel: string;
  currentProvider: string;
  storageDocuments: number;
  isSearching: boolean;
  pending: number;
  lastError: string | null;
  modelMismatch?: ModelMismatchInfo;
}

// ============================================================================
// Event Types (from Worker to Main)
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
  data?: any;
}

export interface ProgressEvent extends RAGEvent {
  type: "progress";
  data: {
    phase: "embedding" | "indexing" | "searching" | "cleanup";
    current: number;
    total: number;
    message?: string;
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
// Export/Import Types
// ============================================================================

/**
 * Exportable document (with embedding as array for JSON serialization)
 */
export interface ExportableRAGDocument {
  id: string;
  entityId: string;
  type: DocumentType;
  content: string;
  embedding: number[]; // Converted from Float32Array for JSON
  saveId: string;
  forkId: number;
  turnNumber: number;
  version: number;
  embeddingModel: string;
  embeddingProvider: string;
  importance: number;
  unlocked: boolean;
  createdAt: number;
  lastAccess: number;
}

/**
 * Export data payload for a save
 */
export interface RAGExportData {
  saveId: string;
  documents: ExportableRAGDocument[];
  metadata: {
    totalDocuments: number;
    embeddingModel: string;
    embeddingProvider: string;
    dimensions: number;
    exportedAt: number;
  };
}

export interface ExportSaveDataPayload {
  saveId: string;
}

export interface ImportSaveDataPayload {
  data: RAGExportData;
  newSaveId: string; // New save ID for imported data
}
