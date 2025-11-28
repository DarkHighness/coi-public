/**
 * RAG Service Client
 *
 * Main thread interface for communicating with the RAG SharedWorker
 * Provides a clean API for the game engine to use
 */

import {
  DEFAULT_RAG_CONFIG,
  type RAGConfig,
  type RAGDocument,
  type DocumentType,
  type RAGDocumentMeta,
  type RAGWorkerRequest,
  type RAGWorkerResponse,
  type RAGEvent,
  type InitPayload,
  type AddDocumentsPayload,
  type UpdateDocumentPayload,
  type DeleteDocumentsPayload,
  type SearchPayload,
  type SearchOptions,
  type SwitchSavePayload,
  type SearchResult,
  type SaveStats,
  type RAGStatus,
  type ProgressEvent,
  type ModelMismatchInfo,
  type StorageOverflowInfo,
  type GlobalStorageStats,
  type ModelMismatchEvent,
  type StorageOverflowEvent,
} from "./types";

// ============================================================================
// Event Types
// ============================================================================

export type RAGEventCallback = (event: RAGEvent) => void;

export interface RAGServiceEvents {
  ready: () => void;
  error: (error: string) => void;
  indexUpdated: (data: { count: number; saveId: string }) => void;
  searchComplete: (results: SearchResult[]) => void;
  cleanupComplete: (data: {
    deletedVersions: number;
    deletedStorage: number;
  }) => void;
  progress: (data: ProgressEvent["data"]) => void;
  modelMismatch: (data: ModelMismatchInfo) => void;
  storageOverflow: (data: StorageOverflowInfo) => void;
}

// ============================================================================
// RAG Service Client
// ============================================================================

export class RAGService {
  private worker: SharedWorker | null = null;
  private port: MessagePort | null = null;
  private requestId = 0;
  private pendingRequests: Map<
    string,
    {
      resolve: (value: any) => void;
      reject: (error: Error) => void;
      timeout: ReturnType<typeof setTimeout>;
    }
  > = new Map();
  private eventListeners: Map<string, Set<Function>> = new Map();
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private config: RAGConfig = { ...DEFAULT_RAG_CONFIG };

  // Request timeout in milliseconds
  private readonly REQUEST_TIMEOUT = 60000; // 60 seconds for embedding operations

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initialize the RAG service
   */
  async initialize(
    config: Partial<RAGConfig>,
    credentials: InitPayload["credentials"],
  ): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInitialize(config, credentials);
    return this.initPromise;
  }

  private async doInitialize(
    config: Partial<RAGConfig>,
    credentials: InitPayload["credentials"],
  ): Promise<void> {
    // Check SharedWorker support
    if (typeof SharedWorker === "undefined") {
      console.warn(
        "[RAGService] SharedWorker not supported, falling back to inline mode",
      );
      // TODO: Implement inline fallback if needed
      throw new Error("SharedWorker not supported in this browser");
    }

    // Create SharedWorker
    this.worker = new SharedWorker(new URL("./worker.ts", import.meta.url), {
      type: "module",
      name: "rag-worker",
    });

    this.port = this.worker.port;

    // Set up message handler
    this.port.onmessage = (
      event: MessageEvent<RAGWorkerResponse | RAGEvent>,
    ) => {
      const data = event.data;

      // Check if it's a response to a request
      if ("id" in data && "success" in data) {
        this.handleResponse(data as RAGWorkerResponse);
      } else {
        // It's an event
        this.handleEvent(data as RAGEvent);
      }
    };

    this.port.onmessageerror = (event) => {
      console.error("[RAGService] Message error:", event);
      this.emit("error", "Worker communication error");
    };

    this.port.start();

    // Merge config
    this.config = { ...DEFAULT_RAG_CONFIG, ...config };

    // Initialize worker
    await this.sendRequest("init", {
      config: this.config,
      credentials,
    } as InitPayload);

    this.isInitialized = true;
    console.log("[RAGService] Initialized successfully");
  }

  /**
   * Check if service is initialized
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  // ==========================================================================
  // Document Operations
  // ==========================================================================

  /**
   * Add documents to the RAG index
   */
  async addDocuments(
    documents: AddDocumentsPayload["documents"],
  ): Promise<{ count: number }> {
    this.ensureInitialized();
    console.log(
      `[RAGService] addDocuments: count=${documents.length}, saveId=${documents[0]?.saveId || "N/A"}`,
    );
    return this.sendRequest("addDocuments", { documents });
  }

  /**
   * Update a single document (creates new version)
   */
  async updateDocument(
    params: UpdateDocumentPayload,
  ): Promise<{ success: boolean }> {
    this.ensureInitialized();
    return this.sendRequest("updateDocument", params);
  }

  /**
   * Delete documents
   */
  async deleteDocuments(
    params: DeleteDocumentsPayload,
  ): Promise<{ deleted: number }> {
    this.ensureInitialized();
    return this.sendRequest("deleteDocuments", params);
  }

  // ==========================================================================
  // Search
  // ==========================================================================

  /**
   * Search for similar documents
   */
  async search(
    query: string,
    options: SearchOptions = {},
  ): Promise<SearchResult[]> {
    this.ensureInitialized();
    console.log(
      `[RAGService] search: query="${query.substring(0, 50)}...", options=${JSON.stringify(options)}`,
    );
    return this.sendRequest("search", {
      query,
      options,
    } as SearchPayload);
  }

  /**
   * Search with pre-computed embedding
   */
  async searchWithEmbedding(
    queryEmbedding: Float32Array,
    options: SearchOptions = {},
  ): Promise<SearchResult[]> {
    this.ensureInitialized();
    return this.sendRequest("search", {
      query: "",
      queryEmbedding,
      options,
    } as SearchPayload);
  }

  /**
   * Get recently added documents (for debugging/display)
   */
  async getRecentDocuments(
    limit: number = 20,
    types?: DocumentType[],
  ): Promise<RAGDocumentMeta[]> {
    this.ensureInitialized();
    console.log(
      `[RAGService] getRecentDocuments: limit=${limit}, types=${types?.join(",") || "all"}`,
    );
    return this.sendRequest("getRecentDocuments", { limit, types });
  }

  /**
   * Get paginated documents with total count (for efficient pagination)
   */
  async getDocumentsPaginated(
    offset: number,
    limit: number,
    types?: DocumentType[],
  ): Promise<{ documents: RAGDocumentMeta[]; total: number }> {
    this.ensureInitialized();
    console.log(
      `[RAGService] getDocumentsPaginated: offset=${offset}, limit=${limit}, types=${types?.join(",") || "all"}`,
    );
    return this.sendRequest("getDocumentsPaginated", { offset, limit, types });
  }

  // ==========================================================================
  // Save Management
  // ==========================================================================

  /**
   * Switch to a different save context
   * This clears the memory cache and loads the new save's data
   */
  async switchSave(
    saveId: string,
    forkId: number,
    forkTree: SwitchSavePayload["forkTree"],
  ): Promise<{ success: boolean }> {
    this.ensureInitialized();
    return this.sendRequest("switchSave", {
      saveId,
      forkId,
      forkTree,
    } as SwitchSavePayload);
  }

  /**
   * Get statistics for a save
   */
  async getSaveStats(saveId?: string): Promise<SaveStats | null> {
    this.ensureInitialized();
    return this.sendRequest("getSaveStats", { saveId });
  }

  /**
   * Clear all data for a save
   */
  async clearSave(saveId?: string): Promise<{ deleted: number }> {
    this.ensureInitialized();
    return this.sendRequest("clearSave", { saveId });
  }

  // ==========================================================================
  // Maintenance
  // ==========================================================================

  /**
   * Run cleanup to enforce limits
   */
  async cleanup(): Promise<{
    deletedVersions: number;
    deletedStorage: number;
  }> {
    this.ensureInitialized();
    return this.sendRequest("cleanup", {});
  }

  /**
   * Update configuration
   */
  async updateConfig(
    config: Partial<RAGConfig>,
  ): Promise<{ success: boolean }> {
    this.config = { ...this.config, ...config };
    if (this.isInitialized) {
      return this.sendRequest("updateConfig", config);
    }
    return { success: true };
  }

  /**
   * Get current status
   */
  async getStatus(): Promise<RAGStatus> {
    if (!this.isInitialized || !this.port) {
      return {
        initialized: false,
        currentSaveId: null,
        currentModel: this.config.modelId,
        currentProvider: this.config.provider,
        memoryDocuments: 0,
        storageDocuments: 0,
        isSearching: false,
        pending: 0,
        lastError: null,
      };
    }
    return this.sendRequest("getStatus", {});
  }

  // ==========================================================================
  // Model & Storage Management
  // ==========================================================================

  /**
   * Check if there's a model mismatch for the save
   * Returns mismatch info if documents were created with a different model
   */
  async checkModelMismatch(saveId?: string): Promise<ModelMismatchInfo | null> {
    this.ensureInitialized();
    return this.sendRequest("checkModelMismatch", { saveId });
  }

  /**
   * Rebuild embeddings for a save by clearing all documents
   * After calling this, documents need to be re-added with new embeddings
   */
  async rebuildForModel(saveId?: string): Promise<{ deleted: number }> {
    this.ensureInitialized();
    return this.sendRequest("rebuildForModel", { saveId });
  }

  /**
   * Check if global storage is overflowing
   */
  async checkStorageOverflow(): Promise<StorageOverflowInfo | null> {
    this.ensureInitialized();
    return this.sendRequest("checkStorageOverflow", {});
  }

  /**
   * Delete the oldest saves to free up storage
   */
  async deleteOldestSaves(saveIds: string[]): Promise<{ deleted: number }> {
    this.ensureInitialized();
    return this.sendRequest("deleteOldestSaves", { saveIds });
  }

  /**
   * Get statistics for all saves
   */
  async getAllSaveStats(): Promise<GlobalStorageStats> {
    this.ensureInitialized();
    return this.sendRequest("getAllSaveStats", {});
  }

  // ==========================================================================
  // Event Handling
  // ==========================================================================

  /**
   * Add event listener
   */
  on<K extends keyof RAGServiceEvents>(
    event: K,
    callback: RAGServiceEvents[K],
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * Remove event listener
   */
  off<K extends keyof RAGServiceEvents>(
    event: K,
    callback: RAGServiceEvents[K],
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const callback of listeners) {
        try {
          callback(data);
        } catch (error) {
          console.error(`[RAGService] Error in ${event} listener:`, error);
        }
      }
    }
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  /**
   * Terminate the service
   */
  terminate(): void {
    // Cancel all pending requests
    for (const [id, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(new Error("Service terminated"));
    }
    this.pendingRequests.clear();

    // Close port
    if (this.port) {
      this.port.close();
      this.port = null;
    }

    // Note: We don't terminate the SharedWorker as other tabs may be using it
    this.worker = null;
    this.isInitialized = false;
    this.initPromise = null;

    console.log("[RAGService] Terminated");
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private ensureInitialized(): void {
    if (!this.isInitialized || !this.port) {
      throw new Error("RAG Service not initialized. Call initialize() first.");
    }
  }

  private async sendRequest<T>(type: string, payload: any): Promise<T> {
    if (!this.port) {
      throw new Error("Worker port not available");
    }

    const id = `${++this.requestId}`;

    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(
          new Error(
            `Request ${type} timed out after ${this.REQUEST_TIMEOUT}ms`,
          ),
        );
      }, this.REQUEST_TIMEOUT);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      const request: RAGWorkerRequest = { id, type: type as any, payload };
      this.port!.postMessage(request);
    });
  }

  private handleResponse(response: RAGWorkerResponse): void {
    const pending = this.pendingRequests.get(response.id);
    if (!pending) return;

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(response.id);

    if (response.success) {
      pending.resolve(response.data);
    } else {
      pending.reject(new Error(response.error || "Unknown error"));
    }
  }

  private handleEvent(event: RAGEvent): void {
    switch (event.type) {
      case "ready":
        this.emit("ready");
        break;
      case "error":
        this.emit("error", event.data);
        break;
      case "indexUpdated":
        this.emit("indexUpdated", event.data);
        break;
      case "searchComplete":
        this.emit("searchComplete", event.data);
        break;
      case "cleanupComplete":
        this.emit("cleanupComplete", event.data);
        break;
      case "progress":
        this.emit("progress", event.data);
        break;
      case "modelMismatch":
        this.emit("modelMismatch", event.data);
        break;
      case "storageOverflow":
        this.emit("storageOverflow", event.data);
        break;
      default:
        console.warn("[RAGService] Unknown event type:", event.type);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

// Put it on the window to persist across hot reloads in development
if (typeof window !== "undefined") {
  if (!(window as any).ragServiceInstance) {
    (window as any).ragServiceInstance = null;
  }
}

/**
 * Get the RAG service singleton instance
 */
export function getRAGService(): RAGService | null {
  if (typeof window !== "undefined") {
    return (window as any).ragServiceInstance;
  }
  return null;
}

/**
 * Initialize and get the RAG service singleton
 */
export async function initializeRAGService(
  config: Partial<RAGConfig>,
  credentials: InitPayload["credentials"],
): Promise<RAGService> {
  let ragServiceInstance = getRAGService();
  if (ragServiceInstance) {
    // Update config if already initialized
    await ragServiceInstance.updateConfig(config);
    return ragServiceInstance;
  }

  (window as any).ragServiceInstance = new RAGService();
  await (window as any).ragServiceInstance.initialize(config, credentials);

  return (window as any).ragServiceInstance;
}

/**
 * Terminate the RAG service singleton
 */
export function terminateRAGService(): void {
  const ragServiceInstance = getRAGService();
  if (ragServiceInstance) {
    ragServiceInstance.terminate();
    (window as any).ragServiceInstance = null;
  }
}
