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

const createService = () => {
  const service = new RAGService() as any;
  service.isInitialized = true;
  service.port = { postMessage: vi.fn(), start: vi.fn() };
  service.config = {
    ...DEFAULT_RAG_CONFIG,
    provider: "local_transformers",
    local: {
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

describe("RAGService embedding reuse", () => {
  beforeEach(() => {
    embedTextsLocallyMock.mockReset();
  });

  it("reuses matched embeddings and computes only misses", async () => {
    const service = createService();

    service.sendRequest.mockImplementation(async (type: string, payload: any) => {
      if (type === "lookupReusableEmbeddings") {
        expect(payload.items).toHaveLength(2);
        return { embeddings: [[1, 2, 3], null] };
      }
      if (type === "upsertFileChunks") {
        return { count: payload.documents.length };
      }
      throw new Error(`Unexpected request: ${type}`);
    });

    embedTextsLocallyMock.mockResolvedValue([[9, 8, 7]]);

    const result = await service.upsertFileChunks([
      {
        sourcePath: "world/a.txt",
        canonicalPath: "forks/1/world/a.txt",
        type: "text" as const,
        contentType: "text/plain",
        fileHash: "ha",
        chunkIndex: 0,
        chunkCount: 1,
        content: "alpha",
        saveId: "save-1",
        forkId: 1,
        turnNumber: 1,
      },
      {
        sourcePath: "world/b.txt",
        canonicalPath: "forks/1/world/b.txt",
        type: "text" as const,
        contentType: "text/plain",
        fileHash: "hb",
        chunkIndex: 0,
        chunkCount: 1,
        content: "beta",
        saveId: "save-1",
        forkId: 1,
        turnNumber: 1,
      },
    ]);

    expect(result).toEqual({ count: 2 });
    expect(embedTextsLocallyMock).toHaveBeenCalledTimes(1);
    expect(embedTextsLocallyMock).toHaveBeenCalledWith(
      ["beta"],
      expect.objectContaining({ backend: "transformers_js" }),
    );

    const upsertCall = service.sendRequest.mock.calls.find(
      ([type]: [string]) => type === "upsertFileChunks",
    );
    expect(upsertCall).toBeTruthy();
    const upsertPayload = upsertCall?.[1];
    expect(upsertPayload.documents[0].embedding).toEqual([1, 2, 3]);
    expect(upsertPayload.documents[1].embedding).toEqual([9, 8, 7]);
  });


  it("falls back to local embedding when reuse lookup fails", async () => {
    const service = createService();

    service.sendRequest.mockImplementation(async (type: string, payload: any) => {
      if (type === "lookupReusableEmbeddings") {
        throw new Error("lookup unavailable");
      }
      if (type === "upsertFileChunks") {
        return { count: payload.documents.length };
      }
      throw new Error(`Unexpected request: ${type}`);
    });

    embedTextsLocallyMock.mockResolvedValue([[0.11, 0.22]]);

    const result = await service.upsertFileChunks([
      {
        sourcePath: "world/fallback.txt",
        canonicalPath: "forks/2/world/fallback.txt",
        type: "text" as const,
        contentType: "text/plain",
        fileHash: "hf",
        chunkIndex: 0,
        chunkCount: 1,
        content: "fallback",
        saveId: "save-fallback",
        forkId: 2,
        turnNumber: 4,
      },
    ]);

    expect(result).toEqual({ count: 1 });
    expect(embedTextsLocallyMock).toHaveBeenCalledWith(
      ["fallback"],
      expect.objectContaining({ backend: "transformers_js" }),
    );
  });

  it("skips local embedding compute when all chunks are reusable", async () => {
    const service = createService();

    service.sendRequest.mockImplementation(async (type: string, payload: any) => {
      if (type === "lookupReusableEmbeddings") {
        return { embeddings: [[5, 6, 7]] };
      }
      if (type === "upsertFileChunks") {
        return { count: payload.documents.length };
      }
      throw new Error(`Unexpected request: ${type}`);
    });

    const result = await service.upsertFileChunks([
      {
        sourcePath: "world/a.txt",
        canonicalPath: "forks/2/world/a.txt",
        type: "text" as const,
        contentType: "text/plain",
        fileHash: "ha",
        chunkIndex: 0,
        chunkCount: 1,
        content: "alpha",
        saveId: "save-2",
        forkId: 2,
        turnNumber: 10,
      },
    ]);

    expect(result).toEqual({ count: 1 });
    expect(embedTextsLocallyMock).not.toHaveBeenCalled();
  });
});
