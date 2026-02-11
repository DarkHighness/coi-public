/**
 * Core Atom: Tool Usage (Dynamic Tool Loading & Instructions)
 * Content from output_format.ts
 */
import type { Atom } from "../types";
import {
  VFS_TOOLSETS,
  formatVfsToolCapabilitiesForPrompt,
} from "../../../vfsToolsets";
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

export const toolUsage: Atom<ToolUsageInput> = defineAtom({ atomId: "atoms/core/toolUsage#toolUsage", source: "atoms/core/toolUsage.ts", exportName: "toolUsage" }, (input) => {
  void input?.finishToolName;
  const ragEnabled = input?.ragEnabled ?? true;

  const capabilityText = gateSemanticCapabilityText(
    formatVfsToolCapabilitiesForPrompt(VFS_TOOLSETS.turn.tools),
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
  - Use \`vfs_ls\`, \`vfs_read\`/\`vfs_read_many\`, \`vfs_search\` (${searchModes}), \`vfs_grep\` to inspect.
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
});
