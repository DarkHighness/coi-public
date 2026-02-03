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
  thinkingEffort?:
    | "xhigh"
    | "high"
    | "medium"
    | "low"
    | "minimal"
    | "none"
    | (string & {});
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
    thinkingEffort: funcConfig.thinkingEffort,
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
  turnId?: string;
  forkId?: number;
  turnNumber?: number;
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
    turnId: params.turnId,
    forkId: params.forkId,
    turnNumber: params.turnNumber,
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

  // Enhanced console logging
  const logDetails: Record<string, unknown> = {
    type: entry.type,
    usage: entry.usage,
  };

  // Add context identifiers if present
  if (entry.turnNumber !== undefined) logDetails.turnNumber = entry.turnNumber;
  if (entry.forkId !== undefined) logDetails.forkId = entry.forkId;
  if (entry.turnId) logDetails.turnId = entry.turnId;

  // Add phase/stage for outline/summary
  if (entry.phase !== undefined) logDetails.phase = entry.phase;
  if (entry.stage) logDetails.stage = entry.stage;

  // Add tool information
  if (entry.toolName) {
    logDetails.toolName = entry.toolName;
  }

  if (toolCalls?.length) {
    logDetails.toolCallCount = toolCalls.length;
    logDetails.toolCallNames = toolCalls.map((tc) => tc.name).join(", ");
  }

  if (toolInput) {
    logDetails.toolInput = toolInput;
  }

  if (toolOutput) {
    logDetails.toolOutput = toolOutput;
  }

  // Add image info if applicable
  if (entry.imagePrompt) {
    logDetails.imagePrompt =
      entry.imagePrompt.substring(0, 100) +
      (entry.imagePrompt.length > 100 ? "..." : "");
    if (entry.imageResolution)
      logDetails.imageResolution = entry.imageResolution;
  }

  // Add raw response preview for debugging
  if (rawResponse && rawResponse.length > 0) {
    logDetails.rawResponsePreview =
      rawResponse.substring(0, 200) + (rawResponse.length > 200 ? "..." : "");
  }

  console.log(`[Log] ${provider}/${model} - ${endpoint}`, logDetails);

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

/** Special theme key that uses main translation namespace instead of themes namespace */
export const IMAGE_BASED_THEME = "imageBased";

/**
 * Get translated theme name with proper namespace handling
 * imageBased theme uses main translation namespace, all others use themes namespace
 *
 * @param themeKey Theme key
 * @param tFunc Translation function
 * @param defaultValue Optional default value if translation fails
 */
export const getThemeName = (
  themeKey: string | undefined | null,
  tFunc: (key: string, options?: Record<string, unknown>) => string,
  defaultValue?: string,
): string => {
  if (!themeKey || themeKey === IMAGE_BASED_THEME) {
    return tFunc("imageBased.name", {
      defaultValue: defaultValue || "Image Based",
    });
  }
  return tFunc(`${themeKey}.name`, {
    ns: "themes",
    defaultValue: defaultValue || themeKey,
  });
};

/**
 * Get any theme translation field with proper namespace handling
 * imageBased theme doesn't have these fields (it's generated from image), returns empty string
 *
 * @param themeKey Theme key
 * @param field Field name (narrativeStyle, worldSetting, example, backgroundTemplate)
 * @param tFunc Translation function
 */
export const getThemeTranslation = (
  themeKey: string,
  field: "narrativeStyle" | "worldSetting" | "example" | "backgroundTemplate",
  tFunc: (key: string, options?: Record<string, unknown>) => string,
): string => {
  // imageBased theme doesn't have predefined translations (content is generated from image)
  if (themeKey === IMAGE_BASED_THEME) {
    return "";
  }
  return tFunc(`${themeKey}.${field}`, { ns: "themes" });
};

export type NarrativeStylePreset =
  | "theme"
  | "cinematic"
  | "literary"
  | "noir"
  | "brutal"
  | "cozy"
  | "cdrama"
  | "minimal";

export function extractXmlTagValue(
  input: string | undefined,
  tagName: string,
): string | undefined {
  if (!input) return undefined;
  const re = new RegExp(`<${tagName}>\\s*([\\s\\S]*?)\\s*<\\/${tagName}>`, "i");
  const match = input.match(re);
  const value = match?.[1]?.trim();
  return value ? value : undefined;
}

export function getNarrativeStylePresetText(
  preset: NarrativeStylePreset,
  language: string,
): string | undefined {
  if (preset === "theme") return undefined;

  const isZh = language?.toLowerCase().startsWith("zh");

  if (isZh) {
    switch (preset) {
      case "cinematic":
        return "电影感：镜头调度清晰（站位/光线/动作路径），画面先于解释；用可见细节推紧张（脚步声、门缝光、手上血），段落像剪辑点；结尾留钩子，不写总结。";
      case "literary":
        return "文学向：句式有起伏但不飘；细节带气味与质地（潮气、锈、油烟、旧布），隐喻克制；暗示必须落在可观察证据上；冲突有余味，别急着解释完。";
      case "noir":
        return "黑色/侦探：冷、硬、压抑；对白带刺、带试探；线索靠观察与误导（烟灰、鞋底泥、账本缺页），人都在算账；城市脏，关系也脏。";
      case "brutal":
        return "冷硬残酷：后果写实，疼痛有重量（淤青、气喘、手抖、药钱、名声损耗）；权力与代价摆台面（税、告密、欠债、保护费）；不讲“命运”，也不替玩家找借口。";
      case "cozy":
        return "温情日常：慢一点，但细节要真（饭味、灯火、手上茧、零钱）；人情与小心思靠动作/停顿/话里话外呈现；冲突更贴身（钱、面子、关系、误会），不靠大场面。";
      case "cdrama":
        return "中式短剧/简单恋爱：节奏快、情绪点明确（误会/抓包/告白/反转），场景短、切换利落；台词直给但有钩子（“你到底想要什么？”“我只要你一句话。”）；少解释，多用动作与小道具（戒指、手机、病历、转账截图）推进；结尾留悬念或下一步冲突；绝不写主角心理，主角=玩家。";
      case "minimal":
        return "极简：短句为主，信息密度高；只写关键动作/细节/后果；每段都推动局势；少形容词，多动词；留白靠事实，不靠玄乎。";
      default:
        return undefined;
    }
  }

  switch (preset) {
    case "cinematic":
      return "Cinematic: clear blocking (who stands where, light, motion), image-first, tension via concrete tells (footsteps, thin light, blood on knuckles); paragraph breaks like cuts; end on a hook, not a recap.";
    case "literary":
      return "Literary: varied rhythm without purple prose; tactile specificity (rust, damp, grease, old cloth); restrained metaphor; implications must rest on observable evidence; leave an aftertaste instead of wrapping everything up.";
    case "noir":
      return "Noir: cold, hard, morally stained; barbed dialogue with subtext; clues via observation and misdirection (ash, mud, missing pages); everyone is calculating; the city (and people) are not clean.";
    case "brutal":
      return "Brutal realism: consequences have weight; pain is specific (breath, bruises, shaking hands, bills); power and price are explicit (tax, debt, snitches, protection money); no fate-talk, no softening.";
    case "cozy":
      return "Cozy slice-of-life: slower pace but sharp texture (food smell, lamplight, small change, calluses); subtext via action/dialogue pauses; conflicts are intimate and practical (money, face, relationships).";
    case "cdrama":
      return "C-drama short-form / simple romance: fast, punchy beats (misunderstanding, caught-in-the-act, confession, reversal); short scenes and clean cut points; direct lines with a hook; push plot via actions and small props (ring, phone, medical report, transfer screenshot); end on a cliffhanger; never narrate the protagonist's inner life (player = protagonist).";
    case "minimal":
      return "Minimal: short sentences, high signal; key actions/details/consequences only; fewer adjectives, more verbs; every paragraph advances the situation.";
    default:
      return undefined;
  }
}

export type WorldDispositionPreset = "theme" | "benevolent" | "mixed" | "cynical";

export function getWorldDispositionPresetText(
  preset: WorldDispositionPreset,
  language: string,
): string | undefined {
  if (preset === "theme") return undefined;

  const isZh = language?.toLowerCase().startsWith("zh");

  if (isZh) {
    switch (preset) {
      case "benevolent":
        return "人性本善（基线偏善）：善意与纯爱并不罕见；互相帮助不一定要回报；恶人也存在，但不会“全世界都在算计你”。";
      case "mixed":
        return "善恶并存（现实中间值）：有人真心，有人算计；善意可能无条件，也可能带交换；让行为与代价说话，不要预设结论。";
      case "cynical":
        return "犬儒/交易社会（基线偏冷）：善意更常带条件或成本；人际多算计、更多试探；但仍允许少数真心与纯爱，且往往更昂贵、更冒险。";
      default:
        return undefined;
    }
  }

  switch (preset) {
    case "benevolent":
      return "Benevolent baseline: kindness and sincere love are not rare; help does not always demand repayment; evil exists, but the whole world isn't out to get you.";
    case "mixed":
      return "Mixed baseline: people range from sincere to calculating; kindness can be unconditional or transactional; let behavior and cost reveal which.";
    case "cynical":
      return "Cynical baseline: kindness more often has strings attached; relationships involve leverage and testing; still allow pockets of sincerity and pure love, usually at real cost.";
    default:
      return undefined;
  }
}

export function resolveWorldDisposition(input: {
  preset?: WorldDispositionPreset;
  language: string;
  customContext?: string;
}): string | undefined {
  const fromCustomContext = extractXmlTagValue(
    input.customContext,
    "world_disposition",
  );
  if (fromCustomContext) return fromCustomContext;

  if (!input.preset) return undefined;
  return getWorldDispositionPresetText(input.preset, input.language);
}

export function resolveNarrativeStyle(
  input: {
    themeStyle?: string;
    preset?: NarrativeStylePreset;
    language: string;
    customContext?: string;
  },
): string | undefined {
  const fromCustomContext = extractXmlTagValue(
    input.customContext,
    "narrative_style",
  );
  if (fromCustomContext) return fromCustomContext;

  const presetText = input.preset
    ? getNarrativeStylePresetText(input.preset, input.language)
    : undefined;

  // Preset is a supplement to theme style, not a replacement.
  if (presetText) {
    const base = input.themeStyle?.trim();
    if (!base) return presetText;
    const isZh = input.language?.toLowerCase().startsWith("zh");
    return isZh ? `${base}\n\n补充风格：${presetText}` : `${base}\n\nStyle add-on: ${presetText}`;
  }

  return input.themeStyle;
}

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
  // imageBased theme doesn't have config or translations - content is generated from image
  if (themeKey === IMAGE_BASED_THEME) {
    return {
      narrativeStyle: "",
      backgroundTemplate: "",
      example: "",
      worldSetting: "",
      isRestricted: false,
    };
  }

  const themeConfig = THEMES[themeKey] || THEMES["fantasy"];
  const isRestricted = themeConfig?.restricted || false;

  let narrativeStyle = "";
  let backgroundTemplate = "";
  let example = "";
  let worldSetting = "";

  if (tFunc) {
    narrativeStyle = getThemeTranslation(themeKey, "narrativeStyle", tFunc);
    backgroundTemplate = getThemeTranslation(
      themeKey,
      "backgroundTemplate",
      tFunc,
    );
    example = getThemeTranslation(themeKey, "example", tFunc);
    worldSetting = getThemeTranslation(themeKey, "worldSetting", tFunc);
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

import type { ResolvedThemeConfig } from "../../types";

/**
 * Create ThemeConfig for storage in GameState
 * For normal themes: resolves from i18n
 * For imageBased: returns empty config (will be populated from Phase 0)
 *
 * @param themeKey Theme key
 * @param tFunc Translation function
 * @returns ThemeConfig ready for storage
 */
export const createThemeConfig = (
  themeKey: string | undefined | null,
  tFunc: (key: string, options?: Record<string, unknown>) => string,
): ResolvedThemeConfig => {
  // imageBased theme returns empty config - will be populated from Phase 0
  if (!themeKey || themeKey === IMAGE_BASED_THEME) {
    return {
      name: tFunc("imageBased.name", { defaultValue: "Image Based" }),
      narrativeStyle: "",
      worldSetting: "",
      backgroundTemplate: "",
      example: "",
      isRestricted: false,
    };
  }

  // Normal themes: resolve from i18n
  const themeConfig = THEMES[themeKey] || THEMES["fantasy"];
  const isRestricted = themeConfig?.restricted || false;

  return {
    name: tFunc(`${themeKey}.name`, { ns: "themes", defaultValue: themeKey }),
    narrativeStyle: getThemeTranslation(themeKey, "narrativeStyle", tFunc),
    worldSetting: getThemeTranslation(themeKey, "worldSetting", tFunc),
    backgroundTemplate: getThemeTranslation(
      themeKey,
      "backgroundTemplate",
      tFunc,
    ),
    example: getThemeTranslation(themeKey, "example", tFunc),
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
