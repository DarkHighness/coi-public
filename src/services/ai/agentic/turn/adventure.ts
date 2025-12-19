import {
  AISettings,
  LogEntry,
  TokenUsage,
  ProviderProtocol,
  ProviderInstance,
  GameState,
  TurnContext,
  StorySegment,
  GameResponse,
} from "../../../../types";

import {
  isContextLengthError,
  isInvalidArgumentError,
  ContextOverflowError,
  HistoryCorruptedError,
} from "../../contextCompressor";

import {
  ToolCallResult,
  MalformedToolCallError,
  ZodToolDefinition,
} from "../../../providers/types";

import { GameDatabase } from "../../../gameDatabase";
import {
  SEARCH_TOOL,
  FINISH_TURN_TOOL,
  COMPLETE_FORCE_UPDATE_TOOL,
  QUERY_STORY_TOOL,
  QUERY_TURN_TOOL,
  findTools,
  getTypedArgs,
  RagSearchParams,
  SearchToolParams,
  // Payload types for GameDatabase
  CharacterAttributePayload,
  CharacterSkillPayload,
  CharacterConditionPayload,
  CharacterTraitPayload,
  CharacterProfilePayload,
} from "../../../tools";
import { getCoreSystemInstruction } from "../../../prompts/index";
import { buildLayeredContext } from "../../../prompts/contextBuilder";

import {
  createUserMessage,
  createToolCallMessage,
  createToolResponseMessage,
  fromGeminiFormat,
  toGeminiFormat,
  UnifiedMessage,
} from "../../../messageTypes";

import { createProvider } from "../../provider/createProvider";

import {
  getProviderConfig,
  createProviderConfig,
  createLogEntry,
  resolveThemeConfig,
  extractJson,
} from "../../utils";

import { buildCacheHint } from "../../provider/cacheHint";
import { callWithAgenticRetry } from "../retry";

// Import Session Manager for internal history tracking
import { sessionManager, SessionConfig } from "../../sessionManager";

// Import prompt injection data
// @ts-ignore
import promptInjectionData from "@/prompt/prompt.toml";

// ============================================================================
// Turn Context and Agentic Loop
// ============================================================================

/**
 * Process finish_turn response data (from tool call or direct schema response)
 * Extracts all fields and populates the accumulated response
 */
export function processFinishTurnResponse(
  finishTurnData: Record<string, unknown>,
  accumulatedResponse: GameResponse,
  db: GameDatabase,
): void {
  // Extract narrative and choices
  accumulatedResponse.narrative = (finishTurnData.narrative as string)
    ?.replace(/\\n/g, "\n")
    .replace(/\\"/g, '"');
  accumulatedResponse.choices =
    finishTurnData.choices as GameResponse["choices"];
  accumulatedResponse.imagePrompt = finishTurnData.imagePrompt as string;

  // Extract atmosphere
  if (finishTurnData.atmosphere) {
    accumulatedResponse.atmosphere =
      finishTurnData.atmosphere as GameResponse["atmosphere"];
  }
  if (finishTurnData.narrativeTone) {
    accumulatedResponse.narrativeTone = finishTurnData.narrativeTone as string;
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

export interface AgenticLoopResult {
  response: GameResponse;
  logs: LogEntry[];
  usage: TokenUsage;
  changedEntities: Array<{ id: string; type: string }>; // Changed entities with their types for efficient RAG updates
  /** Internal conversation history - used by session manager, not exposed to caller */
  _conversationHistory: UnifiedMessage[];
}

/**
 * Build turn messages using the new layered context system.
 *
 * Message structure optimized for prefix caching:
 * 1. System instruction (getCoreSystemInstruction) - in systemInstruction
 * 2. Static context (world outline, character base, entities static) - changes rarely
 * 3. Semi-static context (summaries, entity descriptions) - changes occasionally
 * 4. Dynamic context (current state, recent history) - changes every turn
 * 5. RAG context (if enabled) - changes based on semantic search
 * 6. User action - the actual player input
 *
 * NOTE: This function now builds the INITIAL context only.
 * The actual conversation history is managed by the History Manager.
 */
export const buildInitialContext = (
  layers: ReturnType<typeof buildLayeredContext>,
  ragContext?: string,
): UnifiedMessage[] => {
  const messages: UnifiedMessage[] = [];

  // === 1. Static Layer: World Foundation ===
  if (layers.staticLayer) {
    messages.push(
      createUserMessage(`[CONTEXT: World Foundation]\n${layers.staticLayer}`),
    );
    messages.push({
      role: "assistant",
      content: [{ type: "text", text: "[World foundation acknowledged.]" }],
    });
  }

  // === 2. Semi-Static Layer: Story Background ===
  if (layers.semiStaticLayer) {
    messages.push(
      createUserMessage(
        `[CONTEXT: Story Background]\n${layers.semiStaticLayer}`,
      ),
    );
    messages.push({
      role: "assistant",
      content: [{ type: "text", text: "[Background acknowledged.]" }],
    });
  }

  // === 3. RAG Context (semantic search results) ===
  if (ragContext && ragContext.trim()) {
    messages.push(
      createUserMessage(
        `[CONTEXT: Relevant Lore]\n<semantic_context>\n${ragContext}\n</semantic_context>`,
      ),
    );
    messages.push({
      role: "assistant",
      content: [{ type: "text", text: "[Lore context acknowledged.]" }],
    });
  }

  // === 4. Dynamic Layer: Current Situation ===
  messages.push(
    createUserMessage(`[CONTEXT: Current Situation]\n${layers.dynamicLayer}`),
  );
  messages.push({
    role: "assistant",
    content: [
      {
        type: "text",
        text: "[Current situation acknowledged. Awaiting player action.]",
      },
    ],
  });

  return messages;
};

/**
 * @deprecated Use buildInitialContext instead
 * Kept for backward compatibility
 */
export const buildTurnMessages = (
  layers: ReturnType<typeof buildLayeredContext>,
  userAction: string,
  ragContext?: string,
): {
  messages: UnifiedMessage[];
  staticMessages: UnifiedMessage[];
  dynamicMessages: UnifiedMessage[];
  userMessages: UnifiedMessage[];
  dynamicContext: string;
} => {
  const baseMessages = buildInitialContext(layers, ragContext);
  const userMessages = [createUserMessage(userAction)];

  return {
    messages: [...baseMessages, ...userMessages],
    staticMessages: baseMessages.slice(0, -2), // All except dynamic
    dynamicMessages: baseMessages.slice(-2), // Dynamic layer
    userMessages,
    dynamicContext: layers.dynamicLayer,
  };
};

/**
 * 生成冒险回合
 * @param gameState 游戏状态
 * @param context 回合上下文（必须包含 settings）
 */
export const generateAdventureTurn = async (
  gameState: GameState,
  context: TurnContext,
): Promise<AgenticLoopResult> => {
  if (!context.settings) {
    throw new Error("settings is required in context");
  }
  const settings = context.settings;
  const providerInfo = getProviderConfig(settings, "story");
  if (!providerInfo) {
    throw new Error("Story provider not configured");
  }
  const { instance, modelId } = providerInfo;
  const {
    narrativeStyle,
    backgroundTemplate,
    example,
    worldSetting,
    isRestricted,
  } = resolveThemeConfig(
    context.themeKey,
    context.language,
    context.tFunc as (key: string, options?: Record<string, unknown>) => string,
  );

  // Check if RAG is enabled
  const isRAGEnabled = settings.embedding?.enabled ?? false;

  // Check if provider is Gemini
  const isGemini = instance.protocol === "gemini";

  // ===== NEW: Build system instruction using getCoreSystemInstruction =====
  let systemInstruction = getCoreSystemInstruction(
    context.language,
    narrativeStyle,
    isRestricted,
    settings.extra?.detailedDescription,
    isRAGEnabled,
    isGemini,
    gameState,
    gameState.character.name,
    gameState.character.title,
    gameState.character.currentLocation || "Unknown Location",
    backgroundTemplate,
    example,
    worldSetting,
    settings.extra?.disableImagePrompt,
    gameState.customRules,
    settings.extra?.nsfw,
    settings.extra?.liteMode,
  );

  // Handle prompt injection if enabled
  const promptInjectionEnabled = settings.extra?.promptInjectionEnabled;
  const customPromptInjection = settings.extra?.customPromptInjection?.trim();

  // Custom prompt injection takes priority over model-based injection
  if (customPromptInjection) {
    systemInstruction = `${customPromptInjection}\n\n${systemInstruction}`;
    console.warn(
      `[PromptInjection] Injecting custom prompt (${customPromptInjection.length} chars)`,
    );
  } else if (promptInjectionEnabled && promptInjectionData) {
    const loweredModelId = modelId.toLowerCase();
    console.log(
      `[PromptInjection] Checking for prompts to inject for model ${modelId}`,
    );
    const matchedPrompt = promptInjectionData.prompts.find(
      (p: { keywords: string[] }) =>
        p.keywords.some((k: string) =>
          loweredModelId.includes(k.toLowerCase()),
        ),
    );
    if (matchedPrompt) {
      systemInstruction = `${(matchedPrompt as { prompt: string }).prompt}\n\n${systemInstruction}`;
      console.warn(
        `[PromptInjection] Injecting prompt for model ${modelId} (matched keywords: ${(matchedPrompt as { keywords: string[] }).keywords.join(", ")})`,
      );
    }
  }

  // ===== Build layered context using contextBuilder =====
  const layers = buildLayeredContext({
    outline: gameState.outline,
    gameState,
    godMode: gameState.godMode,
  });

  // Get RAG context from parameter
  const ragContext: string | undefined = context.ragContext;

  // Build messages using layered context
  const buildResult = buildTurnMessages(layers, context.userAction, ragContext);
  const { staticMessages, dynamicMessages, userMessages, dynamicContext } =
    buildResult;

  // Log injected rules and NSFW mode
  const enabledRules = (gameState.customRules || []).filter((r) => r.enabled);
  const nsfwEnabled = settings.extra?.nsfw || false;
  if (enabledRules.length > 0) {
    console.log(
      `[CustomRules] Injected ${enabledRules.length} rules:`,
      enabledRules.map((r) => `[${r.category}] ${r.title}`),
    );
  }
  if (nsfwEnabled) {
    console.warn(`[NSFW] NSFW mode is ENABLED`);
  }

  const generationDetails: LogEntry["generationDetails"] = {
    dynamicContext,
    ragContext,
    systemPrompt: systemInstruction,
    userPrompt: context.userAction,
    injectedRules: enabledRules.map((r) => `[${r.category}] ${r.title}`),
    nsfwEnabled,
  };

  // === SESSION-BASED HISTORY MANAGEMENT ===
  // Create session config - any change automatically invalidates old session
  const sessionConfig: SessionConfig = {
    slotId: context.slotId,
    forkId: gameState.forkId ?? 0,
    providerId: instance.id,
    modelId,
    protocol: instance.protocol,
  };

  // Get or create session (async - may load from IndexedDB)
  const session = await sessionManager.getOrCreateSession(sessionConfig);

  // Cache hint (provider-specific) - derived from system + static prefix
  // If static prefix changes, hint changes as well.
  const cacheHint = buildCacheHint(
    instance.protocol,
    systemInstruction,
    staticMessages,
  );
  sessionManager.setCacheHint(session.id, cacheHint);

  // === SESSION HISTORY MANAGEMENT (New Architecture) ===
  // 1. Check if session is empty (New Session / Overflow Reset)
  const isSessionEmpty = sessionManager.isEmpty(session.id);

  // 2. INITIALIZATION (Inject Context ONLY if empty)
  if (isSessionEmpty) {
    console.log(
      `[Adventure] Session ${session.id} is empty. Initializing context...`,
    );

    // Construct Initial History: [Static] + [Hydrated] + [Dynamic Initial]
    let initialHistory: UnifiedMessage[] = [...staticMessages];

    // Hydration (Recent History)
    if (context.recentHistory && context.recentHistory.length > 0) {
      console.log(
        `[Adventure] Hydrating ${context.recentHistory.length} segments.`,
      );
      const hydratedMessages = context.recentHistory.map((seg) => {
        let role: string = seg.role;

        // Map 'model' and 'system' (narrative) to 'assistant'
        if (role === "model" || role === "system") {
          role = "assistant";
        }
        // Map 'command' to 'user'
        else if (role === "command") {
          role = "user";
        }

        return {
          role: role as "user" | "assistant" | "system",
          content: [{ type: "text" as const, text: seg.text }],
        };
      });
      initialHistory = [...initialHistory, ...hydratedMessages];
    } else {
      // If no recent history, inject Dynamic Layer (Initial State)
      // Note: If we hydrated, the last state is effectively the dynamic state?
      // User said: "Inject World and Current State".
      // Dynamic Layer contains "Current Situation".
      initialHistory = [...initialHistory, ...dynamicMessages];
    }

    // Save Initial History
    const initialHistoryNative: unknown[] =
      instance.protocol === "gemini"
        ? (toGeminiFormat(initialHistory) as unknown[])
        : (initialHistory as unknown[]);
    sessionManager.setHistory(session.id, initialHistoryNative);
  }

  // 3. GET ACTIVE CONTEXT
  // Load current history (which now includes Initial Context if valid)
  const activeHistoryNative = sessionManager.getHistory(session.id);
  let activeHistory: UnifiedMessage[] =
    instance.protocol === "gemini"
      ? fromGeminiFormat(
          activeHistoryNative as Array<{
            role: string;
            parts: Array<{ text?: string }>;
          }>,
        )
      : (activeHistoryNative as UnifiedMessage[]);

  // Sanitize history to ensure no invalid roles (e.g. 'command') exist from previous versions
  activeHistory = activeHistory.map((msg) => {
    if ((msg.role as string) === "command") {
      return { ...msg, role: "user" };
    }
    return msg;
  });

  // === RETRY DETECTION ===
  // Check if the current user action matches the LAST user message in history.
  // If so, this is a "Retry" or "Regenerate" action.
  // We must ROLLBACK the history to remove the previous attempt (User + AI)
  // to avoid [User A, AI A, User A, AI B] duplication.

  if (activeHistory.length > 0) {
    let lastUserIndex = -1;
    // Find last user message from the end
    for (let i = activeHistory.length - 1; i >= 0; i--) {
      if (activeHistory[i].role === "user") {
        lastUserIndex = i;
        break;
      }
    }

    if (lastUserIndex !== -1) {
      const lastUserMsg = activeHistory[lastUserIndex];
      // Compare content text
      const lastUserText =
        lastUserMsg.content.find((p) => p.type === "text")?.text || "";
      // Handle SUDO prefix in comparison if present in history or current action?
      // Usually currentAction has SUDO. History message should match.

      if (lastUserText === context.userAction) {
        console.log(
          `[Adventure] proper Retry detected! Rolling back to last checkpoint.`,
        );

        // Use stack-based rollback implementation
        sessionManager.rollbackToLastCheckpoint(session.id);

        // Refresh activeHistory after rollback to ensure we build on clean state
        const refreshedHistoryNative = sessionManager.getHistory(session.id);
        activeHistory =
          instance.protocol === "gemini"
            ? fromGeminiFormat(
                refreshedHistoryNative as Array<{
                  role: string;
                  parts: Array<{ text?: string }>;
                }>,
              )
            : (refreshedHistoryNative as UnifiedMessage[]);
      }
    }
  }

  // === CHECKPOINT ===
  // Mark the start of this new turn (after potential rollback/hydration)
  sessionManager.checkpoint(session.id);

  // 4. CONSTRUCT REQUEST CONTEXT
  // Request = [Active History] + [User Action]
  // Note: We DO NOT inject static/dynamic messages here again!
  const fullContext = [...activeHistory, ...userMessages];

  // Detect SUDO mode from user action prefix
  const isSudoMode = context.userAction.startsWith("[SUDO]");

  // Run agentic loop (will throw on context overflow)
  try {
    const result = await runAgenticLoop(
      instance.protocol,
      instance,
      modelId,
      systemInstruction,
      fullContext,
      gameState,
      generationDetails,
      context.settings,
      isSudoMode,
      session.id,
    );

    // 5. APPEND NEW MESSAGES (Update)
    // We only want to save the DELTA (User Action + AI Responses/ToolCalls)
    // The `result._conversationHistory` contains EVERYTHING (Old + New).
    // We need to extract the new part.
    // Strategy: The prompt was `fullContext` = `activeHistory` + `userMessages`.
    // The result history starts with `fullContext`.
    // So new messages are everything AFTER `activeHistory`.
    // Wait, `fullContext` includes `userMessages`.
    // So `Delta` = `UserMessages` + `AI generated messages`.

    // Calculate start index for new messages
    // It should be equal to activeHistory.length
    const newMessages = result._conversationHistory.slice(activeHistory.length);

    console.log(
      `[Adventure] Appending ${newMessages.length} new messages to history.`,
    );

    // Append to Session
    const newMessagesNative: unknown[] =
      instance.protocol === "gemini"
        ? (toGeminiFormat(newMessages) as unknown[])
        : (newMessages as unknown[]);
    sessionManager.appendHistory(session.id, newMessagesNative);

    return result;
  } catch (e: any) {
    if (isContextLengthError(e)) {
      // Context overflow - notify session manager and let caller handle
      await sessionManager.onContextOverflow(session.id);
      throw new Error("CONTEXT_LENGTH_EXCEEDED: " + e.message);
    }
    throw e;
  }
};

/**
 * Agentic Loop with Staged Tool Execution
 *
 * Stages:
 * 1. QUERY - Query tools + RAG search + next_stage + finish_turn
 * 2. ADD - Add tools + next_stage + finish_turn
 * 3. REMOVE - Remove tools + next_stage + finish_turn
 * 4. UPDATE - Update tools + next_stage + finish_turn
 * 5. NARRATIVE - finish_turn only
 *
 * Key changes from turn-based to stage-based:
 * - maxStages instead of maxTurns (stage transitions are the limit)
 * - AI can jump to any stage via next_stage(target)
 * - AI can finish early from ANY stage via finish_turn
 * - nextInitialStage in finish_turn suggests starting stage for next player turn
 */
/**
 * Agentic Loop with Dynamic Tool Loading (Search-based)
 *
 * Logic:
 * 1. Start with minimal tools (SEARCH_TOOL, FINISH_TURN_TOOL, basic queries).
 * 2. Model uses SEARCH_TOOL to request more tools (e.g., "add:inventory").
 * 3. System finds tools, adds to active set, and returns confirmation.
 * 4. Model uses new tools.
 * 5. Model calls FINISH_TURN_TOOL when done.
 */
export const runAgenticLoop = async (
  protocol: ProviderProtocol,
  instance: ProviderInstance,
  modelId: string,
  systemInstruction: string,
  initialContents: UnifiedMessage[],
  inputState: GameState,
  generationDetails: LogEntry["generationDetails"] | undefined,
  settings: AISettings,
  isSudoMode: boolean = false,
  _sessionId?: string, // Session ID for future native format storage
): Promise<AgenticLoopResult> => {
  const provider = _sessionId
    ? sessionManager.getProvider(_sessionId, instance)
    : createProvider(instance);
  let conversationHistory: UnifiedMessage[] = [...initialContents];

  // Token/Turn limits - use settings or defaults
  let loopIterations = 0;
  const maxLoopIterations = settings.extra?.maxAgenticRounds ?? 20; // Configurable, default 20
  const maxErrorRetries = settings.extra?.maxErrorRetries ?? 3; // Configurable, default 3

  const allLogs: LogEntry[] = [];

  const db = new GameDatabase({
    ...inputState,
    knowledge: inputState.knowledge || [],
    factions: inputState.factions || [],
    timeline: inputState.timeline || [],
    causalChains: inputState.causalChains || [],
    time: inputState.time || "Unknown",
  });

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

  const changedEntities: Map<string, string> = new Map();

  let totalUsage: TokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };

  const isRAGEnabled = settings.embedding?.enabled ?? false;

  // Initial Tools Set - use complete_force_update for SUDO mode, finish_turn otherwise
  let activeTools: ZodToolDefinition[] = [
    SEARCH_TOOL,
    isSudoMode ? COMPLETE_FORCE_UPDATE_TOOL : FINISH_TURN_TOOL,
    QUERY_STORY_TOOL,
    QUERY_TURN_TOOL, // Essential for context
  ];

  // If RAG enabled, add RAG tool? Or make it searchable?
  if (isRAGEnabled) {
    const ragTools = findTools("query", "rag_search");
    if (ragTools.length > 0) {
      activeTools.push(ragTools[0]);
    }
  }

  // Inject ready consequences
  const readyConsequences = db.getReadyConsequences();
  if (readyConsequences.length > 0) {
    const readyList = readyConsequences
      .map(
        (rc) =>
          `- [${rc.chainId}/${rc.consequence.id}] ${rc.consequence.description}${
            rc.consequence.conditions?.length
              ? ` (conditions: ${rc.consequence.conditions.join(", ")})`
              : ""
          }${rc.consequence.known ? " [player will know]" : " [hidden]"}`,
      )
      .join("\n");

    conversationHistory.push(
      createUserMessage(
        `[SYSTEM: PENDING CONSEQUENCES]\nReady to trigger:\n${readyList}\n\nSearch for 'update:causal_chain' to trigger these.`,
      ),
    );
  }

  // Initial System Instruction for Tool Usage
  const finishToolName = isSudoMode ? "complete_force_update" : "finish_turn";

  if (isSudoMode) {
    // SUDO mode specific instruction
    conversationHistory.push(
      createUserMessage(`[SYSTEM: FORCE UPDATE MODE (/sudo)]
This is a **GM COMMAND**. You must:
1. **IMMEDIATELY** execute the [SUDO] command - bypass all simulation rules, logic, and consistency checks.
2. Use \`search_tool\` to load any tools you need for state changes.
3. Apply changes with absolute authority - if the command contradicts existing lore, **OVERWRITE IT**.
4. Call \`complete_force_update\` with narrative describing the new reality and choices.
`),
    );
  } else {
    // Normal turn instruction
    conversationHistory.push(
      createUserMessage(`[SYSTEM: TOOL USAGE INSTRUCTION]
You are in AGENTIC MODE.
1. You have limited tools initially: \`search_tool\` and \`${finishToolName}\`.
2. **SEARCH FIRST**: If you need to ADD, UPDATE, REMOVE, QUERY, or UNLOCK specific entities, use \`search_tool\` to load them.
3. **USE TOOLS**: Once loaded, use the tools to modify the game state.
4. **FINISH**: When done, use \`${finishToolName}\` with narrative and choices.
`),
    );
  }

  while (loopIterations < maxLoopIterations) {
    console.log(
      `[Agentic Loop] Iteration: ${loopIterations + 1}, Active Tools: ${activeTools.length}`,
    );

    const toolConfig = activeTools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters as any, // Cast to avoid Zod type mismatch
    }));

    let result: any;
    let usage: TokenUsage;

    let effectiveSchema = undefined;

    // Inner Retry Loop: Use callWithAgenticRetry
    try {
      const storyCfg = settings.story;
      const effectiveToolChoice = _sessionId
        ? sessionManager.getEffectiveToolChoice(
            _sessionId,
            "required",
            settings.extra?.forceAutoToolChoice,
          )
        : "auto";

      const resp = await callWithAgenticRetry(
        provider,
        {
          modelId,
          systemInstruction,
          messages: [], // Overwritten by callWithAgenticRetry
          schema: effectiveSchema,
          tools: toolConfig,
          toolChoice: effectiveToolChoice,
          thinkingLevel: storyCfg?.thinkingLevel,
          mediaResolution: storyCfg?.mediaResolution,
          temperature: storyCfg?.temperature,
          topP: storyCfg?.topP,
          topK: storyCfg?.topK,
          minP: storyCfg?.minP,
        },
        conversationHistory,
        {
          maxRetries: maxErrorRetries,
          onRetry: (err, count) => {
            console.warn(`[Agentic Loop] Retry ${count} due to: ${err}`);
          },
        },
      );

      result = resp.result;
      usage = resp.usage;
      console.log(
        `[Agentic Loop] Iteration ${loopIterations} response after ${resp.retries} retries.`,
      );
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));

      if (isContextLengthError(error)) {
        // Context overflow - throw to trigger History rebuild
        console.warn(
          `[Agentic Loop] Context length error. Triggering rebuild...`,
        );
        throw new ContextOverflowError(error);
      }

      if (isInvalidArgumentError(error)) {
        // Invalid argument (corrupted history) - throw to trigger History rebuild
        console.warn(
          `[Agentic Loop] Invalid argument error. Triggering history rebuild...`,
        );
        throw new HistoryCorruptedError(error);
      }

      throw error;
    }

    if (usage!) {
      totalUsage.promptTokens += usage!.promptTokens || 0;
      totalUsage.completionTokens += usage!.completionTokens || 0;
      totalUsage.totalTokens += usage!.totalTokens || 0;
    }

    // Parse output
    const text = (result as any).text || (result as any).content || "";
    const functionCalls = (result as any).functionCalls as
      | ToolCallResult[]
      | undefined;

    // Record Assistant Message
    if (functionCalls && functionCalls.length > 0) {
      conversationHistory.push(
        createToolCallMessage(
          functionCalls.map((fc) => ({
            id: fc.id || `call_${Math.random().toString(36).substr(2, 9)}`,
            name: fc.name,
            arguments: fc.args,
            thoughtSignature: fc.thoughtSignature, // Include for Gemini 3 models
          })),
          text,
        ),
      );
    } else if (text) {
      conversationHistory.push({
        role: "assistant",
        content: [{ type: "text", text: text }],
      });
    }

    // If no tool calls, model might be chatting. Remind it explicitly to use tools.
    if (!functionCalls || functionCalls.length === 0) {
      if (text.length > 0) {
        conversationHistory.push(
          createUserMessage(
            `[ERROR: NO_TOOL_CALL] You provided text but failed to invoke any tools. In this agentic loop, you MUST call at least one tool to progress. Use \`search_tool\` to load more state or \`${finishToolName}\` to finalize the narrative. Bare text is not allowed.`,
          ),
        );
        loopIterations++;
        continue;
      }
    }

    // Process Tool Calls
    let turnFinished = false;

    if (functionCalls) {
      const toolResponses: {
        toolCallId: string;
        name: string;
        content: unknown;
      }[] = [];

      for (const call of functionCalls) {
        let output: unknown;
        try {
          // SPECIAL HANDLE: search_tool
          if (call.name === "search_tool") {
            const params = call.args as SearchToolParams;
            const addedTools: string[] = [];

            if (params.queries) {
              for (const q of params.queries) {
                const found = findTools(q.operation, q.entity);
                for (const tool of found) {
                  if (!activeTools.some((t) => t.name === tool.name)) {
                    activeTools.push(tool);
                    addedTools.push(tool.name);
                  }
                }
              }
            }

            output = `Found and activated tools: ${addedTools.join(", ") || "None (maybe already active?)"}`;
          }
          // SPECIAL HANDLE: finish_turn or complete_force_update
          else if (
            call.name === "finish_turn" ||
            call.name === "complete_force_update"
          ) {
            // Validate
            try {
              // Note: safeValidateToolArgs might throw
              processFinishTurnResponse(call.args, accumulatedResponse, db);
              output =
                call.name === "complete_force_update"
                  ? "Force update completed. State captured."
                  : "Turn finished. State captured.";
              turnFinished = true;
            } catch (err: any) {
              output = `Error finishing turn: ${err.message}`;
            }
          }
          // STANDARD HANDLE
          else {
            output = executeToolCall(
              call.name,
              call.args,
              db,
              accumulatedResponse,
              changedEntities,
              inputState,
              settings,
            );
          }
        } catch (err: any) {
          output = `Tool execution failed: ${err.message}`;
        }

        toolResponses.push({
          toolCallId: call.id || "unknown",
          name: call.name,
          content: output,
        });

        // Log tool usage
        allLogs.push(
          createLogEntry(
            protocol,
            modelId,
            "tool_execution",
            { tool: call.name, args: call.args, output },
            {},
          ),
        );
      }

      conversationHistory.push(createToolResponseMessage(toolResponses));
    }

    if (turnFinished) {
      break;
    }

    loopIterations++;
  }

  // After loop - return the FULL conversation history for session manager
  return {
    response: accumulatedResponse,
    logs: allLogs,
    usage: totalUsage,
    changedEntities: Array.from(changedEntities.entries()).map(
      ([id, type]) => ({ id, type }),
    ),
    _conversationHistory: conversationHistory, // Internal: stored by session manager
  };
};

// ============================================================================
// Tool Execution
// ============================================================================

/**
 * Helper to track changed entities
 */
function trackChangedEntity(
  changedEntities: Map<string, string> | undefined,
  result: { success: boolean; data?: unknown },
  entityType: string,
): void {
  if (
    changedEntities &&
    result.success &&
    result.data &&
    typeof result.data === "object" &&
    result.data !== null &&
    "id" in result.data
  ) {
    const entity = result.data as { id: string };
    changedEntities.set(entity.id, entityType);
  }
}

/**
 * Execute tool calls for the staged agentic loop
 * Supports both new separated tools (add_*, remove_*, update_*) and legacy combined tools
 */
export function executeToolCall(
  name: string,
  args: Record<string, unknown>,
  db: GameDatabase,
  accumulatedResponse: GameResponse,
  changedEntities?: Map<string, string>,
  gameState?: GameState,
  settings?: AISettings,
): unknown {
  // ============================================================================
  // STORY MEMORY QUERY TOOLS
  // ============================================================================
  if (name === "query_story") {
    return executeQueryStory(args, gameState);
  }
  if (name === "query_turn") {
    return executeQueryTurn(gameState);
  }
  if (name === "query_summary") {
    return executeQuerySummary(args, gameState);
  }
  if (name === "query_recent_context") {
    return executeQueryRecentContext(args, gameState, settings);
  }

  // ============================================================================
  // LIST TOOL
  // ============================================================================
  if (name === "list") {
    const typedArgs = getTypedArgs("list", args);
    return db.list(
      typedArgs.type,
      typedArgs.page,
      typedArgs.limit,
      typedArgs.search,
    );
  }

  // ============================================================================
  // ENTITY QUERY TOOLS
  // ============================================================================
  if (name === "query_inventory") {
    return db.query("inventory", args.query as string);
  }
  if (name === "query_relationships") {
    return db.query("relationship", args.query as string);
  }
  if (name === "query_locations") {
    return db.query("location", args.query as string);
  }
  if (name === "query_quests") {
    return db.query("quest", args.query as string);
  }
  if (name === "query_knowledge") {
    return db.query("knowledge", args.query as string);
  }
  if (name === "query_timeline") {
    return db.query("timeline", args.query as string);
  }
  if (name === "query_causal_chain") {
    return db.query("causal_chain", args.query as string);
  }
  if (name === "query_factions") {
    return db.query("faction", args.query as string);
  }
  if (name === "query_global") {
    return db.query("global");
  }
  // Character query tools
  if (name === "query_character_profile") {
    return db.query("character", "profile");
  }
  if (name === "query_character_attributes") {
    const typedArgs = getTypedArgs("query_character_attributes", args);
    return db.query("character", "attributes", typedArgs.name ?? undefined);
  }
  if (name === "query_character_skills") {
    const typedArgs = getTypedArgs("query_character_skills", args);
    return db.query("character", "skills", typedArgs.query ?? undefined);
  }
  if (name === "query_character_conditions") {
    const typedArgs = getTypedArgs("query_character_conditions", args);
    return db.query("character", "conditions", typedArgs.query ?? undefined);
  }
  if (name === "query_character_traits") {
    const typedArgs = getTypedArgs("query_character_traits", args);
    return db.query("character", "hiddenTraits", typedArgs.query ?? undefined);
  }
  // RAG search
  if (name === "rag_search") {
    const typedArgs = getTypedArgs("rag_search", args);
    return executeRagSearch(typedArgs, db);
  }

  // ============================================================================
  // ADD TOOLS
  // ============================================================================
  if (name === "add_inventory") {
    const typedArgs = getTypedArgs("add_inventory", args);
    const result = db.modify("inventory", "add", typedArgs);
    if (result.success) {
      if (!accumulatedResponse.inventoryActions)
        accumulatedResponse.inventoryActions = [];
      accumulatedResponse.inventoryActions.push({
        action: "add",
        ...typedArgs,
      } as GameResponse["inventoryActions"][number]);
      trackChangedEntity(changedEntities, result, "item");
    }
    return result;
  }
  if (name === "add_relationship") {
    const typedArgs = getTypedArgs("add_relationship", args);
    const result = db.modify("relationship", "add", typedArgs);
    if (result.success) {
      if (!accumulatedResponse.relationshipActions)
        accumulatedResponse.relationshipActions = [];
      accumulatedResponse.relationshipActions.push({
        action: "add",
        ...typedArgs,
      } as GameResponse["relationshipActions"][number]);
      trackChangedEntity(changedEntities, result, "npc");
    }
    return result;
  }
  if (name === "add_location") {
    const typedArgs = getTypedArgs("add_location", args);
    const result = db.modify("location", "add", typedArgs);
    if (result.success) {
      if (!accumulatedResponse.locationActions)
        accumulatedResponse.locationActions = [];
      accumulatedResponse.locationActions.push({
        type: "known",
        action: "add",
        ...typedArgs,
      } as GameResponse["locationActions"][number]);
      trackChangedEntity(changedEntities, result, "location");
    }
    return result;
  }
  if (name === "add_quest") {
    const typedArgs = getTypedArgs("add_quest", args);
    const result = db.modify("quest", "add", typedArgs);
    if (result.success) {
      if (!accumulatedResponse.questActions)
        accumulatedResponse.questActions = [];
      accumulatedResponse.questActions.push({
        action: "add",
        ...typedArgs,
      } as GameResponse["questActions"][number]);
      trackChangedEntity(changedEntities, result, "quest");
    }
    return result;
  }
  if (name === "add_knowledge") {
    const typedArgs = getTypedArgs("add_knowledge", args);
    const result = db.modify("knowledge", "add", typedArgs);
    if (result.success) {
      if (!accumulatedResponse.knowledgeActions)
        accumulatedResponse.knowledgeActions = [];
      accumulatedResponse.knowledgeActions.push({
        action: "add",
        ...typedArgs,
      } as GameResponse["knowledgeActions"][number]);
      trackChangedEntity(changedEntities, result, "knowledge");
    }
    return result;
  }
  if (name === "add_timeline") {
    const typedArgs = getTypedArgs("add_timeline", args);
    const result = db.modify("timeline", "add", typedArgs);
    trackChangedEntity(changedEntities, result, "event");
    return result;
  }
  if (name === "add_faction") {
    const typedArgs = getTypedArgs("add_faction", args);
    const result = db.modify("faction", "add", typedArgs);
    if (result.success) {
      if (!accumulatedResponse.factionActions)
        accumulatedResponse.factionActions = [];
      accumulatedResponse.factionActions.push({
        action: "add",
        ...typedArgs,
      } as GameResponse["factionActions"][number]);
      trackChangedEntity(changedEntities, result, "faction");
    }
    return result;
  }
  if (name === "add_causal_chain") {
    const typedArgs = getTypedArgs("add_causal_chain", args);
    return db.modify("causal_chain", "add", typedArgs);
  }
  // Character add tools - using strongly typed payloads
  if (name === "add_character_attribute") {
    const typedArgs = getTypedArgs("add_character_attribute", args);
    const payload: CharacterAttributePayload = {
      attributes: [{ action: "add", ...typedArgs }],
    };
    const result = db.modify("character", "add_attribute", payload);
    if (result.success) {
      if (!accumulatedResponse.characterUpdates)
        accumulatedResponse.characterUpdates = {};
      if (!accumulatedResponse.characterUpdates.attributes)
        accumulatedResponse.characterUpdates.attributes = [];
      accumulatedResponse.characterUpdates.attributes.push({
        action: "add",
        ...typedArgs,
      });
    }
    return result;
  }
  if (name === "add_character_skill") {
    const typedArgs = getTypedArgs("add_character_skill", args);
    const payload: CharacterSkillPayload = {
      skills: [{ action: "add", ...typedArgs }],
    };
    const result = db.modify("character", "add_skill", payload);
    if (result.success) {
      if (!accumulatedResponse.characterUpdates)
        accumulatedResponse.characterUpdates = {};
      if (!accumulatedResponse.characterUpdates.skills)
        accumulatedResponse.characterUpdates.skills = [];
      accumulatedResponse.characterUpdates.skills.push({
        action: "add",
        ...typedArgs,
      });
    }
    return result;
  }
  if (name === "add_character_condition") {
    const typedArgs = getTypedArgs("add_character_condition", args);
    const payload: CharacterConditionPayload = {
      conditions: [{ action: "add", ...typedArgs }],
    };
    const result = db.modify("character", "add_condition", payload);
    if (result.success) {
      if (!accumulatedResponse.characterUpdates)
        accumulatedResponse.characterUpdates = {};
      if (!accumulatedResponse.characterUpdates.conditions)
        accumulatedResponse.characterUpdates.conditions = [];
      accumulatedResponse.characterUpdates.conditions.push({
        action: "add",
        ...typedArgs,
      });
    }
    return result;
  }
  if (name === "add_character_trait") {
    const typedArgs = getTypedArgs("add_character_trait", args);
    const payload: CharacterTraitPayload = {
      hiddenTraits: [{ action: "add", ...typedArgs }],
    };
    const result = db.modify("character", "add_trait", payload);
    if (result.success) {
      if (!accumulatedResponse.characterUpdates)
        accumulatedResponse.characterUpdates = {};
      if (!accumulatedResponse.characterUpdates.hiddenTraits)
        accumulatedResponse.characterUpdates.hiddenTraits = [];
      accumulatedResponse.characterUpdates.hiddenTraits.push({
        action: "add",
        ...typedArgs,
      });
    }
    return result;
  }

  // ============================================================================
  // REMOVE TOOLS
  // ============================================================================
  if (name === "remove_inventory") {
    const typedArgs = getTypedArgs("remove_inventory", args);
    const result = db.modify("inventory", "remove", typedArgs);
    if (result.success) {
      if (!accumulatedResponse.inventoryActions)
        accumulatedResponse.inventoryActions = [];
      accumulatedResponse.inventoryActions.push({
        action: "remove",
        ...typedArgs,
      } as GameResponse["inventoryActions"][number]);
    }
    return result;
  }
  if (name === "remove_relationship") {
    const typedArgs = getTypedArgs("remove_relationship", args);
    const result = db.modify("relationship", "remove", typedArgs);
    if (result.success) {
      if (!accumulatedResponse.relationshipActions)
        accumulatedResponse.relationshipActions = [];
      accumulatedResponse.relationshipActions.push({
        action: "remove",
        ...typedArgs,
      } as GameResponse["relationshipActions"][number]);
    }
    return result;
  }
  if (name === "remove_location") {
    const typedArgs = getTypedArgs("remove_location", args);
    const result = db.modify("location", "remove", typedArgs);
    if (result.success) {
      if (!accumulatedResponse.locationActions)
        accumulatedResponse.locationActions = [];
      accumulatedResponse.locationActions.push({
        type: "known",
        action: "remove",
        ...typedArgs,
      } as GameResponse["locationActions"][number]);
    }
    return result;
  }
  if (name === "remove_quest") {
    const typedArgs = getTypedArgs("remove_quest", args);
    const result = db.modify("quest", "remove", typedArgs);
    if (result.success) {
      if (!accumulatedResponse.questActions)
        accumulatedResponse.questActions = [];
      accumulatedResponse.questActions.push({
        action: "remove",
        ...typedArgs,
      } as GameResponse["questActions"][number]);
    }
    return result;
  }
  if (name === "remove_faction") {
    const typedArgs = getTypedArgs("remove_faction", args);
    const result = db.modify("faction", "remove", typedArgs);
    if (result.success) {
      if (!accumulatedResponse.factionActions)
        accumulatedResponse.factionActions = [];
      accumulatedResponse.factionActions.push({
        action: "remove",
        ...typedArgs,
      } as GameResponse["factionActions"][number]);
    }
    return result;
  }
  // Character remove tools - using strongly typed payloads
  if (name === "remove_character_attribute") {
    const typedArgs = getTypedArgs("remove_character_attribute", args);
    const payload: CharacterAttributePayload = {
      attributes: [{ action: "remove", ...typedArgs }],
    };
    const result = db.modify("character", "remove_attribute", payload);
    if (result.success) {
      if (!accumulatedResponse.characterUpdates)
        accumulatedResponse.characterUpdates = {};
      if (!accumulatedResponse.characterUpdates.attributes)
        accumulatedResponse.characterUpdates.attributes = [];
      accumulatedResponse.characterUpdates.attributes.push({
        action: "remove",
        ...typedArgs,
      });
    }
    return result;
  }
  if (name === "remove_character_skill") {
    const typedArgs = getTypedArgs("remove_character_skill", args);
    const payload: CharacterSkillPayload = {
      skills: [{ action: "remove", ...typedArgs }],
    };
    const result = db.modify("character", "remove_skill", payload);
    if (result.success) {
      if (!accumulatedResponse.characterUpdates)
        accumulatedResponse.characterUpdates = {};
      if (!accumulatedResponse.characterUpdates.skills)
        accumulatedResponse.characterUpdates.skills = [];
      accumulatedResponse.characterUpdates.skills.push({
        action: "remove",
        ...typedArgs,
      });
    }
    return result;
  }
  if (name === "remove_character_condition") {
    const typedArgs = getTypedArgs("remove_character_condition", args);
    const payload: CharacterConditionPayload = {
      conditions: [{ action: "remove", ...typedArgs }],
    };
    const result = db.modify("character", "remove_condition", payload);
    if (result.success) {
      if (!accumulatedResponse.characterUpdates)
        accumulatedResponse.characterUpdates = {};
      if (!accumulatedResponse.characterUpdates.conditions)
        accumulatedResponse.characterUpdates.conditions = [];
      accumulatedResponse.characterUpdates.conditions.push({
        action: "remove",
        ...typedArgs,
      });
    }
    return result;
  }
  if (name === "remove_character_trait") {
    const typedArgs = getTypedArgs("remove_character_trait", args);
    const payload: CharacterTraitPayload = {
      hiddenTraits: [{ action: "remove", ...typedArgs }],
    };
    const result = db.modify("character", "remove_trait", payload);
    if (result.success) {
      if (!accumulatedResponse.characterUpdates)
        accumulatedResponse.characterUpdates = {};
      if (!accumulatedResponse.characterUpdates.hiddenTraits)
        accumulatedResponse.characterUpdates.hiddenTraits = [];
      accumulatedResponse.characterUpdates.hiddenTraits.push({
        action: "remove",
        ...typedArgs,
      });
    }
    return result;
  }

  // ============================================================================
  // UPDATE TOOLS
  // ============================================================================
  if (name === "update_inventory") {
    const typedArgs = getTypedArgs("update_inventory", args);
    const result = db.modify("inventory", "update", typedArgs);
    if (result.success) {
      if (!accumulatedResponse.inventoryActions)
        accumulatedResponse.inventoryActions = [];
      accumulatedResponse.inventoryActions.push({
        action: "update",
        ...typedArgs,
      } as GameResponse["inventoryActions"][number]);
      trackChangedEntity(changedEntities, result, "item");
    }
    return result;
  }
  if (name === "update_relationship") {
    const typedArgs = getTypedArgs("update_relationship", args);
    const result = db.modify("relationship", "update", typedArgs);
    if (result.success) {
      if (!accumulatedResponse.relationshipActions)
        accumulatedResponse.relationshipActions = [];
      accumulatedResponse.relationshipActions.push({
        action: "update",
        ...typedArgs,
      } as GameResponse["relationshipActions"][number]);
      trackChangedEntity(changedEntities, result, "npc");
    }
    return result;
  }
  if (name === "update_location") {
    const typedArgs = getTypedArgs("update_location", args);
    const result = db.modify("location", "update", typedArgs);
    if (result.success) {
      if (!accumulatedResponse.locationActions)
        accumulatedResponse.locationActions = [];
      accumulatedResponse.locationActions.push({
        type: "known",
        action: "update",
        ...typedArgs,
      } as GameResponse["locationActions"][number]);
      trackChangedEntity(changedEntities, result, "location");
    }
    return result;
  }
  if (name === "update_quest") {
    const typedArgs = getTypedArgs("update_quest", args);
    const result = db.modify("quest", "update", typedArgs);
    if (result.success) {
      if (!accumulatedResponse.questActions)
        accumulatedResponse.questActions = [];
      accumulatedResponse.questActions.push({
        action: "update",
        ...typedArgs,
      } as GameResponse["questActions"][number]);
      trackChangedEntity(changedEntities, result, "quest");
    }
    return result;
  }
  if (name === "complete_quest") {
    const typedArgs = getTypedArgs("complete_quest", args);
    const result = db.modify("quest", "complete", typedArgs);
    if (result.success) {
      if (!accumulatedResponse.questActions)
        accumulatedResponse.questActions = [];
      accumulatedResponse.questActions.push({
        action: "complete",
        ...typedArgs,
      } as GameResponse["questActions"][number]);
    }
    return result;
  }
  if (name === "fail_quest") {
    const typedArgs = getTypedArgs("fail_quest", args);
    const result = db.modify("quest", "fail", typedArgs);
    if (result.success) {
      if (!accumulatedResponse.questActions)
        accumulatedResponse.questActions = [];
      accumulatedResponse.questActions.push({
        action: "fail",
        ...typedArgs,
      } as GameResponse["questActions"][number]);
    }
    return result;
  }
  if (name === "update_knowledge") {
    const typedArgs = getTypedArgs("update_knowledge", args);
    const result = db.modify("knowledge", "update", typedArgs);
    if (result.success) {
      if (!accumulatedResponse.knowledgeActions)
        accumulatedResponse.knowledgeActions = [];
      accumulatedResponse.knowledgeActions.push({
        action: "update",
        ...typedArgs,
      } as GameResponse["knowledgeActions"][number]);
      trackChangedEntity(changedEntities, result, "knowledge");
    }
    return result;
  }
  if (name === "update_timeline") {
    const typedArgs = getTypedArgs("update_timeline", args);
    const result = db.modify("timeline", "update", typedArgs);
    trackChangedEntity(changedEntities, result, "event");
    return result;
  }
  if (name === "update_faction") {
    const typedArgs = getTypedArgs("update_faction", args);
    const result = db.modify("faction", "update", typedArgs);
    if (result.success) {
      if (!accumulatedResponse.factionActions)
        accumulatedResponse.factionActions = [];
      accumulatedResponse.factionActions.push({
        action: "update",
        ...typedArgs,
      } as GameResponse["factionActions"][number]);
      trackChangedEntity(changedEntities, result, "faction");
    }
    return result;
  }
  // Causal chain tools
  if (name === "update_causal_chain") {
    const typedArgs = getTypedArgs("update_causal_chain", args);
    return db.modify("causal_chain", "update", typedArgs);
  }
  if (name === "trigger_causal_chain") {
    const typedArgs = getTypedArgs("trigger_causal_chain", args);
    return db.modify("causal_chain", "trigger", typedArgs);
  }
  if (name === "resolve_causal_chain") {
    const typedArgs = getTypedArgs("resolve_causal_chain", args);
    return db.modify("causal_chain", "resolve", typedArgs);
  }
  if (name === "interrupt_causal_chain") {
    const typedArgs = getTypedArgs("interrupt_causal_chain", args);
    return db.modify("causal_chain", "interrupt", typedArgs);
  }
  // World info
  if (name === "update_world_info") {
    const typedArgs = getTypedArgs("update_world_info", args);
    const result = db.modify("world_info", "update", {
      unlockWorldSetting: typedArgs.unlockWorldSetting,
      unlockMainGoal: typedArgs.unlockMainGoal,
      reason: typedArgs.reason,
    });
    if (result.success) {
      if (!accumulatedResponse.worldInfoUpdates)
        accumulatedResponse.worldInfoUpdates = [];
      accumulatedResponse.worldInfoUpdates.push({
        unlockWorldSetting: typedArgs.unlockWorldSetting,
        unlockMainGoal: typedArgs.unlockMainGoal,
        reason: typedArgs.reason,
      });
    }
    return result;
  }
  // Global state
  if (name === "update_global") {
    const typedArgs = getTypedArgs("update_global", args);
    return db.modify("global", "update", typedArgs);
  }
  // Character profile update
  if (name === "update_character_profile") {
    const typedArgs = getTypedArgs("update_character_profile", args);
    const payload: CharacterProfilePayload = { profile: typedArgs };
    const result = db.modify("character", "update_profile", payload);
    if (result.success) {
      if (!accumulatedResponse.characterUpdates)
        accumulatedResponse.characterUpdates = {};
      Object.assign(accumulatedResponse.characterUpdates, typedArgs);
    }
    return result;
  }
  // Character attribute/skill/condition/trait updates - using strongly typed payloads
  if (name === "update_character_attribute") {
    const typedArgs = getTypedArgs("update_character_attribute", args);
    const payload: CharacterAttributePayload = {
      attributes: [{ action: "update", ...typedArgs }],
    };
    const result = db.modify("character", "update_attribute", payload);
    if (result.success) {
      if (!accumulatedResponse.characterUpdates)
        accumulatedResponse.characterUpdates = {};
      if (!accumulatedResponse.characterUpdates.attributes)
        accumulatedResponse.characterUpdates.attributes = [];
      accumulatedResponse.characterUpdates.attributes.push({
        action: "update",
        ...typedArgs,
      });
    }
    return result;
  }
  if (name === "update_character_skill") {
    const typedArgs = getTypedArgs("update_character_skill", args);
    const payload: CharacterSkillPayload = {
      skills: [{ action: "update", ...typedArgs }],
    };
    const result = db.modify("character", "update_skill", payload);
    if (result.success) {
      if (!accumulatedResponse.characterUpdates)
        accumulatedResponse.characterUpdates = {};
      if (!accumulatedResponse.characterUpdates.skills)
        accumulatedResponse.characterUpdates.skills = [];
      accumulatedResponse.characterUpdates.skills.push({
        action: "update",
        ...typedArgs,
      });
    }
    return result;
  }
  if (name === "update_character_condition") {
    const typedArgs = getTypedArgs("update_character_condition", args);
    const payload: CharacterConditionPayload = {
      conditions: [{ action: "update", ...typedArgs }],
    };
    const result = db.modify("character", "update_condition", payload);
    if (result.success) {
      if (!accumulatedResponse.characterUpdates)
        accumulatedResponse.characterUpdates = {};
      if (!accumulatedResponse.characterUpdates.conditions)
        accumulatedResponse.characterUpdates.conditions = [];
      accumulatedResponse.characterUpdates.conditions.push({
        action: "update",
        ...typedArgs,
      });
    }
    return result;
  }
  if (name === "update_character_trait") {
    const typedArgs = getTypedArgs("update_character_trait", args);
    const payload: CharacterTraitPayload = {
      hiddenTraits: [{ action: "update", ...typedArgs }],
    };
    const result = db.modify("character", "update_trait", payload);
    if (result.success) {
      if (!accumulatedResponse.characterUpdates)
        accumulatedResponse.characterUpdates = {};
      if (!accumulatedResponse.characterUpdates.hiddenTraits)
        accumulatedResponse.characterUpdates.hiddenTraits = [];
      accumulatedResponse.characterUpdates.hiddenTraits.push({
        action: "update",
        ...typedArgs,
      });
    }
    return result;
  }

  // ============================================================================
  // UNLOCK TOOL
  // ============================================================================
  if (name === "unlock_entity") {
    const category = args.category as string;
    const id = args.id as string | undefined;
    const entityName = args.name as string | undefined;
    const reason = args.reason as string;

    const result = db.unlock(category, { id, name: entityName }, reason);
    return result;
  }

  // ============================================================================
  // CONTROL TOOLS
  // ============================================================================
  if (name === "finish_turn" || name === "complete_force_update") {
    // finish_turn and complete_force_update are handled separately in the main loop
    return { success: true };
  }
  if (name === "next_stage") {
    // next_stage is handled in the main loop
    return { success: true };
  }

  return { success: false, error: `Unknown tool: ${name}` };
}

/**
 * 执行 RAG 搜索
 * Uses the new RAG service (SharedWorker-based) for semantic search
 */
export async function executeRagSearch(
  args: RagSearchParams,
  db: GameDatabase,
): Promise<unknown> {
  // Dynamic import to avoid circular dependencies if any, and because it's a separate service
  const { getRAGService } = await import("../../../rag");
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
    const { query, types, topK = 5, currentForkOnly, beforeCurrentTurn } = args;

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
// STORY MEMORY QUERY TOOL IMPLEMENTATIONS
// ============================================================================

interface QueryStoryParams {
  keyword?: string;
  location?: string;
  inGameTime?: string;
  turnRange?: {
    start?: number;
    end?: number;
  };
  order?: "asc" | "desc";
  limit?: number;
  page?: number;
  includeContext?: boolean;
}

/**
 * Story segment result with clear visibility markers.
 * All fields here are visible to AI (GM perspective).
 */
interface StorySegmentResult {
  turnNumber: number;
  /** In-game time when this segment occurred (visible to protagonist) */
  inGameTime?: string;
  /** Location where this segment occurred (visible to protagonist) */
  location?: string;
  /** The narrative text (visible to protagonist) */
  text: string;
  playerAction?: string;
  segmentId: string;
}

/**
 * Execute query_story tool - search through story history
 */
function executeQueryStory(
  args: Record<string, unknown>,
  gameState?: GameState,
): unknown {
  if (!gameState) {
    return {
      success: false,
      error: "Game state not available",
    };
  }

  const params = args as QueryStoryParams;
  const {
    keyword,
    location,
    inGameTime,
    turnRange,
    order = "desc",
    limit = 10,
    page = 1,
    includeContext = true,
  } = params;

  const currentFork = gameState.currentFork || [];

  // Filter segments: only model and command roles (narrative content)
  const narrativeSegments = currentFork.filter(
    (seg) => seg.role === "model" || seg.role === "command",
  );

  // Helper for regex matching
  const matchesPattern = (
    text: string | undefined,
    pattern: string,
  ): boolean => {
    if (!text) return false;
    try {
      const regex = new RegExp(pattern, "i");
      return regex.test(text);
    } catch {
      return text.toLowerCase().includes(pattern.toLowerCase());
    }
  };

  // Build filter function
  const matchesFilter = (segment: StorySegment, index: number): boolean => {
    // Keyword filter (supports regex)
    if (keyword && !matchesPattern(segment.text, keyword)) {
      return false;
    }

    // Location filter (supports regex)
    if (
      location &&
      !matchesPattern(segment.stateSnapshot?.currentLocation, location)
    ) {
      return false;
    }

    // In-game time filter (supports regex/keyword matching)
    if (
      inGameTime &&
      !matchesPattern(segment.stateSnapshot?.time, inGameTime)
    ) {
      return false;
    }

    // Turn range filter
    const turnNum = segment.segmentIdx ?? index;
    if (turnRange) {
      if (turnRange.start !== undefined && turnNum < turnRange.start) {
        return false;
      }
      if (turnRange.end !== undefined && turnNum > turnRange.end) {
        return false;
      }
    }

    return true;
  };

  // Filter and collect results
  const filteredSegments: Array<{
    segment: StorySegment;
    index: number;
  }> = [];

  narrativeSegments.forEach((segment) => {
    const originalIndex = currentFork.findIndex((s) => s.id === segment.id);
    if (matchesFilter(segment, originalIndex)) {
      filteredSegments.push({ segment, index: originalIndex });
    }
  });

  // Sort by turn number
  filteredSegments.sort((a, b) => {
    const turnA = a.segment.segmentIdx ?? a.index;
    const turnB = b.segment.segmentIdx ?? b.index;
    return order === "asc" ? turnA - turnB : turnB - turnA;
  });

  // Pagination
  const totalResults = filteredSegments.length;
  const totalPages = Math.ceil(totalResults / limit);
  const startIndex = (page - 1) * limit;
  const paginatedResults = filteredSegments.slice(
    startIndex,
    startIndex + limit,
  );

  // Build result objects
  const results: StorySegmentResult[] = paginatedResults.map(
    ({ segment, index }) => {
      const result: StorySegmentResult = {
        turnNumber: segment.segmentIdx ?? index,
        inGameTime: segment.stateSnapshot?.time,
        location: segment.stateSnapshot?.currentLocation,
        text: segment.text,
        segmentId: segment.id,
      };

      // Include following player action for context
      if (includeContext && index + 1 < currentFork.length) {
        const nextSegment = currentFork[index + 1];
        if (
          nextSegment &&
          (nextSegment.role === "user" || nextSegment.role === "command")
        ) {
          result.playerAction = nextSegment.text;
        }
      }

      return result;
    },
  );

  return {
    success: true,
    query: {
      keyword,
      location,
      inGameTime,
      turnRange,
      order,
    },
    pagination: {
      page,
      limit,
      totalResults,
      totalPages,
      hasMore: page < totalPages,
    },
    results,
    hint:
      results.length === 0
        ? "No matching segments found. Try broadening your search criteria."
        : `Found ${totalResults} matching segments. Showing page ${page} of ${totalPages}.`,
  };
}

/**
 * Execute query_turn tool - get current fork ID and turn number
 */
function executeQueryTurn(gameState?: GameState): unknown {
  if (!gameState) {
    return {
      success: false,
      error: "Game state not available",
    };
  }

  // Get current summary info
  const latestSummary = gameState.summaries?.length
    ? gameState.summaries[gameState.summaries.length - 1]
    : null;

  return {
    success: true,
    /** Current fork ID (for branching story tracking) */
    forkId: gameState.forkId ?? 0,
    /** Current turn number in this playthrough */
    turnNumber: gameState.turnNumber ?? 0,
    /** Total segments in current fork */
    totalSegments: gameState.currentFork?.length ?? 0,
    /** ID of the most recent node */
    currentNodeId: gameState.currentFork?.length
      ? gameState.currentFork[gameState.currentFork.length - 1].id
      : undefined,
    /** Number of summaries created so far */
    totalSummaries: gameState.summaries?.length ?? 0,
    /** Brief info about latest summary (use query_summary for full details) */
    latestSummaryBrief: latestSummary
      ? {
          nodeRange: latestSummary.nodeRange,
          timeRange: latestSummary.timeRange,
          displayText:
            latestSummary.displayText?.substring(0, 100) +
            (latestSummary.displayText?.length > 100 ? "..." : ""),
        }
      : null,
    hint: `Turn ${gameState.turnNumber ?? 0}, Fork ${gameState.forkId ?? 0}. ${gameState.summaries?.length ?? 0} summaries available. Use query_summary for detailed story context.`,
  };
}

/**
 * Execute query_summary tool - search through story summaries
 */
function executeQuerySummary(
  args: Record<string, unknown>,
  gameState?: GameState,
): unknown {
  if (!gameState) {
    return {
      success: false,
      error: "Game state not available",
    };
  }

  const summaries = gameState.summaries || [];

  if (summaries.length === 0) {
    return {
      success: true,
      hasSummary: false,
      totalSummaries: 0,
      results: [],
      message:
        "No summaries available yet. The story is still in early stages.",
    };
  }

  // The latest summary is ALWAYS in context - exclude it from search
  const latestSummaryIndex = summaries.length - 1;

  // If there's only one summary, it's already in context
  if (summaries.length === 1) {
    return {
      success: true,
      hasSummary: true,
      totalSummaries: 1,
      results: [],
      alreadyInContext: true,
      message:
        "The only summary is the LATEST summary, which is ALREADY in your context (see <story_summary> section). No need to query it - you already have access to it!",
    };
  }

  const {
    keyword,
    nodeRange,
    limit = 5,
    order = "desc",
  } = args as {
    keyword?: string;
    nodeRange?: { start?: number; end?: number };
    limit?: number;
    order?: "asc" | "desc";
  };

  // Helper for regex matching
  const matchesPattern = (
    text: string | undefined,
    pattern: string,
  ): boolean => {
    if (!text) return false;
    try {
      const regex = new RegExp(pattern, "i");
      return regex.test(text);
    } catch {
      return text.toLowerCase().includes(pattern.toLowerCase());
    }
  };

  // Filter summaries - EXCLUDE the latest summary (index = summaries.length - 1)
  let filteredSummaries = summaries
    .map((summary, index) => ({
      summary,
      index,
    }))
    .filter(({ index }) => index < latestSummaryIndex); // Exclude latest

  // Keyword filter - search in all text fields
  if (keyword) {
    filteredSummaries = filteredSummaries.filter(({ summary }) => {
      const displayText = summary.displayText || "";
      const visibleText =
        typeof summary.visible === "string"
          ? summary.visible
          : JSON.stringify(summary.visible || "");
      const hiddenText =
        typeof summary.hidden === "string"
          ? summary.hidden
          : JSON.stringify(summary.hidden || "");
      const allText = `${displayText} ${visibleText} ${hiddenText}`;
      return matchesPattern(allText, keyword);
    });
  }

  // Node range filter
  if (nodeRange) {
    filteredSummaries = filteredSummaries.filter(({ summary }) => {
      const summaryRange = summary.nodeRange;
      if (!summaryRange) return true; // Include if no range info
      if (
        nodeRange.start !== undefined &&
        summaryRange.toIndex < nodeRange.start
      ) {
        return false;
      }
      if (
        nodeRange.end !== undefined &&
        summaryRange.fromIndex > nodeRange.end
      ) {
        return false;
      }
      return true;
    });
  }

  // Sort
  if (order === "asc") {
    filteredSummaries.sort((a, b) => a.index - b.index);
  } else {
    filteredSummaries.sort((a, b) => b.index - a.index);
  }

  // Limit results
  const limitedResults = filteredSummaries.slice(0, limit);

  // Format results with clear visible/hidden markers
  const results = limitedResults.map(({ summary, index }) => ({
    summaryIndex: index,
    /** Short display text for UI (visible to protagonist) */
    displayText: summary.displayText || "",
    /**
     * VISIBLE LAYER - Information the protagonist knows/experienced
     * Contains: narrative, majorEvents, characterDevelopment, worldState
     */
    visible: summary.visible,
    /**
     * HIDDEN LAYER - GM-only information the protagonist does NOT know
     * Contains: truthNarrative, hiddenPlots, npcActions, worldTruth, unrevealed
     * Use this to maintain narrative consistency and plan future reveals
     */
    hidden: summary.hidden,
    /** Node range this summary covers */
    nodeRange: summary.nodeRange,
    /** In-game time range this summary covers */
    timeRange: summary.timeRange,
  }));

  return {
    success: true,
    hasSummary: true,
    totalSummaries: summaries.length,
    matchedCount: filteredSummaries.length,
    query: { keyword, nodeRange, limit, order },
    results,
    /**
     * IMPORTANT: The 'visible' layer contains what the protagonist experienced.
     * The 'hidden' layer contains GM-only truths - use for consistency but don't reveal to player.
     */
    visibilityHint:
      "Each summary has 'visible' (protagonist's knowledge) and 'hidden' (GM-only truth) layers.",
    hint:
      results.length === 0
        ? "No summaries matched your query. Try different keywords or remove filters."
        : `Found ${filteredSummaries.length} matching summaries. Showing ${results.length}.`,
  };
}

/**
 * Execute query_recent_context tool - get recent story segments
 */
function executeQueryRecentContext(
  args: Record<string, unknown>,
  gameState?: GameState,
  settings?: AISettings,
): unknown {
  if (!gameState) {
    return {
      success: false,
      error: "Game state not available",
    };
  }

  // Each segment is one node (user action OR model response), not a pair
  const requestedCount = Math.min(
    Math.max((args.count as number) || 10, 1),
    40,
  );
  const currentFork = gameState.currentFork || [];

  if (currentFork.length === 0) {
    return {
      success: true,
      segments: [],
      message: "No story history available yet.",
    };
  }

  // Calculate how many segments are in context based on actual context building logic:
  // Context includes: (currentFork.length - summarizedIndex) + freshSegmentCount
  // Use settings.freshSegmentCount if available, otherwise default to 4
  const freshSegmentCount = settings?.freshSegmentCount ?? 4;

  // Get the active node's summarizedIndex (where summarization ended)
  const activeNode = gameState.nodes?.[gameState.activeNodeId || ""];
  const summarizedIndex = activeNode?.summarizedIndex || 0;

  // Segments in context = segments after summary + freshSegmentCount overlap
  const segmentsInContext = Math.min(
    currentFork.length,
    currentFork.length - summarizedIndex + freshSegmentCount,
  );

  // If requesting only segments already in context, warn the model
  if (
    requestedCount <= segmentsInContext &&
    currentFork.length >= requestedCount
  ) {
    return {
      success: true,
      alreadyInContext: true,
      requestedCount,
      contextIncludesLast: segmentsInContext,
      segments: [],
      message: `The last ${segmentsInContext} segments are ALREADY in your context (see <recent_narrative> section). You requested ${requestedCount} segments - no need to query, you already have them! If you need OLDER segments, request count > ${segmentsInContext} (e.g., ${segmentsInContext + 10} or more).`,
    };
  }

  // Get segments BEYOND what's in context
  const startIndex = Math.max(0, currentFork.length - requestedCount);
  const recentSegments = currentFork.slice(startIndex);

  // Format segments with clear markers
  const segments = recentSegments.map((segment) => ({
    segmentIdx: segment.segmentIdx,
    /** Role: 'user' = player action, 'model' = AI narrative, 'command' = system/force update */
    role: segment.role,
    /** The actual text content (visible to protagonist) */
    text: segment.text,
    /** Location at this point (visible to protagonist) */
    location: segment.stateSnapshot?.currentLocation,
    /** In-game time at this point (visible to protagonist) */
    inGameTime: segment.stateSnapshot?.time,
  }));

  // Calculate how many are beyond context
  const beyondContextCount = Math.max(0, segments.length - segmentsInContext);

  return {
    success: true,
    requestedCount,
    returnedCount: segments.length,
    newSegments: beyondContextCount,
    currentTurn: gameState.turnNumber ?? 0,
    totalSegments: currentFork.length,
    segments,
    /**
     * Note: These are raw story segments containing dialogue/narrative.
     * For summarized context with visible/hidden layers, use query_summary.
     */
    hint:
      beyondContextCount > 0
        ? `Showing ${segments.length} segments (${beyondContextCount} beyond context + ${Math.min(segmentsInContext, segments.length)} already in context). Total segments: ${currentFork.length}.`
        : `All requested segments are in your context. The last ${segmentsInContext} segments are always in <recent_narrative>.`,
  };
}
