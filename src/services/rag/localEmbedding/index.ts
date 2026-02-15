import type {
  LocalEmbeddingRuntimeConfig,
  LocalEmbeddingRuntimeInfo,
} from "../types";
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
import {
  DEFAULT_LOCAL_TRANSFORMERS_MODEL_ID,
  LOCAL_TRANSFORMERS_MODEL_OPTIONS,
  getLocalTransformersModelMeta,
} from "./modelCatalog";
import {
  clearTransformersCache,
  getTransformersCacheSummary,
  removeModelFromTransformersCache,
} from "./cacheManager";

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

export const getLocalEmbeddingRuntimeInfo = async (
  config?: Partial<LocalEmbeddingRuntimeConfig>,
): Promise<LocalEmbeddingRuntimeInfo> => {
  const backend = resolveBackend(config);
  if (backend === "tfjs") {
    const engine = await getTfjsEmbeddingEngine(config);
    return {
      engine: "tfjs",
      backend: engine.backend,
      model: config?.model || "use-lite-512",
    };
  }

  const engine = await getTransformersEmbeddingEngine(config);
  return {
    engine: "transformers_js",
    backend: engine.device,
    model: engine.model,
  };
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
  DEFAULT_LOCAL_TRANSFORMERS_MODEL_ID,
  LOCAL_TRANSFORMERS_MODEL_OPTIONS,
  getLocalTransformersModelMeta,
  getTransformersCacheSummary,
  removeModelFromTransformersCache,
  clearTransformersCache,
};
