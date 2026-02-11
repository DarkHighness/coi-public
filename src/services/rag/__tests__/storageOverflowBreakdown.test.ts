import { describe, expect, it, vi } from "vitest";
import { RAGDatabase } from "../database";
import { DEFAULT_RAG_CONFIG } from "../types";

describe("RAGDatabase storage overflow breakdown", () => {
  it("reports protected overflow with tier bytes", async () => {
    const db = new RAGDatabase({
      ...DEFAULT_RAG_CONFIG,
      maxStorageBytes: 700,
    }) as any;

    const queryMock = vi.fn(async (sql: string) => {
      if (sql.includes("protected_bytes") && sql.includes("tier_a_bytes")) {
        return {
          rows: [
            {
              protected_bytes: 820,
              tier_a_bytes: 60,
              tier_b_bytes: 40,
              tier_c_bytes: 30,
              total_bytes: 950,
            },
          ],
          affectedRows: 0,
        };
      }

      if (sql.includes("FROM save_metadata sm")) {
        return {
          rows: [
            {
              save_id: "active-save",
              document_count: 20,
              last_accessed: 100,
              is_active: true,
            },
            {
              save_id: "inactive-save",
              document_count: 10,
              last_accessed: 10,
              is_active: false,
            },
          ],
          affectedRows: 0,
        };
      }

      return { rows: [], affectedRows: 0 };
    });

    db.db = { query: queryMock };

    const overflow = await db.checkStorageOverflow();
    expect(overflow).not.toBeNull();
    expect(overflow?.protectedOverflow).toBe(true);
    expect(overflow?.protectedBytes).toBe(820);
    expect(overflow?.currentForkHistoryBytes).toBe(60);
    expect(overflow?.activeOtherForkBytes).toBe(40);
    expect(overflow?.inactiveGameBytes).toBe(30);
    expect(overflow?.storageLimitBytes).toBe(700);
    expect(overflow?.suggestedDeletions).toEqual(["inactive-save"]);
  });

  it("does not evict when only protected tier exceeds limit", async () => {
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
              protected_bytes: 900,
              tier_a_bytes: 0,
              tier_b_bytes: 0,
              tier_c_bytes: 0,
              total_bytes: 900,
            },
          ],
          affectedRows: 0,
        };
      }

      if (sql.includes("DELETE FROM documents WHERE id = ANY($1)")) {
        const ids = (params?.[0] || []) as string[];
        deleteCalls.push(ids);
        return { rows: [], affectedRows: ids.length };
      }

      return { rows: [], affectedRows: 0 };
    });

    db.db = { query: queryMock };

    const deleted = await db.enforceStorageLimits();
    expect(deleted).toBe(0);
    expect(deleteCalls).toEqual([]);

    const status = await db.getStorageStatusBreakdown();
    expect(status.protectedOverflow).toBe(true);
    expect(status.protectedBytes).toBe(900);
    expect(status.storageLimitBytes).toBe(700);
  });
});
