/**
 * ============================================================================
 * Skill Content: Temporal Philosophy (时间哲学)
 * ============================================================================
 *
 * MIGRATED TO ATOMS
 * Reference: src/services/prompts/atoms/narrative/temporalPhilosophy.ts
 */

import type { SkillContext } from "../../types";
import {
  temporalPhilosophy,
  temporalPhilosophyLite,
} from "../../../atoms/narrative/temporalPhilosophy";

export function getTemporalPhilosophyContent(_ctx: SkillContext): string {
  return temporalPhilosophy();
}

export function getTemporalPhilosophyLiteContent(_ctx: SkillContext): string {
  return temporalPhilosophyLite();
}
