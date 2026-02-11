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
import { defineAtom, runPromptWithTrace } from "../../../prompts/trace/runtime";
import { VFS_TOOLSETS, formatVfsToolsForPrompt } from "../../../vfsToolsets";

// ============================================================================
// System Instruction
// ============================================================================

type SummarySystemInstructionInput = {
  language: string;
  nsfw?: boolean;
  detailedDescription?: boolean;
};

const summaryRoleAtom = defineAtom(
  {
    atomId: "atoms/summary/system#summaryRole",
    source: "ai/agentic/summary/summaryContext.ts",
    exportName: "summaryRoleAtom",
  },
  () => `<role>
You maintain two layers of knowledge:
1. **VISIBLE**: What the PROTAGONIST knows and experienced
2. **HIDDEN**: GM-only truth the protagonist does NOT know

You are the GM - you know everything. Your job is to:
- Accurately capture what happened
- Preserve the visible/hidden separation
- Track cause-and-effect relationships
- Note changes in quests, npcs, inventory, character status
</role>`,
);

const summaryToolsAtom = defineAtom(
  {
    atomId: "atoms/summary/system#summaryTools",
    source: "ai/agentic/summary/summaryContext.ts",
    exportName: "summaryToolsAtom",
  },
  () => `<tools>
You have these tools available:

Tool allowlist for this loop:
${formatVfsToolsForPrompt(VFS_TOOLSETS.summary.tools)}

Read-only tools:
1. \`vfs_ls\` - Locate files, pattern-match with \`patterns\`, and optionally inspect metadata via \`stat=true\`
2. \`vfs_schema\` - Inspect expected JSON fields for a path (read-only)
3. \`vfs_read\` - Read VFS files by chars, lines, or JSON pointers for exact details
4. \`vfs_search\` - Find details in the VFS (read-only)

Finish tool:
5. \`vfs_commit_summary\` - Finish by appending a summary to \`current/summary/state.json\`

When you have enough information, call \`vfs_commit_summary\`.
It MUST be your LAST tool call.

Before any summary mutation, read command protocol (hub first):
- \`current/skills/commands/runtime/SKILL.md\`
- \`current/skills/commands/runtime/summary/SKILL.md\`

Structured error recovery flow (if a tool returns \`{ success:false, code, error }\`):
1. Do NOT finish while error is unresolved.
2. Use \`code\` to choose fix path:
   - \`INVALID_ACTION\` / \`FINISH_NOT_LAST\` / \`MULTIPLE_FINISH_CALLS\`: reorder tool calls; keep exactly one finish call and make it last.
   - \`*_CROSS_FORK_BLOCKED\`: re-anchor to target fork and retry with target-fork paths only.
   - \`*_RUNTIME_FIELDS_FORBIDDEN\`: remove runtime-managed fields (\`nodeRange\`, \`lastSummarizedIndex\`, \`id\`, \`createdAt\`) from tool args.
   - \`SUMMARY_FORBIDDEN_TOKENS\`: rewrite to story facts only (no tools/retries/errors/budgets), then retry finish.
3. If the same \`code\` repeats twice, reduce scope and re-read anchor files before retrying.

<examples>
- Example (read just fields, cheaper than full file):
  Call \`vfs_read\` with:
  - path: \`current/summary/state.json\`
  - mode: \`"json"\`
  - pointers: \`["/lastSummarizedIndex", "/summaries/-1/displayText"]\`

- Example (finish):
  Call \`vfs_commit_summary\` with:
  - displayText: "..."
  - visible: { narrative, majorEvents, characterDevelopment, worldState }
  - hidden: { truthNarrative, hiddenPlots, npcActions, worldTruth, unrevealed }
  - (Do NOT provide nodeRange/lastSummarizedIndex; runtime injects these)
</examples>
</tools>`,
);

const summaryCriticalRulesAtom = defineAtom(
  {
    atomId: "atoms/summary/system#summaryCriticalRules",
    source: "ai/agentic/summary/summaryContext.ts",
    exportName: "summaryCriticalRulesAtom",
  },
  ({ language }: { language: string }) => `<critical_rules>
- VISIBLE layer: Only what the protagonist directly witnessed, learned, or experienced
- HIDDEN layer: Behind-the-scenes events, NPC secret actions, unrevealed truths
- displayText: Brief 2-3 sentences for UI, in ${language}, visible layer only
- Track ALL significant events, don't miss important details
- Note character development and relationship changes
- Capture world state changes
</critical_rules>`,
);

const summaryStyleInjectionAtom = defineAtom(
  {
    atomId: "atoms/summary/system#summaryStyleInjection",
    source: "ai/agentic/summary/summaryContext.ts",
    exportName: "summaryStyleInjectionAtom",
  },
  (_: void, trace) => `<style_injection>
  You must capture the TONE of the story, not just the facts.
  ${trace.record(styleGuide, {})}
</style_injection>`,
);

const summarySystemInstructionAtom = defineAtom(
  {
    atomId: "atoms/summary/system#getSummarySystemInstruction",
    source: "ai/agentic/summary/summaryContext.ts",
    exportName: "summarySystemInstructionAtom",
  },
  ({ language, nsfw, detailedDescription }: SummarySystemInstructionInput, trace) => {
    const header = [
      "You are a diligent chronicler tasked with summarizing story events in a world simulation.",
      nsfw
        ? "Maintain neutrality even when summarizing mature or violent content."
        : "",
      detailedDescription
        ? "Ensure key sensory details and character emotional shifts are captured in the summary."
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    return [
      header,
      trace.record(summaryRoleAtom),
      trace.record(summaryToolsAtom),
      trace.record(summaryCriticalRulesAtom, { language }),
      trace.record(gmKnowledge),
      trace.record(entityDefinitions),
      trace.record(summaryStyleInjectionAtom),
      trace.record(narrativeCausality),
      trace.record(languageEnforcement, { language }),
    ]
      .filter(Boolean)
      .join("\n\n");
  },
);

export function getSummarySystemInstruction(
  language: string,
  nsfw?: boolean,
  detailedDescription?: boolean,
): string {
  return runPromptWithTrace("summary.system", () =>
    summarySystemInstructionAtom({ language, nsfw, detailedDescription }),
  );
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
When ready, call vfs_commit_summary(...).
It MUST be your LAST tool call.
</finish_rule>`);

  return parts.join("\n\n");
}
