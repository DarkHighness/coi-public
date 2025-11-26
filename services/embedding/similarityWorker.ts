/**
 * Similarity Search WebWorker
 * Performs vector similarity search off the main thread
 */

// Message types
interface SearchRequest {
  type: "search";
  query: Float32Array;
  embeddings: ArrayBuffer;
  numDocuments: number;
  dimensions: number;
  topK: number;
  threshold: number;
}

interface IndexRequest {
  type: "index";
  embeddings: ArrayBuffer;
  numDocuments: number;
  dimensions: number;
}

interface SearchResult {
  type: "searchResult";
  results: Array<{
    index: number;
    score: number;
  }>;
  duration: number;
}

interface IndexResult {
  type: "indexResult";
  success: boolean;
  message?: string;
}

interface ErrorResult {
  type: "error";
  message: string;
}

type WorkerMessage = SearchRequest | IndexRequest;
type WorkerResponse = SearchResult | IndexResult | ErrorResult;

// Cached index for repeated searches
let cachedEmbeddings: Float32Array | null = null;
let cachedDimensions = 0;
let cachedNumDocuments = 0;

/**
 * Compute cosine similarity between two vectors
 */
function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

/**
 * Compute dot product similarity (for normalized vectors)
 */
function dotProductSimilarity(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

/**
 * L2 normalize a vector in-place
 */
function normalizeVector(v: Float32Array): void {
  let norm = 0;
  for (let i = 0; i < v.length; i++) {
    norm += v[i] * v[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < v.length; i++) {
      v[i] /= norm;
    }
  }
}

/**
 * Search for most similar documents
 */
function searchSimilar(
  query: Float32Array,
  embeddings: Float32Array,
  numDocuments: number,
  dimensions: number,
  topK: number,
  threshold: number,
): Array<{ index: number; score: number }> {
  const startTime = performance.now();

  // Normalize query vector
  const normalizedQuery = new Float32Array(query);
  normalizeVector(normalizedQuery);

  // Compute similarities
  const scores: Array<{ index: number; score: number }> = [];

  for (let i = 0; i < numDocuments; i++) {
    const start = i * dimensions;
    const docEmbedding = new Float32Array(dimensions);
    for (let j = 0; j < dimensions; j++) {
      docEmbedding[j] = embeddings[start + j];
    }

    // Normalize document embedding
    normalizeVector(docEmbedding);

    // Compute similarity using dot product (faster for normalized vectors)
    const score = dotProductSimilarity(normalizedQuery, docEmbedding);

    if (score >= threshold) {
      scores.push({ index: i, score });
    }
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  // Return top K
  return scores.slice(0, topK);
}

/**
 * Handle incoming messages
 */
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const data = event.data;

  try {
    if (data.type === "index") {
      // Cache the embeddings for repeated searches
      cachedEmbeddings = new Float32Array(data.embeddings);
      cachedDimensions = data.dimensions;
      cachedNumDocuments = data.numDocuments;

      const response: IndexResult = {
        type: "indexResult",
        success: true,
        message: `Indexed ${data.numDocuments} documents`,
      };
      self.postMessage(response);
    } else if (data.type === "search") {
      const startTime = performance.now();

      // Use cached embeddings if available, otherwise use provided ones
      const embeddings = cachedEmbeddings || new Float32Array(data.embeddings);
      const dimensions = cachedEmbeddings ? cachedDimensions : data.dimensions;
      const numDocuments = cachedEmbeddings
        ? cachedNumDocuments
        : data.numDocuments;

      const results = searchSimilar(
        data.query,
        embeddings,
        numDocuments,
        dimensions,
        data.topK,
        data.threshold,
      );

      const duration = performance.now() - startTime;

      const response: SearchResult = {
        type: "searchResult",
        results,
        duration,
      };
      self.postMessage(response);
    }
  } catch (error: any) {
    const response: ErrorResult = {
      type: "error",
      message: error.message || "Unknown error in similarity worker",
    };
    self.postMessage(response);
  }
};

// Signal that worker is ready
self.postMessage({ type: "ready" });
