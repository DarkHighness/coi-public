/**
 * Outline Tool Definitions
 *
 * Tool definitions for phased outline generation.
 */

import type { ZodToolDefinition } from "../../../providers/types";
import {
  outlinePhase0Schema,
  outlinePhase1Schema,
  outlinePhase2Schema,
  outlinePhase3Schema,
  outlinePhase4Schema,
  outlinePhase5Schema,
  outlinePhase6Schema,
  outlinePhase7Schema,
  outlinePhase8Schema,
  outlinePhase9Schema,
} from "../../../schemas";

/**
 * Tool definitions for each outline phase
 * Phase 0 is conditional (only for image-based generation)
 */
export const OUTLINE_PHASE_TOOLS: ZodToolDefinition[] = [
  {
    name: "submit_phase0_image_interpretation",
    description:
      "Submit Phase 0: Image interpretation with visual elements and suggested world context",
    parameters: outlinePhase0Schema,
  },
  {
    name: "submit_phase1_world_foundation",
    description:
      "Submit Phase 1: World Foundation including title, premise, setting, and main goal",
    parameters: outlinePhase1Schema,
  },
  {
    name: "submit_phase2_character",
    description:
      "Submit Phase 2: Player actor bundle (profile + skills/conditions/traits + inventory)",
    parameters: outlinePhase2Schema,
  },
  {
    name: "submit_phase3_locations",
    description: "Submit Phase 3: Key locations in the story world",
    parameters: outlinePhase3Schema,
  },
  {
    name: "submit_phase4_factions",
    description: "Submit Phase 4: Factions and groups",
    parameters: outlinePhase4Schema,
  },
  {
    name: "submit_phase5_npcs",
    description:
      "Submit Phase 5: NPC actor bundles (with inventories) + placeholders + relationships",
    parameters: outlinePhase5Schema,
  },
  {
    name: "submit_phase6_quests",
    description: "Submit Phase 6: Available quests",
    parameters: outlinePhase6Schema,
  },
  {
    name: "submit_phase7_knowledge",
    description: "Submit Phase 7: Initial knowledge",
    parameters: outlinePhase7Schema,
  },
  {
    name: "submit_phase8_timeline",
    description: "Submit Phase 8: Timeline events and initial atmosphere",
    parameters: outlinePhase8Schema,
  },
  {
    name: "submit_phase9_opening_narrative",
    description: "Submit Phase 9: Opening narrative that starts the story",
    parameters: outlinePhase9Schema,
  },
];

/**
 * Get tool definition for a specific phase
 */
export function getOutlinePhaseTool(phase: number): ZodToolDefinition {
  if (phase < 0 || phase > 9) {
    throw new Error(`Invalid outline phase: ${phase}`);
  }
  return OUTLINE_PHASE_TOOLS[phase];
}

/**
 * Phase names for progress reporting
 */
export const OUTLINE_PHASE_NAMES: Record<number, string> = {
  0: "Image Interpretation",
  1: "World Foundation",
  2: "Player Actor",
  3: "Locations",
  4: "Factions",
  5: "NPCs & Relationships",
  6: "Quests",
  7: "Knowledge",
  8: "Timeline",
  9: "Opening Narrative",
};
