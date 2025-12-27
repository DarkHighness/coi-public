/**
 * ============================================================================
 * Skill Content: Combat, Dialogue, and Atmosphere (具身现象学)
 * ============================================================================
 *
 * MIGRATED TO ATOMS
 * Reference: src/services/prompts/atoms/narrative/index.ts
 */

import type { SkillContext } from "../../types";
import {
  combatMechanics,
  dialogueMechanics,
  atmosphereMechanics,
  mysteryMechanics,
} from "../../../atoms/narrative";

export function getCombatContent(_ctx: SkillContext): string {
  return combatMechanics();
}

export function getDialogueContent(_ctx: SkillContext): string {
  return dialogueMechanics();
}

export function getAtmosphereContent(_ctx: SkillContext): string {
  return atmosphereMechanics();
}

export function getMysteryContent(_ctx: SkillContext): string {
  return mysteryMechanics();
}
