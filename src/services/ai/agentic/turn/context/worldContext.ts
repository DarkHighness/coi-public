/**
 * ============================================================================
 * World Context Builder
 * ============================================================================
 *
 * Builds static world foundation context from game state.
 * This content is cacheable and placed at the beginning of context.
 */

import type { GameState } from "@/types";
import { toToon } from "@/services/prompts/toon";

/**
 * Build world foundation XML block
 */
export function buildWorldFoundation(gameState: GameState): string {
  const outline = gameState.outline;
  if (!outline) return "";

  return `<world_foundation>
<title>${outline.title}</title>
<premise>${outline.premise}</premise>
<main_goal>${toToon(outline.mainGoal)}</main_goal>
<world_setting>${toToon(outline.worldSetting)}</world_setting>
</world_foundation>`;
}

/**
 * Build protagonist XML block with full character details
 */
export function buildProtagonist(gameState: GameState): string {
  const char = gameState.character;

  const lines: string[] = [
    `name: ${char.name}`,
    `title: ${char.title}`,
    `race: ${char.race}`,
    `profession: ${char.profession}`,
    `appearance: ${char.appearance}`,
    `background: ${char.background}`,
  ];

  // Add optional fields if present
  if (char.age) {
    lines.push(`age: ${char.age}`);
  }
  if (char.status) {
    lines.push(`status: ${char.status}`);
  }
  if (char.currentLocation) {
    lines.push(`currentLocation: ${char.currentLocation}`);
  }

  return `<protagonist>
${lines.join("\n")}
</protagonist>`;
}

/**
 * Build god mode context if enabled
 */
export function buildGodModeContext(gameState: GameState): string {
  if (!gameState.godMode) return "";

  return `<god_mode>
GOD MODE ACTIVE: Player has absolute power. All actions succeed. NPCs obey unconditionally.
</god_mode>`;
}
