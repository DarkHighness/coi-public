import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ensureOnnxWasmPaths,
  getTransformersEmbeddingEngine,
  resetTransformersEmbeddingEngine,
  resolveTransformersPipelineDevice,
} from "./transformersEngine";

const { pipelineMock, mockEnv } = vi.hoisted(() => ({
  pipelineMock: vi.fn(),
  mockEnv: {
    allowLocalModels: true,
    useBrowserCache: false,
    backends: {
      onnx: {
        wasm: {
          wasmPaths: {
            mjs: "blob:local-mjs",
            wasm: "blob:local-wasm",
          },
          proxy: true,
        },
      },
    },
  },
}));

vi.mock("@huggingface/transformers", () => ({
  env: mockEnv,
  pipeline: pipelineMock,
}));

describe("transformersEngine", () => {
  beforeEach(() => {
    pipelineMock.mockReset();
    mockEnv.backends.onnx.wasm.wasmPaths = {
      mjs: "blob:local-mjs",
      wasm: "blob:local-wasm",
    };
    mockEnv.backends.onnx.wasm.proxy = true;
  });

  afterEach(async () => {
    await resetTransformersEmbeddingEngine();
    vi.restoreAllMocks();
  });

  it("maps cpu device to wasm backend for browser runtime", () => {
    expect(resolveTransformersPipelineDevice("cpu")).toBe("wasm");
    expect(resolveTransformersPipelineDevice("wasm")).toBe("wasm");
    expect(resolveTransformersPipelineDevice("webgpu")).toBe("webgpu");
  });

  it("converts cross-origin ONNX wasm paths to blob URLs", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("export default {};", { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1, 2, 3]), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const createObjectURLMock = vi
      .fn()
      .mockReturnValueOnce("blob:converted-mjs")
      .mockReturnValueOnce("blob:converted-wasm");
    Object.defineProperty(URL, "createObjectURL", {
      value: createObjectURLMock,
      configurable: true,
      writable: true,
    });

    const onnxEnv = {
      wasm: {
        wasmPaths: {
          mjs: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.25.0/dist/ort.mjs",
          wasm: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.25.0/dist/ort.wasm",
        },
        proxy: true,
      },
    };

    await ensureOnnxWasmPaths(onnxEnv);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(createObjectURLMock).toHaveBeenCalledTimes(2);
    expect(onnxEnv.wasm.wasmPaths).toEqual({
      mjs: "blob:converted-mjs",
      wasm: "blob:converted-wasm",
    });
    expect(onnxEnv.wasm.proxy).toBe(false);
  });

  it("initializes pipeline using mapped wasm device when cpu is configured", async () => {
    const extractor = vi.fn(async (inputs: string[]) =>
      inputs.map(() => [1, 0, 0]),
    );
    pipelineMock.mockResolvedValue(extractor);

    const engine = await getTransformersEmbeddingEngine({
      transformersModel: "Xenova/all-MiniLM-L6-v2",
      deviceOrder: ["cpu"],
      batchSize: 8,
      quantized: true,
    });

    expect(pipelineMock).toHaveBeenCalledWith(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2",
      expect.objectContaining({
        device: "wasm",
      }),
    );
    expect(engine.device).toBe("wasm");

    const vectors = await engine.embed(["hello"]);
    expect(vectors).toHaveLength(1);
    expect(vectors[0]).toHaveLength(3);
  });
});
