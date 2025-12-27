/**
 * ============================================================================
 * Skill Content: Narrative Scale (叙事规模适配)
 * ============================================================================
 *
 * MIGRATED TO ATOMS
 * Reference: src/services/prompts/atoms/narrative/index.ts
 */

import type { SkillContext } from "../types";
import {
  narrativeScaleRuntime,
  narrativeScaleRuntimeLite,
} from "../../atoms/narrative";

/**
 * 获取基于叙事规模的运行时指导
 */
export function getNarrativeScaleContent(ctx: SkillContext): string {
  const scale = ctx.narrativeScale || ctx.gameState?.narrativeScale;

  if (!scale) {
    return ""; // 如果没有设置，不注入额外内容
  }

  // atoms/narrative/narrativeScaleRuntime accepts { scale: "epic" | "intimate" | "balanced" }
  return narrativeScaleRuntime({ scale: scale as any });
}

/**
 * Lite 版本 - 精简指导
 */
export function getNarrativeScaleLiteContent(ctx: SkillContext): string {
  const scale = ctx.narrativeScale || ctx.gameState?.narrativeScale;

  if (!scale) return "";

  return narrativeScaleRuntimeLite({ scale: scale as any });
}
