/**
 * ============================================================================
 * OpenAI Provider - OpenAI SDK 实现
 * ============================================================================
 *
 * 使用官方 openai SDK，提供完整的类型安全支持。
 * 包括：内容生成、图片生成、语音合成、嵌入向量生成
 */

import OpenAI from "openai";
import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionToolMessageParam,
  ChatCompletionAssistantMessageParam,
} from "openai/resources/chat/completions";
import type { ImagesResponse } from "openai/resources/images";

import type { EmbeddingTaskType, TokenUsage } from "../../types";
import { parseModelCapabilities } from "../modelUtils";

import {
  OpenAIConfig,
  ModelInfo,
  ModelCapabilities,
  GenerateContentOptions,
  ImageGenerationResponse,
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
  JSONParseError,
  AIProviderError,
  MalformedToolCallError,
} from "./types";
import {
  compileToolsForOpenAI,
  createOpenAITool,
  zodToOpenAIResponseFormat,
  zodToOpenAISchema,
  zodToGemini,
  createGeminiTool,
  isGeminiModel,
} from "../zodCompiler";
import type { ZodTypeAny } from "zod";

// ============================================================================
// Response Types (兼容旧 API)
// ============================================================================

/** 内容生成响应 (兼容格式) */
export interface OpenAIContentGenerationResponse {
  result: { functionCalls?: ToolCallResult[] } | Record<string, unknown>;
  usage: TokenUsage;
  raw:
    | ChatCompletion
    | ChatCompletionChunk
    | AsyncIterable<ChatCompletionChunk>;
}

// ============================================================================
// Client Factory
// ============================================================================

/**
 * 创建 OpenAI 客户端实例
 */
export function createOpenAIClient(config: OpenAIConfig): OpenAI {
  return new OpenAI({
    apiKey: config.apiKey || "dummy", // SDK 需要 key，即使是自定义端点
    baseURL: config.baseUrl,
    dangerouslyAllowBrowser: true,
  });
}

// ============================================================================
// Connection Validation
// ============================================================================

/**
 * 验证 OpenAI API 连接
 */
export async function validateConnection(config: OpenAIConfig): Promise<void> {
  try {
    const client = createOpenAIClient(config);
    await client.models.list();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new AIProviderError(
      `Failed to connect to OpenAI API: ${message}`,
      "openai",
      undefined,
      error,
    );
  }
}

// ============================================================================
// Model Listing
// ============================================================================

/**
 * 获取可用的 OpenAI 模型列表
 */
export async function getModels(config: OpenAIConfig): Promise<ModelInfo[]> {
  try {
    const client = createOpenAIClient(config);
    const list = await client.models.list();

    return list.data.map((m) => {
      const id = m.id.toLowerCase();
      const capabilities = inferModelCapabilities(
        id,
        m as unknown as { id: string; [key: string]: unknown },
      );

      return {
        id: m.id,
        name: m.id,
        capabilities,
      };
    });
  } catch (error) {
    console.warn("Failed to list OpenAI models:", error);
    return getDefaultModels();
  }
}

/**
 * 根据模型 ID 推断能力
 */
function inferModelCapabilities(
  id: string,
  modelData: { id: string; [key: string]: unknown },
): ModelCapabilities {
  const capabilities: ModelCapabilities = {
    text: false,
    image: false,
    video: false,
    audio: false,
    tools: false,
    parallelTools: false,
  };

  // 尝试从模型数据解析能力
  const parsedCaps = parseModelCapabilities(modelData);
  if (parsedCaps.text) capabilities.text = true;
  if (parsedCaps.image) capabilities.image = true;
  if (parsedCaps.audio) capabilities.audio = true;
  if (parsedCaps.video) capabilities.video = true;
  if (parsedCaps.tools) capabilities.tools = true;
  if (parsedCaps.parallelTools) capabilities.parallelTools = true;

  // 基于 ID 的启发式推断
  const hasExplicitInfo =
    capabilities.text ||
    capabilities.image ||
    capabilities.video ||
    capabilities.audio;

  if (!hasExplicitInfo) {
    // 图片模型
    if (
      id.includes("dall-e") ||
      id.includes("stable-diffusion") ||
      id.includes("flux") ||
      id.includes("midjourney") ||
      id.includes("image")
    ) {
      capabilities.image = true;
    }
    // 音频模型
    else if (
      id.includes("tts") ||
      id.includes("whisper") ||
      id.includes("audio")
    ) {
      capabilities.audio = true;
    }
    // 视频模型
    else if (
      id.includes("sora") ||
      id.includes("video") ||
      id.includes("runway") ||
      id.includes("luma")
    ) {
      capabilities.video = true;
    }
    // 文本模型 (默认)
    else {
      capabilities.text = true;
      // GPT 模型支持工具
      if (
        id.startsWith("gpt") ||
        id.includes("claude") ||
        id.includes("gemini")
      ) {
        capabilities.tools = true;
        capabilities.parallelTools = true;
      }
    }
  }

  return capabilities;
}

/**
 * 默认模型列表
 */
function getDefaultModels(): ModelInfo[] {
  return [
    {
      id: "gpt-4o",
      name: "GPT-4o",
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
      id: "gpt-4-turbo",
      name: "GPT-4 Turbo",
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
      id: "gpt-3.5-turbo",
      name: "GPT-3.5 Turbo",
      capabilities: {
        text: true,
        image: false,
        video: false,
        audio: false,
        tools: true,
        parallelTools: true,
      },
    },
  ];
}

// ============================================================================
// Content Generation
// ============================================================================

/**
 * 生成内容（对话/工具调用）
 */
export async function generateContent(
  config: OpenAIConfig,
  model: string,
  systemInstruction: string,
  contents: UnifiedMessage[],
  schema?: ZodTypeAny,
  options?: GenerateContentOptions,
): Promise<OpenAIContentGenerationResponse> {
  const client = createOpenAIClient(config);

  // 检测是否为 Gemini 模型
  const isGemini = isGeminiModel(model);

  // 转换消息格式
  const messages = convertToOpenAIMessages(systemInstruction, contents);

  // 转换工具定义 - 如果是 Gemini 模型，使用 Gemini 格式
  const tools = options?.tools
    ? isGemini
      ? options.tools.map((t) =>
          createGeminiTool(t.name, t.description, t.parameters),
        )
      : compileToolsForOpenAI(options.tools)
    : undefined;

  // 构建请求参数
  const requestParams: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
    model,
    messages,
    temperature: options?.temperature ?? 1.0,
    top_p: options?.topP,
    stream: !!options?.onChunk,
    // @ts-ignore
    tools,
    tool_choice: tools ? "auto" : undefined,

    // 如果是 Gemini 模型且有 schema，使用 Gemini schema 格式
    response_format: schema
      ? isGemini
        ? ({ type: "json_schema", schema: zodToGemini(schema) } as any)
        : zodToOpenAIResponseFormat(schema)
      : undefined,
  };

  let content = "";
  let toolCalls: ToolCallResult[] = [];
  let usage: TokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };
  let rawResponse:
    | ChatCompletion
    | ChatCompletionChunk
    | AsyncIterable<ChatCompletionChunk>;

  console.log(
    `[OpenAI] Starting generation with model: ${model}, stream: ${!!options?.onChunk}, tools: ${tools ? "yes" : "no"}, isGemini: ${isGemini}`,
  );

  if (isGemini && schema) {
    console.log(
      "[OpenAI] Detected Gemini model, using Gemini schema format:",
      JSON.stringify(requestParams.response_format, null, 2),
    );
  }

  if (options?.onChunk) {
    // 流式生成
    const response = await client.chat.completions.create({
      ...requestParams,
      stream: true,
    });

    rawResponse = response;

    // 累积工具调用信息
    const accumulatedToolCalls: Map<
      number,
      { id: string; name: string; arguments: string }
    > = new Map();

    for await (const chunk of response) {
      const choice = chunk.choices[0];
      const delta = choice?.delta;

      // 处理文本内容
      if (delta?.content) {
        content += delta.content;
        options.onChunk(delta.content);
      }

      // 处理工具调用 (流式模式下工具调用是增量传输的)
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const index = tc.index ?? 0;
          const existing = accumulatedToolCalls.get(index);
          if (existing) {
            // 累加参数
            if (tc.function?.arguments) {
              existing.arguments += tc.function.arguments;
            }
          } else {
            // 新工具调用
            accumulatedToolCalls.set(index, {
              id: tc.id || `tool_${index}`,
              name: tc.function?.name || "",
              arguments: tc.function?.arguments || "",
            });
          }
        }
      }

      // 更新使用量
      if (chunk.usage) {
        usage = {
          promptTokens: chunk.usage.prompt_tokens || 0,
          completionTokens: chunk.usage.completion_tokens || 0,
          totalTokens: chunk.usage.total_tokens || 0,
          cacheRead: chunk.usage.prompt_tokens_details?.cached_tokens || 0,
        };
      }
    }

    // 解析累积的工具调用
    for (const [, tc] of accumulatedToolCalls) {
      try {
        toolCalls.push({
          id: tc.id,
          name: tc.name,
          args: JSON.parse(tc.arguments || "{}") as Record<string, unknown>,
        });
      } catch (parseError) {
        console.error(
          `[OpenAI] Failed to parse tool call arguments:`,
          tc.arguments,
        );
        throw new MalformedToolCallError("openai", tc.name, tc.arguments);
      }
    }
  } else {
    // 非流式生成
    const response = await client.chat.completions.create({
      ...requestParams,
      stream: false,
    });

    rawResponse = response;
    const message = response.choices[0]?.message;
    content = message?.content || "";

    // 处理工具调用
    if (message?.tool_calls) {
      toolCalls = message.tool_calls.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments) as Record<string, unknown>,
      }));
    }

    // 检查内容过滤
    const finishReason = response.choices[0]?.finish_reason;
    if (finishReason === "content_filter") {
      throw new SafetyFilterError("openai");
    }

    usage = {
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
      cacheRead: response.usage?.prompt_tokens_details?.cached_tokens || 0,
    };
  }

  console.log(`[OpenAI] Generation complete. Usage:`, usage);

  // 如果有工具调用，返回工具调用结果
  if (toolCalls.length > 0) {
    return {
      result: { functionCalls: toolCalls },
      usage,
      raw: rawResponse,
    };
  }

  // 没有内容也没有工具调用
  if (!content) {
    throw new AIProviderError("No content returned from OpenAI", "openai");
  }

  // 解析 JSON
  try {
    const cleanedContent = content.replace(/```json\n?|```/g, "").trim();
    const result = JSON.parse(cleanedContent);
    return { result, usage, raw: rawResponse };
  } catch (error) {
    // 如果有 schema 但解析失败
    if (schema) {
      console.error(`[OpenAI] Failed to parse JSON content:`, content);
      throw new JSONParseError("openai", content.substring(0, 500), error);
    }
    // 返回纯文本
    return { result: { narrative: content }, usage, raw: rawResponse };
  }
}

/**
 * 转换消息到 OpenAI 格式
 */
function convertToOpenAIMessages(
  systemInstruction: string,
  messages: UnifiedMessage[],
): ChatCompletionMessageParam[] {
  const result: ChatCompletionMessageParam[] = [
    { role: "system", content: systemInstruction },
  ];

  for (const msg of messages) {
    // 处理工具响应消息
    if (msg.role === "tool") {
      for (const part of msg.content) {
        if (part.type === "tool_response") {
          const tr = part as ToolResponseContentPart;
          const toolMsg: ChatCompletionToolMessageParam = {
            role: "tool",
            tool_call_id: tr.toolCallId,
            content:
              typeof tr.content === "string"
                ? tr.content
                : JSON.stringify(tr.content),
          };
          result.push(toolMsg);
        }
      }
      continue;
    }

    // 处理助手消息（可能包含工具调用）
    if (msg.role === "assistant") {
      const toolCallParts = msg.content.filter(
        (p): p is ToolCallContentPart => p.type === "tool_call",
      );

      if (toolCallParts.length > 0) {
        const textContent = msg.content
          .filter((p): p is TextContentPart => p.type === "text")
          .map((p) => p.text)
          .join("\n");

        const assistantMsg: ChatCompletionAssistantMessageParam = {
          role: "assistant",
          content: textContent || null,
          tool_calls: toolCallParts.map((p) => ({
            id: p.id,
            type: "function" as const,
            function: {
              name: p.name,
              arguments: JSON.stringify(p.arguments),
            },
          })),
        };
        result.push(assistantMsg);
        continue;
      }
    }

    // 处理普通文本消息
    const textContent = msg.content
      .filter((p): p is TextContentPart => p.type === "text")
      .map((p) => p.text)
      .join("\n");

    result.push({
      role: msg.role as "user" | "assistant",
      content: textContent,
    });
  }

  return result;
}

// ============================================================================
// Image Generation
// ============================================================================

/**
 * 生成图片
 */
export async function generateImage(
  config: OpenAIConfig,
  model: string,
  prompt: string,
  resolution: string = "1024x1024",
): Promise<ImageGenerationResponse> {
  const client = createOpenAIClient(config);

  // 确定图片尺寸
  const size = determineImageSize(model, resolution);

  const response: ImagesResponse = await client.images.generate({
    model: model || "dall-e-3",
    prompt,
    n: 1,
    size: size as
      | "256x256"
      | "512x512"
      | "1024x1024"
      | "1792x1024"
      | "1024x1792",
    response_format: "b64_json",
  });

  const b64 = response.data[0]?.b64_json;
  const url = b64 ? `data:image/png;base64,${b64}` : null;

  return {
    url,
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    raw: response,
  };
}

/**
 * 确定图片尺寸
 */
function determineImageSize(model: string, resolution: string): string {
  if (model?.includes("dall-e-3")) {
    // 纵向
    if (["832x1248", "864x1184", "896x1152", "768x1344"].includes(resolution)) {
      return "1024x1792";
    }
    // 横向
    if (
      ["1248x832", "1184x864", "1152x896", "1344x768", "1536x672"].includes(
        resolution,
      )
    ) {
      return "1792x1024";
    }
    // 正方形
    return "1024x1024";
  }

  // DALL-E 2 只支持正方形
  return "1024x1024";
}

// ============================================================================
// Video Generation (Not Supported)
// ============================================================================

/**
 * 生成视频 (OpenAI 暂不支持)
 */
export async function generateVideo(
  _config: OpenAIConfig,
  _model: string,
  _imageBase64: string,
  _prompt: string,
): Promise<never> {
  throw new AIProviderError(
    "Video generation is not supported by OpenAI provider",
    "openai",
    "UNSUPPORTED",
  );
}

// ============================================================================
// Speech Generation
// ============================================================================

/**
 * 生成语音
 */
export async function generateSpeech(
  config: OpenAIConfig,
  model: string,
  text: string,
  voiceName: string = "alloy",
  options?: SpeechGenerationOptions,
): Promise<SpeechGenerationResponse> {
  const client = createOpenAIClient(config);

  const requestBody: OpenAI.Audio.SpeechCreateParams = {
    model: model || "tts-1",
    input: text,
    voice: voiceName as
      | "alloy"
      | "echo"
      | "fable"
      | "onyx"
      | "nova"
      | "shimmer",
    response_format: options?.format || "mp3",
    speed: options?.speed || 1.0,
  };

  const response = await client.audio.speech.create(requestBody);

  const buffer = await response.arrayBuffer();

  return {
    audio: buffer,
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  };
}

// ============================================================================
// Embedding Generation
// ============================================================================

/**
 * 获取嵌入模型列表
 */
export async function getEmbeddingModels(
  config: OpenAIConfig,
): Promise<EmbeddingModelInfo[]> {
  try {
    const client = createOpenAIClient(config);
    const list = await client.models.list();

    const embeddingModels: EmbeddingModelInfo[] = [];

    for (const model of list.data) {
      const id = model.id.toLowerCase();

      if (id !== "text-embedding-3-small" && id !== "text-embedding-3-large") {
        continue;
      }

      let dimension = 1536;
      if (id === "text-embedding-3-large") {
        dimension = 3072;
      }

      let knownContextLength = 8192;
      if (isEmbeddingModel(id)) {
        embeddingModels.push({
          id: model.id,
          name: model.id,
          dimensions: dimension,
          contextLength: 8192,
        });
      }
    }

    if (embeddingModels.length === 0) {
      return getDefaultEmbeddingModels();
    }

    return embeddingModels;
  } catch (error) {
    console.warn("Failed to list OpenAI embedding models:", error);
    return getDefaultEmbeddingModels();
  }
}

/**
 * 判断是否为嵌入模型
 */
function isEmbeddingModel(id: string): boolean {
  return (
    id.includes("embed") ||
    id.includes("bert") ||
    id.includes("nomic") ||
    id.includes("gecko") ||
    id.includes("bge") ||
    id.includes("gte") ||
    id.includes("e5") ||
    id.includes("paraphrase")
  );
}

/**
 * 猜测嵌入维度
 */
function guessEmbeddingDimensions(id: string): number {
  if (id.includes("text-embedding-3-small")) return 1536;
  if (id.includes("text-embedding-3-large")) return 3072;
  if (id.includes("small") || id.includes("light")) return 384;
  if (id.includes("base")) return 768;
  if (id.includes("large")) return 1024;
  if (id.includes("nomic-embed")) return 768;
  if (id.includes("gecko")) return 768;
  return 1536; // 默认 text-embedding-ada-002
}

/**
 * 默认嵌入模型列表
 */
function getDefaultEmbeddingModels(): EmbeddingModelInfo[] {
  return [
    {
      id: "text-embedding-3-small",
      name: "Text Embedding 3 Small",
      dimensions: 1536,
    },
    {
      id: "text-embedding-3-large",
      name: "Text Embedding 3 Large",
      dimensions: 3072,
    },
    {
      id: "text-embedding-ada-002",
      name: "Text Embedding Ada 002",
      dimensions: 1536,
    },
  ];
}

/**
 * 生成嵌入向量
 */
export async function generateEmbedding(
  config: OpenAIConfig,
  modelId: string,
  texts: string[],
  dimensions?: number,
  _taskType?: EmbeddingTaskType,
): Promise<EmbeddingResponse> {
  const client = createOpenAIClient(config);

  const params: OpenAI.Embeddings.EmbeddingCreateParams = {
    model: modelId,
    input: texts,
    encoding_format: "float",
  };

  if (dimensions) {
    params.dimensions = dimensions;
  }

  const response = await client.embeddings.create(params);

  const embeddings = response.data
    .sort((a, b) => a.index - b.index)
    .map((item) => new Float32Array(item.embedding));

  return {
    embeddings,
    usage: {
      promptTokens: response.usage?.prompt_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
    },
  };
}

// ============================================================================
// Re-exports for Backward Compatibility
// ============================================================================

export type {
  OpenAIConfig,
  ModelInfo,
  GenerateContentOptions,
  ImageGenerationResponse,
  SpeechGenerationResponse,
  SpeechGenerationOptions,
  EmbeddingModelInfo,
  EmbeddingResponse,
};

// Alias for backward compatibility
export type { EmbeddingResponse as EmbeddingResult };
