/**
 * ==========================================================================
 * Core Atom: System Messages
 * ==========================================================================
 *
 * Messages injected into the conversation history by contextInjector.
 */
import type { Atom } from "../types";
import {
  VFS_TOOLSETS,
  formatVfsToolCapabilitiesForPrompt,
  formatVfsToolsForPrompt,
} from "../../../vfsToolsets";
import type { VfsToolsetId } from "../../../vfsToolsets";

export interface SystemMessageInput {
  finishToolName?: string;
  readyConsequences?: string[];
  budgetPrompt?: string;
  toolsetId?: VfsToolsetId;
}

export interface RetconAckSystemMessageInput {
  pendingHash: string;
  pendingReason?: string;
}

const PATH_MODEL_BLOCK = [
  "- Canonical paths: `shared/**` and `forks/{forkId}/**`.",
  "- Alias paths: `current/**` are accepted and auto-resolved to canonical active-fork/shared locations.",
].join("\n   ");

const PERMISSION_MODEL_BLOCK = [
  "- `immutable_readonly` is always read-only (`shared/system/skills/**`, `shared/system/refs/**`; alias views `skills/**`, `refs/**`).",
  "- `default_editable` is writable by default for AI.",
  "- `elevated_editable` requires one-time user-confirmed token in `/god` or `/sudo`.",
  "- `finish_guarded` is writable only through finish protocol tools.",
  "- Resource templates enforce operation-level contracts (e.g. conversation=`finish_commit`, summary=`finish_summary`, rewrite=`history_rewrite`).",
].join("\n   ");

const CONVERSATION_GUARD_LINE =
  "**DO NOT** write finish-guarded conversation/summary paths (`shared/narrative/conversation/*.json`, `forks/{activeFork}/story/conversation/**`, `forks/{activeFork}/story/summary/state.json`; alias `current/conversation/**`, `current/summary/state.json`) via generic write/edit/merge/move/delete tools.";

/**
 * SUDO Mode Instruction
 */
export const sudoModeInstruction: Atom<SystemMessageInput> = ({
  toolsetId = "turn",
} = {}) => `[SYSTEM: FORCE UPDATE MODE (/sudo)]
This is a **GM COMMAND**. You must:
1. The user action is already prefixed with **[SUDO]**. Treat it as a forced update payload and bypass normal simulation constraints.
2. Use **VFS-only tools** (this loop's allowlist):
   ${formatVfsToolsForPrompt(VFS_TOOLSETS[toolsetId].tools)}
3. Respect this **TOOL CAPABILITY CONTRACT** (runtime source of truth):
   ${formatVfsToolCapabilitiesForPrompt(VFS_TOOLSETS[toolsetId].tools)}
4. **PATH MODEL**:
   ${PATH_MODEL_BLOCK}
5. **PERMISSION MODEL**:
   ${PERMISSION_MODEL_BLOCK}
6. **BATCH TOOL CALLS**: You can and SHOULD call multiple tools in a single turn.
7. Apply changes decisively - if the command contradicts existing mutable lore, **OVERWRITE IT** (immutable zones remain protected by policy).
8. **FINISH RULE**: Your LAST tool call must be \`vfs_commit_turn\` (preferred) or \`vfs_tx\` with LAST op \`commit_turn\`.
9. ${CONVERSATION_GUARD_LINE}
`;

/**
 * Normal Turn Instruction
 */
export const normalTurnInstruction: Atom<SystemMessageInput> = ({
  finishToolName,
}) => `[SYSTEM: TOOL USAGE INSTRUCTION]
You are in AGENTIC MODE (VFS-only).
1. You may ONLY use \`vfs_*\` tools. No other tools exist.
   AVAILABLE TOOLS in this loop:
   ${formatVfsToolsForPrompt(VFS_TOOLSETS.turn.tools)}
2. Respect this **TOOL CAPABILITY CONTRACT**:
   ${formatVfsToolCapabilitiesForPrompt(VFS_TOOLSETS.turn.tools)}
3. **PATH MODEL**:
   ${PATH_MODEL_BLOCK}
4. **PERMISSION MODEL**:
   ${PERMISSION_MODEL_BLOCK}
5. **INSPECT FIRST**: Use \`vfs_ls\`, \`vfs_schema\`, \`vfs_stat\`, \`vfs_glob\`, \`vfs_read\`/\`vfs_read_many\` (optionally with \`start\`+\`offset\` or \`maxChars\`), \`vfs_read_json\` (for specific fields), \`vfs_search\`, \`vfs_grep\` before changing files.
   - Atmosphere reference data is available under \`shared/system/refs/atmosphere/\` (alias: \`current/refs/atmosphere/\`).
6. **STATE CHANGES = FILE CHANGES**: Update world JSON under \`forks/{activeFork}/story/world/**\` (alias: \`current/world/**\`) with \`vfs_write\` or \`vfs_edit\` (JSON Patch).
7. **FINISH RULE**: Your LAST tool call must be \`${finishToolName || "vfs_commit_turn"}\` (preferred) or \`vfs_tx\` with \`commit_turn\` as the LAST op.
8. **CONVERSATION WRITE GUARD**: ${CONVERSATION_GUARD_LINE}
9. **BATCH TOOL CALLS**: Combine related writes in one call when possible.
10. **NO DUPLICATES**: Check existing files before adding new entities.
11. **CONSEQUENCES**: If PENDING CONSEQUENCES are shown, update relevant world files directly.

<examples>
- Example (inspect → edit → finish):
  1) \`vfs_search\` within \`current/world/\` (or canonical fork world path) for a name/ID
  2) \`vfs_edit\` to patch the exact JSON pointer(s)
  3) \`${finishToolName || "vfs_commit_turn"}\` with { userAction, assistant: { narrative, choices } } as the LAST call
</examples>
`;

/**
 * Cleanup Turn Instruction
 */
export const cleanupTurnInstruction: Atom<SystemMessageInput> = ({
  finishToolName,
}) => `[SYSTEM: CLEANUP MODE TOOL INSTRUCTION]
You are in CLEANUP MODE (VFS-only).
1. You may ONLY use \`vfs_*\` tools. No other tools exist.
   AVAILABLE TOOLS in this loop:
   ${formatVfsToolsForPrompt(VFS_TOOLSETS.cleanup.tools)}
2. Respect this **TOOL CAPABILITY CONTRACT**:
   ${formatVfsToolCapabilitiesForPrompt(VFS_TOOLSETS.cleanup.tools)}
3. **PATH MODEL**:
   ${PATH_MODEL_BLOCK}
4. **PERMISSION MODEL**:
   ${PERMISSION_MODEL_BLOCK}
5. **READ-ONLY FIRST**: Use \`vfs_ls_entries\` / \`vfs_suggest_duplicates\` / \`vfs_search\` / \`vfs_grep\` / \`vfs_read_json\` to locate and verify.
6. **APPLY FIXES**: Use \`vfs_edit\` (JSON Patch) / \`vfs_merge\` / \`vfs_move\` / \`vfs_delete\` as needed.
7. **FINISH**: Your LAST tool call must be \`${finishToolName || "vfs_commit_turn"}\` (or \`vfs_tx\` with \`commit_turn\` as the LAST op).
8. **CONVERSATION WRITE GUARD**: ${CONVERSATION_GUARD_LINE}

<examples>
- Example (find duplicates → fix → finish):
  1) \`vfs_ls_entries\` for ["npcs", "quests"] to see candidates
  2) \`vfs_suggest_duplicates\` for category "npcs" to get groups
  3) \`vfs_edit\` / \`vfs_merge\` / \`vfs_move\` / \`vfs_delete\` to resolve
  4) \`${finishToolName || "vfs_commit_turn"}\` as the LAST call
</examples>
`;

/**
 * Pending Consequences Message
 */
export const pendingConsequencesMessage: Atom<SystemMessageInput> = ({
  readyConsequences,
}) => {
  if (!readyConsequences || readyConsequences.length === 0) return "";
  const list = readyConsequences.join("\n");
  return `[SYSTEM: PENDING CONSEQUENCES]\nReady to trigger:\n${list}\n\nUpdate relevant world files under \`forks/{activeFork}/story/world/**\` (alias: \`current/world/**\`) to apply these consequences.`;
};

/**
 * Budget Status Message
 */
export const budgetStatusMessage: Atom<SystemMessageInput> = ({
  budgetPrompt,
}) => `[SYSTEM: BUDGET STATUS]\n${budgetPrompt}`;

/**
 * Retcon ACK required message
 */
export const retconAckRequiredMessage: Atom<RetconAckSystemMessageInput> = ({
  pendingHash,
  pendingReason,
}) =>
  `[SYSTEM: RETCON_ACK_REQUIRED]\nCustom rules changed and continuity ACK is required before finishing the turn.\nInclude \`retconAck\` in your finish call:\n- hash: "${pendingHash}"\n- summary: short in-world continuity adjustment\nReason: ${pendingReason || "customRules"}.\nUse \`vfs_commit_turn\` or \`vfs_tx\`(last op \`commit_turn\`) with matching \`retconAck.hash\`.`;

/**
 * No Tool Call Error Message
 */
export const noToolCallError: Atom<SystemMessageInput> = () =>
  `[ERROR: NO_TOOL_CALL] You provided text but failed to invoke any tools. In this agentic loop, you MUST call at least one \`vfs_*\` tool to progress. Inspect with \`vfs_ls\`/\`vfs_read\`, then end the turn with \`vfs_commit_turn\` (preferred) or \`vfs_tx\` with \`commit_turn\` as the LAST op. Bare text is not allowed.`;
