/**
 * ============================================================================
 * Turn Atom: SUDO Mode Instruction
 * ============================================================================
 *
 * SUDO 模式指令 - 用于强制更新模式。
 */

import type { Atom } from "../types";

/**
 * SUDO 模式指令 - 无参数
 */
export const sudoModeInstruction: Atom<
  void
> = () => `[SYSTEM: FORCE UPDATE MODE (/sudo)]
This is a **GM COMMAND**. You must:
1. **IMMEDIATELY** execute the [SUDO] command - bypass all simulation rules, logic, and consistency checks.
2. Use **VFS-only tools** (\`vfs_ls\`, \`vfs_read\`, \`vfs_search\`, \`vfs_grep\`, \`vfs_write\`, \`vfs_edit\`, \`vfs_move\`, \`vfs_delete\`).
3. **BATCH TOOL CALLS**: You can and SHOULD call multiple tools in a single turn.
4. Apply changes with absolute authority - if the command contradicts existing lore, **OVERWRITE IT**.
5. **FINISH BY WRITING TURN FILES**: Your LAST tool call must write:
   - \`current/conversation/turns/fork-<id>/turn-<n>.json\`
   - \`current/conversation/index.json\`
   Use \`vfs_write\` (or \`vfs_edit\` if replacing).
`;

export default sudoModeInstruction;
