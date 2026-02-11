/**
 * RAG Database (VFS-first)
 */

import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite/vector";
import type {
  DocumentType,
  GlobalStorageStats,
  ModelMismatchInfo,
  RAGConfig,
  RAGDocument,
  RAGDocumentMeta,
  SaveStats,
  SearchResult,
  StorageOverflowInfo,
} from "./types";

const DOCUMENT_TYPES: DocumentType[] = ["json", "markdown", "text"];

const SCHEMA = `
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS rag_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  save_id TEXT NOT NULL,
  fork_id INTEGER NOT NULL,
  turn_number INTEGER NOT NULL,

  source_path TEXT NOT NULL,
  canonical_path TEXT NOT NULL,
  doc_type TEXT NOT NULL,
  content_type TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_count INTEGER NOT NULL,

  content TEXT NOT NULL,

  embedding_model TEXT NOT NULL,
  embedding_provider TEXT NOT NULL,
  importance REAL NOT NULL DEFAULT 0.5,
  tags TEXT,
  created_at BIGINT NOT NULL,
  last_access BIGINT NOT NULL,

  UNIQUE(save_id, fork_id, canonical_path, file_hash, chunk_index)
);

CREATE TABLE IF NOT EXISTS embeddings (
  doc_id TEXT PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
  embedding vector
);

CREATE TABLE IF NOT EXISTS save_metadata (
  save_id TEXT PRIMARY KEY,
  current_fork_id INTEGER NOT NULL DEFAULT 0,
  last_updated BIGINT NOT NULL,
  document_count INTEGER NOT NULL DEFAULT 0,
  embedding_model TEXT,
  embedding_provider TEXT,
  last_accessed BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_documents_save_id ON documents(save_id);
CREATE INDEX IF NOT EXISTS idx_documents_save_fork ON documents(save_id, fork_id);
CREATE INDEX IF NOT EXISTS idx_documents_source_path ON documents(source_path);
CREATE INDEX IF NOT EXISTS idx_documents_canonical_path ON documents(canonical_path);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_documents_content_type ON documents(content_type);
CREATE INDEX IF NOT EXISTS idx_documents_turn_number ON documents(turn_number);
CREATE INDEX IF NOT EXISTS idx_documents_last_access ON documents(last_access);
CREATE INDEX IF NOT EXISTS idx_documents_file_hash ON documents(file_hash);
`;

export class RAGDatabase {
  private db: PGlite | null = null;
  private readonly config: RAGConfig;
  private initialized = false;

  constructor(config: RAGConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.db = new PGlite(`idb://${this.config.dbName}`, {
      extensions: { vector },
    });

    await this.db.waitReady;
    await this.db.exec(SCHEMA);
    await this.ensureSchemaVersion();

    this.initialized = true;
    console.log("[RAGDatabase] Initialized");
  }

  private async ensureSchemaVersion(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.query<any>(
      `SELECT value FROM rag_meta WHERE key = 'schema_version' LIMIT 1`,
    );

    const stored = result.rows[0]?.value;
    const expected = String(this.config.schemaVersion);

    if (stored === expected) {
      return;
    }

    if (stored) {
      console.warn(
        `[RAGDatabase] Schema mismatch detected (${stored} -> ${expected}), rebuilding`,
      );
      await this.resetSchema();
      await this.db.exec(SCHEMA);
    }

    await this.db.query(
      `INSERT INTO rag_meta (key, value)
       VALUES ('schema_version', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [expected],
    );
  }

  private async resetSchema(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.exec(`
      DROP TABLE IF EXISTS embeddings;
      DROP TABLE IF EXISTS documents;
      DROP TABLE IF EXISTS save_metadata;
      DROP TABLE IF EXISTS rag_meta;
    `);
  }

  async addDocument(doc: RAGDocument): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const tagsJson = doc.tags ? JSON.stringify(doc.tags) : null;

    await this.db.query(
      `INSERT INTO documents (
        id, save_id, fork_id, turn_number,
        source_path, canonical_path, doc_type, content_type, file_hash, chunk_index, chunk_count,
        content,
        embedding_model, embedding_provider, importance, tags,
        created_at, last_access
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8, $9, $10, $11,
        $12,
        $13, $14, $15, $16,
        $17, $18
      )
      ON CONFLICT (id) DO UPDATE SET
        turn_number = EXCLUDED.turn_number,
        content = EXCLUDED.content,
        embedding_model = EXCLUDED.embedding_model,
        embedding_provider = EXCLUDED.embedding_provider,
        importance = EXCLUDED.importance,
        tags = EXCLUDED.tags,
        last_access = EXCLUDED.last_access,
        created_at = EXCLUDED.created_at`,
      [
        doc.id,
        doc.saveId,
        doc.forkId,
        doc.turnNumber,
        doc.sourcePath,
        doc.canonicalPath,
        doc.type,
        doc.contentType,
        doc.fileHash,
        doc.chunkIndex,
        doc.chunkCount,
        doc.content,
        doc.embeddingModel,
        doc.embeddingProvider,
        doc.importance,
        tagsJson,
        doc.createdAt,
        doc.lastAccess,
      ],
    );

    if (doc.embedding && doc.embedding.length > 0) {
      const embeddingVector = `[${Array.from(doc.embedding).join(",")}]`;
      await this.db.query(
        `INSERT INTO embeddings (doc_id, embedding)
         VALUES ($1, $2::vector)
         ON CONFLICT (doc_id) DO UPDATE SET embedding = EXCLUDED.embedding`,
        [doc.id, embeddingVector],
      );
    }

    await this.touchSaveMetadata(
      doc.saveId,
      doc.forkId,
      doc.embeddingModel,
      doc.embeddingProvider,
    );
  }

  async addDocuments(docs: RAGDocument[]): Promise<void> {
    if (docs.length === 0) return;

    for (const doc of docs) {
      await this.addDocument(doc);
    }

    await this.refreshSaveMetadata(docs[0]!.saveId, docs[0]!.forkId);
  }

  async deleteDocument(docId: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");
    await this.db.query(`DELETE FROM documents WHERE id = $1`, [docId]);
  }

  async deleteDocumentsBySave(saveId: string): Promise<number> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.query<any>(
      `DELETE FROM documents WHERE save_id = $1`,
      [saveId],
    );

    await this.db.query(`DELETE FROM save_metadata WHERE save_id = $1`, [saveId]);

    return result.affectedRows || 0;
  }

  async deleteDocumentsByPaths(
    saveId: string,
    paths: string[],
    forkId?: number,
  ): Promise<number> {
    if (!this.db) throw new Error("Database not initialized");
    if (paths.length === 0) return 0;

    const normalized = Array.from(new Set(paths));

    const result = await this.db.query<any>(
      forkId === undefined
        ? `DELETE FROM documents WHERE save_id = $1 AND canonical_path = ANY($2)`
        : `DELETE FROM documents WHERE save_id = $1 AND fork_id = $2 AND canonical_path = ANY($3)`,
      forkId === undefined ? [saveId, normalized] : [saveId, forkId, normalized],
    );

    if (forkId === undefined) {
      await this.refreshSaveMetadata(saveId, 0);
    } else {
      await this.refreshSaveMetadata(saveId, forkId);
    }

    return result.affectedRows || 0;
  }

  // Legacy alias used by old worker code path
  async getDocumentsByEntity(entityId: string, saveId: string): Promise<RAGDocument[]> {
    return this.getDocumentsBySourcePath(entityId, saveId);
  }

  async getDocumentsBySourcePath(
    sourcePath: string,
    saveId: string,
  ): Promise<RAGDocument[]> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.query<any>(
      `SELECT d.*, e.embedding
       FROM documents d
       LEFT JOIN embeddings e ON d.id = e.doc_id
       WHERE d.save_id = $1 AND d.source_path = $2
       ORDER BY d.chunk_index ASC`,
      [saveId, sourcePath],
    );

    return result.rows.map((row) => this.rowToDocument(row));
  }

  async searchSimilar(
    queryEmbedding: Float32Array,
    saveId: string,
    options: {
      topK?: number;
      threshold?: number;
      types?: DocumentType[];
      contentTypes?: string[];
      pathPrefixes?: string[];
      forkIds?: number[];
      beforeTurn?: number;
    } = {},
  ): Promise<SearchResult[]> {
    if (!this.db) throw new Error("Database not initialized");

    const {
      topK = 10,
      threshold = 0.5,
      types,
      contentTypes,
      pathPrefixes,
      forkIds,
      beforeTurn,
    } = options;

    const where: string[] = ["d.save_id = $2"];
    const params: any[] = [`[${Array.from(queryEmbedding).join(",")}]`, saveId];
    let index = 3;

    if (types && types.length > 0) {
      where.push(`d.doc_type = ANY($${index})`);
      params.push(types);
      index += 1;
    }

    if (contentTypes && contentTypes.length > 0) {
      where.push(`d.content_type = ANY($${index})`);
      params.push(contentTypes);
      index += 1;
    }

    if (forkIds && forkIds.length > 0) {
      where.push(`d.fork_id = ANY($${index})`);
      params.push(forkIds);
      index += 1;
    }

    if (beforeTurn !== undefined) {
      where.push(`d.turn_number <= $${index}`);
      params.push(beforeTurn);
      index += 1;
    }

    if (pathPrefixes && pathPrefixes.length > 0) {
      const prefixLikes = pathPrefixes.map((prefix) =>
        prefix.endsWith("/") ? `${prefix}%` : `${prefix}%`,
      );
      where.push(`d.source_path LIKE ANY($${index})`);
      params.push(prefixLikes);
      index += 1;
    }

    const whereClause = where.join(" AND ");

    const result = await this.db.query<any>(
      `SELECT d.*, 1 - (e.embedding <=> $1::vector) AS similarity
       FROM documents d
       JOIN embeddings e ON d.id = e.doc_id
       WHERE ${whereClause}
         AND 1 - (e.embedding <=> $1::vector) >= $${index}
       ORDER BY e.embedding <=> $1::vector
       LIMIT $${index + 1}`,
      [...params, threshold, topK * 2],
    );

    const ids = result.rows.map((row: any) => row.id);
    if (ids.length > 0) {
      await this.db.query(
        `UPDATE documents SET last_access = $1 WHERE id = ANY($2)`,
        [Date.now(), ids],
      );
    }

    return result.rows.map((row: any) => ({
      document: this.rowToDocumentMeta(row),
      score: row.similarity,
      adjustedScore: row.similarity,
    }));
  }

  async getSaveStats(saveId: string): Promise<SaveStats | null> {
    if (!this.db) throw new Error("Database not initialized");

    const countResult = await this.db.query<any>(
      `SELECT COUNT(*)::int AS count FROM documents WHERE save_id = $1`,
      [saveId],
    );

    const totalDocuments = Number(countResult.rows[0]?.count ?? 0);
    if (totalDocuments === 0) {
      return null;
    }

    const byTypeResult = await this.db.query<any>(
      `SELECT doc_type, COUNT(*)::int AS count
       FROM documents
       WHERE save_id = $1
       GROUP BY doc_type`,
      [saveId],
    );

    const documentsByType: Record<DocumentType, number> = {
      json: 0,
      markdown: 0,
      text: 0,
    };

    for (const row of byTypeResult.rows) {
      if (DOCUMENT_TYPES.includes(row.doc_type as DocumentType)) {
        documentsByType[row.doc_type as DocumentType] = Number(row.count);
      }
    }

    const metaResult = await this.db.query<any>(
      `SELECT * FROM save_metadata WHERE save_id = $1 LIMIT 1`,
      [saveId],
    );

    const meta = metaResult.rows[0] || {};

    return {
      saveId,
      totalDocuments,
      documentsByType,
      memoryUsage: 0,
      lastUpdated: Number(meta.last_updated ?? Date.now()),
      embeddingModel: meta.embedding_model || undefined,
      embeddingProvider: meta.embedding_provider || undefined,
    };
  }

  async getAllSaveIds(): Promise<string[]> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.query<any>(
      `SELECT save_id FROM save_metadata ORDER BY last_updated DESC`,
    );

    return result.rows.map((row: any) => row.save_id);
  }

  async getDocumentsForSave(
    saveId: string,
    limit?: number,
  ): Promise<RAGDocumentMeta[]> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.query<any>(
      limit
        ? `SELECT * FROM documents WHERE save_id = $1 ORDER BY last_access DESC LIMIT $2`
        : `SELECT * FROM documents WHERE save_id = $1 ORDER BY last_access DESC`,
      limit ? [saveId, limit] : [saveId],
    );

    return result.rows.map((row) => this.rowToDocumentMeta(row));
  }

  async getDocumentsWithEmbeddingsForSave(saveId: string): Promise<RAGDocument[]> {
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

  async importDocuments(
    documents: Array<{
      id: string;
      sourcePath: string;
      canonicalPath: string;
      type: DocumentType;
      contentType: string;
      fileHash: string;
      chunkIndex: number;
      chunkCount: number;
      content: string;
      embedding: Float32Array;
      saveId: string;
      forkId: number;
      turnNumber: number;
      embeddingModel: string;
      embeddingProvider: string;
      importance: number;
      createdAt: number;
      lastAccess: number;
      tags?: string[];
    }>,
  ): Promise<number> {
    if (!this.db) throw new Error("Database not initialized");
    if (documents.length === 0) return 0;

    let imported = 0;

    for (const doc of documents) {
      const ragDoc: RAGDocument = {
        id: doc.id,
        sourcePath: doc.sourcePath,
        canonicalPath: doc.canonicalPath,
        type: doc.type,
        contentType: doc.contentType,
        fileHash: doc.fileHash,
        chunkIndex: doc.chunkIndex,
        chunkCount: doc.chunkCount,
        content: doc.content,
        embedding: doc.embedding,
        saveId: doc.saveId,
        forkId: doc.forkId,
        turnNumber: doc.turnNumber,
        embeddingModel: doc.embeddingModel,
        embeddingProvider: doc.embeddingProvider,
        importance: doc.importance,
        createdAt: doc.createdAt,
        lastAccess: doc.lastAccess,
        tags: doc.tags,
      };

      await this.addDocument(ragDoc);
      imported += 1;
    }

    return imported;
  }

  async getRecentDocuments(
    saveId: string,
    limit: number = 20,
    types?: DocumentType[],
  ): Promise<RAGDocumentMeta[]> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.query<any>(
      types && types.length > 0
        ? `SELECT * FROM documents
           WHERE save_id = $1 AND doc_type = ANY($2)
           ORDER BY created_at DESC
           LIMIT $3`
        : `SELECT * FROM documents
           WHERE save_id = $1
           ORDER BY created_at DESC
           LIMIT $2`,
      types && types.length > 0 ? [saveId, types, limit] : [saveId, limit],
    );

    return result.rows.map((row) => this.rowToDocumentMeta(row));
  }

  async getDocumentsPaginated(
    saveId: string,
    offset: number,
    limit: number,
    types?: DocumentType[],
  ): Promise<{ documents: RAGDocumentMeta[]; total: number }> {
    if (!this.db) throw new Error("Database not initialized");

    const countResult = await this.db.query<any>(
      types && types.length > 0
        ? `SELECT COUNT(*)::int AS count FROM documents WHERE save_id = $1 AND doc_type = ANY($2)`
        : `SELECT COUNT(*)::int AS count FROM documents WHERE save_id = $1`,
      types && types.length > 0 ? [saveId, types] : [saveId],
    );

    const total = Number(countResult.rows[0]?.count ?? 0);

    const dataResult = await this.db.query<any>(
      types && types.length > 0
        ? `SELECT * FROM documents
           WHERE save_id = $1 AND doc_type = ANY($2)
           ORDER BY created_at DESC
           LIMIT $3 OFFSET $4`
        : `SELECT * FROM documents
           WHERE save_id = $1
           ORDER BY created_at DESC
           LIMIT $2 OFFSET $3`,
      types && types.length > 0
        ? [saveId, types, limit, offset]
        : [saveId, limit, offset],
    );

    return {
      documents: dataResult.rows.map((row) => this.rowToDocumentMeta(row)),
      total,
    };
  }

  async enforceSaveLimit(saveId: string): Promise<number> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.query<any>(
      `SELECT COUNT(*)::int AS count FROM documents WHERE save_id = $1`,
      [saveId],
    );

    const total = Number(result.rows[0]?.count ?? 0);
    const overflow = total - this.config.maxDocumentsPerSave;
    if (overflow <= 0) {
      return 0;
    }

    const deletion = await this.db.query<any>(
      `DELETE FROM documents WHERE id IN (
        SELECT id FROM documents
        WHERE save_id = $1
        ORDER BY last_access ASC, created_at ASC
        LIMIT $2
      )`,
      [saveId, overflow],
    );

    await this.refreshSaveMetadata(saveId, 0);
    return deletion.affectedRows || 0;
  }

  async cleanupOldVersions(): Promise<number> {
    // VFS-file chunks are immutable-by-hash in this model.
    return 0;
  }

  async enforceStorageLimits(): Promise<number> {
    if (!this.db) throw new Error("Database not initialized");

    const totalResult = await this.db.query<any>(
      `SELECT COUNT(*)::int AS count FROM documents`,
    );

    const total = Number(totalResult.rows[0]?.count ?? 0);
    const overflow = total - this.config.maxTotalStorageDocuments;
    if (overflow <= 0) {
      return 0;
    }

    const deletion = await this.db.query<any>(
      `DELETE FROM documents WHERE id IN (
        SELECT id FROM documents
        ORDER BY last_access ASC, created_at ASC
        LIMIT $1
      )`,
      [overflow],
    );

    await this.refreshAllSaveMetadata();
    return deletion.affectedRows || 0;
  }

  async checkStorageOverflow(): Promise<StorageOverflowInfo | null> {
    if (!this.db) throw new Error("Database not initialized");

    const totalResult = await this.db.query<any>(
      `SELECT COUNT(*)::int AS count FROM documents`,
    );

    const currentTotal = Number(totalResult.rows[0]?.count ?? 0);
    if (currentTotal <= this.config.maxTotalStorageDocuments) {
      return null;
    }

    const saveRows = await this.db.query<any>(
      `SELECT
         save_id,
         COALESCE(document_count, 0)::int AS document_count,
         COALESCE(last_accessed, last_updated, 0)::bigint AS last_accessed
       FROM save_metadata
       ORDER BY last_accessed ASC`,
    );

    const saveStats = saveRows.rows.map((row: any) => ({
      saveId: row.save_id as string,
      documentCount: Number(row.document_count ?? 0),
      lastAccessed: Number(row.last_accessed ?? 0),
    }));

    const suggestedDeletions: string[] = [];
    let toFree = currentTotal - this.config.maxTotalStorageDocuments;
    for (const save of saveStats) {
      if (toFree <= 0) break;
      suggestedDeletions.push(save.saveId);
      toFree -= save.documentCount;
    }

    return {
      currentTotal,
      maxTotal: this.config.maxTotalStorageDocuments,
      saveStats,
      suggestedDeletions,
    };
  }

  async deleteOldestFromSaves(saveIds: string[]): Promise<number> {
    if (!this.db) throw new Error("Database not initialized");
    if (saveIds.length === 0) return 0;

    const result = await this.db.query<any>(
      `DELETE FROM documents WHERE save_id = ANY($1)`,
      [saveIds],
    );

    await this.db.query(`DELETE FROM save_metadata WHERE save_id = ANY($1)`, [saveIds]);

    return result.affectedRows || 0;
  }

  async getGlobalStats(): Promise<GlobalStorageStats> {
    if (!this.db) throw new Error("Database not initialized");

    const totalResult = await this.db.query<any>(
      `SELECT COUNT(*)::int AS count FROM documents`,
    );

    const saveIds = await this.getAllSaveIds();
    const saves: SaveStats[] = [];

    for (const saveId of saveIds) {
      const stats = await this.getSaveStats(saveId);
      if (stats) {
        saves.push(stats);
      }
    }

    return {
      totalDocuments: Number(totalResult.rows[0]?.count ?? 0),
      totalSaves: saves.length,
      saves,
      estimatedStorageBytes: 0,
    };
  }

  async checkModelMismatch(
    saveId: string,
    expectedModel: string,
    expectedProvider: string,
  ): Promise<ModelMismatchInfo | null> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.query<any>(
      `SELECT embedding_model, embedding_provider, COUNT(*)::int AS count
       FROM documents
       WHERE save_id = $1
         AND (embedding_model != $2 OR embedding_provider != $3)
       GROUP BY embedding_model, embedding_provider
       LIMIT 1`,
      [saveId, expectedModel, expectedProvider],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      currentModel: expectedModel,
      currentProvider: expectedProvider,
      storedModel: row.embedding_model,
      storedProvider: row.embedding_provider,
      documentCount: Number(row.count ?? 0),
    };
  }

  async getSaveModelInfo(
    saveId: string,
  ): Promise<{ model: string; provider: string } | null> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.query<any>(
      `SELECT embedding_model, embedding_provider
       FROM save_metadata
       WHERE save_id = $1
       LIMIT 1`,
      [saveId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return {
      model: result.rows[0].embedding_model || this.config.modelId,
      provider: result.rows[0].embedding_provider || this.config.provider,
    };
  }

  async clearSaveForRebuild(saveId: string): Promise<number> {
    return this.deleteDocumentsBySave(saveId);
  }

  private async touchSaveMetadata(
    saveId: string,
    forkId: number,
    embeddingModel?: string,
    embeddingProvider?: string,
  ): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const now = Date.now();
    await this.db.query(
      `INSERT INTO save_metadata (
         save_id,
         current_fork_id,
         last_updated,
         document_count,
         embedding_model,
         embedding_provider,
         last_accessed
       )
       VALUES ($1, $2, $3, 0, $4, $5, $3)
       ON CONFLICT (save_id) DO UPDATE SET
         current_fork_id = EXCLUDED.current_fork_id,
         last_updated = EXCLUDED.last_updated,
         embedding_model = COALESCE(EXCLUDED.embedding_model, save_metadata.embedding_model),
         embedding_provider = COALESCE(EXCLUDED.embedding_provider, save_metadata.embedding_provider),
         last_accessed = EXCLUDED.last_accessed`,
      [saveId, forkId, now, embeddingModel, embeddingProvider],
    );
  }

  private async refreshSaveMetadata(saveId: string, forkId: number): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const countResult = await this.db.query<any>(
      `SELECT COUNT(*)::int AS count FROM documents WHERE save_id = $1`,
      [saveId],
    );

    const modelResult = await this.db.query<any>(
      `SELECT embedding_model, embedding_provider
       FROM documents
       WHERE save_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [saveId],
    );

    const model = modelResult.rows[0]?.embedding_model || this.config.modelId;
    const provider =
      modelResult.rows[0]?.embedding_provider || this.config.provider;

    await this.db.query(
      `INSERT INTO save_metadata (
         save_id,
         current_fork_id,
         last_updated,
         document_count,
         embedding_model,
         embedding_provider,
         last_accessed
       )
       VALUES ($1, $2, $3, $4, $5, $6, $3)
       ON CONFLICT (save_id) DO UPDATE SET
         current_fork_id = EXCLUDED.current_fork_id,
         last_updated = EXCLUDED.last_updated,
         document_count = EXCLUDED.document_count,
         embedding_model = EXCLUDED.embedding_model,
         embedding_provider = EXCLUDED.embedding_provider,
         last_accessed = EXCLUDED.last_accessed`,
      [
        saveId,
        forkId,
        Date.now(),
        Number(countResult.rows[0]?.count ?? 0),
        model,
        provider,
      ],
    );
  }

  private async refreshAllSaveMetadata(): Promise<void> {
    const saveIds = await this.getAllSaveIds();
    for (const saveId of saveIds) {
      await this.refreshSaveMetadata(saveId, 0);
    }
  }

  private parseTags(value: string | null | undefined): string[] | undefined {
    if (!value) return undefined;
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((item) => typeof item === "string")
        : undefined;
    } catch {
      return undefined;
    }
  }

  private rowToDocument(row: any): RAGDocument {
    return {
      id: row.id,
      sourcePath: row.source_path,
      canonicalPath: row.canonical_path,
      type: row.doc_type as DocumentType,
      contentType: row.content_type,
      fileHash: row.file_hash,
      chunkIndex: Number(row.chunk_index ?? 0),
      chunkCount: Number(row.chunk_count ?? 1),
      content: row.content,
      embedding: row.embedding ? this.parseVector(row.embedding) : undefined,
      saveId: row.save_id,
      forkId: Number(row.fork_id ?? 0),
      turnNumber: Number(row.turn_number ?? 0),
      embeddingModel: row.embedding_model,
      embeddingProvider: row.embedding_provider,
      importance: Number(row.importance ?? 0.5),
      createdAt: Number(row.created_at ?? Date.now()),
      lastAccess: Number(row.last_access ?? Date.now()),
      tags: this.parseTags(row.tags),
    };
  }

  private rowToDocumentMeta(row: any): RAGDocumentMeta {
    return {
      id: row.id,
      sourcePath: row.source_path,
      canonicalPath: row.canonical_path,
      type: row.doc_type as DocumentType,
      contentType: row.content_type,
      fileHash: row.file_hash,
      chunkIndex: Number(row.chunk_index ?? 0),
      chunkCount: Number(row.chunk_count ?? 1),
      content: row.content,
      saveId: row.save_id,
      forkId: Number(row.fork_id ?? 0),
      turnNumber: Number(row.turn_number ?? 0),
      embeddingModel: row.embedding_model,
      embeddingProvider: row.embedding_provider,
      importance: Number(row.importance ?? 0.5),
      createdAt: Number(row.created_at ?? Date.now()),
      lastAccess: Number(row.last_access ?? Date.now()),
      tags: this.parseTags(row.tags),
    };
  }

  private parseVector(vectorValue: string): Float32Array {
    const nums = vectorValue
      .replace(/[\[\]]/g, "")
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item));
    return new Float32Array(nums);
  }
}
