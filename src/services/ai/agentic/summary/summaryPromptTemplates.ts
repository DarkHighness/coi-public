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

  return `id=${String((previousSummary as any).id ?? "unknown")}, createdAt=${String((previousSummary as any).createdAt ?? "unknown")}, nodeRange=${previousSummary.nodeRange ? `${previousSummary.nodeRange.fromIndex}-${previousSummary.nodeRange.toIndex}` : "unknown"}`;
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
2) \`current/conversation/turns/fork-${runtime.targetForkId}/turn-*.json\`
3) \`forks/${runtime.targetForkId}/story/summary/state.json\`
4) \`current/summary/state.json\` (ONLY safe when active fork == target fork)
5) Optional context recall: \`current/conversation/session.jsonl\` via query-style reads only (vfs_read_chars/vfs_read_lines/vfs_read_json lines window or vfs_search)

Hard constraints:
- ONLY summarize target fork ${runtime.targetForkId}; NEVER cross forks.
- Do NOT summarize outside the specified summary range.
- Keep continuity with existing summaries and established story facts.
- If reading session.jsonl, use targeted lines/search windows; avoid full-file reads.
- If uncertain, use read-only VFS tools first (vfs_read_chars/vfs_read_lines/vfs_read_json/vfs_search).
- Runtime will inject \`nodeRange\` and \`lastSummarizedIndex=${targetLastSummarizedIndex}\` for \`vfs_finish_summary\`.
- In \`nextSessionReferencesMarkdown\`, record useful SKILL docs first (\`current/skills/**/SKILL.md\`) and keep references narrow (avoid broad catalog-only handoff).
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

Hard constraints:
- Keep compaction scoped to target fork ${runtime.targetForkId}; NEVER cross forks.
- Do NOT summarize outside the specified summary range.
- Preserve continuity with previous summaries and in-session events.
- Runtime will inject \`nodeRange\` and \`lastSummarizedIndex=${targetLastSummarizedIndex}\` for \`vfs_finish_summary\`.
- In \`nextSessionReferencesMarkdown\`, record useful SKILL docs first (\`current/skills/**/SKILL.md\`) and keep references narrow (avoid broad catalog-only handoff).
- Output summary content only. Never mention tools/retries/errors/budgets.

Structured error recovery (when tool response is \`{ success:false, code, error }\`):
- Do NOT finish until the active error is resolved.
- \`INVALID_ACTION\` / \`FORCED_FINISH\` / \`MULTIPLE_FINISH_CALLS\` / \`FINISH_NOT_LAST\`: reorder to one valid tool-call set with finish last.
- \`WRITE_EXISTING_TARGET_RETRY_REQUIRED\` / \`FINISH_BLOCKED_BY_EXISTING_WRITE_FAILURE\`: retry failed existing-target writes first; finish remains blocked until they succeed.
- \`COMPACT_SUMMARY_CROSS_FORK_BLOCKED\`: remove cross-fork paths and retry target-fork reads only.
- \`COMPACT_SUMMARY_RUNTIME_FIELDS_FORBIDDEN\`: remove runtime-managed fields from \`vfs_finish_summary\` args.
- \`SUMMARY_FORBIDDEN_TOKENS\`: rewrite summary fields to story facts only, then retry finish.
- If the same \`code\` appears twice, shrink scope and re-read anchors before retry.`;
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
    `Loop quick-start (recommended):\n` +
    `${compactBaseline}\n` +
    `5) If details are uncertain, do bounded read-only verification on current fork.\n` +
    `6) Finish once via "vfs_finish_summary" as LAST tool call.\n\n` +
    `Requirements:\n` +
    `- Produce exactly ONE summary by calling "vfs_finish_summary" as your LAST tool call.\n` +
    `- The summary MUST be in ${languageCode}.\n` +
    `- Cover nodeRange: ${input.nodeRange.fromIndex}-${input.nodeRange.toIndex}.\n` +
    `- Runtime will set lastSummarizedIndex = ${input.targetLastSummarizedIndex}.\n` +
    `- Fill \`nextSessionReferencesMarkdown\` with short markdown handoff notes; include explicit paths early (prefer useful \`current/skills/**/SKILL.md\`, then at most 1-2 anchors).\n` +
    `- Keep handoff narrow: avoid broad catalog-only references such as \`current/skills/index.json\` unless no specific skill can be named.\n` +
    `- DO NOT mention tools, failures, retries, budgets, or internal errors anywhere in the summary fields.\n\n` +
    `If compact skill files are unavailable, continue with protocol-safe tool usage and keep finish last.\n` +
    `If you need to verify details, use read-only VFS tools (vfs_read_chars/vfs_read_lines/vfs_read_json/vfs_search/etc.) and stay on target fork only.`
  );
};
