/**
 * ============================================================================
 * OpenAI Provider - OpenAI SDK 实现
 * ============================================================================
 *
 * 使用官方 openai SDK，提供完整的类型安全支持。
 * 包括：内容生成、图片生成、语音合成、嵌入向量生成
 */

import { jsonrepair } from "jsonrepair";
import OpenAI from "openai";
import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionToolMessageParam,
  ChatCompletionAssistantMessageParam,
  ChatCompletionDeveloperMessageParam,
  ChatCompletionMessageFunctionToolCall,
  ChatCompletionContentPart,
} from "openai/resources/chat/completions";
import type { ImagesResponse } from "openai/resources/images";

import type {
  EmbeddingTaskType,
  TokenUsage,
  JsonObject,
  ToolArguments,
} from "../../types";
import { parseModelCapabilities } from "../modelUtils";
import { resolveTokenBudget } from "../tokenBudgetManager";

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
  ImageContentPart,
  ToolCallContentPart,
  ToolResponseContentPart,
  ReasoningContentPart,
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
  zodToGeminiCompatibleSchema,
  createGeminiCompatibleTool,
  createClaudeCompatibleTool,
  zodToClaudeCompatibleSchema,
  isGeminiModel,
  isClaudeModel,
} from "../zodCompiler";
import type { ZodTypeAny } from "zod";
import { withRetry, validateSchema, cleanJsonContent } from "./utils";

// ============================================================================
// Response Types (兼容旧 API)
// ============================================================================

/** 内容生成响应 (兼容格式) */
export interface OpenAIContentGenerationResponse {
  result: { functionCalls?: ToolCallResult[] } | JsonObject;
  usage: TokenUsage;
  raw:
    | ChatCompletion
    | ChatCompletionChunk
    | AsyncIterable<ChatCompletionChunk>;
}

interface OpenAIToolResultPayload {
  functionCalls: ToolCallResult[];
  content?: string;
  _reasoning?: string;
}

interface OpenAINarrativePayload {
  narrative: string;
  _reasoning?: string;
}

type OpenAIReasoningEffort = "minimal" | "low" | "medium" | "high" | "xhigh";

type OpenAIReasoningRequestParams =
  OpenAI.Chat.Completions.ChatCompletionCreateParams & {
    reasoning_effort?: OpenAIReasoningEffort;
  };

type OpenAIStreamRequestParams = OpenAIReasoningRequestParams & {
  stream: true;
  stream_options?: OpenAI.Chat.Completions.ChatCompletionStreamOptions;
};

type OpenAICompatibleToolCall = ChatCompletionMessageFunctionToolCall & {
  function: ChatCompletionMessageFunctionToolCall["function"] & {
    thought_signature?: string;
  };
  extra_content?: {
    google?: {
      thought_signature?: string;
    };
  };
};

const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const readNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
};

const getFinishReason = (choice: unknown): string | undefined => {
  if (!isJsonObject(choice)) return undefined;
  return readString(choice.finish_reason) || readString(choice.finishReason);
};

const isContentFilterFinishReason = (reason: string | undefined): boolean =>
  reason === "content_filter";

const isToolCallsFinishReason = (reason: string | undefined): boolean =>
  reason === "tool_calls";

const getReasoningContent = (value: unknown): string | undefined => {
  if (!isJsonObject(value)) return undefined;
  const reasoning = value.reasoning_content;
  return typeof reasoning === "string" ? reasoning : undefined;
};

const getToolCallThoughtSignature = (value: unknown): string | undefined => {
  if (!isJsonObject(value)) return undefined;
  const record = value;

  const extraContent = isJsonObject(record.extra_content)
    ? record.extra_content
    : null;
  const googleContent =
    extraContent && isJsonObject(extraContent.google)
      ? extraContent.google
      : null;
  const googleThought = googleContent?.thought_signature;
  if (typeof googleThought === "string") {
    return googleThought;
  }

  const toolFunction = isJsonObject(record.function) ? record.function : null;
  const functionThought = toolFunction?.thought_signature;
  return typeof functionThought === "string" ? functionThought : undefined;
};

const parseToolArguments = (
  rawArguments: string,
  toolName: string,
): ToolArguments => {
  const normalized = rawArguments.trim().length > 0 ? rawArguments : "{}";
  let parsed: unknown;

  try {
    parsed = JSON.parse(normalized);
  } catch {
    throw new MalformedToolCallError("openai", toolName, rawArguments);
  }

  if (!isJsonObject(parsed)) {
    throw new MalformedToolCallError("openai", toolName, rawArguments);
  }

  return parsed;
};

const buildMissingToolPayloadDetail = (
  base: string,
  hintedToolNames: readonly string[],
): string => {
  if (hintedToolNames.length === 0) {
    return base;
  }
  return `${base}; hinted tools: ${hintedToolNames.join(", ")}`;
};

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

const readUsageNumber = (
  usage: JsonObject | null | undefined,
  keys: string[],
): number | undefined => {
  if (!usage) return undefined;
  for (const key of keys) {
    const value = usage[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.max(0, Math.floor(value));
    }
    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return Math.max(0, Math.floor(parsed));
      }
    }
  }
  return undefined;
};

const readNestedUsageNumber = (
  usage: JsonObject | null | undefined,
  paths: ReadonlyArray<ReadonlyArray<string>>,
): number | undefined => {
  if (!usage) return undefined;
  for (const path of paths) {
    let current: unknown = usage;
    for (const key of path) {
      if (!isJsonObject(current)) {
        current = undefined;
        break;
      }
      current = current[key];
    }
    if (typeof current === "number" && Number.isFinite(current)) {
      return Math.max(0, Math.floor(current));
    }
    if (typeof current === "string" && current.trim().length > 0) {
      const parsed = Number(current);
      if (Number.isFinite(parsed)) {
        return Math.max(0, Math.floor(parsed));
      }
    }
  }
  return undefined;
};

const hasAnyUsageField = (
  usage: JsonObject | null | undefined,
  keys: string[],
): boolean => {
  if (!usage) return false;
  return keys.some((key) => usage[key] !== undefined);
};

const OPENAI_PROMPT_KEYS = [
  "prompt_tokens",
  "promptTokens",
  "input_tokens",
  "inputTokens",
] as const;
const OPENAI_COMPLETION_KEYS = [
  "completion_tokens",
  "completionTokens",
  "output_tokens",
  "outputTokens",
] as const;
const OPENAI_TOTAL_KEYS = ["total_tokens", "totalTokens"] as const;
const OPENAI_CACHE_READ_KEYS = [
  "cached_tokens",
  "cache_read_tokens",
  "cacheReadTokens",
] as const;
const OPENAI_CACHE_READ_NESTED_PATHS = [
  ["prompt_tokens_details", "cached_tokens"],
  ["promptTokensDetails", "cachedTokens"],
  ["input_tokens_details", "cached_tokens"],
  ["inputTokensDetails", "cachedTokens"],
] as const;
const OPENAI_ALL_USAGE_KEYS = [
  ...OPENAI_PROMPT_KEYS,
  ...OPENAI_COMPLETION_KEYS,
  ...OPENAI_TOTAL_KEYS,
  ...OPENAI_CACHE_READ_KEYS,
] as const;

export function parseOpenAIUsage(usageMetadata: unknown): TokenUsage {
  const usage = isJsonObject(usageMetadata) ? usageMetadata : null;

  const prompt = readUsageNumber(usage, [...OPENAI_PROMPT_KEYS]);
  const completion = readUsageNumber(usage, [...OPENAI_COMPLETION_KEYS]);
  const total = readUsageNumber(usage, [...OPENAI_TOTAL_KEYS]);
  const cacheReadDirect = readUsageNumber(usage, [...OPENAI_CACHE_READ_KEYS]);
  const cacheReadNested = readNestedUsageNumber(usage, [
    ...OPENAI_CACHE_READ_NESTED_PATHS,
  ]);

  let promptTokens = prompt ?? 0;
  let completionTokens = completion ?? 0;
  let totalTokens = total ?? 0;

  if (
    completionTokens <= 0 &&
    totalTokens > 0 &&
    promptTokens > 0 &&
    totalTokens >= promptTokens
  ) {
    completionTokens = totalTokens - promptTokens;
  }

  if (totalTokens <= 0) {
    totalTokens = promptTokens + completionTokens;
  }

  if (promptTokens <= 0 && totalTokens > 0 && completionTokens <= 0) {
    promptTokens = totalTokens;
  }

  const cacheRead =
    typeof cacheReadDirect === "number" ? cacheReadDirect : cacheReadNested;

  const hasKnownUsageKeys = hasAnyUsageField(usage, [...OPENAI_ALL_USAGE_KEYS]);
  const hasPositiveSignal =
    promptTokens > 0 || completionTokens > 0 || totalTokens > 0;

  return {
    promptTokens,
    completionTokens,
    totalTokens,
    ...(typeof cacheRead === "number" ? { cacheRead } : {}),
    reported: hasKnownUsageKeys || hasPositiveSignal,
  };
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
      const capabilities = inferModelCapabilities(id, { ...m });

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
 * 检测是否为 OpenAI reasoning 模型
 */
function isReasoningModel(model: string): boolean {
  const lowerModel = model.toLowerCase();
  return (
    lowerModel.startsWith("o1") ||
    lowerModel.startsWith("o3") ||
    lowerModel.includes("reasoning")
  );
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

  // Reasoning 模型特殊处理 (o1/o3 系列)
  // 早期 reasoning 模型可能不支持工具调用
  if (id.startsWith("o1") || id.startsWith("o3")) {
    capabilities.text = true;
    // o1-2024-12-17 及之后版本支持工具调用
    // 为简化起见，假设所有模型都支持（如不支持，API 会返回错误）
    capabilities.tools = true;
    capabilities.parallelTools = false; // Reasoning 模型通常不支持并行工具调用
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
  return withRetry(
    async () => {
      const client = createOpenAIClient(config);

      // 检测是否为 Gemini 模型 (并且强制开启兼容模式)
      const isGemini = config.geminiCompatibility && isGeminiModel(model);
      // 检测是否为 Claude 模型 (也使用类似 Gemini 的兼容模式)
      const isClaude = config.claudeCompatibility && isClaudeModel(model);
      const useCompat = isGemini || isClaude;

      // 检测是否为 OpenAI reasoning 模型
      const isReasoning = isReasoningModel(model);

      // 兼容性图片生成: 如果是图片模型（非 DALL-E）且启用了兼容模式，转交给 generateImage
      if (
        config.compatibleImageGeneration &&
        (model.toLowerCase().includes("image") ||
          model.toLowerCase().includes("imagen")) &&
        !model.toLowerCase().includes("dall-e")
      ) {
        console.log(
          `[OpenAI] Routing generateContent to generateImage for compatible model: ${model}`,
        );
        const prompt =
          contents
            .filter((msg) => msg.role === "user")
            .slice(-1)[0]
            ?.content.filter((p) => p.type === "text")
            .map((p) => (p as TextContentPart).text)
            .join("\n") || "";

        const imageRes = await generateImage(config, model, prompt);
        if (imageRes.url) {
          return {
            result: { narrative: `![image](${imageRes.url})` },
            usage: imageRes.usage || {
              promptTokens: 0,
              completionTokens: 0,
              totalTokens: 0,
              reported: false,
            },
            raw: imageRes.raw as ChatCompletion,
          };
        }
      }

      // 转换消息格式
      // 默认使用标准 OpenAI 格式；当兼容开关开启时可在客户端执行 Claude/Gemini 格式转换
      // Reasoning 模型使用 developer message 而不是 system message
      const useGeminiMessageFormat =
        !!config.geminiMessageFormat && isGemini && !isReasoning;
      const useClaudeMessageFormat =
        !!config.claudeMessageFormat && isClaude && !isReasoning;

      const messages = isReasoning
        ? convertToReasoningMessages(systemInstruction, contents)
        : useClaudeMessageFormat
          ? convertToClaudeCompatibleMessages(systemInstruction, contents)
          : useGeminiMessageFormat
            ? convertToGeminiCompatibleMessages(systemInstruction, contents)
            : convertToOpenAIMessages(systemInstruction, contents);

      // 转换工具定义 - 兼容模式处理
      let tools: ChatCompletionTool[] | undefined;

      if (options?.tools) {
        if (isGemini) {
          tools = options.tools.map((t) =>
            createGeminiCompatibleTool(t.name, t.description, t.parameters),
          );
        } else if (isClaude) {
          tools = options.tools.map((t) =>
            createClaudeCompatibleTool(t.name, t.description, t.parameters),
          );
          console.log(
            "[OpenAI-Claude] Tool definitions:",
            JSON.stringify(tools.slice(0, 2), null, 2),
          );
        } else {
          tools = compileToolsForOpenAI(options.tools);
        }
      }

      // 构建请求参数
      // Convert toolChoice to OpenAI format
      let toolChoice:
        | OpenAI.Chat.Completions.ChatCompletionToolChoiceOption
        | undefined;
      if (tools && tools.length > 0) {
        if (options?.toolChoice === "required") {
          toolChoice = "required";
        } else if (options?.toolChoice === "none") {
          toolChoice = "none";
        } else if (
          options?.toolChoice &&
          typeof options.toolChoice === "object"
        ) {
          toolChoice = {
            type: "function",
            function: { name: options.toolChoice.name },
          };
        } else {
          toolChoice = "auto";
        }
      }

      const requestParams: OpenAIReasoningRequestParams = {
        model,
        messages,
        temperature: options?.temperature ?? 1.0,
        top_p: options?.topP,
        stream: !!options?.onChunk,
        tools,
        tool_choice: toolChoice,

        // CONFLICT FIX: OpenAI throws 400 if response_format is used while Tools are active.
        // This applies to both standard OpenAI models and Gemini compatibility mode.
        // If we have tools, we generally want the model to call tools, not output JSON content via response_format.
        response_format:
          schema && !tools
            ? (() => {
                if (isGemini) {
                  return {
                    type: "json_schema",
                    json_schema: {
                      name: "response",
                      schema: zodToGeminiCompatibleSchema(schema),
                      strict: false,
                    },
                  };
                } else if (isClaude) {
                  return {
                    type: "json_schema",
                    json_schema: {
                      name: "response",
                      schema: zodToClaudeCompatibleSchema(schema),
                      strict: false,
                    },
                  };
                } else {
                  return zodToOpenAIResponseFormat(schema);
                }
              })()
            : undefined,
      };
      const contextBoundMaxOutputTokens = resolveTokenBudget({
        providerProtocol: "openai",
        modelId: model,
        tokenBudget: options?.tokenBudget,
        systemInstruction,
        messages: contents,
        tools: options?.tools,
        schema,
      }).maxOutputTokens;
      if (isReasoning && !useCompat) {
        requestParams.max_completion_tokens = contextBoundMaxOutputTokens;
      } else {
        requestParams.max_tokens = contextBoundMaxOutputTokens;
      }

      // 添加 reasoning_effort 参数 (OpenAI reasoning 模型)
      const effort = options?.thinkingEffort;

      if (isReasoning && effort && effort !== "none") {
        // OpenAI only supports "low", "medium", "high"
        const openAIEffort = ["low", "medium", "high"].includes(effort)
          ? (effort as OpenAIReasoningEffort)
          : effort === "xhigh"
            ? "high"
            : "low"; // Map minimal to low, xhigh to high
        requestParams.reasoning_effort = openAIEffort;
      }

      // 兼容模式下的 thinking 参数 (通过 OpenAI 接口调用 Claude/Gemini)
      // 代理服务会将这些参数转换为原生格式
      if (useCompat && effort && effort !== "none") {
        requestParams.reasoning_effort = effort as OpenAIReasoningEffort;
      }

      let content = "";
      let toolCalls: ToolCallResult[] = [];
      let usage: TokenUsage = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        reported: false,
      };
      let rawResponse:
        | ChatCompletion
        | ChatCompletionChunk
        | AsyncIterable<ChatCompletionChunk>;
      let reasoningContent = ""; // Reasoning content (OpenAI o1/o3)

      console.log(
        `[OpenAI] Starting generation with model: ${model}, stream: ${!!options?.onChunk}, tools: ${tools ? "yes" : "no"}, useCompat: ${useCompat} (Gemini: ${isGemini}, Claude: ${isClaude}), messageFormat: ${useClaudeMessageFormat ? "claude" : useGeminiMessageFormat ? "gemini" : isReasoning ? "reasoning" : "openai"}`,
      );

      if (useCompat && schema && !tools) {
        console.log(
          `[OpenAI] Detected Compatible Model (Gemini: ${isGemini}, Claude: ${isClaude}), using compatible schema format:`,
          JSON.stringify(requestParams.response_format, null, 2),
        );
      }

      if (options?.onChunk) {
        // 流式生成
        const createStream = async (includeUsage: boolean) => {
          const params: OpenAIStreamRequestParams = {
            ...requestParams,
            stream: true,
          };
          if (includeUsage) {
            // OpenAI streaming usage only arrives when explicitly requested.
            // Some OpenAI-compatible proxies may not support this param.
            params.stream_options = { include_usage: true };
          }
          const streamResponse = await client.chat.completions.create(params);
          return streamResponse as AsyncIterable<ChatCompletionChunk>;
        };

        let response: AsyncIterable<ChatCompletionChunk>;
        try {
          response = await createStream(true);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          const lower = message.toLowerCase();
          const looksLikeStreamOptionsUnsupported =
            lower.includes("stream_options") ||
            lower.includes("include_usage") ||
            lower.includes("unknown parameter") ||
            lower.includes("unrecognized") ||
            lower.includes("unexpected");

          if (!looksLikeStreamOptionsUnsupported) {
            throw error;
          }

          console.warn(
            "[OpenAI] Streaming usage not supported by endpoint; retrying without stream_options",
          );
          response = await createStream(false);
        }

        rawResponse = response;

        // 累积工具调用信息
        const accumulatedToolCalls: Map<
          number,
          {
            id: string;
            name: string;
            arguments: string;
            thoughtSignature?: string;
          }
        > = new Map();
        let streamFinishReason: string | undefined;

        for await (const chunk of response) {
          const choice = chunk.choices[0];
          const finishReason = getFinishReason(choice);
          if (finishReason) {
            streamFinishReason = finishReason;
          }
          const delta = choice?.delta;

          // 处理文本内容
          if (delta?.content) {
            content += delta.content;
            options.onChunk(delta.content);
          }

          // 处理 reasoning content (OpenAI reasoning 模型)
          const deltaReasoning = isReasoning
            ? getReasoningContent(delta)
            : undefined;
          if (deltaReasoning) {
            reasoningContent += deltaReasoning;
          }

          // 处理工具调用 (流式模式下工具调用是增量传输的)
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const tcRecord = isJsonObject(tc) ? tc : null;
              const functionRecord =
                tcRecord && isJsonObject(tcRecord.function)
                  ? tcRecord.function
                  : null;
              const index =
                typeof tc.index === "number"
                  ? tc.index
                  : (readNumber(tcRecord?.index) ?? 0);
              const toolName =
                readString(functionRecord?.name) ||
                readString(tcRecord?.name) ||
                "";
              const normalizedToolName = toolName.trim();
              const toolArguments =
                readString(functionRecord?.arguments) ||
                readString(tcRecord?.arguments) ||
                "";
              const toolId = readString(tcRecord?.id) || `tool_${index}`;
              const thoughtSignature = getToolCallThoughtSignature(tc);
              const existing = accumulatedToolCalls.get(index);
              if (existing) {
                if (!existing.name && normalizedToolName) {
                  existing.name = normalizedToolName;
                }
                if (toolArguments) {
                  existing.arguments += toolArguments;
                }
                if (!existing.thoughtSignature && thoughtSignature) {
                  existing.thoughtSignature = thoughtSignature;
                }
              } else {
                // 新工具调用
                // Gemini 3 uses extra_content.google.thought_signature format
                accumulatedToolCalls.set(index, {
                  id: toolId,
                  name: normalizedToolName,
                  arguments: toolArguments,
                  thoughtSignature,
                });
              }
            }
          }

          // 更新使用量
          if (chunk.usage) {
            usage = parseOpenAIUsage(chunk.usage);
          }
        }

        // 解析累积的工具调用
        for (const [, tc] of accumulatedToolCalls) {
          if (!tc.name) {
            continue;
          }
          toolCalls.push({
            id: tc.id,
            name: tc.name,
            args: parseToolArguments(tc.arguments, tc.name),
            thoughtSignature: tc.thoughtSignature,
          });
        }

        const hintedToolNames = Array.from(
          new Set(
            Array.from(accumulatedToolCalls.values())
              .map((tc) => tc.name.trim())
              .filter((name) => name.length > 0),
          ),
        );

        if (isContentFilterFinishReason(streamFinishReason)) {
          throw new SafetyFilterError("openai");
        }

        if (
          isToolCallsFinishReason(streamFinishReason) &&
          toolCalls.length === 0
        ) {
          throw new MalformedToolCallError(
            "openai",
            buildMissingToolPayloadDetail(
              "stream finished with tool_calls but no valid tool call payload was parsed",
              hintedToolNames,
            ),
          );
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
        const rawToolCalls = Array.isArray(
          (message as { tool_calls?: unknown })?.tool_calls,
        )
          ? (((message as { tool_calls?: unknown }).tool_calls as unknown[]) ??
            [])
          : [];
        const hintedToolNames = new Set<string>();
        if (rawToolCalls.length > 0) {
          toolCalls = rawToolCalls.flatMap((tc, index) => {
            const tcRecord = isJsonObject(tc) ? tc : null;
            const functionRecord =
              tcRecord && isJsonObject(tcRecord.function)
                ? tcRecord.function
                : null;
            const toolName = (
              readString(functionRecord?.name) ||
              readString(tcRecord?.name) ||
              ""
            ).trim();
            if (toolName) {
              hintedToolNames.add(toolName);
            }
            if (!toolName) {
              return [];
            }
            const hasFunctionArguments =
              functionRecord &&
              Object.prototype.hasOwnProperty.call(functionRecord, "arguments");
            const toolArguments = hasFunctionArguments
              ? readString(functionRecord.arguments) || ""
              : readString(tcRecord?.arguments) || "";
            return [
              {
                id: readString(tcRecord?.id) || `tool_${index}`,
                name: toolName,
                args: parseToolArguments(toolArguments, toolName),
                // Extract thought_signature if present (Gemini compatibility)
                // Gemini 3 uses extra_content.google.thought_signature format
                thoughtSignature: getToolCallThoughtSignature(tc),
              },
            ];
          });
        }

        // 检查内容过滤
        const finishReason = getFinishReason(response.choices[0]);
        if (isContentFilterFinishReason(finishReason)) {
          throw new SafetyFilterError("openai");
        }

        if (isToolCallsFinishReason(finishReason) && toolCalls.length === 0) {
          throw new MalformedToolCallError(
            "openai",
            buildMissingToolPayloadDetail(
              "finish_reason=tool_calls but no valid tool call payload was parsed",
              Array.from(hintedToolNames),
            ),
          );
        }

        usage = parseOpenAIUsage(response.usage);

        // 提取 reasoning content (OpenAI o1/o3 系列)
        const messageReasoning = isReasoning
          ? getReasoningContent(message)
          : undefined;
        if (messageReasoning) {
          reasoningContent = messageReasoning;
          console.log(
            `[OpenAI] Extracted reasoning content (${reasoningContent.length} chars)`,
          );
        }
      }

      console.log(`[OpenAI] Generation complete. Usage:`, usage);

      // 如果有工具调用，返回工具调用结果（同时保留 content 和 reasoning）
      if (toolCalls.length > 0) {
        const toolResult: OpenAIToolResultPayload = {
          functionCalls: toolCalls,
          // 保留 content 以便在下次请求时包含
          content: content || undefined,
        };

        // 如果有 reasoning content，也包含进去
        if (reasoningContent) {
          toolResult._reasoning = reasoningContent;
        }

        return {
          result: toolResult,
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
        const cleanedContent = cleanJsonContent(content);
        const result = JSON.parse(jsonrepair(cleanedContent));

        // Schema Validation
        if (schema) {
          validateSchema(result, schema, "openai");
        }

        // 如果有 reasoning content，添加到结果中
        if (reasoningContent) {
          return {
            result: { ...result, _reasoning: reasoningContent },
            usage,
            raw: rawResponse,
          };
        }

        return { result, usage, raw: rawResponse };
      } catch (error) {
        // 如果有 schema 但解析失败
        if (schema) {
          console.error(`[OpenAI] Failed to parse JSON content:`, content);
          // If it's already a SchemaValidationError, rethrow it
          if (error instanceof AIProviderError) {
            throw error;
          }
          throw new JSONParseError("openai", content.substring(0, 500), error);
        }
        // 返回纯文本
        const narrative: OpenAINarrativePayload = { narrative: content };
        if (reasoningContent) {
          narrative._reasoning = reasoningContent;
        }
        return { result: narrative, usage, raw: rawResponse };
      }
    },
    3,
    1000,
    "openai",
  );
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
        // Fix: Check for "tool_result" (from messageTypes.ts) not "tool_response"
        if (part.type === "tool_result") {
          const tr = part as {
            type: "tool_result";
            toolResult: { id: string; content: unknown };
          };
          const toolMsg: ChatCompletionToolMessageParam = {
            role: "tool",
            tool_call_id: tr.toolResult.id,
            content:
              typeof tr.toolResult.content === "string"
                ? tr.toolResult.content
                : JSON.stringify(tr.toolResult.content),
          };
          console.log(
            "[OpenAI] Tool message constructed:",
            JSON.stringify(toolMsg, null, 2),
          );
          result.push(toolMsg);
        }
      }
      continue;
    }

    // 处理助手消息（可能包含工具调用）
    if (msg.role === "assistant") {
      const toolCallParts = msg.content.filter(
        (p): p is ToolCallContentPart => p.type === "tool_use",
      );

      if (toolCallParts.length > 0) {
        const textContent = msg.content
          .filter((p): p is TextContentPart => p.type === "text")
          .map((p) => p.text)
          .join("\n");

        const assistantMsg: ChatCompletionAssistantMessageParam = {
          role: "assistant",
          content: textContent || null,
          tool_calls: toolCallParts.map((p) => {
            const toolCall: OpenAICompatibleToolCall = {
              id: p.toolUse.id,
              type: "function" as const,
              function: {
                name: p.toolUse.name,
                arguments: JSON.stringify(p.toolUse.args),
              },
            };
            // Include thought_signature if present (Gemini compatibility)
            if (p.toolUse.thoughtSignature) {
              toolCall.function.thought_signature = p.toolUse.thoughtSignature;
            }
            return toolCall;
          }),
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

/**
 * 转换消息到 OpenAI Reasoning 模型格式
 *
 * 关键差异:
 * - 使用 "developer" role 替代 "system" role
 * - 需要处理和保留 reasoning content parts
 */
function convertToReasoningMessages(
  systemInstruction: string,
  messages: UnifiedMessage[],
): ChatCompletionMessageParam[] {
  const result: ChatCompletionMessageParam[] = [];

  // Reasoning 模型使用 developer 角色替代 system
  if (systemInstruction) {
    const developerMessage: ChatCompletionDeveloperMessageParam = {
      role: "developer",
      content: systemInstruction,
    };
    result.push(developerMessage);
  }

  for (const msg of messages) {
    // 处理工具响应消息
    if (msg.role === "tool") {
      for (const part of msg.content) {
        if (part.type === "tool_result") {
          const tr = part as {
            type: "tool_result";
            toolResult: { id: string; content: unknown };
          };
          const toolMsg: ChatCompletionToolMessageParam = {
            role: "tool",
            tool_call_id: tr.toolResult.id,
            content:
              typeof tr.toolResult.content === "string"
                ? tr.toolResult.content
                : JSON.stringify(tr.toolResult.content),
          };
          result.push(toolMsg);
        }
      }
      continue;
    }

    // 处理助手消息（可能包含工具调用和 reasoning content）
    if (msg.role === "assistant") {
      const toolCallParts = msg.content.filter(
        (p): p is ToolCallContentPart => p.type === "tool_use",
      );

      const reasoningParts = msg.content.filter(
        (p): p is ReasoningContentPart => p.type === "reasoning",
      );

      if (toolCallParts.length > 0) {
        const textContent = msg.content
          .filter((p): p is TextContentPart => p.type === "text")
          .map((p) => p.text)
          .join("\\n");

        const assistantMsg: ChatCompletionAssistantMessageParam = {
          role: "assistant",
          content: textContent || null,
          tool_calls: toolCallParts.map((p) => {
            const toolCall: OpenAICompatibleToolCall = {
              id: p.toolUse.id,
              type: "function" as const,
              function: {
                name: p.toolUse.name,
                arguments: JSON.stringify(p.toolUse.args),
              },
            };
            // Include thought_signature if present (Gemini 3 compatibility)
            // Gemini 3 uses extra_content.google.thought_signature format
            if (p.toolUse.thoughtSignature) {
              toolCall.extra_content = {
                google: {
                  thought_signature: p.toolUse.thoughtSignature,
                },
              };
            }
            return toolCall;
          }),
        };
        result.push(assistantMsg);

        // 如果有 reasoning content，添加为后续消息
        // 注意：OpenAI API 可能要求 reasoning content 在响应中自动包含
        // 这里我们只是保留历史记录中的 reasoning content
        continue;
      }

      // 如果有 reasoning content 但没有工具调用，包含在文本中
      if (reasoningParts.length > 0) {
        const textContent = msg.content
          .filter((p): p is TextContentPart => p.type === "text")
          .map((p) => p.text)
          .join("\\n");

        // Reasoning content 通常不需要显式发送回模型
        // 它会自动出现在响应中，我们只是记录它
        result.push({
          role: "assistant",
          content: textContent,
        });
        continue;
      }
    }

    // 处理普通文本消息
    const textContent = msg.content
      .filter((p): p is TextContentPart => p.type === "text")
      .map((p) => p.text)
      .join("\\n");

    if (textContent) {
      if (msg.role === "developer") {
        const developerMessage: ChatCompletionDeveloperMessageParam = {
          role: "developer",
          content: textContent,
        };
        result.push(developerMessage);
      } else {
        result.push({
          role: msg.role as "user" | "assistant",
          content: textContent,
        });
      }
    }
  }

  return result;
}

/**
 * 转换消息到 Claude 兼容格式 (通过 OpenAI 接口调用 Claude 时使用)
 *
 * 关键差异:
 * - Claude 的 tool result 需要包装在 role: "user" 消息中，而不是 role: "tool"
 * - 工具调用使用 tool_use 内容块而不是 tool_calls 数组
 *
 * 注意: 某些 OpenAI 兼容代理可能已处理此转换，但为安全起见此处提供完整转换
 */
function convertToClaudeCompatibleMessages(
  systemInstruction: string,
  messages: UnifiedMessage[],
): ChatCompletionMessageParam[] {
  const result: ChatCompletionMessageParam[] = [
    { role: "system", content: systemInstruction },
  ];

  for (const msg of messages) {
    // 处理工具响应消息 - Claude 期望 tool_result 在 user 消息中
    if (msg.role === "tool") {
      const toolResults: Array<{
        type: "tool_result";
        tool_use_id: string;
        content: string;
      }> = [];

      for (const part of msg.content) {
        if (part.type === "tool_result") {
          const tr = part as {
            type: "tool_result";
            toolResult: { id: string; content: unknown };
          };
          toolResults.push({
            type: "tool_result",
            tool_use_id: tr.toolResult.id,
            content:
              typeof tr.toolResult.content === "string"
                ? tr.toolResult.content
                : JSON.stringify(tr.toolResult.content),
          });
        }
      }

      if (toolResults.length > 0) {
        // Claude 格式: tool_result 作为 user 消息的内容
        // 通过 OpenAI 兼容接口时，仍使用 JSON 字符串表示
        result.push({
          role: "user",
          content: JSON.stringify(toolResults),
        });
      }
      continue;
    }

    // 处理助手消息（可能包含工具调用）
    if (msg.role === "assistant") {
      const toolCallParts = msg.content.filter(
        (p): p is ToolCallContentPart => p.type === "tool_use",
      );

      if (toolCallParts.length > 0) {
        const textContent = msg.content
          .filter((p): p is TextContentPart => p.type === "text")
          .map((p) => p.text)
          .join("\n");

        // 使用标准 OpenAI 格式的 tool_calls - 代理会转换为 Claude 格式
        const assistantMsg: ChatCompletionAssistantMessageParam = {
          role: "assistant",
          content: textContent || null,
          tool_calls: toolCallParts.map((p) => {
            const toolCall: OpenAICompatibleToolCall = {
              id: p.toolUse.id,
              type: "function" as const,
              function: {
                name: p.toolUse.name,
                arguments: JSON.stringify(p.toolUse.args),
              },
            };
            // Include thought_signature if present (Gemini 3 compatibility)
            // Gemini 3 uses extra_content.google.thought_signature format
            if (p.toolUse.thoughtSignature) {
              toolCall.extra_content = {
                google: {
                  thought_signature: p.toolUse.thoughtSignature,
                },
              };
            }
            return toolCall;
          }),
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

/**
 * 转换消息到 Gemini 兼容格式 (通过 OpenAI 接口调用 Gemini 时使用)
 *
 * 关键差异:
 * - Gemini 使用 role: "function" 而不是 role: "tool"
 * - functionCall 和 functionResponse 使用不同的结构
 *
 * 注意: 某些 OpenAI 兼容代理可能已处理此转换，但为安全起见此处提供完整转换
 */
function convertToGeminiCompatibleMessages(
  systemInstruction: string,
  messages: UnifiedMessage[],
): ChatCompletionMessageParam[] {
  const result: ChatCompletionMessageParam[] = [
    { role: "system", content: systemInstruction },
  ];

  for (const msg of messages) {
    // 处理工具响应消息 - Gemini 使用 function role
    if (msg.role === "tool") {
      for (const part of msg.content) {
        if (part.type === "tool_result") {
          const tr = part as {
            type: "tool_result";
            toolResult: { id: string; name: string; content: unknown };
          };
          // Gemini 格式: 使用 function role 和 functionResponse 结构
          result.push({
            role: "user", // OpenAI compatible format uses user for function responses
            content: JSON.stringify({
              type: "function_response",
              name: tr.toolResult.name || "function",
              response: {
                content: tr.toolResult.content,
              },
            }),
          });
        }
      }
      continue;
    }

    // 处理助手消息（可能包含工具调用）
    if (msg.role === "assistant") {
      const toolCallParts = msg.content.filter(
        (p): p is ToolCallContentPart => p.type === "tool_use",
      );

      if (toolCallParts.length > 0) {
        const textContent = msg.content
          .filter((p): p is TextContentPart => p.type === "text")
          .map((p) => p.text)
          .join("\n");

        // 使用标准 OpenAI 格式的 tool_calls
        const assistantMsg: ChatCompletionAssistantMessageParam = {
          role: "assistant",
          content: textContent || null,
          tool_calls: toolCallParts.map((p) => {
            const toolCall: OpenAICompatibleToolCall = {
              id: p.toolUse.id,
              type: "function" as const,
              function: {
                name: p.toolUse.name,
                arguments: JSON.stringify(p.toolUse.args),
              },
            };
            // Include thought_signature if present (Gemini 3 compatibility)
            // Gemini 3 uses extra_content.google.thought_signature format
            if (p.toolUse.thoughtSignature) {
              toolCall.extra_content = {
                google: {
                  thought_signature: p.toolUse.thoughtSignature,
                },
              };
            }
            return toolCall;
          }),
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

  // 兼容性模式: 使用对话 API 生成图片
  if (config.compatibleImageGeneration) {
    console.log(
      `[OpenAI] Using compatibility mode (Chat API) for image generation with model: ${model}`,
    );
    try {
      const response = await client.chat.completions.create({
        model: model || "gemini-3-pro-image",
        messages: [{ role: "user", content: prompt }],
      });

      const content = response.choices[0]?.message?.content || "";

      // 1. 尝试从文本中提取 Markdown 图片链接
      const markdownMatch = content.match(/!\[.*?\]\((.*?)\)/);
      if (markdownMatch) {
        return {
          url: markdownMatch[1],
          usage: parseOpenAIUsage(response.usage),
          raw: response,
        };
      }

      // 2. 尝试从文本中寻找 URL (针对某些直接返回 URL 的代理)
      const urlMatch = content.match(/https?:\/\/[^\s)]+/);
      if (urlMatch) {
        return {
          url: urlMatch[0],
          usage: parseOpenAIUsage(response.usage),
          raw: response,
        };
      }

      // 3. 针对 Gemini via OpenAI 代理可能返回的 base64 (如果代理将其放入 content)
      if (
        content.length > 1000 &&
        (content.startsWith("data:") || !content.includes(" "))
      ) {
        const url = content.startsWith("data:")
          ? content
          : `data:image/jpeg;base64,${content}`;
        return {
          url,
          usage: parseOpenAIUsage(response.usage),
          raw: response,
        };
      }

      throw new Error(
        `Failed to extract image from chat response: ${content.substring(0, 100)}...`,
      );
    } catch (error) {
      console.error("[OpenAI] Compatible image generation failed:", error);
      // 如果不是不支持的错误，可以继续尝试 DALL-E 路径或报错
    }
  }

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
    usage: (() => {
      const parsedUsage = parseOpenAIUsage(response.usage);
      return {
        promptTokens: parsedUsage.promptTokens,
        totalTokens: parsedUsage.totalTokens,
      };
    })(),
  };
}

// ============================================================================
// Native Message Builders (Provider-Native Format)
// ============================================================================

/**
 * 构建系统消息
 */
export function buildSystemMessage(
  content: string,
): ChatCompletionMessageParam {
  return { role: "system", content };
}

/**
 * 构建开发者消息 (用于 o1/o3 reasoning 模型)
 */
export function buildDeveloperMessage(
  content: string,
): ChatCompletionMessageParam {
  const developerMessage: ChatCompletionDeveloperMessageParam = {
    role: "developer",
    content,
  };
  return developerMessage;
}

/**
 * 构建用户消息
 */
export function buildUserMessage(content: string): ChatCompletionMessageParam {
  return { role: "user", content };
}

/**
 * 构建助手消息
 */
export function buildAssistantMessage(
  content: string,
): ChatCompletionMessageParam {
  return { role: "assistant", content };
}

/**
 * 构建带工具调用的助手消息
 */
export function buildToolCallMessage(
  toolCalls: Array<{
    id: string;
    name: string;
    args: ToolArguments;
    thoughtSignature?: string;
  }>,
  content?: string,
): ChatCompletionAssistantMessageParam {
  return {
    role: "assistant",
    content: content || null,
    tool_calls: toolCalls.map((tc) => {
      const toolCall: OpenAICompatibleToolCall = {
        id: tc.id,
        type: "function" as const,
        function: {
          name: tc.name,
          arguments: JSON.stringify(tc.args),
        },
      };
      // Include thought_signature if present (Gemini 3 compatibility)
      // Gemini 3 uses extra_content.google.thought_signature format
      if (tc.thoughtSignature) {
        toolCall.extra_content = {
          google: {
            thought_signature: tc.thoughtSignature,
          },
        };
      }
      return toolCall;
    }),
  };
}

/**
 * 构建工具响应消息
 */
export function buildToolResponseMessage(
  toolCallId: string,
  content: unknown,
): ChatCompletionToolMessageParam {
  return {
    role: "tool",
    tool_call_id: toolCallId,
    content: typeof content === "string" ? content : JSON.stringify(content),
  };
}

/**
 * 从 AI 响应提取文本内容
 */
export function extractTextContent(response: ChatCompletion): string {
  return response.choices[0]?.message?.content || "";
}

/**
 * 从 UnifiedMessage 转换为 OpenAI ChatCompletionMessageParam
 * (用于初始上下文构建，仅在会话创建时调用一次)
 */
export function fromUnifiedMessage(
  message: UnifiedMessage,
): ChatCompletionMessageParam {
  // 处理工具响应消息
  if (message.role === "tool") {
    const toolResult = message.content.find(
      (p): p is ToolResponseContentPart => p.type === "tool_result",
    );
    if (toolResult) {
      return buildToolResponseMessage(
        toolResult.toolResult.id,
        toolResult.toolResult.content,
      );
    }
  }

  // 处理助手消息（可能包含工具调用）
  if (message.role === "assistant") {
    const toolCallParts = message.content.filter(
      (p): p is ToolCallContentPart => p.type === "tool_use",
    );

    if (toolCallParts.length > 0) {
      const textContent = message.content
        .filter((p): p is TextContentPart => p.type === "text")
        .map((p) => p.text)
        .join("\n");

      return buildToolCallMessage(
        toolCallParts.map((p) => ({
          id: p.toolUse.id,
          name: p.toolUse.name,
          args: p.toolUse.args,
          thoughtSignature: p.toolUse.thoughtSignature,
        })),
        textContent || undefined,
      );
    }
  }

  // Check for image content - convert to OpenAI vision format
  const imageParts = message.content.filter(
    (p): p is ImageContentPart =>
      p.type === "image" && !!p.mimeType && !!p.data,
  );
  const textParts = message.content.filter(
    (p): p is TextContentPart => p.type === "text",
  );

  if (imageParts.length > 0 && message.role === "user") {
    // OpenAI vision format: array of content parts with image_url
    const contentArray: ChatCompletionContentPart[] = [];

    // Add text parts
    for (const tp of textParts) {
      contentArray.push({ type: "text", text: tp.text });
    }

    // Add image parts with data URL
    for (const ip of imageParts) {
      const dataUrl = `data:${ip.mimeType};base64,${ip.data}`;
      contentArray.push({
        type: "image_url",
        image_url: { url: dataUrl },
      });
    }

    return {
      role: "user",
      content: contentArray,
    };
  }

  // 处理普通文本消息
  const textContent = textParts.map((p) => p.text).join("\n");

  if (message.role === "system") {
    return buildSystemMessage(textContent);
  } else if (message.role === "assistant") {
    return buildAssistantMessage(textContent);
  } else {
    return buildUserMessage(textContent);
  }
}

/**
 * 批量从 UnifiedMessage[] 转换为 ChatCompletionMessageParam[]
 * (用于初始上下文构建)
 *
 * @param systemInstruction 系统指令
 * @param messages UnifiedMessage 数组
 * @param isReasoning 是否为 reasoning 模型 (使用 developer role)
 */
export function fromUnifiedMessages(
  systemInstruction: string,
  messages: UnifiedMessage[],
  isReasoning: boolean = false,
): ChatCompletionMessageParam[] {
  const result: ChatCompletionMessageParam[] = [];

  // 添加系统指令
  if (systemInstruction) {
    result.push(
      isReasoning
        ? buildDeveloperMessage(systemInstruction)
        : buildSystemMessage(systemInstruction),
    );
  }

  // 转换消息
  for (const msg of messages) {
    if (msg.role === "system") continue; // 跳过系统消息，已在上面处理
    result.push(fromUnifiedMessage(msg));
  }

  return result;
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

// Re-export ChatCompletionMessageParam for session management
export type { ChatCompletionMessageParam };
