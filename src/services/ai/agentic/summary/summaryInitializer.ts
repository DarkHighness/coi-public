/**
 * Summary Loop Initializer
 *
 * Handles initialization of summary agentic loop state.
 */

import type { AISettings, TokenUsage } from "../../../../types";
import type { ZodToolDefinition } from "../../../providers/types";
import { BudgetState, createBudgetState } from "../budgetUtils";
import { getSummaryTools } from "../../../tools";
import type { SummaryLoopInput } from "./summary";

// ============================================================================
// Types
// ============================================================================

export interface SummaryLoopState {
  budgetState: BudgetState;
  totalUsage: TokenUsage;
  activeTools: ZodToolDefinition[];
}

// ============================================================================
// Initialization
// ============================================================================

export function createSummaryLoopState(
  input: SummaryLoopInput,
): SummaryLoopState {
  const { settings } = input;

  return {
    budgetState: createBudgetState(settings),
    totalUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    activeTools: getSummaryTools(),
  };
}

export function accumulateSummaryUsage(
  state: SummaryLoopState,
  usage: TokenUsage | undefined,
): void {
  if (usage) {
    state.totalUsage.promptTokens += usage.promptTokens || 0;
    state.totalUsage.completionTokens += usage.completionTokens || 0;
    state.totalUsage.totalTokens += usage.totalTokens || 0;
  }
}
