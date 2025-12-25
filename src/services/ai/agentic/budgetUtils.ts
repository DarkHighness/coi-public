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
const DEFAULT_MAX_TOOL_CALLS = 50;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_MAX_ITERATIONS = 20;

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
    loopIterationsMax:
      settings.extra?.maxAgenticRounds ?? DEFAULT_MAX_ITERATIONS,
  };
}

/** Generate budget management XML section for prompt injection */
export function generateBudgetPrompt(
  state: BudgetState,
  finishToolName: string = "finish_turn",
): string {
  const toolCallsRemaining = state.toolCallsMax - state.toolCallsUsed;
  const retriesRemaining = state.retriesMax - state.retriesUsed;
  const iterationsRemaining =
    state.loopIterationsMax - state.loopIterationsUsed;

  // Calculate percentage remaining
  const toolCallsPercent = Math.round(
    (toolCallsRemaining / state.toolCallsMax) * 100,
  );
  const iterationsPercent = Math.round(
    (iterationsRemaining / state.loopIterationsMax) * 100,
  );

  // Determine warning level based on BOTH tool calls and iterations
  // Use the more critical of the two
  type WarningLevel =
    | "LAST_CHANCE"
    | "CRITICAL"
    | "SEVERE"
    | "WARNING"
    | "LOW"
    | "HEALTHY";

  function getLevel(
    remaining: number,
    max: number,
    percent: number,
  ): WarningLevel {
    if (remaining <= 1) return "LAST_CHANCE";
    if (percent <= 10) return "CRITICAL";
    if (percent <= 20) return "SEVERE";
    if (percent <= 30) return "WARNING";
    if (percent <= 50) return "LOW";
    return "HEALTHY";
  }

  const toolLevel = getLevel(
    toolCallsRemaining,
    state.toolCallsMax,
    toolCallsPercent,
  );
  const iterLevel = getLevel(
    iterationsRemaining,
    state.loopIterationsMax,
    iterationsPercent,
  );

  // Priority order for comparison
  const levelPriority: Record<WarningLevel, number> = {
    LAST_CHANCE: 5,
    CRITICAL: 4,
    SEVERE: 3,
    WARNING: 2,
    LOW: 1,
    HEALTHY: 0,
  };

  const overallLevel =
    levelPriority[toolLevel] >= levelPriority[iterLevel]
      ? toolLevel
      : iterLevel;

  // Generate messages based on level
  const messages: Record<
    WarningLevel,
    { warning: string; action: string; color: string }
  > = {
    LAST_CHANCE: {
      warning: `🚨 LAST CHANCE: Only ${toolCallsRemaining} tool call(s) OR ${iterationsRemaining} iteration(s) remaining!`,
      action: `YOU MUST CALL \`${finishToolName}\` RIGHT NOW. No other tool calls allowed.`,
      color: "red",
    },
    CRITICAL: {
      warning: `⛔ CRITICAL: Budget at ${Math.min(toolCallsPercent, iterationsPercent)}%! Exhaustion imminent.`,
      action: `STOP all queries/updates. Call \`${finishToolName}\` immediately with your current information.`,
      color: "red",
    },
    SEVERE: {
      warning: `⚠️ SEVERE: Budget at ${Math.min(toolCallsPercent, iterationsPercent)}%. Running dangerously low.`,
      action: `Complete ONLY essential updates. Prepare to call \`${finishToolName}\` on next turn.`,
      color: "orange",
    },
    WARNING: {
      warning: `⚡ WARNING: Budget at ${Math.min(toolCallsPercent, iterationsPercent)}%. Plan carefully.`,
      action: `Avoid unnecessary queries. Prioritize essential state updates only.`,
      color: "yellow",
    },
    LOW: {
      warning: `📊 LOW: Budget at ${Math.min(toolCallsPercent, iterationsPercent)}%. Use wisely.`,
      action: `Batch operations where possible. Avoid redundant tool calls.`,
      color: "blue",
    },
    HEALTHY: {
      warning: "",
      action: "Budget healthy. Proceed with planned tool calls.",
      color: "green",
    },
  };

  const { warning, action } = messages[overallLevel];

  const parts = [
    `<budget_status level="${overallLevel}">`,
    `  <current_usage>`,
    `    <tool_calls used="${state.toolCallsUsed}" remaining="${toolCallsRemaining}" max="${state.toolCallsMax}" percent="${toolCallsPercent}%" />`,
    `    <iterations used="${state.loopIterationsUsed}" remaining="${iterationsRemaining}" max="${state.loopIterationsMax}" percent="${iterationsPercent}%" current="${state.loopIterationsUsed + 1}" />`,
    `    <retries used="${state.retriesUsed}" remaining="${retriesRemaining}" max="${state.retriesMax}" />`,
    `  </current_usage>`,
  ];

  if (warning) {
    parts.push(`  <warning>${warning}</warning>`);
  }
  parts.push(`  <required_action>${action}</required_action>`);

  // Add explicit rules for critical levels
  if (overallLevel === "LAST_CHANCE" || overallLevel === "CRITICAL") {
    parts.push(`  <forced_action>`);
    parts.push(`    Your ONLY allowed tool call is: \`${finishToolName}\``);
    parts.push(`    Any other tool call will waste precious budget.`);
    parts.push(`  </forced_action>`);
  }

  parts.push(`</budget_status>`);

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
export function incrementToolCalls(
  state: BudgetState,
  count: number = 1,
): void {
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
