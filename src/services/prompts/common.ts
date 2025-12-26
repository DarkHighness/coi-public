/**
 * Common Prompts - Wrapper Functions
 *
 * These functions wrap the skills content functions for use by
 * non-skills callers (storyOutline.ts, veoScript.ts, summaryContext.ts).
 *
 * The actual content is defined in skills/content/* files.
 */

import type { SkillContext } from "./skills/types";
import {
  getCulturalAdaptationContent,
  getLanguageEnforcementContent,
} from "./skills/content/cultural";
import { getRoleInstructionContent } from "./skills/content/identity";
import { getWorldConsistencyContent } from "./skills/content/core_rules";

// ============================================================================
// Wrapper Functions
// ============================================================================

/**
 * Create a minimal SkillContext for simple callers
 */
function createMinimalContext(language: string): SkillContext {
  return { language };
}

/**
 * Get cultural adaptation instruction for the specified language.
 * Wraps skills/content/cultural.ts::getCulturalAdaptationContent
 */
export const getCulturalAdaptationInstruction = (language: string): string => {
  return getCulturalAdaptationContent(createMinimalContext(language));
};

/**
 * Get language enforcement instruction.
 * Wraps skills/content/cultural.ts::getLanguageEnforcementContent
 */
export const getLanguageEnforcement = (language: string): string => {
  return getLanguageEnforcementContent(language);
};

/**
 * Get core role instruction.
 * Wraps skills/content/identity.ts::getRoleInstructionContent
 */
export const getRoleInstruction = (): string => {
  return getRoleInstructionContent(createMinimalContext("en"));
};

/**
 * Get world consistency rules.
 * Wraps skills/content/core_rules.ts::getWorldConsistencyContent
 */
export const getWorldConsistencyRule = (): string => {
  return getWorldConsistencyContent(createMinimalContext("en"));
};
