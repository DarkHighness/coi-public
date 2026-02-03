/**
 * Core Atom: System Messages (Injected Instructions)
 * ============================================================================
 *
 * Messages injected into the conversation history by contextInjector.
 */
import type { Atom } from "../types";

export interface SystemMessageInput {
  finishToolName?: string;
  readyConsequences?: string[];
  budgetPrompt?: string;
}

/**
 * SUDO Mode Instruction
 */
export const sudoModeInstruction: Atom<
  void
> = () => `[SYSTEM: FORCE UPDATE MODE (/sudo)]
This is a **GM COMMAND**. You must:
1. **IMMEDIATELY** execute the [SUDO] command - bypass all simulation rules, logic, and consistency checks.
2. Use **VFS-only tools** (\`vfs_ls\`, \`vfs_read\`, \`vfs_read_many\`, \`vfs_search\`, \`vfs_grep\`, \`vfs_write\`, \`vfs_edit\`, \`vfs_merge\`, \`vfs_move\`, \`vfs_delete\`, \`vfs_tx\`, \`vfs_commit_turn\`).
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
2. **INSPECT FIRST**: Use \`vfs_ls\`, \`vfs_read\`/\`vfs_read_many\`, \`vfs_search\`, \`vfs_grep\` before changing files.
3. **STATE CHANGES = FILE CHANGES**: Update JSON under \`current/world/\` with \`vfs_write\` or \`vfs_edit\` (JSON Patch).
4. **FINISH BY WRITING TURN FILES**: Your LAST tool call must write:
   - \`current/conversation/turns/fork-<id>/turn-<n>.json\`
   - \`current/conversation/index.json\`
   Prefer \`vfs_commit_turn\`. If bundling state updates + turn commit, use \`vfs_tx\` with \`commit_turn\` as the LAST op.
5. **BATCH TOOL CALLS**: Combine related writes in one call when possible.
6. **NO DUPLICATES**: Check existing files before adding new entities.
7. **CONSEQUENCES**: If PENDING CONSEQUENCES are shown, update the relevant world files directly.
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
  `[ERROR: NO_TOOL_CALL] You provided text but failed to invoke any tools. In this agentic loop, you MUST call at least one \`vfs_*\` tool to progress. Inspect with \`vfs_ls\`/\`vfs_read\`, then end the turn with \`vfs_commit_turn\` (preferred) or write the conversation files via \`vfs_write\`/\`vfs_edit\` (including \`current/conversation/index.json\` and the current turn file). Bare text is not allowed.`;
