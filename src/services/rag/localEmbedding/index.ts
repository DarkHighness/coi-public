import type { LocalEmbeddingRuntimeConfig } from "../types";
import {
  embedTextsWithTfjs,
  getTfjsEmbeddingEngine,
  resetTfjsEmbeddingEngine,
} from "./tfjsEngine";
import {
  embedTextsWithTransformers,
  getTransformersEmbeddingEngine,
  resetTransformersEmbeddingEngine,
} from "./transformersEngine";

const resolveBackend = (
  config?: Partial<LocalEmbeddingRuntimeConfig>,
): "tfjs" | "transformers_js" => {
  return config?.backend === "tfjs" ? "tfjs" : "transformers_js";
};

export const embedTextsLocally = async (
  texts: string[],
  config?: Partial<LocalEmbeddingRuntimeConfig>,
): Promise<number[][]> => {
  const backend = resolveBackend(config);
  if (backend === "tfjs") {
    return embedTextsWithTfjs(texts, config);
  }
  return embedTextsWithTransformers(texts, config);
};

export const resetLocalEmbeddingEngines = async (): Promise<void> => {
  await Promise.allSettled([
    resetTfjsEmbeddingEngine(),
    resetTransformersEmbeddingEngine(),
  ]);
};

export {
  embedTextsWithTfjs,
  getTfjsEmbeddingEngine,
  resetTfjsEmbeddingEngine,
  embedTextsWithTransformers,
  getTransformersEmbeddingEngine,
  resetTransformersEmbeddingEngine,
};
