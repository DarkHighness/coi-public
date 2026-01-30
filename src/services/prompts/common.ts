/**
 * Common Prompts - Wrapper Functions
 *
 * These functions wrap atom functions for use by
 * non-skills callers (storyOutline.ts, veoScript.ts, summaryContext.ts).
 *
 * REFACTORED: Now imports directly from atoms/* instead of skills/content/*
 */

import { culturalAdaptation, languageEnforcement } from "./atoms/cultural";
import { roleInstruction, worldConsistency } from "./atoms/core";

// ============================================================================
// Wrapper Functions
// ============================================================================

/**
 * Get cultural adaptation instruction for the specified language.
 * Wraps atoms/cultural/adaptation.ts::culturalAdaptation
 */
export const getCulturalAdaptationInstruction = (language: string): string => {
  return culturalAdaptation({ language });
};

/**
 * Get language enforcement instruction.
 * Wraps atoms/cultural/languageEnforcement.ts::languageEnforcement
 */
export const getLanguageEnforcement = (language: string): string => {
  return languageEnforcement({ language });
};

/**
 * Get core role instruction.
 * Wraps atoms/core/roleInstruction.ts::roleInstruction
 */
export const getRoleInstruction = (): string => {
  return roleInstruction();
};

/**
 * Get world consistency rules.
 * Wraps atoms/core/worldConsistency.ts::worldConsistency
 */
export const getWorldConsistencyRule = (): string => {
  return worldConsistency();
};
