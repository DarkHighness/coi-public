/**
 * ============================================================================
 * Skill Content: Output Format and Tool Calling
 * ============================================================================
 *
 * MIGRATED TO ATOMS
 * Reference: src/services/prompts/atoms/core/index.ts
 */

import type { SkillContext } from "../types";
import {
  outputFormat,
  entityDefinitions,
  styleGuide,
  ragUsage,
  toolUsage,
} from "../../atoms/core";

export function getOutputFormatContent(ctx: SkillContext): string {
  const { language, finishToolName } = ctx;
  return outputFormat({ language, finishToolName });
}

export function getEntityDefinitionsContent(_ctx: SkillContext): string {
  return entityDefinitions();
}

export function getStyleSectionContent(ctx: SkillContext): string {
  return styleGuide({
    themeStyle: ctx.themeStyle,
    isLiteMode: ctx.isLiteMode,
  });
}

export function getRAGUsageContent(ctx: SkillContext): string {
  return ragUsage({ ragEnabled: !!ctx.ragEnabled });
}

export function getToolLoadingInstructionContent(ctx: SkillContext): string {
  return toolUsage({ finishToolName: ctx.finishToolName });
}
