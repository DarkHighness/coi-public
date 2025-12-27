/**
 * ============================================================================
 * Skill Content: NPC Logic and Psychology (他者哲学)
 * ============================================================================
 *
 * MIGRATED TO ATOMS
 * Reference: src/services/prompts/atoms/entities/npcLogic.ts
 */

import type { SkillContext } from "../../types";
import { npcLogic } from "../../../atoms/entities/npcLogic";

export function getNpcLogicContent(ctx: SkillContext): string {
  return npcLogic({ isLiteMode: ctx.isLiteMode });
}

export function getNpcLogicLiteContent(_ctx: SkillContext): string {
  return npcLogic({ isLiteMode: true });
}
