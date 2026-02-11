import { describe, expect, it, vi } from "vitest";
import { RAGDatabase } from "../database";
import { DEFAULT_RAG_CONFIG } from "../types";

describe("RAGDatabase model mismatch scope", () => {
  it("checks mismatch only within current save + fork latest", async () => {
    const db = new RAGDatabase({
      ...DEFAULT_RAG_CONFIG,
      maxStorageBytes: 1024 * 1024,
    }) as any;

    const queryMock = vi.fn(async (sql: string, params?: any[]) => {
      if (sql.includes("SELECT embedding_model, embedding_provider")) {
        return { rows: [], affectedRows: 0 };
      }
      return { rows: [], affectedRows: 0 };
    });

    db.db = { query: queryMock };

    const mismatch = await db.checkModelMismatch(
      "save-1",
      9,
      "model-a",
      "local_transformers",
    );

    expect(mismatch).toBeNull();

    const [sql, rawParams] = queryMock.mock.calls[0] || [];
    const params = (rawParams || []) as any[];
    expect(sql).toContain("fork_id = $2");
    expect(sql).toContain("is_latest = TRUE");
    expect(params).toEqual(["save-1", 9, "model-a", "local_transformers"]);
  });

  it("returns mismatch payload when scoped rows conflict", async () => {
    const db = new RAGDatabase({
      ...DEFAULT_RAG_CONFIG,
      maxStorageBytes: 1024 * 1024,
    }) as any;

    db.db = {
      query: vi.fn(async () => ({
        rows: [
          {
            embedding_model: "old-model",
            embedding_provider: "local_transformers",
            count: 4,
          },
        ],
        affectedRows: 0,
      })),
    };

    const mismatch = await db.checkModelMismatch(
      "save-2",
      3,
      "new-model",
      "local_transformers",
    );

    expect(mismatch).toEqual({
      currentModel: "new-model",
      currentProvider: "local_transformers",
      storedModel: "old-model",
      storedProvider: "local_transformers",
      documentCount: 4,
    });
  });
});
