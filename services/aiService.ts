import type {
  AISettings,
  LogEntry,
  StoryOutline,
  LanguageCode,
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
} from "../types";
import { GameDatabase } from "./gameDatabase";
import {
  GeminiConfig,
  generateContent as generateGeminiContent,
  generateImage as generateGeminiImage,
  generateVideo as generateGeminiVideo,
  generateSpeech as generateGeminiSpeech,
  getModels as getGeminiModels,
  validateConnection as validateGeminiConnection,
} from "./providers/geminiProvider";
import {
  OpenAIConfig,
  generateContent as generateOpenAIContent,
  generateImage as generateOpenAIImage,
  generateSpeech as generateOpenAISpeech,
  getModels as getOpenAIModels,
  validateConnection as validateOpenAIConnection,
} from "./providers/openaiProvider";
import {
  OpenRouterConfig,
  generateContent as generateOpenRouterContent,
  generateImage as generateOpenRouterImage,
  generateSpeech as generateOpenRouterSpeech,
  getModels as getOpenRouterModels,
  validateConnection as validateOpenRouterConnection,
} from "./providers/openRouterProvider";
import { DEFAULTS, DEFAULT_OPENAI_BASE_URL, THEMES } from "../utils/constants";
import {
  gameResponseSchema,
  translationSchema,
  storyOutlineSchema,
  summarySchema,
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
} from "./prompts";
import { convertJsonSchemaToOpenAI } from "./schemaUtils";
import { TOOLS } from "./tools";
import {
  UnifiedMessage,
  createUserMessage,
  createToolCallMessage,
  createToolResponseMessage,
  toGeminiFormat,
  toOpenAIFormat,
  ToolCallResult as UnifiedToolCallResult,
} from "./messageTypes";

let geminiConfig: GeminiConfig = { apiKey: getEnvApiKey(), baseUrl: undefined };
let openaiConfig: OpenAIConfig = { apiKey: "", baseUrl: "", modelId: "" };
let openRouterConfig: OpenRouterConfig = { apiKey: "", baseUrl: "" };
let currentSettings: AISettings = JSON.parse(JSON.stringify(DEFAULTS));

export const updateAIConfig = (settings: AISettings) => {
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

  const openRouterBase = settings.openrouter?.baseUrl
    ? settings.openrouter.baseUrl.replace(/\/+$/, "")
    : "https://openrouter.ai/api/v1";
  openRouterConfig = {
    apiKey: settings.openrouter?.apiKey || "",
    baseUrl: openRouterBase,
  };
};

const getProviderConfig = (
  func:
    | "story"
    | "image"
    | "video"
    | "audio"
    | "translation"
    | "lore"
    | "script",
) => {
  const config = currentSettings[func];
  return {
    provider: config.provider,
    modelId: config.modelId,
    enabled: config.enabled !== false,
    resolution: config.resolution,
    thinkingLevel: config.thinkingLevel,
    mediaResolution: config.mediaResolution,
    // Advanced Parameters
    temperature: config.temperature,
    topP: config.topP,
    topK: config.topK,
    minP: config.minP,
  };
};

// --- Helpers ---

import type { ToolCallRecord } from "../types";

const createLogEntry = (
  provider: string,
  model: string,
  endpoint: string,
  req: Record<string, unknown>,
  res: Record<string, unknown>,
  usage?: TokenUsage,
  toolCalls?: ToolCallRecord[],
): LogEntry => {
  const entry: LogEntry = {
    id: Date.now().toString() + Math.random().toString(36).substring(7),
    timestamp: Date.now(),
    provider,
    model,
    endpoint,
    request: req,
    response: res,
    usage: usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    toolCalls,
  };
  console.log(`[Log] ${provider}/${model} - ${endpoint}`, {
    usage: entry.usage,
    hasRequest: !!req,
    hasResponse: !!res,
    toolCallCount: toolCalls?.length || 0,
  });
  return entry;
};

const getLangCode = (language: string): "en" | "zh" => {
  if (
    language.toLowerCase().includes("chinese") ||
    language.toLowerCase().includes("zh")
  )
    return "zh";
  return "en";
};

// --- Cache ---
interface ModelCacheEntry {
  timestamp: number;
  data: ModelInfo[];
  configHash: string;
}

const modelCache: Record<string, ModelCacheEntry> = {};

// --- API Functions ---

export const getModels = async (
  provider: "gemini" | "openai" | "openrouter",
  forceRefresh: boolean = false,
): Promise<ModelInfo[]> => {
  let config;
  if (provider === "gemini") config = geminiConfig;
  else if (provider === "openrouter") config = openRouterConfig;
  else
    config = { ...openaiConfig, apiKey: currentSettings.openai.apiKey || "" };

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
  if (provider === "gemini") models = await getGeminiModels(geminiConfig);
  else if (provider === "openrouter")
    models = await getOpenRouterModels(openRouterConfig);
  else models = await getOpenAIModels(config as OpenAIConfig);

  // Update cache
  modelCache[cacheKey] = {
    timestamp: Date.now(),
    data: models,
    configHash,
  };

  return models;
};

export const validateConnection = async (
  provider: "gemini" | "openai" | "openrouter",
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
  } catch (e: any) {
    console.error(`Validation failed for ${provider}`, e);
    return { isValid: false, error: e.message };
  }
};

export const filterModels = (
  models: ModelInfo[],
  type:
    | "story"
    | "image"
    | "video"
    | "audio"
    | "translation"
    | "lore"
    | "script",
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

// Unified Content Generation Helper
export const generateContentUnified = async (
  provider: "gemini" | "openai" | "openrouter",
  modelId: string,
  systemInstruction: string,
  contents: any[],
  schema?: any,
  options?: {
    thinkingLevel?: "low" | "medium" | "high";
    mediaResolution?: "low" | "medium" | "high";
    temperature?: number;
    topP?: number;
    topK?: number;
    minP?: number;
    onChunk?: (text: string) => void;
    tools?: any[];
  },
): Promise<{ result: any; usage: TokenUsage; raw: any; log?: LogEntry }> => {
  let result, usage, raw;

  // Get options from current settings (defaults)
  const storyConfig = getProviderConfig("story");
  const mergedOptions = {
    thinkingLevel: options?.thinkingLevel || storyConfig.thinkingLevel,
    mediaResolution: options?.mediaResolution || storyConfig.mediaResolution,
    temperature: options?.temperature ?? storyConfig.temperature,
    topP: options?.topP ?? storyConfig.topP,
    topK: options?.topK ?? storyConfig.topK,
    minP: options?.minP ?? storyConfig.minP,
    onChunk: options?.onChunk,
    tools: options?.tools,
  };

  try {
    if (provider === "gemini") {
      ({ result, usage, raw } = await generateGeminiContent(
        geminiConfig,
        modelId,
        systemInstruction,
        contents,
        schema,
        mergedOptions,
      ));
    } else {
      // Convert schema for OpenAI/OpenRouter
      const openAISchema = schema
        ? convertJsonSchemaToOpenAI(schema)
        : undefined;
      const config =
        provider === "openai" ? { ...openaiConfig, modelId } : openRouterConfig;

      if (provider === "openai") {
        ({ result, usage, raw } = await generateOpenAIContent(
          config as OpenAIConfig,
          modelId,
          systemInstruction,
          contents,
          openAISchema,
          mergedOptions,
        ));
      } else {
        ({ result, usage, raw } = await generateOpenRouterContent(
          config as OpenRouterConfig,
          modelId,
          systemInstruction,
          contents,
          openAISchema,
          mergedOptions,
        ));
      }
    }
  } catch (e: any) {
    console.error("Generation failed", e);
    if (e instanceof SyntaxError || e.message.includes("JSON")) {
      throw new Error(
        "The AI narrator stumbled over their words (Invalid JSON). Please try again.",
      );
    }
    throw e;
  }

  const log = createLogEntry(
    provider,
    modelId,
    "generateContent",
    { systemInstruction, contents },
    raw,
    usage,
  );
  return { result, usage, raw, log };
};

export const generateStoryOutline = async (
  theme: string,
  language: string,
  customContext?: string,
  tFunc?: (key: string, options?: any) => string,
  onChunk?: (text: string) => void,
): Promise<{ outline: StoryOutline; log: LogEntry }> => {
  const { provider, modelId } = getProviderConfig("story");

  let themeDataBackgroundTemplate: string;
  let themeDataExample: string;

  if (tFunc) {
    // Use dynamic translation function from React component
    themeDataBackgroundTemplate =
      tFunc(`${theme}.backgroundTemplate`, { ns: "themes" }) ||
      tFunc(`fantasy.backgroundTemplate`, { ns: "themes" });
    themeDataExample = tFunc(`${theme}.example`, { ns: "themes" });
  } else {
    // Fallback to static translations
    // @ts-ignore
    const themeData = THEMES[theme] || THEMES["fantasy"];
    // @ts-ignore
    const langData = LANG_MAP[language] || LANG_MAP["en"];
    themeDataBackgroundTemplate =
      langData.themes?.[theme]?.backgroundTemplate ||
      themeData.backgroundTemplate;
    themeDataExample = langData.themes?.[theme]?.example || themeData.example;
  }

  const prompt = getOutlinePrompt(
    theme,
    language,
    themeDataBackgroundTemplate,
    themeDataExample,
    customContext,
  );

  const { result, log } = await generateContentUnified(
    provider,
    modelId,
    "You are a creative writer.",
    [{ role: "user", parts: [{ text: prompt }] }],
    storyOutlineSchema,
    { onChunk },
  );

  return { outline: result as StoryOutline, log: log! };
};

export const summarizeContext = async (
  previousSummary: StorySummary,
  newTurns: string,
  language: string,
): Promise<{ summary: StorySummary; log: LogEntry }> => {
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
      summarySchema, // Ensure this schema supports the new dual-layer structure or is flexible enough
    );
    // The result should now be the full JSON object (visible + hidden)
    // We return it directly. The caller (useGameEngine) will handle storing it.
    return { summary: result, log };
  } catch (e: any) {
    console.error("Summary failed", e);
    return {
      summary: null,
      log: createLogEntry(
        provider,
        modelId,
        "summary",
        { error: e.message },
        null,
      ),
    };
  }
};

// --- Refactored Helpers for generateAdventureTurn ---

const resolveThemeConfig = (
  themeKey: string | undefined,
  language: string,
  tFunc?: (key: string, options?: any) => string,
) => {
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
) => {
  const coreSystemInstruction = getCoreSystemInstruction(
    language,
    narrativeStyle,
    isRestricted,
  );
  const staticWorldContext = getStaticWorldContext(outline);

  // Add God Mode prompt if active
  const godModeSection = godMode ? getGodModePrompt() : "";

  return `${coreSystemInstruction}\n\n${staticWorldContext}${godModeSection}`;
};

/**
 * Build turn contents with optimized message structure for KV Cache.
 *
 * Message Order (Static → Semi-Static → Dynamic):
 * 1. [STATIC] Story Memory (summaries) - changes infrequently
 * 2. [DYNAMIC] Recent History - conversation context
 * 3. [SEMI-STATIC] Current State Hints - changes each turn but is small
 * 4. [DYNAMIC] Current User Action (MUST immediately follow "Awaiting player action")
 */
const buildTurnContents = (
  summaries: StorySummary[],
  currentStateContext: string,
  recentHistory: StorySegment[],
  timeline: TimelineEvent[],
  userAction: string,
): UnifiedMessage[] => {
  const messages: UnifiedMessage[] = [];

  // === Message 1: Story Memory (STATIC - changes only after summarization) ===
  const dynamicStoryContext = getDynamicStoryContext(
    summaries,
    recentHistory,
    timeline,
  );

  if (dynamicStoryContext) {
    messages.push(
      createUserMessage(
        `[CONTEXT: Story Memory]\n<story_memory>\n${dynamicStoryContext}\n</story_memory>`,
      ),
    );
    messages.push({
      role: "assistant",
      content: [{ type: "text", text: "[Memory acknowledged.]" }],
    });
  }

  // === Message 2: Recent History (DYNAMIC - before current state) ===
  // This represents the conversation flow LEADING UP TO the current turn
  if (recentHistory.length > 0) {
    // Group recent history into a context block
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

  // === Message 3: Current State Hints (SEMI-STATIC - IDs and names) ===
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
  // This MUST immediately follow "Awaiting player action"
  const turnInstruction = `
[NEW TURN - PLAYER ACTION]
<instruction>
Process the player's action below. Follow the workflow:
1. Query only if needed (hints may suffice)
2. Apply all updates in causal order
3. Call finish_turn with narrative and choices
</instruction>

<player_action>
${userAction}
</player_action>
`;
  messages.push(createUserMessage(turnInstruction));

  return messages;
};

// --- Turn Context for Runtime Parameters ---

export interface TurnContext {
  recentHistory: StorySegment[];
  userAction: string;
  language: string;
  themeKey?: string;
  tFunc?: (key: string) => any;
}

// --- Agentic Loop Implementation ---

export const generateAdventureTurn = async (
  gameState: GameState,
  context: TurnContext,
): Promise<{ response: GameResponse; logs: LogEntry[]; usage: TokenUsage }> => {
  const { provider, modelId } = getProviderConfig("story");
  const { narrativeStyle, example, isRestricted } = resolveThemeConfig(
    context.themeKey,
    context.language,
    context.tFunc,
  );

  const systemInstruction = buildSystemContext(
    context.language,
    narrativeStyle,
    example,
    isRestricted,
    gameState.outline,
    gameState.godMode, // Pass God Mode flag
  );

  const contents = buildTurnContents(
    gameState.summaries,
    getCurrentStateContext(gameState, context.recentHistory),
    context.recentHistory,
    gameState.timeline || [],
    context.userAction,
  );

  return runAgenticLoop(
    provider,
    modelId,
    systemInstruction,
    contents,
    gameState,
  );
};

const runAgenticLoop = async (
  provider: "gemini" | "openai" | "openrouter",
  modelId: string,
  systemInstruction: string,
  initialContents: UnifiedMessage[],
  inputState: GameState,
): Promise<{ response: GameResponse; logs: LogEntry[]; usage: TokenUsage }> => {
  // Use unified message format internally
  let conversationHistory: UnifiedMessage[] = [...initialContents];
  let turnCount = 0;
  const maxTurns = 10; // Safety limit

  // Collect all logs from this agentic session
  const allLogs: LogEntry[] = [];

  // Use the GameState directly as the database initial state
  const db = new GameDatabase({
    ...inputState,
    // Ensure all required fields have defaults if missing
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

  // Initialize lastLog with a placeholder - will be overwritten on first API call
  let lastLog: LogEntry = createLogEntry(
    provider,
    modelId,
    "agentic_init",
    { initializing: true },
    {},
    totalUsage,
  );

  // Prepare tools for the provider
  const toolConfig = TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));

  // Get pending consequences that are READY for AI to potentially trigger
  // These are NOT auto-triggered - AI decides based on story context
  const readyConsequences = db.getReadyConsequences();
  if (readyConsequences.length > 0) {
    const readyList = readyConsequences
      .map(
        (rc) =>
          `- [${rc.chainId}/${rc.consequence.id}] ${rc.consequence.description}${rc.consequence.conditions?.length ? ` (conditions: ${rc.consequence.conditions.join(", ")})` : ""}${rc.consequence.known ? " [player will know]" : " [hidden from player]"}`,
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
    console.log(`[Agentic Loop] Turn ${turnCount + 1}`);

    let result, usage, raw;

    // Convert unified messages to provider-specific format
    const providerContents =
      provider === "gemini"
        ? toGeminiFormat(conversationHistory)
        : toOpenAIFormat(conversationHistory);

    // Retry logic for transient errors like MALFORMED_FUNCTION_CALL
    const maxRetries = 2;
    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount <= maxRetries) {
      try {
        const resultData = await generateContentUnified(
          provider,
          modelId,
          systemInstruction,
          providerContents,
          undefined,
          { tools: toolConfig },
        );

        result = resultData.result;
        usage = resultData.usage;
        raw = resultData.raw;
        console.log(
          `[Agentic Loop] Turn ${turnCount + 1} response received. Usage:`,
          usage,
          `HasFunctionCalls: ${!!result?.functionCalls}`,
        );
        break; // Success, exit retry loop
      } catch (e: any) {
        lastError = e;
        const errorMessage = e?.message || "";

        // Check if this is a retryable error (malformed function call)
        if (
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
        console.error("[Agentic Loop] Error:", e);
        throw e;
      }
    }

    // If we exhausted retries, throw the last error
    if (retryCount > maxRetries && lastError) {
      throw lastError;
    }

    // Update Usage with validation
    if (usage) {
      totalUsage.promptTokens += usage.promptTokens || 0;
      totalUsage.completionTokens += usage.completionTokens || 0;
      totalUsage.totalTokens += usage.totalTokens || 0;
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
        hasToolCalls: !!result?.functionCalls,
        toolCount: result?.functionCalls?.length || 0,
      },
      usage,
    );

    // Handle Tool Calls
    if (result && result.functionCalls) {
      const toolCalls: UnifiedToolCallResult[] = result.functionCalls;

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

        // Query operations
        if (name === "query_inventory") {
          output = db.query("inventory", args.query as string);
        } else if (name === "query_relationships") {
          output = db.query("relationship", args.query as string);
        } else if (name === "query_locations") {
          output = db.query("location", args.query as string);
        } else if (name === "query_quests") {
          output = db.query("quest", args.query as string);
        } else if (name === "query_knowledge") {
          output = db.query("knowledge", args.query as string);
        } else if (name === "query_timeline") {
          output = db.query("timeline", args.query as string);
        } else if (name === "query_causal_chain") {
          output = db.query("causal_chain", args.query as string);
        } else if (name === "query_factions") {
          output = db.query("faction", args.query as string);
        } else if (name === "query_global") {
          output = db.query("global");
        } else if (name === "query_character") {
          output = db.query("character");
        }
        // Modify operations
        // Note: Tool parameters are at top level (not wrapped in 'data')
        // We extract action separately and pass the rest as data
        else if (name === "update_inventory") {
          const { action: actionType, ...data } = args;
          const modifyResult = db.modify(
            "inventory",
            actionType as string,
            data,
          );
          if (modifyResult.success) {
            if (!accumulatedResponse.inventoryActions)
              accumulatedResponse.inventoryActions = [];
            accumulatedResponse.inventoryActions.push({
              action: actionType as "add" | "update" | "remove",
              ...data,
            } as any);
          }
          output = modifyResult;
        } else if (name === "update_relationship") {
          const { action: actionType, ...data } = args;
          const modifyResult = db.modify(
            "relationship",
            actionType as string,
            data,
          );
          if (modifyResult.success) {
            if (!accumulatedResponse.relationshipActions)
              accumulatedResponse.relationshipActions = [];
            accumulatedResponse.relationshipActions.push({
              action: actionType as "add" | "update" | "remove",
              ...data,
            } as any);
          }
          output = modifyResult;
        } else if (name === "update_location") {
          const { action: actionType, ...data } = args;
          const modifyResult = db.modify(
            "location",
            actionType as string,
            data,
          );
          if (modifyResult.success) {
            if (!accumulatedResponse.locationActions)
              accumulatedResponse.locationActions = [];
            accumulatedResponse.locationActions.push({
              type: "known",
              action: actionType as "add" | "update",
              ...data,
            } as any);
          }
          output = modifyResult;
        } else if (name === "update_quest") {
          const { action: actionType, ...data } = args;
          const modifyResult = db.modify("quest", actionType as string, data);
          if (modifyResult.success) {
            if (!accumulatedResponse.questActions)
              accumulatedResponse.questActions = [];
            accumulatedResponse.questActions.push({
              action: actionType as "add" | "update" | "complete" | "fail",
              ...data,
            } as any);
          }
          output = modifyResult;
        } else if (name === "update_knowledge") {
          const { action: actionType, ...data } = args;
          const modifyResult = db.modify(
            "knowledge",
            actionType as string,
            data,
          );
          if (modifyResult.success) {
            if (!accumulatedResponse.knowledgeActions)
              accumulatedResponse.knowledgeActions = [];
            accumulatedResponse.knowledgeActions.push({
              action: actionType as "add" | "update",
              ...data,
            } as any);
          }
          output = modifyResult;
        } else if (name === "update_timeline") {
          const { action: actionType, ...data } = args;
          const modifyResult = db.modify(
            "timeline",
            actionType as string,
            data,
          );
          output = modifyResult;
        } else if (name === "update_causal_chain") {
          const { action: actionType, ...data } = args;
          const modifyResult = db.modify(
            "causal_chain",
            actionType as string,
            data,
          );
          output = modifyResult;
        } else if (name === "update_faction") {
          const { action: actionType, ...data } = args;
          const modifyResult = db.modify("faction", actionType as string, data);
          if (modifyResult.success) {
            if (!accumulatedResponse.factionActions)
              accumulatedResponse.factionActions = [];
            accumulatedResponse.factionActions.push({
              action: actionType as "update",
              ...data,
            } as any);
          }
          output = modifyResult;
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
          output = modifyResult;
        } else if (name === "update_global") {
          const { ...data } = args;
          const modifyResult = db.modify("global", "update", data);
          output = modifyResult;
        } else if (name === "update_character") {
          const modifyResult = db.modify("character", "update", args);
          if (modifyResult.success) {
            accumulatedResponse.characterUpdates = args as any;
          }
          output = modifyResult;
        } else if (name === "finish_turn") {
          // Finalize
          accumulatedResponse.narrative = args.narrative as string;
          accumulatedResponse.choices = args.choices as string[];
          accumulatedResponse.imagePrompt = args.imagePrompt as string;
          accumulatedResponse.generateImage = args.generateImage as boolean;

          // Extract atmosphere (unified system)
          if (args.atmosphere) {
            accumulatedResponse.atmosphere = args.atmosphere as string;
          }
          if (args.narrativeTone) {
            accumulatedResponse.narrativeTone = args.narrativeTone as string;
          }

          // Extract alive entities for next turn context
          if (args.aliveEntities) {
            accumulatedResponse.aliveEntities = args.aliveEntities as any;
          }

          // Extract ending type if story has concluded
          if (args.ending) {
            accumulatedResponse.ending = args.ending as any;
          }

          // Extract forceEnd flag
          if (args.forceEnd !== undefined) {
            accumulatedResponse.forceEnd = args.forceEnd as boolean;
          }

          // Attach the FINAL STATE from the DB
          (accumulatedResponse as any).finalState = db.getState();

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
      // This ensures proper correspondence between tool calls and responses
      conversationHistory.push(createToolResponseMessage(toolResponses));

      turnCount++;
    } else {
      // Fallback for text-only response
      if (result && result.narrative) {
        allLogs.push(lastLog);
        return { response: result, logs: allLogs, usage: totalUsage };
      }

      console.warn("Model returned text instead of tool call:", result);
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

  return { response: accumulatedResponse, logs: allLogs, usage: totalUsage };
};

// ... (Rest of the file)

export const generateSceneImage = async (
  prompt: string,
  context: ImageGenerationContext,
): Promise<{ url: string | null; log: LogEntry }> => {
  const { provider, modelId, enabled, resolution } = getProviderConfig("image");
  if (!enabled)
    return {
      url: null,
      log: createLogEntry("none", "none", "image", { disabled: true }, null),
    };

  const styledPrompt = getSceneImagePrompt(prompt, context);
  let url, usage, raw;

  console.log(
    "Generating image for prompt:",
    styledPrompt,
    "with model:",
    modelId,
    "and resolution:",
    resolution,
  );

  if (provider === "openai") {
    ({ url, usage, raw } = await generateOpenAIImage(
      { ...openaiConfig, modelId },
      modelId,
      styledPrompt,
      resolution,
    ));
  } else if (provider === "openrouter") {
    ({ url, usage, raw } = await generateOpenRouterImage(
      openRouterConfig,
      modelId,
      styledPrompt,
      resolution,
    ));
  } else {
    ({ url, usage, raw } = await generateGeminiImage(
      geminiConfig,
      modelId,
      styledPrompt,
      resolution,
    ));
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
  const payload = {
    segments: segments.map((s) => ({
      id: s.id,
      text: s.text,
      choices: s.choices,
    })),
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
    return result;
  } catch (error) {
    // Fallback: return original
    return payload as any;
  }
};

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

export const generateSpeech = async (
  text: string,
  voiceName?: string,
  narrativeTone?: string,
): Promise<ArrayBuffer | null> => {
  const { provider, modelId, enabled } = getProviderConfig("audio");
  const audioConfig = currentSettings.audio;

  if (!enabled) throw new Error("Disabled");

  // Default options from settings
  const options: any = {
    speed: audioConfig.speed || 1.0,
    format: audioConfig.format || "mp3",
  };

  // Determine target voice
  let targetVoice = voiceName || audioConfig.voice || "alloy";

  // Dynamic Voice Selection based on Tone (if provided and no specific voice forced)
  // Only override if voiceName wasn't explicitly passed (e.g. from a character)
  // If voiceName IS passed, we respect it.
  // If voiceName is NOT passed, we use settings.voice OR dynamic tone.
  if (!voiceName) {
    if (narrativeTone && (provider === "openai" || provider === "openrouter")) {
      const tone = narrativeTone.toLowerCase();
      if (
        tone.includes("suspense") ||
        tone.includes("tense") ||
        tone.includes("danger")
      )
        targetVoice = "onyx";
      else if (
        tone.includes("cheerful") ||
        tone.includes("happy") ||
        tone.includes("energetic")
      )
        targetVoice = "nova";
      else if (
        tone.includes("melancholy") ||
        tone.includes("sad") ||
        tone.includes("quiet")
      )
        targetVoice = "shimmer";
      else if (
        tone.includes("calm") ||
        tone.includes("peaceful") ||
        tone.includes("mystical")
      )
        targetVoice = "alloy";
      else if (tone.includes("royal") || tone.includes("authoritative"))
        targetVoice = "fable";
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
      // Gemini doesn't support speed/format in the same way yet via this provider wrapper,
      // but we pass what we can.
      // We pass narrativeTone as instructions for Gemini's prompt engineering
      const geminiOptions = {
        ...options,
        instructions: narrativeTone, // Pass tone directly
      };

      const { audio } = await generateGeminiSpeech(
        geminiConfig,
        modelId, // This might be "gemini-1.5-flash" from settings, provider will override to TTS model if needed
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
    const { result, log } = await generateContentUnified(
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
