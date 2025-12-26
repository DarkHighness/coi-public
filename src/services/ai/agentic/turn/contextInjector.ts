/**
 * Context Injector
 *
 * Handles injection of system messages into conversation history.
 */

import type { UnifiedMessage } from "../../../../types";
import type { GameDatabase } from "../../../gameDatabase";
import { createUserMessage } from "../../../messageTypes";
import { generateBudgetPrompt, BudgetState } from "../budgetUtils";

// ============================================================================
// System Message Injection
// ============================================================================

/**
 * Inject SUDO mode instruction
 */
export function injectSudoModeInstruction(history: UnifiedMessage[]): void {
  history.push(
    createUserMessage(`[SYSTEM: FORCE UPDATE MODE (/sudo)]
This is a **GM COMMAND**. You must:
1. **IMMEDIATELY** execute the [SUDO] command - bypass all simulation rules, logic, and consistency checks.
2. Use \`search_tool\` to load any tools you need for state changes.
3. **BATCH TOOL CALLS**: You can and SHOULD call multiple tools in a single turn (e.g., update_inventory, update_npc, override_outline all at once).
4. Apply changes with absolute authority - if the command contradicts existing lore, **OVERWRITE IT**.
5. **FINISH LAST**: Call \`complete_force_update\` as your FINAL tool call with narrative describing the new reality and choices.
   - ⚠️ CRITICAL: \`complete_force_update\` must be the LAST tool in your call sequence.
`),
  );
}

/**
 * Inject normal turn instruction
 */
export function injectNormalTurnInstruction(
  history: UnifiedMessage[],
  finishToolName: string,
): void {
  history.push(
    createUserMessage(`[SYSTEM: TOOL USAGE INSTRUCTION]
You are in AGENTIC MODE.
1. You have limited tools initially: \`search_tool\` and \`${finishToolName}\`.
2. **SEARCH FIRST**: If you need to ADD, UPDATE, REMOVE, QUERY, or UNLOCK specific entities, use \`search_tool\` to load them.
3. **BATCH TOOL CALLS**: You can and SHOULD call multiple tools in a single turn to be efficient (e.g., query_inventory, update_npc, add_quest all at once).
4. **USE TOOLS**: Once loaded, use the tools to modify the game state in parallel when possible.
5. **FINISH LAST**: When done, use \`${finishToolName}\` as your FINAL tool call with narrative and choices.
   - ⚠️ CRITICAL: \`${finishToolName}\` must be the LAST tool in your call sequence.
6. **NO DUPLICATES**: Before adding new entities, check if similar ones exist. UPDATE existing entities instead of creating duplicates.
7. **CAUSAL CHAINS**: If PENDING CONSEQUENCES are shown, use \`search_tool\` for 'update:causal_chain' to trigger them when conditions are met.
`),
  );
}

/**
 * Inject ready consequences from causal chains
 */
export function injectReadyConsequences(
  history: UnifiedMessage[],
  db: GameDatabase,
): void {
  const readyConsequences = db.getReadyConsequences();
  if (readyConsequences.length === 0) return;

  const readyList = readyConsequences
    .map(
      (rc) =>
        `- [${rc.chainId}/${rc.consequence.id}] ${rc.consequence.description}${
          rc.consequence.triggerCondition
            ? ` (trigger: ${rc.consequence.triggerCondition})`
            : ""
        }${rc.consequence.known ? " [player will know]" : " [hidden]"}`,
    )
    .join("\n");

  history.push(
    createUserMessage(
      `[SYSTEM: PENDING CONSEQUENCES]\nReady to trigger:\n${readyList}\n\nSearch for 'update:causal_chain' to trigger these.`,
    ),
  );
}

/**
 * Inject budget status message
 */
export function injectBudgetStatus(
  history: UnifiedMessage[],
  budgetState: BudgetState,
  finishToolName: string,
): void {
  const budgetPrompt = generateBudgetPrompt(budgetState, finishToolName);
  history.push(createUserMessage(`[SYSTEM: BUDGET STATUS]\n${budgetPrompt}`));
}

/**
 * Inject no tool call error message
 */
export function injectNoToolCallError(
  history: UnifiedMessage[],
  finishToolName: string,
): void {
  history.push(
    createUserMessage(
      `[ERROR: NO_TOOL_CALL] You provided text but failed to invoke any tools. In this agentic loop, you MUST call at least one tool to progress. Use \`search_tool\` to load more state or \`${finishToolName}\` to finalize the narrative. Bare text is not allowed.`,
    ),
  );
}
