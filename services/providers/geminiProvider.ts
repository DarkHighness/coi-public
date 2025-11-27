/**
 * ============================================================================
 * Gemini Provider - Google GenAI SDK 实现
 * ============================================================================
 *
 * 使用官方 @google/genai SDK，提供完整的类型安全支持。
 * 包括：内容生成、图片生成、视频生成、语音合成、嵌入向量生成
 */

import {
  GoogleGenAI,
  Modality,
  Content,
  Part,
  FunctionCall,
  GenerateContentConfig,
  Schema,
  Type,
} from "@google/genai";

import type { EmbeddingTaskType, TokenUsage } from "../../types";

import {
  GeminiConfig,
  ModelInfo,
  ModelCapabilities,
  GenerateContentOptions,
  ImageGenerationResponse,
  VideoGenerationResponse,
  SpeechGenerationResponse,
  SpeechGenerationOptions,
  EmbeddingModelInfo,
  EmbeddingResponse,
  ToolCallResult,
  UnifiedMessage,
  TextContentPart,
  ToolCallContentPart,
  ToolResponseContentPart,
  SafetyFilterError,
  MalformedToolCallError,
  JSONParseError,
  AIProviderError,
  getAspectRatio,
} from "./types";
import { zodToGemini } from "../zodCompiler";
import type { ZodTypeAny } from "zod";

// ============================================================================
// Response Types (兼容旧 API)
// ============================================================================

/** 内容生成响应 (兼容格式) */
export interface GeminiContentGenerationResponse {
  result: { functionCalls?: ToolCallResult[] } | Record<string, unknown>;
  usage: TokenUsage;
  raw: unknown;
}

// ============================================================================
// Client Factory
// ============================================================================

/**
 * 创建 Gemini 客户端实例
 */
export function createGeminiClient(config: GeminiConfig): GoogleGenAI {
  if (!config.apiKey) {
    throw new AIProviderError("Gemini API key is required", "gemini");
  }
  return new GoogleGenAI({ apiKey: config.apiKey });
}

/** 兼容旧 API 的别名 */
export const getGeminiClient = createGeminiClient;

// ============================================================================
// Connection Validation
// ============================================================================

/**
 * 验证 Gemini API 连接
 */
export async function validateConnection(config: GeminiConfig): Promise<void> {
  try {
    const client = createGeminiClient(config);
    await client.models.list();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new AIProviderError(
      `Failed to connect to Gemini API: ${message}`,
      "gemini",
      undefined,
      error,
    );
  }
}

// ============================================================================
// Model Listing
// ============================================================================

/**
 * 获取可用的 Gemini 模型列表
 */
export async function getModels(config: GeminiConfig): Promise<ModelInfo[]> {
  try {
    const client = createGeminiClient(config);
    const response = await client.models.list();

    const models: ModelInfo[] = [];

    for await (const model of response) {
      const capabilities = inferModelCapabilities(model.name);
      models.push({
        id: model.name.replace("models/", ""),
        name: model.displayName || model.name,
        capabilities,
      });
    }

    // 只返回支持的模型类型
    return models.filter(
      (m) =>
        m.id.includes("gemini") ||
        m.id.includes("imagen") ||
        m.id.includes("veo"),
    );
  } catch (error) {
    console.warn("Failed to list Gemini models:", error);
    // 返回默认模型列表
    return getDefaultModels();
  }
}

/**
 * 根据模型名称推断能力
 */
function inferModelCapabilities(name: string): ModelCapabilities {
  const lowercaseName = name.toLowerCase();

  return {
    text: lowercaseName.includes("gemini"),
    image: lowercaseName.includes("image") || lowercaseName.includes("imagen"),
    video: lowercaseName.includes("veo") || lowercaseName.includes("video"),
    audio: lowercaseName.includes("audio") || lowercaseName.includes("tts"),
    tools: lowercaseName.includes("gemini"),
    parallelTools: lowercaseName.includes("gemini"),
  };
}

/**
 * 默认模型列表
 */
function getDefaultModels(): ModelInfo[] {
  return [
    {
      id: "gemini-2.0-flash",
      name: "Gemini 2.0 Flash",
      capabilities: {
        text: true,
        image: false,
        video: false,
        audio: false,
        tools: true,
        parallelTools: true,
      },
    },
    {
      id: "gemini-2.0-pro-exp-02-05",
      name: "Gemini 2.0 Pro",
      capabilities: {
        text: true,
        image: false,
        video: false,
        audio: false,
        tools: true,
        parallelTools: true,
      },
    },
    {
      id: "imagen-3.0-generate-002",
      name: "Imagen 3",
      capabilities: {
        text: false,
        image: true,
        video: false,
        audio: false,
        tools: false,
        parallelTools: false,
      },
    },
    {
      id: "veo-2.0-generate-001",
      name: "Veo 2",
      capabilities: {
        text: false,
        image: false,
        video: true,
        audio: false,
        tools: false,
        parallelTools: false,
      },
    },
  ];
}

// ============================================================================
// Content Generation
// ============================================================================

/**
 * 生成内容（对话/工具调用）
 *
 * 注意: 返回格式兼容旧 API，result 可能是:
 * - { functionCalls: ToolCallResult[] } 如果有工具调用
 * - 解析后的 JSON 对象 如果有 schema
 * - { narrative: string } 如果是纯文本
 */
export async function generateContent(
  config: GeminiConfig,
  model: string,
  systemInstruction: string,
  contents: Content[],
  schema?: ZodTypeAny,
  options?: GenerateContentOptions,
): Promise<GeminiContentGenerationResponse> {
  const client = createGeminiClient(config);

  // 构建生成配置
  const generationConfig = buildGenerationConfig(
    systemInstruction,
    schema,
    options,
  );

  let text = "";
  let functionCalls: ToolCallResult[] = [];
  let usageMetadata: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  } | null = null;
  let rawResponse: unknown;

  console.log(
    `[Gemini] Starting generation with model: ${model}, tools: ${options?.tools ? "yes" : "no"}`,
  );

  if (options?.onChunk) {
    // 流式生成
    const {
      text: streamText,
      functionCalls: streamCalls,
      usage,
      raw,
    } = await streamGeneration(
      client,
      model,
      contents,
      generationConfig,
      options.onChunk,
    );
    text = streamText;
    functionCalls = streamCalls;
    usageMetadata = usage;
    rawResponse = raw;
  } else {
    // 非流式生成
    const response = await client.models.generateContent({
      model,
      contents,
      config: generationConfig,
    });

    rawResponse = response;
    usageMetadata = response.usageMetadata || null;

    // 处理响应
    const candidate = response.candidates?.[0];
    const finishReason = candidate?.finishReason;

    // 检查错误原因
    handleFinishReason(finishReason, candidate?.finishMessage);

    // 提取工具调用
    if (candidate?.content?.parts) {
      const fcParts = candidate.content.parts.filter(
        (p: Part): p is Part & { functionCall: FunctionCall } =>
          p.functionCall !== undefined,
      );

      if (fcParts.length > 0) {
        functionCalls = fcParts.map((p, index) => ({
          id: `gemini_call_${p.functionCall.name}_${index}`,
          name: p.functionCall.name || "",
          args: (p.functionCall.args as Record<string, unknown>) || {},
        }));
      }
    }

    // 如果没有工具调用，提取文本
    if (functionCalls.length === 0 && candidate?.content?.parts) {
      const textParts = candidate.content.parts.filter(
        (p: Part): p is Part & { text: string } => p.text !== undefined,
      );
      text = textParts.map((p) => p.text).join("");
    }
  }

  const usage: TokenUsage = {
    promptTokens: usageMetadata?.promptTokenCount || 0,
    completionTokens: usageMetadata?.candidatesTokenCount || 0,
    totalTokens: usageMetadata?.totalTokenCount || 0,
  };

  console.log(`[Gemini] Generation complete. Usage:`, usage);

  // 如果有工具调用，返回工具调用结果
  if (functionCalls.length > 0) {
    return {
      result: { functionCalls },
      usage,
      raw: rawResponse,
    };
  }

  // 解析文本为 JSON (如果有 schema)
  if (text && schema) {
    const parsedResult = parseJSONResponse(text);
    return {
      result: parsedResult as Record<string, unknown>,
      usage,
      raw: rawResponse,
    };
  }

  // 返回纯文本或空结果
  return {
    result: text ? { narrative: text } : {},
    usage,
    raw: rawResponse,
  };
}

/**
 * 流式生成
 */
async function streamGeneration(
  client: GoogleGenAI,
  model: string,
  contents: Content[],
  config: GenerateContentConfig,
  onChunk: (text: string) => void,
): Promise<{
  text: string;
  functionCalls: ToolCallResult[];
  usage: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  } | null;
  raw: unknown;
}> {
  const stream = await client.models.generateContentStream({
    model,
    contents,
    config,
  });

  let text = "";
  const functionCalls: ToolCallResult[] = [];
  let usage: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  } | null = null;
  let lastChunk: unknown = null;
  let lastTextLength = 0; // 跟踪上次文本长度，用于计算增量

  for await (const chunk of stream) {
    lastChunk = chunk;

    // 收集文本 - 注意: chunk.text 返回的是累积的完整文本，不是增量
    // 我们需要计算增量来正确调用 onChunk
    const fullText = chunk.text || "";
    if (fullText.length > lastTextLength) {
      const deltaText = fullText.slice(lastTextLength);
      text = fullText; // 使用完整文本，不是累加
      lastTextLength = fullText.length;
      if (deltaText) {
        onChunk(deltaText);
      }
    }

    // 收集工具调用
    const candidate = chunk.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.functionCall) {
          functionCalls.push({
            id: `gemini_call_${part.functionCall.name}_${functionCalls.length}`,
            name: part.functionCall.name || "",
            args: (part.functionCall.args as Record<string, unknown>) || {},
          });
        }
      }
    }

    // 捕获使用量
    if (chunk.usageMetadata) {
      usage = chunk.usageMetadata;
    }
  }

  console.log(
    `[Gemini] Streaming complete. Text length: ${text.length}, FunctionCalls: ${functionCalls.length}`,
  );

  return { text, functionCalls, usage, raw: lastChunk };
}

/**
 * 处理完成原因
 */
function handleFinishReason(
  finishReason: string | undefined,
  finishMessage?: string,
): void {
  switch (finishReason) {
    case "SAFETY":
      throw new SafetyFilterError("gemini");
    case "RECITATION":
      throw new AIProviderError(
        "Content generation failed: Recitation check triggered",
        "gemini",
        "RECITATION",
      );
    case "MALFORMED_FUNCTION_CALL":
      throw new MalformedToolCallError(
        "gemini",
        finishMessage?.substring(0, 200),
      );
    case "OTHER":
      console.warn("Gemini generation finished with reason: OTHER");
      break;
  }
}

/**
 * 构建生成配置
 */
function buildGenerationConfig(
  systemInstruction: string,
  schema?: ZodTypeAny,
  options?: GenerateContentOptions,
): GenerateContentConfig {
  const config: GenerateContentConfig = {
    systemInstruction,
  };

  // JSON 模式配置 - 从 Zod 直接编译到 Gemini 格式
  if (schema && !options?.tools) {
    config.responseMimeType = "application/json";
    config.responseSchema = zodToGemini(schema);
    console.log("[Gemini] JSON mode enabled with schema");
  }

  // 工具配置 - 从 Zod 直接编译到 Gemini 格式
  if (options?.tools && options.tools.length > 0) {
    config.tools = [
      {
        functionDeclarations: options.tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          parameters: zodToGemini(tool.parameters),
        })),
      },
    ];
  }

  // 温度等参数 (非 thinking 模式)
  if (options?.temperature !== undefined) {
    config.temperature = options.temperature;
  }
  if (options?.topP !== undefined) {
    config.topP = options.topP;
  }
  if (options?.topK !== undefined) {
    config.topK = options.topK;
  }

  return config;
}

/**
 * 解析 JSON 响应
 */
function parseJSONResponse(text: string): unknown {
  console.log("[Gemini] Attempting to parse response as JSON, first 200 chars:", text.substring(0, 200));
  try {
    // 清理 markdown 代码块
    let cleaned = text.replace(/```json\n?|```/g, "").trim();
    // 压缩 JSON
    cleaned = cleaned.replace(/\n\s*/g, "").replace(/\s{2,}/g, " ");
    return JSON.parse(cleaned);
  } catch (error) {
    console.warn("[Gemini] Initial JSON parse failed, attempting repair...");

    try {
      let cleaned = text.replace(/```json\n?|```/g, "").trim();
      // 修复常见问题
      const repaired = cleaned
        .replace(/\n\s*/g, "")
        .replace(/\s{2,}/g, " ")
        .replace(/([{,]\s*)'([^']+)'(\s*:)/g, '$1"$2"$3')
        .replace(/,(\s*[}\]])/g, "$1");
      return JSON.parse(repaired);
    } catch (error2) {
      console.error("[Gemini] JSON parse failed completely. Full text:", text.substring(0, 500));
      throw new JSONParseError("gemini", text.substring(0, 500), error2);
    }
  }
}

// ============================================================================
// Image Generation
// ============================================================================

/**
 * 生成图片
 */
export async function generateImage(
  config: GeminiConfig,
  model: string,
  prompt: string,
  resolution: string = "1024x1024",
): Promise<ImageGenerationResponse> {
  const client = createGeminiClient(config);
  const aspectRatio = getAspectRatio(resolution);

  try {
    const response = await client.models.generateImages({
      model,
      prompt,
      config: {
        numberOfImages: 1,
        aspectRatio,
        outputMimeType: "image/jpeg",
        personGeneration: "allow_adult" as unknown as undefined,
      },
    });

    const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
    const url = imageBytes ? `data:image/jpeg;base64,${imageBytes}` : null;

    return {
      url,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      raw: response,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message.includes("429") ||
        error.message.includes("RESOURCE_EXHAUSTED")
      ) {
        console.warn("Gemini Image Generation Quota Exceeded");
        return { url: null, raw: error };
      }
    }
    throw error;
  }
}

// ============================================================================
// Video Generation
// ============================================================================

/**
 * 生成视频
 */
export async function generateVideo(
  config: GeminiConfig,
  model: string,
  imageBase64: string,
  prompt: string,
): Promise<VideoGenerationResponse> {
  const client = createGeminiClient(config);

  const [header, data] = imageBase64.split(",");
  const mimeType = header.match(/:(.*?);/)?.[1] || "image/jpeg";

  let operation = await client.models.generateVideos({
    model,
    prompt,
    image: {
      imageBytes: data,
      mimeType,
    },
    config: {
      numberOfVideos: 1,
      resolution: "720p",
      aspectRatio: "16:9",
    },
  });

  // 轮询等待完成
  while (!operation.done) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    operation = await client.operations.getVideosOperation({ operation });
  }

  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!videoUri) {
    throw new AIProviderError("No video URI returned", "gemini");
  }

  const response = await fetch(`${videoUri}&key=${config.apiKey}`);
  const blob = await response.blob();

  return {
    url: URL.createObjectURL(blob),
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    raw: operation,
  };
}

// ============================================================================
// Speech Generation
// ============================================================================

/**
 * 生成语音
 */
export async function generateSpeech(
  config: GeminiConfig,
  model: string,
  text: string,
  voiceName: string = "Kore",
  options?: SpeechGenerationOptions,
): Promise<SpeechGenerationResponse> {
  const client = createGeminiClient(config);

  // 构建带语气的文本
  let processedText = text;
  if (options?.instructions) {
    processedText = `Say in a ${options.instructions} tone: "${text}"`;
  }

  // 使用 TTS 模型
  const ttsModel = model.includes("tts")
    ? model
    : "gemini-2.5-flash-preview-tts";

  const response = await client.models.generateContent({
    model: ttsModel,
    contents: [{ parts: [{ text: processedText }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  });

  const base64Audio =
    response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
    throw new AIProviderError("No audio content generated", "gemini");
  }

  const usage: TokenUsage = {
    promptTokens: response.usageMetadata?.promptTokenCount || 0,
    completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
    totalTokens: response.usageMetadata?.totalTokenCount || 0,
  };

  // 将 base64 转换为 ArrayBuffer
  const audioBuffer = decodeBase64ToBuffer(base64Audio);

  return { audio: audioBuffer, usage, raw: response };
}

/**
 * 解码 base64 到 ArrayBuffer，自动处理 PCM -> WAV 转换
 */
function decodeBase64ToBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // 检查是否为 WAV 或 MP3
  const isWav =
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46;
  const isMp3 =
    (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) ||
    (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);

  if (isWav || isMp3) {
    return bytes.buffer;
  }

  // 如果是 PCM，添加 WAV 头
  return wrapPCMInWAV(bytes);
}

/**
 * 为 PCM 数据添加 WAV 头
 */
function wrapPCMInWAV(pcmData: Uint8Array): ArrayBuffer {
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;

  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + pcmData.length, true);
  writeString(view, 8, "WAVE");

  // fmt chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
  view.setUint16(32, numChannels * (bitsPerSample / 8), true);
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  writeString(view, 36, "data");
  view.setUint32(40, pcmData.length, true);

  // 合并 header 和 data
  const wavBytes = new Uint8Array(wavHeader.byteLength + pcmData.byteLength);
  wavBytes.set(new Uint8Array(wavHeader), 0);
  wavBytes.set(pcmData, wavHeader.byteLength);

  return wavBytes.buffer;
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// ============================================================================
// Embedding Generation
// ============================================================================

/**
 * 获取嵌入模型列表
 */
export async function getEmbeddingModels(
  config: GeminiConfig,
): Promise<EmbeddingModelInfo[]> {
  try {
    const client = createGeminiClient(config);
    const response = await client.models.list();

    const embeddingModels: EmbeddingModelInfo[] = [];
    for await (const model of response) {
      const name = model.name.toLowerCase();
      if (name.includes("embed") || name.includes("text-embedding")) {
        embeddingModels.push({
          id: model.name.replace("models/", ""),
          name: model.displayName || model.name,
          dimensions: 768, // Gemini 默认维度
        });
      }
    }

    if (embeddingModels.length === 0) {
      return getDefaultEmbeddingModels();
    }

    return embeddingModels;
  } catch (error) {
    console.warn("Failed to list Gemini embedding models:", error);
    return getDefaultEmbeddingModels();
  }
}

/**
 * 默认嵌入模型列表
 */
function getDefaultEmbeddingModels(): EmbeddingModelInfo[] {
  return [
    {
      id: "gemini-embedding-001",
      name: "Gemini Embedding 001",
      dimensions: 768,
    },
  ];
}

/**
 * 生成嵌入向量
 */
export async function generateEmbedding(
  config: GeminiConfig,
  modelId: string,
  texts: string[],
  dimensions?: number,
  _taskType?: EmbeddingTaskType,
): Promise<EmbeddingResponse> {
  const client = createGeminiClient(config);

  // Gemini SDK 需要逐个处理文本
  const promises = texts.map(async (text) => {
    const result = await client.models.embedContent({
      model: modelId,
      contents: [{ parts: [{ text }] }],
      config: {
        outputDimensionality: dimensions,
      },
    });
    return result.embeddings?.[0];
  });

  const embeddingsResult = await Promise.all(promises);

  const embeddings = embeddingsResult.map((e) => {
    const values = (e as { values?: number[] })?.values || [];
    return new Float32Array(values);
  });

  return {
    embeddings,
    usage: {
      promptTokens: texts.reduce((acc, t) => acc + Math.ceil(t.length / 4), 0),
      totalTokens: texts.reduce((acc, t) => acc + Math.ceil(t.length / 4), 0),
    },
  };
}

// ============================================================================
// Re-exports for Backward Compatibility
// ============================================================================

export type {
  GeminiConfig,
  ModelInfo,
  GenerateContentOptions,
  ImageGenerationResponse,
  VideoGenerationResponse,
  SpeechGenerationResponse,
  SpeechGenerationOptions,
  EmbeddingModelInfo,
  EmbeddingResponse,
};

// Alias for backward compatibility
export type { EmbeddingResponse as EmbeddingResult };
