/**
 * RAG SharedWorker (VFS-first)
 */

/// <reference lib="webworker" />

import { RAGDatabase } from "./database";
import { buildRagDocumentId } from "./documentId";
import {
  embedTextsLocally,
  getLocalEmbeddingRuntimeInfo,
  resetLocalEmbeddingEngines,
} from "./localEmbedding";
import {
  DEFAULT_RAG_CONFIG,
  type AddDocumentsPayload,
  type DeleteByPathsPayload,
  type DeleteDocumentsPayload,
  type ExportSaveDataPayload,
  type ExportableRAGDocument,
  type GetDocumentsPaginatedPayload,
  type GetRecentDocumentsPayload,
  type GlobalStorageStats,
  type ImportSaveDataPayload,
  type InitPayload,
  type LookupReusableEmbeddingsPayload,
  type LookupReusableEmbeddingsResult,
  type LocalEmbeddingRuntimeInfo,
  type ModelMismatchInfo,
  type RAGConfig,
  type RAGDocument,
  type RAGDocumentMeta,
  type RAGEvent,
  type RAGExportData,
  type RAGStatus,
  type RAGWorkerRequest,
  type RAGWorkerResponse,
  type ReindexAllPayload,
  type RetireLatestByPathsPayload,
  type SaveStats,
  type SearchPayload,
  type SearchResult,
  type StorageOverflowInfo,
  type SwitchSavePayload,
  type UpdateDocumentPayload,
  type UpsertFileChunksPayload,
} from "./types";

interface SharedWorkerGlobalScope {
  onconnect: ((this: SharedWorkerGlobalScope, ev: MessageEvent) => any) | null;
}

declare const self: SharedWorkerGlobalScope & typeof globalThis;

let database: RAGDatabase | null = null;
let config: RAGConfig = { ...DEFAULT_RAG_CONFIG };
let credentials: InitPayload["credentials"] | null = null;
let currentSaveId: string | null = null;
let currentForkId = 0;
let isInitialized = false;
let isSearching = false;
let lastError: string | null = null;
let pendingDocuments = 0;
let isReindexing = false;
let localRuntimeInfo: LocalEmbeddingRuntimeInfo | null = null;

const ports: Set<MessagePort> = new Set();

self.onconnect = (event: MessageEvent) => {
  const port = event.ports[0];
  ports.add(port);

  port.onmessage = async (e: MessageEvent<RAGWorkerRequest>) => {
    const request = e.data;
    let response: RAGWorkerResponse;

    try {
      const result = await handleRequest(request);
      response = {
        id: request.id,
        success: true,
        data: result,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      lastError = errorMessage;
      response = {
        id: request.id,
        success: false,
        error: errorMessage,
      };
    }

    port.postMessage(response);
  };

  port.onmessageerror = (e) => {
    console.error("[RAGWorker] Message error:", e);
  };

  if (isInitialized) {
    port.postMessage({
      type: "ready",
      data: { initialized: true },
    } as RAGEvent);
  }

  port.start();
};

async function handleRequest(request: RAGWorkerRequest): Promise<any> {
  switch (request.type) {
    case "init":
      return handleInit(request.payload as InitPayload);

    case "upsertFileChunks":
      return handleUpsertFileChunks(request.payload as UpsertFileChunksPayload);

    case "deleteByPaths":
      return handleDeleteByPaths(request.payload as DeleteByPathsPayload);

    case "retireLatestByPaths":
      return handleRetireLatestByPaths(
        request.payload as RetireLatestByPathsPayload,
      );

    case "lookupReusableEmbeddings":
      return handleLookupReusableEmbeddings(
        request.payload as LookupReusableEmbeddingsPayload,
      );

    case "reindexAll":
      return handleReindexAll(request.payload as ReindexAllPayload);

    // Legacy aliases
    case "addDocuments":
      return handleAddDocuments(request.payload as AddDocumentsPayload);

    case "updateDocument":
      return handleUpdateDocument(request.payload as UpdateDocumentPayload);

    case "deleteDocuments":
      return handleDeleteDocuments(request.payload as DeleteDocumentsPayload);

    case "search":
      return handleSearch(request.payload as SearchPayload);

    case "getRecentDocuments":
      return handleGetRecentDocuments(
        request.payload as GetRecentDocumentsPayload,
      );

    case "getDocumentsPaginated":
      return handleGetDocumentsPaginated(
        request.payload as GetDocumentsPaginatedPayload,
      );

    case "switchSave":
      return handleSwitchSave(request.payload as SwitchSavePayload);

    case "getSaveStats":
      return handleGetSaveStats(request.payload?.saveId);

    case "cleanup":
      return handleCleanup();

    case "updateConfig":
      return handleUpdateConfig(request.payload);

    case "getStatus":
      return handleGetStatus();

    case "clearSave":
      return handleClearSave(request.payload?.saveId);

    case "checkModelMismatch":
      return handleCheckModelMismatch(request.payload?.saveId);

    case "rebuildForModel":
      return handleRebuildForModel(request.payload?.saveId);

    case "checkStorageOverflow":
      return handleCheckStorageOverflow();

    case "deleteOldestSaves":
      return handleDeleteOldestSaves(request.payload?.saveIds);

    case "getAllSaveStats":
      return handleGetAllSaveStats();

    case "exportSaveData":
      return handleExportSaveData(request.payload as ExportSaveDataPayload);

    case "importSaveData":
      return handleImportSaveData(request.payload as ImportSaveDataPayload);

    default:
      throw new Error(`Unknown request type: ${request.type}`);
  }
}

const isLocalRuntimeProvider = (
  provider: RAGConfig["provider"] = config.provider,
): boolean => {
  return provider === "local_tfjs" || provider === "local_transformers";
};

const getWorkerLocalEmbeddingConfig = (): NonNullable<RAGConfig["local"]> => {
  const merged = {
    ...(DEFAULT_RAG_CONFIG.local || {
      backend: "transformers_js",
      model: "use-lite-512",
      transformersModel: "Xenova/all-MiniLM-L6-v2",
      backendOrder: ["webgpu", "webgl", "cpu"],
      deviceOrder: ["webgpu", "wasm", "cpu"],
      quantized: true,
    }),
    ...(config.local || {}),
  };

  if (config.provider === "local_tfjs") {
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
};

const hasLocalRuntimeConfigChanged = (
  previous: RAGConfig,
  next: RAGConfig,
): boolean => {
  if (previous.provider !== next.provider) {
    return true;
  }

  if (!isLocalRuntimeProvider(previous.provider) && !isLocalRuntimeProvider(next.provider)) {
    return false;
  }

  return JSON.stringify(previous.local || null) !== JSON.stringify(next.local || null);
};

const resetLocalRuntimeState = async (): Promise<void> => {
  localRuntimeInfo = null;
  await resetLocalEmbeddingEngines().catch(() => undefined);
};

async function handleInit(payload: InitPayload): Promise<{ success: boolean }> {
  if (isInitialized) {
    const previousConfig = config;
    config = {
      ...config,
      ...payload.config,
      local: {
        ...(config.local || DEFAULT_RAG_CONFIG.local || {}),
        ...(payload.config.local || {}),
      },
    };
    credentials = payload.credentials;

    if (hasLocalRuntimeConfigChanged(previousConfig, config)) {
      await resetLocalRuntimeState();
    }

    return { success: true };
  }

  config = {
    ...DEFAULT_RAG_CONFIG,
    ...payload.config,
    local: {
      ...(DEFAULT_RAG_CONFIG.local || {}),
      ...(payload.config.local || {}),
    },
  };
  credentials = payload.credentials;
  localRuntimeInfo = null;

  database = new RAGDatabase(config);
  await database.initialize();
  isInitialized = true;

  broadcastEvent({ type: "ready", data: { initialized: true } });
  return { success: true };
}

const normalizeFileChunk = (
  doc: UpsertFileChunksPayload["documents"][number],
  embedding: Float32Array,
): RAGDocument => {
  const now = Date.now();
  const estimatedBytes = doc.content.length * 2 + embedding.length * 4 + 256;

  return {
    id: buildRagDocumentId({
      saveId: doc.saveId,
      forkId: doc.forkId,
      sourcePath: doc.sourcePath,
      canonicalPath: doc.canonicalPath,
      fileHash: doc.fileHash,
      chunkIndex: doc.chunkIndex,
      provider: config.provider,
      modelId: config.modelId,
    }),
    sourcePath: doc.sourcePath,
    canonicalPath: doc.canonicalPath || doc.sourcePath,
    type: doc.type,
    contentType: doc.contentType,
    fileHash: doc.fileHash,
    chunkIndex: doc.chunkIndex,
    chunkCount: doc.chunkCount,
    isLatest: true,
    supersededAtTurn: null,
    content: doc.content,
    embedding,
    saveId: doc.saveId,
    forkId: doc.forkId,
    turnNumber: doc.turnNumber,
    embeddingModel: config.modelId,
    embeddingProvider: config.provider,
    importance: doc.importance ?? 0.5,
    createdAt: now,
    lastAccess: now,
    estimatedBytes,
    tags: doc.tags,
  };
};

interface UpsertProgressData {
  phase: "embedding" | "indexing";
  current: number;
  total: number;
  message?: string;
  runtime?: LocalEmbeddingRuntimeInfo;
  messageKey?: string;
  messageParams?: Record<string, string | number>;
}

const createProgressThrottler = (
  total: number,
  maxEvents = 96,
): ((current: number) => boolean) => {
  const safeTotal = Math.max(1, total);
  const step = Math.max(1, Math.ceil(safeTotal / Math.max(1, maxEvents)));
  let last = 0;

  return (current: number) => {
    const normalized = Math.max(0, Math.min(safeTotal, current));
    if (normalized >= safeTotal || normalized <= 1) {
      last = normalized;
      return true;
    }
    if (normalized - last >= step) {
      last = normalized;
      return true;
    }
    return false;
  };
};

const toFloat32Embedding = (embedding?: number[]): Float32Array | null => {
  if (!Array.isArray(embedding) || embedding.length === 0) {
    return null;
  }
  return new Float32Array(embedding);
};

const resolveDocumentEmbeddings = async (
  inputDocuments: UpsertFileChunksPayload["documents"],
  onProgress?: (data: UpsertProgressData) => void,
): Promise<Float32Array[]> => {
  const total = inputDocuments.length;
  const embeddings: Array<Float32Array | null> = Array.from(
    { length: total },
    () => null,
  );

  const missing: Array<{
    index: number;
    doc: UpsertFileChunksPayload["documents"][number];
  }> = [];
  let embeddedCount = 0;
  const shouldEmitEmbeddingProgress = createProgressThrottler(total);

  inputDocuments.forEach((doc, index) => {
    const provided = toFloat32Embedding(doc.embedding);
    if (provided) {
      embeddings[index] = provided;
      embeddedCount += 1;
      return;
    }
    missing.push({ index, doc });
  });

  if (missing.length === 0) {
    onProgress?.({
      phase: "embedding",
      current: total,
      total,
      message: `Embedding chunks (${total}/${total})`,
      runtime: localRuntimeInfo || undefined,
      messageKey: "ragDebugger.progressEmbeddingChunks",
      messageParams: { current: total, total },
    });
  } else if (isLocalRuntimeProvider()) {
    const localConfig = getWorkerLocalEmbeddingConfig();
    const runtime = await getLocalEmbeddingRuntimeInfo(localConfig);
    localRuntimeInfo = runtime;

    const batchSize = Math.max(1, localConfig.batchSize || 8);
    if (shouldEmitEmbeddingProgress(embeddedCount)) {
      onProgress?.({
        phase: "embedding",
        current: embeddedCount,
        total,
        message: `Embedding chunks (${embeddedCount}/${total})`,
        runtime,
        messageKey: "ragDebugger.progressEmbeddingChunks",
        messageParams: { current: embeddedCount, total },
      });
    }

    for (let start = 0; start < missing.length; start += batchSize) {
      const batch = missing.slice(start, start + batchSize);
      const vectors = await embedTextsLocally(
        batch.map(({ doc }) => doc.content),
        localConfig,
      );

      if (vectors.length !== batch.length) {
        throw new Error(
          `Local embedding size mismatch: expected ${batch.length}, got ${vectors.length}`,
        );
      }

      batch.forEach(({ index }, vectorIndex) => {
        embeddings[index] = new Float32Array(vectors[vectorIndex]);
      });

      embeddedCount += batch.length;
      if (shouldEmitEmbeddingProgress(embeddedCount)) {
        onProgress?.({
          phase: "embedding",
          current: embeddedCount,
          total,
          message: `Embedding chunks (${embeddedCount}/${total})`,
          runtime,
          messageKey: "ragDebugger.progressEmbeddingChunks",
          messageParams: { current: embeddedCount, total },
        });
      }
    }
  } else {
    const maxConcurrency = Math.min(4, missing.length);
    const progressBase = embeddedCount;
    let cursor = 0;
    let completed = 0;

    const workers = Array.from({ length: maxConcurrency }, async () => {
      while (true) {
        const offset = cursor;
        cursor += 1;
        if (offset >= missing.length) {
          return;
        }

        const entry = missing[offset];
        embeddings[entry.index] = await generateEmbedding(entry.doc.content);
        completed += 1;
        const current = progressBase + completed;
        if (shouldEmitEmbeddingProgress(current)) {
          onProgress?.({
            phase: "embedding",
            current,
            total,
            message: `Embedding chunks (${current}/${total})`,
            messageKey: "ragDebugger.progressEmbeddingChunks",
            messageParams: { current, total },
          });
        }
      }
    });

    await Promise.all(workers);
  }

  return embeddings.map((embedding, index) => {
    if (!embedding) {
      throw new Error(
        `Failed to resolve embedding for chunk ${index + 1}/${total}`,
      );
    }
    return embedding;
  });
};

async function handleUpsertFileChunks(
  payload: UpsertFileChunksPayload,
  onProgress?: (data: UpsertProgressData) => void,
): Promise<{ count: number }> {
  ensureInitialized();

  const inputDocuments = payload.documents || [];
  if (inputDocuments.length === 0) {
    return { count: 0 };
  }

  pendingDocuments += inputDocuments.length;
  const total = inputDocuments.length;

  try {
    const embeddings = await resolveDocumentEmbeddings(inputDocuments, onProgress);
    const ragDocuments: RAGDocument[] = [];
    const shouldEmitIndexingProgress = createProgressThrottler(total);

    for (let index = 0; index < inputDocuments.length; index += 1) {
      const normalized = normalizeFileChunk(inputDocuments[index], embeddings[index]);
      ragDocuments.push(normalized);

      const current = index + 1;
      if (shouldEmitIndexingProgress(current)) {
        onProgress?.({
          phase: "indexing",
          current,
          total,
          message: `Indexing chunks (${current}/${total})`,
          messageKey: "ragDebugger.progressIndexingChunks",
          messageParams: { current, total },
        });
      }
    }

    onProgress?.({
      phase: "indexing",
      current: total,
      total,
      message: "Writing chunks to index...",
      messageKey: "ragDebugger.progressWritingChunks",
    });

    await database!.addDocuments(ragDocuments);

    await database!.enforceStorageLimits();

    const overflow = await database!.checkStorageOverflow();
    if (overflow) {
      broadcastEvent({ type: "storageOverflow", data: overflow });
    }

    const first = ragDocuments[0];
    broadcastEvent({
      type: "indexUpdated",
      data: {
        count: ragDocuments.length,
        saveId: first?.saveId,
      },
    });

    return { count: ragDocuments.length };
  } finally {
    pendingDocuments = Math.max(
      0,
      pendingDocuments - inputDocuments.length,
    );
  }
}

async function handleDeleteByPaths(
  payload: DeleteByPathsPayload,
): Promise<{ deleted: number }> {
  ensureInitialized();

  if (!payload.saveId) {
    throw new Error("deleteByPaths requires saveId");
  }

  const paths = payload.paths || [];
  if (paths.length === 0) {
    return { deleted: 0 };
  }

  const deleted = await database!.deleteDocumentsByPaths(
    payload.saveId,
    paths,
    payload.forkId,
  );

  broadcastEvent({
    type: "indexUpdated",
    data: {
      count: -deleted,
      saveId: payload.saveId,
    },
  });

  return { deleted };
}

async function handleRetireLatestByPaths(
  payload: RetireLatestByPathsPayload,
): Promise<{ deleted: number }> {
  ensureInitialized();

  if (!payload.saveId) {
    throw new Error("retireLatestByPaths requires saveId");
  }

  const paths = payload.paths || [];
  if (paths.length === 0) {
    return { deleted: 0 };
  }

  const deleted = await database!.retireLatestByPaths(
    payload.saveId,
    payload.forkId,
    payload.turnNumber,
    paths,
  );

  if (deleted > 0) {
    broadcastEvent({
      type: "indexUpdated",
      data: {
        count: -deleted,
        saveId: payload.saveId,
      },
    });
  }

  return { deleted };
}

async function handleLookupReusableEmbeddings(
  payload: LookupReusableEmbeddingsPayload,
): Promise<LookupReusableEmbeddingsResult> {
  ensureInitialized();

  const items = payload.items || [];
  if (items.length === 0) {
    return { embeddings: [] };
  }

  const embeddings = await database!.lookupReusableEmbeddings(
    items,
    config.modelId,
    config.provider,
  );

  return { embeddings };
}

async function handleReindexAll(
  payload: ReindexAllPayload,
): Promise<{ deleted: number; count: number }> {
  ensureInitialized();
  if (isReindexing) {
    throw new Error("Reindex already in progress. Please wait.");
  }

  isReindexing = true;

  try {
    const { saveId, forkId, documents } = payload;
    const documentCount = documents.length;
    const totalProgress = Math.max(2, documentCount * 2 + 2);
    const embeddingBase = 1;
    const indexingBase = 1 + documentCount;

    broadcastEvent({
      type: "progress",
      data: {
        phase: "indexing",
        current: 1,
        total: totalProgress,
        message: "Preparing reindex...",
        messageKey: "ragDebugger.progressPreparingReindex",
      },
    });

    const existing = await database!.getDocumentsForSave(saveId);
    const forkPaths = Array.from(
      new Set(
        existing
          .filter((doc) => doc.forkId === forkId && doc.isLatest)
          .map((doc) => doc.canonicalPath),
      ),
    );

    let deleted = 0;
    if (forkPaths.length > 0) {
      deleted = await database!.deleteDocumentsByPaths(
        saveId,
        forkPaths,
        forkId,
      );
    }

    broadcastEvent({
      type: "progress",
      data: {
        phase: "indexing",
        current: 1,
        total: totalProgress,
        message: "Clearing previous latest chunks...",
        messageKey: "ragDebugger.progressClearingPreviousChunks",
      },
    });

    const upserted = await handleUpsertFileChunks({ documents }, (progress) => {
      const base = progress.phase === "embedding" ? embeddingBase : indexingBase;
      broadcastEvent({
        type: "progress",
        data: {
          phase: progress.phase,
          current: Math.min(
            totalProgress - 1,
            base + Math.min(documentCount, progress.current),
          ),
          total: totalProgress,
          message: progress.message,
          runtime: progress.runtime,
          messageKey: progress.messageKey,
          messageParams: progress.messageParams,
        },
      });
    });

    broadcastEvent({
      type: "progress",
      data: {
        phase: "indexing",
        current: totalProgress,
        total: totalProgress,
        message: `Reindex complete (${upserted.count} chunks)`,
        messageKey: "ragDebugger.progressReindexComplete",
        messageParams: { count: upserted.count },
      },
    });

    return {
      deleted,
      count: upserted.count,
    };
  } finally {
    isReindexing = false;
  }
}

// Legacy compatibility routes
async function handleAddDocuments(
  payload: AddDocumentsPayload,
): Promise<{ count: number }> {
  return handleUpsertFileChunks({ documents: payload.documents });
}

async function handleUpdateDocument(
  payload: UpdateDocumentPayload,
): Promise<{ success: boolean }> {
  await handleUpsertFileChunks({ documents: [payload] });
  return { success: true };
}

async function handleDeleteDocuments(
  payload: DeleteDocumentsPayload,
): Promise<{ deleted: number }> {
  ensureInitialized();

  const targetSaveId = payload.saveId || currentSaveId;
  if (!targetSaveId) return { deleted: 0 };

  if (payload.paths && payload.paths.length > 0) {
    return handleDeleteByPaths({
      saveId: targetSaveId,
      forkId: payload.forkId,
      paths: payload.paths,
    });
  }

  if (payload.entityIds && payload.entityIds.length > 0) {
    let deleted = 0;

    for (const sourcePath of payload.entityIds) {
      const docs = await database!.getDocumentsBySourcePath(
        sourcePath,
        targetSaveId,
      );
      for (const doc of docs) {
        await database!.deleteDocument(doc.id);
        deleted += 1;
      }
    }

    if (deleted > 0) {
      broadcastEvent({
        type: "indexUpdated",
        data: { count: -deleted, saveId: targetSaveId },
      });
    }

    return { deleted };
  }

  if (typeof payload.olderThanTurn === "number") {
    const docs = await database!.getDocumentsForSave(targetSaveId);
    const targetDocs = docs.filter((doc) => {
      if (payload.forkId !== undefined && doc.forkId !== payload.forkId) {
        return false;
      }
      return doc.turnNumber < payload.olderThanTurn!;
    });

    for (const doc of targetDocs) {
      await database!.deleteDocument(doc.id);
    }

    if (targetDocs.length > 0) {
      broadcastEvent({
        type: "indexUpdated",
        data: { count: -targetDocs.length, saveId: targetSaveId },
      });
    }

    return { deleted: targetDocs.length };
  }

  const deleted = await database!.deleteDocumentsBySave(targetSaveId);
  if (targetSaveId === currentSaveId) {
    currentSaveId = null;
  }

  return { deleted };
}

async function handleSearch(payload: SearchPayload): Promise<SearchResult[]> {
  ensureInitialized();

  if (!currentSaveId) {
    throw new Error("No save context set. Call switchSave first.");
  }

  isSearching = true;

  try {
    const queryEmbedding = payload.queryEmbedding
      ? payload.queryEmbedding
      : await generateEmbedding(payload.query);

    if (
      payload.options.forkId !== undefined &&
      payload.options.forkId !== currentForkId
    ) {
      console.warn(
        `[RAGWorker] Ignoring cross-fork search request (requested=${payload.options.forkId}, current=${currentForkId})`,
      );
    }

    return await database!.searchSimilar(queryEmbedding, currentSaveId, {
      topK: payload.options.topK,
      threshold: payload.options.threshold,
      types: payload.options.types,
      contentTypes: payload.options.contentTypes,
      pathPrefixes: payload.options.pathPrefixes,
      forkId: currentForkId,
      beforeTurn: payload.options.beforeTurn,
      modelId: config.modelId,
      provider: config.provider,
    });
  } finally {
    isSearching = false;
  }
}

async function handleGetRecentDocuments(
  payload: GetRecentDocumentsPayload,
): Promise<RAGDocumentMeta[]> {
  ensureInitialized();

  if (!currentSaveId) {
    return [];
  }

  const limit = payload.limit || 20;
  return database!.getRecentDocuments(currentSaveId, limit, payload.types);
}

async function handleGetDocumentsPaginated(
  payload: GetDocumentsPaginatedPayload,
): Promise<{ documents: RAGDocumentMeta[]; total: number }> {
  ensureInitialized();

  if (!currentSaveId) {
    return { documents: [], total: 0 };
  }

  return database!.getDocumentsPaginated(
    currentSaveId,
    payload.offset,
    payload.limit,
    payload.types,
  );
}

async function handleSwitchSave(
  payload: SwitchSavePayload,
): Promise<{ success: boolean }> {
  ensureInitialized();

  currentSaveId = payload.saveId;
  currentForkId = payload.forkId;

  await database!.markSaveActive(payload.saveId, payload.forkId);

  return { success: true };
}

async function handleGetSaveStats(saveId?: string): Promise<SaveStats | null> {
  ensureInitialized();

  const targetSaveId = saveId || currentSaveId;
  if (!targetSaveId) return null;

  return database!.getSaveStats(targetSaveId);
}

async function handleCleanup(): Promise<{
  deletedVersions: number;
  deletedStorage: number;
}> {
  ensureInitialized();

  broadcastEvent({
    type: "progress",
    data: {
      phase: "cleanup",
      current: 0,
      total: 2,
      message: "Cleaning up indexed chunks...",
    },
  });

  const deletedVersions = await database!.cleanupOldVersions();

  broadcastEvent({
    type: "progress",
    data: {
      phase: "cleanup",
      current: 1,
      total: 2,
      message: "Enforcing storage limits...",
    },
  });

  const deletedStorage = await database!.enforceStorageLimits();

  broadcastEvent({
    type: "cleanupComplete",
    data: { deletedVersions, deletedStorage },
  });

  return { deletedVersions, deletedStorage };
}

async function handleUpdateConfig(
  newConfig: Partial<RAGConfig>,
): Promise<{ success: boolean }> {
  const previousConfig = config;
  config = {
    ...config,
    ...newConfig,
    local: {
      ...(config.local || DEFAULT_RAG_CONFIG.local || {}),
      ...(newConfig.local || {}),
    },
  };

  if (hasLocalRuntimeConfigChanged(previousConfig, config)) {
    await resetLocalRuntimeState();
  }

  return { success: true };
}

async function handleGetStatus(): Promise<RAGStatus> {
  const saveStats = currentSaveId
    ? await database?.getSaveStats(currentSaveId)
    : null;
  const breakdown = database
    ? await database.getStorageStatusBreakdown()
    : null;

  return {
    initialized: isInitialized,
    currentSaveId,
    currentModel: config.modelId,
    currentProvider: config.provider,
    localRuntime: localRuntimeInfo,
    storageDocuments: saveStats?.totalDocuments || 0,
    isSearching,
    pending: pendingDocuments,
    lastError,
    protectedBytes: breakdown?.protectedBytes,
    currentForkHistoryBytes: breakdown?.currentForkHistoryBytes,
    activeOtherForkBytes: breakdown?.activeOtherForkBytes,
    inactiveGameBytes: breakdown?.inactiveGameBytes,
    storageLimitBytes: breakdown?.storageLimitBytes,
    protectedOverflow: breakdown?.protectedOverflow,
  };
}

async function handleClearSave(saveId?: string): Promise<{ deleted: number }> {
  ensureInitialized();

  const targetSaveId = saveId || currentSaveId;
  if (!targetSaveId) return { deleted: 0 };

  const deleted = await database!.deleteDocumentsBySave(targetSaveId);

  if (targetSaveId === currentSaveId) {
    currentSaveId = null;
  }

  return { deleted };
}

async function handleCheckModelMismatch(
  saveId?: string,
): Promise<ModelMismatchInfo | null> {
  ensureInitialized();

  const targetSaveId = saveId || currentSaveId;
  if (!targetSaveId) return null;

  const mismatch = await database!.checkModelMismatch(
    targetSaveId,
    currentForkId,
    config.modelId,
    config.provider,
  );

  if (mismatch) {
    broadcastEvent({ type: "modelMismatch", data: mismatch });
  }

  return mismatch;
}

async function handleRebuildForModel(
  saveId?: string,
): Promise<{ deleted: number }> {
  ensureInitialized();

  const targetSaveId = saveId || currentSaveId;
  if (!targetSaveId) return { deleted: 0 };

  const deleted = await database!.clearSaveForRebuild(
    targetSaveId,
    currentForkId,
  );

  broadcastEvent({
    type: "progress",
    data: {
      phase: "cleanup",
      current: deleted,
      total: deleted,
      message: `Cleared ${deleted} documents for model rebuild`,
    },
  });

  return { deleted };
}

async function handleCheckStorageOverflow(): Promise<StorageOverflowInfo | null> {
  ensureInitialized();

  const overflow = await database!.checkStorageOverflow();
  if (overflow) {
    broadcastEvent({ type: "storageOverflow", data: overflow });
  }

  return overflow;
}

async function handleDeleteOldestSaves(
  saveIds?: string[],
): Promise<{ deleted: number }> {
  ensureInitialized();

  if (!saveIds || saveIds.length === 0) return { deleted: 0 };

  const deleted = await database!.deleteOldestFromSaves(saveIds);

  if (currentSaveId && saveIds.includes(currentSaveId)) {
    currentSaveId = null;
  }

  return { deleted };
}

async function handleGetAllSaveStats(): Promise<GlobalStorageStats> {
  ensureInitialized();
  return database!.getGlobalStats();
}

async function generateEmbedding(text: string): Promise<Float32Array> {
  if (
    config.provider !== "local_tfjs" &&
    config.provider !== "local_transformers" &&
    !credentials
  ) {
    throw new Error("No credentials configured for embedding generation");
  }

  if (config.contextLength) {
    const estimatedTokens = Math.ceil(text.length / 4);
    if (estimatedTokens > config.contextLength) {
      throw new Error(
        `Input text exceeds context length limit (${estimatedTokens} > ${config.contextLength} tokens)`,
      );
    }
  }

  switch (config.provider) {
    case "gemini":
      return generateGeminiEmbedding(text);
    case "openai":
      return generateOpenAIEmbedding(text);
    case "openrouter":
      return generateOpenRouterEmbedding(text);
    case "claude":
      throw new Error(
        "Claude does not support embedding generation. Please use Gemini, OpenAI, or OpenRouter for embeddings.",
      );
    case "local_tfjs":
    case "local_transformers":
      return generateLocalEmbedding(text);
    default:
      throw new Error(`Unknown embedding provider: ${config.provider}`);
  }
}

async function generateLocalEmbedding(text: string): Promise<Float32Array> {
  const localConfig = getWorkerLocalEmbeddingConfig();
  const runtime = await getLocalEmbeddingRuntimeInfo(localConfig);
  localRuntimeInfo = runtime;

  const vectors = await embedTextsLocally([text], localConfig);
  if (!vectors[0] || vectors[0].length === 0) {
    throw new Error("Failed to generate local embedding for query");
  }

  return new Float32Array(vectors[0]);
}

async function generateGeminiEmbedding(text: string): Promise<Float32Array> {
  const apiKey = credentials?.gemini?.apiKey;
  if (!apiKey) throw new Error("Gemini API key not configured");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.modelId}:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${config.modelId}`,
        content: { parts: [{ text }] },
        taskType: "RETRIEVAL_DOCUMENT",
        ...(config.dimensions && { outputDimensionality: config.dimensions }),
      }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini embedding failed: ${error}`);
  }

  const data = await response.json();
  return new Float32Array(data.embedding.values);
}

async function generateOpenAIEmbedding(text: string): Promise<Float32Array> {
  const apiKey = credentials?.openai?.apiKey;
  if (!apiKey) throw new Error("OpenAI API key not configured");

  const baseUrl = credentials?.openai?.baseUrl || "https://api.openai.com/v1";
  const response = await fetch(`${baseUrl}/embeddings`, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.modelId,
      input: text,
      ...(config.dimensions && { dimensions: config.dimensions }),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI embedding failed: ${error}`);
  }

  const data = await response.json();
  return new Float32Array(data.data[0].embedding);
}

async function generateOpenRouterEmbedding(
  text: string,
): Promise<Float32Array> {
  const apiKey = credentials?.openrouter?.apiKey;
  if (!apiKey) throw new Error("OpenRouter API key not configured");

  const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://coi.twiliness.qzz.io",
      "X-Title": "CoI Game",
    },
    body: JSON.stringify({
      model: config.modelId,
      input: text,
      ...(config.dimensions && { dimensions: config.dimensions }),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter embedding failed: ${error}`);
  }

  const data = await response.json();
  return new Float32Array(data.data[0].embedding);
}

function ensureInitialized(): void {
  if (!isInitialized || !database) {
    throw new Error("RAG Worker not initialized. Call init first.");
  }
}

function broadcastEvent(event: RAGEvent): void {
  for (const port of ports) {
    port.postMessage(event);
  }
}

async function handleExportSaveData(
  payload: ExportSaveDataPayload,
): Promise<RAGExportData | null> {
  ensureInitialized();

  const { saveId } = payload;
  const documents = await database!.getDocumentsWithEmbeddingsForSave(saveId);

  if (documents.length === 0) {
    return null;
  }

  const exportableDocuments: ExportableRAGDocument[] = documents.map((doc) => ({
    id: doc.id,
    sourcePath: doc.sourcePath,
    canonicalPath: doc.canonicalPath,
    type: doc.type,
    contentType: doc.contentType,
    fileHash: doc.fileHash,
    chunkIndex: doc.chunkIndex,
    chunkCount: doc.chunkCount,
    isLatest: doc.isLatest,
    supersededAtTurn: doc.supersededAtTurn,
    content: doc.content,
    embedding: doc.embedding ? Array.from(doc.embedding) : [],
    saveId: doc.saveId,
    forkId: doc.forkId,
    turnNumber: doc.turnNumber,
    embeddingModel: doc.embeddingModel,
    embeddingProvider: doc.embeddingProvider,
    importance: doc.importance,
    createdAt: doc.createdAt,
    lastAccess: doc.lastAccess,
    estimatedBytes: doc.estimatedBytes,
    tags: doc.tags,
  }));

  const firstDoc = documents[0];

  return {
    saveId,
    documents: exportableDocuments,
    metadata: {
      totalDocuments: documents.length,
      embeddingModel: firstDoc.embeddingModel,
      embeddingProvider: firstDoc.embeddingProvider,
      dimensions: firstDoc.embedding?.length || config.dimensions,
      exportedAt: Date.now(),
      schemaVersion: config.schemaVersion,
    },
  };
}

async function handleImportSaveData(
  payload: ImportSaveDataPayload,
): Promise<{ success: boolean; imported: number }> {
  ensureInitialized();

  const { data, newSaveId } = payload;

  const documents = data.documents.map((doc) => ({
    ...doc,
    id: crypto.randomUUID(),
    saveId: newSaveId,
    embedding: new Float32Array(doc.embedding),
  }));

  const imported = await database!.importDocuments(documents);
  return { success: true, imported };
}

export { handleRequest, generateEmbedding };
