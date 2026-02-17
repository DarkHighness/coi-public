import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  EMBEDDING_MODELS,
  EmbeddingProvider,
  type EmbeddingCredentials,
} from "./embeddingProvider";

const normalizeVec = (vec: Float32Array) =>
  Array.from(vec).map((v) => Number(v.toFixed(3)));

const createProvider = (
  provider: "gemini" | "openai" | "openrouter" | "claude",
  credentials: EmbeddingCredentials,
) =>
  new EmbeddingProvider(
    {
      dbName: "test",
      schemaVersion: 5,
      maxDocumentsPerSave: 100,
      maxTotalStorageDocuments: 1000,
      maxStorageBytes: 10 * 1024 * 1024,
      currentForkBonus: 0.5,
      ancestorForkBonus: 0.2,
      turnDecayFactor: 0.01,
      dimensions: 3,
      provider,
      modelId:
        provider === "openrouter" ? "openai/text-embedding-3-small" : "model-a",
    },
    credentials,
  );

describe("EmbeddingProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes embedding model catalogs", () => {
    expect(EMBEDDING_MODELS.gemini.length).toBeGreaterThan(0);
    expect(
      EMBEDDING_MODELS.openai.some((m) => m.id === "text-embedding-3-small"),
    ).toBe(true);
    expect(
      EMBEDDING_MODELS.openrouter.some((m) => m.id.includes("embed")),
    ).toBe(true);
  });

  it("generates gemini embeddings and maps retrieval query task type", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        embeddings: [{ values: [0.1, 0.2, 0.3] }],
      }),
    }));
    vi.stubGlobal("fetch", fetchMock as any);

    const provider = createProvider("gemini", { gemini: { apiKey: "g-key" } });
    const result = await provider.embedQuery("where is harbor");

    expect(normalizeVec(result)).toEqual([0.1, 0.2, 0.3]);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("batchEmbedContents?key=g-key"),
      expect.objectContaining({ method: "POST" }),
    );

    const firstCall = (
      fetchMock.mock.calls as unknown as Array<
        [unknown, RequestInit | undefined]
      >
    )[0];
    expect(firstCall).toBeDefined();
    const requestInit = firstCall?.[1] ?? {};
    const body = JSON.parse((requestInit.body as string) || "{}");
    expect(body.requests[0].taskType).toBe("RETRIEVAL_QUERY");
  });

  it("throws when gemini api key is missing", async () => {
    const provider = createProvider("gemini", {});

    await expect(provider.embedBatch(["x"])).rejects.toThrow(
      "Gemini API key not configured",
    );
  });

  it("generates openai embeddings, sorts by index, and maps usage", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: [
          { index: 1, embedding: [0.4, 0.5, 0.6] },
          { index: 0, embedding: [0.1, 0.2, 0.3] },
        ],
        usage: {
          prompt_tokens: 9,
          total_tokens: 12,
        },
      }),
    }));
    vi.stubGlobal("fetch", fetchMock as any);

    const provider = createProvider("openai", {
      openai: { apiKey: "o-key", baseUrl: "https://openai.local/v1" },
    });

    const result = await provider.embedBatch(["a", "b"], "classification");

    expect(result.embeddings.map((v) => normalizeVec(v))).toEqual([
      [0.1, 0.2, 0.3],
      [0.4, 0.5, 0.6],
    ]);
    expect(result.usage).toEqual({ promptTokens: 9, totalTokens: 12 });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://openai.local/v1/embeddings",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("generates openrouter embeddings and uses default referer when location is unavailable", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: [{ index: 0, embedding: [0.9, 0.8, 0.7] }],
        usage: { prompt_tokens: 2, total_tokens: 4 },
      }),
    }));
    vi.stubGlobal("fetch", fetchMock as any);

    const provider = createProvider("openrouter", {
      openrouter: { apiKey: "r-key" },
    });

    const result = await provider.embedBatch(["hello"], "semantic_similarity");

    expect(result.usage).toEqual({ promptTokens: 2, totalTokens: 4 });
    expect(result.embeddings).toHaveLength(1);

    const firstCall = (
      fetchMock.mock.calls as unknown as Array<
        [unknown, RequestInit | undefined]
      >
    )[0];
    expect(firstCall).toBeDefined();
    const requestInit = firstCall?.[1] ?? {};
    const headers = (requestInit.headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer r-key");
    expect(headers["HTTP-Referer"]).toBe("https://coi.game");
  });

  it("retries once for rate-limit style errors", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        statusText: "Too Many Requests",
        json: async () => ({ error: { message: "429 rate limit" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ index: 0, embedding: [1, 2, 3] }],
        }),
      });

    vi.stubGlobal("fetch", fetchMock as any);

    const provider = createProvider("openai", {
      openai: { apiKey: "retry-key" },
    });

    const promise = provider.embedBatch(["retry-me"]);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.embeddings.map((v) => normalizeVec(v))).toEqual([[1, 2, 3]]);

    vi.useRealTimers();
  });

  it("does not retry non-rate-limit errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      statusText: "Bad Request",
      json: async () => ({ error: { message: "invalid input" } }),
    });

    vi.stubGlobal("fetch", fetchMock as any);

    const provider = createProvider("openai", {
      openai: { apiKey: "bad-key" },
    });

    await expect(provider.embedBatch(["bad"])).rejects.toThrow(
      "OpenAI embedding failed: invalid input",
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws for unknown provider", async () => {
    const provider = createProvider("claude", {
      openai: { apiKey: "x" },
    });

    await expect(provider.embedBatch(["x"])).rejects.toThrow(
      "Unknown embedding provider: claude",
    );
  });

  it("supports updateConfig and embed helper", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: [{ index: 0, embedding: [0.2, 0.4, 0.6] }],
      }),
    }));

    vi.stubGlobal("fetch", fetchMock as any);

    const provider = createProvider("openai", {
      openai: { apiKey: "o-2" },
    });

    provider.updateConfig({ dimensions: 9, modelId: "text-embedding-3-small" });
    const vec = await provider.embed("single", "clustering");

    expect(normalizeVec(vec)).toEqual([0.2, 0.4, 0.6]);
    const firstCall = (
      fetchMock.mock.calls as unknown as Array<
        [unknown, RequestInit | undefined]
      >
    )[0];
    expect(firstCall).toBeDefined();
    const requestInit = firstCall?.[1] ?? {};
    const body = JSON.parse((requestInit.body as string) || "{}");
    expect(body.dimensions).toBe(9);
    expect(body.model).toBe("text-embedding-3-small");
  });
});
