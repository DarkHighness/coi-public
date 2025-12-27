/**
 * ============================================================================
 * Skill Content: Essence (纯粹本质)
 * ============================================================================
 *
 * MIGRATED TO ATOMS
 * Reference: src/services/prompts/atoms/core/essence.ts
 */

import type { SkillContext } from "../../types";
import { essence } from "../../../atoms/core/essence";

export function getEssenceContent(ctx: SkillContext): string {
  return essence({ isLiteMode: ctx.isLiteMode });
}

export function getEssenceLiteContent(_ctx: SkillContext): string {
  return essence({ isLiteMode: true });
}
