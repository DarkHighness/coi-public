/**
 * Context Injector
 *
 * Handles injection of system messages into conversation history.
 */

import type { UnifiedMessage } from "../../../../types";
import { createUserMessage } from "../../../messageTypes";
import { generateBudgetPrompt, BudgetState } from "../budgetUtils";
import {
  sudoModeInstruction,
  normalTurnInstruction,
  budgetStatusMessage,
  noToolCallError,
} from "../../../prompts/atoms/core";

// ============================================================================
// System Message Injection
// ============================================================================

/**
 * Inject SUDO mode instruction
 */
export function injectSudoModeInstruction(history: UnifiedMessage[]): void {
  history.push(createUserMessage(sudoModeInstruction()));
}

/**
 * Inject normal turn instruction
 */
export function injectNormalTurnInstruction(
  history: UnifiedMessage[],
  finishToolName: string,
): void {
  history.push(createUserMessage(normalTurnInstruction({ finishToolName })));
}

/**
 * Inject ready consequences from causal chains
 */
export function injectReadyConsequences(
  history: UnifiedMessage[],
): void {
  void history;
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
  history.push(createUserMessage(budgetStatusMessage({ budgetPrompt })));
}

/**
 * Inject no tool call error message
 */
export function injectNoToolCallError(
  history: UnifiedMessage[],
  finishToolName: string,
): void {
  history.push(createUserMessage(noToolCallError({ finishToolName })));
}
