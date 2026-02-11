import { describe, expect, it, vi } from "vitest";
import { RAGDatabase } from "../database";
import { DEFAULT_RAG_CONFIG } from "../types";

describe("RAGDatabase lookupReusableEmbeddings batching", () => {
  it("uses one batched query and preserves item order", async () => {
    const db = new RAGDatabase({
      ...DEFAULT_RAG_CONFIG,
      maxStorageBytes: 1024 * 1024,
    }) as any;

    const queryMock = vi.fn(async (_sql: string, _params?: any[]) => ({
      rows: [
        { idx: 0, embedding: null },
        { idx: 1, embedding: "[0.1,0.2,0.3]" },
      ],
      affectedRows: 0,
    }));

    db.db = { query: queryMock };

    const result = await db.lookupReusableEmbeddings(
      [
        {
          saveId: "save-1",
          sourcePath: "world/a.txt",
          fileHash: "ha",
          chunkIndex: 0,
        },
        {
          saveId: "save-1",
          sourcePath: "world/b.txt",
          fileHash: "hb",
          chunkIndex: 1,
        },
      ],
      "model-a",
      "local_transformers",
    );

    expect(queryMock).toHaveBeenCalledTimes(1);

    const [sql, rawParams] = queryMock.mock.calls[0] || [];
    const params = (rawParams || []) as any[];
    expect(sql).toContain("WITH req");
    expect(sql).toContain("LEFT JOIN LATERAL");
    expect(sql).toContain("ORDER BY req.idx ASC");
    expect(params).toEqual([
      0,
      "save-1",
      "world/a.txt",
      "ha",
      0,
      1,
      "save-1",
      "world/b.txt",
      "hb",
      1,
      "model-a",
      "local_transformers",
    ]);

    expect(result[0]).toBeNull();
    expect(result[1]?.[0]).toBeCloseTo(0.1);
    expect(result[1]?.[1]).toBeCloseTo(0.2);
    expect(result[1]?.[2]).toBeCloseTo(0.3);
  });
});
