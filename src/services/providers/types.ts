/**
 * ============================================================================
 * Provider Types - 统一的 AI Provider 类型定义
 * ============================================================================
 *
 * 此文件定义了所有 AI Provider 共享的类型接口，确保类型安全，
 * 避免使用 any 类型，提供一致的 API 体验。
 */

import type { TokenUsage, ModelInfo as BaseModelInfo } from "../../types";

// ============================================================================
// Provider Configuration Types
// ============================================================================

/** Gemini Provider 配置 */
export interface GeminiConfig {
  apiKey: string;
  baseUrl?: string;
}

/** OpenAI Provider 配置 */
export interface OpenAIConfig {
  apiKey: string;
  baseUrl: string;
  modelId?: string;
  geminiCompatibility?: boolean;
  geminiMessageFormat?: boolean; // 是否转换消息格式为 Gemini 原生格式
  claudeCompatibility?: boolean;
  claudeMessageFormat?: boolean; // 是否转换消息格式为 Claude 原生格式
}

/** OpenRouter Provider 配置 */
export interface OpenRouterConfig {
  apiKey: string;
}

/** Claude Provider 配置 */
export interface ClaudeConfig {
  apiKey: string;
  baseUrl?: string;
}

/** 所有 Provider 配置的联合类型 */
export type ProviderConfig =
  | GeminiConfig
  | OpenAIConfig
  | OpenRouterConfig
  | ClaudeConfig;

// ============================================================================
// Model Information Types
// ============================================================================

/** 模型能力 */
export interface ModelCapabilities {
  text: boolean;
  image: boolean;
  video: boolean;
  audio: boolean;
  tools: boolean;
  parallelTools: boolean;
}

/** 扩展的模型信息 */
export interface ModelInfo extends BaseModelInfo {
  capabilities?: ModelCapabilities;
}

// ============================================================================
// Content Generation Types
// ============================================================================

/** 内容生成选项 */
export interface GenerateContentOptions {
  /** Gemini Thinking 模式级别 */
  thinkingLevel?: "low" | "medium" | "high";
  /** 媒体分辨率 (Gemini Vision) */
  mediaResolution?: "low" | "medium" | "high";
  /** 生成温度 (0-2) */
  temperature?: number;
  /** Top-P 采样 */
  topP?: number;
  /** Top-K 采样 */
  topK?: number;
  /** Min-P 采样 (OpenRouter) */
  minP?: number;
  /** 流式输出回调 */
  onChunk?: (text: string) => void;
  /** 工具定义列表 (使用 Zod Schema) */
  tools?: ZodToolDefinition[];
}

import type { ZodTypeAny, ZodObject, ZodRawShape, z } from "zod";

/**
 * 类型安全的工具定义 - 使用泛型保留完整的 Schema 类型信息
 *
 * @template TParams - Zod object schema 的类型
 */
export interface TypedToolDefinition<
  TParams extends ZodObject<ZodRawShape> = ZodObject<ZodRawShape>,
> {
  name: string;
  description: string;
  parameters: TParams;
}

/**
 * 从 TypedToolDefinition 推断参数类型
 */
export type InferToolParams<T> =
  T extends TypedToolDefinition<infer TParams> ? z.infer<TParams> : never;

/**
 * 工具/函数定义 (运行时兼容类型，用于传递给 API)
 * @deprecated 内部使用 TypedToolDefinition 以保持类型安全
 */
export interface ZodToolDefinition {
  name: string;
  description: string;
  parameters: ZodTypeAny;
}

// ============================================================================
// Message Types (对话)
// ============================================================================

/** 消息角色 */
export type MessageRole = "system" | "user" | "assistant" | "tool";

/** 文本内容部分 */
export interface TextContentPart {
  type: "text";
  text: string;
}

/** 图片内容部分 */
export interface ImageContentPart {
  type: "image";
  mimeType: string;
  data: string; // base64
}

/** 工具调用部分 */
export interface ToolCallContentPart {
  type: "tool_use";
  toolUse: {
    id: string;
    name: string;
    args: Record<string, unknown>;
  };
}

/** 工具响应部分 */
export interface ToolResponseContentPart {
  type: "tool_result";
  toolResult: {
    id: string;
    name: string;
    content: unknown;
    isError?: boolean;
  };
}

/** 消息内容部分 */
export type ContentPart =
  | TextContentPart
  | ImageContentPart
  | ToolCallContentPart
  | ToolResponseContentPart;

/** 统一消息格式 */
export interface UnifiedMessage {
  role: MessageRole;
  content: ContentPart[];
}

// ============================================================================
// Function/Tool Call Types
// ============================================================================

/** 工具调用结果 */
export interface ToolCallResult {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

/** 生成结果 - 工具调用 */
export interface GenerationResultWithToolCalls {
  type: "tool_calls";
  toolCalls: ToolCallResult[];
}

/** 生成结果 - 文本/JSON */
export interface GenerationResultWithContent {
  type: "content";
  content: unknown;
}

/** 统一生成结果 */
export type GenerationResult =
  | GenerationResultWithToolCalls
  | GenerationResultWithContent;

// ============================================================================
// API Response Types
// ============================================================================

/** 内容生成响应 */
export interface ContentGenerationResponse {
  result: GenerationResult;
  usage: TokenUsage;
  raw: unknown;
}

/** 图片生成响应 */
export interface ImageGenerationResponse {
  url: string | null;
  usage?: TokenUsage;
  raw?: unknown;
}

/** 视频生成响应 */
export interface VideoGenerationResponse {
  url: string;
  usage?: TokenUsage;
  raw?: unknown;
}

/** 语音生成响应 */
export interface SpeechGenerationResponse {
  audio: ArrayBuffer;
  usage?: TokenUsage;
  raw?: unknown;
}

/** 语音生成选项 */
export interface SpeechGenerationOptions {
  speed?: number;
  format?: SpeechFormat;
  instructions?: string;
}

export type SpeechFormat = "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm";

// ============================================================================
// Embedding Types
// ============================================================================

/** 嵌入模型信息 */
export interface EmbeddingModelInfo {
  id: string;
  name: string;
  dimensions?: number;
  contextLength?: number;
}

/** 嵌入任务类型 */
export type EmbeddingTaskType =
  | "retrieval_document"
  | "retrieval_query"
  | "semantic_similarity"
  | "classification"
  | "clustering";

/** 嵌入生成响应 */
export interface EmbeddingResponse {
  embeddings: Float32Array[];
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

// ============================================================================
// Provider Interface (可选，用于标准化 Provider 实现)
// ============================================================================

/** Provider 接口定义 */
export interface AIProvider<TConfig extends ProviderConfig> {
  /** 验证连接 */
  validateConnection(config: TConfig): Promise<void>;

  /** 获取可用模型列表 */
  getModels(config: TConfig): Promise<ModelInfo[]>;

  /** 生成内容 (对话/工具调用) */
  generateContent(
    config: TConfig,
    model: string,
    systemInstruction: string,
    messages: UnifiedMessage[],
    schema?: ZodTypeAny,
    options?: GenerateContentOptions,
  ): Promise<ContentGenerationResponse>;

  /** 生成图片 */
  generateImage?(
    config: TConfig,
    model: string,
    prompt: string,
    resolution?: string,
  ): Promise<ImageGenerationResponse>;

  /** 生成视频 */
  generateVideo?(
    config: TConfig,
    model: string,
    imageBase64: string,
    prompt: string,
  ): Promise<VideoGenerationResponse>;

  /** 生成语音 */
  generateSpeech?(
    config: TConfig,
    model: string,
    text: string,
    voiceName?: string,
    options?: SpeechGenerationOptions,
  ): Promise<SpeechGenerationResponse>;

  /** 获取嵌入模型列表 */
  getEmbeddingModels?(config: TConfig): Promise<EmbeddingModelInfo[]>;

  /** 生成嵌入向量 */
  generateEmbedding?(
    config: TConfig,
    model: string,
    texts: string[],
    dimensions?: number,
    taskType?: EmbeddingTaskType,
  ): Promise<EmbeddingResponse>;
}

// ============================================================================
// Utility Types
// ============================================================================

/** 分辨率到宽高比映射 */
export type AspectRatio =
  | "1:1"
  | "2:3"
  | "3:2"
  | "3:4"
  | "4:3"
  | "4:5"
  | "5:4"
  | "9:16"
  | "16:9"
  | "21:9";

/** 分辨率字符串 */
export type Resolution =
  | "1024x1024"
  | "832x1248"
  | "1248x832"
  | "864x1184"
  | "1184x864"
  | "896x1152"
  | "1152x896"
  | "768x1344"
  | "1344x768"
  | "1536x672";

/** 分辨率到宽高比的映射表 */
export const RESOLUTION_TO_ASPECT_RATIO: Record<Resolution, AspectRatio> = {
  "1024x1024": "1:1",
  "832x1248": "2:3",
  "1248x832": "3:2",
  "864x1184": "3:4",
  "1184x864": "4:3",
  "896x1152": "4:5",
  "1152x896": "5:4",
  "768x1344": "9:16",
  "1344x768": "16:9",
  "1536x672": "21:9",
};

/** 获取宽高比 */
export function getAspectRatio(resolution: string): AspectRatio {
  return RESOLUTION_TO_ASPECT_RATIO[resolution as Resolution] || "1:1";
}

// ============================================================================
// Error Types
// ============================================================================

/** AI Provider 错误 */
export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly code?: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}

/** 安全过滤器错误 */
export class SafetyFilterError extends AIProviderError {
  constructor(provider: string, cause?: unknown) {
    super(
      "Content generation blocked by safety filter",
      provider,
      "SAFETY",
      cause,
    );
    this.name = "SafetyFilterError";
  }
}

/** 工具调用格式错误 */
export class MalformedToolCallError extends AIProviderError {
  constructor(provider: string, details?: string, cause?: unknown) {
    super(
      `Malformed function call${details ? `: ${details}` : ""}`,
      provider,
      "MALFORMED_TOOL_CALL",
      cause,
    );
    this.name = "MalformedToolCallError";
  }
}

/** 资源配额耗尽错误 */
export class QuotaExhaustedError extends AIProviderError {
  constructor(provider: string, cause?: unknown) {
    super("API quota exhausted", provider, "QUOTA_EXHAUSTED", cause);
    this.name = "QuotaExhaustedError";
  }
}

/** JSON 解析错误 */
export class JSONParseError extends AIProviderError {
  constructor(provider: string, content: string, cause?: unknown) {
    super(
      "Failed to parse AI response as JSON",
      provider,
      "JSON_PARSE_ERROR",
      cause,
    );
    this.name = "JSONParseError";
  }
}

/** Schema 验证错误 */
export class SchemaValidationError extends AIProviderError {
  constructor(provider: string, details?: string, cause?: unknown) {
    super(
      `Schema validation failed${details ? `: ${details}` : ""}`,
      provider,
      "SCHEMA_VALIDATION_ERROR",
      cause,
    );
    this.name = "SchemaValidationError";
  }
}
