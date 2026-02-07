/**
 * ==========================================================================
 * Core Atom: System Messages
 * ==========================================================================
 *
 * Messages injected into the conversation history by contextInjector.
 */
import type { Atom } from "../types";
import { VFS_TOOLSETS, formatVfsToolsForPrompt } from "../../../vfsToolsets";
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
3. **BATCH TOOL CALLS**: You can and SHOULD call multiple tools in a single turn.
4. Apply changes with absolute authority - if the command contradicts existing lore, **OVERWRITE IT**.
5. **FINISH RULE**: Your LAST tool call must be \`vfs_commit_turn\` (preferred) or \`vfs_tx\` with LAST op \`commit_turn\`.
6. **DO NOT** write \`current/conversation/*\` via generic write/edit/merge/move/delete tools.
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
2. **INSPECT FIRST**: Use \`vfs_ls\`, \`vfs_schema\`, \`vfs_stat\`, \`vfs_glob\`, \`vfs_read\`/\`vfs_read_many\` (optionally with \`start\`+\`offset\` or \`maxChars\`), \`vfs_read_json\` (for specific fields), \`vfs_search\`, \`vfs_grep\` before changing files.
   - Atmosphere reference data is available under \`current/refs/atmosphere/\` (use \`vfs_ls\` / \`vfs_read\` / \`vfs_search\` instead of inlining long descriptions).
3. **STATE CHANGES = FILE CHANGES**: Update JSON under \`current/world/\` with \`vfs_write\` or \`vfs_edit\` (JSON Patch).
4. **FINISH RULE**: Your LAST tool call must be \`${finishToolName || "vfs_commit_turn"}\` (preferred) or \`vfs_tx\` with \`commit_turn\` as the LAST op.
5. **CONVERSATION WRITE GUARD**: Do NOT write \`current/conversation/*\` via generic \`vfs_write\`/\`vfs_edit\`/\`vfs_merge\`/\`vfs_move\`/\`vfs_delete\`.
6. **BATCH TOOL CALLS**: Combine related writes in one call when possible.
7. **NO DUPLICATES**: Check existing files before adding new entities.
8. **CONSEQUENCES**: If PENDING CONSEQUENCES are shown, update the relevant world files directly.

<examples>
- Example (inspect → edit → finish):
  1) \`vfs_search\` within \`current/world/\` for a name/ID
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
2. **READ-ONLY FIRST**: Use \`vfs_ls_entries\` / \`vfs_suggest_duplicates\` / \`vfs_search\` / \`vfs_grep\` / \`vfs_read_json\` to locate and verify.
3. **APPLY FIXES**: Use \`vfs_edit\` (JSON Patch) / \`vfs_merge\` / \`vfs_move\` / \`vfs_delete\` as needed.
4. **FINISH**: Your LAST tool call must be \`${finishToolName || "vfs_commit_turn"}\` (or \`vfs_tx\` with \`commit_turn\` as the LAST op).
5. **CONVERSATION WRITE GUARD**: Do NOT write \`current/conversation/*\` via generic mutation tools.

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
  return `[SYSTEM: PENDING CONSEQUENCES]\nReady to trigger:\n${list}\n\nUpdate the relevant files under \`current/world/\` directly to apply these consequences.`;
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
  `[SYSTEM: RETCON_ACK_REQUIRED]\nCustom rules changed and continuity ACK is required before finishing the turn.\nInclude \`retconAck\` in your finish call:\n- hash: \"${pendingHash}\"\n- summary: short in-world continuity adjustment\nReason: ${pendingReason || "customRules"}.\nUse \`vfs_commit_turn\` or \`vfs_tx\`(last op \`commit_turn\`) with matching \`retconAck.hash\`.`;

/**
 * No Tool Call Error Message
 */
export const noToolCallError: Atom<SystemMessageInput> = () =>
  `[ERROR: NO_TOOL_CALL] You provided text but failed to invoke any tools. In this agentic loop, you MUST call at least one \`vfs_*\` tool to progress. Inspect with \`vfs_ls\`/\`vfs_read\`, then end the turn with \`vfs_commit_turn\` (preferred) or \`vfs_tx\` with \`commit_turn\` as the LAST op. Bare text is not allowed.`;
