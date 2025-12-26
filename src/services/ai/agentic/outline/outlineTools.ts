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
  outlinePhase10Schema,
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
    description: "Submit Phase 2: Protagonist character details",
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
    description: "Submit Phase 5: NPCs",
    parameters: outlinePhase5Schema,
  },
  {
    name: "submit_phase6_inventory",
    description: "Submit Phase 6: Initial inventory items",
    parameters: outlinePhase6Schema,
  },
  {
    name: "submit_phase7_quests",
    description: "Submit Phase 7: Available quests",
    parameters: outlinePhase7Schema,
  },
  {
    name: "submit_phase8_knowledge",
    description: "Submit Phase 8: Initial knowledge",
    parameters: outlinePhase8Schema,
  },
  {
    name: "submit_phase9_timeline",
    description: "Submit Phase 9: Timeline events and initial atmosphere",
    parameters: outlinePhase9Schema,
  },
  {
    name: "submit_phase10_opening_narrative",
    description: "Submit Phase 10: Opening narrative that starts the story",
    parameters: outlinePhase10Schema,
  },
];

/**
 * Get tool definition for a specific phase
 */
export function getOutlinePhaseTool(phase: number): ZodToolDefinition {
  if (phase < 0 || phase > 10) {
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
  2: "Character",
  3: "Locations",
  4: "Factions",
  5: "NPCs",
  6: "Inventory",
  7: "Quests",
  8: "Knowledge",
  9: "Timeline",
  10: "Opening Narrative",
};
