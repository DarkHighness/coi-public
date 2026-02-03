/**
 * Summary Tool Handler
 *
 * Handles tool execution for summary loop.
 * Stage-less design: only query/list tools + finish_summary.
 */

import type { SummaryLoopInput } from "./summary";
import type { SummaryLoopState } from "./summaryInitializer";

// ============================================================================
// Tool Execution
// ============================================================================

export function executeSummaryToolCall(
  name: string,
  args: Record<string, unknown>,
  input: SummaryLoopInput,
  loopState: SummaryLoopState,
): unknown {
  void loopState;
  const { segmentsToSummarize, nodeRange } = input;

  // Handle segment queries with redundancy check
  if (name === "summary_query_segments") {
    return handleQuerySegments(args, segmentsToSummarize, nodeRange);
  }

  // Handle state queries
  if (name === "summary_query_state") {
    return handleQueryState(args, input.gameState);
  }

  // Handle finish summary
  if (name === "finish_summary") {
    return handleFinishSummary(args, input);
  }

  return { success: false, error: `Unknown tool: ${name}` };
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * Handle summary_query_segments with redundancy check
 */
function handleQuerySegments(
  args: Record<string, unknown>,
  segmentsToSummarize: SummaryLoopInput["segmentsToSummarize"],
  nodeRange: SummaryLoopInput["nodeRange"],
): unknown {
  const turnRange = args.turnRange as
    | { start: number; end: number }
    | undefined;
  const keyword = args.keyword as string | undefined;

  // Check if the query is for segments already provided in context
  if (!keyword) {
    const segmentTurns = segmentsToSummarize.map((seg) => seg.segmentIdx ?? 0);
    const minTurn = Math.min(...segmentTurns);
    const maxTurn = Math.max(...segmentTurns);

    if (!turnRange) {
      return {
        success: false,
        error: "REDUNDANT_QUERY",
        message: `⚠️ ERROR: You are querying ALL segments (turns ${nodeRange.fromIndex}-${nodeRange.toIndex}), but these are ALREADY provided in your initial context! Please read the <segments_to_summarize> section - all ${segmentsToSummarize.length} segments are listed there in full. DO NOT waste tokens re-querying them. Proceed directly to finish_summary.`,
        hint: "All segments are already in your context. Use finish_summary to complete the task.",
      };
    }

    const queryStart = turnRange.start ?? minTurn;
    const queryEnd = turnRange.end ?? maxTurn;

    if (queryStart >= minTurn && queryEnd <= maxTurn) {
      return {
        success: false,
        error: "REDUNDANT_QUERY",
        message: `⚠️ ERROR: Turns ${queryStart}-${queryEnd} are ALREADY in your context! The <segments_to_summarize> section contains all segments from turn ${nodeRange.fromIndex} to ${nodeRange.toIndex}. Please read them there instead of querying again. Proceed directly to finish_summary.`,
        hint: `Turns ${queryStart}-${queryEnd} are already provided. Check <segment_list> in your context.`,
      };
    }
  }

  // Filter segments
  let filtered = segmentsToSummarize;

  if (turnRange) {
    filtered = filtered.filter((seg) => {
      const turn = seg.segmentIdx ?? 0;
      return turn >= turnRange.start && turn <= turnRange.end;
    });
  }

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

/**
 * Handle summary_query_state - get current game state
 */
function handleQueryState(
  args: Record<string, unknown>,
  gameState: SummaryLoopInput["gameState"],
): unknown {
  const entities = args.entities as string[];
  const result: Record<string, unknown> = { success: true };

  for (const entity of entities) {
    switch (entity) {
      case "inventory":
        result.inventory = gameState.inventory ?? [];
        break;
      case "npcs":
        result.npcs = gameState.npcs ?? [];
        break;
      case "locations":
        result.locations = gameState.locations ?? [];
        break;
      case "quests":
        result.quests = gameState.quests ?? [];
        break;
      case "knowledge":
        result.knowledge = gameState.knowledge ?? [];
        break;
      case "character":
        result.character = gameState.character ?? null;
        break;
    }
  }

  return result;
}

function handleFinishSummary(
  args: Record<string, unknown>,
  input: SummaryLoopInput,
): unknown {
  const { nodeRange, previousSummary } = input;

  // Validate required fields
  if (!args.displayText || !args.visible || !args.hidden) {
    return {
      success: false,
      error: "Missing required fields: displayText, visible, or hidden",
    };
  }

  // Build summary matching legacy StorySummary structure
  const summary = {
    id: (previousSummary?.id ?? -1) + 1,
    displayText: args.displayText as string,
    visible: args.visible,
    hidden: args.hidden,
    timeRange: args.timeRange as { from: string; to: string } | undefined,
    nodeRange,
  };

  return {
    success: true,
    summary,
  };
}
