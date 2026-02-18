/**
 * Outline Phase Prompts
 *
 * Prompt generators for each outline phase.
 */

import {
  getOutlinePhasePreludePrompt,
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
import type { OutlinePhaseSharedContext } from "../../../prompts/index";

/**
 * Get the prompt for a specific outline phase
 */
export function getPhasePrompt(
  phase: number,
  submitToolName: string,
  sharedContext?: OutlinePhaseSharedContext,
): string | null {
  if (!sharedContext) return null;

  const {
    theme,
    language,
    customContext,
    hasImageContext,
    protagonistFeature,
  } = sharedContext;

  let phaseBody: string | null = null;
  switch (phase) {
    case 0:
      phaseBody = getOutlinePhase0Prompt(language, submitToolName);
      break;
    case 1:
      phaseBody = getOutlinePhase1Prompt(
        theme,
        language,
        customContext,
        Boolean(hasImageContext),
        protagonistFeature,
        submitToolName,
        {
          culturePreference: sharedContext.culturePreference,
          culturePreferenceSource: sharedContext.culturePreferenceSource,
          cultureEffectiveCircle: sharedContext.cultureEffectiveCircle,
          cultureSkillPath: sharedContext.cultureSkillPath,
          cultureHubSkillPath: sharedContext.cultureHubSkillPath,
          cultureNamingPolicy: sharedContext.cultureNamingPolicy,
        },
      );
      break;
    case 2:
      phaseBody = getOutlinePhase2WorldFoundationPrompt(
        theme,
        language,
        customContext,
        Boolean(hasImageContext),
        protagonistFeature,
        submitToolName,
      );
      break;
    case 3:
      phaseBody = getOutlinePhase2Prompt(
        protagonistFeature,
        submitToolName,
        sharedContext.genderPreference,
      );
      break;
    case 4:
      phaseBody = getOutlinePhase3Prompt(submitToolName);
      break;
    case 5:
      phaseBody = getOutlinePhase4Prompt(submitToolName);
      break;
    case 6:
      phaseBody = getOutlinePhase5Prompt(submitToolName);
      break;
    case 7:
      phaseBody = getOutlinePhase7Prompt(submitToolName);
      break;
    case 8:
      phaseBody = getOutlinePhase8Prompt(submitToolName);
      break;
    case 9:
      phaseBody = getOutlinePhase9Prompt(
        Boolean(hasImageContext),
        submitToolName,
      );
      break;
    default:
      return null;
  }

  const phasePrelude = getOutlinePhasePreludePrompt(
    phase,
    submitToolName,
    sharedContext,
  );
  return `${phasePrelude}\n\n${phaseBody}`;
}
