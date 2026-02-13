import { describe, expect, it, vi } from "vitest";
import { RAGDatabase } from "../database";
import { DEFAULT_RAG_CONFIG } from "../types";

describe("RAGDatabase fork-latest visibility", () => {
  it("searches only latest docs in current fork and model space", async () => {
    const db = new RAGDatabase({
      ...DEFAULT_RAG_CONFIG,
      maxStorageBytes: 1024 * 1024,
    }) as any;

    const similarityRow = {
      id: "doc-1",
      source_path: "world/a.txt",
      canonical_path: "forks/7/world/a.txt",
      doc_type: "text",
      content_type: "text/plain",
      file_hash: "hash-a",
      chunk_index: 0,
      chunk_count: 1,
      is_latest: true,
      superseded_at_turn: null,
      content: "alpha",
      save_id: "save-1",
      fork_id: 7,
      turn_number: 12,
      embedding_model: "model-a",
      embedding_provider: "local_transformers",
      importance: 0.5,
      created_at: 10,
      last_access: 11,
      estimated_bytes: 128,
      tags: null,
      similarity: 0.92,
    };

    const queryMock = vi.fn(async (sql: string, params?: any[]) => {
      if (sql.includes("SELECT d.*, 1 - (e.embedding <=>")) {
        return { rows: [similarityRow], affectedRows: 0 };
      }
      return { rows: [], affectedRows: 1 };
    });

    db.db = { query: queryMock };

    const results = await db.searchSimilar(
      new Float32Array([0.1, 0.2]),
      "save-1",
      {
        forkId: 7,
        modelId: "model-a",
        provider: "local_transformers",
        topK: 5,
        threshold: 0.1,
      },
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.document.isLatest).toBe(true);

    const [sql, rawParams] = queryMock.mock.calls[0] || [];
    const params = (rawParams || []) as any[];
    expect(sql).toContain("d.is_latest = TRUE");
    expect(sql).toContain("d.fork_id = $3");
    expect(sql).toContain("d.embedding_model = $4");
    expect(sql).toContain("d.embedding_provider = $5");
    expect(params[1]).toBe("save-1");
    expect(params[2]).toBe(7);
    expect(params[3]).toBe("model-a");
    expect(params[4]).toBe("local_transformers");
  });
});
