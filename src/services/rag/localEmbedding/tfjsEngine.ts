import type {
  LocalEmbeddingBackend,
  LocalEmbeddingRuntimeConfig,
} from "../types";

const DEFAULT_BACKEND_ORDER: LocalEmbeddingBackend[] = [
  "webgpu",
  "webgl",
  "cpu",
];
const DEFAULT_BATCH_SIZE = 8;

interface TfjsEmbeddingEngine {
  backend: LocalEmbeddingBackend;
  embed: (texts: string[]) => Promise<number[][]>;
  dispose: () => void;
}

let enginePromise: Promise<TfjsEmbeddingEngine> | null = null;
let engineKey: string | null = null;

const normalizeConfig = (
  config?: Partial<LocalEmbeddingRuntimeConfig>,
): LocalEmbeddingRuntimeConfig => ({
  model: "use-lite-512",
  backendOrder:
    config?.backendOrder && config.backendOrder.length > 0
      ? config.backendOrder
      : DEFAULT_BACKEND_ORDER,
  batchSize:
    typeof config?.batchSize === "number" && config.batchSize > 0
      ? Math.floor(config.batchSize)
      : DEFAULT_BATCH_SIZE,
});

const createConfigKey = (config: LocalEmbeddingRuntimeConfig): string => {
  return JSON.stringify({
    model: config.model,
    backendOrder: config.backendOrder,
    batchSize: config.batchSize,
  });
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

const loadBackend = async (backend: LocalEmbeddingBackend): Promise<void> => {
  switch (backend) {
    case "webgpu":
      await import("@tensorflow/tfjs-backend-webgpu");
      return;
    case "webgl":
      await import("@tensorflow/tfjs-backend-webgl");
      return;
    case "cpu":
      await import("@tensorflow/tfjs-backend-cpu");
      return;
    default:
      throw new Error(`Unsupported TFJS backend: ${backend}`);
  }
};

const pickBackend = async (
  tf: typeof import("@tensorflow/tfjs-core"),
  backendOrder: LocalEmbeddingBackend[],
): Promise<LocalEmbeddingBackend> => {
  const errors: string[] = [];

  for (const backend of backendOrder) {
    try {
      await loadBackend(backend);
      const switched = await tf.setBackend(backend);
      await tf.ready();
      if (switched || tf.getBackend() === backend) {
        return backend;
      }
      errors.push(`${backend}: backend switch returned false`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${backend}: ${message}`);
    }
  }

  throw new Error(`No TFJS backend available (${errors.join(" | ")})`);
};

const createEngine = async (
  config: LocalEmbeddingRuntimeConfig,
): Promise<TfjsEmbeddingEngine> => {
  const tf = await import("@tensorflow/tfjs-core");
  const use = await import("@tensorflow-models/universal-sentence-encoder");

  const backend = await pickBackend(
    tf,
    config.backendOrder || DEFAULT_BACKEND_ORDER,
  );
  const model = await use.load();

  const embed = async (texts: string[]): Promise<number[][]> => {
    if (texts.length === 0) return [];

    const output: number[][] = [];
    const batchSize = config.batchSize || DEFAULT_BATCH_SIZE;

    for (let start = 0; start < texts.length; start += batchSize) {
      const batch = texts
        .slice(start, start + batchSize)
        .map((text) => text || " ");
      const tensor = await model.embed(batch);
      const vectors = (await tensor.array()) as number[][];
      tensor.dispose();
      output.push(...vectors.map((vector) => l2Normalize(Array.from(vector))));
    }

    return output;
  };

  const dispose = () => {
    const disposable = model as { dispose?: () => void };
    if (typeof disposable.dispose === "function") {
      disposable.dispose();
    }
  };

  return {
    backend,
    embed,
    dispose,
  };
};

export const getTfjsEmbeddingEngine = async (
  config?: Partial<LocalEmbeddingRuntimeConfig>,
): Promise<TfjsEmbeddingEngine> => {
  const normalized = normalizeConfig(config);
  const nextKey = createConfigKey(normalized);

  if (enginePromise && engineKey === nextKey) {
    return enginePromise;
  }

  if (enginePromise && engineKey !== nextKey) {
    await resetTfjsEmbeddingEngine();
  }

  engineKey = nextKey;
  enginePromise = createEngine(normalized);
  return enginePromise;
};

export const embedTextsWithTfjs = async (
  texts: string[],
  config?: Partial<LocalEmbeddingRuntimeConfig>,
): Promise<number[][]> => {
  const engine = await getTfjsEmbeddingEngine(config);
  return engine.embed(texts);
};

export const resetTfjsEmbeddingEngine = async (): Promise<void> => {
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
