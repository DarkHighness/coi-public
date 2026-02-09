/**
 * Summary Loop Initializer
 *
 * Handles initialization of summary agentic loop state.
 */

import type { AISettings, TokenUsage } from "../../../../types";
import type { ZodToolDefinition } from "../../../providers/types";
import { GameDatabase } from "../../../gameDatabase";
import { BudgetState, createBudgetState } from "../budgetUtils";
import { getSummaryToolsForStrategy } from "../../../tools";
import type { SummaryLoopInput } from "./summary";
import type { VfsSession } from "../../../vfs/vfsSession";

// ============================================================================
// Types
// ============================================================================

export interface SummaryLoopState {
  db: GameDatabase;
  gameState: SummaryLoopInput["gameState"];
  vfsSession?: VfsSession;
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
  const { gameState, settings, strategy } = input;

  const db = new GameDatabase({
    ...gameState,
    knowledge: gameState.knowledge || [],
    factions: gameState.factions || [],
    timeline: gameState.timeline || [],
    causalChains: gameState.causalChains || [],
    time: gameState.time || "Unknown",
  });

  return {
    db,
    gameState,
    vfsSession: input.vfsSession,
    budgetState: createBudgetState(settings),
    totalUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    activeTools: getSummaryToolsForStrategy(strategy ?? "compact"),
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
