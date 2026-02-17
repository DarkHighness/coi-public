/**
 * ============================================================================
 * OpenRouter Provider - SDK Implementation
 * ============================================================================
 *
 * Uses @openrouter/sdk for all API interactions:
 * - Model listing (getModels, getEmbeddingModels)
 * - Content generation (streaming + structured outputs)
 * - Tool calls
 * - Image generation
 * - Speech generation (delegation to OpenAI provider)
 * - Embedding generation
 */
import { OpenRouter } from "@openrouter/sdk";
import * as models from "@openrouter/sdk/models";
import { jsonrepair } from "jsonrepair";
import type {
  EmbeddingTaskType,
  TokenUsage,
  JsonObject,
  ToolArguments,
} from "../../types";
import { parseModelCapabilities } from "../modelUtils";
import { generateSpeech as generateOpenAISpeech } from "./openaiProvider";
import {
  OpenRouterConfig,
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
  SafetyFilterError,
  JSONParseError,
  AIProviderError,
  MalformedToolCallError,
  getAspectRatio,
} from "./types";
import { extractOpenRouterToolCalls } from "./openRouterToolParser";
// Re-export OpenRouterConfig for consumers
export type { OpenRouterConfig } from "./types";
import {
  zodToOpenAIResponseFormat,
  zodToGemini,
  createGeminiTool,
  createOpenRouterTool,
  isGeminiModel,
  isClaudeModel,
} from "../zodCompiler";
import {
  DEFAULT_PROTOCOL_MAX_OUTPUT_FALLBACK_TOKENS,
  MIN_RECOMMENDED_OUTPUT_FALLBACK_TOKENS,
  getDefaultModelMaxOutputTokens,
  isLowOutputFallbackSetting,
  sanitizePositiveOutputTokens,
} from "../modelOutputTokens";
import type { ZodTypeAny } from "zod";
import { withRetry, validateSchema, cleanJsonContent } from "./utils";
// ============================================================================
// SDK Client Creation
// ============================================================================
/**
 * Create OpenRouter SDK client instance
 */
function createClient(config: OpenRouterConfig): OpenRouter {
  return new OpenRouter({
    apiKey: config.apiKey,
  });
}
/**
 * Create request options with custom headers for OpenRouter
 */
function createRequestOptions(): OpenRouterRequestOptions {
  return {
    fetchOptions: {
      headers: {
        "HTTP-Referer":
          typeof window !== "undefined" ? window.location.origin : "",
        "X-Title": "CoI Game",
      },
    },
  };
}
// ============================================================================
// Response Types
// ============================================================================
/** Content Generation Response */
export interface OpenRouterContentGenerationResponse {
  result: { functionCalls?: ToolCallResult[] } | JsonObject | string;
  usage: TokenUsage;
  raw: unknown;
}

interface OpenRouterRequestOptions {
  fetchOptions: {
    headers: {
      "HTTP-Referer": string;
      "X-Title": string;
    };
  };
}

type OpenRouterModelWithFallback = models.Model & {
  slug?: string;
  context_length?: number;
};

interface OpenRouterReasoningOption {
  effort: string;
  exclude?: boolean;
}

interface OpenRouterResponseFormatOption {
  type: string;
  schema?: unknown;
  jsonSchema?: unknown;
}

type OpenRouterToolChoiceOption =
  | "required"
  | "none"
  | "auto"
  | {
      type: "function";
      function: { name: string };
    };

interface OpenRouterGenerationParams {
  model: string;
  messages: models.Message[];
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  minP?: number;
  stream?: boolean;
  tools?: unknown[];
  toolChoice?: OpenRouterToolChoiceOption;
  allow_fallbacks?: boolean;
  require_parameters?: boolean;
  sort?: string;
  reasoning?: OpenRouterReasoningOption;
  responseFormat?: OpenRouterResponseFormatOption;
}

interface OpenRouterGenerationToolResult extends JsonObject {
  functionCalls: ToolCallResult[];
  content?: string;
  _reasoning?: string;
}

interface OpenRouterGenerationTextResult extends JsonObject {
  content: string;
  _reasoning?: string;
}

interface OpenRouterCompatToolCall extends models.ChatMessageToolCall {
  function: models.ChatMessageToolCallFunction & {
    thought_signature?: string;
  };
  extra_content?: {
    google?: {
      thought_signature?: string;
    };
  };
}

interface OpenRouterStreamingDeltaCompat
  extends models.ChatStreamingMessageChunk {
  reasoning_content?: string;
  tool_calls?: models.ChatStreamingMessageToolCall[];
}

interface OpenRouterImageGenerationParams extends OpenRouterGenerationParams {
  modalities: string[];
  imageConfig: {
    aspectRatio: string;
  };
}

interface OpenRouterImageResultRecord {
  imageUrl?: {
    url?: string;
  };
  image_url?: {
    url?: string;
  };
}

interface OpenRouterEmbeddingItemDto {
  index: number;
  embedding: number[];
}

const isRecord = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const requireRecord = (value: unknown, context: string): JsonObject => {
  if (!isRecord(value)) {
    throw new AIProviderError(
      `Invalid OpenRouter ${context} response shape`,
      "openrouter",
      "INVALID_RESPONSE",
    );
  }
  return value;
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
    throw new MalformedToolCallError("openrouter", toolName, rawArguments);
  }

  if (!isRecord(parsed)) {
    throw new MalformedToolCallError("openrouter", toolName, rawArguments);
  }

  return parsed;
};

type OpenRouterResolvedProviderProtocol = "openai" | "gemini" | "claude";
const OPENROUTER_PROTOCOL_MAX_OUTPUT_FALLBACK: Record<
  OpenRouterResolvedProviderProtocol,
  number
> = {
  openai: DEFAULT_PROTOCOL_MAX_OUTPUT_FALLBACK_TOKENS.openai,
  claude: DEFAULT_PROTOCOL_MAX_OUTPUT_FALLBACK_TOKENS.claude,
  gemini: DEFAULT_PROTOCOL_MAX_OUTPUT_FALLBACK_TOKENS.gemini,
};
const WARNED_LOW_OPENROUTER_FALLBACKS = new Set<string>();

const normalizeOpenRouterModelId = (model: string): string => {
  const trimmed = model.trim().toLowerCase();
  if (!trimmed) {
    return trimmed;
  }
  const slashIndex = trimmed.lastIndexOf("/");
  return slashIndex >= 0 ? trimmed.slice(slashIndex + 1) : trimmed;
};

const resolveOpenRouterProviderProtocol = (
  model: string,
): OpenRouterResolvedProviderProtocol => {
  const normalizedModel = normalizeOpenRouterModelId(model);
  const lower = model.trim().toLowerCase();
  if (
    lower.startsWith("anthropic/") ||
    isClaudeModel(model) ||
    isClaudeModel(normalizedModel)
  ) {
    return "claude";
  }
  if (
    lower.startsWith("google/") ||
    isGeminiModel(model) ||
    isGeminiModel(normalizedModel)
  ) {
    return "gemini";
  }
  return "openai";
};

export const resolveOpenRouterMaxTokens = (
  model: string,
  options?: GenerateContentOptions,
): number => {
  const protocol = resolveOpenRouterProviderProtocol(model);
  const normalizedModel = normalizeOpenRouterModelId(model);
  const mapped =
    getDefaultModelMaxOutputTokens(protocol, normalizedModel) ||
    getDefaultModelMaxOutputTokens(protocol, model);
  if (mapped) {
    return mapped;
  }

  const configuredFallback = sanitizePositiveOutputTokens(
    options?.maxOutputTokensFallback,
  );
  if (configuredFallback) {
    if (isLowOutputFallbackSetting(configuredFallback)) {
      const warningKey = `${protocol}:${normalizedModel}:${configuredFallback}`;
      if (!WARNED_LOW_OPENROUTER_FALLBACKS.has(warningKey)) {
        WARNED_LOW_OPENROUTER_FALLBACKS.add(warningKey);
        console.warn(
          `[OpenRouter] maxOutputTokensFallback=${configuredFallback} is below recommended ${MIN_RECOMMENDED_OUTPUT_FALLBACK_TOKENS}; low values can truncate responses and break game flow.`,
        );
      }
    }
    return configuredFallback;
  }

  return OPENROUTER_PROTOCOL_MAX_OUTPUT_FALLBACK[protocol];
};

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

const readString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const readStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
};

const getReasoningContent = (value: unknown): string => {
  if (!isRecord(value)) return "";
  const reasoningContent = readString(value.reasoning_content);
  if (reasoningContent) return reasoningContent;
  const reasoning = readString(value.reasoning);
  return reasoning || "";
};

const getThoughtSignature = (value: unknown): string | undefined => {
  if (!isRecord(value)) return undefined;

  const extraContent = isRecord(value.extra_content)
    ? value.extra_content
    : undefined;
  const google =
    extraContent && isRecord(extraContent.google)
      ? extraContent.google
      : undefined;
  const googleSignature = readString(google?.thought_signature);
  if (googleSignature) return googleSignature;

  const toolFunction = isRecord(value.function) ? value.function : undefined;
  return readString(toolFunction?.thought_signature);
};
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
      if (!isRecord(current)) {
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

const OPENROUTER_PROMPT_KEYS = [
  "promptTokens",
  "prompt_tokens",
  "inputTokens",
  "input_tokens",
] as const;
const OPENROUTER_COMPLETION_KEYS = [
  "completionTokens",
  "completion_tokens",
  "outputTokens",
  "output_tokens",
] as const;
const OPENROUTER_TOTAL_KEYS = ["totalTokens", "total_tokens"] as const;
const OPENROUTER_CACHE_READ_KEYS = [
  "cacheReadInputTokens",
  "cache_read_input_tokens",
  "cacheReadTokens",
] as const;
const OPENROUTER_CACHE_WRITE_KEYS = [
  "cacheCreationInputTokens",
  "cache_creation_input_tokens",
  "cacheWriteTokens",
] as const;
const OPENROUTER_CACHE_READ_NESTED_PATHS = [
  ["prompt_tokens_details", "cached_tokens"],
  ["promptTokensDetails", "cachedTokens"],
] as const;
const OPENROUTER_ALL_USAGE_KEYS = [
  ...OPENROUTER_PROMPT_KEYS,
  ...OPENROUTER_COMPLETION_KEYS,
  ...OPENROUTER_TOTAL_KEYS,
  ...OPENROUTER_CACHE_READ_KEYS,
  ...OPENROUTER_CACHE_WRITE_KEYS,
] as const;

export function parseOpenRouterUsage(usageMetadata: unknown): TokenUsage {
  const usage = isRecord(usageMetadata) ? usageMetadata : null;

  const prompt = readUsageNumber(usage, [...OPENROUTER_PROMPT_KEYS]);
  const completion = readUsageNumber(usage, [...OPENROUTER_COMPLETION_KEYS]);
  const total = readUsageNumber(usage, [...OPENROUTER_TOTAL_KEYS]);
  const cacheReadDirect = readUsageNumber(usage, [
    ...OPENROUTER_CACHE_READ_KEYS,
  ]);
  const cacheReadNested = readNestedUsageNumber(usage, [
    ...OPENROUTER_CACHE_READ_NESTED_PATHS,
  ]);
  const cacheWrite = readUsageNumber(usage, [...OPENROUTER_CACHE_WRITE_KEYS]);

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

  const hasKnownUsageKeys = hasAnyUsageField(usage, [
    ...OPENROUTER_ALL_USAGE_KEYS,
  ]);
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
 * Validate OpenRouter API Connection
 */
export async function validateConnection(
  config: OpenRouterConfig,
): Promise<void> {
  try {
    const client = createClient(config);
    await client.models.list();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new AIProviderError(
      `Failed to connect to OpenRouter API: ${message}`,
      "openrouter",
      undefined,
      error,
    );
  }
}
// ============================================================================
// Credits & Balance
// ============================================================================
export interface OpenRouterCredits {
  totalCredits: number;
  usedCredits: number;
  remainingCredits: number;
}
/**
 * Get OpenRouter account credits (balance information)
 */
export async function getCredits(
  config: OpenRouterConfig,
): Promise<OpenRouterCredits> {
  try {
    const client = createClient(config);
    const response = await client.credits.getCredits();
    const responseRecord = requireRecord(response, "credits");
    const responseData = isRecord(responseRecord.data)
      ? responseRecord.data
      : {};

    // Parse the response to get credit information
    const totalCredits =
      readNumber(responseData.totalCredits) ??
      readNumber(responseRecord.totalCredits);
    if (typeof totalCredits !== "number") {
      throw new AIProviderError(
        "OpenRouter credits response missing totalCredits",
        "openrouter",
        "INVALID_RESPONSE",
      );
    }
    const usedCredits =
      readNumber(responseData.usedCredits) ??
      readNumber(responseData.totalUsage) ??
      readNumber(responseRecord.usedCredits) ??
      readNumber(responseRecord.totalUsage) ??
      0;
    const remainingCredits = totalCredits - usedCredits;
    return {
      totalCredits,
      usedCredits,
      remainingCredits,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new AIProviderError(
      `Failed to fetch OpenRouter credits: ${message}`,
      "openrouter",
      undefined,
      error,
    );
  }
}
// ============================================================================
// Model Listing
// ============================================================================
/**
 * Get available OpenRouter models using SDK
 */
export async function getModels(
  config: OpenRouterConfig,
): Promise<ModelInfo[]> {
  try {
    const client = createClient(config);
    const response = await client.models.list();
    if (!response.data || !Array.isArray(response.data)) {
      throw new Error("Invalid response format from models.list()");
    }
    return response.data.map((rawModel) => {
      const m = rawModel as OpenRouterModelWithFallback;
      const id = m.id || m.slug || "";
      const name = m.name || m.id || m.slug || "";
      const capabilities = inferModelCapabilities({
        id,
        name,
        ...m,
      });
      return {
        id,
        name,
        contextLength: m.contextLength ?? m.context_length ?? undefined,
        capabilities,
      };
    });
  } catch (error) {
    console.warn("Failed to list OpenRouter models via SDK:", error);
    return [];
  }
}
/**
 * Infer model capabilities
 */
function inferModelCapabilities(modelData: {
  id: string;
  name?: string;
  [key: string]: unknown;
}): ModelCapabilities {
  const parsedCaps = parseModelCapabilities(modelData);
  const capabilities: ModelCapabilities = {
    text: parsedCaps.text ?? true,
    image: parsedCaps.image ?? false,
    video: parsedCaps.video ?? false,
    audio: parsedCaps.audio ?? false,
    tools: parsedCaps.tools ?? false,
    parallelTools: parsedCaps.parallelTools ?? false,
  };
  const id = modelData.id.toLowerCase();
  // Heuristic inference based on ID
  if (
    !capabilities.image &&
    (id.includes("vision") ||
      id.includes("claude-3") ||
      id.includes("gpt-4") ||
      id.includes("gemini") ||
      id.includes("llava") ||
      id.includes("vl"))
  ) {
    capabilities.image = true;
  }
  if (
    !capabilities.tools &&
    (id.includes("gpt-4") ||
      id.includes("gpt-3.5-turbo") ||
      id.includes("claude-3") ||
      id.includes("mistral-large") ||
      id.includes("gemini-1.5") ||
      id.includes("command-r"))
  ) {
    capabilities.tools = true;
  }
  return capabilities;
}
// ============================================================================
// Content Generation
// ============================================================================
/**
 * Generate content (chat/tool calls) using SDK
 */
export async function generateContent(
  config: OpenRouterConfig,
  model: string,
  systemInstruction: string,
  contents: UnifiedMessage[],
  schema?: ZodTypeAny,
  options?: GenerateContentOptions,
): Promise<OpenRouterContentGenerationResponse> {
  return withRetry(
    async () => {
      const client = createClient(config);
      const isGemini = isGeminiModel(model);
      // Convert messages
      const messages = convertToOpenAIMessages(systemInstruction, contents);
      // Convert tools
      const tools = options?.tools
        ? isGemini
          ? options.tools.map((t) =>
              createGeminiTool(t.name, t.description, t.parameters),
            )
          : convertToOpenRouterTools(options.tools)
        : undefined;

      // Convert toolChoice
      let toolChoice: OpenRouterToolChoiceOption | undefined;
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

      // Build request parameters
      const requestParams: OpenRouterGenerationParams = {
        model,
        messages,
        maxTokens: resolveOpenRouterMaxTokens(model, options),
        temperature: options?.temperature,
        topP: options?.topP,
        topK: options?.topK,
        minP: options?.minP,
        stream: !!options?.onChunk,
        tools,
        toolChoice,
        // Openrouter specific parameters
        allow_fallbacks: true,
        require_parameters: true,
        sort: "price",
        // OpenRouter plugins
        // plugins: [{ id: "response-healing" }],
      };

      // Unified Reasoning Parameters (OpenRouter)
      // Reference: https://openrouter.ai/docs/guides/best-practices/reasoning-tokens
      let reasoning: OpenRouterReasoningOption | undefined;

      const effort = options?.thinkingEffort;

      if (effort === "none") {
        reasoning = { effort: "none", exclude: true };
      } else if (effort) {
        // xhigh, high, medium, low, minimal are all passed to OpenRouter
        reasoning = { effort: effort };
      }

      if (reasoning) {
        requestParams.reasoning = reasoning;
      }

      // Add schema for structured output (only when no tools are present)
      if (schema && (!tools || tools.length === 0)) {
        const openAIFormat = zodToOpenAIResponseFormat(schema);
        requestParams.responseFormat = isGemini
          ? { type: "json_schema", schema: zodToGemini(schema) }
          : {
              type: openAIFormat.type,
              jsonSchema: openAIFormat.json_schema, // Convert to camelCase for SDK
            };
      }

      console.log(
        `[OpenRouter] Starting generation with model: ${model}, stream: ${!!options?.onChunk}, tools: ${requestParams.tools ? "yes" : "no"}, isGemini: ${isGemini}`,
      );
      if (isGemini && schema && !tools && requestParams.responseFormat) {
        console.log(
          "[OpenRouter] Detected Gemini model, using Gemini schema format:",
          JSON.stringify(requestParams.responseFormat, null, 2),
        );
      }
      try {
        if (options?.onChunk) {
          // Streaming response
          return await handleStreamingResponse(
            client,
            requestParams,
            options.onChunk,
            schema,
          );
        } else {
          // Non-streaming response
          return await handleNonStreamingResponse(
            client,
            requestParams,
            schema,
          );
        }
      } catch (error) {
        if (error instanceof AIProviderError) throw error;
        const message =
          error instanceof Error ? error.message : "Unknown error";
        throw new AIProviderError(
          `OpenRouter generation failed: ${message}`,
          "openrouter",
          undefined,
          error,
        );
      }
    },
    3,
    1000,
    "openrouter",
  );
}
/**
 * Handle non-streaming response using SDK
 */
async function handleNonStreamingResponse(
  client: OpenRouter,
  params: OpenRouterGenerationParams,
  schema?: ZodTypeAny,
): Promise<OpenRouterContentGenerationResponse> {
  const response = (await client.chat.send(
    params as models.ChatGenerationParams,
    createRequestOptions(),
  )) as models.ChatResponse;
  const choice = response.choices?.[0];
  const message = choice?.message;
  const content = typeof message?.content === "string" ? message.content : "";
  let toolCalls: ToolCallResult[] = [];
  try {
    toolCalls = extractOpenRouterToolCalls(message);
  } catch (error) {
    console.error("[OpenRouter] Failed to parse tool calls:", error);
    throw error;
  }
  if (choice?.finishReason === "content_filter") {
    throw new SafetyFilterError("openrouter");
  }
  const usage = parseOpenRouterUsage(response.usage);

  // 提取 reasoning content (如果存在)
  const reasoningContent = getReasoningContent(message);

  console.log(`[OpenRouter] Generation complete. Usage:`, usage);

  if (toolCalls.length > 0) {
    const toolResult: OpenRouterGenerationToolResult = {
      functionCalls: toolCalls,
      // 保留 content 以便在下次请求时包含
      content: content || undefined,
    };
    if (reasoningContent) {
      toolResult._reasoning = reasoningContent;
    }
    return {
      result: toolResult,
      usage,
      raw: response,
    };
  }
  if (schema && content) {
    try {
      const cleanedContent = cleanJsonContent(content);
      const result = JSON.parse(jsonrepair(cleanedContent));
      validateSchema(result, schema, "openrouter");
      if (reasoningContent) {
        return {
          result: { ...result, _reasoning: reasoningContent },
          usage,
          raw: response,
        };
      }
      return { result, usage, raw: response };
    } catch (error) {
      console.error(`[OpenRouter] Failed to parse JSON content:`, content);
      if (error instanceof AIProviderError) {
        throw error;
      }
      throw new JSONParseError("openrouter", content.substring(0, 500), error);
    }
  }
  // 返回纯文本
  const result: OpenRouterGenerationTextResult = { content };
  if (reasoningContent) {
    result._reasoning = reasoningContent;
  }
  return { result, usage, raw: response };
}
/**
 * Handle streaming response using SDK
 */
async function handleStreamingResponse(
  client: OpenRouter,
  params: OpenRouterGenerationParams,
  onChunk: (text: string) => void,
  schema?: ZodTypeAny,
): Promise<OpenRouterContentGenerationResponse> {
  const stream = (await client.chat.send(
    { ...params, stream: true } as models.ChatGenerationParams & {
      stream: true;
    },
    createRequestOptions(),
  )) as AsyncIterable<models.ChatStreamingResponseChunkData>;
  let content = "";
  let reasoningContent = ""; // 累积 reasoning content
  let usage: TokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    reported: false,
  };
  const accumulatedToolCalls: Map<
    number,
    { id: string; name: string; arguments: string; thoughtSignature?: string }
  > = new Map();
  try {
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta as
        | OpenRouterStreamingDeltaCompat
        | undefined;
      if (delta?.content) {
        content += delta.content;
        onChunk(delta.content);
      }
      // 处理 reasoning content
      const deltaReasoning = getReasoningContent(delta);
      if (deltaReasoning) {
        reasoningContent += deltaReasoning;
      }
      const deltaToolCalls = delta?.toolCalls || delta?.tool_calls;
      if (deltaToolCalls) {
        for (const tc of deltaToolCalls) {
          const index = typeof tc.index === "number" ? tc.index : 0;
          const existing = accumulatedToolCalls.get(index);
          if (existing) {
            if (tc.function?.arguments) {
              existing.arguments += tc.function.arguments;
            }
          } else {
            accumulatedToolCalls.set(index, {
              id: tc.id || `tool_${index}`,
              name: tc.function?.name || "",
              arguments: tc.function?.arguments || "",
              // Gemini 3 uses extra_content.google.thought_signature format
              thoughtSignature: getThoughtSignature(tc),
            });
          }
        }
      }
      if (chunk.usage) {
        usage = parseOpenRouterUsage(chunk.usage);
      }
    }
  } catch (e) {
    console.error("Stream processing error:", e);
    throw e;
  }
  const toolCalls: ToolCallResult[] = [];
  for (const [, tc] of accumulatedToolCalls) {
    toolCalls.push({
      id: tc.id,
      name: tc.name,
      args: parseToolArguments(tc.arguments, tc.name),
      thoughtSignature: tc.thoughtSignature,
    });
  }
  console.log(`[OpenRouter] Stream complete. Usage:`, usage);

  if (toolCalls.length > 0) {
    const toolResult: OpenRouterGenerationToolResult = {
      functionCalls: toolCalls,
      // 保留 content 以便在下次请求时包含
      content: content || undefined,
    };
    if (reasoningContent) {
      toolResult._reasoning = reasoningContent;
    }
    return {
      result: toolResult,
      usage,
      raw: null,
    };
  }
  if (schema && content) {
    try {
      const cleanedContent = cleanJsonContent(content);
      const result = JSON.parse(jsonrepair(cleanedContent));
      validateSchema(result, schema, "openrouter");
      if (reasoningContent) {
        return {
          result: { ...result, _reasoning: reasoningContent },
          usage,
          raw: null,
        };
      }
      return { result, usage, raw: null };
    } catch (error) {
      console.error(`[OpenRouter] Failed to parse JSON content:`, content);
      if (error instanceof AIProviderError) {
        throw error;
      }
      throw new JSONParseError("openrouter", content.substring(0, 500), error);
    }
  }
  // 返回纯文本
  const result: OpenRouterGenerationTextResult = { content };
  if (reasoningContent) {
    result._reasoning = reasoningContent;
  }
  return { result, usage, raw: null };
}
/**
 * Convert messages to OpenAI format
 */
function convertToOpenAIMessages(
  systemInstruction: string,
  messages: UnifiedMessage[],
): models.Message[] {
  const result: models.Message[] = [
    { role: "system", content: systemInstruction },
  ];
  for (const msg of messages) {
    if (msg.role === "tool") {
      for (const part of msg.content) {
        // Fix: Check for "tool_result" (from messageTypes.ts) not "tool_response"
        if (part.type === "tool_result") {
          const tr = part as {
            type: "tool_result";
            toolResult: { id: string; name: string; content: unknown };
          };
          // OpenRouter SDK uses camelCase format
          result.push({
            role: "tool",
            toolCallId: tr.toolResult.id,
            content:
              typeof tr.toolResult.content === "string"
                ? tr.toolResult.content
                : JSON.stringify(tr.toolResult.content),
          });
        }
      }
      continue;
    }
    if (msg.role === "assistant") {
      const toolCallParts = msg.content.filter(
        (p): p is ToolCallContentPart => p.type === "tool_use",
      );
      if (toolCallParts.length > 0) {
        const textContent = msg.content
          .filter((p): p is TextContentPart => p.type === "text")
          .map((p) => p.text)
          .join("\n");
        // OpenRouter SDK uses camelCase format
        const toolCalls: OpenRouterCompatToolCall[] = toolCallParts.map((p) => {
          const toolCall: OpenRouterCompatToolCall = {
            id: p.toolUse.id,
            type: "function",
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
        });

        result.push({
          role: "assistant",
          content: textContent || null,
          toolCalls,
        });
        continue;
      }
    }
    // Handle user messages with potential image content
    const textParts = msg.content.filter(
      (p): p is TextContentPart => p.type === "text",
    );
    const imageParts = msg.content.filter(
      (p): p is ImageContentPart => p.type === "image",
    );

    // If there are images, use multipart content format
    if (imageParts.length > 0 && msg.role === "user") {
      const contentArray: models.ChatMessageContentItem[] = [];

      // Add text content first
      const textContent = textParts.map((p) => p.text).join("\n");
      if (textContent) {
        contentArray.push({ type: "text", text: textContent });
      }

      // Add image content - OpenRouter SDK uses camelCase
      for (const ip of imageParts) {
        const dataUrl = `data:${ip.mimeType};base64,${ip.data}`;
        contentArray.push({
          type: "image_url",
          imageUrl: { url: dataUrl },
        });
      }

      result.push({
        role: "user",
        content: contentArray,
      });
      continue;
    }

    // Handle plain text messages
    const textContent = textParts.map((p) => p.text).join("\n");
    result.push({
      role: msg.role,
      content: textContent,
    });
  }
  return result;
}
/**
 * Convert tools to OpenRouter format
 */
function convertToOpenRouterTools(
  tools: GenerateContentOptions["tools"],
): models.ToolDefinitionJson[] {
  return (tools || []).map(
    (tool) =>
      createOpenRouterTool(
        tool.name,
        tool.description,
        tool.parameters,
      ) as models.ToolDefinitionJson,
  );
}
// ============================================================================
// Image Generation
// ============================================================================
/**
 * Generate Image using SDK with modalities parameter
 * Supports modern image generation models via chat completions endpoint
 */
export async function generateImage(
  config: OpenRouterConfig,
  model: string,
  prompt: string,
  resolution: string = "1024x1024",
): Promise<ImageGenerationResponse> {
  return generateImageLegacy(config, model, prompt, resolution);

  // Openrouter SDK does not working!!!
  const aspectRatio = getAspectRatio(resolution);
  const client = createClient(config);
  try {
    // Modern approach: Use chat completions with modalities
    // This works for models with "image" in output_modalities (Gemini, Flux, etc.)
    const response = await client.chat.send(
      {
        model,
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
        imageConfig: { aspectRatio },
        stream: false,
      } as models.ChatGenerationParams,
      createRequestOptions(),
    );
    const data = requireRecord(response, "image generation");
    const choices = Array.isArray(data.choices) ? data.choices : [];
    const firstChoice = choices[0];
    const firstChoiceRecord = isRecord(firstChoice) ? firstChoice : null;
    if (!firstChoiceRecord) {
      throw new AIProviderError(
        "OpenRouter image generation returned no choices",
        "openrouter",
        "INVALID_RESPONSE",
      );
    }
    const message = isRecord(firstChoiceRecord.message)
      ? firstChoiceRecord.message
      : null;
    if (!message) {
      throw new AIProviderError(
        "OpenRouter image generation returned invalid message payload",
        "openrouter",
        "INVALID_RESPONSE",
      );
    }
    const images = Array.isArray(message.images) ? message.images : [];
    const firstImage = isRecord(images[0])
      ? (images[0] as OpenRouterImageResultRecord)
      : undefined;

    // Check for images in the response
    if (firstImage) {
      return {
        url: firstImage.imageUrl?.url || firstImage.image_url?.url,
        raw: data,
        usage: data.usage ? parseOpenRouterUsage(data.usage) : undefined,
      };
    }
    // Fallback: Check if URL is in content (some models)
    const content = readString(message.content);
    const urlMatch = content?.match(/https?:\/\/[^\s)]+/);
    if (urlMatch) {
      return { url: urlMatch[0], raw: data };
    }
    throw new AIProviderError("No image generated in response", "openrouter");
  } catch (error) {
    // For models that don't support modalities, fall back to legacy endpoint
    if (
      error instanceof Error &&
      (error.message.includes("modalities") ||
        error.message.includes("not supported"))
    ) {
      console.warn(
        "[OpenRouter] Model doesn't support modalities, trying legacy images/generations endpoint",
      );
      return generateImageLegacy(config, model, prompt, resolution);
    }
    throw error instanceof AIProviderError
      ? error
      : new AIProviderError(
          `Image generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          "openrouter",
          undefined,
          error,
        );
  }
}
/**
 * Legacy image generation for models using /images/generations endpoint
 * Kept for backward compatibility with DALL-E and similar models
 */
async function generateImageLegacy(
  config: OpenRouterConfig,
  model: string,
  prompt: string,
  resolution: string,
): Promise<ImageGenerationResponse> {
  const aspectRatio = getAspectRatio(resolution);
  let size = resolution;
  // DALL-E specific size handling
  if (model.toLowerCase().includes("dall-e-3")) {
    if (["1:1"].includes(aspectRatio)) size = "1024x1024";
    else if (["2:3", "3:4", "4:5", "9:16"].includes(aspectRatio))
      size = "1024x1792";
    else size = "1792x1024";
  }
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer":
          typeof window !== "undefined" ? window.location.origin : "",
        "X-Title": "CoI Game",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
        imageConfig: { aspectRatio },
      }),
    },
  );
  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as unknown;
    const errRecord = isRecord(err) ? err : {};
    const errError = isRecord(errRecord.error) ? errRecord.error : {};
    const errorMessage = readString(errError.message);
    throw new AIProviderError(
      errorMessage || `OpenRouter Image API Error: ${response.status}`,
      "openrouter",
    );
  }
  const result = (await response.json()) as unknown;
  const resultRecord = requireRecord(result, "legacy image generation");
  const choices = Array.isArray(resultRecord.choices)
    ? resultRecord.choices
    : [];
  const firstChoice = isRecord(choices[0]) ? choices[0] : null;
  if (!firstChoice) {
    throw new AIProviderError(
      "OpenRouter image generation returned no choices",
      "openrouter",
      "INVALID_RESPONSE",
    );
  }
  const message = isRecord(firstChoice.message) ? firstChoice.message : null;
  if (!message) {
    throw new AIProviderError(
      "OpenRouter image generation returned invalid message payload",
      "openrouter",
      "INVALID_RESPONSE",
    );
  }
  const images = Array.isArray(message.images) ? message.images : [];
  const firstImage = isRecord(images[0])
    ? (images[0] as OpenRouterImageResultRecord)
    : undefined;
  if (!firstImage?.image_url?.url && !firstImage?.imageUrl?.url) {
    throw new AIProviderError(
      "OpenRouter image generation returned no image URL",
      "openrouter",
      "INVALID_RESPONSE",
    );
  }
  return {
    url: firstImage.image_url?.url || firstImage.imageUrl?.url || null,
    raw: resultRecord,
  };
}
// ============================================================================
// Video Generation (Not Supported)
// ============================================================================
export async function generateVideo(
  _config: OpenRouterConfig,
  _model: string,
  _imageBase64: string,
  _prompt: string,
): Promise<never> {
  throw new AIProviderError(
    "Video generation is not supported by OpenRouter provider",
    "openrouter",
    "UNSUPPORTED",
  );
}
// ============================================================================
// Speech Generation
// ============================================================================
export async function generateSpeech(
  config: OpenRouterConfig,
  model: string,
  text: string,
  voiceName: string = "alloy",
  options?: SpeechGenerationOptions,
): Promise<SpeechGenerationResponse> {
  const openaiConfig: OpenAIConfig = {
    apiKey: config.apiKey,
    baseUrl: "https://openrouter.ai/api/v1",
  };
  return generateOpenAISpeech(openaiConfig, model, text, voiceName, options);
}
// ============================================================================
// Embedding Generation
// ============================================================================
/**
 * Get embedding models using SDK
 */
export async function getEmbeddingModels(
  config: OpenRouterConfig,
): Promise<EmbeddingModelInfo[]> {
  try {
    // First, try using SDK
    const client = createClient(config);
    const response = await client.embeddings.listModels();
    if (!response.data || !Array.isArray(response.data)) {
      console.warn("Invalid response format from embeddings.listModels()");
      throw new Error("Invalid SDK response format");
    }

    const embeddingModels = processEmbeddingModels(response.data);

    if (embeddingModels.length === 0) {
      console.warn("No embedding models found in SDK response");
      throw new Error("No embedding models found");
    }

    console.log(
      `[OpenRouter] Loaded ${embeddingModels.length} embedding models via SDK`,
    );
    return embeddingModels;
  } catch (sdkError) {
    console.warn(
      "Failed to list OpenRouter embedding models via SDK (may be CORS issue):",
      sdkError,
    );

    // Fallback to local JSON file
    try {
      console.log("[OpenRouter] Attempting fallback to local JSON file...");
      const response = await fetch("/resources/openrouter_embedding.json");
      if (!response.ok) {
        throw new Error(`Failed to load local JSON: ${response.status}`);
      }
      const data = await response.json();
      const dataRecord = isRecord(data) ? data : {};
      const dataModels = Array.isArray(dataRecord.data) ? dataRecord.data : [];

      if (!dataRecord.data || !Array.isArray(dataRecord.data)) {
        throw new Error("Invalid local JSON format");
      }

      if (dataModels.length === 0) {
        throw new Error("No embedding models found in local JSON");
      }

      // They are all embedding models in this file
      // Thus, we can directly map them
      const models = dataModels.filter(isRecord).map((m) => {
        const id = readString(m.id) || readString(m.slug) || "";
        const name = readString(m.name) || id;
        const contextLength =
          readNumber(m.context_length) ?? readNumber(m.contextLength) ?? 8192;

        return {
          id,
          name,
          dimensions: guessEmbeddingDimensions(id.toLowerCase()),
          contextLength,
        };
      });

      console.log(
        `[OpenRouter] Loaded ${models.length} embedding models from local JSON file`,
      );
      return models;
    } catch (jsonError) {
      console.warn("Failed to load from local JSON file:", jsonError);
      console.log("[OpenRouter] Using default embedding models");
      return getDefaultEmbeddingModels();
    }
  }
}

/**
 * Process raw model data into EmbeddingModelInfo
 */
function processEmbeddingModels(modelsData: unknown[]): EmbeddingModelInfo[] {
  const embeddingModels: EmbeddingModelInfo[] = [];

  for (const model of modelsData) {
    if (!isRecord(model)) continue;
    const id = (
      readString(model.id) ||
      readString(model.slug) ||
      ""
    ).toLowerCase();
    const outputModalities = readStringArray(model.output_modalities);
    const modality = readStringArray(model.modality);

    // Check if this is an embedding model
    if (
      outputModalities.includes("embeddings") ||
      modality.includes("embeddings")
    ) {
      embeddingModels.push({
        id: readString(model.id) || readString(model.slug) || "",
        name:
          readString(model.name) ||
          readString(model.id) ||
          readString(model.slug) ||
          "",
        dimensions: guessEmbeddingDimensions(id),
        contextLength:
          readNumber(model.context_length) ??
          readNumber(model.contextLength) ??
          8192,
      });
    }
  }

  return embeddingModels;
}

function guessEmbeddingDimensions(id: string): number {
  if (id.includes("text-embedding-3-small")) return 1536;
  if (id.includes("text-embedding-3-large")) return 3072;
  if (id.includes("embed-english-v3") || id.includes("embed-multilingual-v3"))
    return 1024;
  if (
    id.includes("embed-english-light-v3") ||
    id.includes("embed-multilingual-light-v3")
  )
    return 384;
  if (id.includes("small") || id.includes("light")) return 384;
  if (id.includes("base")) return 768;
  if (id.includes("large")) return 1024;
  if (id.includes("nomic-embed")) return 768;
  if (id.includes("gecko")) return 768;
  return 1024;
}
function getDefaultEmbeddingModels(): EmbeddingModelInfo[] {
  return [
    {
      id: "openai/text-embedding-3-small",
      name: "OpenAI Text Embedding 3 Small",
      dimensions: 1536,
      contextLength: 8192,
    },
    {
      id: "openai/text-embedding-3-large",
      name: "OpenAI Text Embedding 3 Large",
      dimensions: 3072,
      contextLength: 8192,
    },
  ];
}
/**
 * Generate embeddings using direct fetch API
 * Uses fetch instead of SDK to properly handle CORS headers
 */
export async function generateEmbedding(
  config: OpenRouterConfig,
  modelId: string,
  texts: string[],
  dimensions?: number,
  _taskType?: EmbeddingTaskType,
): Promise<EmbeddingResponse> {
  try {
    const url = "https://openrouter.ai/api/v1/embeddings";

    const requestBody: JsonObject = {
      model: modelId,
      input: texts,
    };

    if (dimensions) {
      requestBody.dimensions = dimensions;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        "HTTP-Referer":
          typeof window !== "undefined" ? window.location.origin : "",
        "X-Title": "CoI Game",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as unknown;
    const dataRecord = requireRecord(data, "embedding");
    const items = Array.isArray(dataRecord.data) ? dataRecord.data : [];
    if (!Array.isArray(dataRecord.data)) {
      throw new AIProviderError(
        "OpenRouter embedding response missing data array",
        "openrouter",
        "INVALID_RESPONSE",
      );
    }
    const embeddingItems: OpenRouterEmbeddingItemDto[] = items
      .filter((item): item is JsonObject => isRecord(item))
      .map((item) => ({
        index: readNumber(item.index) ?? 0,
        embedding: Array.isArray(item.embedding)
          ? item.embedding.filter((v): v is number => typeof v === "number")
          : [],
      }));

    const embeddings = embeddingItems
      .sort((a, b) => a.index - b.index)
      .map((item) => new Float32Array(item.embedding));

    return {
      embeddings,
      usage: (() => {
        const parsedUsage = parseOpenRouterUsage(dataRecord.usage);
        return {
          promptTokens: parsedUsage.promptTokens,
          totalTokens: parsedUsage.totalTokens,
        };
      })(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new AIProviderError(
      `OpenRouter embedding failed: ${message}`,
      "openrouter",
      undefined,
      error,
    );
  }
}
