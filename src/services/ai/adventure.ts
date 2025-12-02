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
} from "../tools";
import { finishTurnSchema } from "../schemas";
import { getCoreSystemInstruction } from "../prompts/index";
import {
  buildLayeredContext,
  ContextBuilderOptions,
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
  );

  // Handle prompt injection if enabled
  const promptInjectionEnabled = settings.extra?.promptInjectionEnabled;
  if (promptInjectionEnabled && promptInjectionData) {
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
  const layers = buildLayeredContext(contextOptions);

  // Get RAG context from parameter
  const ragContext: string | undefined = context.ragContext;

  // ===== NEW: Build messages using layered context =====
  const { messages, dynamicContext } = buildTurnMessages(
    layers,
    context.recentHistory,
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
    instance.protocol,
    instance,
    modelId,
    systemInstruction,
    messages,
    gameState,
    generationDetails,
    context.settings,
    gameState.nextInitialStage, // Pass suggested initial stage from previous turn
  );
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
Available tools: query_*, rag_search, next_stage, finish_turn
- Query information you need using query_* or rag_search
- Call next_stage (optionally with target) to proceed to next stage
- Call finish_turn to complete the turn early if you have enough context
- Tip: You can jump directly to any stage using next_stage(target="add"|"remove"|"update"|"narrative")`,
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

    let maxRetries = 2;
    let retryCount = 0;
    let lastError: Error | null = null;

    let effectiveToolConfig: typeof toolConfig | undefined = toolConfig;
    // Only use schema in narrative stage for non-Gemini providers
    let effectiveSchema = isGeminiProvider
      ? undefined
      : currentStage === "narrative"
        ? finishTurnSchema
        : undefined;

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
          { tools: effectiveToolConfig, generationDetails },
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

        if (
          e instanceof MalformedToolCallError ||
          errorMessage.includes("MALFORMED_FUNCTION_CALL")
        ) {
          retryCount++;
          if (isGeminiProvider && retryCount === 2 && effectiveToolConfig) {
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

    if (retryCount > maxRetries && lastError) throw lastError;

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
): unknown {
  // ============================================================================
  // QUERY TOOLS
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
    return db.query("character", "attributes", args.name as string);
  }
  if (name === "query_character_skills") {
    return db.query("character", "skills", args.query as string);
  }
  if (name === "query_character_conditions") {
    return db.query("character", "conditions", args.query as string);
  }
  if (name === "query_character_traits") {
    return db.query("character", "hiddenTraits", args.query as string);
  }
  // RAG search
  if (name === "rag_search") {
    return executeRagSearch(args, db);
  }

  // ============================================================================
  // ADD TOOLS
  // ============================================================================
  if (name === "add_inventory") {
    const result = db.modify("inventory", "add", args);
    if (result.success) {
      if (!accumulatedResponse.inventoryActions)
        accumulatedResponse.inventoryActions = [];
      accumulatedResponse.inventoryActions.push({
        action: "add",
        ...args,
      } as GameResponse["inventoryActions"][number]);
      trackChangedEntity(changedEntities, result, "item");
    }
    return result;
  }
  if (name === "add_relationship") {
    const result = db.modify("relationship", "add", args);
    if (result.success) {
      if (!accumulatedResponse.relationshipActions)
        accumulatedResponse.relationshipActions = [];
      accumulatedResponse.relationshipActions.push({
        action: "add",
        ...args,
      } as GameResponse["relationshipActions"][number]);
      trackChangedEntity(changedEntities, result, "npc");
    }
    return result;
  }
  if (name === "add_location") {
    const result = db.modify("location", "add", args);
    if (result.success) {
      if (!accumulatedResponse.locationActions)
        accumulatedResponse.locationActions = [];
      accumulatedResponse.locationActions.push({
        type: "known",
        action: "add",
        ...args,
      } as GameResponse["locationActions"][number]);
      trackChangedEntity(changedEntities, result, "location");
    }
    return result;
  }
  if (name === "add_quest") {
    const result = db.modify("quest", "add", args);
    if (result.success) {
      if (!accumulatedResponse.questActions)
        accumulatedResponse.questActions = [];
      accumulatedResponse.questActions.push({
        action: "add",
        ...args,
      } as GameResponse["questActions"][number]);
      trackChangedEntity(changedEntities, result, "quest");
    }
    return result;
  }
  if (name === "add_knowledge") {
    const result = db.modify("knowledge", "add", args);
    if (result.success) {
      if (!accumulatedResponse.knowledgeActions)
        accumulatedResponse.knowledgeActions = [];
      accumulatedResponse.knowledgeActions.push({
        action: "add",
        ...args,
      } as GameResponse["knowledgeActions"][number]);
      trackChangedEntity(changedEntities, result, "knowledge");
    }
    return result;
  }
  if (name === "add_timeline") {
    const result = db.modify("timeline", "add", args);
    trackChangedEntity(changedEntities, result, "event");
    return result;
  }
  if (name === "add_faction") {
    const result = db.modify("faction", "add", args);
    if (result.success) {
      if (!accumulatedResponse.factionActions)
        accumulatedResponse.factionActions = [];
      accumulatedResponse.factionActions.push({
        action: "add",
        ...args,
      } as GameResponse["factionActions"][number]);
      trackChangedEntity(changedEntities, result, "faction");
    }
    return result;
  }
  if (name === "add_causal_chain") {
    return db.modify("causal_chain", "add", args);
  }
  // Character add tools
  if (name === "add_character_attribute") {
    const result = db.modify("character", "add_attribute", args);
    if (result.success) {
      if (!accumulatedResponse.characterUpdates)
        accumulatedResponse.characterUpdates = {};
      if (!accumulatedResponse.characterUpdates.attributes)
        accumulatedResponse.characterUpdates.attributes = [];
      accumulatedResponse.characterUpdates.attributes.push({
        action: "add",
        ...args,
      } as any);
    }
    return result;
  }
  if (name === "add_character_skill") {
    const result = db.modify("character", "add_skill", args);
    if (result.success) {
      if (!accumulatedResponse.characterUpdates)
        accumulatedResponse.characterUpdates = {};
      if (!accumulatedResponse.characterUpdates.skills)
        accumulatedResponse.characterUpdates.skills = [];
      accumulatedResponse.characterUpdates.skills.push({
        action: "add",
        ...args,
      } as any);
    }
    return result;
  }
  if (name === "add_character_condition") {
    const result = db.modify("character", "add_condition", args);
    if (result.success) {
      if (!accumulatedResponse.characterUpdates)
        accumulatedResponse.characterUpdates = {};
      if (!accumulatedResponse.characterUpdates.conditions)
        accumulatedResponse.characterUpdates.conditions = [];
      accumulatedResponse.characterUpdates.conditions.push({
        action: "add",
        ...args,
      } as any);
    }
    return result;
  }
  if (name === "add_character_trait") {
    const result = db.modify("character", "add_trait", args);
    if (result.success) {
      if (!accumulatedResponse.characterUpdates)
        accumulatedResponse.characterUpdates = {};
      if (!accumulatedResponse.characterUpdates.hiddenTraits)
        accumulatedResponse.characterUpdates.hiddenTraits = [];
      accumulatedResponse.characterUpdates.hiddenTraits.push({
        action: "add",
        ...args,
      } as any);
    }
    return result;
  }

  // ============================================================================
  // REMOVE TOOLS
  // ============================================================================
  if (name === "remove_inventory") {
    const result = db.modify("inventory", "remove", args);
    if (result.success) {
      if (!accumulatedResponse.inventoryActions)
        accumulatedResponse.inventoryActions = [];
      accumulatedResponse.inventoryActions.push({
        action: "remove",
        ...args,
      } as GameResponse["inventoryActions"][number]);
    }
    return result;
  }
  if (name === "remove_relationship") {
    const result = db.modify("relationship", "remove", args);
    if (result.success) {
      if (!accumulatedResponse.relationshipActions)
        accumulatedResponse.relationshipActions = [];
      accumulatedResponse.relationshipActions.push({
        action: "remove",
        ...args,
      } as GameResponse["relationshipActions"][number]);
    }
    return result;
  }
  if (name === "remove_location") {
    const result = db.modify("location", "remove", args);
    if (result.success) {
      if (!accumulatedResponse.locationActions)
        accumulatedResponse.locationActions = [];
      accumulatedResponse.locationActions.push({
        type: "known",
        action: "remove",
        ...args,
      } as any);
    }
    return result;
  }
  if (name === "remove_quest") {
    const result = db.modify("quest", "remove", args);
    if (result.success) {
      if (!accumulatedResponse.questActions)
        accumulatedResponse.questActions = [];
      accumulatedResponse.questActions.push({
        action: "remove",
        ...args,
      } as GameResponse["questActions"][number]);
    }
    return result;
  }
  if (name === "remove_faction") {
    const result = db.modify("faction", "remove", args);
    if (result.success) {
      if (!accumulatedResponse.factionActions)
        accumulatedResponse.factionActions = [];
      accumulatedResponse.factionActions.push({
        action: "remove",
        ...args,
      } as GameResponse["factionActions"][number]);
    }
    return result;
  }
  // Character remove tools
  if (name === "remove_character_attribute") {
    const result = db.modify("character", "remove_attribute", args);
    if (result.success) {
      if (!accumulatedResponse.characterUpdates)
        accumulatedResponse.characterUpdates = {};
      if (!accumulatedResponse.characterUpdates.attributes)
        accumulatedResponse.characterUpdates.attributes = [];
      accumulatedResponse.characterUpdates.attributes.push({
        action: "remove",
        ...args,
      } as any);
    }
    return result;
  }
  if (name === "remove_character_skill") {
    const result = db.modify("character", "remove_skill", args);
    if (result.success) {
      if (!accumulatedResponse.characterUpdates)
        accumulatedResponse.characterUpdates = {};
      if (!accumulatedResponse.characterUpdates.skills)
        accumulatedResponse.characterUpdates.skills = [];
      accumulatedResponse.characterUpdates.skills.push({
        action: "remove",
        ...args,
      } as any);
    }
    return result;
  }
  if (name === "remove_character_condition") {
    const result = db.modify("character", "remove_condition", args);
    if (result.success) {
      if (!accumulatedResponse.characterUpdates)
        accumulatedResponse.characterUpdates = {};
      if (!accumulatedResponse.characterUpdates.conditions)
        accumulatedResponse.characterUpdates.conditions = [];
      accumulatedResponse.characterUpdates.conditions.push({
        action: "remove",
        ...args,
      } as any);
    }
    return result;
  }
  if (name === "remove_character_trait") {
    const result = db.modify("character", "remove_trait", args);
    if (result.success) {
      if (!accumulatedResponse.characterUpdates)
        accumulatedResponse.characterUpdates = {};
      if (!accumulatedResponse.characterUpdates.hiddenTraits)
        accumulatedResponse.characterUpdates.hiddenTraits = [];
      accumulatedResponse.characterUpdates.hiddenTraits.push({
        action: "remove",
        ...args,
      } as any);
    }
    return result;
  }

  // ============================================================================
  // UPDATE TOOLS
  // ============================================================================
  if (name === "update_inventory") {
    const result = db.modify("inventory", "update", args);
    if (result.success) {
      if (!accumulatedResponse.inventoryActions)
        accumulatedResponse.inventoryActions = [];
      accumulatedResponse.inventoryActions.push({
        action: "update",
        ...args,
      } as GameResponse["inventoryActions"][number]);
      trackChangedEntity(changedEntities, result, "item");
    }
    return result;
  }
  if (name === "update_relationship") {
    const result = db.modify("relationship", "update", args);
    if (result.success) {
      if (!accumulatedResponse.relationshipActions)
        accumulatedResponse.relationshipActions = [];
      accumulatedResponse.relationshipActions.push({
        action: "update",
        ...args,
      } as GameResponse["relationshipActions"][number]);
      trackChangedEntity(changedEntities, result, "npc");
    }
    return result;
  }
  if (name === "update_location") {
    const result = db.modify("location", "update", args);
    if (result.success) {
      if (!accumulatedResponse.locationActions)
        accumulatedResponse.locationActions = [];
      accumulatedResponse.locationActions.push({
        type: "known",
        action: "update",
        ...args,
      } as GameResponse["locationActions"][number]);
      trackChangedEntity(changedEntities, result, "location");
    }
    return result;
  }
  if (name === "update_quest") {
    const result = db.modify("quest", "update", args);
    if (result.success) {
      if (!accumulatedResponse.questActions)
        accumulatedResponse.questActions = [];
      accumulatedResponse.questActions.push({
        action: "update",
        ...args,
      } as GameResponse["questActions"][number]);
      trackChangedEntity(changedEntities, result, "quest");
    }
    return result;
  }
  if (name === "complete_quest") {
    const result = db.modify("quest", "complete", args);
    if (result.success) {
      if (!accumulatedResponse.questActions)
        accumulatedResponse.questActions = [];
      accumulatedResponse.questActions.push({
        action: "complete",
        ...args,
      } as GameResponse["questActions"][number]);
    }
    return result;
  }
  if (name === "fail_quest") {
    const result = db.modify("quest", "fail", args);
    if (result.success) {
      if (!accumulatedResponse.questActions)
        accumulatedResponse.questActions = [];
      accumulatedResponse.questActions.push({
        action: "fail",
        ...args,
      } as GameResponse["questActions"][number]);
    }
    return result;
  }
  if (name === "update_knowledge") {
    const result = db.modify("knowledge", "update", args);
    if (result.success) {
      if (!accumulatedResponse.knowledgeActions)
        accumulatedResponse.knowledgeActions = [];
      accumulatedResponse.knowledgeActions.push({
        action: "update",
        ...args,
      } as GameResponse["knowledgeActions"][number]);
      trackChangedEntity(changedEntities, result, "knowledge");
    }
    return result;
  }
  if (name === "update_timeline") {
    const result = db.modify("timeline", "update", args);
    trackChangedEntity(changedEntities, result, "event");
    return result;
  }
  if (name === "update_faction") {
    const result = db.modify("faction", "update", args);
    if (result.success) {
      if (!accumulatedResponse.factionActions)
        accumulatedResponse.factionActions = [];
      accumulatedResponse.factionActions.push({
        action: "update",
        ...args,
      } as GameResponse["factionActions"][number]);
      trackChangedEntity(changedEntities, result, "faction");
    }
    return result;
  }
  // Causal chain tools
  if (name === "update_causal_chain") {
    return db.modify("causal_chain", "update", args);
  }
  if (name === "trigger_causal_chain") {
    return db.modify("causal_chain", "trigger", args);
  }
  if (name === "resolve_causal_chain") {
    return db.modify("causal_chain", "resolve", args);
  }
  if (name === "interrupt_causal_chain") {
    return db.modify("causal_chain", "interrupt", args);
  }
  // World info
  if (name === "update_world_info") {
    const { unlockWorldSetting, unlockMainGoal, reason } = args as {
      unlockWorldSetting?: boolean;
      unlockMainGoal?: boolean;
      reason: string;
    };
    const result = db.modify("world_info", "update", {
      unlockWorldSetting,
      unlockMainGoal,
      reason,
    });
    if (result.success) {
      if (!accumulatedResponse.worldInfoUpdates)
        accumulatedResponse.worldInfoUpdates = [];
      accumulatedResponse.worldInfoUpdates.push({
        unlockWorldSetting,
        unlockMainGoal,
        reason,
      });
    }
    return result;
  }
  // Global state
  if (name === "update_global") {
    return db.modify("global", "update", args);
  }
  // Character profile update
  if (name === "update_character_profile") {
    const result = db.modify("character", "update_profile", args);
    if (result.success) {
      if (!accumulatedResponse.characterUpdates)
        accumulatedResponse.characterUpdates = {};
      Object.assign(accumulatedResponse.characterUpdates, args);
    }
    return result;
  }
  // Character attribute/skill/condition/trait updates
  if (name === "update_character_attribute") {
    const result = db.modify("character", "update_attribute", args);
    if (result.success) {
      if (!accumulatedResponse.characterUpdates)
        accumulatedResponse.characterUpdates = {};
      if (!accumulatedResponse.characterUpdates.attributes)
        accumulatedResponse.characterUpdates.attributes = [];
      accumulatedResponse.characterUpdates.attributes.push({
        action: "update",
        ...args,
      } as any);
    }
    return result;
  }
  if (name === "update_character_skill") {
    const result = db.modify("character", "update_skill", args);
    if (result.success) {
      if (!accumulatedResponse.characterUpdates)
        accumulatedResponse.characterUpdates = {};
      if (!accumulatedResponse.characterUpdates.skills)
        accumulatedResponse.characterUpdates.skills = [];
      accumulatedResponse.characterUpdates.skills.push({
        action: "update",
        ...args,
      } as any);
    }
    return result;
  }
  if (name === "update_character_condition") {
    const result = db.modify("character", "update_condition", args);
    if (result.success) {
      if (!accumulatedResponse.characterUpdates)
        accumulatedResponse.characterUpdates = {};
      if (!accumulatedResponse.characterUpdates.conditions)
        accumulatedResponse.characterUpdates.conditions = [];
      accumulatedResponse.characterUpdates.conditions.push({
        action: "update",
        ...args,
      } as any);
    }
    return result;
  }
  if (name === "update_character_trait") {
    const result = db.modify("character", "update_trait", args);
    if (result.success) {
      if (!accumulatedResponse.characterUpdates)
        accumulatedResponse.characterUpdates = {};
      if (!accumulatedResponse.characterUpdates.hiddenTraits)
        accumulatedResponse.characterUpdates.hiddenTraits = [];
      accumulatedResponse.characterUpdates.hiddenTraits.push({
        action: "update",
        ...args,
      } as any);
    }
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
  args: Record<string, unknown>,
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
