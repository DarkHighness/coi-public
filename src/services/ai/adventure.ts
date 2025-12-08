import {
  AISettings,
  LogEntry,
  TokenUsage,
  ToolCallRecord,
  ProviderProtocol,
  ProviderInstance,
  GameState,
  TurnContext,
  StorySegment,
  UnifiedMessage,
  UnifiedToolCallResult,
  GameResponse,
} from "../../types";

import { isContextLengthError, truncateToolOutputs } from "./contextCompressor";

import { ToolCallResult, MalformedToolCallError } from "../providers/types";

import { GameDatabase } from "../gameDatabase";
import {
  TOOLS,
  getToolsForStage,
  getNextStage,
  AgentStage,
  STAGE_ORDER,
  parseStage,
  isValidStageTransition,
  // Runtime validation
  safeValidateToolArgs,
  // Tool parameter types
  ToolParamsMap,
  ToolName,
  getTypedArgs,
  // Character tool parameter types
  AddCharacterAttributeParams,
  UpdateCharacterAttributeParams,
  RemoveCharacterAttributeParams,
  AddCharacterSkillParams,
  UpdateCharacterSkillParams,
  RemoveCharacterSkillParams,
  AddCharacterConditionParams,
  UpdateCharacterConditionParams,
  RemoveCharacterConditionParams,
  AddCharacterTraitParams,
  UpdateCharacterTraitParams,
  RemoveCharacterTraitParams,
  UpdateCharacterProfileParams,
  // Entity tool parameter types
  AddInventoryParams,
  UpdateInventoryParams,
  RemoveInventoryParams,
  AddRelationshipParams,
  UpdateRelationshipParams,
  RemoveRelationshipParams,
  AddLocationParams,
  UpdateLocationParams,
  RemoveLocationParams,
  AddQuestParams,
  UpdateQuestParams,
  RemoveQuestParams,
  CompleteQuestParams,
  FailQuestParams,
  AddKnowledgeParams,
  UpdateKnowledgeParams,
  AddTimelineParams,
  UpdateTimelineParams,
  AddFactionParams,
  UpdateFactionParams,
  RemoveFactionParams,
  AddCausalChainParams,
  UpdateCausalChainParams,
  TriggerCausalChainParams,
  ResolveCausalChainParams,
  InterruptCausalChainParams,
  UpdateWorldInfoParams,
  UpdateGlobalParams,
  RagSearchParams,
  // Payload types for GameDatabase
  CharacterAttributePayload,
  CharacterSkillPayload,
  CharacterConditionPayload,
  CharacterTraitPayload,
  CharacterProfilePayload,
} from "../tools";
import { finishTurnSchema } from "../schemas";
import { getCoreSystemInstruction } from "../prompts/index";
import {
  buildLayeredContext,
  ContextBuilderOptions,
  CompressionLevel,
  getCompressedContextOptions,
} from "../prompts/contextBuilder";

import {
  createUserMessage,
  createToolCallMessage,
  createToolResponseMessage,
} from "../messageTypes";

import { GenerateContentResult, generateContentUnifiedInternal } from "./core";

import {
  getProviderConfig,
  createProviderConfig,
  createLogEntry,
  resolveThemeConfig,
  getProviderInstance,
} from "./utils";

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

  // Extract nextInitialStage for next turn optimization
  if (finishTurnData.nextInitialStage) {
    accumulatedResponse.nextInitialStage =
      finishTurnData.nextInitialStage as GameResponse["nextInitialStage"];
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
 */
export const buildTurnMessages = (
  layers: ReturnType<typeof buildLayeredContext>,
  recentHistory: StorySegment[],
  userAction: string,
  ragContext?: string,
): { messages: UnifiedMessage[]; dynamicContext: string } => {
  const messages: UnifiedMessage[] = [];

  // === Message 1: Static Layer (rarely changes - best for prefix cache) ===
  if (layers.staticLayer) {
    messages.push(
      createUserMessage(`[CONTEXT: World Foundation]\n${layers.staticLayer}`),
    );
    messages.push({
      role: "assistant",
      content: [{ type: "text", text: "[World foundation acknowledged.]" }],
    });
  }

  // === Message 2: Semi-Static Layer (summaries, descriptions) ===
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

  // === Message 3: RAG Context (semantic search results) ===
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

  // === Message 4: Dynamic Layer (current state, entities state) ===
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

  // === Final Message: User Action ===
  messages.push(createUserMessage(userAction));

  return { messages, dynamicContext: layers.dynamicLayer };
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

  // ===== NEW: Build layered context using contextBuilder =====
  const contextOptions: ContextBuilderOptions = {
    outline: gameState.outline,
    gameState,
    recentHistory: context.recentHistory,
    summaries: gameState.summaries,
    godMode: gameState.godMode,
    aliveEntities: gameState.aliveEntities,
  };

  // Outer Retry Loop: Handle Base Context Compression (Semantic Reduction)
  let compressionLevel: CompressionLevel = CompressionLevel.NONE;
  const maxCompressionLevel = CompressionLevel.EXTREME;

  while (true) {
    try {
      // 1. Apply Semantic Compression (if needed)
      const effectiveOptions = getCompressedContextOptions(
        contextOptions,
        compressionLevel,
      );
      const layers = buildLayeredContext(effectiveOptions);

      // Get RAG context from parameter
      const ragContext: string | undefined = context.ragContext;

      // 2. Build messages using layered context
      const { messages, dynamicContext } = buildTurnMessages(
        layers,
        effectiveOptions.recentHistory, // Use compressed history
        context.userAction,
        ragContext,
      );

      // Log injected rules and NSFW mode
      const enabledRules = (gameState.customRules || []).filter(
        (r) => r.enabled,
      );
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
        ragQueries: gameState.ragQueries,
        systemPrompt: systemInstruction,
        userPrompt: context.userAction,
        injectedRules: enabledRules.map((r) => `[${r.category}] ${r.title}`),
        nsfwEnabled,
      };

      // 5. Run inner loop
      const result = await runAgenticLoop(
        instance.protocol,
        instance,
        modelId,
        systemInstruction,
        messages,
        gameState,
        generationDetails,
        context.settings,
        gameState.nextInitialStage,
      );

      // 6. Return response
      if (compressionLevel > CompressionLevel.NONE) {
        result.response.systemToasts = [
          ...(result.response.systemToasts || []),
          {
            message: `Context compressed (Level ${compressionLevel}) due to size limits.`,
            type: "warning",
          },
        ];

        // Inject Log Entry
        result.logs.push(
          createLogEntry(
            "system",
            "context-manager",
            "compression",
            { compressionLevel, reason: "context_length_exceeded" },
            {
              message: `Context rebuilt with compression level ${compressionLevel}`,
            },
          ),
        );
      }
      return result;
    } catch (e: any) {
      if (isContextLengthError(e)) {
        console.warn(
          `[Adventure] Context length exceeded with Content Compression Level ${compressionLevel}.`,
        );
        if (compressionLevel < maxCompressionLevel) {
          compressionLevel = (compressionLevel + 1) as CompressionLevel;
          console.log(
            `[Adventure] Retrying with Content Compression Level ${compressionLevel}...`,
          );
          continue;
        }
      }
      throw e;
    }
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
export const runAgenticLoop = async (
  protocol: ProviderProtocol,
  instance: ProviderInstance,
  modelId: string,
  systemInstruction: string,
  initialContents: UnifiedMessage[],
  inputState: GameState,
  generationDetails: LogEntry["generationDetails"] | undefined,
  settings: AISettings,
  initialStage?: AgentStage, // Optional: start from a specific stage (from previous turn's nextInitialStage)
): Promise<AgenticLoopResult> => {
  let conversationHistory: UnifiedMessage[] = [...initialContents];

  // Stage-based limits instead of turn-based
  let stageTransitions = 0;
  const maxStageTransitions = 15; // Maximum stage transitions allowed
  const maxIterationsPerStage = 5; // Maximum iterations within a single stage

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

  let lastLog: LogEntry = createLogEntry(
    protocol,
    modelId,
    "agentic_init",
    { initializing: true },
    {},
    totalUsage,
  );

  const isRAGEnabled = settings.embedding?.enabled ?? false;
  const isGeminiProvider = protocol === "gemini";

  // Current stage tracking - can start from suggested stage
  let currentStage: AgentStage =
    initialStage && STAGE_ORDER.includes(initialStage) ? initialStage : "query";
  let stageIterations = 0;

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
        `[SYSTEM: PENDING CONSEQUENCES]\nReady to trigger:\n${readyList}\n\nUse trigger_causal_chain in UPDATE stage if appropriate.`,
      ),
    );
  }

  // Stage instruction helper with updated descriptions
  const addStageInstruction = (stage: AgentStage) => {
    const instructions: Record<AgentStage, string> = {
      query: `[STAGE: QUERY]
**MEMORY CHECK - DO THIS FIRST**:
Before proceeding, consider if you need to recall story history:
- Use \`query_story\` to search for past events, dialogues, or details by keyword/location
- Use \`query_summary\` to get the overall story summary (visible + hidden layers)
- Use \`query_recent_context\` to see the last few turns of player-AI exchanges
- Use \`query_turn\` to check current fork ID and turn number

**VISIBILITY LAYER REMINDER**:
When you query entities (items, NPCs, locations, etc.), remember:
- Query results contain BOTH \`visible\` (player's perception) and \`hidden\` (GM's truth) layers
- You see EVERYTHING as the GM
- Use \`hidden\` for internal logic, NPC behavior, world consistency
- Use \`visible\` for what appears in the narrative (unless \`unlocked: true\`)
- The \`unlocked\` flag tells you if the player has discovered the hidden truth

**REGEX SEARCH TIPS**:
- Query fields support regex (e.g., 'fire.*sword', 'dragon|serpent')
- NEVER use natural language "or" patterns like "xxx or xxx" or "xxx 或 xxx" - these will fail!
- Use regex alternation (|) instead: 'dragon|serpent' NOT 'dragon or serpent'

**WHEN TO QUERY**:
- Unsure what happened earlier? Query first.
- Referencing an NPC you haven't seen recently? Query their last appearance.
- Continuing a plot thread? Query to verify its current state.
- Player mentions something from the past? Query to confirm details.

Available tools: query_*, rag_search, next_stage, finish_turn

After querying (or if you have sufficient context):
- Call next_stage (optionally with target) to proceed
- Call finish_turn to complete the turn early if ready
`,
      add: `[STAGE: ADD]
Available tools: add_*, next_stage, finish_turn
- Add new entities (items, NPCs, locations, etc.)
- Call next_stage to proceed, or next_stage(target=...) to jump
- Call finish_turn to complete the turn early`,
      remove: `[STAGE: REMOVE]
Available tools: remove_*, next_stage, finish_turn
- Remove entities that no longer exist
- Call next_stage to proceed, or next_stage(target=...) to jump
- Call finish_turn to complete the turn early`,
      update: `[STAGE: UPDATE]
Available tools: update_*, complete_quest, fail_quest, trigger_causal_chain, next_stage, finish_turn
- Update existing entities
- Call next_stage to proceed to narrative
- Call finish_turn to complete the turn early`,
      narrative: `[STAGE: NARRATIVE]
Available tool: finish_turn
You MUST call finish_turn with your narrative, choices, and atmosphere to complete this turn.
Consider setting nextInitialStage if you know what stage would be best for the next turn.`,
    };
    conversationHistory.push(createUserMessage(instructions[stage]));
  };

  addStageInstruction(currentStage);

  while (stageTransitions < maxStageTransitions) {
    console.log(
      `[Agentic Loop] Stage: ${currentStage}, Iteration: ${stageIterations + 1}, Total transitions: ${stageTransitions}`,
    );

    // Get tools for current stage (all stages now include finish_turn)
    const stageTools = getToolsForStage(currentStage, isRAGEnabled);
    const toolConfig = stageTools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));

    let result: GenerateContentResult["result"];
    let usage: TokenUsage;

    let maxRetries = 2; // For malformed tool calls
    let retryCount = 0;

    // Compression state
    // Note: Semantic compression is handled by the outer loop in generateAdventureTurn.
    // Here we only handle tool output truncation.

    let lastError: Error | null = null;

    let effectiveToolConfig: typeof toolConfig | undefined = toolConfig;
    // Only use schema in narrative stage for non-Gemini providers
    let effectiveSchema = isGeminiProvider
      ? undefined
      : currentStage === "narrative"
        ? finishTurnSchema
        : undefined;

    // Inner Retry Loop: Handle Dynamic Tool Output Truncation
    while (retryCount <= maxRetries) {
      try {
        const config = createProviderConfig(instance);
        const resultData = await generateContentUnifiedInternal(
          protocol,
          config,
          modelId,
          systemInstruction,
          conversationHistory,
          effectiveSchema,
          {
            tools: effectiveToolConfig,
            generationDetails,
            logEndpoint: `adventure-${currentStage}`,
          },
        );

        result = resultData.result;
        usage = resultData.usage;
        console.log(
          `[Agentic Loop] Stage ${currentStage} response. Tools: ${toolConfig.length}`,
        );
        break;
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        lastError = error;
        const errorMessage = error.message || "";

        // 1. Handle Context Length Error -> Truncate Tools
        if (isContextLengthError(error)) {
          console.warn(
            `[Agentic Loop] Context length exceeded at stage ${currentStage}. Attempting Tool Output Truncation.`,
          );

          // Check if we can truncate tools further
          // We can check if any tool output > 500 chars exists
          // But truncateToolOutputs logic is idempotent (msg > 500 -> 500).
          // Let's create a hash or check to see if it actually changes anything.
          const beforeJson = JSON.stringify(conversationHistory);
          conversationHistory = truncateToolOutputs(conversationHistory);
          const afterJson = JSON.stringify(conversationHistory);

          if (beforeJson !== afterJson) {
            console.log(`[Agentic Loop] Tool outputs truncated. Retrying...`);
            // Don't increment retryCount for context fix
            continue;
          } else {
            console.warn(
              `[Agentic Loop] Tool truncation didn't reduce size (or already truncated). Bubble up error.`,
            );
            throw error; // Let generateAdventureTurn handle it with semantic compression
          }
        }

        // 2. Handle Malformed Tool Calls -> Retry
        if (
          e instanceof MalformedToolCallError ||
          errorMessage.includes("MALFORMED_FUNCTION_CALL")
        ) {
          retryCount++;
          console.warn(
            `[Agentic Loop] Malformed tool call. Retry ${retryCount}/${maxRetries}`,
          );

          if (isGeminiProvider && retryCount === 2 && effectiveToolConfig) {
            // Gemini fallback strategy
            effectiveToolConfig = undefined;
            effectiveSchema = finishTurnSchema;
            maxRetries = 4;
            continue;
          }

          if (retryCount <= maxRetries) {
            const delayMs = Math.min(500 * Math.pow(2, retryCount - 1), 4000);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            continue;
          }
        }

        throw error;
      }
    }

    if (usage!) {
      totalUsage.promptTokens += usage!.promptTokens || 0;
      totalUsage.completionTokens += usage!.completionTokens || 0;
      totalUsage.totalTokens += usage!.totalTokens || 0;
    }

    // Helper to extract text from message content
    const getMessageText = (content: UnifiedMessage["content"]): string => {
      return content
        .filter((part) => part.type === "text" && part.text)
        .map((part) => part.text)
        .join("\n");
    };

    // Prepare stage input for debugging
    const lastStageInstruction = conversationHistory
      .filter((m) => {
        const text = getMessageText(m.content);
        return m.role === "user" && text.startsWith("[STAGE:");
      })
      .pop();

    const stageInput = {
      conversationHistory: JSON.stringify(conversationHistory, null, 2),
      availableTools: toolConfig.map((t) => t.name),
      stageInstruction: lastStageInstruction
        ? getMessageText(lastStageInstruction.content)
        : undefined,
    };

    // Prepare raw response for debugging
    const rawResponse = JSON.stringify(result, null, 2);

    lastLog = createLogEntry(
      protocol,
      modelId,
      `agentic_${currentStage}_${stageIterations + 1}`,
      { stage: currentStage, iteration: stageIterations + 1 },
      {
        hasToolCalls: !!(result! as { functionCalls?: unknown }).functionCalls,
        toolCount:
          (result! as { functionCalls?: ToolCallResult[] }).functionCalls
            ?.length || 0,
      },
      usage!,
      undefined, // toolCalls - will be set later
      generationDetails,
      undefined, // parsedResult
      stageInput,
      rawResponse,
    );

    const functionCalls = (result! as { functionCalls?: ToolCallResult[] })
      .functionCalls;
    // 提取文本内容（某些模型如 Claude 会同时返回 content 和 tool_calls）
    const textContent = (result! as { content?: string }).content;

    if (result && functionCalls && functionCalls.length > 0) {
      const toolCalls: UnifiedToolCallResult[] = functionCalls;
      const turnToolCalls: ToolCallRecord[] = [];

      conversationHistory.push(
        createToolCallMessage(
          toolCalls.map((fc) => ({
            id: fc.id,
            name: fc.name,
            arguments: fc.args,
          })),
          textContent, // 传递文本内容以保持完整性
        ),
      );

      const toolResponses: Array<{
        toolCallId: string;
        name: string;
        content: unknown;
      }> = [];
      let targetStage: AgentStage | null = null; // For directed stage jumps

      for (const call of toolCalls) {
        const { id: callId, name, args } = call;
        console.log(`[Agentic Loop] Tool: ${name}`, args);

        let output: unknown;

        if (name === "next_stage") {
          // Support both automatic and directed stage transitions
          const requestedTarget = parseStage(args.target as string);

          if (requestedTarget) {
            // Directed jump to specific stage
            if (isValidStageTransition(currentStage, requestedTarget)) {
              targetStage = requestedTarget;
              output = {
                success: true,
                message: `Jumping to ${requestedTarget} stage.`,
              };
            } else {
              output = {
                success: false,
                error: `Invalid transition: already in ${currentStage}.`,
              };
            }
          } else {
            // Default: advance to next stage in sequence
            const nextStage = getNextStage(currentStage);
            if (nextStage) {
              targetStage = nextStage;
              output = {
                success: true,
                message: `Advancing to ${nextStage} stage.`,
              };
            } else {
              output = {
                success: false,
                error: "Already at final stage. Use finish_turn to complete.",
              };
            }
          }
        } else if (name === "finish_turn") {
          // finish_turn can be called from ANY stage
          processFinishTurnResponse(args, accumulatedResponse, db);

          turnToolCalls.push({
            name: "finish_turn",
            input: {
              narrative: (args.narrative as string)?.substring(0, 100) + "...",
              choices: args.choices,
              nextInitialStage: args.nextInitialStage,
            },
            output: { success: true },
            timestamp: Date.now(),
          });

          lastLog.toolCalls = turnToolCalls;
          allLogs.push(lastLog);

          const finalLog = createLogEntry(
            protocol,
            modelId,
            "agentic_complete",
            { stageTransitions, finalStage: currentStage },
            {
              totalToolCalls: allLogs.reduce(
                (sum, log) => sum + (log.toolCalls?.length || 0),
                0,
              ),
            },
            totalUsage,
          );
          allLogs.push(finalLog);

          return {
            response: accumulatedResponse,
            logs: allLogs,
            usage: totalUsage,
            changedEntities: Array.from(changedEntities.entries()).map(
              ([id, type]) => ({ id, type }),
            ),
          };
        } else {
          output = executeToolCall(
            name,
            args,
            db,
            accumulatedResponse,
            changedEntities,
            inputState,
            settings,
          );
        }

        turnToolCalls.push({
          name,
          input: args,
          output,
          timestamp: Date.now(),
        });
        toolResponses.push({ toolCallId: callId, name, content: output });
      }

      lastLog.toolCalls = turnToolCalls;
      allLogs.push(lastLog);
      conversationHistory.push(createToolResponseMessage(toolResponses));

      if (targetStage) {
        // Transition to target stage (either directed or sequential)
        currentStage = targetStage;
        stageIterations = 0;
        stageTransitions++;
        addStageInstruction(currentStage);
      } else {
        // No stage transition requested, increment iteration counter
        stageIterations++;
        if (stageIterations >= maxIterationsPerStage) {
          console.warn(
            `[Agentic Loop] Max iterations (${maxIterationsPerStage}) in ${currentStage}, auto-advancing`,
          );
          const nextStage = getNextStage(currentStage);
          if (nextStage) {
            currentStage = nextStage;
            stageIterations = 0;
            stageTransitions++;
            addStageInstruction(currentStage);
          } else {
            // Force narrative stage if stuck at the end
            conversationHistory.push(
              createUserMessage(
                `You've reached the maximum iterations. Please call finish_turn to complete the turn.`,
              ),
            );
          }
        }
      }
    } else {
      // No tool calls
      if (currentStage === "narrative") {
        try {
          const finishTurnData = finishTurnSchema.parse(result);
          processFinishTurnResponse(finishTurnData, accumulatedResponse, db);

          const finalLog = createLogEntry(
            protocol,
            modelId,
            "agentic_complete",
            { stageTransitions, method: "schema_response" },
            {
              totalToolCalls: allLogs.reduce(
                (sum, log) => sum + (log.toolCalls?.length || 0),
                0,
              ),
            },
            totalUsage,
          );
          allLogs.push(lastLog);
          allLogs.push(finalLog);

          return {
            response: accumulatedResponse,
            logs: allLogs,
            usage: totalUsage,
            changedEntities: Array.from(changedEntities.entries()).map(
              ([id, type]) => ({ id, type }),
            ),
          };
        } catch (validationError) {
          if (result && (result as GameResponse).narrative) {
            allLogs.push(lastLog);
            return {
              response: result as GameResponse,
              logs: allLogs,
              usage: totalUsage,
              changedEntities: Array.from(changedEntities.entries()).map(
                ([id, type]) => ({ id, type }),
              ),
            };
          }

          allLogs.push(lastLog);
          return {
            response: {
              ...accumulatedResponse,
              narrative:
                typeof result === "string" ? result : JSON.stringify(result),
              choices: [{ text: "Continue" }],
            },
            logs: allLogs,
            usage: totalUsage,
            changedEntities: Array.from(changedEntities.entries()).map(
              ([id, type]) => ({ id, type }),
            ),
          };
        }
      } else {
        // Prompt to use tools or advance stage
        conversationHistory.push(
          createUserMessage(
            `You must use available tools, call next_stage, or call finish_turn. Current stage: ${currentStage}`,
          ),
        );
        stageIterations++;

        if (stageIterations >= maxIterationsPerStage) {
          const nextStage = getNextStage(currentStage);
          if (nextStage) {
            currentStage = nextStage;
            stageIterations = 0;
            stageTransitions++;
            addStageInstruction(currentStage);
          }
        }
      }
    }
  }

  console.warn(
    `[Agentic Loop] Max stage transitions (${maxStageTransitions}) reached`,
  );
  return {
    response: accumulatedResponse,
    logs: allLogs,
    usage: totalUsage,
    changedEntities: Array.from(changedEntities.entries()).map(
      ([id, type]) => ({ id, type }),
    ),
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
  if (name === "finish_turn") {
    // finish_turn is handled separately in the main loop
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
  const { getRAGService } = await import("../rag");
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
