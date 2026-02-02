/**
 * ============================================================================
 * Turn Atom: Normal Turn Instruction
 * ============================================================================
 *
 * 普通回合指令 - 用于标准游戏回合。
 */

import type { Atom } from "../types";

export type NormalTurnInstructionInput = {
  finishToolName: string;
};

/**
 * 普通回合指令
 */
export const normalTurnInstruction: Atom<NormalTurnInstructionInput> = ({
  finishToolName,
}) => `[SYSTEM: TOOL USAGE INSTRUCTION]
You are in AGENTIC MODE (VFS-only).
1. You may ONLY use \`vfs_*\` tools. No other tools exist.
2. **INSPECT FIRST**: Use \`vfs_ls\`, \`vfs_read\`, \`vfs_search\`, \`vfs_grep\` before changing files.
3. **STATE CHANGES = FILE CHANGES**: Update JSON under \`current/world/\` with \`vfs_write\`, \`vfs_merge\`, or \`vfs_edit\` (JSON Patch remove for deletions).
4. **FINISH BY WRITING TURN FILES**: Your LAST tool call must write:
   - \`current/conversation/turns/fork-<id>/turn-<n>.json\`
   - \`current/conversation/index.json\`
5. **BATCH TOOL CALLS**: Combine related writes in one call when possible.
6. **NO DUPLICATES**: Check existing files before adding new entities.
7. **CONSEQUENCES**: If PENDING CONSEQUENCES are shown, update the relevant world files directly.
`;

export default normalTurnInstruction;
