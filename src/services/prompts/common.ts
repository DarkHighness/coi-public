/**
 * Common Prompts - Wrapper Functions
 *
 * These functions wrap atom functions for use by
 * non-skills callers (storyOutline.ts, veoScript.ts, summaryContext.ts).
 *
 * REFACTORED: Now imports directly from atoms/* instead of skills/content/*
 */

import { culturalAdaptation } from "./atoms/cultural";

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
