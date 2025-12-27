/**
 * ============================================================================
 * Skill Content: GM Knowledge Model (认知维度)
 * ============================================================================
 *
 * MIGRATED TO ATOMS
 * Reference: src/services/prompts/atoms/core/gmKnowledge.ts
 */

import type { SkillContext } from "../../types";
import { gmKnowledge } from "../../../atoms/core/gmKnowledge";

export function getGmKnowledgeContent(ctx: SkillContext): string {
  return gmKnowledge({ isLiteMode: ctx.isLiteMode });
}
