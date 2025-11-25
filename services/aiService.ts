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
  AdventureTurnInput,
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
import { TRANSLATIONS } from "../utils/constants/translations";
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
} from "./prompts";
import { convertJsonSchemaToOpenAI } from "./schemaUtils";
import { TOOLS } from "./tools";

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

const createLogEntry = (
  provider: string,
  model: string,
  endpoint: string,
  req: Record<string, unknown>,
  res: Record<string, unknown>,
  usage?: TokenUsage,
): LogEntry => ({
  id: Date.now().toString() + Math.random().toString(36).substring(7),
  timestamp: Date.now(),
  provider,
  model,
  endpoint,
  request: req,
  response: res,
  usage,
});

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
  tFunc?: (key: string) => string,
  onChunk?: (text: string) => void,
): Promise<{ outline: StoryOutline; log: LogEntry }> => {
  const { provider, modelId } = getProviderConfig("story");

  let themeDataBackgroundTemplate: string;
  let themeDataExample: string;

  if (tFunc) {
    // Use dynamic translation function from React component
    themeDataBackgroundTemplate =
      tFunc(`themes.${theme}.backgroundTemplate`) ||
      tFunc(`themes.fantasy.backgroundTemplate`);
    themeDataExample = tFunc(`themes.${theme}.example`);
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

  // Check for restricted themes (NSFW filter)
  // @ts-ignore
  const isRestricted = THEMES[theme]?.restricted || false;
  if (isRestricted && provider === "gemini") {
    // Gemini has strict safety filters, we might want to warn or adjust
    // For now, we just pass the flag if needed, but generateContentUnified doesn't take it directly
    // We handle safety errors in the provider
  }

  const { result, log } = await generateContentUnified(
    provider,
    modelId,
    "You are a creative writer.",
    [{ role: "user", content: prompt }],
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
  tFunc?: (key: string) => string,
) => {
  let narrativeStyle = "Standard adventure tone.";
  let example: string | undefined;

  if (tFunc && themeKey) {
    narrativeStyle =
      tFunc(`themes.${themeKey}.narrativeStyle`) || narrativeStyle;
    example = tFunc(`themes.${themeKey}.example`);
  } else if (themeKey) {
    const langCode = getLangCode(language);
    const t = TRANSLATIONS[langCode];
    narrativeStyle = t.themes[themeKey]?.narrativeStyle || narrativeStyle;
    example = t.themes[themeKey]?.example;
  }

  const themeConfig = THEMES[themeKey || "fantasy"];
  const isRestricted = themeConfig?.restricted || false;

  return { narrativeStyle, example, isRestricted };
};

const buildSystemContext = (
  language: string,
  narrativeStyle: string,
  example: string | undefined,
  isRestricted: boolean,
  outline: StoryOutline | null,
) => {
  const coreSystemInstruction = getCoreSystemInstruction(
    language,
    narrativeStyle,
    isRestricted,
  );
  const staticWorldContext = getStaticWorldContext(outline);
  return `${coreSystemInstruction}\n\n${staticWorldContext}`;
};

const buildTurnContents = (
  summaries: StorySummary[],
  currentStateContext: string,
  recentHistory: StorySegment[],
  timeline: TimelineEvent[],
  userAction: string,
) => {
  const contents = [];

  // 1. Construct the Context Block
  // This combines Memory (Summaries + Timeline) and Current State (Hints)
  const dynamicStoryContext = getDynamicStoryContext(
    summaries,
    recentHistory,
    timeline,
  );

  const fullContextBlock = `
<game_context>
  ${dynamicStoryContext ? `<story_memory>\n${dynamicStoryContext}\n</story_memory>` : ""}
  <current_state>\n${currentStateContext}\n</current_state>
</game_context>
`;

  // 2. Add History
  // We start with the context block as the first user message, or prepend it to the first history item if it exists.
  // If there is no history, it goes in the first message with the action.

  if (recentHistory.length > 0) {
    // Prepend context to the very first message of the history window we are sending
    // OR send it as a standalone first message. Standalone is cleaner for the model to reference.
    contents.push({
      role: "user",
      parts: [{ text: `[System: Game Context]\n${fullContextBlock}` }],
    });

    // Add recent history turns
    contents.push(
      ...recentHistory.map((seg) => ({
        role: seg.role,
        parts: [{ text: seg.text }],
      })),
    );
  } else {
    // No history, so this is the start. Context goes with the first action.
    // We'll handle the action addition below, so just push context here if we want separate messages,
    // but for the very first turn, it's often better to combine.
    // Let's push it as a separate context message for consistency.
    contents.push({
      role: "user",
      parts: [{ text: `[System: Game Context]\n${fullContextBlock}` }],
    });
  }

  // 3. User Action (if new)
  const userActionAlreadyInHistory = recentHistory.some(
    (seg) => seg.role === "user" && seg.text === userAction,
  );

  if (!userActionAlreadyInHistory) {
    const reinforcement = `
<instruction>
Generate the next turn based on the <game_context> and history.
- Query state first.
- Adhere strictly to the JSON schema.
- Maintain the defined narrative style and tone.
</instruction>
`;
    contents.push({
      role: "user",
      parts: [
        {
          text: `${reinforcement}\n\n<player_action>\n${userAction}\n</player_action>`,
        },
      ],
    });
  }

  return contents;
};

// --- Agentic Loop Implementation ---

export const generateAdventureTurn = async (
  input: AdventureTurnInput,
): Promise<{ response: GameResponse; log: LogEntry; usage: TokenUsage }> => {
  const { provider, modelId } = getProviderConfig("story");
  const { narrativeStyle, example, isRestricted } = resolveThemeConfig(
    input.themeKey,
    input.language,
    input.tFunc,
  );

  const systemInstruction = buildSystemContext(
    input.language,
    narrativeStyle,
    example,
    isRestricted,
    input.outline,
  );

  const contents = buildTurnContents(
    input.summaries,
    getCurrentStateContext(input),
    input.recentHistory,
    input.timeline || [],
    input.userAction,
  );

  return runAgenticLoop(provider, modelId, systemInstruction, contents, input);
};

const runAgenticLoop = async (
  provider: "gemini" | "openai" | "openrouter",
  modelId: string,
  systemInstruction: string,
  initialContents: any[],
  inputState: AdventureTurnInput,
): Promise<{ response: GameResponse; log: LogEntry; usage: TokenUsage }> => {
  let currentContents = [...initialContents];
  let turnCount = 0;
  const maxTurns = 10; // Safety limit

  // Initialize the "Database" with the current state
  // We cast AdventureTurnInput to GameState because they share the same structure for the fields we care about
  // (inventory, relationships, etc.) but we might need to be careful if inputState is missing some GameState fields.
  // Assuming inputState has enough to build a GameState or we just pass what we have.
  // Actually, AdventureTurnInput is NOT a full GameState. It has components.
  // We need to reconstruct a GameState-like object for the DB.
  const initialState: GameState = {
    inventory: inputState.inventory,
    relationships: inputState.relationships,
    quests: inputState.quests,
    locations: inputState.locations,
    currentLocation: inputState.currentLocationId, // Map ID to name/ID
    character: inputState.character,
    knowledge: inputState.knowledge || [],
    factions: inputState.factions || [],
    timeline: inputState.timeline || [],
    causalChains: inputState.causalChains || [],
    time: inputState.time || "Unknown",
    // We need nextIds to generate new IDs. If not passed in input, we might have issues.
    // AdventureTurnInput doesn't seem to have nextIds.
    // We should probably add nextIds to AdventureTurnInput or generate them temporarily.
    // For now, let's assume we can start from a safe high number or random strings if missing.
    nextIds: {
      item: 1000,
      npc: 1000,
      location: 1000,
      quest: 1000,
      knowledge: 1000,
      faction: 1000,
    },
    // Other fields
    nodes: {},
    activeNodeId: "temp-root", // Placeholder
    rootNodeId: "temp-root", // Placeholder
    uiState: {
      inventory: { pinnedIds: [], customOrder: [] },
      locations: { pinnedIds: [], customOrder: [] },
      relationships: { pinnedIds: [], customOrder: [] },
      knowledge: { pinnedIds: [], customOrder: [] },
      sidebarCollapsed: false,
      timelineCollapsed: false,
    },
    outline: null,
    summaries: [],
    lastSummarizedIndex: 0,
    isProcessing: false,
    isImageGenerating: false,
    generatingNodeId: null,
    error: null,
    envTheme: "fantasy",
    theme: "fantasy",
    totalTokens: 0,
    logs: [],
  };

  const db = new GameDatabase(initialState);

  // Accumulated actions for UI feedback (Toasts)
  // We still return these for the UI to show "Item Added", but the STATE is in `finalState`
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
  let lastLog: LogEntry | null = null;

  // Prepare tools for the provider
  const toolConfig = TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));

  while (turnCount < maxTurns) {
    console.log(`[Agentic Loop] Turn ${turnCount + 1}`);

    let result, usage, raw;

    try {
      // Unified generation call for all providers
      // We pass 'undefined' for schema because we want tool calls, not JSON mode (unless tools are not supported, but we assume they are now)
      // If the provider doesn't support tools, it might fail or ignore them.
      const resultData = await generateContentUnified(
        provider,
        modelId,
        systemInstruction,
        currentContents,
        undefined, // No schema
        { tools: toolConfig }, // Pass tools!
      );

      result = resultData.result;
      usage = resultData.usage;
      raw = resultData.raw;
    } catch (e) {
      console.error("Agentic Loop Error", e);
      throw e;
    }

    // Update Usage
    if (usage) {
      totalUsage.promptTokens += usage.promptTokens;
      totalUsage.completionTokens += usage.completionTokens;
      totalUsage.totalTokens += usage.totalTokens;
    }

    lastLog = createLogEntry(
      provider,
      modelId,
      "agentic_turn",
      { systemInstruction, currentContents },
      raw,
      usage,
    );

    // Handle Tool Calls
    if (result && result.functionCalls) {
      const toolCalls = result.functionCalls;

      // Add model's tool call to history
      currentContents.push({
        role: "model",
        parts: toolCalls.map((fc: any) => ({ functionCall: fc })),
      });

      // Execute Tools
      const toolOutputs = [];

      // Parallel Execution Support
      // We execute all tools in the list.
      // Note: modify_state is synchronous in GameDatabase, so "parallel" here just means
      // processing the array of calls returned by the model.
      for (const call of toolCalls) {
        const { name, args } = call;
        console.log(`[Agentic Loop] Tool Call: ${name}`, args);

        let output: unknown = { result: "Tool executed" };

        if (name === "query_inventory") {
          output = db.query("inventory", args.query);
        } else if (name === "query_relationships") {
          output = db.query("relationship", args.query);
        } else if (name === "query_locations") {
          output = db.query("location", args.query);
        } else if (name === "query_quests") {
          output = db.query("quest", args.query);
        } else if (name === "query_knowledge") {
          output = db.query("knowledge", args.query);
        } else if (name === "update_inventory") {
          db.modify("inventory", args.action, args.data);
          if (!accumulatedResponse.inventoryActions)
            accumulatedResponse.inventoryActions = [];
          accumulatedResponse.inventoryActions.push({
            action: args.action,
            ...args.data,
          });
          output = { status: "success", message: "Inventory updated." };
        } else if (name === "update_relationship") {
          db.modify("relationship", args.action, args.data);
          if (!accumulatedResponse.relationshipActions)
            accumulatedResponse.relationshipActions = [];
          accumulatedResponse.relationshipActions.push({
            action: args.action,
            ...args.data,
          });
          output = { status: "success", message: "Relationship updated." };
        } else if (name === "update_location") {
          db.modify("location", args.action, args.data);
          if (!accumulatedResponse.locationActions)
            accumulatedResponse.locationActions = [];
          accumulatedResponse.locationActions.push({
            type: "known",
            action: args.action,
            ...args.data,
          });
          output = { status: "success", message: "Location updated." };
        } else if (name === "update_quest") {
          db.modify("quest", args.action, args.data);
          if (!accumulatedResponse.questActions)
            accumulatedResponse.questActions = [];
          accumulatedResponse.questActions.push({
            action: args.action,
            ...args.data,
          });
          output = { status: "success", message: "Quest updated." };
        } else if (name === "update_knowledge") {
          db.modify("knowledge", args.action, args.data);
          if (!accumulatedResponse.knowledgeActions)
            accumulatedResponse.knowledgeActions = [];
          accumulatedResponse.knowledgeActions.push({
            action: args.action,
            ...args.data,
          });
          output = { status: "success", message: "Knowledge updated." };
        } else if (name === "query_timeline") {
          output = db.query("timeline", args.query);
        } else if (name === "update_timeline") {
          db.modify("timeline", args.action, args.data);
          output = { status: "success", message: "Timeline updated." };
        } else if (name === "query_causal_chain") {
          output = db.query("causal_chain", args.query);
        } else if (name === "update_causal_chain") {
          db.modify("causal_chain", args.action, args.data);
          output = { status: "success", message: "Causal chain updated." };
        } else if (name === "query_factions") {
          output = db.query("faction", args.query);
        } else if (name === "update_faction") {
          db.modify("faction", args.action, args.data);
          if (!accumulatedResponse.factionActions)
            accumulatedResponse.factionActions = [];
          accumulatedResponse.factionActions.push({
            action: args.action,
            ...args.data,
          });
          output = { status: "success", message: "Faction updated." };
        } else if (name === "query_global") {
          output = db.query("global");
        } else if (name === "update_global") {
          db.modify("global", "update", args.data); // Action is ignored for global
          output = { status: "success", message: "Global state updated." };
        } else if (name === "finish_turn") {
          // Finalize
          accumulatedResponse.narrative = args.narrative;
          accumulatedResponse.choices = args.choices;
          accumulatedResponse.imagePrompt = args.imagePrompt;
          accumulatedResponse.generateImage = args.generateImage;

          // Attach the FINAL STATE from the DB
          (accumulatedResponse as any).finalState = db.getState();

          return {
            response: accumulatedResponse,
            log: lastLog,
            usage: totalUsage,
          };
        }

        toolOutputs.push({
          functionResponse: {
            name: name,
            response: { content: output },
          },
        });
      }

      // Add tool outputs to history
      currentContents.push({
        role: "function",
        parts: toolOutputs,
      });

      turnCount++;
    } else {
      // Fallback for text-only response
      if (result.narrative) {
        return { response: result, log: lastLog, usage: totalUsage };
      }

      console.warn("Model returned text instead of tool call:", result);
      return {
        response: {
          ...accumulatedResponse,
          narrative:
            typeof result === "string" ? result : JSON.stringify(result),
          choices: ["Continue"],
        },
        log: lastLog,
        usage: totalUsage,
      };
    }
  }

  return { response: accumulatedResponse, log: lastLog!, usage: totalUsage };
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
