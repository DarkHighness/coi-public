/**
 * ============================================================================
 * Skill Content: State Management Rules (存在的持续性)
 * ============================================================================
 *
 * MIGRATED TO ATOMS
 * Reference: src/services/prompts/atoms/core/stateManagement.ts
 */

import type { SkillContext } from "../../types";
import {
  stateManagement,
  idUsageAtom,
  idGenerationAtom,
  minimalEntityAtom,
  iconsAtom,
  unlockVsHighlightAtom,
  hiddenNarrationAtom,
  globalNotesAtom,
  memoryQueryAtom,
  systemRulesAtom,
  atmosphereDiscoveryAtom,
  visualPolicy,
  visualsAtom,
  formattingAtom,
  npcObservationAtom,
} from "../../../atoms/core";

export function getStateManagementContent(_ctx: SkillContext): string {
  return stateManagement();
}

/**
 * ID Generation currently includes ID Usage, ID Rules, and Minimal Entity Principle
 */
export function getIdGenerationContent(_ctx: SkillContext): string {
  return `
${idUsageAtom()}
${idGenerationAtom()}
${minimalEntityAtom()}
`;
}

export function getUnlockVsHighlightContent(_ctx: SkillContext): string {
  return unlockVsHighlightAtom();
}

export function getHiddenContentNarrationContent(_ctx: SkillContext): string {
  return hiddenNarrationAtom();
}

export function getGlobalNotesContent(_ctx: SkillContext): string {
  return globalNotesAtom();
}

export function getMemoryContextQueryContent(_ctx: SkillContext): string {
  return memoryQueryAtom();
}

export function getSystemRulesContent(_ctx: SkillContext): string {
  return systemRulesAtom();
}

export function getAtmosphereDiscoveryContent(_ctx: SkillContext): string {
  return atmosphereDiscoveryAtom();
}

export function getVisualsContent(ctx: SkillContext): string {
  if (ctx.disableImagePrompt) return "";
  return visualsAtom();
}

export function getIconsContent(_ctx: SkillContext): string {
  return iconsAtom();
}

export function getFormattingContent(_ctx: SkillContext): string {
  return formattingAtom();
}

export function getNpcObservationContent(_ctx: SkillContext): string {
  return npcObservationAtom();
}
