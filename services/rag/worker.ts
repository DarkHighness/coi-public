/**
 * RAG SharedWorker
 *
 * A SharedWorker that manages the RAG (Retrieval Augmented Generation) system
 * independently from the game thread. This prevents UI blocking during
 * embedding generation and similarity search operations.
 *
 * Key Features:
 * - PGlite + pgvector for vector storage and similarity search
 * - LRU cache for fast in-memory access
 * - Save-isolated data with version control
 * - Automatic cleanup and storage limit enforcement
 */

/// <reference lib="webworker" />

import { RAGDatabase } from './database';
import { LRUCacheManager } from './lruCache';
import {
  DEFAULT_RAG_CONFIG,
  type RAGConfig,
  type RAGDocument,
  type DocumentType,
  type RAGWorkerRequest,
  type RAGWorkerResponse,
  type RAGEvent,
  type InitPayload,
  type AddDocumentsPayload,
  type UpdateDocumentPayload,
  type DeleteDocumentsPayload,
  type SearchPayload,
  type SwitchSavePayload,
  type SearchResult,
  type SaveStats,
  type RAGStatus,
  type ModelMismatchInfo,
  type StorageOverflowInfo,
  type GlobalStorageStats,
} from './types';

// ============================================================================
// SharedWorker Type Definition
// ============================================================================

interface SharedWorkerGlobalScope {
  onconnect: ((this: SharedWorkerGlobalScope, ev: MessageEvent) => any) | null;
}

// ============================================================================
// Worker State
// ============================================================================

let database: RAGDatabase | null = null;
let cache: LRUCacheManager | null = null;
let config: RAGConfig = { ...DEFAULT_RAG_CONFIG };
let credentials: InitPayload['credentials'] | null = null;
let currentSaveId: string | null = null;
let currentForkId: number = 0;
let forkTree: SwitchSavePayload['forkTree'] | null = null;
let isInitialized = false;
let isSearching = false;
let lastError: string | null = null;

// Connected ports (SharedWorker can have multiple connections)
const ports: Set<MessagePort> = new Set();

// ============================================================================
// SharedWorker Entry Point
// ============================================================================

// SharedWorker global scope
declare const self: SharedWorkerGlobalScope & typeof globalThis;

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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
    console.error('[RAGWorker] Message error:', e);
  };

  // Send ready event if already initialized
  if (isInitialized) {
    port.postMessage({ type: 'ready', data: { initialized: true } } as RAGEvent);
  }

  port.start();
};

// ============================================================================
// Request Handler
// ============================================================================

async function handleRequest(request: RAGWorkerRequest): Promise<any> {
  switch (request.type) {
    case 'init':
      return handleInit(request.payload as InitPayload);

    case 'addDocuments':
      return handleAddDocuments(request.payload as AddDocumentsPayload);

    case 'updateDocument':
      return handleUpdateDocument(request.payload as UpdateDocumentPayload);

    case 'deleteDocuments':
      return handleDeleteDocuments(request.payload as DeleteDocumentsPayload);

    case 'search':
      return handleSearch(request.payload as SearchPayload);

    case 'switchSave':
      return handleSwitchSave(request.payload as SwitchSavePayload);

    case 'getSaveStats':
      return handleGetSaveStats(request.payload?.saveId);

    case 'cleanup':
      return handleCleanup();

    case 'updateConfig':
      return handleUpdateConfig(request.payload);

    case 'getStatus':
      return handleGetStatus();

    case 'clearSave':
      return handleClearSave(request.payload?.saveId);

    case 'checkModelMismatch':
      return handleCheckModelMismatch(request.payload?.saveId);

    case 'rebuildForModel':
      return handleRebuildForModel(request.payload?.saveId);

    case 'checkStorageOverflow':
      return handleCheckStorageOverflow();

    case 'deleteOldestSaves':
      return handleDeleteOldestSaves(request.payload?.saveIds);

    case 'getAllSaveStats':
      return handleGetAllSaveStats();

    default:
      throw new Error(`Unknown request type: ${request.type}`);
  }
}

// ============================================================================
// Handler Implementations
// ============================================================================

async function handleInit(payload: InitPayload): Promise<{ success: boolean }> {
  if (isInitialized) {
    // Re-initialize with new config/credentials
    config = { ...config, ...payload.config };
    credentials = payload.credentials;
    cache?.updateConfig(config);
    return { success: true };
  }

  config = { ...DEFAULT_RAG_CONFIG, ...payload.config };
  credentials = payload.credentials;

  // Initialize database
  database = new RAGDatabase(config);
  await database.initialize();

  // Initialize cache
  cache = new LRUCacheManager(config);

  isInitialized = true;

  // Broadcast ready event to all ports
  broadcastEvent({ type: 'ready', data: { initialized: true } });

  console.log('[RAGWorker] Initialized successfully');
  return { success: true };
}

async function handleAddDocuments(payload: AddDocumentsPayload): Promise<{ count: number }> {
  ensureInitialized();

  const documents: RAGDocument[] = [];
  const now = Date.now();

  for (const doc of payload.documents) {
    // Generate embedding for document
    const embedding = await generateEmbedding(doc.content);

    const ragDoc: RAGDocument = {
      id: `${doc.saveId}-${doc.entityId}-${now}-${Math.random().toString(36).substr(2, 9)}`,
      entityId: doc.entityId,
      type: doc.type,
      content: doc.content,
      embedding,
      saveId: doc.saveId,
      forkId: doc.forkId,
      turnNumber: doc.turnNumber,
      version: 1, // Will be assigned by database
      embeddingModel: config.modelId,
      embeddingProvider: config.provider,
      importance: doc.importance ?? 0.5,
      unlocked: doc.unlocked ?? false,
      createdAt: now,
      lastAccess: now,
    };

    documents.push(ragDoc);
  }

  // Check and enforce per-save limits
  if (documents.length > 0) {
    const saveId = documents[0].saveId;
    await database!.enforceSaveLimit(saveId);
  }

  // Add to database
  await database!.addDocuments(documents);

  // Check global storage overflow
  const overflow = await database!.checkStorageOverflow();
  if (overflow) {
    broadcastEvent({
      type: 'storageOverflow',
      data: overflow,
    });
  }

  // Add to cache if from current save
  if (currentSaveId) {
    const docsForCurrentSave = documents.filter(d => d.saveId === currentSaveId);
    cache!.setMany(docsForCurrentSave);
  }

  // Broadcast update event
  broadcastEvent({
    type: 'indexUpdated',
    data: { count: documents.length, saveId: documents[0]?.saveId }
  });

  return { count: documents.length };
}

async function handleUpdateDocument(payload: UpdateDocumentPayload): Promise<{ success: boolean }> {
  ensureInitialized();

  const now = Date.now();
  const embedding = await generateEmbedding(payload.content);

  const ragDoc: RAGDocument = {
    id: `${payload.saveId}-${payload.entityId}-${now}-${Math.random().toString(36).substr(2, 9)}`,
    entityId: payload.entityId,
    type: payload.type,
    content: payload.content,
    embedding,
    saveId: payload.saveId,
    forkId: payload.forkId,
    turnNumber: payload.turnNumber,
    version: 1, // Will be incremented by database
    embeddingModel: config.modelId,
    embeddingProvider: config.provider,
    importance: payload.importance ?? 0.5,
    unlocked: payload.unlocked ?? false,
    createdAt: now,
    lastAccess: now,
  };

  await database!.addDocument(ragDoc);

  // Update cache if from current save
  if (payload.saveId === currentSaveId) {
    cache!.set(ragDoc);
  }

  return { success: true };
}

async function handleDeleteDocuments(payload: DeleteDocumentsPayload): Promise<{ deleted: number }> {
  ensureInitialized();

  let deleted = 0;

  if (payload.saveId) {
    deleted = await database!.deleteDocumentsBySave(payload.saveId);

    // Clear cache if deleting current save
    if (payload.saveId === currentSaveId) {
      cache!.clear();
      currentSaveId = null;
    }
  } else if (payload.entityIds) {
    for (const entityId of payload.entityIds) {
      const docs = await database!.getDocumentsByEntity(entityId, currentSaveId || '');
      for (const doc of docs) {
        await database!.deleteDocument(doc.id);
        cache!.delete(doc.id);
        deleted++;
      }
    }
  }

  return { deleted };
}

async function handleSearch(payload: SearchPayload): Promise<SearchResult[]> {
  ensureInitialized();

  if (!currentSaveId) {
    throw new Error('No save context set. Call switchSave first.');
  }

  isSearching = true;

  try {
    // Get query embedding
    const queryEmbedding = payload.queryEmbedding
      ? payload.queryEmbedding
      : await generateEmbedding(payload.query);

    // Build ancestor fork IDs for filtering
    const allowedForkIds = payload.options.currentForkOnly && forkTree
      ? getAncestorForkIds(currentForkId, forkTree)
      : undefined;

    // Search database
    const results = await database!.searchSimilar(
      queryEmbedding,
      currentSaveId,
      {
        topK: payload.options.topK,
        threshold: payload.options.threshold,
        types: payload.options.types,
        forkIds: allowedForkIds,
        beforeTurn: payload.options.beforeTurn,
      }
    );

    // Apply priority adjustments
    const adjustedResults = results.map(result => {
      const doc = result.document;
      let adjustedScore = result.score;

      // Fork priority adjustment
      if (doc.forkId === currentForkId) {
        adjustedScore += config.currentForkBonus * 0.1;
      } else if (allowedForkIds?.includes(doc.forkId)) {
        adjustedScore += config.ancestorForkBonus * 0.1;
      } else {
        adjustedScore -= 0.02;
      }

      // Turn recency adjustment
      if (payload.options.beforeTurn !== undefined) {
        const turnDiff = payload.options.beforeTurn - doc.turnNumber;
        adjustedScore -= Math.max(0, turnDiff * config.turnDecayFactor * 0.1);
      }

      return {
        ...result,
        adjustedScore: Math.min(1.0, Math.max(0, adjustedScore)),
      };
    });

    // Sort by adjusted score
    adjustedResults.sort((a, b) => b.adjustedScore - a.adjustedScore);

    // Limit to topK
    const finalResults = adjustedResults.slice(0, payload.options.topK || 10);

    // Update cache with accessed documents
    for (const result of finalResults) {
      const fullDoc = await database!.getDocument(result.document.id);
      if (fullDoc) {
        cache!.set(fullDoc);
      }
    }

    return finalResults;
  } finally {
    isSearching = false;
  }
}

async function handleSwitchSave(payload: SwitchSavePayload): Promise<{ success: boolean }> {
  ensureInitialized();

  currentSaveId = payload.saveId;
  currentForkId = payload.forkId;
  forkTree = payload.forkTree;

  // Switch cache context
  cache!.switchSave(payload.saveId, payload.forkId, payload.forkTree);

  // Preload documents from this save into cache
  const docs = await database!.getDocumentsForSave(payload.saveId, config.maxMemoryDocuments);

  // Load full documents with embeddings
  const fullDocs: RAGDocument[] = [];
  for (const meta of docs) {
    const fullDoc = await database!.getDocument(meta.id);
    if (fullDoc) {
      fullDocs.push(fullDoc);
    }
  }

  cache!.setMany(fullDocs);

  console.log(`[RAGWorker] Switched to save ${payload.saveId}, fork ${payload.forkId}, loaded ${fullDocs.length} documents`);

  return { success: true };
}

async function handleGetSaveStats(saveId?: string): Promise<SaveStats | null> {
  ensureInitialized();

  const targetSaveId = saveId || currentSaveId;
  if (!targetSaveId) return null;

  const stats = await database!.getSaveStats(targetSaveId);
  if (!stats) return null;

  // Add memory usage from cache if current save
  if (targetSaveId === currentSaveId) {
    const cacheStats = cache!.getStats();
    stats.memoryUsage = cacheStats.estimatedMemoryBytes;
  }

  return stats;
}

async function handleCleanup(): Promise<{ deletedVersions: number; deletedStorage: number }> {
  ensureInitialized();

  broadcastEvent({
    type: 'progress',
    data: { phase: 'cleanup', current: 0, total: 2, message: 'Cleaning up old versions...' }
  });

  const deletedVersions = await database!.cleanupOldVersions();

  broadcastEvent({
    type: 'progress',
    data: { phase: 'cleanup', current: 1, total: 2, message: 'Enforcing storage limits...' }
  });

  const deletedStorage = await database!.enforceStorageLimits();

  broadcastEvent({ type: 'cleanupComplete', data: { deletedVersions, deletedStorage } });

  return { deletedVersions, deletedStorage };
}

async function handleUpdateConfig(newConfig: Partial<RAGConfig>): Promise<{ success: boolean }> {
  config = { ...config, ...newConfig };
  cache?.updateConfig(config);
  return { success: true };
}

async function handleGetStatus(): Promise<RAGStatus> {
  return {
    initialized: isInitialized,
    currentSaveId,
    currentModel: config.modelId,
    currentProvider: config.provider,
    memoryDocuments: cache?.getStats().totalDocuments || 0,
    storageDocuments: currentSaveId
      ? (await database?.getSaveStats(currentSaveId))?.totalDocuments || 0
      : 0,
    isSearching,
    lastError,
  };
}

async function handleClearSave(saveId?: string): Promise<{ deleted: number }> {
  ensureInitialized();

  const targetSaveId = saveId || currentSaveId;
  if (!targetSaveId) return { deleted: 0 };

  const deleted = await database!.deleteDocumentsBySave(targetSaveId);

  if (targetSaveId === currentSaveId) {
    cache!.clear();
    currentSaveId = null;
  }

  return { deleted };
}

async function handleCheckModelMismatch(saveId?: string): Promise<ModelMismatchInfo | null> {
  ensureInitialized();

  const targetSaveId = saveId || currentSaveId;
  if (!targetSaveId) return null;

  const mismatch = await database!.checkModelMismatch(
    targetSaveId,
    config.modelId,
    config.provider
  );

  if (mismatch) {
    broadcastEvent({
      type: 'modelMismatch',
      data: mismatch,
    });
  }

  return mismatch;
}

async function handleRebuildForModel(saveId?: string): Promise<{ deleted: number }> {
  ensureInitialized();

  const targetSaveId = saveId || currentSaveId;
  if (!targetSaveId) return { deleted: 0 };

  // Clear all documents for the save
  const deleted = await database!.clearSaveForRebuild(targetSaveId);

  // Also clear cache if it's the current save
  if (targetSaveId === currentSaveId) {
    cache!.clear();
  }

  broadcastEvent({
    type: 'progress',
    data: {
      phase: 'cleanup',
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
    broadcastEvent({
      type: 'storageOverflow',
      data: overflow,
    });
  }

  return overflow;
}

async function handleDeleteOldestSaves(saveIds?: string[]): Promise<{ deleted: number }> {
  ensureInitialized();

  if (!saveIds || saveIds.length === 0) return { deleted: 0 };

  const deleted = await database!.deleteOldestFromSaves(saveIds);

  // Clear cache if current save was deleted
  if (currentSaveId && saveIds.includes(currentSaveId)) {
    cache!.clear();
    currentSaveId = null;
  }

  return { deleted };
}

async function handleGetAllSaveStats(): Promise<GlobalStorageStats> {
  ensureInitialized();

  return database!.getGlobalStats();
}

// ============================================================================
// Embedding Generation
// ============================================================================

async function generateEmbedding(text: string): Promise<Float32Array> {
  if (!credentials) {
    throw new Error('No credentials configured for embedding generation');
  }

  // Use the appropriate provider based on config
  switch (config.provider) {
    case 'gemini':
      return generateGeminiEmbedding(text);
    case 'openai':
      return generateOpenAIEmbedding(text);
    case 'openrouter':
      return generateOpenRouterEmbedding(text);
    default:
      throw new Error(`Unknown embedding provider: ${config.provider}`);
  }
}

async function generateGeminiEmbedding(text: string): Promise<Float32Array> {
  const apiKey = credentials?.gemini?.apiKey;
  if (!apiKey) throw new Error('Gemini API key not configured');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.modelId}:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${config.modelId}`,
        content: { parts: [{ text }] },
        taskType: 'RETRIEVAL_DOCUMENT',
        ...(config.dimensions && { outputDimensionality: config.dimensions }),
      }),
    }
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
  if (!apiKey) throw new Error('OpenAI API key not configured');

  const baseUrl = credentials?.openai?.baseUrl || 'https://api.openai.com/v1';

  const response = await fetch(`${baseUrl}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
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

async function generateOpenRouterEmbedding(text: string): Promise<Float32Array> {
  const apiKey = credentials?.openrouter?.apiKey;
  if (!apiKey) throw new Error('OpenRouter API key not configured');

  const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://chronicles-of-infinity.app',
    },
    body: JSON.stringify({
      model: config.modelId,
      input: text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter embedding failed: ${error}`);
  }

  const data = await response.json();
  return new Float32Array(data.data[0].embedding);
}

// ============================================================================
// Helpers
// ============================================================================

function ensureInitialized(): void {
  if (!isInitialized || !database || !cache) {
    throw new Error('RAG Worker not initialized. Call init first.');
  }
}

function getAncestorForkIds(
  forkId: number,
  tree: { nodes: Record<number, { id: number; parentId: number | null }> }
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

// Export for testing
export { handleRequest, generateEmbedding };
