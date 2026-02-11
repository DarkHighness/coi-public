import { describe, expect, it, vi } from "vitest";
import { RAGDatabase } from "../database";
import { DEFAULT_RAG_CONFIG } from "../types";

describe("RAGDatabase strict fork search", () => {
  it("requires forkId in search options", async () => {
    const db = new RAGDatabase({
      ...DEFAULT_RAG_CONFIG,
      maxStorageBytes: 1024 * 1024,
    }) as any;

    db.db = {
      query: vi.fn(async () => ({ rows: [], affectedRows: 0 })),
    };

    await expect(
      db.searchSimilar(new Float32Array([0.1, 0.2]), "save-1", {
        modelId: "model-a",
        provider: "local_transformers",
      }),
    ).rejects.toThrow("searchSimilar requires forkId");
  });

  it("uses strict forkId even when legacy forkIds are provided", async () => {
    const db = new RAGDatabase({
      ...DEFAULT_RAG_CONFIG,
      maxStorageBytes: 1024 * 1024,
    }) as any;

    const queryMock = vi.fn(async (sql: string) => {
      if (sql.includes("SELECT d.*, 1 - (e.embedding <=>")) {
        return {
          rows: [],
          affectedRows: 0,
        };
      }
      if (sql.includes("UPDATE documents SET last_access")) {
        return {
          rows: [],
          affectedRows: 0,
        };
      }
      return { rows: [], affectedRows: 0 };
    });

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    db.db = { query: queryMock };

    await db.searchSimilar(new Float32Array([0.3, 0.4]), "save-2", {
      forkId: 4,
      forkIds: [1, 2, 3],
      modelId: "model-b",
      provider: "local_transformers",
      threshold: 0.2,
      topK: 5,
    });

    const firstCall = (queryMock.mock.calls[0] || []) as any[];
    const sql = (firstCall[0] || "") as string;
    const params = (firstCall[1] || []) as any[];

    expect(sql).toContain("d.fork_id = $3");
    expect(sql).not.toContain("d.fork_id = ANY");
    expect(params[2]).toBe(4);
    expect(warnSpy).toHaveBeenCalledWith(
      "[RAGDatabase] searchSimilar received legacy forkIds; strict mode uses forkId only",
    );

    warnSpy.mockRestore();
  });
});
