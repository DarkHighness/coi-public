import { beforeEach, describe, expect, it, vi } from "vitest";
import { RAGService } from "../service";
import { embedTextsLocally } from "../localEmbedding";
import { DEFAULT_RAG_CONFIG } from "../types";

vi.mock("../localEmbedding", () => ({
  embedTextsLocally: vi.fn(),
  embedTextsWithTfjs: vi.fn(),
  getTfjsEmbeddingEngine: vi.fn(),
  resetTfjsEmbeddingEngine: vi.fn(),
  embedTextsWithTransformers: vi.fn(),
  getTransformersEmbeddingEngine: vi.fn(),
  resetTransformersEmbeddingEngine: vi.fn(),
  resetLocalEmbeddingEngines: vi.fn(),
}));

const embedTextsLocallyMock = vi.mocked(embedTextsLocally);

const createService = (
  provider: "local_transformers" | "local_tfjs" | "gemini" =
    "local_transformers",
) => {
  const service = new RAGService() as any;
  service.isInitialized = true;
  service.port = { postMessage: vi.fn(), start: vi.fn() };
  service.config = {
    ...DEFAULT_RAG_CONFIG,
    provider,
    local:
      provider === "local_tfjs"
        ? {
            backend: "tfjs",
            model: "use-lite-512",
            backendOrder: ["cpu"],
            batchSize: 4,
          }
        : {
            backend: "transformers_js",
            transformersModel: "Xenova/all-MiniLM-L6-v2",
            deviceOrder: ["cpu"],
            batchSize: 4,
            quantized: true,
          },
  };
  service.sendRequest = vi.fn();
  return service;
};

describe("RAGService local embedding runtime", () => {
  beforeEach(() => {
    embedTextsLocallyMock.mockReset();
  });

  it("uses precomputed queryEmbedding for search in local_transformers runtime", async () => {
    const service = createService("local_transformers");
    const expectedResults = [{ score: 0.9 }];

    embedTextsLocallyMock.mockResolvedValue([[0.1, 0.2, 0.3]]);
    service.sendRequest.mockResolvedValue(expectedResults);

    const result = await service.search("find hidden truth", { topK: 5 });

    expect(result).toBe(expectedResults);
    expect(embedTextsLocallyMock).toHaveBeenCalledWith(
      ["find hidden truth"],
      expect.objectContaining({
        backend: "transformers_js",
        transformersModel: "Xenova/all-MiniLM-L6-v2",
      }),
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

  it("precomputes only missing chunk embeddings before upsert in local_tfjs runtime", async () => {
    const service = createService("local_tfjs");
    service.sendRequest.mockResolvedValue({ count: 2 });

    embedTextsLocallyMock.mockResolvedValue([[0.33, 0.44]]);

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

    expect(embedTextsLocallyMock).toHaveBeenCalledTimes(1);
    expect(embedTextsLocallyMock).toHaveBeenCalledWith(
      ["alpha"],
      expect.objectContaining({ backend: "tfjs", model: "use-lite-512" }),
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

    expect(embedTextsLocallyMock).not.toHaveBeenCalled();
    expect(service.sendRequest).toHaveBeenCalledWith("search", {
      query: "query",
      options: { threshold: 0.5 },
    });
  });
});
