/**
 * ============================================================================
 * World Context Builder
 * ============================================================================
 *
 * Builds static world foundation context from game state.
 * This content is cacheable and placed at the beginning of context.
 */

import type { GameState } from "@/types";
import {
  renderWorldFoundation,
  renderGodMode,
  renderCharacterFull,
} from "../../../../prompts/atoms/renderers";

/**
 * Build world foundation XML block
 */
export function buildWorldFoundation(gameState: GameState): string {
  return renderWorldFoundation({ outline: gameState.outline });
}

/**
 * Build protagonist XML block with full character details
 */
export function buildProtagonist(gameState: GameState): string {
  if (!gameState.character) return "";
  return renderCharacterFull({ character: gameState.character });
}

/**
 * Build god mode context if enabled
 */
export function buildGodModeContext(gameState: GameState): string {
  return renderGodMode({ godMode: gameState.godMode });
}
