import {
  AISettings,
  CulturePreference,
  SavePresetProfile,
  NarrativeStylePreset,
  WorldDispositionPreset,
  PlayerMalicePreset,
  PlayerMaliceIntensityPreset,
  LogEntry,
  TokenUsage,
  ToolCallRecord,
  ProviderInstance,
  ProviderProtocol,
  ModelInfo,
} from "../../types";

import type {
  GeminiConfig,
  OpenAIConfig,
  OpenRouterConfig,
  ClaudeConfig,
} from "../providers/types";

import { applyDefaultContextWindowsToModels } from "../modelContextWindows";

const loadGeminiProvider = () => import("../providers/geminiProvider");
const loadOpenAIProvider = () => import("../providers/openaiProvider");
const loadOpenRouterProvider = () => import("../providers/openRouterProvider");
const loadClaudeProvider = () => import("../providers/claudeProvider");

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
  toolInput?: JsonObject;
  toolOutput?: unknown;
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
  request?: unknown;
  response?: unknown;
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

type LogPayload = {
  error?: unknown;
  [key: string]: unknown;
};

const toLogPayload = (value: unknown): LogPayload | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value && typeof value === "object") {
    return value as LogPayload;
  }
  return { value };
};

const createDefaultUsage = (): TokenUsage => ({
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
});

const isFiniteTokenValue = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const resolveLogUsage = (usage: TokenUsage | undefined): TokenUsage => {
  if (!usage) {
    return createDefaultUsage();
  }

  if (
    !isFiniteTokenValue(usage.promptTokens) ||
    !isFiniteTokenValue(usage.completionTokens) ||
    !isFiniteTokenValue(usage.totalTokens)
  ) {
    throw new Error("Invalid token usage payload for createLogEntry");
  }

  return usage;
};

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
    toolOutput: toLogPayload(toolOutput),
    phase: inferredPhase,
    turnId: params.turnId,
    forkId: params.forkId,
    turnNumber: params.turnNumber,
    stage: inferredStage,
    imagePrompt,
    imageResolution,
    usage: resolveLogUsage(usage),
    toolCalls,
    generationDetails,
    stageInput,
    rawResponse,
    parsedResult,
    request: toLogPayload(request),
    response: toLogPayload(response),
  };

  // Enhanced console logging
  const logDetails: JsonObject = {
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

const CONNECTION_VALIDATION_TTL_MS = 15 * 60 * 1000;

export interface ValidateConnectionResult {
  isValid: boolean;
  error?: string;
  localError?: boolean;
}

export interface ValidateConnectionOptions {
  forceRefresh?: boolean;
}

interface ConnectionValidationCacheEntry {
  timestamp: number;
  result: ValidateConnectionResult;
}

const connectionValidationCache = new Map<
  string,
  ConnectionValidationCacheEntry
>();
const connectionValidationInFlight = new Map<
  string,
  Promise<ValidateConnectionResult>
>();

const createApiKeyFingerprint = (apiKey: string): string => {
  if (!apiKey) return "0";
  return `${apiKey.length}:${apiKey.slice(0, 2)}:${apiKey.slice(-2)}`;
};

const createConnectionValidationCacheKey = (
  instance: ProviderInstance,
): string =>
  [
    instance.id,
    instance.protocol,
    instance.baseUrl || "",
    createApiKeyFingerprint(instance.apiKey || ""),
    String(instance.lastModified || 0),
  ].join("|");

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
      case "gemini": {
        const provider = await loadGeminiProvider();
        models = await provider.getModels(config as GeminiConfig);
        break;
      }
      case "openai": {
        const provider = await loadOpenAIProvider();
        models = await provider.getModels(config as OpenAIConfig);
        break;
      }
      case "openrouter": {
        const provider = await loadOpenRouterProvider();
        models = await provider.getModels(config as OpenRouterConfig);
        break;
      }
      case "claude": {
        const provider = await loadClaudeProvider();
        models = await provider.getModels(config as ClaudeConfig);
        break;
      }
      default:
        throw new Error(`Unknown protocol: ${instance.protocol}`);
    }

    models = applyDefaultContextWindowsToModels(instance.protocol, models);

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
 * @param options forceRefresh=true 时跳过缓存并强制实时校验
 */
export const validateConnection = async (
  settings: AISettings,
  providerId: string,
  options?: ValidateConnectionOptions,
): Promise<ValidateConnectionResult> => {
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

  const forceRefresh = options?.forceRefresh === true;
  const cacheKey = createConnectionValidationCacheKey(instance);
  const now = Date.now();
  if (!forceRefresh) {
    const cached = connectionValidationCache.get(cacheKey);
    if (cached && now - cached.timestamp < CONNECTION_VALIDATION_TTL_MS) {
      return cached.result;
    }
    const inFlight = connectionValidationInFlight.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }
  }

  const config = createProviderConfig(instance);

  const remoteValidationPromise =
    (async (): Promise<ValidateConnectionResult> => {
      try {
        switch (instance.protocol) {
          case "gemini": {
            const provider = await loadGeminiProvider();
            await provider.validateConnection(config as GeminiConfig);
            break;
          }
          case "openai": {
            const provider = await loadOpenAIProvider();
            await provider.validateConnection(config as OpenAIConfig);
            break;
          }
          case "openrouter": {
            const provider = await loadOpenRouterProvider();
            await provider.validateConnection(config as OpenRouterConfig);
            break;
          }
          case "claude": {
            const provider = await loadClaudeProvider();
            await provider.validateConnection(config as ClaudeConfig);
            break;
          }
          default:
            throw new Error(`Unknown protocol: ${instance.protocol}`);
        }
        return { isValid: true };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return { isValid: false, error: message, localError: false };
      }
    })();

  if (!forceRefresh) {
    connectionValidationInFlight.set(cacheKey, remoteValidationPromise);
  }

  try {
    const result = await remoteValidationPromise;
    if (!result.localError) {
      connectionValidationCache.set(cacheKey, {
        timestamp: Date.now(),
        result,
      });
    }
    return result;
  } finally {
    if (!forceRefresh) {
      connectionValidationInFlight.delete(cacheKey);
    }
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
  tFunc: (key: string, options?: JsonObject) => string,
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
  tFunc: (key: string, options?: JsonObject) => string,
): string => {
  // imageBased theme doesn't have predefined translations (content is generated from image)
  if (themeKey === IMAGE_BASED_THEME) {
    return "";
  }
  return tFunc(`${themeKey}.${field}`, { ns: "themes" });
};

export const DEFAULT_SAVE_PRESET_PROFILE: SavePresetProfile = {
  narrativeStylePreset: "theme",
  worldDispositionPreset: "theme",
  playerMalicePreset: "theme",
  playerMaliceIntensity: "standard",
  locked: true,
};

export type PresetProfileSource =
  | "custom_context"
  | "save_profile"
  | "theme_default"
  | "story_setting";

export type EffectivePresetProfile = {
  narrativeStylePreset: {
    value: NarrativeStylePreset;
    source: PresetProfileSource;
  };
  worldDispositionPreset: {
    value: WorldDispositionPreset;
    source: PresetProfileSource;
  };
  playerMalicePreset: {
    value: PlayerMalicePreset;
    source: PresetProfileSource;
  };
  playerMaliceIntensity: {
    value: PlayerMaliceIntensityPreset;
    source: PresetProfileSource;
  };
};

export type CultureCircle = Exclude<
  CulturePreference,
  "follow_story_setting" | "none"
>;

export type CulturePreferenceResolutionSource =
  | "explicit"
  | "story_setting"
  | "fallback_none";

export type CultureNamingPolicy =
  "transliterate_to_output_language_single_script";

export type CulturePreferenceContext = {
  preference: CulturePreference;
  effectiveCircle: CultureCircle | "none";
  source: CulturePreferenceResolutionSource;
  hubSkillPath: string;
  skillPath?: string;
  namingPolicy: CultureNamingPolicy;
  inferredFrom: "theme_key" | "world_setting" | "none";
};

const CULTURE_CIRCLE_SKILL_PATHS: Record<CultureCircle, string> = {
  sinosphere: "skills/presets/runtime/culture-sinosphere/SKILL.md",
  japanese: "skills/presets/runtime/culture-japanese/SKILL.md",
  korean: "skills/presets/runtime/culture-korean/SKILL.md",
  western_euro_american:
    "skills/presets/runtime/culture-western-euro-american/SKILL.md",
  arab_islamic: "skills/presets/runtime/culture-arab-islamic/SKILL.md",
  south_asian: "skills/presets/runtime/culture-south-asian/SKILL.md",
  latin_american: "skills/presets/runtime/culture-latin-american/SKILL.md",
  sub_saharan_african:
    "skills/presets/runtime/culture-sub-saharan-african/SKILL.md",
};

export const CULTURE_PRESET_SKILL_PATHS = {
  hub: "skills/presets/runtime/culture/SKILL.md",
  circles: CULTURE_CIRCLE_SKILL_PATHS,
} as const;

const STORY_SETTING_THEME_HINTS: Array<{
  circle: CultureCircle;
  hints: string[];
}> = [
  {
    circle: "sinosphere",
    hints: [
      "xianxia",
      "wuxia",
      "jianghu",
      "cultivation",
      "c_drama",
      "chinese",
      "ancient_china",
      "republic_of_china",
      "three_kingdoms",
      "long_aotian",
    ],
  },
  {
    circle: "japanese",
    hints: [
      "japan",
      "samurai",
      "sengoku",
      "heian",
      "onmyoji",
      "yokai",
      "anime",
    ],
  },
  {
    circle: "korean",
    hints: ["korean", "joseon", "goryeo", "chaebol"],
  },
  {
    circle: "western_euro_american",
    hints: [
      "medieval_europe",
      "western",
      "victorian",
      "wild_west",
      "american",
      "europe",
    ],
  },
  {
    circle: "arab_islamic",
    hints: ["arab", "islamic", "caliphate", "ottoman", "persia", "middle_east"],
  },
  {
    circle: "south_asian",
    hints: ["india", "indian", "south_asia", "mughal", "bharat"],
  },
  {
    circle: "latin_american",
    hints: ["latin", "latam", "mexico", "aztec", "maya", "inca", "andes"],
  },
  {
    circle: "sub_saharan_african",
    hints: ["sub_saharan", "africa", "yoruba", "swahili", "zulu", "sahel"],
  },
];

const STORY_SETTING_TEXT_HINTS: Array<{
  circle: CultureCircle;
  pattern: RegExp;
}> = [
  {
    circle: "sinosphere",
    pattern:
      /(xianxia|wuxia|jianghu|cultivation|menpai|sect|dynasty|hanfu|qin|han|tang|song|ming|qing|华夏|中原|江湖|修仙|武侠|门派|宗门|朝代|大唐|大明|民国)/i,
  },
  {
    circle: "japanese",
    pattern:
      /(japan|edo|samurai|shogun|heian|sengoku|onmyoji|yokai|tokyo|kyoto|japanese|日本|幕府|武士|阴阳师|妖怪|江户|战国|和风)/i,
  },
  {
    circle: "korean",
    pattern:
      /(korea|korean|joseon|goryeo|hanbok|chaebol|seoul|韩国|朝鲜王朝|高丽|韩服|财阀|首尔)/i,
  },
  {
    circle: "arab_islamic",
    pattern:
      /(arab|islam|caliph|sultan|ottoman|persia|mesopotamia|baghdad|mecca|medina|middle east|阿拉伯|伊斯兰|哈里发|苏丹|奥斯曼|波斯|巴格达)/i,
  },
  {
    circle: "south_asian",
    pattern:
      /(south asia|india|indian|bharat|mughal|hindu|sikh|tamil|bengal|delhi|mumbai|南亚|印度|莫卧儿|恒河|德里|孟买)/i,
  },
  {
    circle: "latin_american",
    pattern:
      /(latin america|latino|mexico|aztec|maya|inca|andes|brazil|argentina|peru|chile|拉美|墨西哥|阿兹特克|玛雅|印加|安第斯|巴西)/i,
  },
  {
    circle: "sub_saharan_african",
    pattern:
      /(sub-saharan|sub saharan|africa|african|sahel|yoruba|swahili|zulu|ethiopia|ghana|mali|刚果|撒哈拉以南|非洲|约鲁巴|斯瓦希里|祖鲁)/i,
  },
  {
    circle: "western_euro_american",
    pattern:
      /(western europe|north america|european|american|victorian|british|french|german|italian|roman|london|paris|new york|wild west|westerns?|西欧|北美|维多利亚|英伦|法兰西|罗马)/i,
  },
];

function sanitizeCulturePreference(
  value: unknown,
): CulturePreference | undefined {
  switch (value) {
    case "follow_story_setting":
    case "none":
    case "sinosphere":
    case "japanese":
    case "korean":
    case "western_euro_american":
    case "arab_islamic":
    case "south_asian":
    case "latin_american":
    case "sub_saharan_african":
      return value;
    default:
      return undefined;
  }
}

function inferCultureCircleFromThemeKey(
  themeKey?: string | null,
): CultureCircle | undefined {
  const normalized = (themeKey || "").toLowerCase();
  if (!normalized) return undefined;

  for (const rule of STORY_SETTING_THEME_HINTS) {
    if (rule.hints.some((hint) => normalized.includes(hint))) {
      return rule.circle;
    }
  }

  return undefined;
}

function inferCultureCircleFromStoryText(
  text: string,
): CultureCircle | undefined {
  for (const rule of STORY_SETTING_TEXT_HINTS) {
    if (rule.pattern.test(text)) {
      return rule.circle;
    }
  }
  return undefined;
}

export function resolveCulturePreferenceContext(input: {
  preference?: CulturePreference | null;
  themeKey?: string | null;
  worldSetting: string;
}): CulturePreferenceContext {
  const preference =
    sanitizeCulturePreference(input.preference) ?? "follow_story_setting";
  const namingPolicy: CultureNamingPolicy =
    "transliterate_to_output_language_single_script";

  if (preference === "none") {
    return {
      preference,
      effectiveCircle: "none",
      source: "explicit",
      hubSkillPath: CULTURE_PRESET_SKILL_PATHS.hub,
      namingPolicy,
      inferredFrom: "none",
    };
  }

  if (preference !== "follow_story_setting") {
    return {
      preference,
      effectiveCircle: preference,
      source: "explicit",
      hubSkillPath: CULTURE_PRESET_SKILL_PATHS.hub,
      skillPath: CULTURE_PRESET_SKILL_PATHS.circles[preference],
      namingPolicy,
      inferredFrom: "none",
    };
  }

  const themeCircle = inferCultureCircleFromThemeKey(input.themeKey);
  if (themeCircle) {
    return {
      preference,
      effectiveCircle: themeCircle,
      source: "story_setting",
      hubSkillPath: CULTURE_PRESET_SKILL_PATHS.hub,
      skillPath: CULTURE_PRESET_SKILL_PATHS.circles[themeCircle],
      namingPolicy,
      inferredFrom: "theme_key",
    };
  }

  const combinedText = input.worldSetting.trim();
  const worldCircle = combinedText
    ? inferCultureCircleFromStoryText(combinedText)
    : undefined;

  if (worldCircle) {
    return {
      preference,
      effectiveCircle: worldCircle,
      source: "story_setting",
      hubSkillPath: CULTURE_PRESET_SKILL_PATHS.hub,
      skillPath: CULTURE_PRESET_SKILL_PATHS.circles[worldCircle],
      namingPolicy,
      inferredFrom: "world_setting",
    };
  }

  return {
    preference,
    effectiveCircle: "none",
    source: "fallback_none",
    hubSkillPath: CULTURE_PRESET_SKILL_PATHS.hub,
    namingPolicy,
    inferredFrom: "none",
  };
}

function sanitizeNarrativeStylePreset(
  value: unknown,
): NarrativeStylePreset | undefined {
  switch (value) {
    case "theme":
    case "cinematic":
    case "literary":
    case "noir":
    case "brutal":
    case "cozy":
    case "cdrama":
    case "minimal":
      return value;
    default:
      return undefined;
  }
}

function sanitizeWorldDispositionPreset(
  value: unknown,
): WorldDispositionPreset | undefined {
  switch (value) {
    case "theme":
    case "benevolent":
    case "mixed":
    case "cynical":
      return value;
    default:
      return undefined;
  }
}

function sanitizePlayerMalicePreset(
  value: unknown,
): PlayerMalicePreset | undefined {
  switch (value) {
    case "theme":
    case "intimidation":
    case "bureaucratic":
    case "manipulation":
    case "sabotage":
      return value;
    default:
      return undefined;
  }
}

function sanitizePlayerMaliceIntensityPreset(
  value: unknown,
): PlayerMaliceIntensityPreset | undefined {
  switch (value) {
    case "light":
    case "standard":
    case "heavy":
      return value;
    default:
      return undefined;
  }
}

export function normalizeSavePresetProfile(
  profile: Partial<SavePresetProfile> | undefined | null,
): SavePresetProfile {
  return {
    narrativeStylePreset:
      sanitizeNarrativeStylePreset(profile?.narrativeStylePreset) ??
      DEFAULT_SAVE_PRESET_PROFILE.narrativeStylePreset,
    worldDispositionPreset:
      sanitizeWorldDispositionPreset(profile?.worldDispositionPreset) ??
      DEFAULT_SAVE_PRESET_PROFILE.worldDispositionPreset,
    playerMalicePreset:
      sanitizePlayerMalicePreset(profile?.playerMalicePreset) ??
      DEFAULT_SAVE_PRESET_PROFILE.playerMalicePreset,
    playerMaliceIntensity:
      sanitizePlayerMaliceIntensityPreset(profile?.playerMaliceIntensity) ??
      DEFAULT_SAVE_PRESET_PROFILE.playerMaliceIntensity,
    locked: true,
  };
}

function resolveFallbackPresetProfile(
  settings?: AISettings,
): SavePresetProfile {
  return normalizeSavePresetProfile({
    narrativeStylePreset: settings?.extra?.narrativeStylePreset,
    worldDispositionPreset: settings?.extra?.worldDispositionPreset,
    playerMalicePreset: settings?.extra?.playerMalicePreset,
    playerMaliceIntensity: settings?.extra?.playerMaliceIntensity,
    locked: true,
  });
}

function normalizePresetFromTagValue(
  tagValue: string | undefined,
): NarrativeStylePreset | undefined {
  return sanitizeNarrativeStylePreset(tagValue?.toLowerCase());
}

function normalizeWorldDispositionFromTagValue(
  tagValue: string | undefined,
): WorldDispositionPreset | undefined {
  return sanitizeWorldDispositionPreset(tagValue?.toLowerCase());
}

function normalizePlayerMaliceFromTagValue(
  tagValue: string | undefined,
): PlayerMalicePreset | undefined {
  return sanitizePlayerMalicePreset(tagValue?.toLowerCase());
}

function normalizePlayerMaliceIntensityFromTagValue(
  tagValue: string | undefined,
): PlayerMaliceIntensityPreset | undefined {
  return sanitizePlayerMaliceIntensityPreset(tagValue?.toLowerCase());
}

export function resolveEffectivePresetProfile(input: {
  customContext?: string;
  presetProfile?: SavePresetProfile | null;
  settings?: AISettings;
}): EffectivePresetProfile {
  const fallbackProfile = resolveFallbackPresetProfile(input.settings);
  const saveProfile = normalizeSavePresetProfile(
    input.presetProfile ?? fallbackProfile,
  );

  const narrativeFromCustom = normalizePresetFromTagValue(
    extractXmlTagValue(input.customContext, "narrative_style"),
  );
  const worldDispositionFromCustom = normalizeWorldDispositionFromTagValue(
    extractXmlTagValue(input.customContext, "world_disposition"),
  );
  const playerMaliceFromCustom = normalizePlayerMaliceFromTagValue(
    extractXmlTagValue(input.customContext, "player_malice_profile"),
  );
  const intensityFromCustom = normalizePlayerMaliceIntensityFromTagValue(
    extractXmlTagValue(input.customContext, "player_malice_intensity"),
  );

  return {
    narrativeStylePreset: narrativeFromCustom
      ? { value: narrativeFromCustom, source: "custom_context" }
      : saveProfile.narrativeStylePreset !== "theme"
        ? { value: saveProfile.narrativeStylePreset, source: "save_profile" }
        : { value: "theme", source: "theme_default" },
    worldDispositionPreset: worldDispositionFromCustom
      ? { value: worldDispositionFromCustom, source: "custom_context" }
      : saveProfile.worldDispositionPreset !== "theme"
        ? { value: saveProfile.worldDispositionPreset, source: "save_profile" }
        : { value: "theme", source: "theme_default" },
    playerMalicePreset: playerMaliceFromCustom
      ? { value: playerMaliceFromCustom, source: "custom_context" }
      : saveProfile.playerMalicePreset !== "theme"
        ? { value: saveProfile.playerMalicePreset, source: "save_profile" }
        : { value: "theme", source: "theme_default" },
    playerMaliceIntensity: intensityFromCustom
      ? { value: intensityFromCustom, source: "custom_context" }
      : saveProfile.playerMaliceIntensity !== "standard" ||
          saveProfile.playerMalicePreset !== "theme"
        ? { value: saveProfile.playerMaliceIntensity, source: "save_profile" }
        : { value: "standard", source: "theme_default" },
  };
}

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

export const PRESET_SKILL_PATHS = {
  narrativeStyle: "skills/presets/runtime/narrative-style/SKILL.md",
  worldDisposition: "skills/presets/runtime/world-disposition/SKILL.md",
  playerMaliceProfile: "skills/presets/runtime/player-malice-profile/SKILL.md",
  playerMaliceIntensity:
    "skills/presets/runtime/player-malice-intensity/SKILL.md",
  cultureHub: CULTURE_PRESET_SKILL_PATHS.hub,
} as const;

export type PresetSkillTag =
  | "narrative_style"
  | "world_disposition"
  | "player_malice_profile"
  | "player_malice_intensity"
  | "culture_preference";

export type ActivePresetSkillRequirement = {
  path: string;
  tag: PresetSkillTag;
  profile: string;
  source: PresetProfileSource;
};

function toCurrentSkillPath(path: string): string {
  return `current/${path.replace(/^current\//, "")}`;
}

type ResolveActivePresetSkillsInput = {
  settings?: AISettings;
  presetProfile?: SavePresetProfile | null;
  customContext?: string;
  culturePreference?: CulturePreference;
  themeKey?: string;
  worldSetting?: string;
};

function pushPresetSkillRequirement(
  list: ActivePresetSkillRequirement[],
  requirement: ActivePresetSkillRequirement,
): void {
  if (list.some((item) => item.path === requirement.path)) {
    return;
  }
  list.push(requirement);
}

function resolveNarrativeStyleSkillRequirement(
  input: ResolveActivePresetSkillsInput,
): ActivePresetSkillRequirement | undefined {
  const resolved = resolveEffectivePresetProfile({
    customContext: input.customContext,
    presetProfile: input.presetProfile,
    settings: input.settings,
  }).narrativeStylePreset;
  const preset = resolved.value;
  if (!preset || preset === "theme") {
    return undefined;
  }

  return {
    path: PRESET_SKILL_PATHS.narrativeStyle,
    tag: "narrative_style",
    profile: preset,
    source: resolved.source,
  };
}

function resolveWorldDispositionSkillRequirement(
  input: ResolveActivePresetSkillsInput,
): ActivePresetSkillRequirement | undefined {
  const resolved = resolveEffectivePresetProfile({
    customContext: input.customContext,
    presetProfile: input.presetProfile,
    settings: input.settings,
  }).worldDispositionPreset;
  const preset = resolved.value;
  if (!preset || preset === "theme") {
    return undefined;
  }

  return {
    path: PRESET_SKILL_PATHS.worldDisposition,
    tag: "world_disposition",
    profile: preset,
    source: resolved.source,
  };
}

function resolvePlayerMaliceProfileSkillRequirement(
  input: ResolveActivePresetSkillsInput,
): ActivePresetSkillRequirement | undefined {
  const resolved = resolveEffectivePresetProfile({
    customContext: input.customContext,
    presetProfile: input.presetProfile,
    settings: input.settings,
  }).playerMalicePreset;
  const preset = resolved.value;
  if (!preset || preset === "theme") {
    return undefined;
  }

  return {
    path: PRESET_SKILL_PATHS.playerMaliceProfile,
    tag: "player_malice_profile",
    profile: preset,
    source: resolved.source,
  };
}

function resolvePlayerMaliceIntensitySkillRequirement(
  input: ResolveActivePresetSkillsInput,
): ActivePresetSkillRequirement | undefined {
  const effectiveProfile = resolveEffectivePresetProfile({
    customContext: input.customContext,
    presetProfile: input.presetProfile,
    settings: input.settings,
  });
  const resolvedIntensity = effectiveProfile.playerMaliceIntensity;
  const resolvedProfile = effectiveProfile.playerMalicePreset;

  if (
    resolvedProfile.value === "theme" &&
    resolvedIntensity.value === "standard"
  ) {
    return undefined;
  }

  return {
    path: PRESET_SKILL_PATHS.playerMaliceIntensity,
    tag: "player_malice_intensity",
    profile: resolvedIntensity.value,
    source: resolvedIntensity.source,
  };
}

function resolveCulturePreferenceSkillRequirements(
  input: ResolveActivePresetSkillsInput,
): ActivePresetSkillRequirement[] {
  const fromCustomContext = sanitizeCulturePreference(
    extractXmlTagValue(
      input.customContext,
      "culture_preference",
    )?.toLowerCase(),
  );
  const resolved = resolveCulturePreferenceContext({
    preference:
      fromCustomContext ??
      input.culturePreference ??
      input.settings?.extra?.culturePreference,
    themeKey: input.themeKey,
    worldSetting: input.worldSetting ?? "",
  });

  const source: PresetProfileSource = fromCustomContext
    ? "custom_context"
    : resolved.source === "story_setting" || resolved.source === "fallback_none"
      ? "story_setting"
      : "save_profile";

  const requirements: ActivePresetSkillRequirement[] = [
    {
      path: PRESET_SKILL_PATHS.cultureHub,
      tag: "culture_preference",
      profile: resolved.preference,
      source,
    },
  ];

  if (resolved.skillPath && resolved.effectiveCircle !== "none") {
    requirements.push({
      path: resolved.skillPath,
      tag: "culture_preference",
      profile: resolved.effectiveCircle,
      source,
    });
  }

  return requirements;
}

export function resolveActivePresetSkillRequirements(
  input: ResolveActivePresetSkillsInput,
): ActivePresetSkillRequirement[] {
  const requirements: ActivePresetSkillRequirement[] = [];

  const narrativeStyle = resolveNarrativeStyleSkillRequirement(input);
  if (narrativeStyle) {
    pushPresetSkillRequirement(requirements, narrativeStyle);
  }

  const worldDisposition = resolveWorldDispositionSkillRequirement(input);
  if (worldDisposition) {
    pushPresetSkillRequirement(requirements, worldDisposition);
  }

  const playerMaliceProfile = resolvePlayerMaliceProfileSkillRequirement(input);
  if (playerMaliceProfile) {
    pushPresetSkillRequirement(requirements, playerMaliceProfile);
  }

  const playerMaliceIntensity =
    resolvePlayerMaliceIntensitySkillRequirement(input);
  if (playerMaliceIntensity) {
    pushPresetSkillRequirement(requirements, playerMaliceIntensity);
  }

  for (const cultureReq of resolveCulturePreferenceSkillRequirements(input)) {
    pushPresetSkillRequirement(requirements, cultureReq);
  }

  return requirements.map((entry) => ({
    ...entry,
    path: toCurrentSkillPath(entry.path).replace(/^current\//, ""),
  }));
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
        return "电影化调度：以镜头语法组织场景（站位、视线、光线、动作路径），优先给可拍摄信息再给解释；关键节点使用可验证细节锚定（声源、痕迹、时空标记）；段落按镜头切点推进，结尾保留悬而未决的行动钩子，不做复盘式总结。";
      case "literary":
        return "文学叙事实验：句法节奏可变但语义必须可落地；优先触感/气味/材质等具身细节，隐喻用于增压而非遮蔽；所有暗示需可回溯到可观察证据；冲突处理强调余波与余味，避免一次性解释清零。";
      case "noir":
        return "黑色侦查叙事：整体气压低、道德灰区高；对白以试探与反试探为主，信息分配不对称；线索通过观察与误导并行投放（微痕迹、缺失项、矛盾口供）；角色决策由利益与风险驱动，关系网络持续污染。";
      case "brutal":
        return "冷硬现实主义：后果链条显性且可计量（身体损耗、资源消耗、社会评价下滑）；权力结构与代价机制同场呈现（债务、税负、告密、保护费、程序惩罚）；拒绝宿命论与叙事豁免，不为行动后果提供情绪化赦免。";
      case "cozy":
        return "生活流细腻叙事：节奏放缓但信息不空转，以微观生活锚点维持真实度（气味、手感、器物痕迹、零钱尺度）；关系变化通过动作与停顿显影，不靠直白宣告；冲突聚焦日常成本（钱、面子、关系、误会）并要求可收束。";
      case "cdrama":
        return "短剧高情绪节奏：高频情绪节点驱动（误会、抓包、告白、反转），短场景快切且每场承担单一目标；台词直给但需形成下一拍悬念；以高信息小道具推进因果（聊天记录、转账截图、病历、戒指）；结尾保持冲突势能，且不代写主角内心（主角=玩家）。";
      case "minimal":
        return "极简高密度叙事：短句高信号，删除装饰性修辞；仅保留关键动作、关键细节、关键后果；每段必须改变局面或决策边界；少形容词多动词，留白建立在事实缺口而非抽象玄学。";
      default:
        return undefined;
    }
  }

  switch (preset) {
    case "cinematic":
      return "Cinematic blocking: structure scenes with shot grammar (positions, sightlines, light, movement), surface filmable facts before interpretation, anchor tension in verifiable cues, cut paragraphs on visual beat changes, and end on unresolved action energy rather than recap.";
    case "literary":
      return "Literary craft: vary sentence rhythm without semantic blur, prioritize embodied texture (smell, material, friction), keep metaphor load controlled, ground implications in observable evidence, and preserve aftertaste instead of hard-closing every conflict.";
    case "noir":
      return "Noir investigation: maintain low-pressure atmosphere and high moral ambiguity, run dialogue as probe/counter-probe, distribute clues through observation plus misdirection, and keep motives tied to leverage, risk, and compromised institutions.";
    case "brutal":
      return "Hard realism: make consequence chains explicit and measurable (injury, cash burn, reputation loss), expose power-price mechanics on-screen (debt, taxes, snitches, protection), and avoid both fate language and narrative absolution.";
    case "cozy":
      return "Slice-of-life texture: run slower pacing with concrete domestic anchors, reveal relationship shifts through actions and pauses rather than declarations, and center conflicts on practical intimacy costs (money, face, trust, misunderstandings).";
    case "cdrama":
      return "Short-form emotional beats: drive with high-frequency turning points, keep scenes short with single-purpose objectives, write direct lines that launch the next beat, push causality via high-information props/evidence, and end with retained cliff pressure; never narrate protagonist inner monologue (player = protagonist).";
    case "minimal":
      return "Minimal high-signal: compress to short, information-dense lines; keep only decisive actions/details/consequences; enforce paragraph-level state change; prefer verbs over adjectives; build negative space from factual gaps, not vagueness.";
    default:
      return undefined;
  }
}

export function getWorldDispositionPresetText(
  preset: WorldDispositionPreset,
  language: string,
): string | undefined {
  if (preset === "theme") return undefined;

  const isZh = language?.toLowerCase().startsWith("zh");

  if (isZh) {
    switch (preset) {
      case "benevolent":
        return "高信任社会（偏善）：默认合作概率较高、互助摩擦成本较低；善意行为可无即时回报但仍具可持续性；冲突存在但系统不会预设“全员敌意”，背叛事件应被标注为偏差而非常态。";
      case "mixed":
        return "现实混合基线：合作与机会主义并存，行为动机分布呈中位；同一角色可在不同压力下切换策略；以行为证据与成本收益判定立场，不提前盖章“好人/坏人”。";
      case "cynical":
        return "低信任交易社会（偏冷）：合作默认附带条件，信息交换伴随验证与防骗成本；关系更依赖筹码、背书与可执行约束；仍允许真诚关系存在，但其维护成本更高、脆弱性更强。";
      default:
        return undefined;
    }
  }

  switch (preset) {
    case "benevolent":
      return "High-trust baseline: cooperation is statistically common, prosocial actions face lower friction, and help can occur without immediate repayment; conflict exists, but systemic hostility is not the default model.";
    case "mixed":
      return "Mixed realist baseline: sincerity and opportunism coexist, actors can switch strategy under pressure, and alignment should be inferred from observed behavior plus cost/benefit rather than moral labels.";
    case "cynical":
      return "Low-trust transactional baseline: cooperation usually carries conditions, exchange requires verification, and relationships are leverage-sensitive; sincere bonds can exist, but with higher maintenance and exposure cost.";
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

export type PlayerMaliceIntensity = PlayerMaliceIntensityPreset;

export function getPlayerMaliceIntensityText(
  intensity: PlayerMaliceIntensity,
  language: string,
): string {
  const isZh = language?.toLowerCase().startsWith("zh");
  if (isZh) {
    switch (intensity) {
      case "light":
        return "强度：轻（低风控曲线）。Trace/Heat 增长斜率较低，反制触发阈值更宽，允许更长试错窗口；但证据链与因果追踪仍持续生效。";
      case "heavy":
        return "强度：重（高风控曲线）。Trace/Heat 快速累积，反制阈值前移，世界更早进入组织化应对；误判与失误将引发复合惩罚。";
      default:
        return "强度：标准（基线风控曲线）。Trace/Heat 与反制升级按常规节奏运行，既保留操作空间，也维持可预期压力。";
    }
  }
  switch (intensity) {
    case "light":
      return "Intensity: Light (low-risk curve). Slower Trace/Heat slope and wider escalation thresholds create longer experimentation windows, while evidence continuity and causal accountability remain active.";
    case "heavy":
      return "Intensity: Heavy (high-risk curve). Faster Trace/Heat growth and earlier thresholds push the world into coordinated counterplay sooner; mistakes compound into multi-layer penalties.";
    default:
      return "Intensity: Standard (baseline risk curve). Trace/Heat and escalation progress at default cadence, balancing play flexibility with reliable systemic pressure.";
  }
}

export function getPlayerMalicePresetText(
  preset: PlayerMalicePreset,
  language: string,
): string | undefined {
  if (preset === "theme") return undefined;

  const isZh = language?.toLowerCase().startsWith("zh");

  if (isZh) {
    switch (preset) {
      case "intimidation":
        return [
          "暴力威慑链：将暴力视为高压谈判与控制工具。",
          "- 机制焦点：短期服从收益（沉默、让路、资源交出）与长期外溢成本（目击、取证、复仇联结）并行累计。",
          "- 反制模型：群体结盟、守卫增援、诱捕、悬赏、跨场景报复；反应来源于组织学习而非道德天罚。",
          "- 可玩性要求：提供可执行窗口（时机、掩体、伪装、证人处理）并同步标注即时/延迟代价。",
        ].join("\n");
      case "bureaucratic":
        return [
          "制度渗透链：利用流程、文书、权限与关系网络实施伤害。",
          "- 机制焦点：合法外观与真实损害并存，关键在于节点控制（审批、盖章、台账、收据、口供、监控留痕）。",
          "- 反制模型：稽查、审计、交叉对账、冻结、黑名单、选择性执法；对手同样可调用制度武器。",
          "- 可玩性要求：允许灰度操作，但必须承载可追溯证据链、时间成本与文书残留。",
        ].join("\n");
      case "manipulation":
        return [
          "关系操控链：通过承诺、亲密、羞辱、孤立与信息不对称塑造他人决策。",
          "- 机制焦点：行为-话术不一致、边界推进、依赖塑造与关系三角；不代写主角心理，只呈现他人受影响路径。",
          "- 反制模型：同伴预警、旁观介入、NPC 底线反弹、反向操控、公开揭穿与声誉坍塌。",
          "- 可玩性要求：关键转折需绑定可核验细节（聊天记录、目击、礼物流向、口径冲突）。",
        ].join("\n");
      case "sabotage":
        return [
          "破坏失稳链：目标是削弱系统可用性与秩序稳定，而非直接获利。",
          "- 机制焦点：连锁失效（供应断裂、信任衰减、治理失灵）与附带伤害成本同步上升。",
          "- 反制模型：封锁、宵禁、搜捕、连坐式风控、社区自保；世界策略会持续收紧。",
          "- 可玩性要求：每次破坏必须生成可追踪 Trace/Heat，并把压力持续回灌到后续场景。",
        ].join("\n");
      default:
        return undefined;
    }
  }

  switch (preset) {
    case "intimidation":
      return [
        "Violent coercion chain: use violence as a high-pressure negotiation instrument.",
        "- Mechanic focus: immediate compliance gains and delayed spillover costs (witnesses, forensics, vendetta links) accumulate together.",
        "- Counterplay model: coalition, reinforcement, bait operations, warrants/bounties, cross-scene retaliation driven by institutional learning.",
        "- Playability requirement: expose executable windows (timing, cover, disguise, witness handling) with explicit short/long-horizon costs.",
      ].join("\n");
    case "bureaucratic":
      return [
        "Institutional exploit chain: weaponize process, paperwork, authority, and networks to inflict harm.",
        "- Mechanic focus: legality-as-mask plus node control (approvals, ledgers, receipts, testimony, surveillance residue).",
        "- Counterplay model: inspections, cross-audits, freezes, blacklists, selective enforcement; adversaries can also invoke rules.",
        "- Playability requirement: permit gray operations, but enforce traceable paper trails, lead times, and auditable residue.",
      ].join("\n");
    case "manipulation":
      return [
        "Relational control chain: steer others through promises, intimacy, shame, isolation, and asymmetrical information.",
        "- Mechanic focus: speech-action mismatch, boundary drift, dependency shaping, and triangle pressure; never narrate protagonist inner monologue.",
        "- Counterplay model: peer warning, third-party intervention, boundary backlash, reverse manipulation, exposure cascades.",
        "- Playability requirement: bind major turns to checkable evidence (messages, witnesses, gifts, contradictory statements).",
      ].join("\n");
    case "sabotage":
      return [
        "Destabilization chain: primary objective is system dysfunction, not direct profit.",
        "- Mechanic focus: cascading failures (supply, trust, governance) and collateral cost escalation.",
        "- Counterplay model: lockdowns, curfews, sweeps, collective risk controls, mutual-aid hardening; the world progressively tightens.",
        "- Playability requirement: each act emits persistent Trace/Heat and feeds pressure back into subsequent scenes.",
      ].join("\n");
    default:
      return undefined;
  }
}

export function resolvePlayerMaliceIntensity(input: {
  intensity?: PlayerMaliceIntensity;
  language: string;
  customContext?: string;
}): PlayerMaliceIntensity {
  const fromCustomContext = extractXmlTagValue(
    input.customContext,
    "player_malice_intensity",
  )?.toLowerCase();

  if (fromCustomContext === "light") return "light";
  if (fromCustomContext === "heavy") return "heavy";
  if (fromCustomContext === "standard") return "standard";

  return input.intensity ?? "standard";
}

export function resolvePlayerMaliceProfile(input: {
  preset?: PlayerMalicePreset;
  intensity?: PlayerMaliceIntensity;
  language: string;
  customContext?: string;
}): string | undefined {
  const fromCustomContext = extractXmlTagValue(
    input.customContext,
    "player_malice_profile",
  );
  const resolvedIntensity = resolvePlayerMaliceIntensity({
    intensity: input.intensity,
    language: input.language,
    customContext: input.customContext,
  });
  const intensityLine = getPlayerMaliceIntensityText(
    resolvedIntensity,
    input.language,
  );

  if (fromCustomContext) {
    const base = fromCustomContext.trim();
    return base ? `${base}\n${intensityLine}` : intensityLine;
  }

  if (!input.preset) return undefined;
  const presetText = getPlayerMalicePresetText(input.preset, input.language);
  if (!presetText) return undefined;
  return `${presetText}\n${intensityLine}`;
}

export type ModelPromptEntry = {
  keywords: string[];
  prompt: string;
};

export function pickModelMatchedPrompt(
  entries: ModelPromptEntry[] | undefined,
  modelId: string,
): string | undefined {
  if (!entries || entries.length === 0) return undefined;
  const loweredModelId = (modelId || "").toLowerCase();
  if (!loweredModelId) return undefined;

  // Multiple entries may match the same modelId.
  // Deterministic policy: scan top-to-bottom and return the first matched NON-EMPTY prompt.
  // This keeps prompt.toml usable as an optional per-model override layer where
  // empty prompts mean "no extra injection" by default.
  for (const entry of entries) {
    const keywords = Array.isArray(entry?.keywords) ? entry.keywords : [];
    const prompt = typeof entry?.prompt === "string" ? entry.prompt : "";
    if (!prompt.trim() || keywords.length === 0) continue;
    if (
      keywords.some((k) => {
        const kw = (k || "").toLowerCase().trim();
        return kw ? loweredModelId.includes(kw) : false;
      })
    ) {
      return prompt.trim();
    }
  }

  return undefined;
}

export function resolveNarrativeStyle(input: {
  themeStyle?: string;
  preset?: NarrativeStylePreset;
  language: string;
  customContext?: string;
}): string | undefined {
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
    return isZh
      ? `${base}\n\n补充风格：${presetText}`
      : `${base}\n\nStyle add-on: ${presetText}`;
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
  tFunc: (key: string, options?: JsonObject) => string,
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
  tFunc: (key: string, options?: JsonObject) => string,
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
