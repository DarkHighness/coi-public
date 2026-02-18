/**
 * ============================================================================
 * Claude Provider - Anthropic SDK 实现
 * ============================================================================
 *
 * 使用官方 @anthropic-ai/sdk，提供完整的类型安全支持。
 * 包括：内容生成、工具调用、流式输出
 *
 * 注意：Claude 不支持图片生成、视频生成、语音合成、嵌入向量生成
 */

import { jsonrepair } from "jsonrepair";
import Anthropic from "@anthropic-ai/sdk";
import type {
  MessageParam,
  MessageCreateParams,
  ContentBlock,
  TextBlock,
  ToolUseBlock,
  Message,
  MessageStreamEvent,
  Tool,
} from "@anthropic-ai/sdk/resources/messages";

import type { TokenUsage, JsonObject, ToolArguments } from "../../types";
import {
  DEFAULT_PROTOCOL_MAX_OUTPUT_FALLBACK_TOKENS,
  MIN_RECOMMENDED_OUTPUT_FALLBACK_TOKENS,
  getDefaultModelMaxOutputTokens,
  isLowOutputFallbackSetting,
  sanitizePositiveOutputTokens,
} from "../modelOutputTokens";

import {
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
import { zodToClaudeCompatibleSchema } from "../zodCompiler";
import type { ZodTypeAny } from "zod";
import { withRetry, validateSchema, cleanJsonContent } from "./utils";

// ============================================================================
// Configuration Types
// ============================================================================

/** Claude Provider 配置 */
export interface ClaudeConfig {
  apiKey: string;
  baseUrl?: string;
}

// ============================================================================
// Response Types (兼容旧 API)
// ============================================================================

/** 内容生成响应 (兼容格式) */
export interface ClaudeContentGenerationResponse {
  result: { functionCalls?: ToolCallResult[] } | JsonObject;
  usage: TokenUsage;
  raw: Message | AsyncIterable<MessageStreamEvent>;
}

interface ClaudeModelWithLegacyLimits {
  context_window?: number;
  contextWindow?: number;
  input_token_limit?: number;
  inputTokenLimit?: number;
}

interface ClaudeToolResultPayload {
  functionCalls: ToolCallResult[];
  content?: string;
  _thinking?: string;
}

interface ClaudeNarrativePayload {
  narrative: string;
  _thinking?: string;
}

interface ClaudeThinkingBlockLike {
  thinking?: string;
}

type ClaudeAssistantContentPart =
  | { type: "text"; text: string }
  | { type: "thinking"; thinking: string }
  | {
      type: "tool_use";
      id: string;
      name: string;
      input: JsonObject;
    };

const getThinkingText = (value: unknown): string => {
  if (!value || typeof value !== "object") return "";
  const thinking = (value as ClaudeThinkingBlockLike).thinking;
  return typeof thinking === "string" ? thinking : "";
};

const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseToolArgumentsText = (
  rawInput: string,
  toolName: string,
): ToolArguments => {
  const normalized = rawInput.trim().length > 0 ? rawInput : "{}";
  let parsed: unknown;

  try {
    parsed = JSON.parse(normalized);
  } catch {
    throw new MalformedToolCallError("claude", toolName, rawInput);
  }

  if (!isJsonObject(parsed)) {
    throw new MalformedToolCallError("claude", toolName, rawInput);
  }

  return parsed;
};

const parseToolArgumentsValue = (
  rawInput: unknown,
  toolName: string,
): ToolArguments => {
  if (!isJsonObject(rawInput)) {
    throw new MalformedToolCallError(
      "claude",
      toolName,
      JSON.stringify(rawInput),
    );
  }
  return rawInput;
};

const isEmptyObjectValue = (value: unknown): value is JsonObject =>
  isJsonObject(value) && Object.keys(value).length === 0;

const hasMeaningfulToolArgs = (args: ToolArguments): boolean =>
  !isEmptyObjectValue(args);

const parseStreamTimeoutMs = (
  rawValue: string | undefined,
  fallbackMs: number,
  minMs: number,
  maxMs: number,
): number => {
  if (!rawValue) return fallbackMs;
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallbackMs;
  const normalized = Math.floor(parsed);
  return Math.max(minMs, Math.min(maxMs, normalized));
};

const CLAUDE_STREAM_MAX_DURATION_MS = 15 * 60_000;
const CLAUDE_STREAM_IDLE_TIMEOUT_MS = parseStreamTimeoutMs(
  process.env.CLAUDE_STREAM_IDLE_TIMEOUT_MS,
  180_000,
  60_000,
  CLAUDE_STREAM_MAX_DURATION_MS - 30_000,
);
const CLAUDE_STREAM_REQUEST_TIMEOUT_MS = CLAUDE_STREAM_MAX_DURATION_MS + 30_000;

// ============================================================================
// Client Factory
// ============================================================================

/**
 * 创建 Claude 客户端实例
 */
export function createClaudeClient(config: ClaudeConfig): Anthropic {
  if (!config.apiKey) {
    throw new AIProviderError("Claude API key is required", "claude");
  }

  return new Anthropic({
    apiKey: config.apiKey,
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

const hasAnyUsageField = (
  usage: JsonObject | null | undefined,
  keys: string[],
): boolean => {
  if (!usage) return false;
  return keys.some((key) => usage[key] !== undefined);
};

const CLAUDE_PROMPT_KEYS = [
  "input_tokens",
  "inputTokens",
  "prompt_tokens",
  "promptTokens",
] as const;
const CLAUDE_COMPLETION_KEYS = [
  "output_tokens",
  "outputTokens",
  "completion_tokens",
  "completionTokens",
] as const;
const CLAUDE_TOTAL_KEYS = ["total_tokens", "totalTokens"] as const;
const CLAUDE_CACHE_READ_KEYS = [
  "cache_read_input_tokens",
  "cacheReadInputTokens",
] as const;
const CLAUDE_CACHE_WRITE_KEYS = [
  "cache_creation_input_tokens",
  "cacheCreationInputTokens",
] as const;
const CLAUDE_ALL_USAGE_KEYS = [
  ...CLAUDE_PROMPT_KEYS,
  ...CLAUDE_COMPLETION_KEYS,
  ...CLAUDE_TOTAL_KEYS,
  ...CLAUDE_CACHE_READ_KEYS,
  ...CLAUDE_CACHE_WRITE_KEYS,
] as const;

const CLAUDE_FALLBACK_MAX_OUTPUT_TOKENS =
  DEFAULT_PROTOCOL_MAX_OUTPUT_FALLBACK_TOKENS.claude;
const WARNED_LOW_CLAUDE_FALLBACKS = new Set<string>();

const normalizeClaudeModelId = (model: string): string => {
  const trimmed = model.trim().toLowerCase();
  if (!trimmed) {
    return trimmed;
  }
  const slashIndex = trimmed.lastIndexOf("/");
  return slashIndex >= 0 ? trimmed.slice(slashIndex + 1) : trimmed;
};

export const resolveClaudeMaxTokens = (
  model: string,
  options?: GenerateContentOptions,
): number => {
  const normalizedModel = normalizeClaudeModelId(model);
  const mapped =
    getDefaultModelMaxOutputTokens("claude", normalizedModel) ||
    getDefaultModelMaxOutputTokens("claude", model);
  if (mapped) {
    return mapped;
  }

  const configuredFallback = sanitizePositiveOutputTokens(
    options?.maxOutputTokensFallback,
  );
  if (configuredFallback) {
    if (isLowOutputFallbackSetting(configuredFallback)) {
      const warningKey = `${normalizedModel}:${configuredFallback}`;
      if (!WARNED_LOW_CLAUDE_FALLBACKS.has(warningKey)) {
        WARNED_LOW_CLAUDE_FALLBACKS.add(warningKey);
        console.warn(
          `[Claude] maxOutputTokensFallback=${configuredFallback} is below recommended ${MIN_RECOMMENDED_OUTPUT_FALLBACK_TOKENS}; low values can truncate responses and break game flow.`,
        );
      }
    }
    return configuredFallback;
  }

  return CLAUDE_FALLBACK_MAX_OUTPUT_TOKENS;
};

export function parseClaudeUsage(usageMetadata: unknown): TokenUsage {
  const usage = isJsonObject(usageMetadata) ? usageMetadata : null;

  const prompt = readUsageNumber(usage, [...CLAUDE_PROMPT_KEYS]);
  const completion = readUsageNumber(usage, [...CLAUDE_COMPLETION_KEYS]);
  const total = readUsageNumber(usage, [...CLAUDE_TOTAL_KEYS]);
  const cacheRead = readUsageNumber(usage, [...CLAUDE_CACHE_READ_KEYS]);
  const cacheWrite = readUsageNumber(usage, [...CLAUDE_CACHE_WRITE_KEYS]);

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

  const hasKnownUsageKeys = hasAnyUsageField(usage, [...CLAUDE_ALL_USAGE_KEYS]);
  const hasPositiveSignal =
    promptTokens > 0 || completionTokens > 0 || totalTokens > 0;

  return {
    promptTokens,
    completionTokens,
    totalTokens,
    ...(typeof cacheRead === "number" ? { cacheRead } : {}),
    ...(typeof cacheWrite === "number" ? { cacheWrite } : {}),
    reported: hasKnownUsageKeys || hasPositiveSignal,
  };
}

// ============================================================================
// Connection Validation
// ============================================================================

/**
 * 验证 Claude API 连接
 */
export async function validateConnection(config: ClaudeConfig): Promise<void> {
  try {
    const client = createClaudeClient(config);
    // 使用 list models API 验证连接
    await client.models.list({ limit: 1 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new AIProviderError(
      `Failed to connect to Claude API: ${message}`,
      "claude",
      undefined,
      error,
    );
  }
}

/**
 * 使用 Claude Token Count API 精确计算输入 token 数
 */
export async function countTokens(
  config: ClaudeConfig,
  model: string,
  content: string,
): Promise<number> {
  try {
    const client = createClaudeClient(config);
    const response = await client.messages.countTokens({
      model,
      messages: [{ role: "user", content }],
    });

    const inputTokens = response.input_tokens;
    if (typeof inputTokens !== "number" || !Number.isFinite(inputTokens)) {
      throw new Error("Missing input_tokens in countTokens response");
    }

    return Math.max(0, Math.floor(inputTokens));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new AIProviderError(
      `Failed to count tokens via Claude API: ${message}`,
      "claude",
      undefined,
      error,
    );
  }
}

// ============================================================================
// Model Listing
// ============================================================================

/**
 * 获取可用的 Claude 模型列表
 *
 * 注意：Claude API 不提供模型列表端点，返回预定义的模型列表
 */
export async function getModels(config: ClaudeConfig): Promise<ModelInfo[]> {
  try {
    const client = createClaudeClient(config);
    const response = await client.models.list({ limit: 100 });

    return response.data.map((model) => ({
      id: model.id,
      name: model.display_name,
      contextLength: (() => {
        const typedModel = model as typeof model & ClaudeModelWithLegacyLimits;
        return (
          typedModel.context_window ||
          typedModel.contextWindow ||
          typedModel.input_token_limit ||
          typedModel.inputTokenLimit
        );
      })(),
      capabilities: {
        text: true,
        image: false, // Claude API currently doesn't support image generation
        video: false,
        audio: false,
        tools: true,
        parallelTools: true,
      },
    }));
  } catch (error) {
    console.warn("[Claude] Failed to fetch models, using defaults:", error);
    return getDefaultModels();
  }
}

/**
 * 默认模型列表
 */
function getDefaultModels(): ModelInfo[] {
  return [
    {
      id: "claude-sonnet-4-5-20250929",
      name: "Claude Sonnet 4.5",
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
      id: "claude-haiku-4-5-20251001",
      name: "Claude Haiku 4.5",
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
      id: "claude-opus-4-5-20251101",
      name: "Claude Opus 4.5",
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
      id: "claude-opus-4-1-20250805",
      name: "Claude Opus 4.1",
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
      id: "claude-sonnet-4-20250514",
      name: "Claude Sonnet 4",
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
      id: "claude-3-7-sonnet-20250219",
      name: "Claude 3.7 Sonnet",
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
      id: "claude-opus-4-20250514",
      name: "Claude Opus 4",
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
      id: "claude-3-5-haiku-20241022",
      name: "Claude 3.5 Haiku",
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
      id: "claude-3-haiku-20240307",
      name: "Claude 3 Haiku",
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
  config: ClaudeConfig,
  model: string,
  systemInstruction: string,
  contents: UnifiedMessage[],
  schema?: ZodTypeAny,
  options?: GenerateContentOptions,
): Promise<ClaudeContentGenerationResponse> {
  return withRetry(
    async () => {
      const client = createClaudeClient(config);

      // 转换消息格式
      const messages = convertToClaudeMessages(contents);

      // 转换工具定义 (Claude 使用与 OpenAI 相似的格式)
      const tools = options?.tools
        ? convertToolsForClaude(options.tools)
        : undefined;

      if (tools && tools.length > 0) {
        console.log(
          "[Claude] Tool definitions:",
          JSON.stringify(tools.slice(0, 2), null, 2),
        );
        // Log full request for debugging
        console.log("[Claude] Full tools count:", tools.length);
      }

      // 计算 thinking budget
      let thinking: { type: "enabled"; budget_tokens: number } | undefined;
      // Enable thinking if specified and not "none"
      const effort = options?.thinkingEffort;
      if (effort && effort !== "none") {
        const budgetMap: Record<string, number> = {
          minimal: 1024,
          low: 2048,
          medium: 4096,
          high: 8192,
          xhigh: 16384,
        };
        thinking = {
          type: "enabled",
          budget_tokens: budgetMap[effort] || 2048,
        };
      }

      // Chain of Thought prompt for tool use (Sonnet/Haiku)
      let finalSystemInstruction = systemInstruction;

      if (
        tools &&
        tools.length > 0 &&
        (model.includes("sonnet") || model.includes("haiku"))
      ) {
        const cotPrompt = `
Answer the user's request using relevant tools (if they are available). Before calling a tool, do some analysis. First, think about which of the provided tools is the relevant tool to answer the user's request. Second, go through each of the required parameters of the relevant tool and determine if the user has directly provided or given enough information to infer a value. When deciding if the parameter can be inferred, carefully consider all the context to see if it supports a specific value. If all of the required parameters are present or can be reasonably inferred, proceed with the tool call. BUT, if one of the values for a required parameter is missing, DO NOT invoke the function (not even with fillers for the missing params) and instead, ask the user to provide the missing parameters. DO NOT ask for more information on optional parameters if it is not provided.
`;
        finalSystemInstruction = `${systemInstruction}\n\n${cotPrompt}`;
      }

      // Convert toolChoice to Claude format
      let toolChoice: MessageCreateParams["tool_choice"] = undefined;
      if (tools && tools.length > 0) {
        if (options?.toolChoice === "required") {
          toolChoice = { type: "any" };
        } else if (options?.toolChoice === "none") {
          // Claude doesn't have a "none" option, just don't pass tools
          // But we keep tools in case model needs them for context
        } else if (
          options?.toolChoice &&
          typeof options.toolChoice === "object"
        ) {
          toolChoice = { type: "tool", name: options.toolChoice.name };
        } else {
          toolChoice = { type: "auto" };
        }
      }

      // 构建请求参数
      const requestParams: MessageCreateParams = {
        model,
        max_tokens: resolveClaudeMaxTokens(model, options),
        system: finalSystemInstruction,
        messages,
        // Thinking 模式下不能使用 temperature (必须为 1.0 或不传，SDK 默认处理)
        // 但为了兼容非 thinking 模式，我们只在非 thinking 时传递 temperature
        ...(thinking
          ? { thinking }
          : { temperature: options?.temperature ?? 1.0 }),
        top_p: options?.topP,
        tools,
        tool_choice: toolChoice,
      };

      let content = "";
      let toolCalls: ToolCallResult[] = [];
      let usage: TokenUsage = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        reported: false,
      };
      let rawResponse: Message | AsyncIterable<MessageStreamEvent>;
      let thinkingContent = ""; // Claude Extended Thinking content

      console.log(
        `[Claude] Starting generation with model: ${model}, stream: ${!!options?.onChunk}, tools: ${tools ? "yes" : "no"}`,
      );

      // Debug: 打印完整请求参数
      console.log(
        "[Claude] Full request params:",
        JSON.stringify(requestParams, null, 2),
      );

      if (options?.onChunk) {
        // 流式生成
        const streamAbortController = new AbortController();
        let abortReason: "stream_stalled" | "stream_timeout" | null = null;
        let stallTimer: ReturnType<typeof setTimeout> | null = null;
        let deadlineTimer: ReturnType<typeof setTimeout> | null = null;
        let sawMessageStop = false;
        let sawToolUseInputDelta = false;
        let sawMeaningfulToolUseStartInput = false;

        const clearStreamTimers = () => {
          if (stallTimer) {
            clearTimeout(stallTimer);
            stallTimer = null;
          }
          if (deadlineTimer) {
            clearTimeout(deadlineTimer);
            deadlineTimer = null;
          }
        };

        const abortStreamWithReason = (
          reason: "stream_stalled" | "stream_timeout",
        ) => {
          if (abortReason) return;
          abortReason = reason;
          streamAbortController.abort();
        };

        const resetStallTimer = () => {
          if (stallTimer) clearTimeout(stallTimer);
          stallTimer = setTimeout(() => {
            abortStreamWithReason("stream_stalled");
          }, CLAUDE_STREAM_IDLE_TIMEOUT_MS);
        };

        deadlineTimer = setTimeout(() => {
          abortStreamWithReason("stream_timeout");
        }, CLAUDE_STREAM_MAX_DURATION_MS);
        resetStallTimer();

        try {
          const stream = client.messages.stream(requestParams, {
            signal: streamAbortController.signal,
            timeout: CLAUDE_STREAM_REQUEST_TIMEOUT_MS,
            maxRetries: 0,
          });

          rawResponse = stream;

          const accumulatedToolCalls: Map<
            number,
            { id: string; name: string; input: string; startInput?: unknown }
          > = new Map();

          for await (const event of stream) {
            resetStallTimer();

            // 处理不同类型的事件
            if (event.type === "content_block_start") {
              const block = event.content_block;
              if (block.type === "tool_use") {
                if (
                  isJsonObject(block.input) &&
                  !isEmptyObjectValue(block.input)
                ) {
                  sawMeaningfulToolUseStartInput = true;
                }
                accumulatedToolCalls.set(event.index, {
                  id: block.id,
                  name: block.name,
                  input: "",
                  startInput: block.input,
                });
              }
            } else if (event.type === "content_block_delta") {
              const delta = event.delta;
              if (delta.type === "text_delta") {
                // 文本内容
                content += delta.text;
                options.onChunk(delta.text);
              } else if (delta.type === "thinking_delta") {
                // Thinking content (Claude Extended Thinking)
                thinkingContent += getThinkingText(delta);
              } else if (delta.type === "input_json_delta") {
                if (delta.partial_json.trim().length > 0) {
                  sawToolUseInputDelta = true;
                }
                const existing = accumulatedToolCalls.get(event.index);
                if (existing) {
                  existing.input += delta.partial_json;
                }
              }
            } else if (event.type === "message_stop") {
              sawMessageStop = true;
            } else if (event.type === "message_delta") {
              // 更新使用量
              if (event.usage) {
                const deltaUsage = parseClaudeUsage(event.usage);
                if (deltaUsage.reported) {
                  usage.completionTokens = Math.max(
                    usage.completionTokens,
                    deltaUsage.completionTokens,
                  );
                  if (typeof deltaUsage.cacheRead === "number") {
                    usage.cacheRead = deltaUsage.cacheRead;
                  }
                  if (typeof deltaUsage.cacheWrite === "number") {
                    usage.cacheWrite = deltaUsage.cacheWrite;
                  }
                  usage.reported = true;
                }
              }
            } else if (event.type === "message_start") {
              // 初始使用量
              if (event.message.usage) {
                const startUsage = parseClaudeUsage(event.message.usage);
                if (startUsage.reported) {
                  usage.promptTokens = Math.max(
                    usage.promptTokens,
                    startUsage.promptTokens,
                  );
                  if (typeof startUsage.cacheWrite === "number") {
                    usage.cacheWrite = startUsage.cacheWrite;
                  }
                  if (typeof startUsage.cacheRead === "number") {
                    usage.cacheRead = startUsage.cacheRead;
                  }
                  usage.reported = true;
                }
              }
            }
          }

          // Use SDK-assembled final message as source of truth for tool_use.input.
          const finalMessage = await stream.finalMessage();

          let finalContent = "";
          let finalThinking = "";
          const finalToolCalls: ToolCallResult[] = [];

          for (const block of finalMessage.content) {
            if (block.type === "text") {
              finalContent += (block as TextBlock).text;
            } else if (block.type === "thinking") {
              finalThinking += getThinkingText(block);
            } else if (block.type === "tool_use") {
              const toolBlock = block as ToolUseBlock;
              finalToolCalls.push({
                id: toolBlock.id,
                name: toolBlock.name,
                args: parseToolArgumentsValue(toolBlock.input, toolBlock.name),
              });
            }
          }

          const accumulatedById = new Map<string, ToolArguments>();
          const accumulatedOrdered = [...accumulatedToolCalls.entries()].sort(
            ([a], [b]) => a - b,
          );
          for (const [, tc] of accumulatedOrdered) {
            const parsedArgs =
              tc.input.trim().length > 0
                ? parseToolArgumentsText(tc.input, tc.name)
                : parseToolArgumentsValue(tc.startInput ?? {}, tc.name);
            accumulatedById.set(tc.id, parsedArgs);
          }

          if (finalToolCalls.length > 0) {
            toolCalls = finalToolCalls.map((call) => {
              const fallbackArgs = accumulatedById.get(call.id);
              if (!fallbackArgs) return call;

              // If SDK final message returns empty tool input, but stream deltas contain
              // a richer payload, prefer the accumulated payload.
              if (
                isEmptyObjectValue(call.args) &&
                !isEmptyObjectValue(fallbackArgs)
              ) {
                return { ...call, args: fallbackArgs };
              }
              return call;
            });
          } else if (accumulatedOrdered.length > 0) {
            toolCalls = accumulatedOrdered.map(([, tc]) => ({
              id: tc.id,
              name: tc.name,
              args:
                tc.input.trim().length > 0
                  ? parseToolArgumentsText(tc.input, tc.name)
                  : parseToolArgumentsValue(tc.startInput ?? {}, tc.name),
            }));
          }

          const hasOnlyEmptyToolArgs =
            toolCalls.length > 0 &&
            toolCalls.every(
              (toolCall) => !hasMeaningfulToolArgs(toolCall.args),
            );
          if (
            accumulatedToolCalls.size > 0 &&
            hasOnlyEmptyToolArgs &&
            !sawMeaningfulToolUseStartInput &&
            !sawToolUseInputDelta &&
            !sawMessageStop
          ) {
            throw new AIProviderError(
              "[ERROR: STREAM_INCOMPLETE] Claude stream ended before tool arguments were fully delivered; tool input remained empty and message_stop was not observed.",
              "claude",
              "STREAM_INCOMPLETE",
            );
          }

          if (finalContent) {
            content = finalContent;
          }

          if (finalThinking) {
            thinkingContent = finalThinking;
          }

          // Prefer final usage when available.
          const finalUsage = parseClaudeUsage(finalMessage.usage);
          if (finalUsage.reported) {
            usage = finalUsage;
          }
        } catch (error) {
          if (abortReason === "stream_stalled") {
            throw new AIProviderError(
              `[ERROR: STREAM_STALLED] Claude streaming response was idle for over ${Math.floor(CLAUDE_STREAM_IDLE_TIMEOUT_MS / 1000)}s and was aborted to prevent hanging.`,
              "claude",
              "STREAM_STALLED",
              error,
            );
          }

          if (abortReason === "stream_timeout") {
            throw new AIProviderError(
              `[ERROR: STREAM_TIMEOUT] Claude streaming response exceeded ${Math.floor(CLAUDE_STREAM_MAX_DURATION_MS / 60000)} minutes and was aborted to prevent hanging.`,
              "claude",
              "STREAM_TIMEOUT",
              error,
            );
          }

          const errorMessage =
            error instanceof Error ? error.message : String(error ?? "");
          if (
            /stream ended without producing a Message|request ended without sending any chunks|Unexpected event order/i.test(
              errorMessage,
            )
          ) {
            throw new AIProviderError(
              "[ERROR: STREAM_INCOMPLETE] Claude streaming response ended before a complete assistant message was assembled.",
              "claude",
              "STREAM_INCOMPLETE",
              error,
            );
          }

          throw error;
        } finally {
          clearStreamTimers();
        }

        if (thinkingContent) {
          console.log(
            `[Claude] Extracted thinking content from stream (${thinkingContent.length} chars)`,
          );
        }

        usage.totalTokens = usage.promptTokens + usage.completionTokens;
      } else {
        // 非流式生成
        const response = await client.messages.create({
          ...requestParams,
          stream: false,
        });

        rawResponse = response;

        // 处理响应内容
        for (const block of response.content) {
          if (block.type === "text") {
            content += (block as TextBlock).text;
          } else if (block.type === "thinking") {
            // 提取 thinking content (Claude Extended Thinking)
            thinkingContent += getThinkingText(block);
          } else if (block.type === "tool_use") {
            const toolBlock = block as ToolUseBlock;
            toolCalls.push({
              id: toolBlock.id,
              name: toolBlock.name,
              args: parseToolArgumentsValue(toolBlock.input, toolBlock.name),
            });
          }
        }

        if (thinkingContent) {
          console.log(
            `[Claude] Extracted thinking content (${thinkingContent.length} chars)`,
          );
        }

        // 检查停止原因
        handleStopReason(response.stop_reason, response.stop_sequence);

        usage = parseClaudeUsage(response.usage);
      }

      console.log(`[Claude] Generation complete. Usage:`, usage);

      // 如果有工具调用，返回工具调用结果（同时保留 content 和 thinking）
      if (toolCalls.length > 0) {
        const toolResult: ClaudeToolResultPayload = {
          functionCalls: toolCalls,
          // 保留 content 以便在下次请求时包含
          content: content || undefined,
        };
        if (thinkingContent) {
          toolResult._thinking = thinkingContent;
        }
        return {
          result: toolResult,
          usage,
          raw: rawResponse,
        };
      }

      // 没有内容也没有工具调用
      if (!content) {
        throw new AIProviderError("No content returned from Claude", "claude");
      }

      // 如果有 schema，解析 JSON
      if (schema) {
        try {
          const cleanedContent = cleanJsonContent(content);
          const result = JSON.parse(jsonrepair(cleanedContent));
          // Schema Validation
          validateSchema(result, schema, "claude");
          if (thinkingContent) {
            return {
              result: { ...result, _thinking: thinkingContent },
              usage,
              raw: rawResponse,
            };
          }
          return { result, usage, raw: rawResponse };
        } catch (error) {
          console.error(`[Claude] Failed to parse JSON content:`, content);
          // If it's already a SchemaValidationError, rethrow it
          if (error instanceof AIProviderError) {
            throw error;
          }
          throw new JSONParseError("claude", content.substring(0, 500), error);
        }
      }

      // 返回纯文本
      const narrative: ClaudeNarrativePayload = { narrative: content };
      if (thinkingContent) {
        narrative._thinking = thinkingContent;
      }
      return { result: narrative, usage, raw: rawResponse };
    },
    3,
    1000,
    "claude",
  );
}

/**
 * 处理停止原因
 */
function handleStopReason(
  stopReason: string | null,
  stopSequence?: string | null,
): void {
  if (stopReason === "max_tokens") {
    console.warn("[Claude] Generation stopped: max_tokens reached");
  } else if (stopReason === "stop_sequence") {
    console.log(`[Claude] Generation stopped by sequence: ${stopSequence}`);
  }
  // Claude 没有明确的 safety filter，但可能在 error 中体现
}

/**
 * 转换消息到 Claude 格式
 */
function convertToClaudeMessages(messages: UnifiedMessage[]): MessageParam[] {
  const result: MessageParam[] = [];

  for (const msg of messages) {
    // 跳过 system 消息（已在顶层处理）
    if (msg.role === "system") {
      continue;
    }

    // 处理工具响应消息
    if (msg.role === "tool") {
      // Claude 要求工具响应必须跟在 assistant 的 tool_use 之后
      // 我们需要将工具响应转换为 user 消息
      const toolContents: Array<{
        type: "tool_result";
        tool_use_id: string;
        content: string;
      }> = [];

      for (const part of msg.content) {
        // Fix: Check for "tool_result" (from messageTypes.ts) not "tool_response"
        if (part.type === "tool_result") {
          const tr = part as {
            type: "tool_result";
            toolResult: { id: string; content: unknown };
          };
          toolContents.push({
            type: "tool_result",
            tool_use_id: tr.toolResult.id,
            content:
              typeof tr.toolResult.content === "string"
                ? tr.toolResult.content
                : JSON.stringify(tr.toolResult.content),
          });
        }
      }

      if (toolContents.length > 0) {
        result.push({
          role: "user",
          content: toolContents,
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

        // 检查是否有 reasoning/thinking content
        const reasoningParts = msg.content.filter(
          (p) => p.type === "reasoning",
        );

        // const content: Array<
        //   | { type: "text"; text: string }
        //   | { type: "thinking"; thinking: string }
        //   | { type: "tool_use"; id: string; name: string; input: unknown }
        // > = [];
        const content: ClaudeAssistantContentPart[] = [];

        // Claude 要求在多轮对话中保留 thinking blocks
        // 如果有 thinking content，首先添加它
        for (const rp of reasoningParts) {
          const reasoningPart = rp as { type: "reasoning"; reasoning: string };
          content.push({
            type: "thinking",
            thinking: reasoningPart.reasoning,
          });
        }

        // 添加文本内容（如果有）
        if (textContent) {
          content.push({ type: "text", text: textContent });
        }

        // 添加工具调用
        for (const tc of toolCallParts) {
          content.push({
            type: "tool_use",
            id: tc.toolUse.id,
            name: tc.toolUse.name,
            input: tc.toolUse.args,
          });
        }

        result.push({
          role: "assistant",
          content: content as MessageParam["content"],
        });
        continue;
      }
    }

    // 处理普通文本消息
    const textContent = msg.content
      .filter((p): p is TextContentPart => p.type === "text")
      .map((p) => p.text)
      .join("\n");

    if (textContent) {
      result.push({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: textContent,
      });
    }
  }

  return result;
}

/**
 * 转换工具定义到 Claude 格式
 *
 * 根据 Anthropic 官方文档：
 * - Claude 使用 input_schema 而不是 parameters
 * - Claude 支持 strict: true 用于保证 schema 一致性
 * - Claude 不支持 additionalProperties 字段
 */
function convertToolsForClaude(
  tools: Array<{ name: string; description: string; parameters: ZodTypeAny }>,
): Tool[] {
  return tools.map((tool) => {
    // 使用 Claude 兼容的 schema 处理器
    // - 使用简单类型 "string" 而不是数组 ["string", "null"]
    // - 不包含 additionalProperties
    const schema = zodToClaudeCompatibleSchema(tool.parameters);

    // 构建 input_schema，只有在有必填字段时才包含 required
    const inputSchema: {
      type: "object";
      properties: JsonObject;
      required?: string[];
    } = {
      type: "object" as const,
      properties: isJsonObject(schema.properties) ? schema.properties : {},
    };

    // 只有在有必填字段时才添加 required
    if (schema.required && schema.required.length > 0) {
      inputSchema.required = schema.required;
    }

    return {
      name: tool.name,
      description: tool.description,
      input_schema: inputSchema,
    };
  });
}

/**
 * 递归移除 schema 中的 additionalProperties 字段
 */
function removeAdditionalProperties(schema: JsonObject): JsonObject {
  const result: JsonObject = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === "additionalProperties") {
      continue; // 跳过 additionalProperties
    }
    if (isJsonObject(value)) {
      result[key] = removeAdditionalProperties(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        isJsonObject(item) ? removeAdditionalProperties(item) : item,
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}

// ============================================================================
// Image Generation (Not Supported)
// ============================================================================

/**
 * 生成图片 (Claude 不支持)
 */
export async function generateImage(
  _config: ClaudeConfig,
  _model: string,
  _prompt: string,
  _resolution?: string,
): Promise<ImageGenerationResponse> {
  throw new AIProviderError(
    "Image generation is not supported by Claude provider",
    "claude",
    "UNSUPPORTED",
  );
}

// ============================================================================
// Video Generation (Not Supported)
// ============================================================================

/**
 * 生成视频 (Claude 不支持)
 */
export async function generateVideo(
  _config: ClaudeConfig,
  _model: string,
  _imageBase64: string,
  _prompt: string,
): Promise<never> {
  throw new AIProviderError(
    "Video generation is not supported by Claude provider",
    "claude",
    "UNSUPPORTED",
  );
}

// ============================================================================
// Speech Generation (Not Supported)
// ============================================================================

/**
 * 生成语音 (Claude 不支持)
 */
export async function generateSpeech(
  _config: ClaudeConfig,
  _model: string,
  _text: string,
  _voiceName?: string,
  _options?: SpeechGenerationOptions,
): Promise<SpeechGenerationResponse> {
  throw new AIProviderError(
    "Speech generation is not supported by Claude provider",
    "claude",
    "UNSUPPORTED",
  );
}

// ============================================================================
// Embedding Generation (Not Supported)
// ============================================================================

/**
 * 获取嵌入模型列表 (Claude 不支持)
 */
export async function getEmbeddingModels(
  _config: ClaudeConfig,
): Promise<EmbeddingModelInfo[]> {
  return [];
}

/**
 * 生成嵌入向量 (Claude 不支持)
 */
export async function generateEmbedding(
  _config: ClaudeConfig,
  _modelId: string,
  _texts: string[],
  _dimensions?: number,
  _taskType?: string,
): Promise<EmbeddingResponse> {
  throw new AIProviderError(
    "Embedding generation is not supported by Claude provider",
    "claude",
    "UNSUPPORTED",
  );
}

// ============================================================================
// Re-exports for Backward Compatibility
// ============================================================================

export type {
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
