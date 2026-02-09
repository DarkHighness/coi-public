/**
 * Outline Phase Prompts
 *
 * Prompt generators for each outline phase.
 */

import {
  getOutlinePhase0Prompt,
  getOutlinePhase1Prompt,
  getOutlinePhase2WorldFoundationPrompt,
  getOutlinePhase2Prompt,
  getOutlinePhase3Prompt,
  getOutlinePhase4Prompt,
  getOutlinePhase5Prompt,
  getOutlinePhase7Prompt,
  getOutlinePhase8Prompt,
  getOutlinePhase9Prompt,
} from "../../../prompts/index";

/**
 * Get the prompt for a specific outline phase
 */
export function getPhasePrompt(
  phase: number,
  theme: string,
  language: string,
  submitToolName: string,
  customContext?: string,
  hasImageContext?: boolean,
  protagonistFeature?: string,
): string | null {
  switch (phase) {
    case 0:
      return getOutlinePhase0Prompt(language, submitToolName);
    case 1:
      return getOutlinePhase1Prompt(
        theme,
        language,
        customContext,
        hasImageContext,
        protagonistFeature,
        submitToolName,
      );
    case 2:
      return getOutlinePhase2WorldFoundationPrompt(
        theme,
        language,
        customContext,
        hasImageContext,
        protagonistFeature,
        submitToolName,
      );
    case 3:
      return getOutlinePhase2Prompt(protagonistFeature, submitToolName);
    case 4:
      return getOutlinePhase3Prompt(submitToolName);
    case 5:
      return getOutlinePhase4Prompt(submitToolName);
    case 6:
      return getOutlinePhase5Prompt(submitToolName);
    case 7:
      return getOutlinePhase7Prompt(submitToolName);
    case 8:
      return getOutlinePhase8Prompt(submitToolName);
    case 9:
      return getOutlinePhase9Prompt(hasImageContext, submitToolName);
    default:
      return null;
  }
}
