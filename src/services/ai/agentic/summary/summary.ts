/**
 * ============================================================================
 * Summary Agentic Loop - AI 驱动的故事摘要生成
 * ============================================================================
 *
 * 设计理念：
 * - 只传递最少必要的上下文（上一轮摘要 + 本轮对话）
 * - 让 AI 自主决定需要查询什么额外信息
 * - 两个阶段：query（查询）和 finish（完成）
 *
 * 与 adventure.ts 的 runAgenticLoop 类似，但更轻量：
 * - 没有 add/remove/update 阶段
 * - 专注于信息收集和摘要生成
 */

import {
  AISettings,
  LogEntry,
  TokenUsage,
  ToolCallRecord,
  StorySummary,
  StorySegment,
  GameState,
  UnifiedMessage,
} from "../../../../types";

import { ToolCallResult } from "../../../providers/types";
import { GameDatabase } from "../../../gameDatabase";
import {
  getSummaryToolsForStage,
  SummaryStage,
  getNextSummaryStage,
  SUMMARY_STAGE_ORDER,
  findQueryToolsForEntities,
} from "../../../tools";
import {
  hasHandler,
  dispatchToolCall,
  type ToolContext,
} from "../../../tools/toolHandlerRegistry";

import {
  createUserMessage,
  createToolCallMessage,
  createToolResponseMessage,
} from "../../../messageTypes";

import {
  getProviderConfig,
  createLogEntry,
  createProviderConfig,
} from "../../utils";
import {
  getToolInfo,
  ZodToolDefinition,
  formatZodError,
} from "../../../providers/utils";

import { getLanguageEnforcement } from "../../../prompts";

import { ALL_DEFINED_TOOLS } from "../../../tools";

import { sessionManager } from "../../sessionManager";
import { callWithAgenticRetry } from "../retry";
import {
  BudgetState,
  createBudgetState,
  generateBudgetPrompt,
  checkBudgetExhaustion,
  incrementToolCalls,
  incrementRetries,
  incrementIterations,
  getBudgetSummary,
} from "../budgetUtils";

// ============================================================================
// Types
// ============================================================================

export interface SummaryAgenticLoopResult {
  summary: StorySummary | null;
  logs: LogEntry[];
  usage: TokenUsage;
}

export interface SummaryLoopInput {
  /** Previous summary (the one before the segments being summarized) */
  previousSummary: StorySummary | null;
  /** Segments to be summarized */
  segmentsToSummarize: StorySegment[];
  /** Full game state for queries */
  gameState: GameState;
  /** Node index range being summarized */
  nodeRange: { fromIndex: number; toIndex: number };
  /** Language for output */
  language: string;
  /** AI Settings */
  settings: AISettings;
}

// ============================================================================
// System Instruction
// ============================================================================

const getSummarySystemInstruction = (
  language: string,
  isLiteMode?: boolean,
  isNSFW?: boolean,
  isDetailedDescription?: boolean,
): string => `You are a diligent chronicler tasked with summarizing story events in a world simulation.
${isLiteMode ? "Focus on core facts and essential plot points only. Be concise." : ""}
${isNSFW ? "Maintain neutrality even when summarizing mature or violent content." : ""}
${isDetailedDescription ? "Ensure key sensory details and character emotional shifts are captured in the summary." : ""}

<role>
You maintain two layers of knowledge:
1. **VISIBLE**: What the PROTAGONIST knows and experienced
2. **HIDDEN**: GM-only truth the protagonist does NOT know

You are the GM - you know everything. Your job is to:
- Accurately capture what happened
- Preserve the visible/hidden separation
- Track cause-and-effect relationships
- Note changes in quests, npcs, inventory, character status
</role>

<process>
1. First, review the previous summary and current turn info provided
2. If you need MORE DETAIL, use query tools to examine specific segments or game state
3. When ready, call finish_summary with your comprehensive summary
</process>

<critical_rules>
- VISIBLE layer: Only what the protagonist directly witnessed, learned, or experienced
- HIDDEN layer: Behind-the-scenes events, NPC secret actions, unrevealed truths
- displayText: Brief 2-3 sentences for UI, in ${language}, visible layer only
- Track ALL significant events, don't miss important details
- Note character development and relationship changes
- Capture world state changes
</critical_rules>

${getLanguageEnforcement(language)}`;

// ============================================================================
// Stage Instructions
// ============================================================================

const getSummaryStageInstruction = (stage: SummaryStage): string => {
  const instructions: Record<SummaryStage, string> = {
    query: `[STAGE: QUERY]
Review the context provided. You have these tools available:

1. \`summary_query_segments\` - Examine specific turns in detail (use sparingly, segments already provided in context)
2. \`summary_query_state\` - Check current entity states (inventory, npcs, etc.)
3. \`summary_load_query\` - Load additional query tools for specific entities:
   - entities: ["inventory", "npcs", "locations", "quests", "knowledge", "factions", "timeline", "character"]
   - Once loaded, use the new tools (e.g., query_inventory, query_npcs) for detailed queries

When you have enough information, call \`finish_summary\` to complete the summary.

Available tools: summary_query_segments, summary_query_state, summary_load_query, finish_summary`,

    finish: `[STAGE: FINISH]
You MUST now call \`finish_summary\` with the complete summary.

Ensure you include:
- displayText: Brief summary for UI (story language)
- visible: What protagonist knows
- hidden: GM-only truth

Available tool: finish_summary`,
  };
  return instructions[stage];
};

// ============================================================================
// Build Initial Context
// ============================================================================

/**
 * Build minimal initial context for summary generation
 * Lists ALL segments with clear turn markers so AI doesn't need to query them
 */
const buildSummaryInitialContext = (input: SummaryLoopInput): string => {
  const { previousSummary, segmentsToSummarize, nodeRange } = input;

  const parts: string[] = [];

  // Previous summary
  if (previousSummary) {
    parts.push(`<previous_summary>
<display_text>${previousSummary.displayText}</display_text>
<visible>
  <narrative>${previousSummary.visible.narrative}</narrative>
  <major_events>${JSON.stringify(previousSummary.visible.majorEvents)}</major_events>
  <character_development>${previousSummary.visible.characterDevelopment}</character_development>
  <world_state>${previousSummary.visible.worldState}</world_state>
</visible>
<hidden>
  <truth_narrative>${previousSummary.hidden.truthNarrative}</truth_narrative>
  <hidden_plots>${JSON.stringify(previousSummary.hidden.hiddenPlots)}</hidden_plots>
  <npc_actions>${JSON.stringify(previousSummary.hidden.npcActions)}</npc_actions>
  <world_truth>${previousSummary.hidden.worldTruth}</world_truth>
  <unrevealed>${JSON.stringify(previousSummary.hidden.unrevealed)}</unrevealed>
</hidden>
${previousSummary.timeRange ? `<time_range from="${previousSummary.timeRange.from}" to="${previousSummary.timeRange.to}" />` : ""}
${previousSummary.nodeRange ? `<node_range from="${previousSummary.nodeRange.fromIndex}" to="${previousSummary.nodeRange.toIndex}" />` : ""}
</previous_summary>`);
  } else {
    parts.push(
      `<previous_summary>None - this is the first summary</previous_summary>`,
    );
  }

  // Current segments to summarize - LIST ALL OF THEM
  const segmentCount = segmentsToSummarize.length;
  const firstSegment = segmentsToSummarize[0];
  const lastSegment = segmentsToSummarize[segmentCount - 1];

  // Get time info from segments
  const startTime = firstSegment?.stateSnapshot?.time || "Unknown";
  const endTime = lastSegment?.stateSnapshot?.time || "Unknown";
  const startLocation =
    firstSegment?.stateSnapshot?.currentLocation || "Unknown";
  const endLocation = lastSegment?.stateSnapshot?.currentLocation || "Unknown";

  // Build segment list with clear markers
  const segmentListItems: string[] = [];
  for (let i = 0; i < segmentsToSummarize.length; i++) {
    const seg = segmentsToSummarize[i];
    const turnNum = seg.segmentIdx ?? nodeRange.fromIndex + i;
    const roleLabel =
      seg.role === "user"
        ? "PLAYER_ACTION"
        : seg.role === "model"
          ? "NARRATIVE"
          : "SYSTEM";
    const location = seg.stateSnapshot?.currentLocation || "";
    const time = seg.stateSnapshot?.time || "";

    segmentListItems.push(`  <segment turn="${turnNum}" role="${roleLabel}"${location ? ` location="${location}"` : ""}${time ? ` time="${time}"` : ""}>
${seg.text || "(empty)"}
  </segment>`);
  }

  parts.push(`<segments_to_summarize count="${segmentCount}" node_range="${nodeRange.fromIndex}-${nodeRange.toIndex}">
<metadata>
  <time_range from="${startTime}" to="${endTime}" />
  <location_change from="${startLocation}" to="${endLocation}" />
</metadata>

<important_notice>
⚠️ ALL ${segmentCount} segments are listed below in FULL. You already have complete context.
DO NOT use summary_query_segments to query these turns - they are already provided!
Only use summary_query_state if you need current entity states (inventory, npcs, etc.)
</important_notice>

<segment_list>
${segmentListItems.join("\n\n")}
</segment_list>
</segments_to_summarize>`);

  return parts.join("\n\n");
};

// ============================================================================
// Tool Execution
// ============================================================================

/**
 * Execute a summary tool call
 */
const executeSummaryToolCall = (
  name: string,
  args: Record<string, unknown>,
  input: SummaryLoopInput,
  db: GameDatabase,
): unknown => {
  const { segmentsToSummarize, nodeRange } = input;

  // summary_query_segments - WARN if querying segments already in context
  if (name === "summary_query_segments") {
    const turnRange = args.turnRange as
      | { start: number; end: number }
      | undefined;
    const keyword = args.keyword as string | undefined;

    // Check if the query is for segments already provided in context
    if (!keyword) {
      // If no keyword filter, check if turn range is within provided segments
      const segmentTurns = segmentsToSummarize.map(
        (seg) => seg.segmentIdx ?? 0,
      );
      const minTurn = Math.min(...segmentTurns);
      const maxTurn = Math.max(...segmentTurns);

      if (!turnRange) {
        // Querying all segments - these are ALREADY in your context!
        return {
          success: false,
          error: "REDUNDANT_QUERY",
          message: `⚠️ ERROR: You are querying ALL segments (turns ${nodeRange.fromIndex}-${nodeRange.toIndex}), but these are ALREADY provided in your initial context! Please read the <segments_to_summarize> section - all ${segmentsToSummarize.length} segments are listed there in full. DO NOT waste tokens re-querying them. Proceed directly to finish_summary.`,
          hint: "All segments are already in your context. Use finish_summary to complete the task.",
        };
      }

      const queryStart = turnRange.start ?? minTurn;
      const queryEnd = turnRange.end ?? maxTurn;

      // Check if query range is entirely within the provided segments
      if (queryStart >= minTurn && queryEnd <= maxTurn) {
        return {
          success: false,
          error: "REDUNDANT_QUERY",
          message: `⚠️ ERROR: Turns ${queryStart}-${queryEnd} are ALREADY in your context! The <segments_to_summarize> section contains all segments from turn ${nodeRange.fromIndex} to ${nodeRange.toIndex}. Please read them there instead of querying again. Proceed directly to finish_summary.`,
          hint: `Turns ${queryStart}-${queryEnd} are already provided. Check <segment_list> in your context.`,
        };
      }
    }

    // If there's a keyword filter, allow the query (might be searching for specific content)
    let filtered = segmentsToSummarize;

    // Filter by turn range
    if (turnRange) {
      filtered = filtered.filter((seg) => {
        const turn = seg.segmentIdx ?? 0;
        return turn >= turnRange.start && turn <= turnRange.end;
      });
    }

    // Filter by keyword
    if (keyword) {
      try {
        const regex = new RegExp(keyword, "i");
        filtered = filtered.filter((seg) => regex.test(seg.text || ""));
      } catch {
        filtered = filtered.filter((seg) =>
          (seg.text || "").toLowerCase().includes(keyword.toLowerCase()),
        );
      }
    }

    // If keyword search returned all segments, also warn
    if (keyword && filtered.length === segmentsToSummarize.length) {
      return {
        success: true,
        warning: `Note: Your keyword "${keyword}" matched ALL ${filtered.length} segments, which are already in your context. Consider proceeding to finish_summary.`,
        totalSegments: filtered.length,
        segments: filtered.map((seg) => ({
          turn: seg.segmentIdx,
          role: seg.role,
          text: seg.text,
          location: seg.stateSnapshot?.currentLocation,
          time: seg.stateSnapshot?.time,
        })),
      };
    }

    // Return formatted segments
    return {
      success: true,
      totalSegments: filtered.length,
      segments: filtered.map((seg) => ({
        turn: seg.segmentIdx,
        role: seg.role,
        text: seg.text,
        location: seg.stateSnapshot?.currentLocation,
        time: seg.stateSnapshot?.time,
      })),
    };
  }

  // summary_query_state - get current game state
  if (name === "summary_query_state") {
    const entities = args.entities as string[];
    const result: Record<string, unknown> = { success: true };

    for (const entity of entities) {
      switch (entity) {
        case "inventory":
          result.inventory = db.query("inventory");
          break;
        case "npcs":
          result.npcs = db.query("npc");
          break;
        case "locations":
          result.locations = db.query("location");
          break;
        case "quests":
          result.quests = db.query("quest");
          break;
        case "knowledge":
          result.knowledge = db.query("knowledge");
          break;
        case "character":
          result.character = {
            profile: db.query("character", "profile"),
            attributes: db.query("character", "attributes"),
            conditions: db.query("character", "conditions"),
          };
          break;
      }
    }

    return result;
  }

  // Delegate to tool handler registry for dynamically loaded query/list tools
  // (e.g., query_inventory, list, query_npcs loaded via summary_load_query)
  if (hasHandler(name)) {
    const toolContext: ToolContext = {
      db,
      gameState: input.gameState,
    };
    return dispatchToolCall(name, args, toolContext);
  }

  return { success: false, error: `Unknown tool: ${name}` };
};

// ============================================================================
// Main Agentic Loop
// ============================================================================

/**
 * Run the summary agentic loop
 *
 * Process:
 * 1. Start with minimal context (previous summary + turn overview)
 * 2. AI can query for more detail if needed
 * 3. AI produces final summary via finish_summary tool
 */
export const runSummaryAgenticLoop = async (
  input: SummaryLoopInput,
): Promise<SummaryAgenticLoopResult> => {
  const { settings, language, gameState, nodeRange } = input;

  // Get provider config
  const providerInfo = getProviderConfig(settings, "story");
  if (!providerInfo) {
    throw new Error("Story provider not configured");
  }
  const { instance, modelId } = providerInfo;
  const protocol = instance.protocol;

  const summarySession = await sessionManager.getOrCreateSession({
    slotId: "summary",
    forkId: -2,
    providerId: instance.id,
    modelId,
    protocol: instance.protocol,
  });
  const provider = sessionManager.getProvider(summarySession.id, instance);

  // Initialize
  const systemInstruction = getSummarySystemInstruction(
    language,
    settings.extra?.liteMode,
    settings.extra?.nsfw,
    settings.extra?.detailedDescription,
  );
  const initialContext = buildSummaryInitialContext(input);

  let conversationHistory: UnifiedMessage[] = [
    createUserMessage(`[CONTEXT: Summary Task]\n${initialContext}`),
  ];

  const allLogs: LogEntry[] = [];
  let totalUsage: TokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };

  // Create GameDatabase for state queries
  const db = new GameDatabase({
    ...gameState,
    knowledge: gameState.knowledge || [],
    factions: gameState.factions || [],
    timeline: gameState.timeline || [],
    causalChains: gameState.causalChains || [],
    time: gameState.time || "Unknown",
  });

  // Stage tracking
  let currentStage: SummaryStage = "query";
  let stageIterationsInCurrentStage = 0;
  const maxIterationsPerStage = 5;

  // Initialize budget tracking
  const budgetState: BudgetState = createBudgetState(settings);

  // Dynamic tool tracking - start with base stage tools
  let activeTools: ZodToolDefinition[] = [...getSummaryToolsForStage("query")];

  // Add initial stage instruction
  conversationHistory.push(
    createUserMessage(getSummaryStageInstruction(currentStage)),
  );

  while (budgetState.loopIterationsUsed < budgetState.loopIterationsMax) {
    // Check budget exhaustion
    const budgetCheck = checkBudgetExhaustion(budgetState);
    if (budgetCheck.exhausted) {
      console.warn(`[Summary Loop] ${budgetCheck.message}`);
      break;
    }

    // Inject budget status
    const budgetPrompt = generateBudgetPrompt(budgetState);
    conversationHistory.push(
      createUserMessage(`[SYSTEM: BUDGET STATUS]\n${budgetPrompt}`),
    );

    console.log(
      `[Summary Loop] Stage: ${currentStage}, Iteration: ${budgetState.loopIterationsUsed + 1}/${budgetState.loopIterationsMax}, Budget: ${getBudgetSummary(budgetState)}`,
    );

    // Use active tools (includes dynamically loaded query tools)
    const toolConfig = activeTools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));

    // Prepare stage input for logging
    const stageInput = {
      stage: currentStage,
      iteration: budgetState.loopIterationsUsed + 1,
      conversationHistory: JSON.stringify(conversationHistory, null, 2),
      availableTools: toolConfig.map((t) => t.name),
      segmentCount: input.segmentsToSummarize.length,
      nodeRange: input.nodeRange,
      budget: getBudgetSummary(budgetState),
    };

    // Generate response with retry
    const { result, usage, raw, retries } = await callWithAgenticRetry(
      provider,
      {
        modelId,
        systemInstruction,
        messages: [], // Overwritten
        tools: toolConfig,
        toolChoice: sessionManager.getEffectiveToolChoice(
          summarySession.id,
          "required",
          settings.extra?.forceAutoToolChoice,
        ),
        mediaResolution: settings.story?.mediaResolution,
        temperature: settings.story?.temperature,
        topP: settings.story?.topP,
        topK: settings.story?.topK,
        minP: settings.story?.minP,
        thinkingEffort: settings.story?.thinkingEffort,
      },
      conversationHistory,
      {
        maxRetries: budgetState.retriesMax,
        onRetry: (msg, count) => {
          console.warn(
            `[Summary Loop] Retry ${count}/${budgetState.retriesMax} due to: ${msg}`,
          );
          // 1. Increment retries in budget state
          incrementRetries(budgetState);

          // 2. Generate updated budget prompt
          const retryBudgetPrompt = generateBudgetPrompt(budgetState);

          // 3. Inject into history so the model sees it BEFORE the next attempt
          conversationHistory.push(
            createUserMessage(`[SYSTEM: BUDGET UPDATE]\n${retryBudgetPrompt}`),
          );
        },
      },
    );

    // Capture raw response for logging
    const rawResponse = JSON.stringify(raw ?? result, null, 2);

    // Accumulate usage
    if (usage) {
      totalUsage.promptTokens += usage.promptTokens || 0;
      totalUsage.completionTokens += usage.completionTokens || 0;
      totalUsage.totalTokens += usage.totalTokens || 0;
    }

    // Process tool calls
    const functionCalls = (result as { functionCalls?: ToolCallResult[] })
      .functionCalls;

    // Ensure all tool calls have IDs (OpenAI requirement)
    if (functionCalls) {
      for (const fc of functionCalls) {
        if (!fc.id) {
          fc.id = `call_${Math.random().toString(36).slice(2, 11)}`;
        }
      }
    }
    const textContent = (result as { content?: string }).content;

    if (functionCalls && functionCalls.length > 0) {
      // Track tool calls in budget
      incrementToolCalls(budgetState, functionCalls.length);
      console.log(
        `[Summary Loop] Processing ${functionCalls.length} tool calls. Budget: ${getBudgetSummary(budgetState)}`,
      );

      const turnToolCalls: ToolCallRecord[] = [];

      conversationHistory.push(
        createToolCallMessage(
          functionCalls.map((fc) => ({
            id: fc.id,
            name: fc.name,
            arguments: fc.args,
            thoughtSignature: fc.thoughtSignature, // Include for Gemini 3 models
          })),
          textContent,
        ),
      );

      const toolResponses: Array<{
        toolCallId: string;
        name: string;
        content: unknown;
      }> = [];

      // Track errors in this turn
      let hasErrors = false;
      const failedTools: string[] = [];

      for (const call of functionCalls) {
        const { id: callId, name, args } = call;
        console.log(`[Summary Loop] Tool: ${name}`, args);

        // Handle finish_summary
        if (name === "finish_summary") {
          // Block if there were errors in this turn
          if (hasErrors) {
            const errorOutput = {
              success: false,
              error: `[ERROR: TOOL_FAILURES] Cannot finish summary. The following tools failed:\n- ${failedTools.join("\n- ")}\n\nFix these errors before calling finish_summary.`,
              code: "BLOCKED_BY_ERRORS",
              failedTools,
            };
            turnToolCalls.push({
              name,
              input: args,
              output: errorOutput,
              timestamp: Date.now(),
            });
            toolResponses.push({
              toolCallId: callId,
              name,
              content: errorOutput,
            });
            continue;
          }

          const summary: StorySummary = {
            id: (input.previousSummary?.id ?? -1) + 1,
            displayText: args.displayText as string,
            visible: args.visible as StorySummary["visible"],
            hidden: args.hidden as StorySummary["hidden"],
            timeRange: args.timeRange as StorySummary["timeRange"],
            nodeRange: nodeRange,
          };

          // Record this tool call
          const finishToolCall: ToolCallRecord = {
            name: "finish_summary",
            input: args,
            output: { success: true, summary },
            timestamp: Date.now(),
          };

          // Validation for finish_summary
          const finishToolDef = ALL_DEFINED_TOOLS.find(
            (t) => t.name === "finish_summary",
          );
          if (finishToolDef) {
            const validationResult = finishToolDef.parameters.safeParse(args);
            if (!validationResult.success) {
              const errorOutput = {
                success: false,
                error: `[VALIDATION_ERROR] Invalid parameters for "finish_summary". Please refer to the schema and correct your arguments:\n\n${getToolInfo(finishToolDef as any)}\n\nErrors:\n${formatZodError(validationResult.error)}`,
                code: "INVALID_PARAMS",
              };
              turnToolCalls.push({
                name,
                input: args,
                output: errorOutput,
                timestamp: Date.now(),
              });
              toolResponses.push({
                toolCallId: callId,
                name,
                content: errorOutput,
              });
              hasErrors = true;
              failedTools.push(name);
              continue;
            }
          }

          // Log with full input/output details
          const log = createLogEntry({
            provider: protocol,
            model: modelId,
            endpoint: "summary-complete",
            stage: "complete",
            usage: totalUsage,
            toolCalls: [...turnToolCalls, finishToolCall],
            parsedResult: summary,
            stageInput,
            rawResponse,
            request: {
              stage: currentStage,
              loopIteration: budgetState.loopIterationsUsed,
              segmentCount: input.segmentsToSummarize.length,
              nodeRange: input.nodeRange,
            },
            response: { toolCount: functionCalls.length, summary },
          });
          allLogs.push(log);

          return {
            summary,
            logs: allLogs,
            usage: totalUsage,
          };
        }

        // Handle summary_load_query - dynamically load query tools
        if (name === "summary_load_query") {
          const entities = args.entities as string[];
          const loadedTools = findQueryToolsForEntities(entities);
          const addedTools: string[] = [];

          for (const tool of loadedTools) {
            if (!activeTools.some((t) => t.name === tool.name)) {
              activeTools.push(tool);
              addedTools.push(tool.name);
            }
          }

          const output = {
            success: true,
            message: settings.extra?.clearerSearchTool
              ? `Loaded ${addedTools.length} query tools:\n\n${
                  addedTools
                    .map((name) => {
                      const tool = ALL_DEFINED_TOOLS.find(
                        (t) => t.name === name,
                      );
                      return tool ? getToolInfo(tool as any) : name;
                    })
                    .join("\n\n") || "None (already active)"
                }`
              : `Loaded ${addedTools.length} query tools: ${addedTools.join(", ") || "None (already active)"}`,
            loadedTools: addedTools,
          };

          turnToolCalls.push({
            name,
            input: args,
            output,
            timestamp: Date.now(),
          });
          toolResponses.push({ toolCallId: callId, name, content: output });
          continue;
        }

        // Execute other tools
        const output = executeSummaryToolCall(name, args, input, db);

        // Track errors from query tools
        if (
          output &&
          typeof output === "object" &&
          "success" in output &&
          (output as any).success === false
        ) {
          hasErrors = true;
          failedTools.push(name);
        }
        if (
          output &&
          typeof output === "object" &&
          "error" in output &&
          (output as any).error === "REDUNDANT_QUERY"
        ) {
          // REDUNDANT_QUERY is not a blocking error, just a warning
          // Don't add to failedTools
        }

        turnToolCalls.push({
          name,
          input: args,
          output,
          timestamp: Date.now(),
        });
        toolResponses.push({ toolCallId: callId, name, content: output });
      }

      // Add tool responses
      conversationHistory.push(createToolResponseMessage(toolResponses));

      // Log this iteration with full input/output details
      const log = createLogEntry({
        provider: protocol,
        model: modelId,
        endpoint: `summary-${currentStage}`,
        stage: currentStage,
        usage: totalUsage,
        toolCalls: turnToolCalls,
        stageInput,
        rawResponse,
        request: {
          stage: currentStage,
          iteration: budgetState.loopIterationsUsed + 1,
          segmentCount: input.segmentsToSummarize.length,
          nodeRange: input.nodeRange,
          budget: getBudgetSummary(budgetState),
        },
        response: {
          toolCount: turnToolCalls.length,
          toolResults: toolResponses,
        },
      });
      allLogs.push(log);

      incrementIterations(budgetState);
      stageIterationsInCurrentStage++;

      // Check stage iteration limit
      if (
        stageIterationsInCurrentStage >= maxIterationsPerStage &&
        currentStage === "query"
      ) {
        // Force advance to finish stage
        currentStage = "finish";
        stageIterationsInCurrentStage = 0;
        conversationHistory.push(
          createUserMessage(getSummaryStageInstruction(currentStage)),
        );
      }
    } else {
      // No tool calls - this shouldn't happen, but handle it
      console.warn(
        "[Summary Loop] No tool calls received, forcing finish stage",
      );
      currentStage = "finish";
      conversationHistory.push(
        createUserMessage(getSummaryStageInstruction(currentStage)),
      );
      incrementIterations(budgetState);
    }
  }

  // Max iterations reached without finishing
  console.error("[Summary Loop] Max iterations reached without finishing");
  return {
    summary: null,
    logs: allLogs,
    usage: totalUsage,
  };
};
