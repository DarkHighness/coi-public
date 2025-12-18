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
} from "../../../tools";

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

import { sessionManager } from "../../sessionManager";
import { callWithAgenticRetry } from "../retry";

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
): string => `You are a diligent chronicler tasked with summarizing story events in a world simulation.

<role>
You maintain two layers of knowledge:
1. **VISIBLE**: What the PROTAGONIST knows and experienced
2. **HIDDEN**: GM-only truth the protagonist does NOT know

You are the GM - you know everything. Your job is to:
- Accurately capture what happened
- Preserve the visible/hidden separation
- Track cause-and-effect relationships
- Note changes in quests, relationships, inventory, character status
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

<output_language>${language}</output_language>`;

// ============================================================================
// Stage Instructions
// ============================================================================

const getSummaryStageInstruction = (stage: SummaryStage): string => {
  const instructions: Record<SummaryStage, string> = {
    query: `[STAGE: QUERY]
Review the context provided. If you need more detail about specific events or current state:
- Use \`summary_query_segments\` to examine specific turns in detail
- Use \`summary_query_state\` to check current entity states (inventory, relationships, etc.)

When you have enough information, call \`finish_summary\` to complete the summary.

Available tools: summary_query_segments, summary_query_state, finish_summary`,

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
Only use summary_query_state if you need current entity states (inventory, relationships, etc.)
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
        case "relationships":
          result.relationships = db.query("relationship");
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
  const systemInstruction = getSummarySystemInstruction(language);
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
  let stageIterations = 0;
  const maxIterations = 10; // Safety limit
  const maxIterationsPerStage = 5;

  // Add initial stage instruction
  conversationHistory.push(
    createUserMessage(getSummaryStageInstruction(currentStage)),
  );

  while (stageIterations < maxIterations) {
    console.log(
      `[Summary Loop] Stage: ${currentStage}, Iteration: ${stageIterations + 1}`,
    );

    // Get tools for current stage
    const stageTools = getSummaryToolsForStage(currentStage);
    const toolConfig = stageTools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));

    // Prepare stage input for logging
    const stageInput = {
      stage: currentStage,
      iteration: stageIterations + 1,
      conversationHistory: JSON.stringify(conversationHistory, null, 2),
      availableTools: toolConfig.map((t) => t.name),
      segmentCount: input.segmentsToSummarize.length,
      nodeRange: input.nodeRange,
    };

    // Generate response with retry
    const { result, usage, raw, retries } = await callWithAgenticRetry(
      provider,
      {
        modelId,
        systemInstruction,
        messages: [], // Overwritten
        tools: toolConfig,
        toolChoice: "required", // Summary always requires the tool
        thinkingLevel: settings.story?.thinkingLevel,
        mediaResolution: settings.story?.mediaResolution,
        temperature: settings.story?.temperature,
        topP: settings.story?.topP,
        topK: settings.story?.topK,
        minP: settings.story?.minP,
      },
      conversationHistory,
      {
        maxRetries: 3,
        onRetry: (msg, count) => {
          console.warn(`[Summary Loop] Retry ${count} due to: ${msg}`);
        },
      }
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
    const textContent = (result as { content?: string }).content;

    if (functionCalls && functionCalls.length > 0) {
      const turnToolCalls: ToolCallRecord[] = [];

      conversationHistory.push(
        createToolCallMessage(
          functionCalls.map((fc) => ({
            id: fc.id,
            name: fc.name,
            arguments: fc.args,
          })),
          textContent,
        ),
      );

      const toolResponses: Array<{
        toolCallId: string;
        name: string;
        content: unknown;
      }> = [];

      for (const call of functionCalls) {
        const { id: callId, name, args } = call;
        console.log(`[Summary Loop] Tool: ${name}`, args);

        // Handle finish_summary
        if (name === "finish_summary") {
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

          // Log with full input/output details
          const log = createLogEntry(
            protocol,
            modelId,
            "summary-complete",
            {
              stage: currentStage,
              stageIterations,
              segmentCount: input.segmentsToSummarize.length,
              nodeRange: input.nodeRange,
            },
            { toolCount: functionCalls.length, summary },
            totalUsage,
            [...turnToolCalls, finishToolCall],
            undefined, // generationDetails
            summary, // parsedResult
            stageInput,
            rawResponse,
          );
          allLogs.push(log);

          return {
            summary,
            logs: allLogs,
            usage: totalUsage,
          };
        }

        // Execute other tools
        const output = executeSummaryToolCall(name, args, input, db);

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
      const log = createLogEntry(
        protocol,
        modelId,
        `summary-${currentStage}`,
        {
          stage: currentStage,
          iteration: stageIterations + 1,
          segmentCount: input.segmentsToSummarize.length,
          nodeRange: input.nodeRange,
        },
        { toolCount: turnToolCalls.length, toolResults: toolResponses },
        totalUsage,
        turnToolCalls,
        undefined, // generationDetails
        undefined, // parsedResult
        stageInput,
        rawResponse,
      );
      allLogs.push(log);

      stageIterations++;

      // Check stage iteration limit
      if (
        stageIterations >= maxIterationsPerStage &&
        currentStage === "query"
      ) {
        // Force advance to finish stage
        currentStage = "finish";
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
      stageIterations++;
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
