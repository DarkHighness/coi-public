import type { ZodTypeAny } from "zod";
import type { OutlinePhaseId } from "../../../../types";
import {
  outlineImageSeedSchema,
  outlineMasterPlanSchema,
  outlinePlaceholderRegistrySchema,
  outlineWorldFoundationSchema,
  outlinePlayerActorSchema,
  outlineLocationsSchema,
  outlineFactionsSchema,
  outlineNpcsRelationshipsSchema,
  outlineQuestsSchema,
  outlineKnowledgeSchema,
  outlineTimelineSchema,
  outlineAtmosphereSchema,
  outlineOpeningNarrativeSchema,
} from "../../../schemas";

export type OutlineSubmitToolName = `vfs_finish_outline_${OutlinePhaseId}`;

export interface OutlinePhaseDefinition {
  id: OutlinePhaseId;
  order: number;
  includeWhen: (input: { hasImageContext: boolean }) => boolean;
  submitToolName: OutlineSubmitToolName;
  schema: ZodTypeAny;
  endpointKey: string;
  progressNameKey: string;
}

export interface ActiveOutlinePhaseDefinition extends OutlinePhaseDefinition {
  phaseOrder: number;
  totalPhases: number;
}

export const getOutlineSubmitToolName = (
  phaseId: OutlinePhaseId,
): OutlineSubmitToolName => `vfs_finish_outline_${phaseId}`;

export const getOutlinePhaseArtifactLogicalPath = (
  phaseId: OutlinePhaseId,
): string => `outline/phases/${phaseId}.json`;

export const getOutlinePhaseArtifactCurrentPath = (
  phaseId: OutlinePhaseId,
): string => `current/${getOutlinePhaseArtifactLogicalPath(phaseId)}`;

export const getOutlinePhaseArtifactSharedPath = (
  phaseId: OutlinePhaseId,
): string => `shared/narrative/${getOutlinePhaseArtifactLogicalPath(phaseId)}`;

const OUTLINE_PHASE_DEFINITIONS_BASE: OutlinePhaseDefinition[] = [
  {
    id: "image_seed",
    order: 1,
    includeWhen: ({ hasImageContext }) => hasImageContext,
    submitToolName: getOutlineSubmitToolName("image_seed"),
    schema: outlineImageSeedSchema,
    endpointKey: "outline-phase-image_seed",
    progressNameKey: "initializing.outline.phase.image_seed.name",
  },
  {
    id: "master_plan",
    order: 2,
    includeWhen: () => true,
    submitToolName: getOutlineSubmitToolName("master_plan"),
    schema: outlineMasterPlanSchema,
    endpointKey: "outline-phase-master_plan",
    progressNameKey: "initializing.outline.phase.master_plan.name",
  },
  {
    id: "placeholder_registry",
    order: 3,
    includeWhen: () => true,
    submitToolName: getOutlineSubmitToolName("placeholder_registry"),
    schema: outlinePlaceholderRegistrySchema,
    endpointKey: "outline-phase-placeholder_registry",
    progressNameKey: "initializing.outline.phase.placeholder_registry.name",
  },
  {
    id: "world_foundation",
    order: 4,
    includeWhen: () => true,
    submitToolName: getOutlineSubmitToolName("world_foundation"),
    schema: outlineWorldFoundationSchema,
    endpointKey: "outline-phase-world_foundation",
    progressNameKey: "initializing.outline.phase.world_foundation.name",
  },
  {
    id: "player_actor",
    order: 5,
    includeWhen: () => true,
    submitToolName: getOutlineSubmitToolName("player_actor"),
    schema: outlinePlayerActorSchema,
    endpointKey: "outline-phase-player_actor",
    progressNameKey: "initializing.outline.phase.player_actor.name",
  },
  {
    id: "locations",
    order: 6,
    includeWhen: () => true,
    submitToolName: getOutlineSubmitToolName("locations"),
    schema: outlineLocationsSchema,
    endpointKey: "outline-phase-locations",
    progressNameKey: "initializing.outline.phase.locations.name",
  },
  {
    id: "factions",
    order: 7,
    includeWhen: () => true,
    submitToolName: getOutlineSubmitToolName("factions"),
    schema: outlineFactionsSchema,
    endpointKey: "outline-phase-factions",
    progressNameKey: "initializing.outline.phase.factions.name",
  },
  {
    id: "npcs_relationships",
    order: 8,
    includeWhen: () => true,
    submitToolName: getOutlineSubmitToolName("npcs_relationships"),
    schema: outlineNpcsRelationshipsSchema,
    endpointKey: "outline-phase-npcs_relationships",
    progressNameKey: "initializing.outline.phase.npcs_relationships.name",
  },
  {
    id: "quests",
    order: 9,
    includeWhen: () => true,
    submitToolName: getOutlineSubmitToolName("quests"),
    schema: outlineQuestsSchema,
    endpointKey: "outline-phase-quests",
    progressNameKey: "initializing.outline.phase.quests.name",
  },
  {
    id: "knowledge",
    order: 10,
    includeWhen: () => true,
    submitToolName: getOutlineSubmitToolName("knowledge"),
    schema: outlineKnowledgeSchema,
    endpointKey: "outline-phase-knowledge",
    progressNameKey: "initializing.outline.phase.knowledge.name",
  },
  {
    id: "timeline",
    order: 11,
    includeWhen: () => true,
    submitToolName: getOutlineSubmitToolName("timeline"),
    schema: outlineTimelineSchema,
    endpointKey: "outline-phase-timeline",
    progressNameKey: "initializing.outline.phase.timeline.name",
  },
  {
    id: "atmosphere",
    order: 12,
    includeWhen: () => true,
    submitToolName: getOutlineSubmitToolName("atmosphere"),
    schema: outlineAtmosphereSchema,
    endpointKey: "outline-phase-atmosphere",
    progressNameKey: "initializing.outline.phase.atmosphere.name",
  },
  {
    id: "opening_narrative",
    order: 13,
    includeWhen: () => true,
    submitToolName: getOutlineSubmitToolName("opening_narrative"),
    schema: outlineOpeningNarrativeSchema,
    endpointKey: "outline-phase-opening_narrative",
    progressNameKey: "initializing.outline.phase.opening_narrative.name",
  },
];

export const getAllOutlinePhaseDefinitions = (): OutlinePhaseDefinition[] =>
  OUTLINE_PHASE_DEFINITIONS_BASE.map((phase) => ({ ...phase }));

export const getActiveOutlinePhases = (input: {
  hasImageContext: boolean;
}): ActiveOutlinePhaseDefinition[] => {
  const active = OUTLINE_PHASE_DEFINITIONS_BASE.filter((phase) =>
    phase.includeWhen(input),
  );
  const totalPhases = active.length;
  return active.map((phase, index) => ({
    ...phase,
    phaseOrder: index + 1,
    totalPhases,
  }));
};

export const getOutlinePhaseDefinitionById = (
  phaseId: OutlinePhaseId,
): OutlinePhaseDefinition | undefined =>
  OUTLINE_PHASE_DEFINITIONS_BASE.find((phase) => phase.id === phaseId);
