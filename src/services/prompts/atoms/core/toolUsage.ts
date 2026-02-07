/**
 * Core Atom: Tool Usage (Dynamic Tool Loading & Instructions)
 * Content from output_format.ts
 */
import type { Atom } from "../types";

export interface ToolUsageInput {
  finishToolName?: string;
}

export const toolUsage: Atom<ToolUsageInput> = (input) => {
  void input;

  return `
<tool_usage>
  **FILE-ONLY TOOLING (VFS)**:
  - Use \`vfs_ls\`, \`vfs_read\`/\`vfs_read_many\`, \`vfs_search\` (text/regex/fuzzy/semantic), \`vfs_grep\` to inspect.
  - Use \`vfs_write\` to create/replace JSON files.
  - Use \`vfs_edit\` with JSON Patch (RFC 6902) to update existing JSON.
  - Use \`vfs_merge\` to deep-merge JSON objects (arrays replaced, no deletions).
  - Use \`vfs_move\` to rename paths, \`vfs_delete\` to remove files.
  - Use \`vfs_tx\` to batch multiple ops atomically (recommended for “state updates + turn commit”).
  - Prefer omitting optional fields; use \`null\` only if you must, and treat it as “use defaults”.

  **STATE = FILES**:
  - World state lives under \`current/world/\`.
  - Conversation state is finalized ONLY through finish tools.

  **CUSTOM RULE PACKS (SHARED LAYER)**:
  - User-defined rule packs live under \`current/custom_rules/NN-*/RULES.md\` (lower \`NN\` = higher priority).
  - Strong reminder: when turn intent matches a rule category, read relevant low-\`NN\` packs first via \`vfs_read\`/\`vfs_read_many\`.
  - This is not a hard gate; if no pack is relevant, proceed with normal inspection flow.

  **TURN COMPLETION**:
  - Your LAST tool call must be \`vfs_commit_turn\` (preferred) or \`vfs_tx\` with \`commit_turn\` as the LAST op.
  - Do NOT write \`current/conversation/*\` via generic mutation tools.
</tool_usage>
`;
};
