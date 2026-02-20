/**
 * Outline Phase Prompts
 *
 * Prompt generators for each outline phase.
 */

import {
  getOutlinePhasePreludePrompt,
  getOutlineImageSeedPrompt,
  getOutlineMasterPlanPrompt,
  getOutlinePlaceholderRegistryPrompt,
  getOutlineWorldFoundationPrompt,
  getOutlinePlayerActorPrompt,
  getOutlineLocationsPrompt,
  getOutlineFactionsPrompt,
  getOutlineNpcsRelationshipsPrompt,
  getOutlineQuestsPrompt,
  getOutlineKnowledgePrompt,
  getOutlineTimelinePrompt,
  getOutlineAtmospherePrompt,
  getOutlineOpeningNarrativePrompt,
} from "../../../prompts/index";
import type { OutlinePhaseSharedContext } from "../../../prompts/index";
import type { OutlinePhaseId } from "../../../../types";

/**
 * Get the prompt for a specific outline phase
 */
export function getPhasePrompt(
  phaseId: OutlinePhaseId,
  phaseOrder: number,
  phaseTotal: number,
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
  switch (phaseId) {
    case "image_seed":
      phaseBody = getOutlineImageSeedPrompt(
        language,
        submitToolName,
        phaseOrder,
        phaseTotal,
      );
      break;
    case "master_plan":
      phaseBody = getOutlineMasterPlanPrompt(
        theme,
        language,
        customContext,
        Boolean(hasImageContext),
        protagonistFeature,
        submitToolName,
        phaseOrder,
        phaseTotal,
        {
          genderPreference: sharedContext.genderPreference,
          culturePreference: sharedContext.culturePreference,
          culturePreferenceSource: sharedContext.culturePreferenceSource,
          cultureEffectiveCircle: sharedContext.cultureEffectiveCircle,
          cultureSkillPath: sharedContext.cultureSkillPath,
          cultureHubSkillPath: sharedContext.cultureHubSkillPath,
          cultureNamingPolicy: sharedContext.cultureNamingPolicy,
        },
      );
      break;
    case "placeholder_registry":
      phaseBody = getOutlinePlaceholderRegistryPrompt(
        submitToolName,
        phaseOrder,
        phaseTotal,
      );
      break;
    case "world_foundation":
      phaseBody = getOutlineWorldFoundationPrompt(
        theme,
        language,
        customContext,
        Boolean(hasImageContext),
        protagonistFeature,
        submitToolName,
        phaseOrder,
        phaseTotal,
      );
      break;
    case "player_actor":
      phaseBody = getOutlinePlayerActorPrompt(
        protagonistFeature,
        submitToolName,
        phaseOrder,
        phaseTotal,
        sharedContext.genderPreference,
      );
      break;
    case "locations":
      phaseBody = getOutlineLocationsPrompt(
        submitToolName,
        phaseOrder,
        phaseTotal,
      );
      break;
    case "factions":
      phaseBody = getOutlineFactionsPrompt(
        submitToolName,
        phaseOrder,
        phaseTotal,
      );
      break;
    case "npcs_relationships":
      phaseBody = getOutlineNpcsRelationshipsPrompt(
        submitToolName,
        phaseOrder,
        phaseTotal,
      );
      break;
    case "quests":
      phaseBody = getOutlineQuestsPrompt(
        submitToolName,
        phaseOrder,
        phaseTotal,
      );
      break;
    case "knowledge":
      phaseBody = getOutlineKnowledgePrompt(
        submitToolName,
        phaseOrder,
        phaseTotal,
      );
      break;
    case "timeline":
      phaseBody = getOutlineTimelinePrompt(
        submitToolName,
        phaseOrder,
        phaseTotal,
      );
      break;
    case "atmosphere":
      phaseBody = getOutlineAtmospherePrompt(
        submitToolName,
        phaseOrder,
        phaseTotal,
      );
      break;
    case "opening_narrative":
      phaseBody = getOutlineOpeningNarrativePrompt(
        Boolean(hasImageContext),
        submitToolName,
        phaseOrder,
        phaseTotal,
      );
      break;
    default:
      return null;
  }

  const phasePrelude = getOutlinePhasePreludePrompt(
    phaseId,
    phaseOrder,
    phaseTotal,
    submitToolName,
    sharedContext,
  );
  return `${phasePrelude}\n\n${phaseBody}`;
}
