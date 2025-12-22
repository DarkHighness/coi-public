/**
 * Budget Management Utilities for Agentic Loops
 *
 * Tracks and enforces three types of budgets:
 * 1. Tool Calls: Maximum number of tool calls across the entire loop
 * 2. Retries: Maximum retry attempts for error recovery
 * 3. Loop Iterations: Maximum number of loop iterations
 */

import { AISettings } from "../../../types";

// Default budget values
export const DEFAULT_MAX_TOOL_CALLS = 50;
export const DEFAULT_MAX_RETRIES = 3;
export const DEFAULT_MAX_ITERATIONS = 20;

/** Budget state for tracking tool calls, retries, and loop iterations */
export interface BudgetState {
  toolCallsUsed: number;
  toolCallsMax: number;
  retriesUsed: number;
  retriesMax: number;
  loopIterationsUsed: number;
  loopIterationsMax: number;
}

/** Create a new budget state from settings */
export function createBudgetState(settings: AISettings): BudgetState {
  return {
    toolCallsUsed: 0,
    toolCallsMax: settings.extra?.maxToolCalls ?? DEFAULT_MAX_TOOL_CALLS,
    retriesUsed: 0,
    retriesMax: settings.extra?.maxErrorRetries ?? DEFAULT_MAX_RETRIES,
    loopIterationsUsed: 0,
    loopIterationsMax: settings.extra?.maxAgenticRounds ?? DEFAULT_MAX_ITERATIONS,
  };
}

/** Generate budget management XML section for prompt injection */
export function generateBudgetPrompt(state: BudgetState): string {
  const toolCallsRemaining = state.toolCallsMax - state.toolCallsUsed;
  const retriesRemaining = state.retriesMax - state.retriesUsed;
  const iterationsRemaining = state.loopIterationsMax - state.loopIterationsUsed;

  // Determine warning level
  let warningLevel: "none" | "low" | "critical" = "none";
  let warningMessage = "";

  if (toolCallsRemaining <= 5 || iterationsRemaining <= 2) {
    warningLevel = "critical";
    warningMessage =
      "⚠️ CRITICAL: Budget nearly exhausted! Complete your task immediately with finish_turn.";
  } else if (
    toolCallsRemaining <= state.toolCallsMax * 0.3 ||
    iterationsRemaining <= state.loopIterationsMax * 0.3
  ) {
    warningLevel = "low";
    warningMessage =
      "Budget running low. Plan your remaining tool calls efficiently.";
  }

  const parts = [
    `<budget_management>`,
    `  <tool_calls used="${state.toolCallsUsed}" remaining="${toolCallsRemaining}" max="${state.toolCallsMax}" />`,
    `  <retries used="${state.retriesUsed}" remaining="${retriesRemaining}" max="${state.retriesMax}" />`,
    `  <loop_iterations used="${state.loopIterationsUsed}" remaining="${iterationsRemaining}" max="${state.loopIterationsMax}" />`,
  ];

  if (warningMessage) {
    parts.push(`  <warning level="${warningLevel}">${warningMessage}</warning>`);
  }

  parts.push(`</budget_management>`);

  return parts.join("\n");
}

/** Budget exhaustion reason */
export type BudgetExhaustionReason =
  | "tool_calls"
  | "retries"
  | "loop_iterations"
  | null;

/** Check if any budget is exhausted */
export function checkBudgetExhaustion(state: BudgetState): {
  exhausted: boolean;
  reason: BudgetExhaustionReason;
  message?: string;
} {
  if (state.toolCallsUsed >= state.toolCallsMax) {
    return {
      exhausted: true,
      reason: "tool_calls",
      message: `Tool call budget exhausted (${state.toolCallsUsed}/${state.toolCallsMax}). The loop must terminate.`,
    };
  }

  if (state.retriesUsed >= state.retriesMax) {
    return {
      exhausted: true,
      reason: "retries",
      message: `Retry budget exhausted (${state.retriesUsed}/${state.retriesMax}). Maximum error recovery attempts reached.`,
    };
  }

  if (state.loopIterationsUsed >= state.loopIterationsMax) {
    return {
      exhausted: true,
      reason: "loop_iterations",
      message: `Loop iteration budget exhausted (${state.loopIterationsUsed}/${state.loopIterationsMax}). The agentic loop must terminate.`,
    };
  }

  return { exhausted: false, reason: null };
}

/** Increment tool calls counter */
export function incrementToolCalls(state: BudgetState, count: number = 1): void {
  state.toolCallsUsed += count;
}

/** Increment retries counter */
export function incrementRetries(state: BudgetState): void {
  state.retriesUsed++;
}

/** Increment loop iterations counter */
export function incrementIterations(state: BudgetState): void {
  state.loopIterationsUsed++;
}

/** Get budget summary for logging */
export function getBudgetSummary(state: BudgetState): string {
  return `Tools: ${state.toolCallsUsed}/${state.toolCallsMax}, Retries: ${state.retriesUsed}/${state.retriesMax}, Iterations: ${state.loopIterationsUsed}/${state.loopIterationsMax}`;
}
