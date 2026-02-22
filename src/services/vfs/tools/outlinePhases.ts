import type { OutlinePhaseId } from "../../../types";
import type { OutlineFinishToolName } from "./types";

export const OUTLINE_PHASE_IDS = [
  "image_seed",
  "master_plan",
  "placeholder_registry",
  "world_foundation",
  "player_actor",
  "locations",
  "factions",
  "npcs_relationships",
  "quests",
  "knowledge",
  "timeline",
  "atmosphere",
  "opening_narrative",
] as const satisfies readonly OutlinePhaseId[];

export const getOutlineSubmitToolName = (
  phaseId: OutlinePhaseId,
): OutlineFinishToolName => `vfs_finish_outline_${phaseId}`;

export const OUTLINE_PHASE_SEQUENCE = OUTLINE_PHASE_IDS.map((id, index) => ({
  id,
  order: index + 1,
  submitToolName: getOutlineSubmitToolName(id),
}));
