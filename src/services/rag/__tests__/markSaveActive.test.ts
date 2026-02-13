import { describe, expect, it, vi } from "vitest";
import { RAGDatabase } from "../database";
import { DEFAULT_RAG_CONFIG } from "../types";

describe("RAGDatabase markSaveActive", () => {
  it("activates only target save and updates current fork", async () => {
    const db = new RAGDatabase({
      ...DEFAULT_RAG_CONFIG,
      maxStorageBytes: 1024 * 1024,
    }) as any;

    const queryMock = vi.fn(async (sql: string, _params?: any[]) => {
      if (
        sql.includes(
          "SELECT COUNT(*)::int AS count FROM documents WHERE save_id = $1",
        )
      ) {
        return { rows: [{ count: 8 }], affectedRows: 0 };
      }

      if (sql.includes("SELECT embedding_model, embedding_provider")) {
        return {
          rows: [
            {
              embedding_model: "Xenova/all-MiniLM-L6-v2",
              embedding_provider: "local_transformers",
            },
          ],
          affectedRows: 0,
        };
      }

      if (
        sql.includes("SELECT is_active, current_fork_id FROM save_metadata")
      ) {
        return {
          rows: [{ is_active: true, current_fork_id: 3 }],
          affectedRows: 0,
        };
      }

      if (
        sql.includes(
          "SELECT is_active, current_fork_id FROM save_metadata WHERE save_id = $1 LIMIT 1",
        )
      ) {
        return {
          rows: [{ is_active: true, current_fork_id: 3 }],
          affectedRows: 0,
        };
      }

      if (sql.includes("INSERT INTO save_metadata")) {
        return { rows: [], affectedRows: 1 };
      }

      if (
        sql.includes("UPDATE save_metadata") &&
        sql.includes(
          "SET is_active = CASE WHEN save_id = $1 THEN TRUE ELSE FALSE END",
        )
      ) {
        return { rows: [], affectedRows: 2 };
      }

      return { rows: [], affectedRows: 0 };
    });

    db.db = { query: queryMock };

    await db.markSaveActive("save-b", 3);

    const updateCall = queryMock.mock.calls.find(([sql]) =>
      sql.includes(
        "SET is_active = CASE WHEN save_id = $1 THEN TRUE ELSE FALSE END",
      ),
    );
    expect(updateCall).toBeDefined();

    const params = updateCall ? ((updateCall[1] || []) as any[]) : [];
    expect(params[0]).toBe("save-b");
    expect(params[1]).toBe(3);
    expect(typeof params[2]).toBe("number");

    const firstInsertIndex = queryMock.mock.calls.findIndex(([sql]) =>
      sql.includes("INSERT INTO save_metadata"),
    );
    const updateIndex = queryMock.mock.calls.findIndex(([sql]) =>
      sql.includes(
        "SET is_active = CASE WHEN save_id = $1 THEN TRUE ELSE FALSE END",
      ),
    );
    expect(firstInsertIndex).toBeGreaterThanOrEqual(0);
    expect(updateIndex).toBeGreaterThan(firstInsertIndex);
  });
});
