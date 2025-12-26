/**
 * Summary Context Builder
 *
 * Functions for building summary context and instructions.
 */

import type { StorySummary, StorySegment } from "../../../../types";
import { getLanguageEnforcement } from "../../../prompts";
import type { SummaryLoopInput } from "./summary";

// ============================================================================
// System Instruction
// ============================================================================

export function getSummarySystemInstruction(
  language: string,
  liteMode?: boolean,
  nsfw?: boolean,
  detailedDescription?: boolean,
): string {
  return `You are a diligent chronicler tasked with summarizing story events in a world simulation.
${liteMode ? "Focus on core facts and essential plot points only. Be concise." : ""}
${nsfw ? "Maintain neutrality even when summarizing mature or violent content." : ""}
${detailedDescription ? "Ensure key sensory details and character emotional shifts are captured in the summary." : ""}

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

<tools>
You have these tools available:

1. \`summary_query_segments\` - Examine specific turns in detail (use sparingly, segments already provided in context)
2. \`summary_query_state\` - Check current entity states (inventory, npcs, etc.)
3. \`finish_summary\` - Complete the summary with your results

When you have enough information, call \`finish_summary\` to complete the summary.
</tools>

<critical_rules>
- VISIBLE layer: Only what the protagonist directly witnessed, learned, or experienced
- HIDDEN layer: Behind-the-scenes events, NPC secret actions, unrevealed truths
- displayText: Brief 2-3 sentences for UI, in ${language}, visible layer only
- Track ALL significant events, don't miss important details
- Note character development and relationship changes
- Capture world state changes
</critical_rules>

${getLanguageEnforcement(language)}`;
}

// ============================================================================
// Initial Context
// ============================================================================

/**
 * Build minimal initial context for summary generation
 * Lists ALL segments with clear turn markers so AI doesn't need to query them
 */
export function buildSummaryInitialContext(input: SummaryLoopInput): string {
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
}
