/**
 * ============================================================================
 * Philosophy: 哲学宣言
 * ============================================================================
 *
 * MIGRATED TO ATOMS
 * Reference: src/services/prompts/atoms/core/philosophy.ts
 */

import type { SkillContext } from "../../types";
import { philosophy } from "../../../atoms/core/philosophy";

export function getPhilosophyContent(ctx: SkillContext): string {
  return philosophy({ isLiteMode: ctx.isLiteMode });
}

export function getPhilosophyLiteContent(_ctx: SkillContext): string {
  return philosophy({ isLiteMode: true });
}
