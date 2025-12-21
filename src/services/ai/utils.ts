import {
  AISettings,
  LogEntry,
  TokenUsage,
  ToolCallRecord,
  ProviderInstance,
  ProviderProtocol,
  ModelInfo,
} from "../../types";

import {
  GeminiConfig,
  OpenAIConfig,
  OpenRouterConfig,
  ClaudeConfig,
} from "../providers/types";

import {
  generateContent as generateGeminiContent,
  getModels as getGeminiModels,
  validateConnection as validateGeminiConnection,
} from "../providers/geminiProvider";

import {
  generateContent as generateOpenAIContent,
  getModels as getOpenAIModels,
  validateConnection as validateOpenAIConnection,
} from "../providers/openaiProvider";

import {
  generateContent as generateOpenRouterContent,
  getModels as getOpenRouterModels,
  validateConnection as validateOpenRouterConnection,
} from "../providers/openRouterProvider";

import {
  generateContent as generateClaudeContent,
  getModels as getClaudeModels,
  validateConnection as validateClaudeConnection,
} from "../providers/claudeProvider";

// ============================================================================
// Configuration Types
// ============================================================================

export type FunctionType =
  | "story"
  | "image"
  | "video"
  | "audio"
  | "translation"
  | "lore"
  | "script";

export interface ProviderConfigResult {
  instance: ProviderInstance;
  config: GeminiConfig | OpenAIConfig | OpenRouterConfig | ClaudeConfig;
  modelId: string;
  enabled: boolean;
  resolution?: string;
  thinkingLevel?: "low" | "medium" | "high";
  mediaResolution?: "low" | "medium" | "high";
  temperature?: number;
  topP?: number;
  topK?: number;
  minP?: number;
}

// ============================================================================
// Provider Helpers
// ============================================================================

/**
 * 根据 providerId 获取 provider 实例
 * @param settings 设置对象
 * @param providerId Provider ID
 * @param requireEnabled 是否要求 provider 已启用（默认为 true，用于 API 调用；设为 false 用于获取模型列表）
 */
export const getProviderInstance = (
  settings: AISettings,
  providerId: string,
  requireEnabled: boolean = true,
): ProviderInstance | null => {
  const instance = settings.providers.instances.find(
    (p) => p.id === providerId,
  );
  if (!instance) {
    console.error(`Provider instance not found: ${providerId}`);
    return null;
  }
  if (requireEnabled && !instance.enabled) {
    console.warn(`Provider instance is disabled: ${providerId}`);
    return null;
  }
  return instance;
};

/**
 * 根据 provider 实例创建对应的配置对象
 */
export const createProviderConfig = (
  instance: ProviderInstance,
): GeminiConfig | OpenAIConfig | OpenRouterConfig | ClaudeConfig => {
  switch (instance.protocol) {
    case "gemini":
      return {
        apiKey: instance.apiKey,
        baseUrl: instance.baseUrl || undefined,
        compatibleImageGeneration: instance.compatibleImageGeneration,
      };
    case "openai":
      return {
        apiKey: instance.apiKey,
        baseUrl: instance.baseUrl,
        modelId: "",
        geminiCompatibility: instance.geminiCompatibility,
        geminiMessageFormat: instance.geminiMessageFormat,
        claudeCompatibility: instance.claudeCompatibility,
        claudeMessageFormat: instance.claudeMessageFormat,
        compatibleImageGeneration: instance.compatibleImageGeneration,
      };
    case "openrouter":
      return {
        apiKey: instance.apiKey,
      };
    case "claude":
      return {
        apiKey: instance.apiKey,
        baseUrl: instance.baseUrl || undefined,
      };
    default:
      throw new Error(
        `Unknown protocol: ${(instance as ProviderInstance).protocol}`,
      );
  }
};

/**
 * 获取函数配置和对应的 provider 实例
 * @param settings 设置对象
 * @param func 功能类型
 */
export const getProviderConfig = (
  settings: AISettings,
  func: FunctionType,
): ProviderConfigResult | null => {
  const funcConfig = settings[func];
  const instance = getProviderInstance(settings, funcConfig.providerId);

  if (!instance) {
    return null;
  }

  const config = createProviderConfig(instance);

  return {
    instance,
    config,
    modelId: funcConfig.modelId,
    enabled: funcConfig.enabled !== false,
    resolution: funcConfig.resolution,
    thinkingLevel: funcConfig.thinkingLevel,
    mediaResolution: funcConfig.mediaResolution,
    temperature: funcConfig.temperature,
    topP: funcConfig.topP,
    topK: funcConfig.topK,
    minP: funcConfig.minP,
  };
};

// ============================================================================
// Logging Helpers
// ============================================================================

/** Parameters for creating a log entry */
export interface CreateLogEntryParams {
  provider: string;
  model: string;
  endpoint: string;

  // Semantic fields
  type?: LogEntry["type"];
  toolName?: string;
  toolInput?: Record<string, any>;
  toolOutput?: any;
  phase?: number;
  stage?: string;
  imagePrompt?: string;
  imageResolution?: string;

  // Common fields
  usage?: TokenUsage;
  toolCalls?: ToolCallRecord[];
  generationDetails?: LogEntry["generationDetails"];
  stageInput?: LogEntry["stageInput"];
  rawResponse?: string;
  parsedResult?: unknown;

  // Legacy fields
  request?: any;
  response?: any;
}

/** Infer log type from endpoint string */
function inferLogType(endpoint: string): LogEntry["type"] {
  if (endpoint === "tool_execution") return "tool";
  if (endpoint.startsWith("outline-")) return "outline";
  if (endpoint.startsWith("summary-")) return "summary";
  if (endpoint.startsWith("cleanup")) return "cleanup";
  if (endpoint === "generateImage" || endpoint === "image") return "image";
  if (endpoint.includes("error")) return "error";
  if (endpoint === "agentic_complete") return "turn";
  return "turn";
}

/** Extract phase number from outline endpoint */
function extractPhase(endpoint: string): number | undefined {
  const match = endpoint.match(/outline-phase(\d+)/);
  return match ? parseInt(match[1], 10) : undefined;
}

/** Extract stage from summary endpoint */
function extractStage(endpoint: string): string | undefined {
  const match = endpoint.match(/summary-(.+)/);
  return match ? match[1] : undefined;
}

export const createLogEntry = (params: CreateLogEntryParams): LogEntry => {
  const {
    provider,
    model,
    endpoint,
    type,
    toolName,
    toolInput,
    toolOutput,
    phase,
    stage,
    imagePrompt,
    imageResolution,
    usage,
    toolCalls,
    generationDetails,
    stageInput,
    rawResponse,
    parsedResult,
    request,
    response,
  } = params;

  // Auto-infer type and extract phase/stage if not provided
  const inferredType = type ?? inferLogType(endpoint);
  const inferredPhase = phase ?? extractPhase(endpoint);
  const inferredStage = stage ?? extractStage(endpoint);

  const entry: LogEntry = {
    id: Date.now().toString() + Math.random().toString(36).substring(7),
    timestamp: Date.now(),
    provider,
    model,
    endpoint,
    type: inferredType,
    toolName,
    toolInput,
    toolOutput,
    phase: inferredPhase,
    stage: inferredStage,
    imagePrompt,
    imageResolution,
    usage: usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    toolCalls,
    generationDetails,
    stageInput,
    rawResponse,
    parsedResult: parsedResult as Record<string, unknown>,
    request,
    response,
  };

  console.log(`[Log] ${provider}/${model} - ${endpoint}`, {
    type: entry.type,
    toolName: entry.toolName,
    usage: entry.usage,
    toolCallCount: toolCalls?.length || 0,
  });

  return entry;
};

// ============================================================================
// Model Cache & Helpers
// ============================================================================

interface ModelCacheEntry {
  timestamp: number;
  data: ModelInfo[];
  configHash: string;
}

const modelCache: Record<string, ModelCacheEntry> = {};

/**
 * 获取可用模型列表
 * @param settings 设置对象
 * @param providerId Provider ID
 * @param forceRefresh 是否强制刷新（忽略缓存）
 */
export const getModels = async (
  settings: AISettings,
  providerId: string,
  forceRefresh: boolean = false,
): Promise<ModelInfo[]> => {
  // 获取模型列表时不要求 provider 已启用
  const instance = getProviderInstance(settings, providerId, false);
  if (!instance) {
    return [];
  }

  // 检查是否有 API Key
  if (!instance.apiKey || instance.apiKey.trim() === "") {
    console.warn(`Provider ${providerId} has no API key`);
    return [];
  }

  const config = createProviderConfig(instance);

  // 检查缓存
  const cacheKey = `${providerId}`;
  if (!forceRefresh && modelCache[cacheKey]) {
    const cached = modelCache[cacheKey];
    const age = Date.now() - cached.timestamp;
    if (age < 60 * 1000) {
      return cached.data;
    }
  }

  try {
    let models: ModelInfo[];

    switch (instance.protocol) {
      case "gemini":
        models = await getGeminiModels(config as GeminiConfig);
        break;
      case "openai":
        models = await getOpenAIModels(config as OpenAIConfig);
        break;
      case "openrouter":
        models = await getOpenRouterModels(config as OpenRouterConfig);
        break;
      case "claude":
        models = await getClaudeModels(config as ClaudeConfig);
        break;
      default:
        throw new Error(`Unknown protocol: ${instance.protocol}`);
    }

    // 缓存结果
    modelCache[cacheKey] = {
      timestamp: Date.now(),
      data: models,
      configHash: JSON.stringify({ providerId, baseUrl: instance.baseUrl }),
    };

    return models;
  } catch (error) {
    console.error(`Failed to fetch models for provider ${providerId}:`, error);
    return [];
  }
};

/**
 * 验证 Provider 连接
 * 注意：此函数可以验证禁用的 provider，因为用户可能需要先测试再启用
 * @param settings 设置对象
 * @param providerId Provider ID
 */
export const validateConnection = async (
  settings: AISettings,
  providerId: string,
): Promise<{ isValid: boolean; error?: string; localError?: boolean }> => {
  // 直接查找 provider 实例，不检查 enabled 状态
  const instance = settings.providers.instances.find(
    (p) => p.id === providerId,
  );
  if (!instance) {
    return {
      isValid: false,
      error: "Provider instance not found",
      localError: true,
    };
  }

  // 检查必要的配置
  if (!instance.apiKey || instance.apiKey.trim() === "") {
    return { isValid: false, error: "API key is required", localError: true };
  }

  const config = createProviderConfig(instance);

  try {
    switch (instance.protocol) {
      case "gemini":
        await validateGeminiConnection(config as GeminiConfig);
        break;
      case "openai":
        await validateOpenAIConnection(config as OpenAIConfig);
        break;
      case "openrouter":
        await validateOpenRouterConnection(config as OpenRouterConfig);
        break;
      case "claude":
        await validateClaudeConnection(config as ClaudeConfig);
        break;
      default:
        throw new Error(`Unknown protocol: ${instance.protocol}`);
    }
    return { isValid: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { isValid: false, error: message, localError: false };
  }
};

/**
 * 过滤模型列表
 * @param models 模型列表
 * @param type 功能类型
 * @param disableFilter 是否禁用过滤（显示所有模型）
 */
export const filterModels = (
  models: ModelInfo[],
  type: FunctionType,
  disableFilter: boolean = false,
): ModelInfo[] => {
  // If filtering is disabled, return all models sorted
  if (disableFilter) {
    return [...models].sort((a, b) =>
      (a.name || a.id).localeCompare(b.name || b.id),
    );
  }

  let filtered = models;

  if (type === "image") {
    filtered = models.filter(
      (m) =>
        m.capabilities?.image ??
        (m.id.includes("imagen") ||
          m.id.includes("dall-e") ||
          m.id.includes("vision")),
    );
  } else if (type === "video") {
    filtered = models.filter(
      (m) =>
        m.capabilities?.video ??
        (m.id.includes("veo") || m.id.includes("sora")),
    );
  } else if (type === "audio") {
    filtered = models.filter(
      (m) =>
        m.capabilities?.audio ??
        (m.id.includes("gemini") ||
          m.id.includes("tts") ||
          m.id.includes("audio")),
    );
  } else {
    // Text/Story/Lore/Translation
    filtered = models.filter(
      (m) =>
        m.capabilities?.text ??
        (!m.id.includes("dall-e") &&
          !m.id.includes("tts") &&
          !m.id.includes("veo")),
    );

    // For Story mode, we specifically require Tool support because the Agentic Loop relies on it.
    if (type === "story") {
      filtered = filtered.filter((m) => m.capabilities?.tools);
    }
  }

  return filtered.sort((a, b) =>
    (a.name || a.id).localeCompare(b.name || b.id),
  );
};

// ============================================================================
// Theme Helpers
// ============================================================================

import { THEMES } from "../../utils/constants";

/**
 * 解析主题配置
 * @param themeKey 主题键
 * @param language 语言代码
 * @param tFunc 翻译函数
 */
export const resolveThemeConfig = (
  themeKey: string,
  language: string,
  tFunc: (key: string, options?: Record<string, unknown>) => string,
): {
  narrativeStyle: string;
  backgroundTemplate: string;
  example: string;
  worldSetting: string;
  isRestricted: boolean;
} => {
  const themeConfig = THEMES[themeKey] || THEMES["fantasy"];
  const isRestricted = themeConfig?.restricted || false;

  let narrativeStyle = "";
  let backgroundTemplate = "";
  let example = "";
  let worldSetting = "";

  if (tFunc) {
    narrativeStyle = tFunc(`${themeKey}.narrativeStyle`, { ns: "themes" });
    backgroundTemplate = tFunc(`${themeKey}.backgroundTemplate`, {
      ns: "themes",
    });
    example = tFunc(`${themeKey}.example`, { ns: "themes" });
    worldSetting = tFunc(`${themeKey}.worldSetting`, { ns: "themes" });
  } else {
    // Fallback if tFunc not available (shouldn't happen in normal flow)
    narrativeStyle = "Standard narrative style.";
    backgroundTemplate = "Standard background.";
    example = "Standard example.";
    worldSetting = "Standard world setting.";
  }

  return {
    narrativeStyle,
    backgroundTemplate,
    example,
    worldSetting,
    isRestricted,
  };
};

/**
 * Extract JSON from text
 * Tries strategies:
 * 1. Full text parse
 * 2. Markdown JSON block
 * 3. Brute force regex for {} or []
 */
export const extractJson = (text: string): unknown | null => {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (e) {
    // Continue
  }

  // Strategy 2: Markdown block
  const markdownMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (markdownMatch) {
    try {
      return JSON.parse(markdownMatch[1]);
    } catch (e) {
      // Continue
    }
  }

  // Strategy 3: Find first { or [ and last matching } or ]
  // This is a simplified regex approach, usually effective for single objects
  const firstOpenBrace = text.indexOf("{");
  const firstOpenBracket = text.indexOf("[");

  let start: number = -1;
  let end: number = -1;

  if (
    firstOpenBrace !== -1 &&
    (firstOpenBracket === -1 || firstOpenBrace < firstOpenBracket)
  ) {
    start = firstOpenBrace;
    const lastCloseBrace = text.lastIndexOf("}");
    if (lastCloseBrace !== -1) end = lastCloseBrace + 1;
  } else if (firstOpenBracket !== -1) {
    start = firstOpenBracket;
    const lastCloseBracket = text.lastIndexOf("]");
    if (lastCloseBracket !== -1) end = lastCloseBracket + 1;
  }

  if (start !== -1 && end !== -1 && end > start) {
    try {
      const substring = text.substring(start, end);
      return JSON.parse(substring);
    } catch (e) {
      // One retry: sometimes there is trailing text like "}" or "]" which regex picked up naively
      // But strict JSON parsing failed.
      // For now, return null.
    }
  }

  return null;
};
