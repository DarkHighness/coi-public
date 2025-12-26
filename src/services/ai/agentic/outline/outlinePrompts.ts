/**
 * Outline Phase Prompts
 *
 * Prompt generators for each outline phase.
 */

import {
  getOutlinePhase0Prompt,
  getOutlinePhase1Prompt,
  getOutlinePhase2Prompt,
  getOutlinePhase3Prompt,
  getOutlinePhase4Prompt,
  getOutlinePhase5Prompt,
  getOutlinePhase6Prompt,
  getOutlinePhase7Prompt,
  getOutlinePhase8Prompt,
  getOutlinePhase9Prompt,
  getOutlinePhase10Prompt,
} from "../../../prompts/index";

/**
 * Get the prompt for a specific outline phase
 */
export function getPhasePrompt(
  phase: number,
  theme: string,
  language: string,
  customContext?: string,
  hasImageContext?: boolean,
  protagonistFeature?: string,
): string | null {
  switch (phase) {
    case 0:
      return getOutlinePhase0Prompt(language);
    case 1:
      return getOutlinePhase1Prompt(
        theme,
        language,
        customContext,
        hasImageContext,
        protagonistFeature,
      );
    case 2:
      return getOutlinePhase2Prompt(protagonistFeature);
    case 3:
      return getOutlinePhase3Prompt();
    case 4:
      return getOutlinePhase4Prompt();
    case 5:
      return getOutlinePhase5Prompt();
    case 6:
      return getOutlinePhase6Prompt();
    case 7:
      return getOutlinePhase7Prompt();
    case 8:
      return getOutlinePhase8Prompt();
    case 9:
      return getOutlinePhase9Prompt();
    case 10:
      return getOutlinePhase10Prompt(hasImageContext);
    default:
      return null;
  }
}
