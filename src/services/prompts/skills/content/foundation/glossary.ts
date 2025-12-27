/**
 * ============================================================================
 * Glossary: 哲学术语表
 * ============================================================================
 *
 * MIGRATED TO ATOMS
 * Reference: src/services/prompts/atoms/core/glossary.ts
 */

import type { SkillContext } from "../../types";
import { glossary } from "../../../atoms/core/glossary";

// Re-export constants for backward compatibility
export {
  PHILOSOPHICAL_STANCE,
  BEING_DIMENSION,
  KNOWING_DIMENSION,
  ACTING_DIMENSION,
  ONTOLOGICAL_LEVELS,
  TEMPORAL_DIMENSIONS,
} from "../../../atoms/core/glossary";

/**
 * 获取术语表内容 - 供 AI 加载理解核心概念
 */
export function getGlossaryContent(ctx: SkillContext): string {
  return glossary({ isLiteMode: ctx.isLiteMode });
}

/**
 * 获取术语表精简版
 */
export function getGlossaryLiteContent(_ctx: SkillContext): string {
  return glossary({ isLiteMode: true });
}
