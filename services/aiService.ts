/**
 * ============================================================================
 * AI Service - 统一的 AI 服务层
 * ============================================================================
 *
 * 核心职责:
 * - 配置管理和 Provider 切换
 * - 统一的内容生成接口
 * - Agentic Loop 实现（工具调用循环）
 * - 图片/视频/语音生成
 * - 嵌入向量生成
 */

import type {
  AISettings,
  LogEntry,
  StoryOutline,
  ModelInfo,
  TokenUsage,
  ImageGenerationContext,
  StorySegment,
  CharacterStatus,
  Relationship,
  StorySummary,
  TimelineEvent,
  GameResponse,
  GameState,
  EmbeddingConfig,
  ToolCallRecord,
  ForkTree,
  OutlineConversationState,
  PartialStoryOutline,
} from "../types";

import { GameDatabase } from "./gameDatabase";
// Note: Embedding/RAG functionality has moved to the new RAG service (services/rag)
// The old embedding manager is no longer used - see hooks/useRAG.ts for the new API
// @ts-ignore
import promptInjectionData from "../src/prompt/prompt.toml";

// Provider imports - 使用新的统一类型系统
import {
  GeminiConfig,
  OpenAIConfig,
  OpenRouterConfig,
  GenerateContentOptions,
  ToolCallResult,
  EmbeddingModelInfo,
  AIProviderError,
  JSONParseError,
  MalformedToolCallError,
} from "./providers/types";

import {
  generateContent as generateGeminiContent,
  generateImage as generateGeminiImage,
  generateVideo as generateGeminiVideo,
  generateSpeech as generateGeminiSpeech,
  getModels as getGeminiModels,
  validateConnection as validateGeminiConnection,
  getEmbeddingModels as getGeminiEmbeddingModels,
  generateEmbedding as generateGeminiEmbedding,
} from "./providers/geminiProvider";

import {
  generateContent as generateOpenAIContent,
  generateImage as generateOpenAIImage,
  generateSpeech as generateOpenAISpeech,
  getModels as getOpenAIModels,
  validateConnection as validateOpenAIConnection,
  getEmbeddingModels as getOpenAIEmbeddingModels,
  generateEmbedding as generateOpenAIEmbedding,
} from "./providers/openaiProvider";

import {
  generateContent as generateOpenRouterContent,
  generateImage as generateOpenRouterImage,
  generateSpeech as generateOpenRouterSpeech,
  getModels as getOpenRouterModels,
  validateConnection as validateOpenRouterConnection,
  getEmbeddingModels as getOpenRouterEmbeddingModels,
  generateEmbedding as generateOpenRouterEmbedding,
} from "./providers/openRouterProvider";

import { DEFAULTS, DEFAULT_OPENAI_BASE_URL, THEMES } from "../utils/constants";
import {
  gameResponseSchema,
  translationSchema,
  storyOutlineSchema,
  storySummarySchema,
  outlinePhase1Schema,
  outlinePhase2Schema,
  outlinePhase3Schema,
  outlinePhase4Schema,
  outlinePhase5Schema,
  finishTurnSchema,
  type OutlinePhase1,
  type OutlinePhase2,
  type OutlinePhase3,
  type OutlinePhase4,
  type OutlinePhase5,
  type FinishTurnResponse,
} from "./schemas";

import { getEnvApiKey } from "../utils/env";
import {
  getCoreSystemInstruction,
  getStaticWorldContext,
  getDynamicStoryContext,
  getSceneImagePrompt,
  getTranslationPrompt,
  getOutlinePrompt,
  getSummaryPrompt,
  getCurrentStateContext,
  getVeoScriptPrompt,
  getGodModePrompt,
  // Phased outline generation
  getOutlineSystemInstruction,
  getOutlinePhase1Prompt,
  getOutlinePhase2Prompt,
  getOutlinePhase3Prompt,
  getOutlinePhase4Prompt,
  getOutlinePhase5Prompt,
  getPhaseAcknowledgment,
  OUTLINE_PHASES,
} from "./prompts";
import { TOOLS } from "./tools";
import {
  UnifiedMessage,
  createUserMessage,
  createToolCallMessage,
  createToolResponseMessage,
  toGeminiFormat,
  toOpenAIFormat,
  fromGeminiFormat,
  ToolCallResult as UnifiedToolCallResult,
} from "./messageTypes";

// ============================================================================
// Configuration
// ============================================================================

let geminiConfig: GeminiConfig = { apiKey: getEnvApiKey(), baseUrl: undefined };
let openaiConfig: OpenAIConfig = { apiKey: "", baseUrl: "", modelId: "" };
let openRouterConfig: OpenRouterConfig = { apiKey: "" };
let currentSettings: AISettings = JSON.parse(JSON.stringify(DEFAULTS));

/**
 * 更新 AI 配置
 */
export const updateAIConfig = (settings: AISettings): void => {
  currentSettings = settings;

  const geminiBase = settings.gemini.baseUrl
    ? settings.gemini.baseUrl.replace(/\/+$/, "")
    : undefined;
  geminiConfig = {
    apiKey: settings.gemini.apiKey || getEnvApiKey(),
    baseUrl: geminiBase,
  };

  const openaiBase = settings.openai.baseUrl
    ? settings.openai.baseUrl.replace(/\/+$/, "")
    : DEFAULT_OPENAI_BASE_URL;
  openaiConfig = {
    apiKey: settings.openai.apiKey || "",
    baseUrl: openaiBase,
    modelId: "",
  };

  openRouterConfig = {
    apiKey: settings.openrouter?.apiKey || "",
  };

  // Note: RAG config is now handled by the RAG service (hooks/useRAG.ts)
  // The old embedding manager has been replaced
};

// ============================================================================
// Provider Configuration
// ============================================================================

type ProviderType = "gemini" | "openai" | "openrouter";
type FunctionType =
  | "story"
  | "image"
  | "video"
  | "audio"
  | "translation"
  | "lore"
  | "script";

interface ProviderConfigResult {
  provider: ProviderType;
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

const getProviderConfig = (func: FunctionType): ProviderConfigResult => {
  const config = currentSettings[func];
  return {
    provider: config.provider as ProviderType,
    modelId: config.modelId,
    enabled: config.enabled !== false,
    resolution: config.resolution,
    thinkingLevel: config.thinkingLevel,
    mediaResolution: config.mediaResolution,
    temperature: config.temperature,
    topP: config.topP,
    topK: config.topK,
    minP: config.minP,
  };
};

// ============================================================================
// Logging Helpers
// ============================================================================

const createLogEntry = (
  provider: string,
  model: string,
  endpoint: string,
  req: Record<string, unknown>,
  res: unknown,
  usage?: TokenUsage,
  toolCalls?: ToolCallRecord[],
  generationDetails?: LogEntry["generationDetails"],
  parsedResult?: unknown,
): LogEntry => {
  const entry: LogEntry = {
    id: Date.now().toString() + Math.random().toString(36).substring(7),
    timestamp: Date.now(),
    provider,
    model,
    endpoint,
    request: req,
    response: res as Record<string, unknown>,
    parsedResult: parsedResult as Record<string, unknown>,
    usage: usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    toolCalls,
    generationDetails,
  };
  console.log(`[Log] ${provider}/${model} - ${endpoint}`, {
    usage: entry.usage,
    hasRequest: !!req,
    hasResponse: !!res,
    hasParsedResult: !!parsedResult,
    toolCallCount: toolCalls?.length || 0,
    requestData: req,
    responseData: res,
  });
  return entry;
};

// ============================================================================
// Model Cache
// ============================================================================

interface ModelCacheEntry {
  timestamp: number;
  data: ModelInfo[];
  configHash: string;
}

const modelCache: Record<string, ModelCacheEntry> = {};

// ============================================================================
// API Functions
// ============================================================================

/**
 * 获取可用模型列表
 */
export const getModels = async (
  provider: ProviderType,
  forceRefresh: boolean = false,
): Promise<ModelInfo[]> => {
  let config: GeminiConfig | OpenAIConfig | OpenRouterConfig;

  if (provider === "gemini") {
    config = geminiConfig;
  } else if (provider === "openrouter") {
    config = openRouterConfig;
  } else {
    config = { ...openaiConfig, apiKey: currentSettings.openai.apiKey || "" };
  }

  // Skip API request if API key is missing or empty
  if (!config.apiKey || config.apiKey.trim() === "") {
    console.warn(
      `Skipping model fetch for ${provider}: API key not configured`,
    );
    return [];
  }

  const configHash = JSON.stringify(config);
  const cacheKey = provider;

  // Check cache
  if (
    !forceRefresh &&
    modelCache[cacheKey] &&
    modelCache[cacheKey].configHash === configHash
  ) {
    return modelCache[cacheKey].data;
  }

  let models: ModelInfo[] = [];
  if (provider === "gemini") {
    models = await getGeminiModels(geminiConfig);
  } else if (provider === "openrouter") {
    models = await getOpenRouterModels(openRouterConfig);
  } else {
    models = await getOpenAIModels(config as OpenAIConfig);
  }

  // Update cache
  modelCache[cacheKey] = {
    timestamp: Date.now(),
    data: models,
    configHash,
  };

  return models;
};

/**
 * 验证 Provider 连接
 */
export const validateConnection = async (
  provider: ProviderType,
): Promise<{ isValid: boolean; error?: string }> => {
  try {
    if (provider === "gemini") {
      await validateGeminiConnection(geminiConfig);
    } else if (provider === "openrouter") {
      await validateOpenRouterConnection(openRouterConfig);
    } else {
      await validateOpenAIConnection({
        ...openaiConfig,
        apiKey: currentSettings.openai.apiKey || "",
      });
    }
    return { isValid: true };
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    console.error(`Validation failed for ${provider}`, error);
    return { isValid: false, error: error.message };
  }
};

/**
 * 过滤模型列表
 */
export const filterModels = (
  models: ModelInfo[],
  type: FunctionType,
): ModelInfo[] => {
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
// Unified Content Generation
// ============================================================================

/** 内容生成结果类型 */
type ContentGenerationResultType =
  | { functionCalls?: ToolCallResult[] }
  | Record<string, unknown>
  | string;

interface GenerateContentResult {
  result: ContentGenerationResultType;
  usage: TokenUsage;
  raw: unknown;
  log?: LogEntry;
}

interface GenerateContentUnifiedOptions {
  thinkingLevel?: "low" | "medium" | "high";
  mediaResolution?: "low" | "medium" | "high";
  temperature?: number;
  topP?: number;
  topK?: number;
  minP?: number;
  onChunk?: (text: string) => void;
  tools?: Array<{ name: string; description: string; parameters: unknown }>;
  generationDetails?: LogEntry["generationDetails"];
}

/**
 * 统一内容生成助手
 */
export const generateContentUnified = async (
  provider: ProviderType,
  modelId: string,
  systemInstruction: string,
  contents: unknown[],
  schema?: unknown,
  options?: GenerateContentUnifiedOptions,
): Promise<GenerateContentResult> => {
  let result: GenerateContentResult["result"];
  let usage: TokenUsage;
  let raw: unknown;

  // Get options from current settings (defaults)
  const storyConfig = getProviderConfig("story");
  const mergedOptions: GenerateContentOptions = {
    thinkingLevel: options?.thinkingLevel || storyConfig.thinkingLevel,
    mediaResolution: options?.mediaResolution || storyConfig.mediaResolution,
    temperature: options?.temperature ?? storyConfig.temperature,
    topP: options?.topP ?? storyConfig.topP,
    topK: options?.topK ?? storyConfig.topK,
    minP: options?.minP ?? storyConfig.minP,
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
    if (provider === "gemini") {
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
        geminiConfig,
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
      // OpenAI/OpenRouter expect UnifiedMessage[] - convert from Gemini format if needed
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

      if (provider === "openai") {
        const response = await generateOpenAIContent(
          { ...openaiConfig, modelId },
          modelId,
          systemInstruction,
          unifiedContents,
          schema as Parameters<typeof generateOpenAIContent>[4],
          mergedOptions,
        );
        result = response.result;
        usage = response.usage;
        raw = response.raw;
      } else {
        const response = await generateOpenRouterContent(
          openRouterConfig,
          modelId,
          systemInstruction,
          unifiedContents,
          schema as Parameters<typeof generateOpenRouterContent>[4],
          mergedOptions,
        );
        result = response.result;
        usage = response.usage;
        raw = response.raw;
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
    provider,
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

// ============================================================================
// Phased Story Outline Generation
// ============================================================================

/** Progress callback for phased generation */
export interface OutlinePhaseProgress {
  phase: number;
  totalPhases: number;
  phaseName: string;
  status: "starting" | "generating" | "completed" | "error";
  partialOutline?: PartialStoryOutline;
  error?: string;
}

/** Conversation message format for outline generation */
export type OutlineConversationMessage = {
  role: "user" | "model";
  parts: { text: string }[];
};

/** Options for phased outline generation */
export interface PhasedOutlineOptions {
  onPhaseProgress?: (progress: OutlinePhaseProgress) => void;
  onChunk?: (text: string) => void;
  /** Resume from saved conversation state */
  resumeFromConversation?: OutlineConversationState;
  /** Callback to save conversation state after each phase for fault recovery */
  onSaveConversation?: (state: OutlineConversationState) => void;
}

/**
 * Generate story outline in phases (multi-turn conversation)
 * This avoids "schema produces a constraint that has too many states" errors
 * by splitting the large schema into smaller per-phase schemas.
 *
 * Supports fault recovery by saving conversation state after each phase.
 * All JSON output is compact (no pretty printing) for efficiency.
 */
export const generateStoryOutlinePhased = async (
  theme: string,
  language: string,
  customContext?: string,
  tFunc?: (key: string, options?: Record<string, unknown>) => string,
  options?: PhasedOutlineOptions,
): Promise<{ outline: StoryOutline; logs: LogEntry[] }> => {
  // Use "lore" model config for outline generation (typically more capable model)
  const { provider, modelId } = getProviderConfig("lore");
  const logs: LogEntry[] = [];

  // Initialize from resume state or fresh
  let partial: PartialStoryOutline = {};
  let conversationHistory: OutlineConversationMessage[] = [];
  let systemInstruction: string;

  // Get theme data for Phase 1
  let themeDataWorldSetting: string | undefined;
  let themeDataBackgroundTemplate: string | undefined;
  let themeDataExample: string | undefined;
  let themeDataNarrativeStyle: string | undefined;
  let isRestricted = false;

  if (tFunc) {
    themeDataWorldSetting = tFunc(`${theme}.worldSetting`, { ns: "themes" });
    themeDataBackgroundTemplate =
      tFunc(`${theme}.backgroundTemplate`, { ns: "themes" }) ||
      tFunc(`fantasy.backgroundTemplate`, { ns: "themes" });
    themeDataExample = tFunc(`${theme}.example`, { ns: "themes" });
    themeDataNarrativeStyle = tFunc(`${theme}.narrativeStyle`, {
      ns: "themes",
    });
  } else {
    const themeData = THEMES[theme] || THEMES["fantasy"];
    themeDataBackgroundTemplate = themeData.backgroundTemplate;
    themeDataExample = themeData.example;
  }

  const themeConfig = THEMES[theme] || THEMES["fantasy"];
  isRestricted = themeConfig?.restricted || false;

  // Resume from saved conversation state if available
  if (options?.resumeFromConversation) {
    const resumeState = options.resumeFromConversation;
    partial = resumeState.partial;
    conversationHistory = [...resumeState.messages];
    systemInstruction = resumeState.systemInstruction;
    console.log(
      `[OutlinePhased] Resuming from phase ${resumeState.currentPhase}`,
    );
  } else {
    // Build fresh system instruction
    systemInstruction = getOutlineSystemInstruction(language, isRestricted);

    // Inject prompt injections from config
    const promptInjectionEnabled =
      currentSettings.extra?.promptInjectionEnabled;
    if (promptInjectionEnabled && promptInjectionData) {
      const loweredModelId = modelId.toLowerCase();
      console.log(
        `[PromptInjection] Checking for prompts to inject for model ${modelId}`,
      );
      const matchedPrompt = promptInjectionData.prompts.find((p) =>
        p.keywords.some((k) => loweredModelId.includes(k.toLowerCase())),
      );
      if (matchedPrompt) {
        systemInstruction = `${matchedPrompt.prompt}\n\n${systemInstruction}`;
        console.warn(
          `[PromptInjection] Injecting outline prompt for model ${modelId} (matched keywords: ${matchedPrompt.keywords.join(", ")})`,
        );
      }
    }
  }

  // Helper to save conversation state
  const saveConversationState = (currentPhase: number) => {
    if (options?.onSaveConversation) {
      options.onSaveConversation({
        theme,
        language,
        customContext,
        systemInstruction,
        messages: conversationHistory,
        partial,
        currentPhase,
      });
    }
  };

  // Helper to report progress
  const reportProgress = (
    phase: number,
    status: OutlinePhaseProgress["status"],
    error?: string,
  ) => {
    if (options?.onPhaseProgress) {
      const phaseInfo = OUTLINE_PHASES[phase - 1];
      options.onPhaseProgress({
        phase,
        totalPhases: 5,
        phaseName: phaseInfo?.nameKey || `Phase ${phase}`,
        status,
        partialOutline: partial,
        error,
      });
    }
  };

  // Determine starting phase based on resume data (from saved conversation)
  let startPhase = 1;
  if (options?.resumeFromConversation) {
    startPhase = options.resumeFromConversation.currentPhase;
  } else if (partial.phase5) {
    startPhase = 6; // All done
  } else if (partial.phase4) {
    startPhase = 5;
  } else if (partial.phase3) {
    startPhase = 4;
  } else if (partial.phase2) {
    startPhase = 3;
  } else if (partial.phase1) {
    startPhase = 2;
  }

  // Phase 1: World Foundation
  if (startPhase <= 1) {
    reportProgress(1, "starting");

    const phase1Prompt = getOutlinePhase1Prompt(
      theme,
      language,
      customContext,
      themeDataWorldSetting,
      themeDataBackgroundTemplate,
      themeDataExample,
      isRestricted,
      themeDataNarrativeStyle,
    );
    conversationHistory.push({ role: "user", parts: [{ text: phase1Prompt }] });

    try {
      reportProgress(1, "generating");
      // NOTE: No onChunk to force non-streaming mode for reliable JSON schema enforcement
      const { result, log } = await generateContentUnified(
        provider,
        modelId,
        systemInstruction,
        conversationHistory,
        outlinePhase1Schema,
      );
      partial.phase1 = result as OutlinePhase1;
      // Use compact JSON (no spaces) for conversation history
      conversationHistory.push({
        role: "model",
        parts: [{ text: JSON.stringify(result) }],
      });
      if (log) logs.push(log);
      reportProgress(1, "completed");
      // Save conversation state for fault recovery (next phase = 2)
      saveConversationState(2);
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      reportProgress(1, "error", error);
      throw e;
    }
  }

  // Phase 2: Protagonist Character
  if (startPhase <= 2) {
    reportProgress(2, "starting");

    const phase2Prompt = getOutlinePhase2Prompt();
    conversationHistory.push({ role: "user", parts: [{ text: phase2Prompt }] });

    try {
      reportProgress(2, "generating");
      // NOTE: No onChunk to force non-streaming mode for reliable JSON schema enforcement
      const { result, log } = await generateContentUnified(
        provider,
        modelId,
        systemInstruction,
        conversationHistory,
        outlinePhase2Schema,
      );
      partial.phase2 = result as OutlinePhase2;
      conversationHistory.push({
        role: "model",
        parts: [{ text: JSON.stringify(result) }],
      });
      if (log) logs.push(log);
      reportProgress(2, "completed");
      // Save conversation state for fault recovery (next phase = 3)
      saveConversationState(3);
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      reportProgress(2, "error", error);
      throw e;
    }
  }

  // Phase 3: World Entities
  if (startPhase <= 3) {
    reportProgress(3, "starting");

    const phase3Prompt = getOutlinePhase3Prompt();
    conversationHistory.push({ role: "user", parts: [{ text: phase3Prompt }] });

    try {
      reportProgress(3, "generating");
      // NOTE: No onChunk to force non-streaming mode for reliable JSON schema enforcement
      const { result, log } = await generateContentUnified(
        provider,
        modelId,
        systemInstruction,
        conversationHistory,
        outlinePhase3Schema,
      );
      partial.phase3 = result as OutlinePhase3;
      conversationHistory.push({
        role: "model",
        parts: [{ text: JSON.stringify(result) }],
      });
      if (log) logs.push(log);
      reportProgress(3, "completed");
      // Save conversation state for fault recovery (next phase = 4)
      saveConversationState(4);
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      reportProgress(3, "error", error);
      throw e;
    }
  }

  // Phase 4: Relationships & Inventory
  if (startPhase <= 4) {
    reportProgress(4, "starting");

    const phase4Prompt = getOutlinePhase4Prompt();
    conversationHistory.push({ role: "user", parts: [{ text: phase4Prompt }] });

    try {
      reportProgress(4, "generating");
      // NOTE: No onChunk to force non-streaming mode for reliable JSON schema enforcement
      const { result, log } = await generateContentUnified(
        provider,
        modelId,
        systemInstruction,
        conversationHistory,
        outlinePhase4Schema,
      );
      partial.phase4 = result as OutlinePhase4;
      conversationHistory.push({
        role: "model",
        parts: [{ text: JSON.stringify(result) }],
      });
      if (log) logs.push(log);
      reportProgress(4, "completed");
      // Save conversation state for fault recovery (next phase = 5)
      saveConversationState(5);
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      reportProgress(4, "error", error);
      throw e;
    }
  }

  // Phase 5: Quests, Knowledge & Atmosphere
  if (startPhase <= 5) {
    reportProgress(5, "starting");

    const phase5Prompt = getOutlinePhase5Prompt();
    conversationHistory.push({ role: "user", parts: [{ text: phase5Prompt }] });

    try {
      reportProgress(5, "generating");
      // NOTE: No onChunk to force non-streaming mode for reliable JSON schema enforcement
      const { result, log } = await generateContentUnified(
        provider,
        modelId,
        systemInstruction,
        conversationHistory,
        outlinePhase5Schema,
      );
      partial.phase5 = result as OutlinePhase5;
      if (log) logs.push(log);
      reportProgress(5, "completed");
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      reportProgress(5, "error", error);
      throw e;
    }
  }

  // Merge all phases into complete StoryOutline
  const outline = mergeOutlinePhases(partial);

  return { outline, logs };
};

/**
 * Merge partial outline phases into a complete StoryOutline
 * Uses type assertions because PartialStoryOutline uses generic object type for persistence
 */
function mergeOutlinePhases(partial: PartialStoryOutline): StoryOutline {
  if (
    !partial.phase1 ||
    !partial.phase2 ||
    !partial.phase3 ||
    !partial.phase4 ||
    !partial.phase5
  ) {
    throw new Error("Cannot merge incomplete outline phases");
  }

  // Cast phases to their expected types
  const p1 = partial.phase1 as OutlinePhase1;
  const p2 = partial.phase2 as OutlinePhase2;
  const p3 = partial.phase3 as OutlinePhase3;
  const p4 = partial.phase4 as OutlinePhase4;
  const p5 = partial.phase5 as OutlinePhase5;

  return {
    // Phase 1: World Foundation
    title: p1.title,
    initialTime: p1.initialTime,
    premise: p1.premise,
    worldSetting: p1.worldSetting as StoryOutline["worldSetting"],
    mainGoal: p1.mainGoal as StoryOutline["mainGoal"],

    // Phase 2: Character
    character: p2.character as StoryOutline["character"],

    // Phase 3: World Entities
    locations: p3.locations as StoryOutline["locations"],
    factions: p3.factions as StoryOutline["factions"],

    // Phase 4: Relationships & Inventory
    relationships: p4.relationships as StoryOutline["relationships"],
    inventory: p4.inventory as StoryOutline["inventory"],

    // Phase 5: Quests, Knowledge & Atmosphere
    quests: p5.quests as StoryOutline["quests"],
    knowledge: p5.knowledge as StoryOutline["knowledge"],
    timeline: p5.timeline as StoryOutline["timeline"],
    initialAtmosphere:
      p5.initialAtmosphere as StoryOutline["initialAtmosphere"],
  };
}

/**
 * 总结上下文
 */
export const summarizeContext = async (
  previousSummary: StorySummary,
  newTurns: string,
  language: string,
): Promise<{ summary: StorySummary | null; log: LogEntry }> => {
  const { provider, modelId } = getProviderConfig("story");
  const prompt = getSummaryPrompt(previousSummary, newTurns, language);
  const sys =
    "You are a diligent chronicler summarizing events. Focus on facts and cause-and-effect, tracking changes in quests, relationships, inventory, character status, and locations. Output strictly valid JSON.";
  const contents = [{ role: "user", parts: [{ text: prompt }] }];

  try {
    const { result, log } = await generateContentUnified(
      provider,
      modelId,
      sys,
      contents,
      storySummarySchema,
    );
    return { summary: result as StorySummary, log: log! };
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    console.error("Summary failed", error);
    return {
      summary: null,
      log: createLogEntry(
        provider,
        modelId,
        "summary",
        { error: error.message },
        null,
      ),
    };
  }
};

// ============================================================================
// Theme Configuration
// ============================================================================

interface ThemeConfig {
  narrativeStyle: string;
  example: string | undefined;
  isRestricted: boolean;
}

const resolveThemeConfig = (
  themeKey: string | undefined,
  language: string,
  tFunc?: (key: string, options?: Record<string, unknown>) => string,
): ThemeConfig => {
  let narrativeStyle = "Standard adventure tone.";
  let example: string | undefined;

  if (tFunc && themeKey) {
    narrativeStyle =
      tFunc(`${themeKey}.narrativeStyle`, { ns: "themes" }) || narrativeStyle;
    example = tFunc(`${themeKey}.example`, { ns: "themes" });
  } else {
    throw new Error("Unable to resolve theme configuration.");
  }

  const themeConfig = THEMES[themeKey || "fantasy"];
  const isRestricted = themeConfig?.restricted || false;

  return { narrativeStyle, example, isRestricted };
};

/**
 * Build system instruction - contains STATIC content that rarely changes.
 * This is placed in the system role for optimal KV Cache utilization.
 */
const buildSystemContext = (
  language: string,
  narrativeStyle: string,
  example: string | undefined,
  isRestricted: boolean,
  outline: StoryOutline | null,
  godMode?: boolean,
  detailedDescription?: boolean,
): string => {
  const coreSystemInstruction = getCoreSystemInstruction(
    language,
    narrativeStyle,
    isRestricted,
    detailedDescription,
  );
  const staticWorldContext = getStaticWorldContext(outline);

  // Add God Mode prompt if active
  const godModeSection = godMode ? getGodModePrompt() : "";

  return `${coreSystemInstruction}\n\n${staticWorldContext}${godModeSection}`;
};

/**
 * Build turn contents with optimized message structure for KV Cache.
 */
const buildTurnContents = (
  summaries: StorySummary[],
  currentStateContext: string,
  recentHistory: StorySegment[],
  timeline: TimelineEvent[],
  userAction: string,
  ragContext?: string,
): { messages: UnifiedMessage[]; dynamicContext: string } => {
  const messages: UnifiedMessage[] = [];

  // === Message 1: Story Memory (STATIC - changes only after summarization) ===
  const dynamicContext = getDynamicStoryContext(
    summaries,
    recentHistory,
    timeline,
  );

  if (dynamicContext) {
    messages.push(
      createUserMessage(
        `[CONTEXT: Story Memory]\n<story_memory>\n${dynamicContext}\n</story_memory>`,
      ),
    );
    messages.push({
      role: "assistant",
      content: [{ type: "text", text: "[Memory acknowledged.]" }],
    });
  }

  // === Message 2: RAG Context (DYNAMIC - semantic search results) ===
  if (ragContext && ragContext.trim()) {
    messages.push(
      createUserMessage(
        `[CONTEXT: Relevant Background]\n<semantic_context>\n${ragContext}\n</semantic_context>`,
      ),
    );
    messages.push({
      role: "assistant",
      content: [{ type: "text", text: "[Background context acknowledged.]" }],
    });
  }

  // === Message 3: Recent History (DYNAMIC - before current state) ===
  if (recentHistory.length > 0) {
    const historyText = recentHistory
      .map((seg) => `[${seg.role.toUpperCase()}]: ${seg.text}`)
      .join("\n\n");

    messages.push(
      createUserMessage(
        `[CONTEXT: Recent Conversation]\n<recent_history>\n${historyText}\n</recent_history>`,
      ),
    );
    messages.push({
      role: "assistant",
      content: [{ type: "text", text: "[History acknowledged.]" }],
    });
  }

  // === Message 4: Current State Hints (SEMI-STATIC - IDs and names) ===
  messages.push(
    createUserMessage(`[CONTEXT: Current State]\n${currentStateContext}`),
  );
  messages.push({
    role: "assistant",
    content: [
      { type: "text", text: "[State acknowledged. Awaiting player action.]" },
    ],
  });

  // === Final Message: User Action with Instructions ===
  messages.push(createUserMessage(userAction));
  return { messages, dynamicContext };
};

// ============================================================================
// Turn Context and Agentic Loop
// ============================================================================

/**
 * Process finish_turn response data (from tool call or direct schema response)
 * Extracts all fields and populates the accumulated response
 */
function processFinishTurnResponse(
  finishTurnData: Record<string, unknown>,
  accumulatedResponse: GameResponse,
  db: GameDatabase,
): void {
  // Extract narrative and choices
  accumulatedResponse.narrative = (finishTurnData.narrative as string)
    ?.replace(/\\n/g, "\n")
    .replace(/\\"/g, '"');
  accumulatedResponse.choices = finishTurnData.choices as string[];
  accumulatedResponse.imagePrompt = finishTurnData.imagePrompt as string;
  accumulatedResponse.generateImage = finishTurnData.generateImage as boolean;

  // Extract atmosphere
  if (finishTurnData.atmosphere) {
    accumulatedResponse.atmosphere =
      finishTurnData.atmosphere as GameResponse["atmosphere"];
  }
  if (finishTurnData.narrativeTone) {
    accumulatedResponse.narrativeTone = finishTurnData.narrativeTone as string;
  }

  // Extract alive entities for next turn context
  if (finishTurnData.aliveEntities) {
    accumulatedResponse.aliveEntities =
      finishTurnData.aliveEntities as GameResponse["aliveEntities"];
  }

  // Extract RAG queries for next turn context
  if (finishTurnData.ragQueries && Array.isArray(finishTurnData.ragQueries)) {
    accumulatedResponse.ragQueries = finishTurnData.ragQueries as string[];
  }

  // Extract RAG filter flags
  if (finishTurnData.ragCurrentForkOnly !== undefined) {
    accumulatedResponse.ragCurrentForkOnly =
      finishTurnData.ragCurrentForkOnly as boolean;
  }
  if (finishTurnData.ragBeforeCurrentTurn !== undefined) {
    accumulatedResponse.ragBeforeCurrentTurn =
      finishTurnData.ragBeforeCurrentTurn as boolean;
  }

  // Extract ending type - "continue" means no ending, story continues
  if (finishTurnData.ending && finishTurnData.ending !== "continue") {
    accumulatedResponse.ending =
      finishTurnData.ending as GameResponse["ending"];
  }

  // Extract forceEnd flag (handle null from OpenAI strict schema)
  if (finishTurnData.forceEnd === true || finishTurnData.forceEnd === false) {
    accumulatedResponse.forceEnd = finishTurnData.forceEnd;
  }

  // Attach the FINAL STATE from the DB
  (accumulatedResponse as GameResponse & { finalState: unknown }).finalState =
    db.getState();
}

export interface TurnContext {
  recentHistory: StorySegment[];
  userAction: string;
  language: string;
  themeKey?: string;
  tFunc?: (key: string) => unknown;
  ragContext?: string; // RAG context from the new RAG service
}

interface AgenticLoopResult {
  response: GameResponse;
  logs: LogEntry[];
  usage: TokenUsage;
}

/**
 * 生成冒险回合
 */
export const generateAdventureTurn = async (
  gameState: GameState,
  context: TurnContext,
): Promise<AgenticLoopResult> => {
  const { provider, modelId } = getProviderConfig("story");
  const { narrativeStyle, example, isRestricted } = resolveThemeConfig(
    context.themeKey,
    context.language,
    context.tFunc as (key: string, options?: Record<string, unknown>) => string,
  );

  let systemInstruction = buildSystemContext(
    context.language,
    narrativeStyle,
    example,
    isRestricted,
    gameState.outline,
    gameState.godMode,
    currentSettings.extra?.detailedDescription,
  );

  const promptInjectionEnabled = currentSettings.extra?.promptInjectionEnabled;
  if (promptInjectionEnabled && promptInjectionData) {
    const loweredModelId = modelId.toLowerCase();
    console.log(
      `[PromptInjection] Checking for prompts to inject for model ${modelId}`,
    );
    const matchedPrompt = promptInjectionData.prompts.find((p) =>
      p.keywords.some((k) => loweredModelId.includes(k.toLowerCase())),
    );
    if (matchedPrompt) {
      systemInstruction = `${matchedPrompt.prompt}\n\n${systemInstruction}`;
      console.warn(
        `[PromptInjection] Injecting prompt for model ${modelId} (matched keywords: ${matchedPrompt.keywords.join(", ")}`,
      );
    }
  }

  // Try to get RAG context if embedding is enabled
  // Note: RAG context is now provided via context.ragContext parameter
  // The new RAG service (services/rag) is integrated through hooks/useRAG.ts
  // and the context is passed in from the game engine layer
  let ragContext: string | undefined = context.ragContext;

  const { messages, dynamicContext } = buildTurnContents(
    gameState.summaries,
    getCurrentStateContext(gameState, context.recentHistory),
    context.recentHistory,
    gameState.timeline || [],
    context.userAction,
    ragContext,
  );

  const generationDetails: LogEntry["generationDetails"] = {
    dynamicContext,
    ragContext,
    ragQueries: gameState.ragQueries,
    systemPrompt: systemInstruction,
    userPrompt: context.userAction,
  };

  return runAgenticLoop(
    provider,
    modelId,
    systemInstruction,
    messages,
    gameState,
    generationDetails,
  );
};

/**
 * Agentic Loop 实现
 */
const runAgenticLoop = async (
  provider: ProviderType,
  modelId: string,
  systemInstruction: string,
  initialContents: UnifiedMessage[],
  inputState: GameState,
  generationDetails?: LogEntry["generationDetails"],
): Promise<AgenticLoopResult> => {
  let conversationHistory: UnifiedMessage[] = [...initialContents];
  let turnCount = 0;
  const maxTurns = 10; // Safety limit

  const allLogs: LogEntry[] = [];

  // Use the GameState directly as the database initial state
  const db = new GameDatabase({
    ...inputState,
    knowledge: inputState.knowledge || [],
    factions: inputState.factions || [],
    timeline: inputState.timeline || [],
    causalChains: inputState.causalChains || [],
    time: inputState.time || "Unknown",
  });

  // Accumulated actions for UI feedback (Toasts)
  const accumulatedResponse: GameResponse = {
    narrative: "",
    choices: [],
    inventoryActions: [],
    relationshipActions: [],
    locationActions: [],
    questActions: [],
    knowledgeActions: [],
    factionActions: [],
    characterUpdates: undefined,
    timelineEvents: [],
  };

  let totalUsage: TokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };

  // Initialize lastLog with a placeholder
  let lastLog: LogEntry = createLogEntry(
    provider,
    modelId,
    "agentic_init",
    { initializing: true },
    {},
    totalUsage,
  );

  // Prepare tools for the provider
  const toolConfig = TOOLS.filter((t) => {
    // Hide RAG tools if embedding is disabled
    if (
      !currentSettings.embedding?.enabled &&
      (t.name === "search_memory" || t.name === "search_knowledge")
    ) {
      return false;
    }
    return true;
  }).map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));

  // Get pending consequences that are READY for AI to potentially trigger
  const readyConsequences = db.getReadyConsequences();
  if (readyConsequences.length > 0) {
    const readyList = readyConsequences
      .map(
        (rc) =>
          `- [${rc.chainId}/${rc.consequence.id}] ${rc.consequence.description}${
            rc.consequence.conditions?.length
              ? ` (conditions: ${rc.consequence.conditions.join(", ")})`
              : ""
          }${rc.consequence.known ? " [player will know]" : " [hidden from player]"}`,
      )
      .join("\n");

    // Inject ready consequences as context for AI to consider
    conversationHistory.push(
      createUserMessage(
        `[SYSTEM: PENDING CONSEQUENCES READY FOR YOUR DECISION]\n` +
          `The following consequences from past events are NOW READY to potentially trigger.\n` +
          `Review each one and decide IF and WHEN to trigger based on:\n` +
          `1. Does it fit the current story moment?\n` +
          `2. Are the conditions met?\n` +
          `3. Would triggering enhance the narrative?\n\n` +
          `Ready consequences:\n${readyList}\n\n` +
          `To trigger a consequence: use update_causal_chain with action="trigger" and triggerConsequenceId="<id>".\n` +
          `Then NARRATE the consequence in your response (if known=true, player sees it; if known=false, it affects the world secretly).`,
      ),
    );
  }

  while (turnCount < maxTurns) {
    console.log(`[Agentic Loop] Turn ${turnCount + 1}/${maxTurns}`);

    let result: GenerateContentResult["result"];
    let usage: TokenUsage;
    let raw: unknown;

    // Retry logic for transient errors like MALFORMED_FUNCTION_CALL
    const maxRetries = 2;
    let retryCount = 0;
    let lastError: Error | null = null;

    // Last round: don't provide tools, force schema response
    const isLastRound = turnCount === maxTurns - 1;
    const effectiveToolConfig = isLastRound ? undefined : toolConfig;
    const effectiveSchema = isLastRound ? finishTurnSchema : undefined;

    if (isLastRound) {
      console.log(
        `[Agentic Loop] LAST ROUND - No tools available, forcing finish_turn schema response`,
      );
      // Add a system message to inform the model
      conversationHistory.push(
        createUserMessage(
          `[SYSTEM: FINAL ROUND]\nThis is the final round. You MUST return a JSON response matching the finish_turn schema. No tools are available.`,
        ),
      );
    }

    while (retryCount <= maxRetries) {
      try {
        // Pass UnifiedMessage[] directly - generateContentUnified handles format conversion
        const resultData = await generateContentUnified(
          provider,
          modelId,
          systemInstruction,
          conversationHistory,
          effectiveSchema,
          { tools: effectiveToolConfig, generationDetails },
        );

        result = resultData.result;
        usage = resultData.usage;
        raw = resultData.raw;
        console.log(
          `[Agentic Loop] Turn ${turnCount + 1} response received. Usage:`,
          usage,
          `HasFunctionCalls: ${!!(result as { functionCalls?: unknown }).functionCalls}`,
        );
        break; // Success, exit retry loop
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        lastError = error;
        const errorMessage = error.message || "";

        // Check if this is a retryable error (malformed function call)
        if (
          e instanceof MalformedToolCallError ||
          errorMessage.includes("function call format error") ||
          errorMessage.includes("MALFORMED_FUNCTION_CALL")
        ) {
          retryCount++;
          if (retryCount <= maxRetries) {
            console.warn(
              `[Agentic Loop] Retrying due to malformed function call (attempt ${retryCount}/${maxRetries})...`,
            );
            // Small delay before retry
            await new Promise((resolve) => setTimeout(resolve, 500));
            continue;
          }
        }

        // Non-retryable error or max retries exceeded
        console.error("[Agentic Loop] Error:", error);
        throw error;
      }
    }

    // If we exhausted retries, throw the last error
    if (retryCount > maxRetries && lastError) {
      throw lastError;
    }

    // Update Usage with validation
    if (usage!) {
      totalUsage.promptTokens += usage!.promptTokens || 0;
      totalUsage.completionTokens += usage!.completionTokens || 0;
      totalUsage.totalTokens += usage!.totalTokens || 0;
      console.log(`[Agentic Loop] Cumulative usage:`, totalUsage);
    } else {
      console.warn(`[Agentic Loop] No usage data for turn ${turnCount + 1}`);
    }

    lastLog = createLogEntry(
      provider,
      modelId,
      `agentic_turn_${turnCount + 1}`,
      { turn: turnCount + 1 },
      {
        hasToolCalls: !!(result! as { functionCalls?: unknown }).functionCalls,
        toolCount:
          (result! as { functionCalls?: ToolCallResult[] }).functionCalls
            ?.length || 0,
      },
      usage!,
    );

    // Handle Tool Calls
    const functionCalls = (result! as { functionCalls?: ToolCallResult[] })
      .functionCalls;

    if (result && functionCalls && functionCalls.length > 0) {
      let toolCalls: UnifiedToolCallResult[] = functionCalls;

      // **REORDER: Ensure finish_turn is the last tool call**
      const finishTurnIndex = toolCalls.findIndex(
        (tc) => tc.name === "finish_turn",
      );
      if (finishTurnIndex !== -1 && finishTurnIndex !== toolCalls.length - 1) {
        console.log(
          `[Agentic Loop] Reordering finish_turn from position ${finishTurnIndex} to last position`,
        );
        const finishTurnCall = toolCalls[finishTurnIndex];
        toolCalls = [
          ...toolCalls.slice(0, finishTurnIndex),
          ...toolCalls.slice(finishTurnIndex + 1),
          finishTurnCall,
        ];
      }

      // Collect detailed tool call records for this turn
      const turnToolCalls: ToolCallRecord[] = [];

      // Add model's tool call to history using unified format
      conversationHistory.push(
        createToolCallMessage(
          toolCalls.map((fc) => ({
            id: fc.id,
            name: fc.name,
            arguments: fc.args,
          })),
        ),
      );

      // Execute Tools and collect responses
      const toolResponses: Array<{
        toolCallId: string;
        name: string;
        content: unknown;
      }> = [];

      for (const call of toolCalls) {
        const { id: callId, name, args } = call;
        console.log(`[Agentic Loop] Tool Call [${callId}]: ${name}`, args);

        let output: unknown = { success: false, error: "Unknown tool" };

        // Execute tool
        output = executeToolCall(name, args, db, accumulatedResponse);

        // Handle finish_turn specially
        if (name === "finish_turn") {
          // Process finish_turn response
          processFinishTurnResponse(args, accumulatedResponse, db);

          console.log(
            `[Agentic Loop] finish_turn called. Final usage:`,
            totalUsage,
          );
          console.log(
            `[Agentic Loop] Narrative length: ${accumulatedResponse.narrative?.length || 0}, Choices: ${accumulatedResponse.choices?.length || 0}`,
          );

          // Record finish_turn as a tool call
          turnToolCalls.push({
            name: "finish_turn",
            input: {
              narrative: (args.narrative as string)?.substring(0, 100) + "...",
              choices: args.choices,
              atmosphere: args.atmosphere,
            },
            output: { success: true },
            timestamp: Date.now(),
          });

          // Update lastLog with all tool calls from this turn
          lastLog.toolCalls = turnToolCalls;
          allLogs.push(lastLog);

          // Create final summary log
          const finalLog = createLogEntry(
            provider,
            modelId,
            "agentic_complete",
            { turns: turnCount + 1 },
            {
              totalToolCalls: allLogs.reduce(
                (sum, log) => sum + (log.toolCalls?.length || 0),
                0,
              ),
              narrative:
                accumulatedResponse.narrative?.substring(0, 100) + "...",
              choices: accumulatedResponse.choices,
              atmosphere: accumulatedResponse.atmosphere,
            },
            totalUsage,
          );
          allLogs.push(finalLog);

          return {
            response: accumulatedResponse,
            logs: allLogs,
            usage: totalUsage,
          };
        }

        // Record this tool call with input/output
        turnToolCalls.push({
          name,
          input: args,
          output,
          timestamp: Date.now(),
        });

        // Collect tool response for this call
        toolResponses.push({
          toolCallId: callId,
          name: name,
          content: output,
        });
      }

      // Update the log entry with detailed tool calls
      lastLog.toolCalls = turnToolCalls;
      allLogs.push(lastLog);

      // Add all tool responses as a single message with multiple parts
      conversationHistory.push(createToolResponseMessage(toolResponses));

      turnCount++;
    } else {
      // No tool calls - check if this is a direct finish_turn schema response
      console.log(
        `[Agentic Loop] No tool calls. Checking for finish_turn schema response...`,
      );

      // Validate against finishTurnSchema
      try {
        const finishTurnData = finishTurnSchema.parse(result);
        console.log(
          `[Agentic Loop] Valid finish_turn schema response detected`,
        );

        // Process finish_turn response
        processFinishTurnResponse(finishTurnData, accumulatedResponse, db);

        console.log(
          `[Agentic Loop] finish_turn schema response processed. Final usage:`,
          totalUsage,
        );

        // Create final summary log
        const finalLog = createLogEntry(
          provider,
          modelId,
          "agentic_complete",
          { turns: turnCount + 1, method: "schema_response" },
          {
            totalToolCalls: allLogs.reduce(
              (sum, log) => sum + (log.toolCalls?.length || 0),
              0,
            ),
            narrative: accumulatedResponse.narrative?.substring(0, 100) + "...",
            choices: accumulatedResponse.choices,
            atmosphere: accumulatedResponse.atmosphere,
          },
          totalUsage,
        );
        allLogs.push(lastLog);
        allLogs.push(finalLog);

        return {
          response: accumulatedResponse,
          logs: allLogs,
          usage: totalUsage,
        };
      } catch (validationError) {
        console.error(
          `[Agentic Loop] Response does not match finish_turn schema:`,
          validationError,
        );

        // Fallback: try to extract narrative if present
        if (result && (result as GameResponse).narrative) {
          allLogs.push(lastLog);
          return {
            response: result as GameResponse,
            logs: allLogs,
            usage: totalUsage,
          };
        }

        // Last resort fallback
        console.warn("Model returned unexpected response format:", result);
        allLogs.push(lastLog);
        return {
          response: {
            ...accumulatedResponse,
            narrative:
              typeof result === "string" ? result : JSON.stringify(result),
            choices: ["Continue"],
          },
          logs: allLogs,
          usage: totalUsage,
        };
      }
    }
  }

  // Max turns reached without finish_turn
  console.warn(
    `[Agentic Loop] Max turns (${maxTurns}) reached without finish_turn`,
  );
  return { response: accumulatedResponse, logs: allLogs, usage: totalUsage };
};

// ============================================================================
// Tool Execution
// ============================================================================

/**
 * 执行工具调用
 */
function executeToolCall(
  name: string,
  args: Record<string, unknown>,
  db: GameDatabase,
  accumulatedResponse: GameResponse,
): unknown {
  // Query operations
  if (name === "query_inventory") {
    return db.query("inventory", args.query as string);
  } else if (name === "query_relationships") {
    return db.query("relationship", args.query as string);
  } else if (name === "query_locations") {
    return db.query("location", args.query as string);
  } else if (name === "query_quests") {
    return db.query("quest", args.query as string);
  } else if (name === "query_knowledge") {
    return db.query("knowledge", args.query as string);
  } else if (name === "query_timeline") {
    return db.query("timeline", args.query as string);
  } else if (name === "query_causal_chain") {
    return db.query("causal_chain", args.query as string);
  } else if (name === "query_factions") {
    return db.query("faction", args.query as string);
  } else if (name === "query_global") {
    return db.query("global");
  } else if (name === "query_character") {
    return db.query("character");
  }
  // RAG search operation
  else if (name === "rag_search") {
    return executeRagSearch(args, db);
  }
  // Modify operations
  else if (name === "update_inventory") {
    const { action: actionType, ...data } = args;
    const modifyResult = db.modify("inventory", actionType as string, data);
    if (modifyResult.success) {
      if (!accumulatedResponse.inventoryActions)
        accumulatedResponse.inventoryActions = [];
      accumulatedResponse.inventoryActions.push({
        action: actionType as "add" | "update" | "remove",
        ...data,
      } as GameResponse["inventoryActions"][number]);
    }
    return modifyResult;
  } else if (name === "update_relationship") {
    const { action: actionType, ...data } = args;
    const modifyResult = db.modify("relationship", actionType as string, data);
    if (modifyResult.success) {
      if (!accumulatedResponse.relationshipActions)
        accumulatedResponse.relationshipActions = [];
      accumulatedResponse.relationshipActions.push({
        action: actionType as "add" | "update" | "remove",
        ...data,
      } as GameResponse["relationshipActions"][number]);
    }
    return modifyResult;
  } else if (name === "update_location") {
    const { action: actionType, ...data } = args;
    const modifyResult = db.modify("location", actionType as string, data);
    if (modifyResult.success) {
      if (!accumulatedResponse.locationActions)
        accumulatedResponse.locationActions = [];
      accumulatedResponse.locationActions.push({
        type: "known",
        action: actionType as "add" | "update",
        ...data,
      } as GameResponse["locationActions"][number]);
    }
    return modifyResult;
  } else if (name === "update_quest") {
    const { action: actionType, ...data } = args;
    const modifyResult = db.modify("quest", actionType as string, data);
    if (modifyResult.success) {
      if (!accumulatedResponse.questActions)
        accumulatedResponse.questActions = [];
      accumulatedResponse.questActions.push({
        action: actionType as "add" | "update" | "complete" | "fail",
        ...data,
      } as GameResponse["questActions"][number]);
    }
    return modifyResult;
  } else if (name === "update_knowledge") {
    const { action: actionType, ...data } = args;
    const modifyResult = db.modify("knowledge", actionType as string, data);
    if (modifyResult.success) {
      if (!accumulatedResponse.knowledgeActions)
        accumulatedResponse.knowledgeActions = [];
      accumulatedResponse.knowledgeActions.push({
        action: actionType as "add" | "update",
        ...data,
      } as GameResponse["knowledgeActions"][number]);
    }
    return modifyResult;
  } else if (name === "update_timeline") {
    const { action: actionType, ...data } = args;
    return db.modify("timeline", actionType as string, data);
  } else if (name === "update_causal_chain") {
    const { action: actionType, ...data } = args;
    return db.modify("causal_chain", actionType as string, data);
  } else if (name === "update_faction") {
    const { action: actionType, ...data } = args;
    const modifyResult = db.modify("faction", actionType as string, data);
    if (modifyResult.success) {
      if (!accumulatedResponse.factionActions)
        accumulatedResponse.factionActions = [];
      accumulatedResponse.factionActions.push({
        action: actionType as "update",
        ...data,
      } as GameResponse["factionActions"][number]);
    }
    return modifyResult;
  } else if (name === "update_world_info") {
    // Handle world info unlocking
    const { unlockWorldSetting, unlockMainGoal, reason } = args as {
      unlockWorldSetting?: boolean;
      unlockMainGoal?: boolean;
      reason: string;
    };
    const modifyResult = db.modify("world_info", "update", {
      unlockWorldSetting,
      unlockMainGoal,
      reason,
    });
    if (modifyResult.success) {
      if (!accumulatedResponse.worldInfoUpdates)
        accumulatedResponse.worldInfoUpdates = [];
      accumulatedResponse.worldInfoUpdates.push({
        unlockWorldSetting,
        unlockMainGoal,
        reason,
      });
    }
    return modifyResult;
  } else if (name === "update_global") {
    const { ...data } = args;
    return db.modify("global", "update", data);
  } else if (name === "update_character") {
    const modifyResult = db.modify("character", "update", args);
    if (modifyResult.success) {
      accumulatedResponse.characterUpdates =
        args as GameResponse["characterUpdates"];
    }
    return modifyResult;
  } else if (name === "finish_turn") {
    // finish_turn is handled separately in the main loop
    return { success: true };
  }

  return { success: false, error: "Unknown tool" };
}

/**
 * 执行 RAG 搜索
 * Uses the new RAG service (SharedWorker-based) for semantic search
 */
async function executeRagSearch(
  args: Record<string, unknown>,
  db: GameDatabase,
): Promise<unknown> {
  const { getRAGService } = await import("./rag");
  const ragService = getRAGService();

  if (!ragService) {
    return {
      success: false,
      error:
        "RAG search is not available. RAG service has not been initialized.",
      hint: "Use query_* tools to search specific entity types instead.",
    };
  }

  try {
    const query = args.query as string;
    const types = args.types as
      | (
          | "story"
          | "location"
          | "quest"
          | "knowledge"
          | "npc"
          | "item"
          | "event"
        )[]
      | undefined;
    const topK = (args.topK as number) || 5;
    const currentForkOnly = args.currentForkOnly as boolean | undefined;
    const beforeCurrentTurn = args.beforeCurrentTurn as boolean | undefined;

    const state = db.getState();

    // Build search options for new RAG service
    const searchOptions = {
      topK,
      types,
      forkId: state.forkId,
      currentForkOnly,
      beforeTurn: beforeCurrentTurn ? state.turnNumber : undefined,
    };

    const results = await ragService.search(query, searchOptions);

    // Group results by type for backwards compatibility
    const groupedResults: Record<string, string[]> = {
      story: [],
      npc: [],
      location: [],
      item: [],
      knowledge: [],
      quest: [],
      event: [],
    };

    for (const result of results) {
      const type = result.document.type;
      if (groupedResults[type]) {
        groupedResults[type].push(result.document.content);
      }
    }

    const combinedContext = results.map((r) => r.document.content).join("\n\n");

    return {
      success: true,
      query,
      filters: {
        currentForkOnly: currentForkOnly || false,
        beforeCurrentTurn: beforeCurrentTurn || false,
        forkId: currentForkOnly ? state.forkId : undefined,
        turnNumber: beforeCurrentTurn ? state.turnNumber : undefined,
      },
      results: groupedResults,
      combinedContext,
      message: `Found ${results.length} relevant entries`,
    };
  } catch (error) {
    return {
      success: false,
      error: `RAG search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

// ============================================================================
// Image/Video/Speech Generation
// ============================================================================

/**
 * 生成场景图片
 */
export const generateSceneImage = async (
  prompt: string,
  context: ImageGenerationContext,
): Promise<{ url: string | null; log: LogEntry }> => {
  const { provider, modelId, enabled, resolution } = getProviderConfig("image");
  if (!enabled) {
    return {
      url: null,
      log: createLogEntry("none", "none", "image", { disabled: true }, null),
    };
  }

  const styledPrompt = getSceneImagePrompt(prompt, context);
  let url: string | null;
  let usage: TokenUsage | undefined;
  let raw: unknown;

  console.log(
    "Generating image for prompt:",
    styledPrompt,
    "with model:",
    modelId,
    "and resolution:",
    resolution,
  );

  if (provider === "openai") {
    const response = await generateOpenAIImage(
      { ...openaiConfig, modelId },
      modelId,
      styledPrompt,
      resolution,
    );
    url = response.url;
    usage = response.usage;
    raw = response.raw;
  } else if (provider === "openrouter") {
    const response = await generateOpenRouterImage(
      openRouterConfig,
      modelId,
      styledPrompt,
      resolution,
    );
    url = response.url;
    usage = response.usage;
    raw = response.raw;
  } else {
    const response = await generateGeminiImage(
      geminiConfig,
      modelId,
      styledPrompt,
      resolution,
    );
    url = response.url;
    usage = response.usage;
    raw = response.raw;
  }

  const log = createLogEntry(
    provider,
    modelId,
    "generateImage",
    { prompt: styledPrompt, resolution },
    raw,
    usage,
  );
  return { url, log };
};

/**
 * 翻译游戏内容
 */
export const translateGameContent = async (
  segments: StorySegment[],
  inventory: string[],
  character: CharacterStatus,
  relationships: Relationship[],
  targetLanguage: string,
): Promise<{
  segments: StorySegment[];
  inventory: string[];
  character: CharacterStatus;
  relationships: Relationship[];
}> => {
  const { provider, modelId } = getProviderConfig("translation");

  // 提取需要翻译的文本字段
  const segmentsToTranslate = segments.map((s) => ({
    id: s.id,
    text: s.text,
    choices: s.choices,
  }));

  const payload = {
    segments: segmentsToTranslate,
    inventory,
    character,
    relationships,
  };

  const prompt = getTranslationPrompt(targetLanguage, JSON.stringify(payload));
  const sys =
    "Professional translator. Translate all text fields while preserving JSON structure and IDs. Maintain tone and style appropriate to the content. Output valid JSON.";
  const contents = [{ role: "user", parts: [{ text: prompt }] }];

  try {
    const { result } = await generateContentUnified(
      provider,
      modelId,
      sys,
      contents,
      translationSchema,
    );

    // 合并翻译结果和原始 segments
    const translatedPayload = result as {
      segments: Array<{ id: string; text: string; choices: string[] }>;
      inventory: string[];
      character: CharacterStatus;
      relationships: Relationship[];
    };

    const mergedSegments = segments.map((originalSeg) => {
      const translated = translatedPayload.segments.find(
        (t) => t.id === originalSeg.id,
      );
      if (translated) {
        return {
          ...originalSeg,
          text: translated.text,
          choices: translated.choices,
        };
      }
      return originalSeg;
    });

    return {
      segments: mergedSegments,
      inventory: translatedPayload.inventory,
      character: translatedPayload.character,
      relationships: translatedPayload.relationships,
    };
  } catch (error) {
    // Fallback: return original
    return { segments, inventory, character, relationships };
  }
};

/**
 * 生成 Veo 视频
 */
export const generateVeoVideo = async (
  imageBase64: string,
  prompt: string,
): Promise<string> => {
  const { provider, modelId, enabled } = getProviderConfig("video");
  if (!enabled) throw new Error("Disabled");

  if (provider === "gemini") {
    const { url } = await generateGeminiVideo(
      geminiConfig,
      modelId,
      imageBase64,
      prompt,
    );
    return url;
  }

  throw new Error(`Video generation not supported by ${provider}`);
};

/**
 * 生成语音
 */
export const generateSpeech = async (
  text: string,
  voiceName?: string,
  narrativeTone?: string,
): Promise<ArrayBuffer | null> => {
  const { provider, modelId, enabled } = getProviderConfig("audio");
  const audioConfig = currentSettings.audio;

  if (!enabled) throw new Error("Disabled");

  // Default options from settings
  const options: {
    speed: number;
    format: "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm";
    instructions?: string;
  } = {
    speed: audioConfig.speed || 1.0,
    format:
      (audioConfig.format as "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm") ||
      "mp3",
  };

  // Determine target voice
  let targetVoice = voiceName || audioConfig.voice || "alloy";

  // Dynamic Voice Selection based on Tone
  if (!voiceName) {
    if (narrativeTone && (provider === "openai" || provider === "openrouter")) {
      const tone = narrativeTone.toLowerCase();
      if (
        tone.includes("suspense") ||
        tone.includes("tense") ||
        tone.includes("danger")
      ) {
        targetVoice = "onyx";
      } else if (
        tone.includes("cheerful") ||
        tone.includes("happy") ||
        tone.includes("energetic")
      ) {
        targetVoice = "nova";
      } else if (
        tone.includes("melancholy") ||
        tone.includes("sad") ||
        tone.includes("quiet")
      ) {
        targetVoice = "shimmer";
      } else if (
        tone.includes("calm") ||
        tone.includes("peaceful") ||
        tone.includes("mystical")
      ) {
        targetVoice = "alloy";
      } else if (tone.includes("royal") || tone.includes("authoritative")) {
        targetVoice = "fable";
      }
    }
  }

  // Model-specific handling
  if (modelId === "gpt-4o-mini-tts") {
    // Use instructions for tone
    if (narrativeTone) {
      options.instructions = `Speak in a ${narrativeTone} tone.`;
    }
  }

  try {
    if (provider === "openai") {
      const { audio } = await generateOpenAISpeech(
        { ...openaiConfig, modelId },
        modelId,
        text,
        targetVoice,
        options,
      );
      return audio;
    } else if (provider === "openrouter") {
      const { audio } = await generateOpenRouterSpeech(
        openRouterConfig,
        modelId,
        text,
        targetVoice,
        options,
      );
      return audio;
    } else {
      // Gemini
      const geminiOptions = {
        ...options,
        instructions: narrativeTone, // Pass tone directly
      };

      const { audio } = await generateGeminiSpeech(
        geminiConfig,
        modelId,
        text,
        targetVoice,
        geminiOptions,
      );
      return audio;
    }
  } catch (error) {
    console.error("Speech generation failed", error);
    return null;
  }
};

/**
 * 生成 Veo 脚本
 */
export const generateVeoScript = async (
  gameState: GameState,
  history: StorySegment[],
  language: string = "English",
): Promise<string> => {
  const prompt = getVeoScriptPrompt(gameState, history, language);

  const { provider, modelId } = getProviderConfig("script");
  const sys =
    "You are an AWARD-WINNING cinematographer and visionary director. Transform the narrative into a publication-ready video generation script with professional cinematographic detail. Output the structured script directly.";
  const contents = [{ role: "user", parts: [{ text: prompt }] }];

  try {
    const { result } = await generateContentUnified(
      provider,
      modelId,
      sys,
      contents,
    );
    // result should be the text string since no schema was provided
    return typeof result === "string" ? result : JSON.stringify(result);
  } catch (e: unknown) {
    console.error("Veo script generation failed", e);
    return "Failed to generate script.";
  }
};

// ============================================================================
// Embedding Functions
// ============================================================================

/**
 * 获取可用的嵌入模型列表
 */
export const getEmbeddingModels = async (
  provider: ProviderType,
): Promise<EmbeddingModelInfo[]> => {
  try {
    if (provider === "gemini") {
      return await getGeminiEmbeddingModels(geminiConfig);
    } else if (provider === "openai") {
      return await getOpenAIEmbeddingModels(openaiConfig);
    } else {
      return await getOpenRouterEmbeddingModels(openRouterConfig);
    }
  } catch (error) {
    console.error(`Failed to get embedding models from ${provider}:`, error);
    return [];
  }
};

interface EmbeddingUsage {
  promptTokens: number;
  totalTokens: number;
}

/**
 * 生成嵌入向量
 */
export const generateEmbeddings = async (
  texts: string[],
  config?: EmbeddingConfig,
): Promise<{ embeddings: Float32Array[]; usage: EmbeddingUsage }> => {
  const embeddingConfig = config || currentSettings.embedding;

  if (!embeddingConfig?.enabled) {
    throw new Error("Embedding is disabled");
  }

  const { provider, modelId } = embeddingConfig;

  if (provider === "gemini") {
    return await generateGeminiEmbedding(geminiConfig, modelId, texts);
  } else if (provider === "openai") {
    return await generateOpenAIEmbedding(openaiConfig, modelId, texts);
  } else {
    return await generateOpenRouterEmbedding(openRouterConfig, modelId, texts);
  }
};

// Re-export the EmbeddingModelInfo type for consumers
export type { EmbeddingModelInfo };
