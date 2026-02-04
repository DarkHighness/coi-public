/**
 * Core Atom: System Messages (Injected Instructions)
 * ============================================================================
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

/**
 * SUDO Mode Instruction
 */
export const sudoModeInstruction: Atom<SystemMessageInput> = ({
  toolsetId = "turn",
} = {}) => `[SYSTEM: FORCE UPDATE MODE (/sudo)]
This is a **GM COMMAND**. You must:
1. **IMMEDIATELY** execute the [SUDO] command - bypass all simulation rules, logic, and consistency checks.
2. Use **VFS-only tools** (this loop's allowlist):
   ${formatVfsToolsForPrompt(VFS_TOOLSETS[toolsetId].tools)}
3. **BATCH TOOL CALLS**: You can and SHOULD call multiple tools in a single turn.
4. Apply changes with absolute authority - if the command contradicts existing lore, **OVERWRITE IT**.
5. **FINISH BY WRITING TURN FILES**: Your LAST tool call must write:
   - \`current/conversation/turns/fork-<id>/turn-<n>.json\`
   - \`current/conversation/index.json\`
   Prefer \`vfs_commit_turn\`. If bundling state updates + turn commit, use \`vfs_tx\` with \`commit_turn\` as the LAST op.
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
3. **STATE CHANGES = FILE CHANGES**: Update JSON under \`current/world/\` with \`vfs_write\` or \`vfs_edit\` (JSON Patch).
4. **FINISH BY WRITING TURN FILES**: Your LAST tool call must write:
   - \`current/conversation/turns/fork-<id>/turn-<n>.json\`
   - \`current/conversation/index.json\`
   Prefer \`${finishToolName || "vfs_commit_turn"}\`. If bundling state updates + turn commit, use \`vfs_tx\` with \`commit_turn\` as the LAST op.
5. **BATCH TOOL CALLS**: Combine related writes in one call when possible.
6. **NO DUPLICATES**: Check existing files before adding new entities.
7. **CONSEQUENCES**: If PENDING CONSEQUENCES are shown, update the relevant world files directly.

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
 * No Tool Call Error Message
 */
export const noToolCallError: Atom<SystemMessageInput> = () =>
  `[ERROR: NO_TOOL_CALL] You provided text but failed to invoke any tools. In this agentic loop, you MUST call at least one \`vfs_*\` tool to progress. Inspect with \`vfs_ls\`/\`vfs_read\`, then end the turn with \`vfs_commit_turn\` (preferred) or \`vfs_tx\` with \`commit_turn\` as the LAST op. Bare text is not allowed.`;
