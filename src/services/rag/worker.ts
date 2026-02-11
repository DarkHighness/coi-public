/**
 * RAG SharedWorker (VFS-first)
 */

/// <reference lib="webworker" />

import { RAGDatabase } from "./database";
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
let forkTree: SwitchSavePayload["forkTree"] | null = null;
let isInitialized = false;
let isSearching = false;
let lastError: string | null = null;
let pendingDocuments = 0;

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
    port.postMessage({ type: "ready", data: { initialized: true } } as RAGEvent);
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

async function handleInit(payload: InitPayload): Promise<{ success: boolean }> {
  if (isInitialized) {
    config = { ...config, ...payload.config };
    credentials = payload.credentials;
    return { success: true };
  }

  config = { ...DEFAULT_RAG_CONFIG, ...payload.config };
  credentials = payload.credentials;

  database = new RAGDatabase(config);
  await database.initialize();
  isInitialized = true;

  broadcastEvent({ type: "ready", data: { initialized: true } });
  return { success: true };
}

const buildDocumentId = (
  doc: UpsertFileChunksPayload["documents"][number],
): string => {
  const canonicalPath = doc.canonicalPath || doc.sourcePath;
  return [doc.saveId, canonicalPath, doc.fileHash, String(doc.chunkIndex)].join("::");
};

const normalizeFileChunk = async (
  doc: UpsertFileChunksPayload["documents"][number],
): Promise<RAGDocument> => {
  const now = Date.now();
  const embedding =
    Array.isArray(doc.embedding) && doc.embedding.length > 0
      ? new Float32Array(doc.embedding)
      : await generateEmbedding(doc.content);

  return {
    id: buildDocumentId(doc),
    sourcePath: doc.sourcePath,
    canonicalPath: doc.canonicalPath || doc.sourcePath,
    type: doc.type,
    contentType: doc.contentType,
    fileHash: doc.fileHash,
    chunkIndex: doc.chunkIndex,
    chunkCount: doc.chunkCount,
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
    tags: doc.tags,
  };
};

async function handleUpsertFileChunks(
  payload: UpsertFileChunksPayload,
): Promise<{ count: number }> {
  ensureInitialized();

  const inputDocuments = payload.documents || [];
  if (inputDocuments.length === 0) {
    return { count: 0 };
  }

  pendingDocuments += inputDocuments.length;
  const ragDocuments: RAGDocument[] = [];

  try {
    for (const doc of inputDocuments) {
      const normalized = await normalizeFileChunk(doc);
      ragDocuments.push(normalized);
      pendingDocuments -= 1;
    }

    await database!.addDocuments(ragDocuments);

    const touchedSaveIds = new Set(ragDocuments.map((doc) => doc.saveId));
    for (const saveId of touchedSaveIds) {
      await database!.enforceSaveLimit(saveId);
    }

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
  } catch (error) {
    pendingDocuments = Math.max(0, pendingDocuments - (inputDocuments.length - ragDocuments.length));
    throw error;
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

async function handleReindexAll(
  payload: ReindexAllPayload,
): Promise<{ deleted: number; count: number }> {
  ensureInitialized();

  const { saveId, forkId, documents } = payload;

  const existing = await database!.getDocumentsForSave(saveId);
  const forkPaths = Array.from(
    new Set(
      existing
        .filter((doc) => doc.forkId === forkId)
        .map((doc) => doc.canonicalPath),
    ),
  );

  let deleted = 0;
  if (forkPaths.length > 0) {
    deleted = await database!.deleteDocumentsByPaths(saveId, forkPaths, forkId);
  }

  const upserted = await handleUpsertFileChunks({ documents });
  return {
    deleted,
    count: upserted.count,
  };
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
      const docs = await database!.getDocumentsBySourcePath(sourcePath, targetSaveId);
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
    if (
      !payload.queryEmbedding &&
      (config.provider === "local_tfjs" || config.provider === "local_transformers")
    ) {
      throw new Error(
        "Local embedding runtime requires precomputed queryEmbedding from main thread",
      );
    }

    const queryEmbedding = payload.queryEmbedding
      ? payload.queryEmbedding
      : await generateEmbedding(payload.query);

    const targetForkId = payload.options.forkId ?? currentForkId;
    const allowedForkIds = payload.options.currentForkOnly
      ? forkTree
        ? getAncestorForkIds(targetForkId, forkTree)
        : [targetForkId]
      : payload.options.forkId !== undefined
        ? [payload.options.forkId]
        : undefined;

    const results = await database!.searchSimilar(queryEmbedding, currentSaveId, {
      topK: payload.options.topK,
      threshold: payload.options.threshold,
      types: payload.options.types,
      contentTypes: payload.options.contentTypes,
      pathPrefixes: payload.options.pathPrefixes,
      forkIds: allowedForkIds,
      beforeTurn: payload.options.beforeTurn,
    });

    const adjustedResults = results.map((result) => {
      const doc = result.document;
      let adjustedScore = result.score;

      if (doc.forkId === currentForkId) {
        adjustedScore += config.currentForkBonus * 0.1;
      } else if (allowedForkIds?.includes(doc.forkId)) {
        adjustedScore += config.ancestorForkBonus * 0.1;
      } else {
        adjustedScore -= 0.02;
      }

      if (payload.options.beforeTurn !== undefined) {
        const turnDiff = payload.options.beforeTurn - doc.turnNumber;
        adjustedScore -= Math.max(0, turnDiff * config.turnDecayFactor * 0.1);
      }

      return {
        ...result,
        adjustedScore: Math.min(1.0, Math.max(0, adjustedScore)),
      };
    });

    adjustedResults.sort((a, b) => b.adjustedScore - a.adjustedScore);
    return adjustedResults.slice(0, payload.options.topK || 10);
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
  forkTree = payload.forkTree;

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
  config = { ...config, ...newConfig };
  return { success: true };
}

async function handleGetStatus(): Promise<RAGStatus> {
  return {
    initialized: isInitialized,
    currentSaveId,
    currentModel: config.modelId,
    currentProvider: config.provider,
    storageDocuments: currentSaveId
      ? (await database?.getSaveStats(currentSaveId))?.totalDocuments || 0
      : 0,
    isSearching,
    pending: pendingDocuments,
    lastError,
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

  const deleted = await database!.clearSaveForRebuild(targetSaveId);

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
      throw new Error(
        "Local embedding runtime requires precomputed embeddings from main thread",
      );
    default:
      throw new Error(`Unknown embedding provider: ${config.provider}`);
  }
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

function getAncestorForkIds(
  forkId: number,
  tree: { nodes: Record<number, { id: number; parentId: number | null }> },
): number[] {
  const ancestors: number[] = [forkId];
  let currentId: number | null = forkId;

  while (currentId !== null) {
    const node = tree.nodes[currentId];
    if (!node) break;
    if (node.parentId !== null) {
      ancestors.push(node.parentId);
    }
    currentId = node.parentId;
  }

  return ancestors;
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
