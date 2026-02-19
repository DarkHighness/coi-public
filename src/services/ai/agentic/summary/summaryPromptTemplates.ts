import type { SummaryLoopInput } from "./summary";
import { buildTurnPath } from "../../../vfs/conversation";
import { canonicalizeLanguage } from "../../../prompts/languageCanonical";
import { formatLoopSkillBaseline } from "../../../prompts/skills/loopSkillBaseline";

export const QUERY_SUMMARY_CONSISTENCY_ANCHOR_MARKER =
  "[SUMMARY CONSISTENCY ANCHOR]";
export const COMPACT_SUMMARY_CONSISTENCY_ANCHOR_MARKER =
  "[COMPACT SUMMARY CONSISTENCY ANCHOR]";

const COMPACT_TRIGGER = "[SYSTEM: COMPACT_NOW]";

type SummaryConsistencyRuntime = {
  targetForkId: number;
  activeForkId: number | null;
  activeTurnId: string | null;
  targetForkLatestTurn: number | null;
};

const buildPreviousSummaryLabel = (input: SummaryLoopInput): string => {
  const previousSummary =
    input.baseSummaries.length > 0
      ? input.baseSummaries[input.baseSummaries.length - 1]
      : null;

  if (!previousSummary) {
    return "none";
  }

  return `id=${String(previousSummary.id ?? "unknown")}, createdAt=${String(previousSummary.createdAt ?? "unknown")}, nodeRange=${previousSummary.nodeRange ? `${previousSummary.nodeRange.fromIndex}-${previousSummary.nodeRange.toIndex}` : "unknown"}`;
};

const buildLatestTurnPath = (runtime: SummaryConsistencyRuntime): string => {
  return typeof runtime.targetForkLatestTurn === "number"
    ? `current/${buildTurnPath(runtime.targetForkId, runtime.targetForkLatestTurn)}`
    : `current/conversation/turns/fork-${runtime.targetForkId}/turn-<n>.json`;
};

export const buildQuerySummaryConsistencyAnchor = (
  input: SummaryLoopInput,
  modeLabel: "session_compact" | "query_summary",
  runtime: SummaryConsistencyRuntime,
): string => {
  const targetLastSummarizedIndex = input.nodeRange.toIndex + 1;
  const pendingPlayerActionText = input.pendingPlayerAction?.text
    ? input.pendingPlayerAction.text.slice(0, 280)
    : "";
  const previousSummaryLabel = buildPreviousSummaryLabel(input);
  const latestTurnPath = buildLatestTurnPath(runtime);

  return `${QUERY_SUMMARY_CONSISTENCY_ANCHOR_MARKER}
Mode: ${modeLabel}
MODE CONTRACT: QUERY_SUMMARY
Target fork ID: ${runtime.targetForkId}
Active fork ID from index: ${runtime.activeForkId ?? "unknown"}
Active turn ID from index: ${runtime.activeTurnId ?? "unknown"}
Latest turn number in target fork: ${runtime.targetForkLatestTurn ?? "unknown"}
Latest turn path in target fork: \`${latestTurnPath}\`
Summary range: ${input.nodeRange.fromIndex}-${input.nodeRange.toIndex}
Base lastSummarizedIndex: ${input.baseIndex}
Required final lastSummarizedIndex: ${targetLastSummarizedIndex}
Base summaries count: ${input.baseSummaries.length}
Last summary checkpoint: ${previousSummaryLabel}
${pendingPlayerActionText ? `Pending player action (for context only): ${pendingPlayerActionText}` : ""}

Primary source for facts:
- Query target-fork VFS artifacts first; do not rely on stale memory.

Required read sequence:
1) \`current/conversation/index.json\`
2) \`current/conversation/turns/fork-${runtime.targetForkId}/turn-*.json\` — read THOROUGHLY, extract specific names, items, dialogue, choices.
3) \`forks/${runtime.targetForkId}/story/summary/state.json\`
4) \`current/summary/state.json\` (ONLY safe when active fork == target fork)
5) Optional context recall: \`current/session/<session_uid>.jsonl\` via query-style reads only

Memory doc update (MANDATORY when evidence warrants):
- Read \`workspace/SOUL.md\`, \`workspace/USER.md\`, \`workspace/PLAN.md\` (injected or via VFS).
- Update \`workspace/SOUL.md\`: GM strategic notes, narrative technique learnings, tool-usage fixes.
- Update \`workspace/USER.md\`: Player behavior patterns, choice preferences, psychology evidence.
- Update \`workspace/PLAN.md\`: Story trajectory adjustments if player actions diverged from plan.
- Write updates BEFORE calling \`vfs_finish_summary\`.
- Skip updates ONLY for purely mechanical turns (movement, inventory check) with no meaningful evidence.

Hard constraints:
- ONLY summarize target fork ${runtime.targetForkId}; NEVER cross forks.
- Do NOT summarize outside the specified summary range.
- Keep continuity with existing summaries and established story facts.
- If reading session.jsonl, use targeted lines/search windows; avoid full-file reads.
- Session read-cache rule: avoid re-reading the same file/path windows unless externally changed.
- Runtime will inject \`nodeRange\` and \`lastSummarizedIndex=${targetLastSummarizedIndex}\` for \`vfs_finish_summary\`.

Quality mandate:
- Be SPECIFIC in every field: name entities, quote dialogue, reference locations, track conditions.
- Trace CAUSALITY: why things happened, what consequences are pending.
- Preserve DECISION CONTEXT: what choices existed, what the player chose, what they rejected.
- \`nextSessionReferencesMarkdown\` must contain BOTH VFS path refs AND concrete GM strategic notes.
- Output summary content only. Never mention tools/retries/errors/budgets.`;
};

export const buildCompactSummaryConsistencyAnchor = (
  input: SummaryLoopInput,
  modeLabel: "session_compact" | "query_summary",
  runtime: SummaryConsistencyRuntime,
): string => {
  const targetLastSummarizedIndex = input.nodeRange.toIndex + 1;
  const pendingPlayerActionText = input.pendingPlayerAction?.text
    ? input.pendingPlayerAction.text.slice(0, 280)
    : "";
  const previousSummaryLabel = buildPreviousSummaryLabel(input);
  const latestTurnPath = buildLatestTurnPath(runtime);

  return `${COMPACT_SUMMARY_CONSISTENCY_ANCHOR_MARKER}
Mode: ${modeLabel}
MODE CONTRACT: SESSION_COMPACT
Target fork ID: ${runtime.targetForkId}
Active fork ID from index: ${runtime.activeForkId ?? "unknown"}
Active turn ID from index: ${runtime.activeTurnId ?? "unknown"}
Latest turn number in target fork: ${runtime.targetForkLatestTurn ?? "unknown"}
Latest turn path in target fork: \`${latestTurnPath}\`
Summary range: ${input.nodeRange.fromIndex}-${input.nodeRange.toIndex}
Base lastSummarizedIndex: ${input.baseIndex}
Required final lastSummarizedIndex: ${targetLastSummarizedIndex}
Base summaries count: ${input.baseSummaries.length}
Last summary checkpoint: ${previousSummaryLabel}
${pendingPlayerActionText ? `Pending player action (for context only): ${pendingPlayerActionText}` : ""}

Primary source for facts:
- Current session history already loaded in context.
- Do NOT rebuild full history from scratch unless evidence is missing.

Verification-only reads (optional):
- \`current/conversation/index.json\`
- \`current/conversation/turns/fork-${runtime.targetForkId}/turn-*.json\`
- \`forks/${runtime.targetForkId}/story/summary/state.json\`

Memory doc update (MANDATORY when evidence warrants):
- Update \`workspace/SOUL.md\`: GM strategic notes, narrative learnings, tool-usage fixes from this session.
- Update \`workspace/USER.md\`: Player behavior patterns, choice preferences, psychology evidence observed in session.
- Update \`workspace/PLAN.md\`: Story trajectory adjustments if player actions diverged from the plan.
- Memory docs are injected in context; re-read only when you need sections not in the injected snapshot.
- Write updates BEFORE calling \`vfs_finish_summary\`.
- Skip updates ONLY for purely mechanical turns with no meaningful evidence.

Hard constraints:
- Keep compaction scoped to target fork ${runtime.targetForkId}; NEVER cross forks.
- Do NOT summarize outside the specified summary range.
- Preserve continuity with previous summaries and in-session events.
- Session read-cache rule: avoid re-reading the same file/path windows unless externally changed.
- Runtime will inject \`nodeRange\` and \`lastSummarizedIndex=${targetLastSummarizedIndex}\` for \`vfs_finish_summary\`.

Quality mandate:
- Be SPECIFIC: name entities, quote key dialogue, reference exact locations/items/conditions.
- Trace CAUSALITY: connect causes to effects, track pending consequences.
- Preserve DECISION CONTEXT: what choices the player faced and what they chose.
- \`nextSessionReferencesMarkdown\` must contain BOTH VFS path refs AND concrete GM strategic notes.
- Output summary content only. Never mention tools/retries/errors/budgets.

Structured error recovery (when tool response is \`{ success:false, code, error }\`):
- Do NOT finish while a blocking error code is unresolved.
- \`INVALID_ACTION\` / \`FORCED_FINISH\` / \`MULTIPLE_FINISH_CALLS\` / \`FINISH_NOT_LAST\`: reorder to one valid tool-call set with finish last.
- \`WRITE_EXISTING_TARGET_RETRY_REQUIRED\` / \`FINISH_BLOCKED_BY_EXISTING_WRITE_FAILURE\`: retry failed required writes first; finish remains blocked until they succeed.
- \`COMPACT_SUMMARY_CROSS_FORK_BLOCKED\`: remove cross-fork paths and retry target-fork reads only.
- \`COMPACT_SUMMARY_RUNTIME_FIELDS_FORBIDDEN\`: remove runtime-managed fields from \`vfs_finish_summary\` args.
- \`SUMMARY_FORBIDDEN_TOKENS\`: rewrite summary fields to story facts only, then retry finish.
- If the same \`code\` appears twice, shrink scope; re-read only missing sections/anchors (or when \`[SYSTEM: EXTERNAL_FILE_CHANGES]\` is present) before retry.`;
};

export const buildCompactModeTriggerMessage = (input: {
  language: string;
  nodeRange: { fromIndex: number; toIndex: number };
  targetLastSummarizedIndex: number;
}): string => {
  const { code: languageCode } = canonicalizeLanguage(input.language);
  const compactBaseline = formatLoopSkillBaseline("summary_compact", {
    ordered: true,
  }).join("\n");

  return (
    `${COMPACT_TRIGGER}\n` +
    `You are entering **session compaction** mode.\n\n` +
    `Loop pipeline (execute in order):\n` +
    `${compactBaseline}\n` +
    `5) If details are uncertain, do bounded read-only verification on current fork.\n` +
    `6) **Update memory docs** — write \`workspace/SOUL.md\` (GM notes/learnings), \`workspace/USER.md\` (player patterns), \`workspace/PLAN.md\` (trajectory adjustments) when the summarized turns contain actionable evidence. Skip only for purely mechanical turns.\n` +
    `7) Finish once via "vfs_finish_summary" as LAST tool call.\n\n` +
    `Requirements:\n` +
    `- Produce exactly ONE summary by calling "vfs_finish_summary" as your LAST tool call.\n` +
    `- The summary MUST be in ${languageCode}.\n` +
    `- Cover nodeRange: ${input.nodeRange.fromIndex}-${input.nodeRange.toIndex}.\n` +
    `- Runtime will set lastSummarizedIndex = ${input.targetLastSummarizedIndex}.\n` +
    `- \`nextSessionReferencesMarkdown\` must contain TWO sections:\n` +
    `  1. \`## Paths\` — 2-5 VFS path references (prefer \`current/skills/**/SKILL.md\` + 1-2 anchors).\n` +
    `  2. \`## GM Notes\` — Concrete, actionable strategic observations: pending consequences with trigger conditions, narrative threads needing resolution, player behavior patterns, what the next turn should set up. Be SPECIFIC — name entities, reference turns, state conditions.\n` +
    `- DO NOT mention tools, failures, retries, budgets, or internal errors anywhere in the summary fields.\n\n` +
    `Quality mandate:\n` +
    `- Be SPECIFIC in every field: name entities by ID/name, quote key dialogue, reference exact locations.\n` +
    `- Trace CAUSALITY: connect causes to effects, note pending consequences.\n` +
    `- Preserve DECISION CONTEXT: what choices existed, what the player chose, what they rejected.\n` +
    `- ❌ NEVER write vague summaries like "events progressed" or "the story continued."\n` +
    `- ❌ NEVER write shallow GM notes like "continue the story" or "things are going well."\n\n` +
    `If compact skill files are unavailable, continue with protocol-safe tool usage and keep finish last.\n` +
    `If you need to verify details, use read-only VFS tools and stay on target fork only.\n` +
    `Across this conversation session, reuse already-read anchors instead of repeatedly reading the same files/windows.\n` +
    `Re-read only when an explicit external-change signal (\`[SYSTEM: EXTERNAL_FILE_CHANGES]\`) is present, recovery requires it, or you need unseen sections/pointers.`
  );
};
