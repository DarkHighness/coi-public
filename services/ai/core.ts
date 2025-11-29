import {
  AISettings,
  LogEntry,
  TokenUsage,
  ToolCallRecord,
  ProviderProtocol,
} from "../../types";

import {
  GeminiConfig,
  OpenAIConfig,
  OpenRouterConfig,
  ClaudeConfig,
  GenerateContentOptions,
  ToolCallResult,
  JSONParseError,
  UnifiedMessage as ProviderUnifiedMessage,
} from "../providers/types";

import {
  generateContent as generateGeminiContent,
} from "../providers/geminiProvider";

import {
  generateContent as generateOpenAIContent,
} from "../providers/openaiProvider";

import {
  generateContent as generateOpenRouterContent,
} from "../providers/openRouterProvider";

import {
  generateContent as generateClaudeContent,
} from "../providers/claudeProvider";

import {
  UnifiedMessage,
  MessageRole,
  toGeminiFormat,
  fromGeminiFormat,
} from "../messageTypes";

import {
  FunctionType,
  createProviderConfig,
  getProviderConfig,
  createLogEntry,
} from "./utils";

// ============================================================================
// Unified Content Generation
// ============================================================================

/** 内容生成结果类型 */
export type ContentGenerationResultType =
  | { functionCalls?: ToolCallResult[] }
  | Record<string, unknown>
  | string;

export interface GenerateContentResult {
  result: ContentGenerationResultType;
  usage: TokenUsage;
  raw: unknown;
  log?: LogEntry;
}

export interface GenerateContentUnifiedOptions {
  thinkingLevel?: "low" | "medium" | "high";
  mediaResolution?: "low" | "medium" | "high";
  temperature?: number;
  topP?: number;
  topK?: number;
  minP?: number;
  onChunk?: (text: string) => void;
  tools?: Array<{ name: string; description: string; parameters: unknown }>;
  generationDetails?: LogEntry["generationDetails"];
  /** 设置对象 */
  settings?: AISettings;
}

/**
 * 统一内容生成助手 (内部使用 - 通过 provider protocol 调用)
 */
export const generateContentUnifiedInternal = async (
  protocol: ProviderProtocol,
  config: GeminiConfig | OpenAIConfig | OpenRouterConfig | ClaudeConfig,
  modelId: string,
  systemInstruction: string,
  contents: unknown[],
  schema?: unknown,
  options?: GenerateContentUnifiedOptions,
): Promise<GenerateContentResult> => {
  let result: GenerateContentResult["result"];
  let usage: TokenUsage;
  let raw: unknown;

  // Get additional options from settings if provided
  const storyConfig = options?.settings
    ? getProviderConfig(options.settings, "story")
    : null;
  const mergedOptions: GenerateContentOptions = {
    thinkingLevel: options?.thinkingLevel || storyConfig?.thinkingLevel,
    mediaResolution: options?.mediaResolution || storyConfig?.mediaResolution,
    temperature: options?.temperature ?? storyConfig?.temperature,
    topP: options?.topP ?? storyConfig?.topP,
    topK: options?.topK ?? storyConfig?.topK,
    minP: options?.minP ?? storyConfig?.minP,
    onChunk: options?.onChunk,
    tools: options?.tools as GenerateContentOptions["tools"],
  };

  // Detect input format and convert as needed
  // Format detection:
  // - UnifiedMessage[]: has 'content' array with objects containing 'type'
  // - Gemini format: has 'parts' array with objects containing 'text'
  const isUnifiedFormat =
    Array.isArray(contents) &&
    contents.length > 0 &&
    typeof contents[0] === "object" &&
    "content" in contents[0] &&
    Array.isArray((contents[0] as UnifiedMessage).content);

  const isGeminiFormat =
    Array.isArray(contents) &&
    contents.length > 0 &&
    typeof contents[0] === "object" &&
    "parts" in contents[0];

  try {
    if (protocol === "gemini") {
      // Gemini expects Content[] format (with 'parts')
      let geminiContents: unknown[];
      if (isUnifiedFormat) {
        geminiContents = toGeminiFormat(contents as UnifiedMessage[]);
      } else if (isGeminiFormat) {
        geminiContents = contents; // Already in Gemini format
      } else {
        geminiContents = contents; // Assume it's already correct
      }

      const response = await generateGeminiContent(
        config as GeminiConfig,
        modelId,
        systemInstruction,
        geminiContents as Parameters<typeof generateGeminiContent>[3],
        schema as Parameters<typeof generateGeminiContent>[4],
        mergedOptions,
      );
      result = response.result;
      usage = response.usage;
      raw = response.raw;
    } else {
      // OpenAI/OpenRouter/Claude expect UnifiedMessage[] - convert from Gemini format if needed
      let unifiedContents: UnifiedMessage[];
      if (isUnifiedFormat) {
        unifiedContents = contents as UnifiedMessage[];
      } else if (isGeminiFormat) {
        // Convert from Gemini format to UnifiedMessage[]
        unifiedContents = fromGeminiFormat(
          contents as Array<{ role: string; parts: Array<{ text?: string }> }>,
        );
      } else {
        // Fallback: try to use as-is (may fail)
        console.warn(
          "[generateContentUnified] Unknown message format, attempting to use as-is",
        );
        unifiedContents = contents as UnifiedMessage[];
      }

      if (protocol === "openai") {
        const response = await generateOpenAIContent(
          config as OpenAIConfig,
          modelId,
          systemInstruction,
          unifiedContents as ProviderUnifiedMessage[],
          schema as Parameters<typeof generateOpenAIContent>[4],
          mergedOptions,
        );
        result = response.result;
        usage = response.usage;
        raw = response.raw;
      } else if (protocol === "openrouter") {
        const response = await generateOpenRouterContent(
          config as OpenRouterConfig,
          modelId,
          systemInstruction,
          unifiedContents as ProviderUnifiedMessage[],
          schema as Parameters<typeof generateOpenRouterContent>[4],
          mergedOptions,
        );
        result = response.result;
        usage = response.usage;
        raw = response.raw;
      } else if (protocol === "claude") {
        const response = await generateClaudeContent(
          config as ClaudeConfig,
          modelId,
          systemInstruction,
          unifiedContents as ProviderUnifiedMessage[],
          schema as Parameters<typeof generateClaudeContent>[4],
          mergedOptions,
        );
        result = response.result;
        usage = response.usage;
        raw = response.raw;
      } else {
        throw new Error(`Unknown protocol: ${protocol}`);
      }
    }
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    console.error("Generation failed", error);

    if (e instanceof JSONParseError || error.message.includes("JSON")) {
      throw new Error(
        "The AI narrator stumbled over their words (Invalid JSON). Please try again.",
      );
    }
    throw error;
  }

  const log = createLogEntry(
    protocol,
    modelId,
    "generateContent",
    { systemInstruction, contents: contents as Record<string, unknown>[] },
    raw,
    usage,
    undefined, // toolCalls
    options?.generationDetails,
    result, // parsedResult - include the parsed/structured result
  );

  return { result, usage, raw, log };
};

/**
 * 统一的内容生成函数 (使用 provider 或 function type)
 *
 * 支持两种调用方式:
 * 1. 通过 function type (story, image, etc.) - 内部使用
 * 2. 通过 provider protocol (gemini, openai, etc.) - 向后兼容
 *
 * @param providerOrFunc Provider protocol 或 function type
 * @param modelId 模型 ID
 * @param systemInstruction 系统指令
 * @param contents 消息内容
 * @param schema 可选的输出 schema
 * @param options 生成选项（必须包含 settings）
 */
export const generateContentUnified = async (
  providerOrFunc: ProviderProtocol | FunctionType,
  modelId: string,
  systemInstruction: string,
  contents: unknown[],
  schema?: unknown,
  options?: GenerateContentUnifiedOptions,
): Promise<GenerateContentResult> => {
  if (!options?.settings) {
    throw new Error("settings is required in options");
  }
  const settings = options.settings;
  // 检查是否是 function type (用于内部调用)
  const functionTypes: FunctionType[] = [
    "story",
    "image",
    "video",
    "audio",
    "translation",
    "lore",
    "script",
  ];

  let protocol: ProviderProtocol;
  let config: GeminiConfig | OpenAIConfig | OpenRouterConfig | ClaudeConfig;
  let actualModelId: string;

  if (functionTypes.includes(providerOrFunc as FunctionType)) {
    // 通过 function type 调用
    const providerInfo = getProviderConfig(
      settings,
      providerOrFunc as FunctionType,
    );
    if (!providerInfo) {
      throw new Error(
        `Provider not configured for function: ${providerOrFunc}`,
      );
    }
    protocol = providerInfo.instance.protocol;
    config = providerInfo.config;
    actualModelId = providerInfo.modelId;
  } else {
    // 通过 protocol 直接调用
    protocol = providerOrFunc as ProviderProtocol;
    actualModelId = modelId;

    // 尝试从 story 配置获取 provider 实例
    const providerInfo = getProviderConfig(settings, "story");
    if (providerInfo && providerInfo.instance.protocol === protocol) {
      config = providerInfo.config;
    } else {
      // 回退：查找第一个匹配 protocol 的实例
      const instance = settings.providers.instances.find(
        (p) => p.protocol === protocol && p.enabled,
      );
      if (!instance) {
        throw new Error(
          `No enabled provider instance found for protocol: ${protocol}`,
        );
      }
      config = createProviderConfig(instance);
    }
  }

  // Handle Restricted Channel (No System Role)
  // If the provider is marked as restricted, we must merge the system instruction
  // into the first user message and clear the system instruction argument.
  const instance = settings.providers.instances.find(
    (p) => p.protocol === protocol && createProviderConfig(p).apiKey === config.apiKey
  );

  let finalSystemInstruction = systemInstruction;
  let finalContents = contents;

  if (instance?.isRestrictedChannel) {
    // 1. Convert to UnifiedMessage[] to safely manipulate
    let unifiedContents: UnifiedMessage[] = [];

    // Check format
    const isUnifiedFormat =
      Array.isArray(contents) &&
      contents.length > 0 &&
      typeof contents[0] === "object" &&
      "content" in contents[0] &&
      Array.isArray((contents[0] as UnifiedMessage).content);

    const isGeminiFormat =
      Array.isArray(contents) &&
      contents.length > 0 &&
      typeof contents[0] === "object" &&
      "parts" in contents[0];

    if (isUnifiedFormat) {
      unifiedContents = [...(contents as UnifiedMessage[])];
    } else if (isGeminiFormat) {
      // Convert from Gemini format
      unifiedContents = (contents as Array<{ role: string; parts: Array<{ text?: string }> }>).map(msg => ({
        role: msg.role === "model" ? "assistant" : (msg.role as MessageRole),
        content: msg.parts.map(p => ({ type: "text", text: p.text || "" }))
      }));
    } else {
      // Unknown format, try to cast
      unifiedContents = contents as UnifiedMessage[];
    }

    // 2. Add system instruction as a separate user message at the beginning
    unifiedContents.unshift({
      role: "user",
      content: [{ type: "text", text: `[System Instruction]\n${systemInstruction}` }]
    });

    finalSystemInstruction = "";
    finalContents = unifiedContents;
  }

  return generateContentUnifiedInternal(
    protocol,
    config,
    actualModelId,
    finalSystemInstruction,
    finalContents,
    schema,
    options,
  );
};
