import {
  outlineAtmosphereSchema,
  outlineFactionsSchema,
  outlineImageSeedSchema,
  outlineKnowledgeSchema,
  outlineLocationsSchema,
  outlineMasterPlanSchema,
  outlineNpcsRelationshipsSchema,
  outlineOpeningNarrativeSchema,
  outlinePlaceholderRegistrySchema,
  outlinePlayerActorSchema,
  outlineQuestsSchema,
  outlineTimelineSchema,
  outlineWorldFoundationSchema,
} from "../../../schemas";
import { createFinishOutlinePhaseHandler } from "./finishOutlinePhaseFactory";

export const handleFinishOutlineImageSeed = createFinishOutlinePhaseHandler(
  "image_seed",
  "vfs_finish_outline_image_seed",
  outlineImageSeedSchema,
);

export const handleFinishOutlineMasterPlan = createFinishOutlinePhaseHandler(
  "master_plan",
  "vfs_finish_outline_master_plan",
  outlineMasterPlanSchema,
);

export const handleFinishOutlinePlaceholderRegistry =
  createFinishOutlinePhaseHandler(
    "placeholder_registry",
    "vfs_finish_outline_placeholder_registry",
    outlinePlaceholderRegistrySchema,
  );

export const handleFinishOutlineWorldFoundation =
  createFinishOutlinePhaseHandler(
    "world_foundation",
    "vfs_finish_outline_world_foundation",
    outlineWorldFoundationSchema,
  );

export const handleFinishOutlinePlayerActor = createFinishOutlinePhaseHandler(
  "player_actor",
  "vfs_finish_outline_player_actor",
  outlinePlayerActorSchema,
);

export const handleFinishOutlineLocations = createFinishOutlinePhaseHandler(
  "locations",
  "vfs_finish_outline_locations",
  outlineLocationsSchema,
);

export const handleFinishOutlineFactions = createFinishOutlinePhaseHandler(
  "factions",
  "vfs_finish_outline_factions",
  outlineFactionsSchema,
);

export const handleFinishOutlineNpcsRelationships =
  createFinishOutlinePhaseHandler(
    "npcs_relationships",
    "vfs_finish_outline_npcs_relationships",
    outlineNpcsRelationshipsSchema,
  );

export const handleFinishOutlineQuests = createFinishOutlinePhaseHandler(
  "quests",
  "vfs_finish_outline_quests",
  outlineQuestsSchema,
);

export const handleFinishOutlineKnowledge = createFinishOutlinePhaseHandler(
  "knowledge",
  "vfs_finish_outline_knowledge",
  outlineKnowledgeSchema,
);

export const handleFinishOutlineTimeline = createFinishOutlinePhaseHandler(
  "timeline",
  "vfs_finish_outline_timeline",
  outlineTimelineSchema,
);

export const handleFinishOutlineAtmosphere = createFinishOutlinePhaseHandler(
  "atmosphere",
  "vfs_finish_outline_atmosphere",
  outlineAtmosphereSchema,
);

export const handleFinishOutlineOpeningNarrative =
  createFinishOutlinePhaseHandler(
    "opening_narrative",
    "vfs_finish_outline_opening_narrative",
    outlineOpeningNarrativeSchema,
  );
