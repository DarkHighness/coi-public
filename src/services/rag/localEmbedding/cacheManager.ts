const TRANSFORMERS_CACHE_KEY = "transformers-cache";

export interface LocalModelCacheStat {
  modelId: string;
  fileCount: number;
  totalBytes: number;
}

export interface TransformersCacheSummary {
  available: boolean;
  totalEntries: number;
  totalBytes: number;
  models: LocalModelCacheStat[];
}

const MODEL_URL_PATTERN =
  /https?:\/\/huggingface\.co\/([^/]+\/[^/]+)\/resolve\//i;

const extractModelIdFromUrl = (url: string): string | null => {
  const match = url.match(MODEL_URL_PATTERN);
  if (!match?.[1]) {
    return null;
  }
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
};

const readResponseSize = async (response: Response): Promise<number> => {
  const contentLength = response.headers.get("content-length");
  if (contentLength) {
    const parsed = Number.parseInt(contentLength, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  try {
    const buffer = await response.clone().arrayBuffer();
    return buffer.byteLength;
  } catch {
    return 0;
  }
};

const emptySummary = (available: boolean): TransformersCacheSummary => ({
  available,
  totalEntries: 0,
  totalBytes: 0,
  models: [],
});

export const getTransformersCacheSummary =
  async (): Promise<TransformersCacheSummary> => {
    if (typeof caches === "undefined") {
      return emptySummary(false);
    }

    try {
      const cache = await caches.open(TRANSFORMERS_CACHE_KEY);
      const requests = await cache.keys();
      const modelStats = new Map<string, LocalModelCacheStat>();
      let totalEntries = 0;
      let totalBytes = 0;

      for (const request of requests) {
        const modelId = extractModelIdFromUrl(request.url);
        if (!modelId) {
          continue;
        }

        const response = await cache.match(request);
        const bytes = response ? await readResponseSize(response) : 0;
        totalEntries += 1;
        totalBytes += bytes;

        const current = modelStats.get(modelId);
        if (current) {
          current.fileCount += 1;
          current.totalBytes += bytes;
        } else {
          modelStats.set(modelId, {
            modelId,
            fileCount: 1,
            totalBytes: bytes,
          });
        }
      }

      return {
        available: true,
        totalEntries,
        totalBytes,
        models: Array.from(modelStats.values()).sort(
          (a, b) => b.totalBytes - a.totalBytes,
        ),
      };
    } catch (error) {
      console.warn(
        "[LocalEmbedding] Failed to inspect transformers cache:",
        error,
      );
      return emptySummary(true);
    }
  };

export const removeModelFromTransformersCache = async (
  modelId: string,
): Promise<{ deleted: number }> => {
  if (typeof caches === "undefined") {
    return { deleted: 0 };
  }

  const trimmed = modelId.trim();
  if (!trimmed) {
    return { deleted: 0 };
  }

  const patterns = [
    `/${trimmed}/resolve/`,
    `/${encodeURIComponent(trimmed)}/resolve/`,
  ];

  try {
    const cache = await caches.open(TRANSFORMERS_CACHE_KEY);
    const requests = await cache.keys();
    let deleted = 0;

    for (const request of requests) {
      const matches = patterns.some((pattern) => request.url.includes(pattern));
      if (!matches) {
        continue;
      }
      const ok = await cache.delete(request);
      if (ok) {
        deleted += 1;
      }
    }

    return { deleted };
  } catch (error) {
    console.warn("[LocalEmbedding] Failed to remove model cache:", error);
    return { deleted: 0 };
  }
};

export const clearTransformersCache = async (): Promise<boolean> => {
  if (typeof caches === "undefined") {
    return false;
  }

  try {
    return await caches.delete(TRANSFORMERS_CACHE_KEY);
  } catch (error) {
    console.warn("[LocalEmbedding] Failed to clear transformers cache:", error);
    return false;
  }
};
