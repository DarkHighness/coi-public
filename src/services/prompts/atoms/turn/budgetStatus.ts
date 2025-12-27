/**
 * ============================================================================
 * Turn Atom: Budget Status
 * ============================================================================
 *
 * 预算状态 - 显示当前工具调用预算。
 */

import type { Atom } from "../types";

export type BudgetStatusInput = {
  usedCalls: number;
  maxCalls: number;
  remainingCalls: number;
  finishToolName: string;
};

/**
 * 预算状态
 */
export const budgetStatus: Atom<BudgetStatusInput> = ({
  usedCalls,
  maxCalls,
  remainingCalls,
  finishToolName,
}) => {
  const percentage = Math.round((usedCalls / maxCalls) * 100);

  let urgencyMessage = "";
  if (remainingCalls <= 2) {
    urgencyMessage = `\n⚠️ CRITICAL: Only ${remainingCalls} calls remaining! You MUST call \`${finishToolName}\` NOW.`;
  } else if (remainingCalls <= 5) {
    urgencyMessage = `\n⚡ WARNING: Low budget. Prioritize \`${finishToolName}\` soon.`;
  }

  return `[SYSTEM: BUDGET STATUS]
Tool calls: ${usedCalls}/${maxCalls} (${percentage}%)
Remaining: ${remainingCalls}${urgencyMessage}`;
};

export default budgetStatus;
