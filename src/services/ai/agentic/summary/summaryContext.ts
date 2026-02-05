/**
 * Summary Context Builder
 *
 * Functions for building summary context and instructions.
 */

import type { SummaryLoopInput } from "./summary";
import { readConversationIndex, readForkTree, readTurnFile, buildTurnPath } from "../../../vfs/conversation";

// Atoms
import {
  gmKnowledge,
  entityDefinitions,
  styleGuide,
} from "../../../prompts/atoms/core";
import { narrativeCausality } from "../../../prompts/atoms/narrative";
import { languageEnforcement } from "../../../prompts/atoms/cultural";
import { VFS_TOOLSETS, formatVfsToolsForPrompt } from "../../../vfsToolsets";

// ============================================================================
// System Instruction
// ============================================================================

export function getSummarySystemInstruction(
  language: string,
  nsfw?: boolean,
  detailedDescription?: boolean,
): string {
  return `You are a diligent chronicler tasked with summarizing story events in a world simulation.
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

Tool allowlist for this loop:
${formatVfsToolsForPrompt(VFS_TOOLSETS.summary.tools)}

Read-only tools:
1. \`vfs_ls\` / \`vfs_stat\` / \`vfs_glob\` - Locate files & check metadata without reading full content
2. \`vfs_schema\` - Inspect expected JSON fields for a path (read-only)
3. \`vfs_ls_entries\` - Get a compact catalog of entities by category (read-only)
4. \`vfs_read\` / \`vfs_read_many\` / \`vfs_read_json\` - Read VFS files (or specific JSON pointers) for exact details
5. \`vfs_search\` / \`vfs_grep\` - Find details in the VFS (read-only)

Finish tool:
6. \`vfs_finish_summary\` - Finish by appending a summary to \`current/summary/state.json\`

When you have enough information, call \`vfs_finish_summary\`.
It MUST be your LAST tool call.

<examples>
- Example (read just fields, cheaper than full file):
  Call \`vfs_read_json\` with:
  - path: \`current/summary/state.json\`
  - pointers: \`["/lastSummarizedIndex", "/summaries/-1/displayText"]\`

- Example (finish):
  Call \`vfs_finish_summary\` with:
  - displayText: "..."
  - visible: { narrative, majorEvents, characterDevelopment, worldState }
  - hidden: { truthNarrative, hiddenPlots, npcActions, worldTruth, unrevealed }
  - nodeRange: { fromIndex: X, toIndex: Y }
  - lastSummarizedIndex: Y + 1
</examples>
</tools>

<critical_rules>
- VISIBLE layer: Only what the protagonist directly witnessed, learned, or experienced
- HIDDEN layer: Behind-the-scenes events, NPC secret actions, unrevealed truths
- displayText: Brief 2-3 sentences for UI, in ${language}, visible layer only
- Track ALL significant events, don't miss important details
- Note character development and relationship changes
- Capture world state changes
</critical_rules>

${gmKnowledge()}

${entityDefinitions()}

<style_injection>
  You must capture the TONE of the story, not just the facts.
  ${styleGuide({})}
</style_injection>

${narrativeCausality({})}

${languageEnforcement({ language })}`;
}

// ============================================================================
// Initial Context
// ============================================================================

/**
 * Build minimal initial context for summary generation
 * Lists ALL segments with clear turn markers so AI doesn't need to query them
 */
export function buildSummaryInitialContext(input: SummaryLoopInput): string {
  const { baseSummaries, baseIndex, nodeRange, pendingPlayerAction, vfsSession } =
    input;
  const parts: string[] = [];

  const previousSummary =
    baseSummaries.length > 0 ? baseSummaries[baseSummaries.length - 1] : null;

  const snapshot = vfsSession.snapshot();
  const index = readConversationIndex(snapshot);
  const forkTree = readForkTree(snapshot);

  const activeForkId =
    typeof index?.activeForkId === "number" ? index.activeForkId : null;
  const forkCount =
    typeof forkTree?.nextForkId === "number" ? Math.max(forkTree.nextForkId - 1, 0) : null;
  const activeTurnNumber =
    activeForkId !== null
      ? (index?.latestTurnNumberByFork?.[String(activeForkId)] ?? null)
      : null;

  const targetLastSummarizedIndex = nodeRange.toIndex + 1;

  parts.push(`<runtime_meta
  active_fork_id="${activeForkId ?? "unknown"}"
  fork_count="${forkCount ?? "unknown"}"
  active_turn_number="${activeTurnNumber ?? "unknown"}"
  node_range="${nodeRange.fromIndex}-${nodeRange.toIndex}"
  base_last_summarized_index="${baseIndex}"
  target_last_summarized_index="${targetLastSummarizedIndex}"
/>`);

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

  const xmlEscapeAttr = (value: string): string =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/\r?\n/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const excerpt = (value: unknown, maxChars: number): string => {
    if (typeof value !== "string") return "";
    const normalized = value.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
    if (normalized.length <= maxChars) return normalized;
    return `${normalized.slice(0, maxChars)}…`;
  };

  const turnItems: string[] = [];
  const order =
    activeForkId !== null ? (index?.turnOrderByFork?.[String(activeForkId)] ?? []) : [];

  let segmentIdx = 0;
  for (const turnId of order) {
    const match = /fork-(\d+)\/turn-(\d+)/.exec(turnId);
    if (!match) continue;
    const forkId = Number(match[1]);
    const turnNumber = Number(match[2]);
    if (!Number.isFinite(forkId) || !Number.isFinite(turnNumber)) continue;
    const turn = readTurnFile(snapshot, forkId, turnNumber);
    if (!turn) continue;

    const hasUserAction =
      typeof turn.userAction === "string" && turn.userAction.trim().length > 0;

    const rangeStart = segmentIdx;
    if (hasUserAction) {
      segmentIdx += 1;
    }
    segmentIdx += 1; // model node always exists
    const rangeEnd = segmentIdx - 1;

    const intersects =
      rangeEnd >= nodeRange.fromIndex && rangeStart <= nodeRange.toIndex;
    if (!intersects) {
      continue;
    }

    const userExcerpt = excerpt(turn.userAction, 220);
    const assistantExcerpt = excerpt(turn.assistant?.narrative, 260);
    turnItems.push(
      `  <turn path="${buildTurnPath(forkId, turnNumber)}" segment_range="${rangeStart}-${rangeEnd}" user_excerpt="${xmlEscapeAttr(userExcerpt)}" assistant_excerpt="${xmlEscapeAttr(assistantExcerpt)}" />`,
    );
  }

  parts.push(`<turn_files count="${turnItems.length}">
${turnItems.join("\n")}
</turn_files>`);

  if (pendingPlayerAction && typeof pendingPlayerAction.text === "string") {
    parts.push(`<pending_player_action segmentIdx="${pendingPlayerAction.segmentIdx}">
${pendingPlayerAction.text}
</pending_player_action>`);
  }

  parts.push(`<finish_rule>
When ready, call vfs_finish_summary(...).
It MUST be your LAST tool call.
</finish_rule>`);

  return parts.join("\n\n");
}
