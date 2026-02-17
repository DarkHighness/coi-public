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
  ReusableEmbeddingLookupItem,
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

  is_latest BOOLEAN NOT NULL DEFAULT TRUE,
  superseded_at_turn INTEGER,
  estimated_bytes BIGINT NOT NULL DEFAULT 0,

  UNIQUE(save_id, fork_id, canonical_path, file_hash, chunk_index, embedding_model, embedding_provider, is_latest)
);

CREATE TABLE IF NOT EXISTS embeddings (
  doc_id TEXT PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
  embedding vector
);

CREATE TABLE IF NOT EXISTS save_metadata (
  save_id TEXT PRIMARY KEY,
  current_fork_id INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
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
CREATE INDEX IF NOT EXISTS idx_documents_latest ON documents(save_id, fork_id, is_latest);
CREATE INDEX IF NOT EXISTS idx_documents_model ON documents(embedding_model, embedding_provider);
CREATE INDEX IF NOT EXISTS idx_documents_estimated_bytes ON documents(estimated_bytes);
CREATE INDEX IF NOT EXISTS idx_save_metadata_active ON save_metadata(is_active, last_accessed);
`;

interface StorageTierBytes {
  protectedBytes: number;
  currentForkHistoryBytes: number;
  activeOtherForkBytes: number;
  inactiveGameBytes: number;
  totalBytes: number;
  reclaimableBytes: number;
}

type SqlRow = Record<string, unknown>;

const readOptionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const PROTECTED_CONDITION =
  "COALESCE(sm.is_active, FALSE) = TRUE AND d.fork_id = COALESCE(sm.current_fork_id, 0) AND d.is_latest = TRUE";
const TIER_A_CONDITION =
  "COALESCE(sm.is_active, FALSE) = TRUE AND d.fork_id = COALESCE(sm.current_fork_id, 0) AND d.is_latest = FALSE";
const TIER_B_CONDITION =
  "COALESCE(sm.is_active, FALSE) = TRUE AND d.fork_id <> COALESCE(sm.current_fork_id, 0)";
const TIER_C_CONDITION = "COALESCE(sm.is_active, FALSE) = FALSE";
const REQUIRED_DOCUMENT_COLUMNS = [
  "source_path",
  "canonical_path",
  "doc_type",
  "content_type",
  "file_hash",
  "chunk_index",
  "chunk_count",
  "is_latest",
  "superseded_at_turn",
  "estimated_bytes",
];

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
    await this.applySchemaWithCompatibilityRecovery();
    await this.ensureSchemaVersion();
    await this.ensureDocumentColumns();

    this.initialized = true;
    console.log("[RAGDatabase] Initialized");
  }

  private async applySchemaWithCompatibilityRecovery(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      await this.db.exec(SCHEMA);
    } catch (error) {
      if (!this.isMissingColumnError(error)) {
        throw error;
      }

      await this.rebuildSchema(
        "Detected legacy schema missing required columns during bootstrap",
      );
    }
  }

  private async setSchemaVersion(version: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.query(
      `INSERT INTO rag_meta (key, value)
       VALUES ('schema_version', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [version],
    );
  }

  private async rebuildSchema(reason: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const expected = String(this.config.schemaVersion);
    console.warn(`[RAGDatabase] ${reason}; rebuilding schema`);
    await this.resetSchema();
    await this.db.exec(SCHEMA);
    await this.setSchemaVersion(expected);
  }

  private isMissingColumnError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return /column\s+"?[a-zA-Z0-9_]+"?\s+does not exist/i.test(message);
  }

  private async ensureDocumentColumns(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      await this.db.query(
        `SELECT ${REQUIRED_DOCUMENT_COLUMNS.join(", ")} FROM documents LIMIT 0`,
      );
    } catch (error) {
      if (!this.isMissingColumnError(error)) {
        throw error;
      }
      await this.rebuildSchema(
        "Detected legacy documents table without required columns",
      );
    }
  }

  private async ensureSchemaVersion(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.query<SqlRow>(
      `SELECT value FROM rag_meta WHERE key = 'schema_version' LIMIT 1`,
    );

    const stored = result.rows[0]?.value;
    const expected = String(this.config.schemaVersion);

    if (stored === expected) {
      return;
    }

    if (stored) {
      await this.rebuildSchema(
        `Schema mismatch detected (${stored} -> ${expected})`,
      );
      return;
    }

    await this.setSchemaVersion(expected);
  }

  private async resetSchema(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.exec(`
      DROP TABLE IF EXISTS embeddings CASCADE;
      DROP TABLE IF EXISTS documents CASCADE;
      DROP TABLE IF EXISTS save_metadata CASCADE;
      DROP TABLE IF EXISTS rag_meta CASCADE;
    `);
  }

  private estimateDocumentBytes(
    doc: Pick<RAGDocument, "content" | "embedding">,
  ): number {
    const contentBytes = Math.max(0, doc.content.length * 2);
    const embeddingBytes = doc.embedding ? doc.embedding.length * 4 : 0;
    return contentBytes + embeddingBytes + 256;
  }

  async addDocument(
    doc: RAGDocument,
    options?: { skipSaveMetadataTouch?: boolean },
  ): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const tagsJson = doc.tags ? JSON.stringify(doc.tags) : null;
    const estimatedBytes =
      doc.estimatedBytes > 0
        ? Math.round(doc.estimatedBytes)
        : this.estimateDocumentBytes(doc);

    await this.db.query(
      `UPDATE documents
       SET is_latest = FALSE,
           superseded_at_turn = CASE
             WHEN superseded_at_turn IS NULL THEN $7
             ELSE superseded_at_turn
           END
       WHERE save_id = $1
         AND fork_id = $2
         AND canonical_path = $3
         AND chunk_index = $4
         AND embedding_model = $5
         AND embedding_provider = $6
         AND is_latest = TRUE
         AND id != $8`,
      [
        doc.saveId,
        doc.forkId,
        doc.canonicalPath,
        doc.chunkIndex,
        doc.embeddingModel,
        doc.embeddingProvider,
        doc.turnNumber,
        doc.id,
      ],
    );

    await this.db.query(
      `INSERT INTO documents (
        id, save_id, fork_id, turn_number,
        source_path, canonical_path, doc_type, content_type, file_hash, chunk_index, chunk_count,
        content,
        embedding_model, embedding_provider, importance, tags,
        created_at, last_access,
        is_latest, superseded_at_turn, estimated_bytes
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8, $9, $10, $11,
        $12,
        $13, $14, $15, $16,
        $17, $18,
        TRUE, NULL, $19
      )
      ON CONFLICT (id) DO UPDATE SET
        turn_number = EXCLUDED.turn_number,
        source_path = EXCLUDED.source_path,
        canonical_path = EXCLUDED.canonical_path,
        doc_type = EXCLUDED.doc_type,
        content_type = EXCLUDED.content_type,
        file_hash = EXCLUDED.file_hash,
        chunk_index = EXCLUDED.chunk_index,
        chunk_count = EXCLUDED.chunk_count,
        content = EXCLUDED.content,
        embedding_model = EXCLUDED.embedding_model,
        embedding_provider = EXCLUDED.embedding_provider,
        importance = EXCLUDED.importance,
        tags = EXCLUDED.tags,
        last_access = EXCLUDED.last_access,
        created_at = EXCLUDED.created_at,
        is_latest = TRUE,
        superseded_at_turn = NULL,
        estimated_bytes = EXCLUDED.estimated_bytes`,
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
        estimatedBytes,
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

    if (!options?.skipSaveMetadataTouch) {
      await this.touchSaveMetadata(
        doc.saveId,
        doc.forkId,
        doc.embeddingModel,
        doc.embeddingProvider,
      );
    }
  }

  async addDocuments(docs: RAGDocument[]): Promise<void> {
    if (docs.length === 0) return;

    for (const doc of docs) {
      await this.addDocument(doc, { skipSaveMetadataTouch: true });
    }

    const touched = new Map<string, number>();
    for (const doc of docs) {
      if (!touched.has(doc.saveId)) {
        touched.set(doc.saveId, doc.forkId);
      }
    }

    for (const [saveId, forkId] of touched.entries()) {
      await this.refreshSaveMetadata(saveId, forkId);
    }
  }

  async deleteDocument(docId: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const row = await this.db.query<SqlRow>(
      `SELECT save_id, fork_id FROM documents WHERE id = $1 LIMIT 1`,
      [docId],
    );

    await this.db.query(`DELETE FROM documents WHERE id = $1`, [docId]);

    const saveId = readOptionalString(row.rows[0]?.save_id);
    if (saveId) {
      await this.refreshSaveMetadata(saveId, Number(row.rows[0]?.fork_id ?? 0));
    }
  }

  async deleteDocumentsBySave(saveId: string): Promise<number> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.query<SqlRow>(
      `DELETE FROM documents WHERE save_id = $1`,
      [saveId],
    );

    await this.db.query(`DELETE FROM save_metadata WHERE save_id = $1`, [
      saveId,
    ]);

    return Number(result.affectedRows ?? 0);
  }

  async deleteDocumentsByPaths(
    saveId: string,
    paths: string[],
    forkId?: number,
  ): Promise<number> {
    if (!this.db) throw new Error("Database not initialized");
    if (paths.length === 0) return 0;

    const normalized = Array.from(new Set(paths));

    const result = await this.db.query<SqlRow>(
      forkId === undefined
        ? `DELETE FROM documents WHERE save_id = $1 AND canonical_path = ANY($2)`
        : `DELETE FROM documents WHERE save_id = $1 AND fork_id = $2 AND canonical_path = ANY($3)`,
      forkId === undefined
        ? [saveId, normalized]
        : [saveId, forkId, normalized],
    );

    await this.refreshSaveMetadata(saveId, forkId ?? 0);

    return Number(result.affectedRows ?? 0);
  }

  async retireLatestByPaths(
    saveId: string,
    forkId: number,
    turnNumber: number,
    paths: string[],
  ): Promise<number> {
    if (!this.db) throw new Error("Database not initialized");
    if (paths.length === 0) return 0;

    const normalized = Array.from(new Set(paths));

    const result = await this.db.query<SqlRow>(
      `UPDATE documents
       SET is_latest = FALSE,
           superseded_at_turn = CASE
             WHEN superseded_at_turn IS NULL THEN $3
             ELSE superseded_at_turn
           END
       WHERE save_id = $1
         AND fork_id = $2
         AND canonical_path = ANY($4)
         AND is_latest = TRUE`,
      [saveId, forkId, turnNumber, normalized],
    );

    await this.refreshSaveMetadata(saveId, forkId);

    return Number(result.affectedRows ?? 0);
  }

  async lookupReusableEmbeddings(
    items: ReusableEmbeddingLookupItem[],
    modelId: string,
    provider: string,
  ): Promise<Array<number[] | null>> {
    if (!this.db) throw new Error("Database not initialized");
    if (items.length === 0) return [];

    const tupleSql = items
      .map((_, index) => {
        const base = index * 5;
        return `($${base + 1}::int, $${base + 2}::text, $${base + 3}::text, $${base + 4}::text, $${base + 5}::int)`;
      })
      .join(", ");

    const params: Array<number | string> = [];
    items.forEach((item, index) => {
      params.push(
        index,
        item.saveId,
        item.sourcePath,
        item.fileHash,
        item.chunkIndex,
      );
    });

    const modelParamIndex = params.length + 1;
    const providerParamIndex = params.length + 2;
    params.push(modelId, provider);

    const result = await this.db.query<SqlRow>(
      `WITH req(idx, save_id, source_path, file_hash, chunk_index) AS (
         VALUES ${tupleSql}
       )
       SELECT req.idx, hit.embedding
       FROM req
       LEFT JOIN LATERAL (
         SELECT e.embedding
         FROM documents d
         JOIN embeddings e ON d.id = e.doc_id
         WHERE d.save_id = req.save_id
           AND d.source_path = req.source_path
           AND d.file_hash = req.file_hash
           AND d.chunk_index = req.chunk_index
           AND d.embedding_model = $${modelParamIndex}
           AND d.embedding_provider = $${providerParamIndex}
         ORDER BY d.is_latest DESC, d.last_access DESC, d.created_at DESC
         LIMIT 1
       ) AS hit ON TRUE
       ORDER BY req.idx ASC`,
      params,
    );

    const output: Array<number[] | null> = Array.from(
      { length: items.length },
      () => null,
    );

    for (const row of result.rows) {
      const idx = Number(row.idx ?? -1);
      if (!Number.isInteger(idx) || idx < 0 || idx >= items.length) {
        continue;
      }

      const embeddingValue = row.embedding;
      output[idx] = embeddingValue
        ? Array.from(this.parseVector(embeddingValue))
        : null;
    }

    return output;
  }

  // Legacy alias used by old worker code path
  async getDocumentsByEntity(
    entityId: string,
    saveId: string,
  ): Promise<RAGDocument[]> {
    return this.getDocumentsBySourcePath(entityId, saveId);
  }

  async getDocumentsBySourcePath(
    sourcePath: string,
    saveId: string,
  ): Promise<RAGDocument[]> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.query<SqlRow>(
      `SELECT d.*, e.embedding
       FROM documents d
       LEFT JOIN embeddings e ON d.id = e.doc_id
       WHERE d.save_id = $1 AND d.source_path = $2
       ORDER BY d.turn_number DESC, d.chunk_index ASC`,
      [saveId, sourcePath],
    );

    return result.rows.map((row: SqlRow) => this.rowToDocument(row));
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
      forkId?: number;
      forkIds?: number[];
      beforeTurn?: number;
      modelId?: string;
      provider?: string;
    } = {},
  ): Promise<SearchResult[]> {
    if (!this.db) throw new Error("Database not initialized");

    const {
      topK = 10,
      threshold = 0.5,
      types,
      contentTypes,
      pathPrefixes,
      forkId,
      forkIds,
      beforeTurn,
      modelId,
      provider,
    } = options;

    if (forkId === undefined) {
      throw new Error(
        "searchSimilar requires forkId for strict fork isolation",
      );
    }

    const where: string[] = ["d.save_id = $2", "d.is_latest = TRUE"];
    const params: unknown[] = [`[${Array.from(queryEmbedding).join(",")}]`, saveId];
    let index = 3;

    if (forkIds && forkIds.length > 0) {
      console.warn(
        "[RAGDatabase] searchSimilar received legacy forkIds; strict mode uses forkId only",
      );
    }

    where.push(`d.fork_id = $${index}`);
    params.push(forkId);
    index += 1;

    if (modelId) {
      where.push(`d.embedding_model = $${index}`);
      params.push(modelId);
      index += 1;
    }

    if (provider) {
      where.push(`d.embedding_provider = $${index}`);
      params.push(provider);
      index += 1;
    }

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

    const result = await this.db.query<SqlRow>(
      `SELECT d.*, 1 - (e.embedding <=> $1::vector) AS similarity
       FROM documents d
       JOIN embeddings e ON d.id = e.doc_id
       WHERE ${whereClause}
         AND 1 - (e.embedding <=> $1::vector) >= $${index}
       ORDER BY e.embedding <=> $1::vector
       LIMIT $${index + 1}`,
      [...params, threshold, topK],
    );

    const ids = result.rows.map((row: SqlRow) => row.id as string);
    if (ids.length > 0) {
      await this.db.query(
        `UPDATE documents SET last_access = $1 WHERE id = ANY($2)`,
        [Date.now(), ids],
      );
    }

    return result.rows.map((row: SqlRow) => ({
      document: this.rowToDocumentMeta(row),
      score: Number(row.similarity ?? 0),
      adjustedScore: Number(row.similarity ?? 0),
    }));
  }

  async getSaveStats(saveId: string): Promise<SaveStats | null> {
    if (!this.db) throw new Error("Database not initialized");

    const countResult = await this.db.query<SqlRow>(
      `SELECT COUNT(*)::int AS count, COALESCE(SUM(estimated_bytes), 0)::bigint AS bytes
       FROM documents
       WHERE save_id = $1`,
      [saveId],
    );

    const totalDocuments = Number(countResult.rows[0]?.count ?? 0);
    if (totalDocuments === 0) {
      return null;
    }

    const byTypeResult = await this.db.query<SqlRow>(
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

    const metaResult = await this.db.query<SqlRow>(
      `SELECT * FROM save_metadata WHERE save_id = $1 LIMIT 1`,
      [saveId],
    );

    const meta = metaResult.rows[0] || {};

    return {
      saveId,
      totalDocuments,
      documentsByType,
      memoryUsage: Number(countResult.rows[0]?.bytes ?? 0),
      lastUpdated: Number(meta.last_updated ?? Date.now()),
      embeddingModel: readOptionalString(meta.embedding_model),
      embeddingProvider: readOptionalString(meta.embedding_provider),
    };
  }

  async getAllSaveIds(): Promise<string[]> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.query<SqlRow>(
      `SELECT save_id FROM save_metadata ORDER BY is_active DESC, last_accessed DESC`,
    );

    return result.rows.map((row: SqlRow) => row.save_id as string);
  }

  async getDocumentsForSave(
    saveId: string,
    limit?: number,
  ): Promise<RAGDocumentMeta[]> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.query<SqlRow>(
      limit
        ? `SELECT * FROM documents WHERE save_id = $1 ORDER BY last_access DESC LIMIT $2`
        : `SELECT * FROM documents WHERE save_id = $1 ORDER BY last_access DESC`,
      limit ? [saveId, limit] : [saveId],
    );

    return result.rows.map((row: SqlRow) => this.rowToDocumentMeta(row));
  }

  async getDocumentsWithEmbeddingsForSave(
    saveId: string,
  ): Promise<RAGDocument[]> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.query<SqlRow>(
      `SELECT d.*, e.embedding
       FROM documents d
       LEFT JOIN embeddings e ON d.id = e.doc_id
       WHERE d.save_id = $1
       ORDER BY d.created_at ASC`,
      [saveId],
    );

    return result.rows.map((row: SqlRow) => this.rowToDocument(row));
  }

  async importDocuments(
    documents: Array<
      Pick<
        RAGDocument,
        | "id"
        | "sourcePath"
        | "canonicalPath"
        | "type"
        | "contentType"
        | "fileHash"
        | "chunkIndex"
        | "chunkCount"
        | "content"
        | "embedding"
        | "saveId"
        | "forkId"
        | "turnNumber"
        | "embeddingModel"
        | "embeddingProvider"
        | "importance"
        | "createdAt"
        | "lastAccess"
      > & {
        tags?: string[];
        isLatest?: boolean;
        supersededAtTurn?: number | null;
        estimatedBytes?: number;
      }
    >,
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
        isLatest: doc.isLatest ?? true,
        supersededAtTurn: doc.supersededAtTurn ?? null,
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
        estimatedBytes: doc.estimatedBytes ?? this.estimateDocumentBytes(doc),
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

    const result = await this.db.query<SqlRow>(
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

    return result.rows.map((row: SqlRow) => this.rowToDocumentMeta(row));
  }

  async getDocumentsPaginated(
    saveId: string,
    offset: number,
    limit: number,
    types?: DocumentType[],
  ): Promise<{ documents: RAGDocumentMeta[]; total: number }> {
    if (!this.db) throw new Error("Database not initialized");

    const countResult = await this.db.query<SqlRow>(
      types && types.length > 0
        ? `SELECT COUNT(*)::int AS count FROM documents WHERE save_id = $1 AND doc_type = ANY($2)`
        : `SELECT COUNT(*)::int AS count FROM documents WHERE save_id = $1`,
      types && types.length > 0 ? [saveId, types] : [saveId],
    );

    const total = Number(countResult.rows[0]?.count ?? 0);

    const dataResult = await this.db.query<SqlRow>(
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
      documents: dataResult.rows.map((row: SqlRow) => this.rowToDocumentMeta(row)),
      total,
    };
  }

  async enforceSaveLimit(saveId: string): Promise<number> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.query<SqlRow>(
      `SELECT COUNT(*)::int AS count FROM documents WHERE save_id = $1`,
      [saveId],
    );

    const total = Number(result.rows[0]?.count ?? 0);
    const overflow = total - this.config.maxDocumentsPerSave;
    if (overflow <= 0) {
      return 0;
    }

    const candidates = await this.db.query<SqlRow>(
      `SELECT d.id
       FROM documents d
       LEFT JOIN save_metadata sm ON sm.save_id = d.save_id
       WHERE d.save_id = $1
         AND NOT (${PROTECTED_CONDITION})
       ORDER BY d.last_access ASC, d.created_at ASC
       LIMIT $2`,
      [saveId, overflow],
    );

    const ids = candidates.rows.map((row: SqlRow) => row.id as string);
    if (ids.length === 0) {
      return 0;
    }

    const deleted = await this.db.query<SqlRow>(
      `DELETE FROM documents WHERE id = ANY($1)`,
      [ids],
    );

    await this.refreshSaveMetadata(saveId, 0);
    return Number(deleted.affectedRows ?? 0);
  }

  async cleanupOldVersions(): Promise<number> {
    return 0;
  }

  private async getStorageTierBytes(): Promise<StorageTierBytes> {
    if (!this.db) throw new Error("Database not initialized");

    const rowResult = await this.db.query<SqlRow>(
      `SELECT
         COALESCE(SUM(CASE WHEN ${PROTECTED_CONDITION} THEN d.estimated_bytes ELSE 0 END), 0)::bigint AS protected_bytes,
         COALESCE(SUM(CASE WHEN ${TIER_A_CONDITION} THEN d.estimated_bytes ELSE 0 END), 0)::bigint AS tier_a_bytes,
         COALESCE(SUM(CASE WHEN ${TIER_B_CONDITION} THEN d.estimated_bytes ELSE 0 END), 0)::bigint AS tier_b_bytes,
         COALESCE(SUM(CASE WHEN ${TIER_C_CONDITION} THEN d.estimated_bytes ELSE 0 END), 0)::bigint AS tier_c_bytes,
         COALESCE(SUM(d.estimated_bytes), 0)::bigint AS total_bytes
       FROM documents d
       LEFT JOIN save_metadata sm ON sm.save_id = d.save_id`,
    );

    const row = rowResult.rows[0] || {};
    const protectedBytes = Number(row.protected_bytes ?? 0);
    const currentForkHistoryBytes = Number(row.tier_a_bytes ?? 0);
    const activeOtherForkBytes = Number(row.tier_b_bytes ?? 0);
    const inactiveGameBytes = Number(row.tier_c_bytes ?? 0);
    const totalBytes = Number(row.total_bytes ?? 0);

    return {
      protectedBytes,
      currentForkHistoryBytes,
      activeOtherForkBytes,
      inactiveGameBytes,
      totalBytes,
      reclaimableBytes:
        currentForkHistoryBytes + activeOtherForkBytes + inactiveGameBytes,
    };
  }

  private async collectEvictionCandidates(
    whereClause: string,
    bytesToFree: number,
  ): Promise<{ ids: string[]; bytesFreed: number }> {
    if (!this.db || bytesToFree <= 0) {
      return { ids: [], bytesFreed: 0 };
    }

    const result = await this.db.query<SqlRow>(
      `SELECT d.id, COALESCE(d.estimated_bytes, 0)::bigint AS estimated_bytes
       FROM documents d
       LEFT JOIN save_metadata sm ON sm.save_id = d.save_id
       WHERE ${whereClause}
       ORDER BY d.last_access ASC, d.created_at ASC`,
    );

    const ids: string[] = [];
    let bytesFreed = 0;

    for (const row of result.rows) {
      if (bytesFreed >= bytesToFree) break;
      ids.push(String(row.id));
      bytesFreed += Number(row.estimated_bytes ?? 0);
    }

    return { ids, bytesFreed };
  }

  async enforceStorageLimits(): Promise<number> {
    if (!this.db) throw new Error("Database not initialized");

    const storage = await this.getStorageTierBytes();
    let bytesOver = storage.totalBytes - this.config.maxStorageBytes;

    if (bytesOver <= 0) {
      return 0;
    }

    let deletedTotal = 0;

    const tiers = [TIER_C_CONDITION, TIER_B_CONDITION, TIER_A_CONDITION];
    for (const tierWhere of tiers) {
      if (bytesOver <= 0) break;

      const { ids, bytesFreed } = await this.collectEvictionCandidates(
        tierWhere,
        bytesOver,
      );
      if (ids.length === 0) continue;

      const deletion = await this.db.query<SqlRow>(
        `DELETE FROM documents WHERE id = ANY($1)`,
        [ids],
      );

      deletedTotal += Number(deletion.affectedRows ?? 0);
      bytesOver = Math.max(0, bytesOver - bytesFreed);
    }

    if (deletedTotal > 0) {
      await this.refreshAllSaveMetadata();
    }

    return deletedTotal;
  }

  async getStorageStatusBreakdown(): Promise<{
    protectedBytes: number;
    currentForkHistoryBytes: number;
    activeOtherForkBytes: number;
    inactiveGameBytes: number;
    storageLimitBytes: number;
    protectedOverflow: boolean;
    totalBytes: number;
  }> {
    const storage = await this.getStorageTierBytes();

    return {
      protectedBytes: storage.protectedBytes,
      currentForkHistoryBytes: storage.currentForkHistoryBytes,
      activeOtherForkBytes: storage.activeOtherForkBytes,
      inactiveGameBytes: storage.inactiveGameBytes,
      storageLimitBytes: this.config.maxStorageBytes,
      protectedOverflow: storage.protectedBytes > this.config.maxStorageBytes,
      totalBytes: storage.totalBytes,
    };
  }

  async checkStorageOverflow(): Promise<StorageOverflowInfo | null> {
    if (!this.db) throw new Error("Database not initialized");

    const storage = await this.getStorageTierBytes();
    const protectedOverflow =
      storage.protectedBytes > this.config.maxStorageBytes;
    const exceedsLimit = storage.totalBytes > this.config.maxStorageBytes;

    if (!protectedOverflow && !exceedsLimit) {
      return null;
    }

    const saveRows = await this.db.query<SqlRow>(
      `SELECT
         sm.save_id,
         COALESCE(sm.document_count, 0)::int AS document_count,
         COALESCE(sm.last_accessed, sm.last_updated, 0)::bigint AS last_accessed,
         COALESCE(sm.is_active, FALSE) AS is_active
       FROM save_metadata sm
       ORDER BY sm.is_active DESC, sm.last_accessed ASC`,
    );

    const saveStats = saveRows.rows.map((row: SqlRow) => ({
      saveId: row.save_id as string,
      documentCount: Number(row.document_count ?? 0),
      lastAccessed: Number(row.last_accessed ?? 0),
    }));

    const suggestedDeletions = saveRows.rows
      .filter(
        (row: SqlRow) => !row.is_active && Number(row.document_count ?? 0) > 0,
      )
      .map((row: SqlRow) => String(row.save_id));

    return {
      currentTotal: storage.totalBytes,
      maxTotal: this.config.maxStorageBytes,
      saveStats,
      suggestedDeletions,
      protectedBytes: storage.protectedBytes,
      currentForkHistoryBytes: storage.currentForkHistoryBytes,
      activeOtherForkBytes: storage.activeOtherForkBytes,
      inactiveGameBytes: storage.inactiveGameBytes,
      storageLimitBytes: this.config.maxStorageBytes,
      protectedOverflow,
    };
  }

  async deleteOldestFromSaves(saveIds: string[]): Promise<number> {
    if (!this.db) throw new Error("Database not initialized");
    if (saveIds.length === 0) return 0;

    const uniqueIds = Array.from(new Set(saveIds));

    const result = await this.db.query<SqlRow>(
      `DELETE FROM documents WHERE save_id = ANY($1)`,
      [uniqueIds],
    );

    await this.db.query(`DELETE FROM save_metadata WHERE save_id = ANY($1)`, [
      uniqueIds,
    ]);

    return Number(result.affectedRows ?? 0);
  }

  async getGlobalStats(): Promise<GlobalStorageStats> {
    if (!this.db) throw new Error("Database not initialized");

    const totalResult = await this.db.query<SqlRow>(
      `SELECT
         COUNT(*)::int AS count,
         COALESCE(SUM(estimated_bytes), 0)::bigint AS estimated_storage
       FROM documents`,
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
      estimatedStorageBytes: Number(
        totalResult.rows[0]?.estimated_storage ?? 0,
      ),
    };
  }

  async checkModelMismatch(
    saveId: string,
    forkId: number,
    expectedModel: string,
    expectedProvider: string,
  ): Promise<ModelMismatchInfo | null> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.query<SqlRow>(
      `SELECT embedding_model, embedding_provider, COUNT(*)::int AS count
       FROM documents
       WHERE save_id = $1
         AND fork_id = $2
         AND is_latest = TRUE
         AND (embedding_model != $3 OR embedding_provider != $4)
       GROUP BY embedding_model, embedding_provider
       ORDER BY count DESC
       LIMIT 1`,
      [saveId, forkId, expectedModel, expectedProvider],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      currentModel: expectedModel,
      currentProvider: expectedProvider,
      storedModel: String(row.embedding_model),
      storedProvider: String(row.embedding_provider),
      documentCount: Number(row.count ?? 0),
    };
  }

  async getSaveModelInfo(
    saveId: string,
  ): Promise<{ model: string; provider: string } | null> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.query<SqlRow>(
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
      model:
        readOptionalString(result.rows[0]?.embedding_model) ??
        this.config.modelId,
      provider:
        readOptionalString(result.rows[0]?.embedding_provider) ??
        this.config.provider,
    };
  }

  async clearSaveForRebuild(saveId: string, forkId?: number): Promise<number> {
    if (!this.db) throw new Error("Database not initialized");

    const deletion = await this.db.query<SqlRow>(
      forkId === undefined
        ? `DELETE FROM documents
           WHERE save_id = $1
             AND is_latest = TRUE`
        : `DELETE FROM documents
           WHERE save_id = $1
             AND fork_id = $2
             AND is_latest = TRUE`,
      forkId === undefined ? [saveId] : [saveId, forkId],
    );

    await this.refreshSaveMetadata(saveId, forkId ?? 0);

    return Number(deletion.affectedRows ?? 0);
  }

  async markSaveActive(saveId: string, forkId: number): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const now = Date.now();
    await this.touchSaveMetadata(saveId, forkId);

    await this.db.query(
      `UPDATE save_metadata
       SET is_active = CASE WHEN save_id = $1 THEN TRUE ELSE FALSE END,
           current_fork_id = CASE WHEN save_id = $1 THEN $2 ELSE current_fork_id END,
           last_accessed = CASE WHEN save_id = $1 THEN $3 ELSE last_accessed END`,
      [saveId, forkId, now],
    );

    await this.refreshSaveMetadata(saveId, forkId);
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
         is_active,
         last_updated,
         document_count,
         embedding_model,
         embedding_provider,
         last_accessed
       )
       VALUES ($1, $2, FALSE, $3, 0, $4, $5, $3)
       ON CONFLICT (save_id) DO UPDATE SET
         current_fork_id = EXCLUDED.current_fork_id,
         last_updated = EXCLUDED.last_updated,
         embedding_model = COALESCE(EXCLUDED.embedding_model, save_metadata.embedding_model),
         embedding_provider = COALESCE(EXCLUDED.embedding_provider, save_metadata.embedding_provider),
         last_accessed = EXCLUDED.last_accessed`,
      [saveId, forkId, now, embeddingModel, embeddingProvider],
    );
  }

  private async refreshSaveMetadata(
    saveId: string,
    forkId: number,
  ): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const countResult = await this.db.query<SqlRow>(
      `SELECT COUNT(*)::int AS count FROM documents WHERE save_id = $1`,
      [saveId],
    );

    const modelResult = await this.db.query<SqlRow>(
      `SELECT embedding_model, embedding_provider
       FROM documents
       WHERE save_id = $1
       ORDER BY is_latest DESC, last_access DESC, created_at DESC
       LIMIT 1`,
      [saveId],
    );

    const existingMeta = await this.db.query<SqlRow>(
      `SELECT is_active, current_fork_id FROM save_metadata WHERE save_id = $1 LIMIT 1`,
      [saveId],
    );

    const isActive = Boolean(existingMeta.rows[0]?.is_active ?? false);
    const currentForkId = Number(
      existingMeta.rows[0]?.current_fork_id ?? forkId,
    );

    const model = modelResult.rows[0]?.embedding_model || this.config.modelId;
    const provider =
      modelResult.rows[0]?.embedding_provider || this.config.provider;

    const now = Date.now();

    await this.db.query(
      `INSERT INTO save_metadata (
         save_id,
         current_fork_id,
         is_active,
         last_updated,
         document_count,
         embedding_model,
         embedding_provider,
         last_accessed
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $4)
       ON CONFLICT (save_id) DO UPDATE SET
         current_fork_id = EXCLUDED.current_fork_id,
         is_active = EXCLUDED.is_active,
         last_updated = EXCLUDED.last_updated,
         document_count = EXCLUDED.document_count,
         embedding_model = EXCLUDED.embedding_model,
         embedding_provider = EXCLUDED.embedding_provider,
         last_accessed = CASE
           WHEN EXCLUDED.is_active THEN EXCLUDED.last_accessed
           ELSE save_metadata.last_accessed
         END`,
      [
        saveId,
        currentForkId,
        isActive,
        now,
        Number(countResult.rows[0]?.count ?? 0),
        model,
        provider,
      ],
    );
  }

  private async refreshAllSaveMetadata(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const saveIdRows = await this.db.query<SqlRow>(
      `SELECT save_id FROM save_metadata
       UNION
       SELECT DISTINCT save_id FROM documents`,
    );

    for (const row of saveIdRows.rows) {
      const saveId = String(row.save_id);
      const meta = await this.db.query<SqlRow>(
        `SELECT current_fork_id FROM save_metadata WHERE save_id = $1 LIMIT 1`,
        [saveId],
      );
      const forkId = Number(meta.rows[0]?.current_fork_id ?? 0);
      await this.refreshSaveMetadata(saveId, forkId);
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

  private rowToDocument(row: SqlRow): RAGDocument {
    return {
      id: String(row.id),
      sourcePath: String(row.source_path),
      canonicalPath: String(row.canonical_path),
      type: row.doc_type as DocumentType,
      contentType: String(row.content_type),
      fileHash: String(row.file_hash),
      chunkIndex: Number(row.chunk_index ?? 0),
      chunkCount: Number(row.chunk_count ?? 1),
      isLatest: Boolean(row.is_latest),
      supersededAtTurn:
        row.superseded_at_turn === null || row.superseded_at_turn === undefined
          ? null
          : Number(row.superseded_at_turn),
      content: String(row.content ?? ""),
      embedding: row.embedding ? this.parseVector(row.embedding) : undefined,
      saveId: String(row.save_id),
      forkId: Number(row.fork_id ?? 0),
      turnNumber: Number(row.turn_number ?? 0),
      embeddingModel: String(row.embedding_model),
      embeddingProvider: String(row.embedding_provider),
      importance: Number(row.importance ?? 0.5),
      createdAt: Number(row.created_at ?? Date.now()),
      lastAccess: Number(row.last_access ?? Date.now()),
      estimatedBytes: Number(row.estimated_bytes ?? 0),
      tags: this.parseTags(
        typeof row.tags === "string" ? row.tags : undefined,
      ),
    };
  }

  private rowToDocumentMeta(row: SqlRow): RAGDocumentMeta {
    return {
      id: String(row.id),
      sourcePath: String(row.source_path),
      canonicalPath: String(row.canonical_path),
      type: row.doc_type as DocumentType,
      contentType: String(row.content_type),
      fileHash: String(row.file_hash),
      chunkIndex: Number(row.chunk_index ?? 0),
      chunkCount: Number(row.chunk_count ?? 1),
      isLatest: Boolean(row.is_latest),
      supersededAtTurn:
        row.superseded_at_turn === null || row.superseded_at_turn === undefined
          ? null
          : Number(row.superseded_at_turn),
      content: String(row.content ?? ""),
      saveId: String(row.save_id),
      forkId: Number(row.fork_id ?? 0),
      turnNumber: Number(row.turn_number ?? 0),
      embeddingModel: String(row.embedding_model),
      embeddingProvider: String(row.embedding_provider),
      importance: Number(row.importance ?? 0.5),
      createdAt: Number(row.created_at ?? Date.now()),
      lastAccess: Number(row.last_access ?? Date.now()),
      estimatedBytes: Number(row.estimated_bytes ?? 0),
      tags: this.parseTags(
        typeof row.tags === "string" ? row.tags : undefined,
      ),
    };
  }

  private parseVector(vectorValue: unknown): Float32Array {
    if (vectorValue instanceof Float32Array) {
      return vectorValue;
    }

    if (Array.isArray(vectorValue)) {
      return new Float32Array(
        vectorValue
          .map((item) => Number(item))
          .filter((item) => Number.isFinite(item)),
      );
    }

    if (typeof vectorValue !== "string") {
      return new Float32Array();
    }

    const nums = vectorValue
      .replace(/[\[\]]/g, "")
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item));
    return new Float32Array(nums);
  }
}
