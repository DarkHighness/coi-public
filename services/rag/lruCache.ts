/**
 * LRU Cache Manager for RAG Documents
 *
 * Manages in-memory document cache with LRU eviction
 * Provides fast access to frequently used documents
 */

import type { RAGDocument, RAGDocumentMeta, RAGConfig, DocumentType } from './types';

// ============================================================================
// LRU Cache Entry
// ============================================================================

interface CacheEntry {
  document: RAGDocument;
  accessTime: number;
  accessCount: number;
}

// ============================================================================
// LRU Cache Manager
// ============================================================================

export class LRUCacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private config: RAGConfig;
  private currentSaveId: string | null = null;
  private currentForkId: number = 0;
  private ancestorForkIds: Set<number> = new Set();

  constructor(config: RAGConfig) {
    this.config = config;
  }

  // ==========================================================================
  // Configuration
  // ==========================================================================

  updateConfig(config: Partial<RAGConfig>): void {
    this.config = { ...this.config, ...config };
    // Enforce new limits
    this.enforceLimits();
  }

  // ==========================================================================
  // Save Context
  // ==========================================================================

  /**
   * Switch to a new save context, clearing cache for other saves
   */
  switchSave(
    saveId: string,
    forkId: number,
    forkTree: { nodes: Record<number, { id: number; parentId: number | null }> }
  ): void {
    // If switching to a different save, clear entire cache
    if (saveId !== this.currentSaveId) {
      this.cache.clear();
      this.currentSaveId = saveId;
    }

    this.currentForkId = forkId;

    // Build ancestor fork IDs set
    this.ancestorForkIds = new Set([forkId]);
    let currentId: number | null = forkId;
    while (currentId !== null) {
      const node = forkTree.nodes[currentId];
      if (!node) break;
      this.ancestorForkIds.add(node.id);
      currentId = node.parentId;
    }

    // Evict documents from unrelated forks (optional, for memory efficiency)
    this.evictUnrelatedForks();
  }

  /**
   * Get current save ID
   */
  getCurrentSaveId(): string | null {
    return this.currentSaveId;
  }

  // ==========================================================================
  // Cache Operations
  // ==========================================================================

  /**
   * Get a document from cache
   */
  get(docId: string): RAGDocument | null {
    const entry = this.cache.get(docId);
    if (!entry) return null;

    // Update access time and count
    entry.accessTime = Date.now();
    entry.accessCount++;

    return entry.document;
  }

  /**
   * Get multiple documents from cache
   */
  getMany(docIds: string[]): Map<string, RAGDocument> {
    const result = new Map<string, RAGDocument>();
    const now = Date.now();

    for (const docId of docIds) {
      const entry = this.cache.get(docId);
      if (entry) {
        entry.accessTime = now;
        entry.accessCount++;
        result.set(docId, entry.document);
      }
    }

    return result;
  }

  /**
   * Add or update a document in cache
   */
  set(document: RAGDocument): void {
    // Only cache documents from current save
    if (document.saveId !== this.currentSaveId) return;

    const existing = this.cache.get(document.id);
    const now = Date.now();

    if (existing) {
      // Update existing entry
      existing.document = document;
      existing.accessTime = now;
      existing.accessCount++;
    } else {
      // Add new entry
      this.cache.set(document.id, {
        document,
        accessTime: now,
        accessCount: 1,
      });

      // Enforce limits after adding
      this.enforceLimits();
    }
  }

  /**
   * Add multiple documents to cache
   */
  setMany(documents: RAGDocument[]): void {
    const now = Date.now();

    for (const document of documents) {
      // Only cache documents from current save
      if (document.saveId !== this.currentSaveId) continue;

      this.cache.set(document.id, {
        document,
        accessTime: now,
        accessCount: 1,
      });
    }

    // Enforce limits after batch add
    this.enforceLimits();
  }

  /**
   * Remove a document from cache
   */
  delete(docId: string): boolean {
    return this.cache.delete(docId);
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.currentSaveId = null;
    this.currentForkId = 0;
    this.ancestorForkIds.clear();
  }

  /**
   * Check if document is in cache
   */
  has(docId: string): boolean {
    return this.cache.has(docId);
  }

  /**
   * Get all cached documents for current save
   */
  getAllForCurrentSave(): RAGDocument[] {
    const result: RAGDocument[] = [];
    for (const entry of this.cache.values()) {
      if (entry.document.saveId === this.currentSaveId) {
        result.push(entry.document);
      }
    }
    return result;
  }

  /**
   * Get documents by type
   */
  getByType(type: DocumentType): RAGDocument[] {
    const result: RAGDocument[] = [];
    for (const entry of this.cache.values()) {
      if (entry.document.type === type && entry.document.saveId === this.currentSaveId) {
        result.push(entry.document);
      }
    }
    return result;
  }

  /**
   * Get documents by entity ID
   */
  getByEntityId(entityId: string): RAGDocument[] {
    const result: RAGDocument[] = [];
    for (const entry of this.cache.values()) {
      if (entry.document.entityId === entityId && entry.document.saveId === this.currentSaveId) {
        result.push(entry.document);
      }
    }
    // Sort by version descending (newest first)
    return result.sort((a, b) => b.version - a.version);
  }

  // ==========================================================================
  // Priority Calculation
  // ==========================================================================

  /**
   * Calculate priority score for a cached document
   * Higher score = keep longer in cache
   */
  calculatePriority(entry: CacheEntry): number {
    const doc = entry.document;

    // Base priority from importance
    let priority = doc.importance || 0.5;

    // Type priority (outline is most important)
    const typePriority: Record<DocumentType, number> = {
      outline: 10.0,
      story: 1.0,
      npc: 0.9,
      quest: 0.9,
      knowledge: 0.85,
      location: 0.8,
      item: 0.8,
      event: 0.7,
    };
    priority *= typePriority[doc.type] || 1.0;

    // Fork priority
    if (doc.forkId === this.currentForkId) {
      priority += this.config.currentForkBonus;
    } else if (this.ancestorForkIds.has(doc.forkId)) {
      priority += this.config.ancestorForkBonus;
    } else {
      priority -= 0.1; // Penalty for unrelated forks
    }

    // Recency boost (recent access is better)
    const ageMs = Date.now() - entry.accessTime;
    const ageHours = ageMs / (1000 * 60 * 60);
    priority -= Math.min(0.3, ageHours * 0.01);

    // Access count boost
    priority += Math.min(0.2, entry.accessCount * 0.02);

    return priority;
  }

  // ==========================================================================
  // LRU Eviction
  // ==========================================================================

  /**
   * Enforce cache size limits
   */
  private enforceLimits(): void {
    if (this.cache.size <= this.config.maxMemoryDocuments) return;

    // Calculate priorities for all entries
    const entries: Array<{ id: string; entry: CacheEntry; priority: number }> = [];
    for (const [id, entry] of this.cache) {
      entries.push({
        id,
        entry,
        priority: this.calculatePriority(entry),
      });
    }

    // Sort by priority (lowest first = evict first)
    entries.sort((a, b) => a.priority - b.priority);

    // Evict until under limit
    const toEvict = this.cache.size - this.config.maxMemoryDocuments;
    for (let i = 0; i < toEvict; i++) {
      const entry = entries[i];
      // Never evict outline documents
      if (entry.entry.document.type !== 'outline') {
        this.cache.delete(entry.id);
      }
    }

    console.log(`[LRUCache] Evicted ${toEvict} documents, cache size: ${this.cache.size}`);
  }

  /**
   * Evict documents from unrelated forks (not in ancestor chain)
   */
  private evictUnrelatedForks(): void {
    const toDelete: string[] = [];

    for (const [id, entry] of this.cache) {
      const forkId = entry.document.forkId;
      // Keep if in current fork lineage or if it's an outline
      if (!this.ancestorForkIds.has(forkId) && entry.document.type !== 'outline') {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      this.cache.delete(id);
    }

    if (toDelete.length > 0) {
      console.log(`[LRUCache] Evicted ${toDelete.length} documents from unrelated forks`);
    }
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  /**
   * Get cache statistics
   */
  getStats(): {
    totalDocuments: number;
    byType: Record<DocumentType, number>;
    estimatedMemoryBytes: number;
    hitRate: number;
  } {
    const byType: Record<DocumentType, number> = {
      story: 0, npc: 0, location: 0, item: 0, knowledge: 0, quest: 0, event: 0, outline: 0
    };

    let totalMemory = 0;
    let totalAccessCount = 0;

    for (const entry of this.cache.values()) {
      byType[entry.document.type]++;
      totalAccessCount += entry.accessCount;

      // Estimate memory: content + embedding + overhead
      const contentBytes = entry.document.content.length * 2; // UTF-16
      const embeddingBytes = entry.document.embedding
        ? entry.document.embedding.length * 4
        : 0;
      totalMemory += contentBytes + embeddingBytes + 200; // 200 bytes overhead
    }

    return {
      totalDocuments: this.cache.size,
      byType,
      estimatedMemoryBytes: totalMemory,
      hitRate: totalAccessCount / Math.max(1, this.cache.size),
    };
  }
}
