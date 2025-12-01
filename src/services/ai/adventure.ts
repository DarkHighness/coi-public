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
import { TOOLS } from "../tools";
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
  );
};

/**
 * Agentic Loop 实现
 * @param protocol Provider protocol
 * @param instance Provider instance
 * @param modelId 模型 ID
 * @param systemInstruction 系统指令
 * @param initialContents 初始消息
 * @param inputState 输入游戏状态
 * @param generationDetails 生成详情
 * @param settings 设置对象（必需）
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

  // Track changed entities with their types for efficient RAG updates
  const changedEntities: Map<string, string> = new Map(); // Map<entityId, entityType>

  let totalUsage: TokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };

  // Initialize lastLog with a placeholder
  let lastLog: LogEntry = createLogEntry(
    protocol,
    modelId,
    "agentic_init",
    { initializing: true },
    {},
    totalUsage,
  );

  // Check if RAG is enabled
  const isRAGEnabled = settings.embedding?.enabled ?? false;

  // Prepare tools for the provider
  const toolConfig = TOOLS.filter((t) => {
    // Hide RAG tools if embedding is disabled
    if (!isRAGEnabled && t.name === "rag_search") {
      return false;
    }
    // Hide complete_force_update tool in normal adventure loop
    if (t.name === "complete_force_update") {
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
    let maxRetries = 2; // Changed to let to allow modification for Gemini fallback
    let retryCount = 0;
    let lastError: Error | null = null;

    // Provider-specific schema handling
    // IMPORTANT: Gemini 2.5 (non-Pro) CANNOT use schema+tools simultaneously
    // - When tools are provided: Gemini ignores the schema (see geminiProvider.ts line 466)
    // - Other providers (OpenAI, Claude, OpenRouter) CAN use both together
    // Solution: For Gemini, never use schema (rely on finish_turn tool instead)
    //           For others, always use schema (for structured output guarantee)

    const isGeminiProvider = protocol === "gemini";

    // Keep tools available (including finish_turn) in ALL rounds
    let effectiveToolConfig = toolConfig; // Changed to let for fallback modification

    // Schema behavior:
    // - Gemini: NEVER use schema (conflicts with tools), rely on finish_turn tool
    // - Others: ALWAYS use schema for structured output guarantee
    let effectiveSchema = isGeminiProvider ? undefined : finishTurnSchema; // Changed to let

    while (retryCount <= maxRetries) {
      try {
        // Pass UnifiedMessage[] directly - generateContentUnified handles format conversion
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
        raw = resultData.raw;
        console.log(
          `[Agentic Loop] Turn ${turnCount + 1} response received. Schema: ${!!effectiveSchema}, Tools: ${!!effectiveToolConfig}, Usage:`,
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

          // Special handling for Gemini: try fallback to schema-only mode after 2 failed attempts
          if (isGeminiProvider && retryCount === 2 && effectiveToolConfig) {
            console.warn(
              `[Agentic Loop] Gemini tools failing repeatedly. Attempting fallback to schema-only mode...`,
            );
            // Disable tools and use schema instead for remaining attempts
            effectiveToolConfig = undefined;
            effectiveSchema = finishTurnSchema;
            maxRetries = 4; // Allow 2 more attempts in schema mode (total 5)
            continue;
          }

          if (retryCount <= maxRetries) {
            // Exponential backoff: 500ms, 1000ms, 2000ms, 4000ms
            const delayMs = Math.min(500 * Math.pow(2, retryCount - 1), 4000);
            console.warn(
              `[Agentic Loop] Retrying due to malformed function call (attempt ${retryCount}/${maxRetries}, waiting ${delayMs}ms)...`,
            );
            // Exponential backoff before retry
            await new Promise((resolve) => setTimeout(resolve, delayMs));
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
      protocol,
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
        output = executeToolCall(
          name,
          args,
          db,
          accumulatedResponse,
          changedEntities,
        );

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
            protocol,
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
            changedEntities: Array.from(changedEntities.entries()).map(
              ([id, type]) => ({ id, type }),
            ),
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
          protocol,
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
          changedEntities: Array.from(changedEntities.entries()).map(
            ([id, type]) => ({ id, type }),
          ),
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
            changedEntities: Array.from(changedEntities.entries()).map(
              ([id, type]) => ({ id, type }),
            ),
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
            choices: [{ text: "Continue" }],
          },
          logs: allLogs,
          usage: totalUsage,
          changedEntities: Array.from(changedEntities.entries()).map(
            ([id, type]) => ({ id, type }),
          ),
        };
      }
    }
  }

  // Max turns reached without finish_turn
  console.warn(
    `[Agentic Loop] Max turns (${maxTurns}) reached without finish_turn`,
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
 * 执行工具调用
 */
export function executeToolCall(
  name: string,
  args: Record<string, unknown>,
  db: GameDatabase,
  accumulatedResponse: GameResponse,
  changedEntities?: Map<string, string>, // Map<entityId, entityType>
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
      // Track entity with type for RAG update
      if (
        changedEntities &&
        modifyResult.data &&
        typeof modifyResult.data === "object" &&
        modifyResult.data !== null &&
        "id" in modifyResult.data
      ) {
        const entity = modifyResult.data as { id: string };
        changedEntities.set(entity.id, "item");
      }
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
      // Track entity with type for RAG update
      if (
        changedEntities &&
        modifyResult.data &&
        typeof modifyResult.data === "object" &&
        modifyResult.data !== null &&
        "id" in modifyResult.data
      ) {
        const entity = modifyResult.data as { id: string };
        changedEntities.set(entity.id, "npc");
      }
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
      // Track entity with type for RAG update
      if (
        changedEntities &&
        modifyResult.data &&
        typeof modifyResult.data === "object" &&
        modifyResult.data !== null &&
        "id" in modifyResult.data
      ) {
        const entity = modifyResult.data as { id: string };
        changedEntities.set(entity.id, "location");
      }
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
      // Track entity with type for RAG update
      if (
        changedEntities &&
        modifyResult.data &&
        typeof modifyResult.data === "object" &&
        modifyResult.data !== null &&
        "id" in modifyResult.data
      ) {
        const entity = modifyResult.data as { id: string };
        changedEntities.set(entity.id, "quest");
      }
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
      // Track entity with type for RAG update
      if (
        changedEntities &&
        modifyResult.data &&
        typeof modifyResult.data === "object" &&
        modifyResult.data !== null &&
        "id" in modifyResult.data
      ) {
        const entity = modifyResult.data as { id: string };
        changedEntities.set(entity.id, "knowledge");
      }
    }
    return modifyResult;
  } else if (name === "update_timeline") {
    const { action: actionType, ...data } = args;
    const modifyResult = db.modify("timeline", actionType as string, data);
    // Track entity with type for RAG update
    if (
      modifyResult.success &&
      changedEntities &&
      modifyResult.data &&
      typeof modifyResult.data === "object" &&
      modifyResult.data !== null &&
      "id" in modifyResult.data
    ) {
      const entity = modifyResult.data as { id: string };
      changedEntities.set(entity.id, "event");
    }
    return modifyResult;
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
      // Track entity with type for RAG update
      if (
        changedEntities &&
        modifyResult.data &&
        typeof modifyResult.data === "object" &&
        modifyResult.data !== null &&
        "id" in modifyResult.data
      ) {
        const entity = modifyResult.data as { id: string };
        changedEntities.set(entity.id, "faction");
      }
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
