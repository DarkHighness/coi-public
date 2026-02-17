import type {
  LocalEmbeddingRuntimeConfig,
  LocalTransformersDevice,
} from "../types";
import { DEFAULT_LOCAL_TRANSFORMERS_MODEL_ID } from "./modelCatalog";

const DEFAULT_MODEL = DEFAULT_LOCAL_TRANSFORMERS_MODEL_ID;
const DEFAULT_DEVICE_ORDER: LocalTransformersDevice[] = [
  "webgpu",
  "wasm",
  "cpu",
];
const DEFAULT_BATCH_SIZE = 8;

const isObject = (value: unknown): value is JsonObject =>
  value !== null && typeof value === "object";

const isArrayLikeNumber = (value: unknown): value is ArrayLike<number> => {
  return (
    value !== null &&
    typeof value === "object" &&
    "length" in value &&
    typeof value.length === "number"
  );
};

interface OnnxWasmEnvironment {
  wasmPaths?: { mjs?: string; wasm?: string };
  proxy?: boolean;
}

interface TransformersRuntimeEnvironment {
  allowLocalModels?: boolean;
  useBrowserCache?: boolean;
  backends?: {
    onnx?: unknown;
  };
}

export interface TransformersModelProgressEvent {
  status?: string;
  name?: string;
  file?: string;
  progress?: number;
  loaded?: number;
  total?: number;
  task?: string;
  model?: string;
}

export type TransformersProgressCallback = (
  event: TransformersModelProgressEvent,
) => void;

export interface TransformersEmbeddingEngine {
  backend: "transformers_js";
  device: LocalTransformersDevice;
  model: string;
  embed: (texts: string[]) => Promise<number[][]>;
  dispose: () => void;
}

let enginePromise: Promise<TransformersEmbeddingEngine> | null = null;
let engineKey: string | null = null;

const normalizeConfig = (
  config?: Partial<LocalEmbeddingRuntimeConfig>,
): Required<
  Pick<
    LocalEmbeddingRuntimeConfig,
    "transformersModel" | "deviceOrder" | "batchSize" | "quantized"
  >
> => {
  const rawDeviceOrder =
    config?.deviceOrder && config.deviceOrder.length > 0
      ? config.deviceOrder
      : DEFAULT_DEVICE_ORDER;

  return {
    transformersModel: config?.transformersModel || DEFAULT_MODEL,
    deviceOrder: Array.from(new Set(rawDeviceOrder)),
    batchSize:
      typeof config?.batchSize === "number" && config.batchSize > 0
        ? Math.floor(config.batchSize)
        : DEFAULT_BATCH_SIZE,
    quantized: config?.quantized !== false,
  };
};

const createConfigKey = (
  config: ReturnType<typeof normalizeConfig>,
): string => {
  return JSON.stringify(config);
};

const l2Normalize = (vector: number[]): number[] => {
  let sum = 0;
  for (const value of vector) {
    sum += value * value;
  }

  const norm = Math.sqrt(sum);
  if (!Number.isFinite(norm) || norm <= 1e-12) {
    return vector.map(() => 0);
  }

  return vector.map((value) => value / norm);
};

const isWebGpuAvailable = (): boolean => {
  try {
    const currentNavigator: unknown =
      typeof navigator !== "undefined" ? navigator : undefined;
    return (
      isObject(currentNavigator) &&
      "gpu" in currentNavigator &&
      typeof currentNavigator.gpu !== "undefined"
    );
  } catch {
    return false;
  }
};

const isCrossOriginUrl = (url: string): boolean => {
  if (url.startsWith("blob:") || url.startsWith("/")) {
    return false;
  }

  if (typeof location === "undefined") {
    return true;
  }

  try {
    const parsed = new URL(url, location.origin);
    return parsed.origin !== location.origin;
  } catch {
    return true;
  }
};

const toBlobUrl = async (
  inputUrl: string,
  mimeType: string,
): Promise<string> => {
  if (typeof fetch === "undefined") {
    return inputUrl;
  }

  const response = await fetch(inputUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch ONNX runtime asset: ${inputUrl} (${response.status})`,
    );
  }

  const payload =
    mimeType === "text/javascript"
      ? await response.text()
      : await response.arrayBuffer();

  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
    return inputUrl;
  }

  const blob = new Blob([payload], { type: mimeType });
  return URL.createObjectURL(blob);
};

export const ensureOnnxWasmPaths = async (onnxEnv: unknown): Promise<void> => {
  const wasmCandidate =
    isObject(onnxEnv) && "wasm" in onnxEnv ? onnxEnv.wasm : null;
  const wasmEnv: OnnxWasmEnvironment | null = isObject(wasmCandidate)
    ? (wasmCandidate as OnnxWasmEnvironment)
    : null;

  if (!wasmEnv || !wasmEnv.wasmPaths) {
    return;
  }

  const mjsPath = wasmEnv.wasmPaths.mjs;
  const wasmPath = wasmEnv.wasmPaths.wasm;
  if (!mjsPath || !wasmPath) {
    return;
  }

  const needsMjsBlob = isCrossOriginUrl(mjsPath);
  const needsWasmBlob = isCrossOriginUrl(wasmPath);

  if (needsMjsBlob || needsWasmBlob) {
    try {
      const [nextMjsPath, nextWasmPath] = await Promise.all([
        needsMjsBlob ? toBlobUrl(mjsPath, "text/javascript") : mjsPath,
        needsWasmBlob ? toBlobUrl(wasmPath, "application/wasm") : wasmPath,
      ]);
      wasmEnv.wasmPaths = {
        mjs: nextMjsPath,
        wasm: nextWasmPath,
      };
    } catch (error) {
      console.warn(
        "[LocalEmbedding] Failed to convert ONNX wasm paths to blob URLs:",
        error,
      );
    }
  }

  wasmEnv.proxy = false;
};

export const resolveTransformersPipelineDevice = (
  device: LocalTransformersDevice,
): "webgpu" | "wasm" => {
  switch (device) {
    case "webgpu":
      return "webgpu";
    case "wasm":
      return "wasm";
    case "cpu":
      // Browser ONNX backends expose "wasm" instead of direct "cpu".
      return "wasm";
    default:
      return "wasm";
  }
};

const createEngine = async (
  runtimeConfig: ReturnType<typeof normalizeConfig>,
  onProgress?: TransformersProgressCallback,
): Promise<TransformersEmbeddingEngine> => {
  const transformers = await import("@huggingface/transformers");
  const envCandidate = (transformers as { env?: unknown }).env;
  const env = isObject(envCandidate)
    ? (envCandidate as TransformersRuntimeEnvironment)
    : undefined;

  if (env) {
    env.allowLocalModels = false;
    env.useBrowserCache = true;
    await ensureOnnxWasmPaths(env.backends?.onnx);
  }

  const errors: string[] = [];

  for (const device of runtimeConfig.deviceOrder) {
    if (device === "webgpu" && !isWebGpuAvailable()) {
      errors.push("webgpu: not available in current runtime");
      continue;
    }

    try {
      const pipelineDevice = resolveTransformersPipelineDevice(device);
      const extractor = await transformers.pipeline(
        "feature-extraction",
        runtimeConfig.transformersModel,
        {
          device: pipelineDevice,
          dtype: runtimeConfig.quantized ? "q8" : "fp32",
          progress_callback: (event: unknown) => {
            if (!onProgress || !event || typeof event !== "object") {
              return;
            }
            onProgress(event as TransformersModelProgressEvent);
          },
        },
      );

      const embed = async (texts: string[]): Promise<number[][]> => {
        if (texts.length === 0) return [];

        const output: number[][] = [];
        const batchSize = runtimeConfig.batchSize || DEFAULT_BATCH_SIZE;

        for (let start = 0; start < texts.length; start += batchSize) {
          const batch = texts
            .slice(start, start + batchSize)
            .map((text) => text || " ");

          const result = await extractor(batch, {
            pooling: "mean",
            normalize: true,
          });

          if (Array.isArray(result)) {
            for (const item of result) {
              const vector = Array.isArray(item)
                ? item.map((v) => Number(v))
                : [];
              output.push(l2Normalize(vector));
            }
            continue;
          }

          const tensorData =
            result && typeof result === "object" && "data" in result
              ? (() => {
                  const data = (result as { data?: unknown }).data;
                  if (!isArrayLikeNumber(data)) {
                    return [];
                  }
                  return Array.from(data).map((v) => Number(v));
                })()
              : [];

          if (batch.length <= 1) {
            output.push(l2Normalize(tensorData));
            continue;
          }

          const dims =
            result && typeof result === "object" && "dims" in result
              ? (() => {
                  const nextDims = (result as { dims?: unknown }).dims;
                  if (!Array.isArray(nextDims)) {
                    return [
                      batch.length,
                      tensorData.length / Math.max(batch.length, 1),
                    ];
                  }
                  return nextDims.map((dim) => Number(dim));
                })()
              : [batch.length, tensorData.length / Math.max(batch.length, 1)];

          const vectorSize = dims.length >= 2 ? dims[dims.length - 1] : 0;

          if (vectorSize <= 0) {
            throw new Error("Invalid embedding tensor dimensions");
          }

          for (let row = 0; row < batch.length; row += 1) {
            const startIdx = row * vectorSize;
            const endIdx = startIdx + vectorSize;
            output.push(l2Normalize(tensorData.slice(startIdx, endIdx)));
          }
        }

        return output;
      };

      const dispose = () => {
        const disposable = extractor as { dispose?: () => void };
        if (typeof disposable.dispose === "function") {
          disposable.dispose();
        }
      };

      return {
        backend: "transformers_js",
        device: pipelineDevice as LocalTransformersDevice,
        model: runtimeConfig.transformersModel,
        embed,
        dispose,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${device}: ${message}`);
    }
  }

  throw new Error(
    `No transformers.js embedding device available (${errors.join(" | ")})`,
  );
};

export const getTransformersEmbeddingEngine = async (
  config?: Partial<LocalEmbeddingRuntimeConfig>,
  onProgress?: TransformersProgressCallback,
): Promise<TransformersEmbeddingEngine> => {
  const normalized = normalizeConfig(config);
  const nextKey = createConfigKey(normalized);

  if (enginePromise && engineKey === nextKey) {
    onProgress?.({
      status: "ready",
      model: normalized.transformersModel,
    });
    return enginePromise;
  }

  if (enginePromise && engineKey !== nextKey) {
    await resetTransformersEmbeddingEngine();
  }

  engineKey = nextKey;
  enginePromise = createEngine(normalized, onProgress);
  return enginePromise;
};

export const embedTextsWithTransformers = async (
  texts: string[],
  config?: Partial<LocalEmbeddingRuntimeConfig>,
): Promise<number[][]> => {
  const engine = await getTransformersEmbeddingEngine(config);
  return engine.embed(texts);
};

export const resetTransformersEmbeddingEngine = async (): Promise<void> => {
  if (!enginePromise) {
    engineKey = null;
    return;
  }

  const current = await enginePromise.catch(() => null);
  if (current) {
    current.dispose();
  }

  enginePromise = null;
  engineKey = null;
};
