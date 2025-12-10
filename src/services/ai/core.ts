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

import { generateContent as generateGeminiContent } from "../providers/geminiProvider";

import { generateContent as generateOpenAIContent } from "../providers/openaiProvider";

import { generateContent as generateOpenRouterContent } from "../providers/openRouterProvider";

import { generateContent as generateClaudeContent } from "../providers/claudeProvider";

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
  /** 自定义 log endpoint 名称 (默认: "generateContent") */
  logEndpoint?: string;
  /** 强制使用 tool_call 模式代替 json_schema 进行结构化输出 */
  forceToolCallMode?: boolean;
  /** 展平嵌套 schema 结构用于 AI 生成 */
  flattenSchema?: boolean;
}

// Import schema flattener
import {
  flattenZodSchema,
  unflattenResult,
  logFlatSchema,
  generateFlatSchemaInstruction,
  type FieldMapping,
} from "../schemaFlattener";
import type {
  ZodTypeAny,
  ZodObject,
  ZodArray,
  ZodOptional,
  ZodNullable,
  ZodEnum,
  ZodLiteral,
  ZodUnion,
} from "zod";

/**
 * Generate example output from a Zod schema
 * Used for JSON Object Mode to provide AI with expected output format
 */
function generateExampleOutput(schema: ZodTypeAny): unknown {
  const typeName = schema._def?.typeName;

  switch (typeName) {
    case "ZodObject": {
      const shape = (schema as ZodObject<any>).shape;
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(shape)) {
        result[key] = generateExampleOutput(value as ZodTypeAny);
      }
      return result;
    }
    case "ZodArray": {
      const innerType = (schema as ZodArray<any>)._def.type;
      return [generateExampleOutput(innerType)];
    }
    case "ZodOptional":
    case "ZodNullable": {
      const innerType = (schema as ZodOptional<any> | ZodNullable<any>)._def
        .innerType;
      return generateExampleOutput(innerType);
    }
    case "ZodEnum": {
      const values = (schema as ZodEnum<any>)._def.values;
      return values[0] || "value";
    }
    case "ZodLiteral": {
      return (schema as ZodLiteral<any>)._def.value;
    }
    case "ZodUnion": {
      const options = (schema as ZodUnion<any>)._def.options;
      return options.length > 0 ? generateExampleOutput(options[0]) : null;
    }
    case "ZodString":
      // Check for description to provide better examples
      const desc = schema._def?.description || "";
      if (desc.toLowerCase().includes("narrative"))
        return "The story continues...";
      if (desc.toLowerCase().includes("name")) return "Example Name";
      if (desc.toLowerCase().includes("id")) return "item:1";
      return "string_value";
    case "ZodNumber":
      return 0;
    case "ZodBoolean":
      return false;
    case "ZodNull":
      return null;
    default:
      return "unknown";
  }
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

  // Check for forceToolCallMode, flattenSchema, and jsonObjectMode from options or settings
  const forceToolCallMode =
    options?.forceToolCallMode ?? options?.settings?.extra?.forceToolCallMode;
  const flattenSchema =
    options?.flattenSchema ?? options?.settings?.extra?.flattenSchema;
  const jsonObjectMode = options?.settings?.extra?.jsonObjectMode ?? false;

  // Schema flattening support
  // Note: The actual prompts should contain the flattened field names when flatten is enabled
  // This code transforms the Zod schema to use flattened field names
  let effectiveSchema = schema;
  let fieldMappings: FieldMapping[] | undefined;
  let effectiveSystemInstruction = systemInstruction;

  // Step 1: Handle schema flattening (if enabled)
  if (flattenSchema && schema) {
    try {
      const flattenResult = flattenZodSchema(schema as ZodTypeAny);
      effectiveSchema = flattenResult.flatSchema;
      fieldMappings = flattenResult.fieldMappings;
      logFlatSchema(flattenResult);
      console.log("[Core] Using flattened schema for AI generation");
    } catch (e) {
      console.warn("[Core] Failed to flatten schema, using original:", e);
      effectiveSchema = schema;
    }
  }

  // Step 2: Prepare JSON Object Mode example (if enabled)
  // Will be added to the last user message instead of system instruction
  let jsonExampleText: string | undefined;
  if (jsonObjectMode && effectiveSchema && !options?.tools?.length) {
    try {
      const exampleOutput = generateExampleOutput(
        effectiveSchema as ZodTypeAny,
      );
      jsonExampleText = `

<json_output_format>
You MUST respond with a valid JSON object matching this exact structure.
Do not include any text outside the JSON object.

**Example Output:**
\`\`\`json
${JSON.stringify(exampleOutput, null, 2)}
\`\`\`
</json_output_format>`;
      console.log("[Core] Using JSON Object mode with example output");
    } catch (e) {
      console.warn("[Core] Failed to generate JSON example, using schema:", e);
    }
  }

  const mergedOptions: GenerateContentOptions = {
    thinkingLevel: options?.thinkingLevel || storyConfig?.thinkingLevel,
    mediaResolution: options?.mediaResolution || storyConfig?.mediaResolution,
    temperature: options?.temperature ?? storyConfig?.temperature,
    topP: options?.topP ?? storyConfig?.topP,
    topK: options?.topK ?? storyConfig?.topK,
    minP: options?.minP ?? storyConfig?.minP,
    onChunk: options?.onChunk,
    tools: options?.tools as GenerateContentOptions["tools"],
    forceToolCallMode,
    flattenSchema,
    jsonObjectMode,
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

  // Helper: Add JSON example to the last user message
  const addJsonExampleToLastUserMessage = (
    messages: any[],
    isGemini: boolean,
  ): any[] => {
    if (!jsonExampleText || messages.length === 0) return messages;

    const messagesCopy = [...messages];
    // Find last user message
    for (let i = messagesCopy.length - 1; i >= 0; i--) {
      const msg = messagesCopy[i];
      if (msg.role === "user") {
        if (isGemini) {
          // Gemini format: {role, parts: [{text}]}
          const lastPart = msg.parts[msg.parts.length - 1];
          if (lastPart && "text" in lastPart) {
            messagesCopy[i] = {
              ...msg,
              parts: [
                ...msg.parts.slice(0, -1),
                { text: lastPart.text + jsonExampleText },
              ],
            };
          }
        } else {
          // UnifiedMessage format: {role, content: [{type, text}]}
          const lastContent = msg.content[msg.content.length - 1];
          if (lastContent && lastContent.type === "text") {
            messagesCopy[i] = {
              ...msg,
              content: [
                ...msg.content.slice(0, -1),
                { type: "text", text: lastContent.text + jsonExampleText },
              ],
            };
          }
        }
        break;
      }
    }
    return messagesCopy;
  };

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

      // Add JSON example to last user message if needed
      geminiContents = addJsonExampleToLastUserMessage(
        geminiContents as any[],
        true,
      );

      const response = await generateGeminiContent(
        config as GeminiConfig,
        modelId,
        effectiveSystemInstruction,
        geminiContents as Parameters<typeof generateGeminiContent>[3],
        effectiveSchema as Parameters<typeof generateGeminiContent>[4],
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

      // Add JSON example to last user message if needed
      unifiedContents = addJsonExampleToLastUserMessage(
        unifiedContents as any[],
        false,
      ) as UnifiedMessage[];

      if (protocol === "openai") {
        const response = await generateOpenAIContent(
          config as OpenAIConfig,
          modelId,
          effectiveSystemInstruction,
          unifiedContents as ProviderUnifiedMessage[],
          effectiveSchema as Parameters<typeof generateOpenAIContent>[4],
          mergedOptions,
        );
        result = response.result;
        usage = response.usage;
        raw = response.raw;
      } else if (protocol === "openrouter") {
        const response = await generateOpenRouterContent(
          config as OpenRouterConfig,
          modelId,
          effectiveSystemInstruction,
          unifiedContents as ProviderUnifiedMessage[],
          effectiveSchema as Parameters<typeof generateOpenRouterContent>[4],
          mergedOptions,
        );
        result = response.result;
        usage = response.usage;
        raw = response.raw;
      } else if (protocol === "claude") {
        const response = await generateClaudeContent(
          config as ClaudeConfig,
          modelId,
          effectiveSystemInstruction,
          unifiedContents as ProviderUnifiedMessage[],
          effectiveSchema as Parameters<typeof generateClaudeContent>[4],
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

  // Unflatten result if schema was flattened
  if (
    fieldMappings &&
    typeof result === "object" &&
    result !== null &&
    !("functionCalls" in result)
  ) {
    try {
      result = unflattenResult(
        result as Record<string, unknown>,
        fieldMappings,
      );
      console.log("[Core] Unflattened AI response to nested structure");
    } catch (e) {
      console.warn("[Core] Failed to unflatten result, using flat result:", e);
    }
  }

  const log = createLogEntry(
    protocol,
    modelId,
    options?.logEndpoint || "generateContent",
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
    (p) =>
      p.protocol === protocol &&
      createProviderConfig(p).apiKey === config.apiKey,
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
      unifiedContents = (
        contents as Array<{ role: string; parts: Array<{ text?: string }> }>
      ).map((msg) => ({
        role: msg.role === "model" ? "assistant" : (msg.role as MessageRole),
        content: msg.parts.map((p) => ({ type: "text", text: p.text || "" })),
      }));
    } else {
      // Unknown format, try to cast
      unifiedContents = contents as UnifiedMessage[];
    }

    // 2. Add system instruction as a separate user message at the beginning
    unifiedContents.unshift({
      role: "user",
      content: [
        { type: "text", text: `[System Instruction]\n${systemInstruction}` },
      ],
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
