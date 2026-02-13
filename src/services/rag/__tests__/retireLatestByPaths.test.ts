import { describe, expect, it, vi } from "vitest";
import { RAGDatabase } from "../database";
import { DEFAULT_RAG_CONFIG } from "../types";

describe("RAGDatabase retireLatestByPaths", () => {
  it("retires latest rows and records superseded turn", async () => {
    const db = new RAGDatabase({
      ...DEFAULT_RAG_CONFIG,
      maxStorageBytes: 1024 * 1024,
    }) as any;

    const queryMock = vi.fn(async (sql: string, params?: any[]) => {
      if (
        sql.includes("UPDATE documents") &&
        sql.includes("superseded_at_turn")
      ) {
        return { rows: [], affectedRows: 3 };
      }

      if (
        sql.includes(
          "SELECT COUNT(*)::int AS count FROM documents WHERE save_id = $1",
        )
      ) {
        return { rows: [{ count: 3 }], affectedRows: 0 };
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
          rows: [{ is_active: true, current_fork_id: 2 }],
          affectedRows: 0,
        };
      }

      if (sql.includes("INSERT INTO save_metadata")) {
        return { rows: [], affectedRows: 1 };
      }

      return { rows: [], affectedRows: 0 };
    });

    db.db = { query: queryMock };

    const retired = await db.retireLatestByPaths("save-1", 2, 99, [
      "current/world/a.txt",
      "current/world/b.txt",
      "current/world/a.txt",
    ]);

    expect(retired).toBe(3);

    const updateCall = queryMock.mock.calls.find(
      ([sql]: [string]) =>
        sql.includes("UPDATE documents") && sql.includes("superseded_at_turn"),
    );
    expect(updateCall).toBeDefined();

    const params = (updateCall?.[1] || []) as any[];
    expect(params[0]).toBe("save-1");
    expect(params[1]).toBe(2);
    expect(params[2]).toBe(99);
    expect(params[3]).toEqual(["current/world/a.txt", "current/world/b.txt"]);
  });
});
