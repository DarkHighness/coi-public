/**
 * Core Atom: Tool Usage (Dynamic Tool Loading & Instructions)
 * Content from output_format.ts
 */
import type { Atom } from "../types";
import { vfsToolRegistry } from "../../../vfs/tools";
import { defineAtom } from "../../trace/runtime";

const gateSemanticCapabilityText = (
  capabilityText: string,
  ragEnabled: boolean,
): string => {
  if (ragEnabled) return capabilityText;

  return capabilityText
    .replaceAll("text/fuzzy/regex/semantic", "text/fuzzy/regex")
    .replaceAll("(optionally semantic)", "")
    .replaceAll("/semantic", "")
    .replaceAll("semantic, when available", "");
};

export interface ToolUsageInput {
  finishToolName?: string;
  ragEnabled?: boolean;
}

export const toolUsage: Atom<ToolUsageInput> = defineAtom(
  {
    atomId: "atoms/core/toolUsage#toolUsage",
    source: "atoms/core/toolUsage.ts",
    exportName: "toolUsage",
  },
  (input) => {
    const finishToolName = input?.finishToolName || "vfs_finish_turn";
    const toolsetId =
      finishToolName === "vfs_finish_soul" ? "playerRate" : "turn";
    const ragEnabled = input?.ragEnabled ?? true;

    const capabilityText = gateSemanticCapabilityText(
      vfsToolRegistry.formatCapabilitiesForPrompt(toolsetId),
      ragEnabled,
    );
    const searchModes = ragEnabled
      ? "text/regex/fuzzy/semantic"
      : "text/regex/fuzzy";

    return `
<tool_usage>
  **FILE-ONLY TOOLING (VFS)**:
  ${capabilityText}
  - Path model: canonical \`shared/**\` + \`forks/{forkId}/**\`; alias \`current/**\` is accepted and resolves to active-fork canonical paths.
  - Permission classes: \`immutable_readonly\` (never writable), \`default_editable\` (AI default writable), \`elevated_editable\` (requires one-time user-confirmed token in \`/god\` or \`/sudo\`), \`finish_guarded\` (write only via finish tools).
  - Immutable zones are always blocked: \`shared/system/skills/**\`, \`shared/system/refs/**\` (plus alias views \`skills/**\`, \`refs/**\`).
  - Resource templates enforce operation-level contracts (e.g. conversation expects \`finish_commit\`, summary expects \`finish_summary\`, rewrite flows use \`history_rewrite\`).
  - Use \`vfs_ls\`, \`vfs_schema\`, \`vfs_read_markdown/vfs_read_chars/vfs_read_lines/vfs_read_json\`, \`vfs_search\` (${searchModes}) to inspect.
  - For markdown docs/notes, prefer \`vfs_read_markdown\` with \`headings\`/\`indices\`; use \`vfs_read_lines\` when section labels are unknown.
  - Use \`vfs_write_file\` to create/replace files.
  - Use \`vfs_append_text\` for append-only text/markdown updates.
  - Use \`vfs_edit_lines\` for bounded line edits in text files.
  - Use \`vfs_write_markdown\` for section-level markdown edits (add/replace/delete section).
  - Use \`vfs_patch_json\` (RFC 6902) to update JSON.
  - Use \`vfs_merge_json\` to deep-merge JSON objects (arrays replaced, no deletions).
  - Use \`vfs_move\` to rename paths and \`vfs_delete\` to remove files.
  - Use \`vfs_vm\` for sequential multi-step orchestration when one response needs dependent tool calls.
    - \`vfs_vm\` must be the ONLY top-level tool call in that assistant response.
    - Inside \`vfs_vm\`, only current-loop allowlisted tools are legal; \`vfs_vm\` recursion is forbidden.
    - \`vfs_vm\` scripts must be JavaScript (no pseudo-tool JSON text), and must not use \`globalThis\`/\`window\`/\`import\`/\`eval\`/\`Function\`.
    - Inside \`vfs_vm\`, finish is optional but at most once and must be the last inner tool call.
  - Prefer omitting optional fields; use \`null\` only if you must, and treat it as “use defaults”.

  **STATE = FILES**:
  - Shared config lives under \`shared/config/**\` (alias: \`current/custom_rules/**\`, \`current/world/theme_config.json\`).
  - \`current/world/notes.md\`, \`current/world/soul.md\`, and \`current/world/global/soul.md\` are AI-to-AI self-notes (you writing to your future self), not player-facing raw text.
  - ${
    toolsetId === "playerRate"
      ? "In `[Player Rate]` loops, write scope is soul-only: `current/world/soul.md` and `current/world/global/soul.md`."
      : "Fork world state lives under `forks/{activeFork}/story/world/**` (alias: `current/world/**`). Soul docs (`current/world/soul.md`, `current/world/global/soul.md`) are `default_editable` and may be proactively updated via split write tools (`vfs_write_file` / `vfs_append_text` / `vfs_edit_lines` / `vfs_write_markdown`) when evidence emerges."
  }
  - If a tool call fails and later retry succeeds, append one concise \`[code] cause -> fix\` bullet to \`current/world/soul.md\` under \`## Tool Usage Hints\`.
  - Conversation/summary are finish-guarded under \`shared/narrative/conversation/*.json\`, \`forks/{activeFork}/story/conversation/**\`, \`forks/{activeFork}/story/summary/state.json\`.

  **CUSTOM RULE PACKS (SHARED LAYER)**:
  - User-defined rule packs live under \`shared/config/custom_rules/NN-*/RULES.md\` (alias: \`current/custom_rules/NN-*/RULES.md\`; lower \`NN\` = higher priority).
  - Strong reminder: when turn intent matches a rule category, read relevant low-\`NN\` packs first via \`vfs_read_markdown/vfs_read_chars/vfs_read_lines/vfs_read_json\`.
  - This is not a hard gate; if no pack is relevant, proceed with normal inspection flow.

  **TURN COMPLETION**:
  - Your LAST tool call must be \`${finishToolName}\`.
  ${
    finishToolName === "vfs_finish_turn"
      ? "- For `vfs_finish_turn`, use args shape `{ assistant: { narrative, choices }, retconAck?: { summary } }`."
      : ""
  }
  - If a write to existing writable target(s) fails, enter repair mode: next calls should inspect/retry those failed targets first.
  - Finish is blocked only for blocking failures (hard gates and required-write-retry codes such as \`WRITE_EXISTING_TARGET_RETRY_REQUIRED\` / \`FINISH_BLOCKED_BY_EXISTING_WRITE_FAILURE\`).
  - Missing-target write failures are non-blocking: finish may proceed, but retry if creating that target is still required.
  - Policy/permission-denied write failures are non-blocking for finish: switch to an allowed path/operation or report blocker.
  - Do not spam \`${finishToolName}\` while blocking failed writable targets remain unresolved.
  - If the same write error repeats, change strategy first (inspect schema/pointers/path), then retry.
  - Immutable/read-only write failures (skills/refs etc.) are exempt from the retry-before-finish requirement.
  - For large JSON files, prefer \`vfs_read_json\` with narrow \`pointers\` (or bounded \`vfs_read_lines\`), and avoid full-file \`vfs_read_chars\` by default.
  - For large markdown files, use \`vfs_read_markdown\` section selectors before widening to line windows.
  - Do NOT write finish-guarded conversation/summary paths via generic mutation tools.
  - Do NOT use \`vfs_vm\` to call tools outside current-loop allowlist, and do NOT call finish before remaining inner mutations.
  - ${
      toolsetId === "playerRate"
        ? "Do not advance visible story nodes in `[Player Rate]` loops."
      : "Normal turn loops should still produce coherent narrative + choices in finish payload."
  }
</tool_usage>
`;
  },
);
