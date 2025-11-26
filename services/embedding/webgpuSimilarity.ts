/**
 * WebGPU Accelerated Similarity Search
 * Uses GPU compute shaders for fast vector similarity computation
 */

export interface WebGPUSimilarityResult {
  index: number;
  score: number;
}

/**
 * Check if WebGPU is available
 */
export async function isWebGPUAvailable(): Promise<boolean> {
  if (!navigator.gpu) {
    return false;
  }
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}

/**
 * WebGPU Similarity Search Engine
 */
export class WebGPUSimilarityEngine {
  private device: GPUDevice | null = null;
  private pipeline: GPUComputePipeline | null = null;
  private isInitialized = false;
  private dimensions: number = 0;

  // Compute shader for cosine similarity
  private readonly shaderCode = /* wgsl */ `
    struct Params {
      numDocuments: u32,
      dimensions: u32,
      topK: u32,
      threshold: f32,
    }

    @group(0) @binding(0) var<uniform> params: Params;
    @group(0) @binding(1) var<storage, read> query: array<f32>;
    @group(0) @binding(2) var<storage, read> documents: array<f32>;
    @group(0) @binding(3) var<storage, read_write> scores: array<f32>;

    @compute @workgroup_size(256)
    fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
      let docIndex = global_id.x;
      if (docIndex >= params.numDocuments) {
        return;
      }

      let dims = params.dimensions;
      let docOffset = docIndex * dims;

      // Compute dot product and norms
      var dotProduct: f32 = 0.0;
      var queryNorm: f32 = 0.0;
      var docNorm: f32 = 0.0;

      for (var i: u32 = 0u; i < dims; i = i + 1u) {
        let q = query[i];
        let d = documents[docOffset + i];
        dotProduct = dotProduct + q * d;
        queryNorm = queryNorm + q * q;
        docNorm = docNorm + d * d;
      }

      // Compute cosine similarity
      let magnitude = sqrt(queryNorm) * sqrt(docNorm);
      var similarity: f32 = 0.0;
      if (magnitude > 0.0) {
        similarity = dotProduct / magnitude;
      }

      // Apply threshold filter
      if (similarity < params.threshold) {
        similarity = -1.0; // Mark as filtered out
      }

      scores[docIndex] = similarity;
    }
  `;

  /**
   * Initialize the WebGPU device and pipeline
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    if (!navigator.gpu) {
      console.warn("[WebGPU] WebGPU not supported in this browser");
      return false;
    }

    try {
      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: "high-performance",
      });

      if (!adapter) {
        console.warn("[WebGPU] No suitable GPU adapter found");
        return false;
      }

      // Check adapter limits
      const limits = adapter.limits;
      console.log("[WebGPU] GPU adapter limits:", {
        maxBufferSize: limits.maxBufferSize,
        maxStorageBufferBindingSize: limits.maxStorageBufferBindingSize,
        maxComputeWorkgroupsPerDimension:
          limits.maxComputeWorkgroupsPerDimension,
      });

      this.device = await adapter.requestDevice({
        requiredLimits: {
          maxBufferSize: Math.min(limits.maxBufferSize, 256 * 1024 * 1024), // 256MB
          maxStorageBufferBindingSize: Math.min(
            limits.maxStorageBufferBindingSize,
            128 * 1024 * 1024,
          ), // 128MB
        },
      });

      // Handle device loss
      this.device.lost.then((info) => {
        console.error(`[WebGPU] Device lost: ${info.reason}`, info.message);
        this.isInitialized = false;
        this.device = null;
        this.pipeline = null;
      });

      // Create shader module
      const shaderModule = this.device.createShaderModule({
        code: this.shaderCode,
      });

      // Create compute pipeline
      this.pipeline = this.device.createComputePipeline({
        layout: "auto",
        compute: {
          module: shaderModule,
          entryPoint: "main",
        },
      });

      this.isInitialized = true;
      console.log("[WebGPU] Similarity engine initialized successfully");
      return true;
    } catch (error) {
      console.error("[WebGPU] Failed to initialize:", error);
      return false;
    }
  }

  /**
   * Perform similarity search using GPU
   */
  async search(
    query: Float32Array,
    documents: Float32Array,
    numDocuments: number,
    dimensions: number,
    topK: number,
    threshold: number,
  ): Promise<WebGPUSimilarityResult[]> {
    if (!this.device || !this.pipeline) {
      throw new Error("WebGPU not initialized");
    }

    const startTime = performance.now();

    // Create buffers
    const paramsBuffer = this.device.createBuffer({
      size: 16, // 4 x 4 bytes
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const queryBuffer = this.device.createBuffer({
      size: query.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const documentsBuffer = this.device.createBuffer({
      size: documents.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const scoresBuffer = this.device.createBuffer({
      size: numDocuments * 4, // Float32
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    const readBuffer = this.device.createBuffer({
      size: numDocuments * 4,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    // Write data to buffers
    const paramsData = new ArrayBuffer(16);
    const paramsView = new DataView(paramsData);
    paramsView.setUint32(0, numDocuments, true);
    paramsView.setUint32(4, dimensions, true);
    paramsView.setUint32(8, topK, true);
    paramsView.setFloat32(12, threshold, true);

    this.device.queue.writeBuffer(paramsBuffer, 0, paramsData);
    this.device.queue.writeBuffer(queryBuffer, 0, query.buffer as ArrayBuffer);
    this.device.queue.writeBuffer(
      documentsBuffer,
      0,
      documents.buffer as ArrayBuffer,
    );

    // Create bind group
    const bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: paramsBuffer } },
        { binding: 1, resource: { buffer: queryBuffer } },
        { binding: 2, resource: { buffer: documentsBuffer } },
        { binding: 3, resource: { buffer: scoresBuffer } },
      ],
    });

    // Dispatch compute
    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(Math.ceil(numDocuments / 256));
    passEncoder.end();

    // Copy results to readable buffer
    commandEncoder.copyBufferToBuffer(
      scoresBuffer,
      0,
      readBuffer,
      0,
      numDocuments * 4,
    );

    this.device.queue.submit([commandEncoder.finish()]);

    // Read results
    await readBuffer.mapAsync(GPUMapMode.READ);
    const scores = new Float32Array(readBuffer.getMappedRange().slice(0));
    readBuffer.unmap();

    // Clean up buffers
    paramsBuffer.destroy();
    queryBuffer.destroy();
    documentsBuffer.destroy();
    scoresBuffer.destroy();
    readBuffer.destroy();

    // Filter and sort results
    const results: WebGPUSimilarityResult[] = [];
    for (let i = 0; i < numDocuments; i++) {
      if (scores[i] >= threshold) {
        results.push({ index: i, score: scores[i] });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    const duration = performance.now() - startTime;
    console.log(
      `[WebGPU] Search completed in ${duration.toFixed(2)}ms for ${numDocuments} documents`,
    );

    // Return top K
    return results.slice(0, topK);
  }

  /**
   * Clean up GPU resources
   */
  destroy(): void {
    if (this.device) {
      this.device.destroy();
      this.device = null;
    }
    this.pipeline = null;
    this.isInitialized = false;
  }

  /**
   * Check if engine is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.device !== null;
  }
}

// Singleton instance
let webgpuEngineInstance: WebGPUSimilarityEngine | null = null;

export async function getWebGPUEngine(): Promise<WebGPUSimilarityEngine | null> {
  if (!webgpuEngineInstance) {
    webgpuEngineInstance = new WebGPUSimilarityEngine();
    const success = await webgpuEngineInstance.initialize();
    if (!success) {
      webgpuEngineInstance = null;
    }
  }
  return webgpuEngineInstance;
}

export function resetWebGPUEngine(): void {
  if (webgpuEngineInstance) {
    webgpuEngineInstance.destroy();
    webgpuEngineInstance = null;
  }
}
