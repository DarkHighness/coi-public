/**
 * Core Atom: Tool Usage (Dynamic Tool Loading & Instructions)
 * Content from output_format.ts
 */
import type { Atom } from "../types";
import {
  VFS_TOOLSETS,
  formatVfsToolCapabilitiesForPrompt,
} from "../../../vfsToolsets";

export interface ToolUsageInput {
  finishToolName?: string;
}

export const toolUsage: Atom<ToolUsageInput> = (input) => {
  void input;

  return `
<tool_usage>
  **FILE-ONLY TOOLING (VFS)**:
  ${formatVfsToolCapabilitiesForPrompt(VFS_TOOLSETS.turn.tools)}
  - Path model: canonical \`shared/**\` + \`forks/{forkId}/**\`; alias \`current/**\` is accepted and resolves to active-fork canonical paths.
  - Permission classes: \`immutable_readonly\` (never writable), \`default_editable\` (AI default writable), \`elevated_editable\` (requires one-time user-confirmed token in \`/god\` or \`/sudo\`), \`finish_guarded\` (write only via finish tools).
  - Immutable zones are always blocked: \`shared/system/skills/**\`, \`shared/system/refs/**\` (plus alias views \`skills/**\`, \`refs/**\`).
  - Resource templates enforce operation-level contracts (e.g. conversation expects \`finish_commit\`, summary expects \`finish_summary\`, rewrite flows use \`history_rewrite\`).
  - Use \`vfs_ls\`, \`vfs_read\`/\`vfs_read_many\`, \`vfs_search\` (text/regex/fuzzy/semantic), \`vfs_grep\` to inspect.
  - Use \`vfs_write\` to create/replace files.
  - Use \`vfs_edit\` with JSON Patch (RFC 6902) to update JSON.
  - Use \`vfs_merge\` to deep-merge JSON objects (arrays replaced, no deletions).
  - Use \`vfs_move\` to rename paths, \`vfs_delete\` to remove files.
  - Use \`vfs_tx\` to batch multiple ops atomically (recommended for “state updates + turn commit”).
  - Prefer omitting optional fields; use \`null\` only if you must, and treat it as “use defaults”.

  **STATE = FILES**:
  - Shared config lives under \`shared/config/**\` (alias: \`current/custom_rules/**\`, \`current/world/theme_config.json\`).
  - Fork world state lives under \`forks/{activeFork}/story/world/**\` (alias: \`current/world/**\`).
  - Conversation/summary are finish-guarded under \`shared/narrative/conversation/*.json\`, \`forks/{activeFork}/story/conversation/**\`, \`forks/{activeFork}/story/summary/state.json\`.

  **CUSTOM RULE PACKS (SHARED LAYER)**:
  - User-defined rule packs live under \`shared/config/custom_rules/NN-*/RULES.md\` (alias: \`current/custom_rules/NN-*/RULES.md\`; lower \`NN\` = higher priority).
  - Strong reminder: when turn intent matches a rule category, read relevant low-\`NN\` packs first via \`vfs_read\`/\`vfs_read_many\`.
  - This is not a hard gate; if no pack is relevant, proceed with normal inspection flow.

  **TURN COMPLETION**:
  - Your LAST tool call must be \`vfs_commit_turn\` (preferred) or \`vfs_tx\` with \`commit_turn\` as the LAST op.
  - Do NOT write finish-guarded conversation/summary paths via generic mutation tools.
</tool_usage>
`;
};
