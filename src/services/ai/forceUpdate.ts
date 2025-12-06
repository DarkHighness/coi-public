import {
  AISettings,
  TokenUsage,
  ProviderProtocol,
  ProviderInstance,
  GameState,
  TurnContext,
  UnifiedMessage,
  UnifiedToolCallResult,
  GameResponse,
  LogEntry,
  ToolCallRecord,
} from "../../types";

import { ToolCallResult } from "../providers/types";

import { GameDatabase } from "../gameDatabase";
import {
  QUERY_TOOLS,
  ADD_TOOLS,
  REMOVE_TOOLS,
  UPDATE_TOOLS,
  COMPLETE_FORCE_UPDATE_TOOL,
} from "../tools";
import { forceUpdateSchema, ForceUpdateResponse } from "../schemas";
import { getForceUpdateSystemInstruction } from "../prompts/index";
import {
  buildLayeredContext,
  ContextBuilderOptions,
} from "../prompts/contextBuilder";

import {
  createUserMessage,
  createToolCallMessage,
  createToolResponseMessage,
} from "../messageTypes";

import {
  GenerateContentResult,
  generateContentUnifiedInternal,
} from "./core";

import {
  getProviderConfig,
  createLogEntry,
  createProviderConfig,
} from "./utils";

import { executeToolCall } from "./adventure";

// ============================================================================
// Force Update Logic
// ============================================================================

/**
 * Result of force update loop
 */
export interface ForceUpdateResult {
  response: GameResponse;
  logs: LogEntry[];
  usage: TokenUsage;
  changedEntities: Array<{ id: string; type: string }>;
}

/**
 * 生成强制更新 (Force Update / Sudo)
 */
import {
  isContextLengthError,
} from "./contextCompressor";
import {
  getCompressedContextOptions,
  CompressionLevel,
} from "../prompts/contextBuilder";

export const generateForceUpdate = async (
  prompt: string,
  inputState: GameState,
  context: TurnContext,
): Promise<ForceUpdateResult> => {
  if (!context.settings) {
    throw new Error("settings is required in context");
  }
  const settings = context.settings;
  const language = context.language || "en";

  // 1. 获取 Provider 配置
  const providerInfo = getProviderConfig(settings, "story");
  if (!providerInfo) {
    throw new Error("Story provider not configured");
  }
  const { instance, config, modelId } = providerInfo;

  let compressionLevel: CompressionLevel = CompressionLevel.NONE;
  const maxCompressionLevel = CompressionLevel.EXTREME;

  while (true) {
    try {
        // 2. 构建完整上下文
        let contextOptions: ContextBuilderOptions = {
            outline: inputState.outline,
            gameState: inputState,
            recentHistory: context.recentHistory,
            summaries: inputState.summaries || [],
            godMode: true,
            aliveEntities: inputState.aliveEntities,
        };

        // Apply compression if needed
        if (compressionLevel > CompressionLevel.NONE) {
            contextOptions = getCompressedContextOptions(contextOptions, compressionLevel);
        }

        // Use buildLayeredContext to get the full context string
        const layers = buildLayeredContext(contextOptions);
        const fullContext = `${layers.staticLayer}\n${layers.semiStaticLayer}\n${layers.dynamicLayer}`;

        // 3. 构建系统指令
        const systemInstruction = getForceUpdateSystemInstruction(
            language,
            prompt,
            fullContext,
        );

        // 4. 准备初始消息
        const contextMessage = createUserMessage(
            JSON.stringify({
            task: "FORCE_UPDATE",
            command: prompt,
            }),
        );

        // 5. 运行 Force Update Loop
        const result = await runForceUpdateLoop(
            instance.protocol,
            instance,
            modelId,
            systemInstruction,
            [contextMessage],
            inputState,
            settings,
        );

        // Use reliable comparison
        if ((compressionLevel as unknown as number) > 0) {
            result.response.systemToasts = [
                ...(result.response.systemToasts || []),
                {
                    message: `Force Update compressed (Level ${compressionLevel}) due to limits.`,
                    type: "warning"
                }
            ];

             // Inject Log Entry (ForceUpdateResult might not have logs array in type definition? Let's check types.ts later.
             // ForceUpdateResult uses GameResponse? No.
             // ForceUpdateResult is { success: boolean, data?: any, logs?: LogEntry[], response: ForceUpdateResponse }.
             // Let's assume it has logs based on usage in useGameAction.
             if (result.logs) {
                 result.logs.push(createLogEntry(
                    "system",
                    "context-manager",
                    "compression",
                    { compressionLevel, reason: "context_length_exceeded" },
                    { message: `Force Update context rebuilt with compression level ${compressionLevel}` },
                ));
             }
        }

        return result;
    } catch (e: any) {
        if (isContextLengthError(e)) {
            console.warn(`[ForceUpdate] Context length exceeded with Content Compression Level ${compressionLevel}.`);
            if (compressionLevel < maxCompressionLevel) {
                // Manually increment since CompressionLevel is an enum/number
                compressionLevel = (compressionLevel + 1) as CompressionLevel;
                console.log(`[ForceUpdate] Retrying with Content Compression Level ${compressionLevel}...`);
                continue;
            }
        }
        throw e;
    }
  }
};

/**
 * Force Update Loop Implementation with Staged Approach
 *
 * Stages for Force Update:
 * 1. QUERY - Query current state
 * 2. ADD - Add new entities
 * 3. REMOVE - Remove entities
 * 4. UPDATE - Update existing entities
 * 5. Complete - complete_force_update to finalize
 *
 * Note: Force update doesn't have narrative stage, uses complete_force_update instead
 */
const runForceUpdateLoop = async (
  protocol: ProviderProtocol,
  instance: ProviderInstance,
  modelId: string,
  systemInstruction: string,
  initialContents: UnifiedMessage[],
  inputState: GameState,
  settings: AISettings,
): Promise<ForceUpdateResult> => {
  let conversationHistory: UnifiedMessage[] = [...initialContents];

  // Stage-based limits
  let stageTransitions = 0;
  const maxStageTransitions = 10;
  const maxIterationsPerStage = 3;

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
    choices: [], // Will be populated by complete_force_update
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

  // Check if RAG is enabled
  const isRAGEnabled = settings.embedding?.enabled ?? false;
  const isGeminiProvider = protocol === "gemini";

  // Stage tracking for force update (query -> add -> remove -> update -> complete)
  type ForceUpdateStage = "query" | "add" | "remove" | "update" | "complete";
  let currentStage: ForceUpdateStage = "query";
  let stageIterations = 0;

  // Helper to extract text from message content
  const getMessageText = (content: UnifiedMessage["content"]): string => {
    return content
      .filter((part) => part.type === "text" && part.text)
      .map((part) => part.text)
      .join("\n");
  };

  // Get tools for current force update stage
  const getForceUpdateTools = (stage: ForceUpdateStage) => {
    const baseTools = (() => {
      switch (stage) {
        case "query":
          return isRAGEnabled
            ? QUERY_TOOLS
            : QUERY_TOOLS.filter((t) => t.name !== "rag_search");
        case "add":
          return ADD_TOOLS;
        case "remove":
          return REMOVE_TOOLS;
        case "update":
          return UPDATE_TOOLS;
        case "complete":
          return [COMPLETE_FORCE_UPDATE_TOOL];
      }
    })();

    // Add complete_force_update to all stages except complete (where it's the only tool)
    if (stage !== "complete") {
      return [...baseTools, COMPLETE_FORCE_UPDATE_TOOL];
    }
    return baseTools;
  };

  const getNextForceUpdateStage = (
    current: ForceUpdateStage,
  ): ForceUpdateStage | null => {
    const order: ForceUpdateStage[] = [
      "query",
      "add",
      "remove",
      "update",
      "complete",
    ];
    const idx = order.indexOf(current);
    if (idx === -1 || idx === order.length - 1) return null;
    return order[idx + 1];
  };

  // Stage instruction helper
  const addStageInstruction = (stage: ForceUpdateStage) => {
    const instructions: Record<ForceUpdateStage, string> = {
      query: `[FORCE UPDATE - STAGE: QUERY]
Query the current state to understand what needs to be changed.
Available tools: query_*, rag_search (if enabled), complete_force_update

**MEMORY TOOLS AVAILABLE**:
- \`query_story\`: Search story history by keyword, location, or turn range
- \`query_summary\`: Get the current story summary
- \`query_recent_context\`: Get recent player-AI exchanges
- \`query_turn\`: Get current fork ID and turn number

Use these tools to verify the current state before making changes.
- Call complete_force_update when ready to finalize changes`,
      add: `[FORCE UPDATE - STAGE: ADD]
Add any new entities required by the command.
Available tools: add_*, complete_force_update
- Call complete_force_update when ready to finalize changes`,
      remove: `[FORCE UPDATE - STAGE: REMOVE]
Remove any entities that should be deleted.
Available tools: remove_*, complete_force_update
- Call complete_force_update when ready to finalize changes`,
      update: `[FORCE UPDATE - STAGE: UPDATE]
Update existing entities as needed.
Available tools: update_*, complete_force_update
- Call complete_force_update when ready to finalize changes`,
      complete: `[FORCE UPDATE - STAGE: COMPLETE]
Finalize the force update.
You MUST call complete_force_update with a narrative describing the changes.`,
    };
    conversationHistory.push(createUserMessage(instructions[stage]));
  };

  addStageInstruction(currentStage);

  while (stageTransitions < maxStageTransitions) {
    console.log(
      `[Force Update Loop] Stage: ${currentStage}, Iteration: ${stageIterations + 1}`,
    );

    const stageTools = getForceUpdateTools(currentStage);
    const toolConfig = stageTools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));

    let result: GenerateContentResult["result"];
    let usage: TokenUsage;

    // Retry logic
    const maxRetries = 2;
    let retryCount = 0;
    let lastError: Error | null = null;

    let effectiveToolConfig: typeof toolConfig | undefined = toolConfig;
    const effectiveSchema = isGeminiProvider
      ? undefined
      : currentStage === "complete"
        ? forceUpdateSchema
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
          {
            tools: effectiveToolConfig,
            logEndpoint: `forceUpdate-${currentStage}`,
          },
        );

        result = resultData.result;
        usage = resultData.usage;
        break;
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        lastError = error;
        if (
          error.message.includes("function call format error") ||
          error.message.includes("MALFORMED_FUNCTION_CALL")
        ) {
          retryCount++;
          if (retryCount <= maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            continue;
          }
        }
        throw error;
      }
    }

    if (retryCount > maxRetries && lastError) {
      throw lastError;
    }

    if (usage!) {
      totalUsage.promptTokens += usage!.promptTokens || 0;
      totalUsage.completionTokens += usage!.completionTokens || 0;
      totalUsage.totalTokens += usage!.totalTokens || 0;
    }

    // Prepare stage input for debugging
    const lastStageInstruction = conversationHistory
      .filter((m) => {
        const text = getMessageText(m.content);
        return m.role === "user" && text.startsWith("[FORCE UPDATE - STAGE:");
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

    // Handle Tool Calls
    const functionCalls = (result! as { functionCalls?: ToolCallResult[] })
      .functionCalls;

    if (result && functionCalls && functionCalls.length > 0) {
      let toolCalls: UnifiedToolCallResult[] = functionCalls;
      const turnToolCalls: ToolCallRecord[] = [];

      // Ensure complete_force_update is last
      const completeIndex = toolCalls.findIndex(
        (tc) => tc.name === "complete_force_update",
      );
      if (completeIndex !== -1 && completeIndex !== toolCalls.length - 1) {
        const completeCall = toolCalls[completeIndex];
        toolCalls = [
          ...toolCalls.slice(0, completeIndex),
          ...toolCalls.slice(completeIndex + 1),
          completeCall,
        ];
      }

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

      let shouldAdvanceStage = false;

      for (const call of toolCalls) {
        const { id: callId, name, args } = call;
        console.log(`[Force Update Loop] Tool Call [${callId}]: ${name}`, args);

        let output: unknown = { success: false, error: "Unknown tool" };

        if (name === "complete_force_update") {
          // Process complete_force_update response
          const updateData = args as ForceUpdateResponse;
          accumulatedResponse.narrative = updateData.narrative;

          // Copy new fields from forceUpdateSchema
          if (updateData.choices) {
            accumulatedResponse.choices = updateData.choices;
          }
          if (updateData.atmosphere) {
            accumulatedResponse.atmosphere = updateData.atmosphere;
          }
          if (updateData.narrativeTone) {
            accumulatedResponse.narrativeTone = updateData.narrativeTone;
          }
          if (updateData.aliveEntities) {
            accumulatedResponse.aliveEntities = updateData.aliveEntities;
          }
          if (updateData.ragQueries) {
            accumulatedResponse.ragQueries = updateData.ragQueries;
          }
          if (updateData.ragCurrentForkOnly !== undefined) {
            accumulatedResponse.ragCurrentForkOnly =
              updateData.ragCurrentForkOnly;
          }
          if (updateData.ragBeforeCurrentTurn !== undefined) {
            accumulatedResponse.ragBeforeCurrentTurn =
              updateData.ragBeforeCurrentTurn;
          }
          if (updateData.nextInitialStage) {
            accumulatedResponse.nextInitialStage = updateData.nextInitialStage;
          }

          // Attach final state
          (
            accumulatedResponse as GameResponse & { finalState: unknown }
          ).finalState = db.getState();

          turnToolCalls.push({
            name: "complete_force_update",
            input: {
              narrative: (args.narrative as string)?.substring(0, 100) + "...",
              choices: args.choices,
            },
            output: { success: true },
            timestamp: Date.now(),
          });

          // Create log entry for this iteration
          const iterationLog = createLogEntry(
            protocol,
            modelId,
            `force_update_${currentStage}_${stageIterations + 1}`,
            { stage: currentStage, iteration: stageIterations + 1 },
            { hasToolCalls: true, toolCount: toolCalls.length },
            usage!,
            turnToolCalls,
            undefined,
            undefined,
            stageInput,
            rawResponse,
          );
          allLogs.push(iterationLog);

          // Create final completion log
          const finalLog = createLogEntry(
            protocol,
            modelId,
            "force_update_complete",
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
        }

        // Execute other tools
        output = executeToolCall(
          name,
          args,
          db,
          accumulatedResponse,
          changedEntities,
          inputState,
        );

        turnToolCalls.push({
          name,
          input: args,
          output,
          timestamp: Date.now(),
        });

        // Check if this is a stage-advancing action (query complete, modifications done)
        if (name.startsWith("query_") || name === "rag_search") {
          // After queries, advance to add stage
          if (currentStage === "query") shouldAdvanceStage = true;
        }

        toolResponses.push({
          toolCallId: callId,
          name: name,
          content: output,
        });
      }

      // Create log entry for this iteration with tool calls
      const iterationLog = createLogEntry(
        protocol,
        modelId,
        `force_update_${currentStage}_${stageIterations + 1}`,
        { stage: currentStage, iteration: stageIterations + 1 },
        { hasToolCalls: true, toolCount: toolCalls.length },
        usage!,
        turnToolCalls,
        undefined,
        undefined,
        stageInput,
        rawResponse,
      );
      allLogs.push(iterationLog);

      conversationHistory.push(createToolResponseMessage(toolResponses));

      // Auto-advance stage logic
      stageIterations++;
      if (stageIterations >= maxIterationsPerStage || shouldAdvanceStage) {
        const nextStage = getNextForceUpdateStage(currentStage);
        if (nextStage) {
          currentStage = nextStage;
          stageIterations = 0;
          stageTransitions++;
          addStageInstruction(currentStage);
        }
      }
    } else {
      // No tool calls - create log for this iteration
      const noToolLog = createLogEntry(
        protocol,
        modelId,
        `force_update_${currentStage}_${stageIterations + 1}_no_tools`,
        { stage: currentStage, iteration: stageIterations + 1 },
        { hasToolCalls: false, toolCount: 0 },
        usage!,
        undefined,
        undefined,
        undefined,
        stageInput,
        rawResponse,
      );
      allLogs.push(noToolLog);

      // No tool calls - check for direct schema response in complete stage
      if (currentStage === "complete") {
        try {
          const updateData = forceUpdateSchema.parse(result);
          accumulatedResponse.narrative = updateData.narrative;

          // Copy new fields from forceUpdateSchema
          if (updateData.choices) {
            accumulatedResponse.choices = updateData.choices;
          }
          if (updateData.atmosphere) {
            accumulatedResponse.atmosphere = updateData.atmosphere;
          }
          if (updateData.narrativeTone) {
            accumulatedResponse.narrativeTone = updateData.narrativeTone;
          }
          if (updateData.aliveEntities) {
            accumulatedResponse.aliveEntities = updateData.aliveEntities;
          }
          if (updateData.ragQueries) {
            accumulatedResponse.ragQueries = updateData.ragQueries;
          }
          if (updateData.ragCurrentForkOnly !== undefined) {
            accumulatedResponse.ragCurrentForkOnly =
              updateData.ragCurrentForkOnly;
          }
          if (updateData.ragBeforeCurrentTurn !== undefined) {
            accumulatedResponse.ragBeforeCurrentTurn =
              updateData.ragBeforeCurrentTurn;
          }
          if (updateData.nextInitialStage) {
            accumulatedResponse.nextInitialStage = updateData.nextInitialStage;
          }

          (
            accumulatedResponse as GameResponse & { finalState: unknown }
          ).finalState = db.getState();

          // Create final completion log
          const finalLog = createLogEntry(
            protocol,
            modelId,
            "force_update_complete",
            { stageTransitions, method: "schema_response" },
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
        } catch (validationError) {
          console.error(
            `[Force Update Loop] Response does not match forceUpdateSchema:`,
            validationError,
          );
          // Fallback
          if (result && (result as GameResponse).narrative) {
            accumulatedResponse.narrative = (result as GameResponse).narrative;
            (
              accumulatedResponse as GameResponse & { finalState: unknown }
            ).finalState = db.getState();

            return {
              response: accumulatedResponse,
              logs: allLogs,
              usage: totalUsage,
              changedEntities: Array.from(changedEntities.entries()).map(
                ([id, type]) => ({ id, type }),
              ),
            };
          }
        }
      }

      // Prompt to use tools
      conversationHistory.push(
        createUserMessage(
          `Please use the available tools. Current stage: ${currentStage}`,
        ),
      );
      stageIterations++;

      if (stageIterations >= maxIterationsPerStage) {
        const nextStage = getNextForceUpdateStage(currentStage);
        if (nextStage) {
          currentStage = nextStage;
          stageIterations = 0;
          stageTransitions++;
          addStageInstruction(currentStage);
        }
      }
    }
  }

  console.warn(
    `[Force Update Loop] Max stage transitions reached without completion`,
  );
  // Last resort fallback
  accumulatedResponse.narrative =
    "Force update completed (max transitions reached).";
  (accumulatedResponse as GameResponse & { finalState: unknown }).finalState =
    db.getState();

  // Create fallback completion log
  const fallbackLog = createLogEntry(
    protocol,
    modelId,
    "force_update_complete",
    { stageTransitions, method: "max_transitions_fallback" },
    {
      totalToolCalls: allLogs.reduce(
        (sum, log) => sum + (log.toolCalls?.length || 0),
        0,
      ),
    },
    totalUsage,
  );
  allLogs.push(fallbackLog);

  return {
    response: accumulatedResponse,
    logs: allLogs,
    usage: totalUsage,
    changedEntities: Array.from(changedEntities.entries()).map(
      ([id, type]) => ({
        id,
        type,
      }),
    ),
  };
};
