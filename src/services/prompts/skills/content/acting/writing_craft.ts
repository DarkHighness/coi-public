/**
 * ============================================================================
 * Skill Content: Writing Craft (叙事诗学)
 * ============================================================================
 *
 * MIGRATED TO ATOMS
 * Reference: src/services/prompts/atoms/narrative/writingCraft.ts
 */

import type { SkillContext } from "../../types";
import { writingCraft } from "../../../atoms/narrative/writingCraft";

export function getWritingCraftContent(ctx: SkillContext): string {
  return writingCraft({ isLiteMode: ctx.isLiteMode });
}

/**
 * 精简版写作规则
 */
export function getWritingCraftLiteContent(_ctx: SkillContext): string {
  return writingCraft({ isLiteMode: true });
}
