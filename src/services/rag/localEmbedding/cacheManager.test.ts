import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearTransformersCache,
  getTransformersCacheSummary,
  removeModelFromTransformersCache,
} from "./cacheManager";

describe("cacheManager", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("aggregates transformers cache usage by model id", async () => {
    const requests = [
      new Request(
        "https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/model.onnx",
      ),
      new Request(
        "https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/tokenizer.json",
      ),
      new Request(
        "https://huggingface.co/Xenova/all-mpnet-base-v2/resolve/main/model.onnx",
      ),
    ];

    const responseByUrl = new Map<string, Response>([
      [requests[0].url, new Response(new Uint8Array(10), { status: 200 })],
      [requests[1].url, new Response(new Uint8Array(20), { status: 200 })],
      [requests[2].url, new Response(new Uint8Array(30), { status: 200 })],
    ]);

    const cache = {
      keys: vi.fn(async () => requests),
      match: vi.fn(async (request: Request) => responseByUrl.get(request.url)),
      delete: vi.fn(async () => true),
    };

    vi.stubGlobal("caches", {
      open: vi.fn(async () => cache),
      delete: vi.fn(async () => true),
    });

    const summary = await getTransformersCacheSummary();

    expect(summary.available).toBe(true);
    expect(summary.totalEntries).toBe(3);
    expect(summary.totalBytes).toBe(60);
    expect(summary.models[0]).toMatchObject({
      modelId: "Xenova/all-MiniLM-L6-v2",
      fileCount: 2,
      totalBytes: 30,
    });
    expect(summary.models[1]).toMatchObject({
      modelId: "Xenova/all-mpnet-base-v2",
      fileCount: 1,
      totalBytes: 30,
    });
  });

  it("removes cache entries for a specific model", async () => {
    const requests = [
      new Request(
        "https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/model.onnx",
      ),
      new Request(
        "https://huggingface.co/Xenova/all-mpnet-base-v2/resolve/main/model.onnx",
      ),
    ];

    const cache = {
      keys: vi.fn(async () => requests),
      match: vi.fn(async () => null),
      delete: vi.fn(async () => true),
    };

    vi.stubGlobal("caches", {
      open: vi.fn(async () => cache),
      delete: vi.fn(async () => true),
    });

    const result = await removeModelFromTransformersCache(
      "Xenova/all-MiniLM-L6-v2",
    );

    expect(result.deleted).toBe(1);
    expect(cache.delete).toHaveBeenCalledTimes(1);
    expect(cache.delete).toHaveBeenCalledWith(requests[0]);
  });

  it("clears full transformers cache namespace", async () => {
    const deleteMock = vi.fn(async () => true);
    vi.stubGlobal("caches", {
      open: vi.fn(async () => ({
        keys: vi.fn(async () => []),
        match: vi.fn(async () => null),
        delete: vi.fn(async () => true),
      })),
      delete: deleteMock,
    });

    const cleared = await clearTransformersCache();

    expect(cleared).toBe(true);
    expect(deleteMock).toHaveBeenCalledWith("transformers-cache");
  });
});

