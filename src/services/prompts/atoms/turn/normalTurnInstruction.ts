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
You are in AGENTIC MODE.
1. You have limited tools initially: \`search_tool\` and \`${finishToolName}\`.
2. **SEARCH FIRST**: If you need to ADD, UPDATE, REMOVE, QUERY, or UNLOCK specific entities, use \`search_tool\` to load them.
3. **BATCH TOOL CALLS**: You can and SHOULD call multiple tools in a single turn to be efficient (e.g., query_inventory, update_npc, add_quest all at once).
4. **USE TOOLS**: Once loaded, use the tools to modify the game state in parallel when possible.
5. **FINISH LAST**: When done, use \`${finishToolName}\` as your FINAL tool call with narrative and choices.
   - ⚠️ CRITICAL: \`${finishToolName}\` must be the LAST tool in your call sequence.
6. **NO DUPLICATES**: Before adding new entities, check if similar ones exist. UPDATE existing entities instead of creating duplicates.
7. **CAUSAL CHAINS**: If PENDING CONSEQUENCES are shown, use \`search_tool\` for 'update:causal_chain' to trigger them when conditions are met.
`;

export default normalTurnInstruction;
