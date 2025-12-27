/**
 * ============================================================================
 * Player Profile Content - Player Psychology Observation System
 * ============================================================================
 *
 * MIGRATED TO ATOMS
 * Reference: src/services/prompts/atoms/core/playerProfile.ts
 */

import type { SkillContext } from "../types";
import { playerProfile } from "../../atoms/core/playerProfile";

/**
 * Get player profile content for injection into system prompt
 */
export const getPlayerProfileContent = (ctx: SkillContext): string => {
  return playerProfile({
    crossSaveProfile: ctx.crossSaveProfile,
    perSaveProfile: ctx.perSaveProfile,
    isLiteMode: ctx.isLiteMode,
  });
};
