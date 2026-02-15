import { describe, expect, it, vi } from "vitest";
import { RAGDatabase } from "../database";
import { DEFAULT_RAG_CONFIG } from "../types";

describe("RAGDatabase schema compatibility", () => {
  it("drops schema tables with CASCADE during full reset", async () => {
    const db = new RAGDatabase({
      ...DEFAULT_RAG_CONFIG,
      maxStorageBytes: 1024 * 1024,
      schemaVersion: 5,
    }) as any;

    const exec = vi.fn(async () => undefined);
    db.db = { exec };

    await db.resetSchema();

    expect(exec).toHaveBeenCalledTimes(1);
    expect(exec).toHaveBeenCalledWith(
      expect.stringContaining("DROP TABLE IF EXISTS documents CASCADE"),
    );
    expect(exec).toHaveBeenCalledWith(
      expect.stringContaining("DROP TABLE IF EXISTS embeddings CASCADE"),
    );
  });

  it("rebuilds schema when bootstrap schema exec fails on missing column", async () => {
    const db = new RAGDatabase({
      ...DEFAULT_RAG_CONFIG,
      maxStorageBytes: 1024 * 1024,
      schemaVersion: 5,
    }) as any;

    const exec = vi
      .fn()
      .mockRejectedValueOnce(new Error('column "source_path" does not exist'))
      .mockResolvedValue(undefined);
    const query = vi.fn(async () => ({ rows: [], affectedRows: 0 }));
    const rebuildSchema = vi.spyOn(db, "rebuildSchema").mockResolvedValue(undefined);

    db.db = { exec, query };

    await db.applySchemaWithCompatibilityRecovery();

    expect(rebuildSchema).toHaveBeenCalledTimes(1);
    expect(rebuildSchema).toHaveBeenCalledWith(
      expect.stringContaining("legacy schema"),
    );
  });

  it("keeps schema when required document columns exist", async () => {
    const db = new RAGDatabase({
      ...DEFAULT_RAG_CONFIG,
      maxStorageBytes: 1024 * 1024,
    }) as any;

    const query = vi.fn(async () => ({ rows: [], affectedRows: 0 }));
    const exec = vi.fn(async () => undefined);
    db.db = { query, exec };

    await db.ensureDocumentColumns();

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("SELECT source_path"),
    );
    expect(exec).not.toHaveBeenCalled();
  });

  it("rebuilds schema when legacy documents table misses source_path", async () => {
    const db = new RAGDatabase({
      ...DEFAULT_RAG_CONFIG,
      maxStorageBytes: 1024 * 1024,
      schemaVersion: 5,
    }) as any;

    const query = vi.fn(async (sql: string) => {
      if (sql.includes("SELECT source_path")) {
        throw new Error('column "source_path" does not exist');
      }
      return { rows: [], affectedRows: 0 };
    });
    const exec = vi.fn(async () => undefined);
    const resetSchema = vi
      .spyOn(db, "resetSchema")
      .mockResolvedValue(undefined);

    db.db = { query, exec };

    await db.ensureDocumentColumns();

    expect(resetSchema).toHaveBeenCalledTimes(1);
    expect(exec).toHaveBeenCalledTimes(1);
    expect(exec).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS documents"),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO rag_meta"),
      ["5"],
    );
  });
});
