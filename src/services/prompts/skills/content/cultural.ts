/**
 * ============================================================================
 * Skill Content: Cultural Adaptation
 * ============================================================================
 *
 * MIGRATED TO ATOMS
 * Reference: src/services/prompts/atoms/cultural/index.ts
 */

import type { SkillContext } from "../types";
import {
  culturalAdaptation,
  languageEnforcement,
} from "../../atoms/cultural";

export function getCulturalAdaptationContent(ctx: SkillContext): string {
  // culturalAdaptation atom expects { language: string }
  // We can pass the language from context
  const language = ctx.language || "en";
  return culturalAdaptation({ language });
}

export function getLanguageEnforcementContent(language: string): string {
  return languageEnforcement({ language });
}
