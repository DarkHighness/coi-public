import {
  TokenUsage,
  GameState,
  TurnContext,
  GameResponse,
  LogEntry,
} from "../../types";

import { generateAdventureTurn, AgenticLoopResult } from "./adventure";

// ============================================================================
// Force Update Logic - Thin wrapper over generateAdventureTurn
// ============================================================================

/**
 * Result of force update (same as AgenticLoopResult, history managed internally)
 */
export interface ForceUpdateResult {
  response: GameResponse;
  logs: LogEntry[];
  usage: TokenUsage;
  changedEntities: Array<{ id: string; type: string }>;
}

/**
 * 生成强制更新 (Force Update / Sudo)
 *
 * Design: Force Update is just a normal turn with:
 * 1. User action prefixed with [SUDO] to signal force update mode
 * 2. complete_force_update tool available instead of finish_turn
 *
 * Note: This does NOT modify godMode. godMode is a permanent player state (/god),
 * while force update is a one-time GM command (/sudo).
 *
 * This ensures the same KV cache, same agentic loop, same tools system.
 * History is managed internally by the session manager.
 */
export const generateForceUpdate = async (
  prompt: string,
  inputState: GameState,
  context: TurnContext,
): Promise<ForceUpdateResult> => {
  // Create a modified context for SUDO mode
  // The [SUDO] prefix tells the agentic loop to:
  // 1. Use complete_force_update instead of finish_turn
  // 2. Apply force update rules (bypass simulation logic)
  const sudoContext: TurnContext = {
    ...context,
    userAction: `[SUDO] ${prompt}`,
  };

  // Use the same adventure turn generation
  // Note: We do NOT modify godMode - that's a separate permanent state
  // History is managed internally by session manager
  const result: AgenticLoopResult = await generateAdventureTurn(
    inputState,
    sudoContext,
  );

  // Extract finalState if present in response
  const extendedResponse = result.response as GameResponse & {
    finalState?: unknown;
  };

  // If no finalState was set by complete_force_update, create one from current state
  if (!extendedResponse.finalState) {
    extendedResponse.finalState = inputState;
  }

  return {
    response: result.response,
    logs: result.logs,
    usage: result.usage,
    changedEntities: result.changedEntities,
  };
};
