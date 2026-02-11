import { describe, expect, it, vi } from "vitest";
import { RAGDatabase } from "../database";
import { DEFAULT_RAG_CONFIG } from "../types";

describe("RAGDatabase tiered eviction order", () => {
  it("evicts in order: inactive -> active other fork -> current fork history", async () => {
    const db = new RAGDatabase({
      ...DEFAULT_RAG_CONFIG,
      maxStorageBytes: 700,
    }) as any;

    const deleteCalls: string[][] = [];

    const queryMock = vi.fn(async (sql: string, params?: any[]) => {
      if (sql.includes("protected_bytes") && sql.includes("tier_a_bytes")) {
        return {
          rows: [
            {
              protected_bytes: 600,
              tier_a_bytes: 200,
              tier_b_bytes: 200,
              tier_c_bytes: 300,
              total_bytes: 1300,
            },
          ],
          affectedRows: 0,
        };
      }

      if (sql.includes("WHERE COALESCE(sm.is_active, FALSE) = FALSE")) {
        return {
          rows: [
            { id: "c1", estimated_bytes: 150 },
            { id: "c2", estimated_bytes: 150 },
          ],
          affectedRows: 0,
        };
      }

      if (
        sql.includes(
          "WHERE COALESCE(sm.is_active, FALSE) = TRUE AND d.fork_id <> COALESCE(sm.current_fork_id, 0)",
        )
      ) {
        return {
          rows: [{ id: "b1", estimated_bytes: 200 }],
          affectedRows: 0,
        };
      }

      if (
        sql.includes(
          "WHERE COALESCE(sm.is_active, FALSE) = TRUE AND d.fork_id = COALESCE(sm.current_fork_id, 0) AND d.is_latest = FALSE",
        )
      ) {
        return {
          rows: [{ id: "a1", estimated_bytes: 200 }],
          affectedRows: 0,
        };
      }

      if (sql.includes("DELETE FROM documents WHERE id = ANY($1)")) {
        const ids = (params?.[0] || []) as string[];
        deleteCalls.push(ids);
        return {
          rows: [],
          affectedRows: ids.length,
        };
      }

      if (sql.includes("SELECT save_id FROM save_metadata") && sql.includes("UNION")) {
        return { rows: [], affectedRows: 0 };
      }

      return { rows: [], affectedRows: 0 };
    });

    db.db = { query: queryMock };

    const deleted = await db.enforceStorageLimits();

    expect(deleted).toBe(4);
    expect(deleteCalls).toEqual([["c1", "c2"], ["b1"], ["a1"]]);
    expect(deleteCalls.flat().some((id) => id.startsWith("p"))).toBe(false);
  });
});
