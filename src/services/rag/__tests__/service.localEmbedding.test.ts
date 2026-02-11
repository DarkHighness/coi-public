import { beforeEach, describe, expect, it, vi } from "vitest";
import { RAGService } from "../service";
import { embedTextsWithTfjs } from "../localEmbedding";
import { DEFAULT_RAG_CONFIG } from "../types";

vi.mock("../localEmbedding", () => ({
  embedTextsWithTfjs: vi.fn(),
  getTfjsEmbeddingEngine: vi.fn(),
  resetTfjsEmbeddingEngine: vi.fn(),
}));

const embedTextsWithTfjsMock = vi.mocked(embedTextsWithTfjs);

const createService = (provider: "local_tfjs" | "gemini" = "local_tfjs") => {
  const service = new RAGService() as any;
  service.isInitialized = true;
  service.port = { postMessage: vi.fn(), start: vi.fn() };
  service.config = {
    ...DEFAULT_RAG_CONFIG,
    provider,
    local: {
      model: "use-lite-512",
      backendOrder: ["cpu"],
      batchSize: 4,
    },
  };
  service.sendRequest = vi.fn();
  return service;
};

describe("RAGService local TFJS runtime", () => {
  beforeEach(() => {
    embedTextsWithTfjsMock.mockReset();
  });

  it("uses precomputed queryEmbedding for search in local_tfjs runtime", async () => {
    const service = createService("local_tfjs");
    const expectedResults = [{ score: 0.9 }];

    embedTextsWithTfjsMock.mockResolvedValue([[0.1, 0.2, 0.3]]);
    service.sendRequest.mockResolvedValue(expectedResults);

    const result = await service.search("find hidden truth", { topK: 5 });

    expect(result).toBe(expectedResults);
    expect(embedTextsWithTfjsMock).toHaveBeenCalledWith(
      ["find hidden truth"],
      expect.objectContaining({ model: "use-lite-512" }),
    );

    expect(service.sendRequest).toHaveBeenCalledTimes(1);
    const [requestType, payload] = service.sendRequest.mock.calls[0];
    expect(requestType).toBe("search");
    expect(payload.query).toBe("");
    expect(payload.options).toEqual({ topK: 5 });
    expect(payload.queryEmbedding).toBeInstanceOf(Float32Array);
    const queryVector = Array.from(payload.queryEmbedding);
    expect(queryVector[0]).toBeCloseTo(0.1);
    expect(queryVector[1]).toBeCloseTo(0.2);
    expect(queryVector[2]).toBeCloseTo(0.3);
  });

  it("precomputes only missing chunk embeddings before upsert", async () => {
    const service = createService("local_tfjs");
    service.sendRequest.mockResolvedValue({ count: 2 });

    embedTextsWithTfjsMock.mockResolvedValue([[0.33, 0.44]]);

    const docs = [
      {
        sourcePath: "current/world/a.txt",
        canonicalPath: "forks/1/story/world/a.txt",
        type: "text" as const,
        contentType: "text/plain",
        fileHash: "h1",
        chunkIndex: 0,
        chunkCount: 1,
        content: "alpha",
        saveId: "save-1",
        forkId: 1,
        turnNumber: 10,
      },
      {
        sourcePath: "current/world/b.txt",
        canonicalPath: "forks/1/story/world/b.txt",
        type: "text" as const,
        contentType: "text/plain",
        fileHash: "h2",
        chunkIndex: 0,
        chunkCount: 1,
        content: "beta",
        saveId: "save-1",
        forkId: 1,
        turnNumber: 10,
        embedding: [9, 9],
      },
    ];

    await service.upsertFileChunks(docs);

    expect(embedTextsWithTfjsMock).toHaveBeenCalledTimes(1);
    expect(embedTextsWithTfjsMock).toHaveBeenCalledWith(
      ["alpha"],
      expect.objectContaining({ model: "use-lite-512" }),
    );

    const [requestType, payload] = service.sendRequest.mock.calls[0];
    expect(requestType).toBe("upsertFileChunks");
    expect(payload.documents).toHaveLength(2);
    expect(payload.documents[0].embedding).toEqual([0.33, 0.44]);
    expect(payload.documents[1].embedding).toEqual([9, 9]);
  });

  it("keeps remote runtime search path unchanged", async () => {
    const service = createService("gemini");
    service.sendRequest.mockResolvedValue([]);

    await service.search("query", { threshold: 0.5 });

    expect(embedTextsWithTfjsMock).not.toHaveBeenCalled();
    expect(service.sendRequest).toHaveBeenCalledWith("search", {
      query: "query",
      options: { threshold: 0.5 },
    });
  });
});
