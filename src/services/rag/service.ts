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
  type LocalEmbeddingRuntimeInfo,
  type LookupReusableEmbeddingsResult,
  type ModelMismatchInfo,
  type RAGConfig,
  type RAGDocumentMeta,
  type RAGEvent,
  type RAGExportData,
  type RAGStatus,
  type RAGWorkerRequest,
  type RAGWorkerResponse,
  type ReindexAllPayload,
  type RetireLatestByPathsPayload,
  type SaveStats,
  type SearchOptions,
  type SearchPayload,
  type SearchResult,
  type StorageOverflowInfo,
  type SwitchSavePayload,
  type UpdateDocumentPayload,
  type UpsertFileChunksPayload,
} from "./types";
import {
  embedTextsLocally,
  resetLocalEmbeddingEngines,
} from "./localEmbedding";

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
    runtime?: LocalEmbeddingRuntimeInfo;
    messageKey?: string;
    messageParams?: Record<string, string | number>;
  }) => void;
  modelMismatch: (data: ModelMismatchInfo) => void;
  storageOverflow: (data: StorageOverflowInfo) => void;
}

interface WindowWithRagService extends Window {
  ragServiceInstance?: RAGService | null;
}

const getBrowserWindow = (): WindowWithRagService | null => {
  if (typeof window === "undefined") {
    return null;
  }
  return window as WindowWithRagService;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object";

export class RAGService {
  private worker: SharedWorker | null = null;
  private port: MessagePort | null = null;
  private requestId = 0;
  private pendingRequests: Map<
    string,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
      timeout: ReturnType<typeof setTimeout>;
    }
  > = new Map();
  private eventListeners: Map<string, Set<(...args: unknown[]) => void>> =
    new Map();
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private config: RAGConfig = { ...DEFAULT_RAG_CONFIG };

  private readonly REQUEST_TIMEOUT = 60000;
  private readonly LONG_RUNNING_REQUEST_TIMEOUT = 10 * 60 * 1000;

  async initialize(
    config: Partial<RAGConfig>,
    credentials: InitPayload["credentials"],
  ): Promise<void> {
    if (this.isInitialized) {
      await this.updateConfig(config);
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInitialize(config, credentials).catch((error) => {
      // Reset partially initialized worker state so a later retry can succeed.
      this.terminate();
      throw error;
    });
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
      event: MessageEvent<RAGWorkerResponse | RAGEvent | unknown>,
    ) => {
      const data = event.data;
      if (this.isWorkerResponse(data)) {
        this.handleResponse(data);
        return;
      }

      if (this.isRagEvent(data)) {
        this.handleEvent(data);
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

  private isLocalRuntime(): boolean {
    return (
      this.config.provider === "local_tfjs" ||
      this.config.provider === "local_transformers"
    );
  }

  private getLocalEmbeddingConfig(): NonNullable<RAGConfig["local"]> {
    const merged = {
      ...(DEFAULT_RAG_CONFIG.local || {
        backend: "transformers_js",
        model: "use-lite-512",
        transformersModel: "Xenova/all-MiniLM-L6-v2",
        backendOrder: ["webgpu", "webgl", "cpu"],
        deviceOrder: ["webgpu", "wasm", "cpu"],
        quantized: true,
      }),
      ...(this.config.local || {}),
    };

    if (this.config.provider === "local_tfjs") {
      return {
        ...merged,
        backend: "tfjs",
        model: "use-lite-512",
        backendOrder: merged.backendOrder || ["webgpu", "webgl", "cpu"],
      };
    }

    return {
      ...merged,
      backend: "transformers_js",
      transformersModel: merged.transformersModel || "Xenova/all-MiniLM-L6-v2",
      deviceOrder: merged.deviceOrder || ["webgpu", "wasm", "cpu"],
    };
  }

  private async attachReusableEmbeddings(
    documents: UpsertFileChunksPayload["documents"],
  ): Promise<UpsertFileChunksPayload["documents"]> {
    if (documents.length === 0) {
      return documents;
    }

    const missing = documents
      .map((doc, index) => ({ index, doc }))
      .filter(
        ({ doc }) =>
          !Array.isArray(doc.embedding) || doc.embedding.length === 0,
      );

    if (missing.length === 0) {
      return documents;
    }

    const prepared = documents.map((doc) => ({ ...doc }));

    try {
      const reusable = await this.sendRequest<LookupReusableEmbeddingsResult>(
        "lookupReusableEmbeddings",
        {
          items: missing.map(({ doc }) => ({
            saveId: doc.saveId,
            sourcePath: doc.sourcePath,
            fileHash: doc.fileHash,
            chunkIndex: doc.chunkIndex,
          })),
        },
      );

      if (reusable?.embeddings?.length === missing.length) {
        missing.forEach((entry, offset) => {
          const reusableEmbedding = reusable.embeddings[offset];
          if (
            Array.isArray(reusableEmbedding) &&
            reusableEmbedding.length > 0
          ) {
            prepared[entry.index] = {
              ...prepared[entry.index],
              embedding: reusableEmbedding,
            };
          }
        });
      }
    } catch (error) {
      console.warn("[RAGService] Reusable embedding lookup failed:", error);
    }

    return prepared;
  }

  // ======================================================================
  // File-centric indexing API
  // ======================================================================

  async upsertFileChunks(
    documents: UpsertFileChunksPayload["documents"],
  ): Promise<{ count: number }> {
    this.ensureInitialized();
    const preparedDocuments = await this.attachReusableEmbeddings(documents);
    return this.sendRequest("upsertFileChunks", {
      documents: preparedDocuments,
    }, this.LONG_RUNNING_REQUEST_TIMEOUT);
  }

  async deleteByPaths(
    params: DeleteByPathsPayload,
  ): Promise<{ deleted: number }> {
    this.ensureInitialized();
    return this.sendRequest("deleteByPaths", params);
  }

  async retireLatestByPaths(
    params: RetireLatestByPathsPayload,
  ): Promise<{ deleted: number }> {
    this.ensureInitialized();
    return this.sendRequest("retireLatestByPaths", params);
  }

  async reindexAll(
    params: ReindexAllPayload,
  ): Promise<{ deleted: number; count: number }> {
    this.ensureInitialized();
    const preparedDocuments = await this.attachReusableEmbeddings(params.documents);
    return this.sendRequest("reindexAll", {
      ...params,
      documents: preparedDocuments,
    }, this.LONG_RUNNING_REQUEST_TIMEOUT);
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

    if (this.isLocalRuntime()) {
      const [queryEmbedding] = await embedTextsLocally(
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

  async updateConfig(
    config: Partial<RAGConfig>,
  ): Promise<{ success: boolean }> {
    const nextConfig: RAGConfig = {
      ...this.config,
      ...config,
      local: {
        ...(this.config.local ||
          DEFAULT_RAG_CONFIG.local || {
            backend: "transformers_js",
            model: "use-lite-512",
            transformersModel: "Xenova/all-MiniLM-L6-v2",
          }),
        ...(config.local ?? {}),
      },
    };

    const localRuntimeChanged =
      nextConfig.provider !== this.config.provider ||
      JSON.stringify(nextConfig.local || null) !==
        JSON.stringify(this.config.local || null);

    this.config = nextConfig;

    if (localRuntimeChanged) {
      await resetLocalEmbeddingEngines().catch(() => undefined);
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
    let listeners = this.eventListeners.get(eventName);
    if (!listeners) {
      listeners = new Set();
      this.eventListeners.set(eventName, listeners);
    }
    listeners.add(callback as (...args: unknown[]) => void);

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
      listeners.delete(callback as (...args: unknown[]) => void);
    }
  }

  once<K extends keyof RAGServiceEvents>(
    event: K,
    callback: RAGServiceEvents[K],
  ): void {
    const onceCallback = ((...args: Parameters<RAGServiceEvents[K]>) => {
      const listener = callback as (
        ...callbackArgs: Parameters<RAGServiceEvents[K]>
      ) => void;
      listener(...args);
      this.off(event, onceCallback as RAGServiceEvents[K]);
    }) as RAGServiceEvents[K];

    this.on(event, onceCallback);
  }

  private emit<K extends keyof RAGServiceEvents>(
    event: K,
    ...args: Parameters<RAGServiceEvents[K]>
  ): void {
    const listeners = this.eventListeners.get(event as string) as
      | Set<RAGServiceEvents[K]>
      | undefined;
    if (listeners) {
      for (const callback of listeners) {
        try {
          const listener = callback as (
            ...callbackArgs: Parameters<RAGServiceEvents[K]>
          ) => void;
          listener(...args);
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

    void resetLocalEmbeddingEngines();
  }

  private ensureInitialized(): void {
    if (!this.isInitialized || !this.port) {
      throw new Error("RAG Service not initialized. Call initialize() first.");
    }
  }

  private async sendRequest<T>(
    type: RAGWorkerRequest["type"],
    payload: unknown,
    timeoutMs: number = this.REQUEST_TIMEOUT,
  ): Promise<T> {
    if (!this.port) {
      throw new Error("Worker port not available");
    }

    const id = `${++this.requestId}`;

    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(
          new Error(
            `Request ${type} timed out after ${timeoutMs}ms`,
          ),
        );
      }, timeoutMs);

      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout,
      });

      const request: RAGWorkerRequest = { id, type, payload };
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
        this.emit("error", typeof event.data === "string" ? event.data : "");
        break;
      case "indexUpdated":
        if (isObject(event.data)) {
          this.emit("indexUpdated", {
            count: Number(event.data.count ?? 0),
            saveId: String(event.data.saveId ?? ""),
          });
        }
        break;
      case "searchComplete":
        this.emit(
          "searchComplete",
          Array.isArray(event.data)
            ? (event.data as SearchResult[])
            : [],
        );
        break;
      case "cleanupComplete":
        if (isObject(event.data)) {
          this.emit("cleanupComplete", {
            deletedVersions: Number(event.data.deletedVersions ?? 0),
            deletedStorage: Number(event.data.deletedStorage ?? 0),
          });
        }
        break;
      case "progress":
        if (isObject(event.data)) {
          this.emit("progress", {
            phase:
              event.data.phase === "embedding" ||
              event.data.phase === "indexing" ||
              event.data.phase === "searching" ||
              event.data.phase === "cleanup"
                ? event.data.phase
                : "embedding",
            current: Number(event.data.current ?? 0),
            total: Number(event.data.total ?? 0),
            message:
              typeof event.data.message === "string"
                ? event.data.message
                : undefined,
            runtime: event.data.runtime as LocalEmbeddingRuntimeInfo | undefined,
            messageKey:
              typeof event.data.messageKey === "string"
                ? event.data.messageKey
                : undefined,
            messageParams: isObject(event.data.messageParams)
              ? (event.data.messageParams as Record<string, string | number>)
              : undefined,
          });
        }
        break;
      case "modelMismatch":
        if (isObject(event.data)) {
          this.emit("modelMismatch", {
            currentModel: String(event.data.currentModel ?? ""),
            currentProvider: String(event.data.currentProvider ?? ""),
            storedModel: String(event.data.storedModel ?? ""),
            storedProvider: String(event.data.storedProvider ?? ""),
            documentCount: Number(event.data.documentCount ?? 0),
          });
        }
        break;
      case "storageOverflow":
        if (isObject(event.data) && Array.isArray(event.data.saveStats)) {
          this.emit("storageOverflow", {
            currentTotal: Number(event.data.currentTotal ?? 0),
            maxTotal: Number(event.data.maxTotal ?? 0),
            saveStats: event.data.saveStats
              .filter(isObject)
              .map((row) => ({
                saveId: String(row.saveId ?? ""),
                documentCount: Number(row.documentCount ?? 0),
                lastAccessed: Number(row.lastAccessed ?? 0),
              })),
            suggestedDeletions: Array.isArray(event.data.suggestedDeletions)
              ? event.data.suggestedDeletions.map((entry) => String(entry))
              : [],
            protectedBytes: Number(event.data.protectedBytes ?? 0),
            currentForkHistoryBytes: Number(
              event.data.currentForkHistoryBytes ?? 0,
            ),
            activeOtherForkBytes: Number(event.data.activeOtherForkBytes ?? 0),
            inactiveGameBytes: Number(event.data.inactiveGameBytes ?? 0),
            storageLimitBytes: Number(event.data.storageLimitBytes ?? 0),
            protectedOverflow: Boolean(event.data.protectedOverflow),
          });
        }
        break;
      default:
        console.warn("[RAGService] Unknown event type:", event.type);
    }
  }

  private isWorkerResponse(data: unknown): data is RAGWorkerResponse {
    return (
      isObject(data) &&
      typeof data.id === "string" &&
      typeof data.success === "boolean"
    );
  }

  private isRagEvent(data: unknown): data is RAGEvent {
    return (
      isObject(data) &&
      typeof data.type === "string" &&
      [
        "ready",
        "error",
        "indexUpdated",
        "searchComplete",
        "cleanupComplete",
        "progress",
        "modelMismatch",
        "storageOverflow",
      ].includes(data.type)
    );
  }
}

const globalWindow = getBrowserWindow();
if (globalWindow && typeof globalWindow.ragServiceInstance === "undefined") {
  globalWindow.ragServiceInstance = null;
}

export function getRAGService(): RAGService | null {
  const browserWindow = getBrowserWindow();
  if (browserWindow) {
    return browserWindow.ragServiceInstance ?? null;
  }
  return null;
}

export async function initializeRAGService(
  config: Partial<RAGConfig>,
  credentials: InitPayload["credentials"],
): Promise<RAGService> {
  let ragServiceInstance = getRAGService();
  if (ragServiceInstance) {
    if (!ragServiceInstance.initialized) {
      await ragServiceInstance.initialize(config, credentials);
      return ragServiceInstance;
    }

    await ragServiceInstance.updateConfig(config);
    return ragServiceInstance;
  }

  ragServiceInstance = new RAGService();
  const browserWindow = getBrowserWindow();
  if (browserWindow) {
    browserWindow.ragServiceInstance = ragServiceInstance;
  }

  try {
    await ragServiceInstance.initialize(config, credentials);
  } catch (error) {
    ragServiceInstance.terminate();
    if (browserWindow?.ragServiceInstance === ragServiceInstance) {
      browserWindow.ragServiceInstance = null;
    }
    throw error;
  }

  return ragServiceInstance;
}

export function terminateRAGService(): void {
  const ragServiceInstance = getRAGService();
  if (ragServiceInstance) {
    ragServiceInstance.terminate();
    const browserWindow = getBrowserWindow();
    if (browserWindow) {
      browserWindow.ragServiceInstance = null;
    }
  }
}
