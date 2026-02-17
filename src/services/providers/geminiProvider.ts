/**
 * ============================================================================
 * Gemini Provider - Google GenAI SDK 实现
 * ============================================================================
 *
 * 使用官方 @google/genai SDK，提供完整的类型安全支持。
 * 包括：内容生成、图片生成、视频生成、语音合成、嵌入向量生成
 */

import { jsonrepair } from "jsonrepair";
import {
  GoogleGenAI,
  Modality,
  Content,
  Part,
  FunctionCall,
  GenerateContentConfig,
  FunctionCallingConfigMode,
  ThinkingConfig,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/genai";

import type {
  EmbeddingTaskType,
  TokenUsage,
  JsonObject,
  ToolArguments,
} from "../../types";

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
  ImageContentPart,
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
import { withRetry, validateSchema, cleanJsonContent } from "./utils";

// ============================================================================
// Response Types (兼容旧 API)
// ============================================================================

/** 内容生成响应 (兼容格式) */
export interface GeminiContentGenerationResponse {
  result: { functionCalls?: ToolCallResult[] } | JsonObject;
  usage: TokenUsage;
  raw: unknown;
}

interface GeminiModelWithLegacyInputLimit {
  input_token_limit?: number;
}

interface GeminiRestModelDto {
  name?: string;
  displayName?: string;
  inputTokenLimit?: number;
  input_token_limit?: number;
}

interface GeminiUsageMetadataDto {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
  [key: string]: unknown;
}

interface GeminiFunctionCallPartWithSignature extends Part {
  functionCall: FunctionCall;
  thought_signature?: string;
  thoughtSignature?: string;
}

type GeminiThinkingConfigCompat = ThinkingConfig & {
  includeThoughtsTokenLimit?: number;
};

interface GeminiLegacyImagePart {
  type: "image";
  image?: { url: string };
  mimeType?: string;
  data?: string;
}

interface GeminiFunctionCallPartDto extends Part {
  functionCall: {
    name: string;
    args: JsonObject;
  };
  thoughtSignature?: string;
}

const isRecord = (value: unknown): value is JsonObject =>
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

const getGeminiUsageMetadata = (
  value: unknown,
): GeminiUsageMetadataDto | null => {
  if (!isRecord(value)) return null;
  if (isRecord(value.usageMetadata)) {
    return value.usageMetadata as GeminiUsageMetadataDto;
  }
  if (isRecord(value.usage_metadata)) {
    return value.usage_metadata as GeminiUsageMetadataDto;
  }
  if (isRecord(value.usage)) {
    return value.usage as GeminiUsageMetadataDto;
  }
  return null;
};

const getThoughtSignature = (value: unknown): string | undefined => {
  if (!isRecord(value)) return undefined;
  return (
    readString(value.thoughtSignature) || readString(value.thought_signature)
  );
};

const parseToolArguments = (
  rawArgs: unknown,
  toolName: string,
): ToolArguments => {
  if (rawArgs === undefined) {
    return {};
  }
  if (!isRecord(rawArgs)) {
    throw new MalformedToolCallError(
      "gemini",
      toolName,
      JSON.stringify(rawArgs),
    );
  }
  return rawArgs;
};

const isGeminiContent = (value: UnifiedMessage | Content): value is Content =>
  isRecord(value) && Array.isArray((value as { parts?: unknown }).parts);

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
  return new GoogleGenAI({
    apiKey: config.apiKey,
    httpOptions: {
      baseUrl: config.baseUrl || "https://generativelanguage.googleapis.com",
    },
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

const GEMINI_PROMPT_KEYS = [
  "promptTokenCount",
  "prompt_token_count",
  "inputTokenCount",
  "input_token_count",
] as const;
const GEMINI_COMPLETION_KEYS = [
  "candidatesTokenCount",
  "candidates_token_count",
  "outputTokenCount",
  "output_token_count",
] as const;
const GEMINI_TOTAL_KEYS = ["totalTokenCount", "total_token_count"] as const;
const GEMINI_CACHE_READ_KEYS = [
  "cachedContentTokenCount",
  "cached_content_token_count",
] as const;
const GEMINI_TOOL_USE_PROMPT_KEYS = [
  "toolUsePromptTokenCount",
  "tool_use_prompt_token_count",
] as const;
const GEMINI_THOUGHTS_KEYS = [
  "thoughtsTokenCount",
  "thoughts_token_count",
] as const;
const GEMINI_ALL_USAGE_KEYS = [
  ...GEMINI_PROMPT_KEYS,
  ...GEMINI_COMPLETION_KEYS,
  ...GEMINI_TOTAL_KEYS,
  ...GEMINI_CACHE_READ_KEYS,
  ...GEMINI_TOOL_USE_PROMPT_KEYS,
  ...GEMINI_THOUGHTS_KEYS,
];

export function parseGeminiUsageMetadata(usageMetadata: unknown): TokenUsage {
  const usage = isRecord(usageMetadata) ? usageMetadata : null;

  const prompt = readUsageNumber(usage, [...GEMINI_PROMPT_KEYS]);
  const completion = readUsageNumber(usage, [...GEMINI_COMPLETION_KEYS]);
  const total = readUsageNumber(usage, [...GEMINI_TOTAL_KEYS]);
  const cacheRead = readUsageNumber(usage, [...GEMINI_CACHE_READ_KEYS]);
  const toolUsePrompt =
    readUsageNumber(usage, [...GEMINI_TOOL_USE_PROMPT_KEYS]) || 0;
  const thoughts = readUsageNumber(usage, [...GEMINI_THOUGHTS_KEYS]) || 0;

  let promptTokens = prompt ?? 0;
  let completionTokens = completion ?? 0;
  let totalTokens = total ?? 0;

  if (promptTokens <= 0 && toolUsePrompt > 0) {
    promptTokens = toolUsePrompt;
  }

  if (completionTokens <= 0 && thoughts > 0) {
    completionTokens = thoughts;
  }

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

  const hasKnownUsageKeys = hasAnyUsageField(usage, [...GEMINI_ALL_USAGE_KEYS]);
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
      const modelWithLegacy = model as typeof model &
        GeminiModelWithLegacyInputLimit;
      const capabilities = inferModelCapabilities(model.name);
      models.push({
        id: model.name.replace("models/", ""),
        name: model.displayName || model.name,
        // Best-effort: Gemini model metadata sometimes includes input token limit.
        contextLength:
          model.inputTokenLimit || modelWithLegacy.input_token_limit,
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
  } catch (sdkError) {
    console.warn("Failed to list Gemini models via SDK:", sdkError);

    // Fallback: 尝试直接调用 v1beta/models REST API
    try {
      const models = await fetchModelsViaRestApi(config);
      if (models.length > 0) {
        console.log(
          `[Gemini] Successfully fetched ${models.length} models via REST API fallback`,
        );
        return models;
      }
    } catch (restError) {
      console.warn("Failed to list Gemini models via REST API:", restError);
    }

    // 返回默认模型列表
    return getDefaultModels();
  }
}

/**
 * 通过 REST API 直接获取模型列表 (fallback)
 */
async function fetchModelsViaRestApi(
  config: GeminiConfig,
): Promise<ModelInfo[]> {
  const baseUrl = config.baseUrl || "https://generativelanguage.googleapis.com";
  const url = `${baseUrl}/v1beta/models?key=${config.apiKey}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `REST API returned ${response.status}: ${response.statusText}`,
    );
  }

  const data = (await response.json()) as unknown;
  if (!isRecord(data) || !Array.isArray(data.models)) {
    throw new Error("Invalid response format from v1beta/models");
  }

  const models: ModelInfo[] = data.models
    .filter((model): model is GeminiRestModelDto => isRecord(model))
    .filter((model) => {
      const name = readString(model.name) || "";
      return (
        name.length > 0 &&
        (name.includes("gemini") ||
          name.includes("imagen") ||
          name.includes("veo"))
      );
    })
    .map((model) => {
      const name = readString(model.name) || "";
      return {
        id: name.replace("models/", ""),
        name: readString(model.displayName) || name,
        contextLength:
          readNumber(model.inputTokenLimit) ??
          readNumber(model.input_token_limit),
        capabilities: inferModelCapabilities(name),
      };
    });

  return models;
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
  return withRetry(
    async () => {
      const client = createGeminiClient(config);

      // 构建生成配置
      const { config: generationConfig, modifiedSystemInstruction } =
        buildGenerationConfig(systemInstruction, schema, options);

      // 兼容性图片生成: 如果是图片模型（非 Imagen）且启用了兼容模式，转交给 generateImage
      if (
        config.compatibleImageGeneration &&
        (model.toLowerCase().includes("image") ||
          model.toLowerCase().includes("imagen")) &&
        !model.toLowerCase().includes("imagen-3")
      ) {
        console.log(
          `[Gemini] Routing generateContent to generateImage for compatible model: ${model}`,
        );
        const lastUserContent = contents
          .filter((c) => c.role === "user")
          .slice(-1)[0];
        const prompt =
          lastUserContent?.parts
            ?.filter((p) => p.text)
            .map((p) => p.text)
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
            raw: imageRes.raw ?? null,
          };
        }
      }

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
        usageMetadata = getGeminiUsageMetadata(response);

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
              args: parseToolArguments(
                p.functionCall.args,
                p.functionCall.name,
              ),
              // Extract thoughtSignature if present
              thoughtSignature: getThoughtSignature(p),
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

      const usage = parseGeminiUsageMetadata(usageMetadata);

      console.log(`[Gemini] Generation complete. Usage:`, usage);

      // 如果有工具调用，返回工具调用结果（同时保留 text 作为 content）
      if (functionCalls.length > 0) {
        return {
          result: {
            functionCalls,
            // 保留 content 以便在下次请求时包含
            content: text || undefined,
          },
          usage,
          raw: rawResponse,
        };
      }

      // 解析文本为 JSON (如果有 schema)
      if (text && schema) {
        const parsedResult = parseJSONResponse(text);
        // Schema Validation
        validateSchema(parsedResult, schema, "gemini");
        if (!isRecord(parsedResult)) {
          throw new JSONParseError(
            "gemini",
            text.substring(0, 500),
            new Error("Schema output must be a JSON object"),
          );
        }

        return {
          result: parsedResult,
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
    },
    3,
    1000,
    "gemini",
  );
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
          const functionCallPart = part as GeminiFunctionCallPartWithSignature;
          functionCalls.push({
            id: `gemini_call_${part.functionCall.name}_${functionCalls.length}`,
            name: part.functionCall.name || "",
            args: parseToolArguments(
              part.functionCall.args,
              part.functionCall.name || "unknown",
            ),
            // Extract thoughtSignature if present
            thoughtSignature: getThoughtSignature(functionCallPart),
          });
        }
      }
    }

    // 捕获使用量
    const chunkUsage = getGeminiUsageMetadata(chunk);
    if (chunkUsage) {
      usage = chunkUsage;
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
): { config: GenerateContentConfig; modifiedSystemInstruction: string } {
  const config: GenerateContentConfig = {};
  let modifiedSystemInstruction = systemInstruction;

  // 工具配置 - 从 Zod 直接编译到 Gemini 格式
  let functionDeclarations: Array<{
    name: string;
    description: string;
    parameters: ReturnType<typeof zodToGemini>;
  }> = [];

  if (options?.tools && options.tools.length > 0) {
    functionDeclarations = options.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: zodToGemini(tool.parameters),
    }));
  }

  // Handle schema for structured output
  // Gemini CANNOT use tools and responseSchema together
  if (schema) {
    if (options?.tools && options.tools.length > 0) {
      // When tools exist, cannot use responseSchema - will parse from content
      console.log(
        "[Gemini] Tools present, schema will be validated from content",
      );
    } else {
      // No tools: use responseSchema
      config.responseMimeType = "application/json";
      config.responseSchema = zodToGemini(schema);
      console.log(
        "[Gemini] JSON mode enabled with schema:",
        JSON.stringify(config.responseSchema, null, 2),
      );
    }
  }

  // Apply function declarations to config
  if (functionDeclarations.length > 0) {
    config.tools = [{ functionDeclarations }];

    // Configure tool calling behavior based on toolChoice
    if (options?.toolChoice === "required") {
      config.toolConfig = {
        functionCallingConfig: {
          mode: FunctionCallingConfigMode.ANY, // Force calling at least one tool
        },
      };
    } else if (options?.toolChoice === "none") {
      config.toolConfig = {
        functionCallingConfig: {
          mode: FunctionCallingConfigMode.NONE,
        },
      };
    } else if (options?.toolChoice && typeof options.toolChoice === "object") {
      config.toolConfig = {
        functionCallingConfig: {
          mode: FunctionCallingConfigMode.ANY,
          allowedFunctionNames: [options.toolChoice.name],
        },
      };
    }

    // Default is "auto" - no toolConfig needed

    // Safety Force: Prevent Python Helper Hallucination (causes MALFORMED_FUNCTION_CALL)
    modifiedSystemInstruction += `\n\n[CRITICAL INSTRUCTION: You use the Google GenAI SDK. You must NOT output Python code, function calls like 'print(...)', or markdown code blocks for tools. You MUST use the standard JSON tool declaration format. Writing native code will cause a Protocol Error.]`;
  }

  if (modifiedSystemInstruction) {
    config.systemInstruction = modifiedSystemInstruction;
  }

  // 思考模式配置
  const effort = options?.thinkingEffort;
  if (effort && effort !== "none") {
    const budgetMap: Record<string, number> = {
      minimal: 1024,
      low: 2048,
      medium: 4096,
      high: 8192,
      xhigh: 16384,
    };
    const thinkingConfig: GeminiThinkingConfigCompat = {
      includeThoughts: true,
      includeThoughtsTokenLimit: budgetMap[effort] || 2048,
    };
    config.thinkingConfig = thinkingConfig;
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

  // Safety Settings - Permissive to prevent blocking
  config.safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
  ];

  return { config, modifiedSystemInstruction };
}

/**
 * 解析 JSON 响应
 */
function parseJSONResponse(text: string): unknown {
  console.log(
    "[Gemini] Attempting to parse response as JSON, first 200 chars:",
    text.substring(0, 200),
  );
  try {
    // 清理 markdown 代码块
    let cleaned = cleanJsonContent(text);
    // 尝试使用 jsonrepair 修复并解析
    return JSON.parse(jsonrepair(cleaned));
  } catch (error) {
    console.warn(
      "[Gemini] JSON parse failed even with repair. Full text:",
      text,
    );
    throw new JSONParseError("gemini", text.substring(0, 500), error);
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

  // 兼容性模式: 使用对话 API 生成图片
  if (config.compatibleImageGeneration) {
    console.log(
      `[Gemini] Using compatibility mode (Chat API) for image generation with model: ${model}`,
    );
    try {
      const response = await client.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE],
        },
      });

      const imagePart = response.candidates?.[0]?.content?.parts?.find(
        (p) => p.inlineData,
      );
      if (imagePart?.inlineData) {
        const url = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
        return {
          url,
          usage: parseGeminiUsageMetadata(getGeminiUsageMetadata(response)),
          raw: response,
        };
      }
      throw new Error("No image data found in chat response");
    } catch (error) {
      console.error("[Gemini] Compatible image generation failed:", error);
      // Fallback to normal generation if it's not a chat-only error
    }
  }

  const aspectRatio = getAspectRatio(resolution);

  try {
    const response = await client.models.generateImages({
      model,
      prompt,
      config: {
        numberOfImages: 1,
        aspectRatio,
        outputMimeType: "image/jpeg",
        personGeneration: "allow_adult" as never,
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

  const usage = parseGeminiUsageMetadata(getGeminiUsageMetadata(response));

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
// Native Message Builders (Provider-Native Format)
// ============================================================================

/**
 * 构建用户文本消息
 */
export function buildUserMessage(text: string): Content {
  return { role: "user", parts: [{ text }] };
}

/**
 * 构建函数响应消息 (用户提供的工具结果)
 */
export function buildFunctionResponseMessage(
  responses: Array<{ name: string; response: unknown }>,
): Content {
  return {
    role: "user",
    parts: responses.map((r) => ({
      functionResponse: {
        name: r.name,
        response: { content: r.response },
      },
    })),
  };
}

/**
 * 从 AI 响应提取文本内容
 */
export function extractTextContent(response: unknown): string {
  const resp = response as {
    candidates?: Array<{
      content?: {
        parts?: Part[];
      };
    }>;
  };

  const parts = resp.candidates?.[0]?.content?.parts;
  if (!parts) return "";

  return parts
    .filter((p): p is Part & { text: string } => p.text !== undefined)
    .map((p) => p.text)
    .join("");
}

/**
 * 从 UnifiedMessage 转换为 Gemini Content
 * (用于初始上下文构建，仅在会话创建时调用一次)
 */
export function fromUnifiedMessage(message: UnifiedMessage): Content {
  const role = message.role === "assistant" ? "model" : message.role;

  // Handle legacy format where content might be a string
  const contentArray = Array.isArray(message.content)
    ? message.content
    : message.content
      ? [{ type: "text" as const, text: String(message.content) }]
      : [];

  // 处理工具响应消息
  if (message.role === "tool") {
    const toolResponses = contentArray
      .filter((p): p is ToolResponseContentPart => p.type === "tool_result")
      .map((p) => ({
        name: p.toolResult.name,
        response: p.toolResult.content,
      }));
    return buildFunctionResponseMessage(toolResponses);
  }

  // 处理普通消息
  const parts: Part[] = [];

  for (const part of contentArray) {
    if (part.type === "text") {
      parts.push({ text: (part as TextContentPart).text });
    } else if (part.type === "image") {
      // Handle image content - convert to Gemini inlineData format
      // The ImageContentPart type uses mimeType/data, but outline.ts uses legacy { image: { url } } format
      const legacyImageUrl = (() => {
        if (!("image" in part)) {
          return undefined;
        }
        const legacyImage = part.image;
        if (!legacyImage || typeof legacyImage !== "object") {
          return undefined;
        }
        const legacyImageUrlField = (legacyImage as { url?: unknown }).url;
        return typeof legacyImageUrlField === "string"
          ? legacyImageUrlField
          : undefined;
      })();

      // Try new format first (mimeType/data directly on part)
      if (part.mimeType && part.data) {
        parts.push({
          inlineData: {
            mimeType: part.mimeType,
            data: part.data,
          },
        } as Part);
      } else if (legacyImageUrl) {
        // Legacy format: data URL in image.url (used by outline.ts)
        const imageUrl = legacyImageUrl;
        if (imageUrl.startsWith("data:")) {
          // Parse data URL: data:image/jpeg;base64,/9j/4AAQ...
          const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (matches) {
            const mimeType = matches[1];
            const base64Data = matches[2];
            parts.push({
              inlineData: {
                mimeType,
                data: base64Data,
              },
            } as Part);
          } else {
            console.warn(
              "[Gemini] Invalid data URL format for image:",
              imageUrl.substring(0, 50),
            );
          }
        } else {
          console.warn(
            "[Gemini] Non-base64 image URL not yet supported:",
            imageUrl.substring(0, 50),
          );
        }
      } else {
        console.warn(
          "[Gemini] Image part has unrecognized format:",
          Object.keys(part),
        );
      }
    } else if (part.type === "tool_use") {
      const toolCall = part as ToolCallContentPart;
      const functionCallPart: GeminiFunctionCallPartDto = {
        functionCall: {
          name: toolCall.toolUse.name,
          args: toolCall.toolUse.args,
        },
      };
      // Include thoughtSignature if present (required for Gemini)
      if (toolCall.toolUse.thoughtSignature) {
        functionCallPart.thoughtSignature = toolCall.toolUse.thoughtSignature;
      }
      parts.push(functionCallPart);
    }
  }

  // Validate that parts array is not empty
  if (parts.length === 0) {
    console.warn(
      "[Gemini] Message with no valid parts detected, adding empty text part to prevent API error",
      message,
    );
    parts.push({ text: "" });
  }

  return {
    role: role === "system" ? "user" : role === "model" ? "model" : "user",
    parts,
  };
}

/**
 * 批量从 UnifiedMessage[] 转换为 Content[]
 * (用于初始上下文构建)
 */
export function fromUnifiedMessages(
  messages: (UnifiedMessage | Content)[],
): Content[] {
  return messages
    .filter((m) => m.role !== "system") // System 在 Gemini 中单独处理
    .map((m) => {
      // Check if it's already a Gemini Content object (has parts)
      // UnifiedMessage has 'content', Content has 'parts'
      if (isGeminiContent(m) && !("content" in m)) {
        return m;
      }
      return fromUnifiedMessage(m as UnifiedMessage);
    });
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

// Re-export Content type for session management
export type { Content, Part };
