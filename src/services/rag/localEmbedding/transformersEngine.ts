import type {
  LocalEmbeddingRuntimeConfig,
  LocalTransformersDevice,
} from "../types";

const DEFAULT_MODEL = "Xenova/all-MiniLM-L6-v2";
const DEFAULT_DEVICE_ORDER: LocalTransformersDevice[] = [
  "webgpu",
  "wasm",
  "cpu",
];
const DEFAULT_BATCH_SIZE = 8;

interface TransformersEmbeddingEngine {
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
    return (
      typeof navigator !== "undefined" &&
      typeof (navigator as any).gpu !== "undefined"
    );
  } catch {
    return false;
  }
};

const mapDeviceForPipeline = (device: LocalTransformersDevice): string => {
  switch (device) {
    case "webgpu":
      return "webgpu";
    case "wasm":
      return "wasm";
    case "cpu":
      return "cpu";
    default:
      return "cpu";
  }
};

const createEngine = async (
  runtimeConfig: ReturnType<typeof normalizeConfig>,
): Promise<TransformersEmbeddingEngine> => {
  const transformers = await import("@huggingface/transformers");
  const env = (transformers as any).env as
    | {
        allowLocalModels?: boolean;
        useBrowserCache?: boolean;
      }
    | undefined;

  if (env) {
    env.allowLocalModels = false;
    env.useBrowserCache = true;
  }

  const errors: string[] = [];

  for (const device of runtimeConfig.deviceOrder) {
    if (device === "webgpu" && !isWebGpuAvailable()) {
      errors.push("webgpu: not available in current runtime");
      continue;
    }

    try {
      const extractor = await transformers.pipeline(
        "feature-extraction",
        runtimeConfig.transformersModel,
        {
          device: mapDeviceForPipeline(device),
          dtype: runtimeConfig.quantized ? "q8" : "fp32",
        } as any,
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
          } as any);

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
              ? Array.from((result as any).data as ArrayLike<number>).map((v) =>
                  Number(v),
                )
              : [];

          if (batch.length <= 1) {
            output.push(l2Normalize(tensorData));
            continue;
          }

          const dims =
            result && typeof result === "object" && "dims" in result
              ? ((result as any).dims as number[])
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
        const disposable = extractor as unknown as { dispose?: () => void };
        if (typeof disposable.dispose === "function") {
          disposable.dispose();
        }
      };

      return {
        backend: "transformers_js",
        device,
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
): Promise<TransformersEmbeddingEngine> => {
  const normalized = normalizeConfig(config);
  const nextKey = createConfigKey(normalized);

  if (enginePromise && engineKey === nextKey) {
    return enginePromise;
  }

  if (enginePromise && engineKey !== nextKey) {
    await resetTransformersEmbeddingEngine();
  }

  engineKey = nextKey;
  enginePromise = createEngine(normalized);
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

