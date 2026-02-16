/**
 * Summary Loop Initializer
 *
 * Handles initialization of summary agentic loop state.
 */

import type { AISettings, TokenUsage } from "../../../../types";
import type { ZodToolDefinition } from "../../../providers/types";
import { BudgetState, createBudgetState } from "../budgetUtils";
import { vfsToolRegistry } from "../../../vfs/tools";
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
  const ragEnabled = settings.embedding?.enabled ?? false;

  return {
    budgetState: createBudgetState(settings, { loopType: "summary" }),
    totalUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    activeTools: vfsToolRegistry.getDefinitionsForToolset("summary", {
      ragEnabled,
    }),
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
