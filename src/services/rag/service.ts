/**
 * RAG Service Client
 * Main-thread API for the RAG SharedWorker.
 */

import {
  DEFAULT_RAG_CONFIG,
  type AddDocumentsPayload,
  type DeleteByPathsPayload,
  type DeleteDocumentsPayload,
  type DocumentType,
  type ExportSaveDataPayload,
  type GlobalStorageStats,
  type ImportSaveDataPayload,
  type InitPayload,
  type ModelMismatchEvent,
  type ModelMismatchInfo,
  type RAGConfig,
  type RAGDocumentMeta,
  type RAGEvent,
  type RAGExportData,
  type RAGStatus,
  type RAGWorkerRequest,
  type RAGWorkerResponse,
  type ReindexAllPayload,
  type SaveStats,
  type SearchOptions,
  type SearchPayload,
  type SearchResult,
  type StorageOverflowEvent,
  type StorageOverflowInfo,
  type SwitchSavePayload,
  type UpdateDocumentPayload,
  type UpsertFileChunksPayload,
} from "./types";
import { embedTextsWithTfjs, resetTfjsEmbeddingEngine } from "./localEmbedding";

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
  progress: (data: {
    phase: "embedding" | "indexing" | "searching" | "cleanup";
    current: number;
    total: number;
    message?: string;
  }) => void;
  modelMismatch: (data: ModelMismatchInfo) => void;
  storageOverflow: (data: StorageOverflowInfo) => void;
}

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

  private readonly REQUEST_TIMEOUT = 60000;

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
    if (typeof SharedWorker === "undefined") {
      throw new Error("SharedWorker not supported in this browser");
    }

    this.worker = new SharedWorker(new URL("./worker.ts", import.meta.url), {
      type: "module",
      name: "rag-worker",
    });

    this.port = this.worker.port;
    this.port.onmessage = (
      event: MessageEvent<RAGWorkerResponse | RAGEvent>,
    ) => {
      const data = event.data;
      if ("id" in data && "success" in data) {
        this.handleResponse(data as RAGWorkerResponse);
      } else {
        this.handleEvent(data as RAGEvent);
      }
    };

    this.port.onmessageerror = (event) => {
      console.error("[RAGService] Message error:", event);
      this.emit("error", "Worker communication error");
    };

    this.port.start();

    this.config = {
      ...DEFAULT_RAG_CONFIG,
      ...config,
      local: {
        ...DEFAULT_RAG_CONFIG.local,
        ...(config.local ?? {}),
      },
    };

    await this.sendRequest("init", {
      config: this.config,
      credentials,
    } as InitPayload);

    this.isInitialized = true;
  }

  get initialized(): boolean {
    return this.isInitialized;
  }

  private isLocalTfjsRuntime(): boolean {
    return this.config.provider === "local_tfjs";
  }

  private getLocalEmbeddingConfig(): NonNullable<RAGConfig["local"]> {
    return {
      ...(DEFAULT_RAG_CONFIG.local || {
        model: "use-lite-512",
        backendOrder: ["webgpu", "webgl", "cpu"],
      }),
      ...(this.config.local || {}),
      model: "use-lite-512",
    };
  }

  private async ensureLocalEmbeddings(
    documents: UpsertFileChunksPayload["documents"],
  ): Promise<UpsertFileChunksPayload["documents"]> {
    if (!this.isLocalTfjsRuntime() || documents.length === 0) {
      return documents;
    }

    const missing = documents
      .map((doc, index) => ({ index, doc }))
      .filter(
        ({ doc }) => !Array.isArray(doc.embedding) || doc.embedding.length === 0,
      );

    if (missing.length === 0) {
      return documents;
    }

    const vectors = await embedTextsWithTfjs(
      missing.map(({ doc }) => doc.content),
      this.getLocalEmbeddingConfig(),
    );

    if (vectors.length !== missing.length) {
      throw new Error(
        `Local embedding size mismatch: expected ${missing.length}, got ${vectors.length}`,
      );
    }

    const prepared = documents.map((doc) => ({ ...doc }));
    missing.forEach(({ index }, vectorIndex) => {
      prepared[index] = {
        ...prepared[index],
        embedding: vectors[vectorIndex],
      };
    });

    return prepared;
  }

  // ======================================================================
  // File-centric indexing API
  // ======================================================================

  async upsertFileChunks(
    documents: UpsertFileChunksPayload["documents"],
  ): Promise<{ count: number }> {
    this.ensureInitialized();
    const preparedDocuments = await this.ensureLocalEmbeddings(documents);
    return this.sendRequest("upsertFileChunks", { documents: preparedDocuments });
  }

  async deleteByPaths(
    params: DeleteByPathsPayload,
  ): Promise<{ deleted: number }> {
    this.ensureInitialized();
    return this.sendRequest("deleteByPaths", params);
  }

  async reindexAll(
    params: ReindexAllPayload,
  ): Promise<{ deleted: number; count: number }> {
    this.ensureInitialized();
    const preparedDocuments = await this.ensureLocalEmbeddings(params.documents);
    return this.sendRequest("reindexAll", {
      ...params,
      documents: preparedDocuments,
    });
  }

  // ======================================================================
  // Legacy wrappers
  // ======================================================================

  async addDocuments(
    documents: AddDocumentsPayload["documents"],
  ): Promise<{ count: number }> {
    return this.upsertFileChunks(documents);
  }

  async updateDocument(
    params: UpdateDocumentPayload,
  ): Promise<{ success: boolean }> {
    this.ensureInitialized();
    return this.sendRequest("updateDocument", params);
  }

  async deleteDocuments(
    params: DeleteDocumentsPayload,
  ): Promise<{ deleted: number }> {
    this.ensureInitialized();
    return this.sendRequest("deleteDocuments", params);
  }

  // ======================================================================
  // Search
  // ======================================================================

  async search(
    query: string,
    options: SearchOptions = {},
  ): Promise<SearchResult[]> {
    this.ensureInitialized();

    if (this.isLocalTfjsRuntime()) {
      const [queryEmbedding] = await embedTextsWithTfjs(
        [query],
        this.getLocalEmbeddingConfig(),
      );

      return this.sendRequest("search", {
        query: "",
        queryEmbedding: new Float32Array(queryEmbedding),
        options,
      } as SearchPayload);
    }

    return this.sendRequest("search", {
      query,
      options,
    } as SearchPayload);
  }

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

  async getRecentDocuments(
    limit: number = 20,
    types?: DocumentType[],
  ): Promise<RAGDocumentMeta[]> {
    this.ensureInitialized();
    return this.sendRequest("getRecentDocuments", { limit, types });
  }

  async getDocumentsPaginated(
    offset: number,
    limit: number,
    types?: DocumentType[],
  ): Promise<{ documents: RAGDocumentMeta[]; total: number }> {
    this.ensureInitialized();
    return this.sendRequest("getDocumentsPaginated", { offset, limit, types });
  }

  // ======================================================================
  // Save management
  // ======================================================================

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

  async getSaveStats(saveId?: string): Promise<SaveStats | null> {
    this.ensureInitialized();
    return this.sendRequest("getSaveStats", { saveId });
  }

  async clearSave(saveId?: string): Promise<{ deleted: number }> {
    this.ensureInitialized();
    return this.sendRequest("clearSave", { saveId });
  }

  // ======================================================================
  // Maintenance
  // ======================================================================

  async cleanup(): Promise<{
    deletedVersions: number;
    deletedStorage: number;
  }> {
    this.ensureInitialized();
    return this.sendRequest("cleanup", {});
  }

  async updateConfig(config: Partial<RAGConfig>): Promise<{ success: boolean }> {
    const nextConfig: RAGConfig = {
      ...this.config,
      ...config,
      local: {
        ...(this.config.local || DEFAULT_RAG_CONFIG.local || { model: "use-lite-512" }),
        ...(config.local ?? {}),
      },
    };

    const localRuntimeChanged =
      nextConfig.provider !== this.config.provider ||
      JSON.stringify(nextConfig.local || null) !==
        JSON.stringify(this.config.local || null);

    this.config = nextConfig;

    if (localRuntimeChanged) {
      await resetTfjsEmbeddingEngine().catch(() => undefined);
    }

    if (this.isInitialized) {
      return this.sendRequest("updateConfig", config);
    }
    return { success: true };
  }

  async getStatus(): Promise<RAGStatus> {
    if (!this.isInitialized || !this.port) {
      return {
        initialized: false,
        currentSaveId: null,
        currentModel: this.config.modelId,
        currentProvider: this.config.provider,
        storageDocuments: 0,
        isSearching: false,
        pending: 0,
        lastError: null,
      };
    }
    return this.sendRequest("getStatus", {});
  }

  async checkModelMismatch(saveId?: string): Promise<ModelMismatchInfo | null> {
    this.ensureInitialized();
    return this.sendRequest("checkModelMismatch", { saveId });
  }

  async rebuildForModel(saveId?: string): Promise<{ deleted: number }> {
    this.ensureInitialized();
    return this.sendRequest("rebuildForModel", { saveId });
  }

  async checkStorageOverflow(): Promise<StorageOverflowInfo | null> {
    this.ensureInitialized();
    return this.sendRequest("checkStorageOverflow", {});
  }

  async deleteOldestSaves(saveIds: string[]): Promise<{ deleted: number }> {
    this.ensureInitialized();
    return this.sendRequest("deleteOldestSaves", { saveIds });
  }

  async getAllSaveStats(): Promise<GlobalStorageStats> {
    this.ensureInitialized();
    return this.sendRequest("getAllSaveStats", {});
  }

  // ======================================================================
  // Export / Import
  // ======================================================================

  async exportSaveData(saveId: string): Promise<RAGExportData | null> {
    this.ensureInitialized();
    return this.sendRequest("exportSaveData", {
      saveId,
    } as ExportSaveDataPayload);
  }

  async importSaveData(
    data: RAGExportData,
    newSaveId: string,
  ): Promise<{ success: boolean; imported: number }> {
    this.ensureInitialized();
    return this.sendRequest("importSaveData", {
      data,
      newSaveId,
    } as ImportSaveDataPayload);
  }

  // ======================================================================
  // Events
  // ======================================================================

  on<K extends keyof RAGServiceEvents>(
    event: K,
    callback: RAGServiceEvents[K],
  ): () => void {
    const eventName = event as string;
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set());
    }
    this.eventListeners.get(eventName)!.add(callback as Function);

    return () => {
      this.off(event, callback);
    };
  }

  off<K extends keyof RAGServiceEvents>(
    event: K,
    callback: RAGServiceEvents[K],
  ): void {
    const listeners = this.eventListeners.get(event as string);
    if (listeners) {
      listeners.delete(callback as Function);
    }
  }

  once<K extends keyof RAGServiceEvents>(
    event: K,
    callback: RAGServiceEvents[K],
  ): void {
    const onceCallback = ((data: any) => {
      callback(data);
      this.off(event, onceCallback as any);
    }) as RAGServiceEvents[K];

    this.on(event, onceCallback);
  }

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

  terminate(): void {
    for (const [, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(new Error("Service terminated"));
    }
    this.pendingRequests.clear();

    if (this.port) {
      this.port.close();
      this.port = null;
    }

    this.worker = null;
    this.isInitialized = false;
    this.initPromise = null;

    void resetTfjsEmbeddingEngine();
  }

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
        this.emit("modelMismatch", (event as ModelMismatchEvent).data);
        break;
      case "storageOverflow":
        this.emit("storageOverflow", (event as StorageOverflowEvent).data);
        break;
      default:
        console.warn("[RAGService] Unknown event type:", event.type);
    }
  }
}

if (typeof window !== "undefined") {
  if (!(window as any).ragServiceInstance) {
    (window as any).ragServiceInstance = null;
  }
}

export function getRAGService(): RAGService | null {
  if (typeof window !== "undefined") {
    return (window as any).ragServiceInstance;
  }
  return null;
}

export async function initializeRAGService(
  config: Partial<RAGConfig>,
  credentials: InitPayload["credentials"],
): Promise<RAGService> {
  let ragServiceInstance = getRAGService();
  if (ragServiceInstance) {
    await ragServiceInstance.updateConfig(config);
    return ragServiceInstance;
  }

  (window as any).ragServiceInstance = new RAGService();
  await (window as any).ragServiceInstance.initialize(config, credentials);

  return (window as any).ragServiceInstance;
}

export function terminateRAGService(): void {
  const ragServiceInstance = getRAGService();
  if (ragServiceInstance) {
    ragServiceInstance.terminate();
    (window as any).ragServiceInstance = null;
  }
}
