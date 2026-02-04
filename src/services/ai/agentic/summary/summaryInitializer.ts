/**
 * Summary Loop Initializer
 *
 * Handles initialization of summary agentic loop state.
 */

import type { AISettings, TokenUsage } from "../../../../types";
import type { ZodToolDefinition } from "../../../providers/types";
import { BudgetState, createBudgetState } from "../budgetUtils";
import { ALL_DEFINED_TOOLS } from "../../../tools";
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

  const allowed = new Set<string>([
    "vfs_ls",
    "vfs_read",
    "vfs_read_many",
    "vfs_search",
    "vfs_grep",
    "vfs_ls_entries",
    "vfs_finish_summary",
  ]);

  return {
    budgetState: createBudgetState(settings),
    totalUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    activeTools: ALL_DEFINED_TOOLS.filter((tool) => allowed.has(tool.name)),
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
