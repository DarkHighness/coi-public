/**
 * Similarity Search Manager
 * Manages similarity search with WebGPU acceleration and WebWorker fallback
 */

import type {
  EmbeddingDocument,
  EmbeddingIndex,
  EmbeddingConfig,
} from "../../types";
import { restoreEmbeddingsFromIndex } from "./embeddingService";
import {
  isWebGPUAvailable,
  getWebGPUEngine,
  resetWebGPUEngine,
  type WebGPUSimilarityResult,
} from "./webgpuSimilarity";

// Import worker as URL for Vite
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import SimilarityWorkerUrl from "./similarityWorker.ts?worker&url";

export interface SearchResult {
  document: EmbeddingDocument;
  score: number;
}

type SearchBackend = "webgpu" | "webworker" | "none";

export class SimilaritySearchManager {
  private worker: Worker | null = null;
  private isReady = false;
  private readyPromise: Promise<void> | null = null;
  private pendingSearches: Map<
    number,
    {
      resolve: (results: SearchResult[]) => void;
      reject: (error: Error) => void;
    }
  > = new Map();
  private searchId = 0;
  private documents: EmbeddingDocument[] = [];
  private config: EmbeddingConfig;
  private backend: SearchBackend = "none";
  private webgpuAvailable: boolean | null = null;

  constructor(config: EmbeddingConfig) {
    this.config = config;
  }

  /**
   * Check and cache WebGPU availability
   */
  private async checkWebGPUAvailable(): Promise<boolean> {
    if (this.webgpuAvailable !== null) {
      return this.webgpuAvailable;
    }
    this.webgpuAvailable = await isWebGPUAvailable();
    console.log(`[SimilaritySearch] WebGPU available: ${this.webgpuAvailable}`);
    return this.webgpuAvailable;
  }

  /**
   * Initialize the search backend (WebGPU or WebWorker)
   */
  async initialize(): Promise<void> {
    if (this.readyPromise) {
      return this.readyPromise;
    }

    this.readyPromise = (async () => {
      // Try WebGPU first
      const gpuAvailable = await this.checkWebGPUAvailable();
      if (gpuAvailable) {
        const engine = await getWebGPUEngine();
        if (engine && engine.isReady()) {
          this.backend = "webgpu";
          this.isReady = true;
          console.log("[SimilaritySearch] Using WebGPU backend");
          return;
        }
      }

      // Fall back to WebWorker
      await this.initializeWorker();
      this.backend = "webworker";
      console.log("[SimilaritySearch] Using WebWorker backend");
    })();

    return this.readyPromise;
  }

  /**
   * Initialize the WebWorker fallback
   */
  private async initializeWorker(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create worker from URL (Vite compatible)
        this.worker = new Worker(
          new URL("./similarityWorker.ts", import.meta.url),
          { type: "module" },
        );

        this.worker.onmessage = (event) => {
          const data = event.data;

          if (data.type === "ready") {
            this.isReady = true;
            resolve();
          } else if (data.type === "searchResult") {
            const pending = this.pendingSearches.get(data.searchId);
            if (pending) {
              const results: SearchResult[] = data.results.map(
                (r: { index: number; score: number }) => ({
                  document: this.documents[r.index],
                  score: r.score,
                }),
              );
              pending.resolve(results);
              this.pendingSearches.delete(data.searchId);
            }
          } else if (data.type === "indexResult") {
            console.log("[SimilaritySearch] Index loaded:", data.message);
          } else if (data.type === "error") {
            console.error("[SimilaritySearch] Worker error:", data.message);
            // Reject all pending searches
            for (const [id, pending] of this.pendingSearches) {
              pending.reject(new Error(data.message));
              this.pendingSearches.delete(id);
            }
          }
        };

        this.worker.onerror = (error) => {
          console.error("[SimilaritySearch] Worker error:", error);
          reject(error);
        };

        // Timeout after 5 seconds
        setTimeout(() => {
          if (!this.isReady) {
            reject(new Error("Worker initialization timeout"));
          }
        }, 5000);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Load an embedding index into the search backend
   */
  async loadIndex(index: EmbeddingIndex): Promise<void> {
    await this.initialize();

    // Restore documents with embeddings
    this.documents = restoreEmbeddingsFromIndex(index);

    if (this.backend === "webworker" && this.worker && index.embeddings) {
      // Send index to worker
      this.worker.postMessage({
        type: "index",
        embeddings: index.embeddings,
        numDocuments: index.documents.length,
        dimensions: index.dimensions,
      });
    }
    // WebGPU doesn't need pre-loading, it processes on-the-fly
  }

  /**
   * Search for similar documents
   */
  async search(
    queryEmbedding: Float32Array,
    options?: {
      topK?: number;
      threshold?: number;
    },
  ): Promise<SearchResult[]> {
    await this.initialize();

    const topK = options?.topK ?? this.config.topK ?? 5;
    const threshold =
      options?.threshold ?? this.config.similarityThreshold ?? 0.7;

    if (this.backend === "webgpu") {
      return this.searchWithWebGPU(queryEmbedding, topK, threshold);
    } else {
      return this.searchWithWorker(queryEmbedding, topK, threshold);
    }
  }

  /**
   * Search using WebGPU
   */
  private async searchWithWebGPU(
    queryEmbedding: Float32Array,
    topK: number,
    threshold: number,
  ): Promise<SearchResult[]> {
    const engine = await getWebGPUEngine();
    if (!engine) {
      // Fallback to worker if GPU is unavailable
      console.warn(
        "[SimilaritySearch] WebGPU unavailable, falling back to worker",
      );
      this.backend = "webworker";
      await this.initializeWorker();
      return this.searchWithWorker(queryEmbedding, topK, threshold);
    }

    // Prepare flattened embeddings array
    const dimensions = queryEmbedding.length;
    const numDocuments = this.documents.length;
    const flatEmbeddings = new Float32Array(numDocuments * dimensions);

    for (let i = 0; i < numDocuments; i++) {
      const embedding = this.documents[i].embedding;
      if (embedding) {
        flatEmbeddings.set(embedding, i * dimensions);
      }
    }

    try {
      const gpuResults = await engine.search(
        queryEmbedding,
        flatEmbeddings,
        numDocuments,
        dimensions,
        topK,
        threshold,
      );

      return gpuResults.map((r) => ({
        document: this.documents[r.index],
        score: r.score,
      }));
    } catch (error) {
      console.error("[SimilaritySearch] WebGPU search failed:", error);
      // Fallback to worker
      this.backend = "webworker";
      await this.initializeWorker();
      return this.searchWithWorker(queryEmbedding, topK, threshold);
    }
  }

  /**
   * Search using WebWorker
   */
  private async searchWithWorker(
    queryEmbedding: Float32Array,
    topK: number,
    threshold: number,
  ): Promise<SearchResult[]> {
    if (!this.worker) {
      throw new Error("Worker not initialized");
    }

    return new Promise((resolve, reject) => {
      const id = ++this.searchId;
      this.pendingSearches.set(id, { resolve, reject });

      // Prepare embeddings buffer
      const embeddings = new Float32Array(
        this.documents.length * (this.documents[0]?.embedding?.length || 0),
      );
      for (let i = 0; i < this.documents.length; i++) {
        const embedding = this.documents[i].embedding;
        if (embedding) {
          embeddings.set(embedding, i * embedding.length);
        }
      }

      this.worker!.postMessage(
        {
          type: "search",
          searchId: id,
          query: queryEmbedding,
          embeddings: embeddings.buffer,
          numDocuments: this.documents.length,
          dimensions: queryEmbedding.length,
          topK,
          threshold,
        },
        [queryEmbedding.buffer],
      );

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingSearches.has(id)) {
          this.pendingSearches.delete(id);
          reject(new Error("Search timeout"));
        }
      }, 10000);
    });
  }

  /**
   * Terminate all backends
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    resetWebGPUEngine();
    this.isReady = false;
    this.readyPromise = null;
    this.backend = "none";
  }

  /**
   * Get the current document count
   */
  getDocumentCount(): number {
    return this.documents.length;
  }

  /**
   * Get the current backend type
   */
  getBackend(): SearchBackend {
    return this.backend;
  }
}

/**
 * Create a singleton instance of the search manager
 */
let searchManagerInstance: SimilaritySearchManager | null = null;

export function getSimilaritySearchManager(
  config: EmbeddingConfig,
): SimilaritySearchManager {
  if (!searchManagerInstance) {
    searchManagerInstance = new SimilaritySearchManager(config);
  }
  return searchManagerInstance;
}

export function resetSimilaritySearchManager(): void {
  if (searchManagerInstance) {
    searchManagerInstance.terminate();
    searchManagerInstance = null;
  }
}
