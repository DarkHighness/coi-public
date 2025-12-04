/**
 * PGlite Database Layer
 *
 * Manages PGlite database with pgvector extension for vector similarity search
 * Stores data in IndexedDB for persistence
 */

import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite/vector";
import type {
  RAGDocument,
  RAGDocumentMeta,
  DocumentType,
  RAGConfig,
  SearchResult,
  SaveStats,
  GlobalStorageStats,
  ModelMismatchInfo,
  StorageOverflowInfo,
} from "./types";

// ============================================================================
// Database Schema
// ============================================================================

const SCHEMA = `
-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Main documents table
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  save_id TEXT NOT NULL,
  fork_id INTEGER NOT NULL,
  turn_number INTEGER NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  embedding_model TEXT NOT NULL DEFAULT 'text-embedding-004',
  embedding_provider TEXT NOT NULL DEFAULT 'gemini',
  importance REAL DEFAULT 0.5,
  unlocked BOOLEAN DEFAULT FALSE,
  created_at BIGINT NOT NULL,
  last_access BIGINT NOT NULL
);

-- Embeddings table (separate for efficiency)
CREATE TABLE IF NOT EXISTS embeddings (
  doc_id TEXT PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
  embedding vector
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_documents_save_id ON documents(save_id);
CREATE INDEX IF NOT EXISTS idx_documents_entity_id ON documents(entity_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_fork_id ON documents(fork_id);
CREATE INDEX IF NOT EXISTS idx_documents_turn ON documents(turn_number);
CREATE INDEX IF NOT EXISTS idx_documents_save_fork ON documents(save_id, fork_id);
CREATE INDEX IF NOT EXISTS idx_documents_entity_version ON documents(entity_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_documents_model ON documents(embedding_model, embedding_provider);

-- Save metadata table
CREATE TABLE IF NOT EXISTS save_metadata (
  save_id TEXT PRIMARY KEY,
  current_fork_id INTEGER NOT NULL DEFAULT 0,
  last_updated BIGINT NOT NULL,
  document_count INTEGER NOT NULL DEFAULT 0,
  embedding_model TEXT,
  embedding_provider TEXT
);

-- Version tracking for entity history
CREATE TABLE IF NOT EXISTS entity_versions (
  entity_id TEXT NOT NULL,
  save_id TEXT NOT NULL,
  fork_id INTEGER NOT NULL,
  version INTEGER NOT NULL,
  doc_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  PRIMARY KEY (entity_id, save_id, fork_id, version)
);
`;

// Migration for existing databases
const MIGRATIONS = [
  // Add model tracking columns if not exist
  `ALTER TABLE documents ADD COLUMN IF NOT EXISTS embedding_model TEXT DEFAULT 'text-embedding-004'`,
  `ALTER TABLE documents ADD COLUMN IF NOT EXISTS embedding_provider TEXT DEFAULT 'gemini'`,
  `ALTER TABLE save_metadata ADD COLUMN IF NOT EXISTS embedding_model TEXT`,
  `ALTER TABLE save_metadata ADD COLUMN IF NOT EXISTS embedding_provider TEXT`,
];

// ============================================================================
// PGlite Database Class
// ============================================================================

export class RAGDatabase {
  private db: PGlite | null = null;
  private config: RAGConfig;
  private initialized: boolean = false;

  constructor(config: RAGConfig) {
    this.config = config;
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize PGlite with IndexedDB persistence and vector extension
      this.db = new PGlite(`idb://${this.config.dbName}`, {
        extensions: { vector },
      });

      // Wait for database to be ready
      await this.db.waitReady;

      // Create schema
      await this.db.exec(SCHEMA);

      // Run migrations
      for (const migration of MIGRATIONS) {
        try {
          await this.db.exec(migration);
        } catch (e) {
          // Ignore errors (column might already exist)
        }
      }

      // Set vector dimensions dynamically if needed
      await this.ensureVectorDimensions();

      this.initialized = true;
      console.log("[RAGDatabase] Initialized successfully");
    } catch (error) {
      console.error("[RAGDatabase] Initialization failed:", error);
      throw error;
    }
  }

  private async ensureVectorDimensions(): Promise<void> {
    // Check if embeddings table has correct dimensions
    // PGlite vector doesn't require dimension specification upfront
    // The dimension is determined by the first inserted vector
  }

  // ==========================================================================
  // Document Operations
  // ==========================================================================

  async addDocument(doc: RAGDocument): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const now = Date.now();

    // Get next version for this entity
    const version = await this.getNextVersion(
      doc.entityId,
      doc.saveId,
      doc.forkId,
    );

    console.log(
      `[RAGDatabase] addDocument: entityId=${doc.entityId}, type=${doc.type}, saveId=${doc.saveId}, version=${version}`,
    );

    // Insert document with model info
    await this.db.query(
      `INSERT INTO documents (id, entity_id, type, content, save_id, fork_id, turn_number, version,
         embedding_model, embedding_provider, importance, unlocked, created_at, last_access)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (id) DO UPDATE SET
         content = EXCLUDED.content,
         importance = EXCLUDED.importance,
         unlocked = EXCLUDED.unlocked,
         last_access = EXCLUDED.last_access`,
      [
        doc.id,
        doc.entityId,
        doc.type,
        doc.content,
        doc.saveId,
        doc.forkId,
        doc.turnNumber,
        version,
        doc.embeddingModel,
        doc.embeddingProvider,
        doc.importance,
        doc.unlocked,
        now,
        now,
      ],
    );

    // Insert embedding if provided
    if (doc.embedding) {
      await this.setEmbedding(doc.id, doc.embedding);
    }

    // Track version
    await this.db.query(
      `INSERT INTO entity_versions (entity_id, save_id, fork_id, version, doc_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (entity_id, save_id, fork_id, version) DO UPDATE SET doc_id = EXCLUDED.doc_id`,
      [doc.entityId, doc.saveId, doc.forkId, version, doc.id],
    );

    // Update save metadata with model info
    await this.updateSaveMetadata(
      doc.saveId,
      doc.forkId,
      doc.embeddingModel,
      doc.embeddingProvider,
    );

    // Enforce version limits
    await this.enforceVersionLimits(doc.entityId, doc.saveId, doc.forkId);
  }

  async addDocuments(docs: RAGDocument[]): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    console.log(
      `[RAGDatabase] addDocuments: count=${docs.length}, saveId=${docs[0]?.saveId || "N/A"}`,
    );

    // Use transaction for batch insert
    await this.db.transaction(async (tx) => {
      for (const doc of docs) {
        const now = Date.now();
        const version = await this.getNextVersionTx(
          tx,
          doc.entityId,
          doc.saveId,
          doc.forkId,
        );

        await tx.query(
          `INSERT INTO documents (id, entity_id, type, content, save_id, fork_id, turn_number, version,
             embedding_model, embedding_provider, importance, unlocked, created_at, last_access)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           ON CONFLICT (id) DO UPDATE SET
             content = EXCLUDED.content,
             importance = EXCLUDED.importance,
             unlocked = EXCLUDED.unlocked,
             last_access = EXCLUDED.last_access`,
          [
            doc.id,
            doc.entityId,
            doc.type,
            doc.content,
            doc.saveId,
            doc.forkId,
            doc.turnNumber,
            version,
            doc.embeddingModel,
            doc.embeddingProvider,
            doc.importance,
            doc.unlocked,
            now,
            now,
          ],
        );

        if (doc.embedding) {
          const vectorStr = `[${Array.from(doc.embedding).join(",")}]`;
          await tx.query(
            `INSERT INTO embeddings (doc_id, embedding) VALUES ($1, $2::vector)
             ON CONFLICT (doc_id) DO UPDATE SET embedding = EXCLUDED.embedding`,
            [doc.id, vectorStr],
          );
        }

        await tx.query(
          `INSERT INTO entity_versions (entity_id, save_id, fork_id, version, doc_id)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (entity_id, save_id, fork_id, version) DO UPDATE SET doc_id = EXCLUDED.doc_id`,
          [doc.entityId, doc.saveId, doc.forkId, version, doc.id],
        );
      }
    });

    // Update save metadata for unique saves
    const saveIds = [...new Set(docs.map((d) => d.saveId))];
    for (const saveId of saveIds) {
      const saveDocs = docs.filter((d) => d.saveId === saveId);
      const firstDoc = saveDocs[0];
      const forkIds = [...new Set(saveDocs.map((d) => d.forkId))];
      for (const forkId of forkIds) {
        await this.updateSaveMetadata(
          saveId,
          forkId,
          firstDoc.embeddingModel,
          firstDoc.embeddingProvider,
        );
        // Enforce version limits for each entity
        const entityIds = [
          ...new Set(
            saveDocs.filter((d) => d.forkId === forkId).map((d) => d.entityId),
          ),
        ];
        for (const entityId of entityIds) {
          await this.enforceVersionLimits(entityId, saveId, forkId);
        }
      }
    }
  }

  async setEmbedding(docId: string, embedding: Float32Array): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const vectorStr = `[${Array.from(embedding).join(",")}]`;
    await this.db.query(
      `INSERT INTO embeddings (doc_id, embedding) VALUES ($1, $2::vector)
       ON CONFLICT (doc_id) DO UPDATE SET embedding = EXCLUDED.embedding`,
      [docId, vectorStr],
    );
  }

  async getDocument(docId: string): Promise<RAGDocument | null> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.query<any>(
      `SELECT d.*, e.embedding
       FROM documents d
       LEFT JOIN embeddings e ON d.id = e.doc_id
       WHERE d.id = $1`,
      [docId],
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return this.rowToDocument(row);
  }

  async getDocumentsByEntity(
    entityId: string,
    saveId: string,
  ): Promise<RAGDocumentMeta[]> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.query<any>(
      `SELECT * FROM documents WHERE entity_id = $1 AND save_id = $2 ORDER BY version DESC`,
      [entityId, saveId],
    );

    return result.rows.map((row) => this.rowToDocumentMeta(row));
  }

  async deleteDocument(docId: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.query(`DELETE FROM documents WHERE id = $1`, [docId]);
  }

  async deleteDocumentsBySave(saveId: string): Promise<number> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.query(
      `DELETE FROM documents WHERE save_id = $1`,
      [saveId],
    );

    await this.db.query(`DELETE FROM save_metadata WHERE save_id = $1`, [
      saveId,
    ]);

    return result.affectedRows || 0;
  }

  // ==========================================================================
  // Vector Search
  // ==========================================================================

  async searchSimilar(
    queryEmbedding: Float32Array,
    saveId: string,
    options: {
      topK?: number;
      threshold?: number;
      types?: DocumentType[];
      forkIds?: number[];
      beforeTurn?: number;
    } = {},
  ): Promise<SearchResult[]> {
    if (!this.db) throw new Error("Database not initialized");

    const { topK = 10, threshold = 0.5, types, forkIds, beforeTurn } = options;

    console.log(
      `[RAGDatabase] searchSimilar: saveId=${saveId}, topK=${topK}, threshold=${threshold}, types=${types?.join(",") || "all"}`,
    );

    // Build query with filters
    let whereConditions = ["d.save_id = $2"];
    const params: any[] = [`[${Array.from(queryEmbedding).join(",")}]`, saveId];
    let paramIndex = 3;

    if (types && types.length > 0) {
      whereConditions.push(`d.type = ANY($${paramIndex})`);
      params.push(types);
      paramIndex++;
    }

    if (forkIds && forkIds.length > 0) {
      whereConditions.push(`d.fork_id = ANY($${paramIndex})`);
      params.push(forkIds);
      paramIndex++;
    }

    if (beforeTurn !== undefined) {
      whereConditions.push(`d.turn_number < $${paramIndex}`);
      params.push(beforeTurn);
      paramIndex++;
    }

    const whereClause = whereConditions.join(" AND ");

    // Vector similarity search using cosine distance
    // PGlite vector uses <=> for cosine distance (1 - similarity)
    const result = await this.db.query<any>(
      `SELECT d.*,
              1 - (e.embedding <=> $1::vector) as similarity
       FROM documents d
       JOIN embeddings e ON d.id = e.doc_id
       WHERE ${whereClause}
         AND 1 - (e.embedding <=> $1::vector) >= $${paramIndex}
       ORDER BY e.embedding <=> $1::vector
       LIMIT $${paramIndex + 1}`,
      [...params, threshold, topK * 2], // Get more than needed for re-ranking
    );

    // Update last access time
    const docIds = result.rows.map((r: any) => r.id);
    if (docIds.length > 0) {
      await this.db.query(
        `UPDATE documents SET last_access = $1 WHERE id = ANY($2)`,
        [Date.now(), docIds],
      );
    }

    return result.rows.map((row: any) => ({
      document: this.rowToDocumentMeta(row),
      score: row.similarity,
      adjustedScore: row.similarity, // Will be adjusted by caller
    }));
  }

  // ==========================================================================
  // Save Management
  // ==========================================================================

  async getSaveStats(saveId: string): Promise<SaveStats | null> {
    if (!this.db) throw new Error("Database not initialized");

    const metaResult = await this.db.query<any>(
      `SELECT * FROM save_metadata WHERE save_id = $1`,
      [saveId],
    );

    if (metaResult.rows.length === 0) return null;

    const typeResult = await this.db.query<any>(
      `SELECT type, COUNT(*) as count FROM documents WHERE save_id = $1 GROUP BY type`,
      [saveId],
    );

    const documentsByType: Record<DocumentType, number> = {
      story: 0,
      npc: 0,
      location: 0,
      item: 0,
      knowledge: 0,
      quest: 0,
      event: 0,
      outline: 0,
    };

    for (const row of typeResult.rows) {
      documentsByType[row.type as DocumentType] = parseInt(row.count);
    }

    const meta = metaResult.rows[0];
    return {
      saveId,
      totalDocuments: meta.document_count,
      documentsByType,
      memoryUsage: 0, // Estimated later
      lastUpdated: meta.last_updated,
    };
  }

  async getAllSaveIds(): Promise<string[]> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.query<any>(
      `SELECT DISTINCT save_id FROM save_metadata ORDER BY last_updated DESC`,
    );

    return result.rows.map((r: any) => r.save_id);
  }

  async getDocumentsForSave(
    saveId: string,
    limit?: number,
  ): Promise<RAGDocumentMeta[]> {
    if (!this.db) throw new Error("Database not initialized");

    const query = limit
      ? `SELECT * FROM documents WHERE save_id = $1 ORDER BY last_access DESC LIMIT $2`
      : `SELECT * FROM documents WHERE save_id = $1 ORDER BY last_access DESC`;

    const params = limit ? [saveId, limit] : [saveId];
    const result = await this.db.query<any>(query, params);

    return result.rows.map((row) => this.rowToDocumentMeta(row));
  }

  /**
   * Get all documents with embeddings for export
   */
  async getDocumentsWithEmbeddingsForSave(
    saveId: string,
  ): Promise<RAGDocument[]> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.query<any>(
      `SELECT d.*, e.embedding
       FROM documents d
       LEFT JOIN embeddings e ON d.id = e.doc_id
       WHERE d.save_id = $1
       ORDER BY d.created_at ASC`,
      [saveId],
    );

    return result.rows.map((row) => this.rowToDocument(row));
  }

  /**
   * Import documents with embeddings for a new save
   */
  async importDocuments(
    documents: Array<{
      id: string;
      entityId: string;
      type: DocumentType;
      content: string;
      embedding: Float32Array;
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
    }>,
  ): Promise<number> {
    if (!this.db) throw new Error("Database not initialized");
    if (documents.length === 0) return 0;

    let imported = 0;

    for (const doc of documents) {
      try {
        // Insert document
        await this.db.query(
          `INSERT INTO documents (id, entity_id, type, content, save_id, fork_id, turn_number, version, embedding_model, embedding_provider, importance, unlocked, created_at, last_access)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           ON CONFLICT (id) DO NOTHING`,
          [
            doc.id,
            doc.entityId,
            doc.type,
            doc.content,
            doc.saveId,
            doc.forkId,
            doc.turnNumber,
            doc.version,
            doc.embeddingModel,
            doc.embeddingProvider,
            doc.importance,
            doc.unlocked,
            doc.createdAt,
            doc.lastAccess,
          ],
        );

        // Insert embedding if present
        if (doc.embedding && doc.embedding.length > 0) {
          const vectorStr = `[${Array.from(doc.embedding).join(",")}]`;
          await this.db.query(
            `INSERT INTO embeddings (doc_id, embedding) VALUES ($1, $2::vector)
             ON CONFLICT (doc_id) DO NOTHING`,
            [doc.id, vectorStr],
          );
        }

        imported++;
      } catch (error) {
        console.warn(`[RAGDatabase] Failed to import document ${doc.id}:`, error);
      }
    }

    // Update save metadata
    if (documents.length > 0) {
      const saveId = documents[0].saveId;
      const model = documents[0].embeddingModel;
      const provider = documents[0].embeddingProvider;

      await this.db.query(
        `INSERT INTO save_metadata (save_id, current_fork_id, last_updated, document_count, embedding_model, embedding_provider)
         VALUES ($1, 0, $2, $3, $4, $5)
         ON CONFLICT (save_id) DO UPDATE SET
           document_count = save_metadata.document_count + $3,
           last_updated = $2`,
        [saveId, Date.now(), imported, model, provider],
      );
    }

    console.log(`[RAGDatabase] Imported ${imported}/${documents.length} documents`);
    return imported;
  }

  /**
   * Get recently added documents for the current save
   */
  async getRecentDocuments(
    saveId: string,
    limit: number = 20,
    types?: DocumentType[],
  ): Promise<RAGDocumentMeta[]> {
    if (!this.db) throw new Error("Database not initialized");

    let query: string;
    let params: any[];

    if (types && types.length > 0) {
      query = `SELECT * FROM documents
               WHERE save_id = $1 AND type = ANY($2)
               ORDER BY created_at DESC
               LIMIT $3`;
      params = [saveId, types, limit];
    } else {
      query = `SELECT * FROM documents
               WHERE save_id = $1
               ORDER BY created_at DESC
               LIMIT $2`;
      params = [saveId, limit];
    }

    const result = await this.db.query<any>(query, params);

    console.log(
      `[RAGDatabase] getRecentDocuments: saveId=${saveId}, limit=${limit}, types=${types?.join(",") || "all"}, found=${result.rows.length}`,
    );

    return result.rows.map((row) => this.rowToDocumentMeta(row));
  }

  /**
   * Get paginated documents with total count for efficient pagination
   */
  async getDocumentsPaginated(
    saveId: string,
    offset: number,
    limit: number,
    types?: DocumentType[],
  ): Promise<{ documents: RAGDocumentMeta[]; total: number }> {
    if (!this.db) throw new Error("Database not initialized");

    let countQuery: string;
    let dataQuery: string;
    let countParams: any[];
    let dataParams: any[];

    if (types && types.length > 0) {
      countQuery = `SELECT COUNT(*) as count FROM documents
                    WHERE save_id = $1 AND type = ANY($2)`;
      dataQuery = `SELECT * FROM documents
                   WHERE save_id = $1 AND type = ANY($2)
                   ORDER BY created_at DESC
                   LIMIT $3 OFFSET $4`;
      countParams = [saveId, types];
      dataParams = [saveId, types, limit, offset];
    } else {
      countQuery = `SELECT COUNT(*) as count FROM documents
                    WHERE save_id = $1`;
      dataQuery = `SELECT * FROM documents
                   WHERE save_id = $1
                   ORDER BY created_at DESC
                   LIMIT $2 OFFSET $3`;
      countParams = [saveId];
      dataParams = [saveId, limit, offset];
    }

    // Get total count
    const countResult = await this.db.query<any>(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated data
    const dataResult = await this.db.query<any>(dataQuery, dataParams);
    const documents = dataResult.rows.map((row) => this.rowToDocumentMeta(row));

    console.log(
      `[RAGDatabase] getDocumentsPaginated: saveId=${saveId}, offset=${offset}, limit=${limit}, types=${types?.join(",") || "all"}, total=${total}, returned=${documents.length}`,
    );

    return { documents, total };
  }

  // ==========================================================================
  // LRU and Cleanup
  // ==========================================================================

  async enforceStorageLimits(): Promise<number> {
    if (!this.db) throw new Error("Database not initialized");

    let totalDeleted = 0;

    // 1. Enforce per-type limits
    const types: DocumentType[] = [
      "story",
      "npc",
      "location",
      "item",
      "knowledge",
      "quest",
      "event",
      "outline",
    ];
    for (const type of types) {
      if (type === "outline") continue; // Never delete outlines

      // Use specific limit for story, generic limit for others
      const limit =
        type === "story"
          ? this.config.storyMaxEntries
          : this.config.maxDocumentsPerType;

      const result = await this.db.query<any>(
        `SELECT COUNT(*) as count FROM documents WHERE type = $1`,
        [type],
      );

      const count = parseInt(result.rows[0].count);
      if (count > limit) {
        const toDelete = count - limit;
        await this.db.query(
          `DELETE FROM documents WHERE id IN (
            SELECT id FROM documents WHERE type = $1 ORDER BY last_access ASC LIMIT $2
          )`,
          [type, toDelete],
        );
        totalDeleted += toDelete;
      }
    }

    // 2. Enforce global limit
    const totalResult = await this.db.query<any>(
      `SELECT COUNT(*) as count FROM documents`,
    );
    const totalCount = parseInt(totalResult.rows[0].count);

    if (totalCount > this.config.maxTotalStorageDocuments) {
      const toDelete = totalCount - this.config.maxTotalStorageDocuments;
      // Protect outlines from deletion
      await this.db.query(
        `DELETE FROM documents WHERE id IN (
          SELECT id FROM documents WHERE type != 'outline' ORDER BY last_access ASC LIMIT $1
        )`,
        [toDelete],
      );
      totalDeleted += toDelete;
    }

    return totalDeleted;
  }

  async cleanupOldVersions(): Promise<number> {
    if (!this.db) throw new Error("Database not initialized");

    // Get entities with too many versions
    const result = await this.db.query<any>(
      `SELECT entity_id, save_id, fork_id, COUNT(*) as version_count
       FROM entity_versions
       GROUP BY entity_id, save_id, fork_id
       HAVING COUNT(*) > $1`,
      [this.config.maxVersionsPerEntity],
    );

    let totalDeleted = 0;

    for (const row of result.rows) {
      const deleted = await this.deleteOldVersions(
        row.entity_id,
        row.save_id,
        row.fork_id,
        this.config.maxVersionsPerEntity,
      );
      totalDeleted += deleted;
    }

    return totalDeleted;
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private async getNextVersion(
    entityId: string,
    saveId: string,
    forkId: number,
  ): Promise<number> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.query<any>(
      `SELECT MAX(version) as max_version FROM entity_versions
       WHERE entity_id = $1 AND save_id = $2 AND fork_id = $3`,
      [entityId, saveId, forkId],
    );

    return (result.rows[0]?.max_version || 0) + 1;
  }

  private async getNextVersionTx(
    tx: any,
    entityId: string,
    saveId: string,
    forkId: number,
  ): Promise<number> {
    const result = (await tx.query(
      `SELECT MAX(version) as max_version FROM entity_versions
       WHERE entity_id = $1 AND save_id = $2 AND fork_id = $3`,
      [entityId, saveId, forkId],
    )) as { rows: any[] };

    return (result.rows[0]?.max_version || 0) + 1;
  }

  private async updateSaveMetadata(
    saveId: string,
    forkId: number,
    embeddingModel?: string,
    embeddingProvider?: string,
  ): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const countResult = await this.db.query<any>(
      `SELECT COUNT(*) as count FROM documents WHERE save_id = $1`,
      [saveId],
    );

    if (embeddingModel && embeddingProvider) {
      await this.db.query(
        `INSERT INTO save_metadata (save_id, current_fork_id, last_updated, document_count, embedding_model, embedding_provider)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (save_id) DO UPDATE SET
           current_fork_id = EXCLUDED.current_fork_id,
           last_updated = EXCLUDED.last_updated,
           document_count = EXCLUDED.document_count,
           embedding_model = EXCLUDED.embedding_model,
           embedding_provider = EXCLUDED.embedding_provider`,
        [
          saveId,
          forkId,
          Date.now(),
          parseInt(countResult.rows[0].count),
          embeddingModel,
          embeddingProvider,
        ],
      );
    } else {
      await this.db.query(
        `INSERT INTO save_metadata (save_id, current_fork_id, last_updated, document_count)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (save_id) DO UPDATE SET
           current_fork_id = EXCLUDED.current_fork_id,
           last_updated = EXCLUDED.last_updated,
           document_count = EXCLUDED.document_count`,
        [saveId, forkId, Date.now(), parseInt(countResult.rows[0].count)],
      );
    }
  }

  private async enforceVersionLimits(
    entityId: string,
    saveId: string,
    forkId: number,
  ): Promise<void> {
    // Delete old versions beyond limit within same fork
    await this.deleteOldVersions(
      entityId,
      saveId,
      forkId,
      this.config.maxVersionsPerEntity,
    );

    // Also enforce cross-fork version limits
    await this.enforceCrossForkVersionLimits(entityId, saveId);
  }

  private async deleteOldVersions(
    entityId: string,
    saveId: string,
    forkId: number,
    keepCount: number,
  ): Promise<number> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.query(
      `DELETE FROM documents WHERE id IN (
        SELECT doc_id FROM entity_versions
        WHERE entity_id = $1 AND save_id = $2 AND fork_id = $3
        ORDER BY version DESC
        OFFSET $4
      )`,
      [entityId, saveId, forkId, keepCount],
    );

    return result.affectedRows || 0;
  }

  private async enforceCrossForkVersionLimits(
    entityId: string,
    saveId: string,
  ): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    // Get total versions across all forks
    const result = await this.db.query<any>(
      `SELECT COUNT(*) as count FROM entity_versions
       WHERE entity_id = $1 AND save_id = $2`,
      [entityId, saveId],
    );

    const totalVersions = parseInt(result.rows[0].count);
    if (totalVersions <= this.config.maxVersionsAcrossForks) return;

    // Delete oldest versions across forks
    const toDelete = totalVersions - this.config.maxVersionsAcrossForks;
    await this.db.query(
      `DELETE FROM documents WHERE id IN (
        SELECT d.id FROM documents d
        JOIN entity_versions ev ON d.id = ev.doc_id
        WHERE ev.entity_id = $1 AND ev.save_id = $2
        ORDER BY d.created_at ASC
        LIMIT $3
      )`,
      [entityId, saveId, toDelete],
    );
  }

  private rowToDocument(row: any): RAGDocument {
    return {
      id: row.id,
      entityId: row.entity_id,
      type: row.type as DocumentType,
      content: row.content,
      embedding: row.embedding ? this.parseVector(row.embedding) : undefined,
      saveId: row.save_id,
      forkId: row.fork_id,
      turnNumber: row.turn_number,
      version: row.version,
      embeddingModel: row.embedding_model || "text-embedding-004",
      embeddingProvider: row.embedding_provider || "gemini",
      importance: row.importance,
      unlocked: row.unlocked,
      createdAt: row.created_at,
      lastAccess: row.last_access,
    };
  }

  private rowToDocumentMeta(row: any): RAGDocumentMeta {
    return {
      id: row.id,
      entityId: row.entity_id,
      type: row.type as DocumentType,
      content: row.content,
      saveId: row.save_id,
      forkId: row.fork_id,
      turnNumber: row.turn_number,
      version: row.version,
      embeddingModel: row.embedding_model || "text-embedding-004",
      embeddingProvider: row.embedding_provider || "gemini",
      importance: row.importance,
      unlocked: row.unlocked,
      createdAt: row.created_at,
      lastAccess: row.last_access,
    };
  }

  private parseVector(vectorStr: string): Float32Array {
    // PGlite returns vector as string like "[0.1, 0.2, ...]"
    const nums = vectorStr
      .replace(/[\[\]]/g, "")
      .split(",")
      .map((s) => parseFloat(s.trim()));
    return new Float32Array(nums);
  }

  // ==========================================================================
  // Model Mismatch Detection
  // ==========================================================================

  /**
   * Check if the save has documents with a different model than the current config
   */
  async checkModelMismatch(
    saveId: string,
    expectedModel: string,
    expectedProvider: string,
  ): Promise<ModelMismatchInfo | null> {
    if (!this.db) throw new Error("Database not initialized");

    // Get documents with different model/provider
    const result = await this.db.query<any>(
      `SELECT embedding_model, embedding_provider, COUNT(*) as count
       FROM documents
       WHERE save_id = $1
         AND (embedding_model != $2 OR embedding_provider != $3)
       GROUP BY embedding_model, embedding_provider
       LIMIT 1`,
      [saveId, expectedModel, expectedProvider],
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      currentModel: expectedModel,
      currentProvider: expectedProvider,
      storedModel: row.embedding_model,
      storedProvider: row.embedding_provider,
      documentCount: parseInt(row.count),
    };
  }

  /**
   * Get the model info for a save from its metadata
   */
  async getSaveModelInfo(
    saveId: string,
  ): Promise<{ model: string; provider: string } | null> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.query<any>(
      `SELECT embedding_model, embedding_provider FROM save_metadata WHERE save_id = $1`,
      [saveId],
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      model: row.embedding_model || "text-embedding-004",
      provider: row.embedding_provider || "gemini",
    };
  }

  /**
   * Delete all documents for a save (for rebuild)
   */
  async clearSaveForRebuild(saveId: string): Promise<number> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.query(
      `DELETE FROM documents WHERE save_id = $1`,
      [saveId],
    );

    // Reset save metadata
    await this.db.query(
      `UPDATE save_metadata SET document_count = 0 WHERE save_id = $1`,
      [saveId],
    );

    return result.affectedRows || 0;
  }

  // ==========================================================================
  // Storage Overflow Handling
  // ==========================================================================

  /**
   * Check if global storage limit is exceeded
   */
  async checkStorageOverflow(): Promise<StorageOverflowInfo | null> {
    if (!this.db) throw new Error("Database not initialized");

    const totalResult = await this.db.query<any>(
      `SELECT COUNT(*) as count FROM documents`,
    );
    const totalCount = parseInt(totalResult.rows[0].count);

    if (totalCount <= this.config.maxTotalStorageDocuments) {
      return null;
    }

    // Get stats for each save, ordered by last access
    const saveStatsResult = await this.db.query<any>(
      `SELECT save_id, COUNT(*) as count, MAX(last_access) as last_accessed
       FROM documents
       GROUP BY save_id
       ORDER BY last_accessed ASC`,
    );

    const saveStats = saveStatsResult.rows.map((row: any) => ({
      saveId: row.save_id,
      documentCount: parseInt(row.count),
      lastAccessed: parseInt(row.last_accessed),
    }));

    // Calculate how many documents need to be deleted
    const overflow = totalCount - this.config.maxTotalStorageDocuments;

    // Suggest oldest saves to delete first
    let accumulatedCount = 0;
    const suggestedDeletions: string[] = [];

    for (const stat of saveStats) {
      if (accumulatedCount >= overflow) break;
      suggestedDeletions.push(stat.saveId);
      accumulatedCount += stat.documentCount;
    }

    return {
      currentTotal: totalCount,
      maxTotal: this.config.maxTotalStorageDocuments,
      saveStats,
      suggestedDeletions,
    };
  }

  /**
   * Check if a save exceeds its document limit
   */
  async checkSaveOverflow(
    saveId: string,
  ): Promise<{ overflow: number; current: number } | null> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.query<any>(
      `SELECT COUNT(*) as count FROM documents WHERE save_id = $1`,
      [saveId],
    );

    const count = parseInt(result.rows[0].count);
    if (count <= this.config.maxDocumentsPerSave) {
      return null;
    }

    return {
      overflow: count - this.config.maxDocumentsPerSave,
      current: count,
    };
  }

  /**
   * Delete oldest documents from specific saves
   */
  async deleteOldestFromSaves(saveIds: string[]): Promise<number> {
    if (!this.db) throw new Error("Database not initialized");

    let totalDeleted = 0;

    for (const saveId of saveIds) {
      const result = await this.db.query(
        `DELETE FROM documents WHERE save_id = $1 AND type != 'outline'`,
        [saveId],
      );
      totalDeleted += result.affectedRows || 0;

      // Also delete from save_metadata
      await this.db.query(`DELETE FROM save_metadata WHERE save_id = $1`, [
        saveId,
      ]);
    }

    return totalDeleted;
  }

  /**
   * Enforce per-save document limit by evicting oldest non-outline documents
   */
  async enforceSaveLimit(saveId: string): Promise<number> {
    if (!this.db) throw new Error("Database not initialized");

    const overflow = await this.checkSaveOverflow(saveId);
    if (!overflow) return 0;

    // Delete oldest documents (except outlines)
    const result = await this.db.query(
      `DELETE FROM documents WHERE id IN (
        SELECT id FROM documents
        WHERE save_id = $1 AND type != 'outline'
        ORDER BY last_access ASC
        LIMIT $2
      )`,
      [saveId, overflow.overflow],
    );

    // Update save metadata
    await this.updateSaveMetadata(saveId, 0);

    return result.affectedRows || 0;
  }

  /**
   * Get global storage statistics
   */
  async getGlobalStats(): Promise<GlobalStorageStats> {
    if (!this.db) throw new Error("Database not initialized");

    const totalResult = await this.db.query<any>(
      `SELECT COUNT(*) as count FROM documents`,
    );
    const totalDocuments = parseInt(totalResult.rows[0].count);

    const savesResult = await this.db.query<any>(
      `SELECT s.save_id, s.last_updated, s.document_count, s.embedding_model, s.embedding_provider,
              COALESCE(d.actual_count, 0) as actual_count
       FROM save_metadata s
       LEFT JOIN (
         SELECT save_id, COUNT(*) as actual_count FROM documents GROUP BY save_id
       ) d ON s.save_id = d.save_id
       ORDER BY s.last_updated DESC`,
    );

    const saves: SaveStats[] = savesResult.rows.map((row: any) => ({
      saveId: row.save_id,
      totalDocuments: parseInt(row.actual_count),
      documentsByType: {} as Record<DocumentType, number>,
      memoryUsage: 0,
      lastUpdated: parseInt(row.last_updated),
      embeddingModel: row.embedding_model,
      embeddingProvider: row.embedding_provider,
    }));

    return {
      totalDocuments,
      totalSaves: saves.length,
      saves,
      estimatedStorageBytes: totalDocuments * 4000, // Rough estimate
    };
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }
}
