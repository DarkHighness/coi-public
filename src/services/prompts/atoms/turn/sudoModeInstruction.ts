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
2. Use \`search_tool\` to load any tools you need for state changes.
3. **BATCH TOOL CALLS**: You can and SHOULD call multiple tools in a single turn (e.g., update_inventory, update_npc, override_outline all at once).
4. Apply changes with absolute authority - if the command contradicts existing lore, **OVERWRITE IT**.
5. **FINISH LAST**: Call \`complete_force_update\` as your FINAL tool call with narrative describing the new reality and choices.
   - ⚠️ CRITICAL: \`complete_force_update\` must be the LAST tool in your call sequence.
`;

export default sudoModeInstruction;
