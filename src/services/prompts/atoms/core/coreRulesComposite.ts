/**
 * ============================================================================
 * Core Rules Composite Atom
 * ============================================================================
 *
 * Combines all core rules atoms into a single composite:
 * - ontologicalPriorityAtom
 * - worldConsistency
 * - consequences
 * - maliceAndAntagonism
 * - humanityAndHope
 * - livingWorld
 * - informationRevelation
 */

import { ontologicalPriorityAtom } from "./glossary";
import { worldConsistency } from "./worldConsistency";
import { consequences } from "./consequences";
import { maliceAndAntagonism } from "./maliceAndAntagonism";
import { humanityAndHope } from "./humanityAndHope";
import { livingWorld } from "./livingWorld";
import { informationRevelation } from "./informationRevelation";

export interface CoreRulesInput {
  isLiteMode?: boolean;
}

/**
 * Full version of core rules - combines all world operation atoms
 */
export function coreRulesComposite(input: CoreRulesInput = {}): string {
  if (input.isLiteMode) {
    return coreRulesLite();
  }

  return `
<core_rules>
${ontologicalPriorityAtom()}

${worldConsistency()}
${consequences()}
${maliceAndAntagonism()}
${humanityAndHope()}
${livingWorld()}
${informationRevelation()}
</core_rules>
`;
}

/**
 * Lite version of core rules
 */
export function coreRulesLite(): string {
  return `
<core_rules>
  <rule>WORLD CONSISTENCY: Adhere strictly to genre (realistic/fantasy/sci-fi). No crossover elements.</rule>
  <rule>CONSEQUENCES: Every action has reactions. The world never forgets.</rule>
  <rule>NPC: Use \`hidden\` for true motives, \`visible\` for public face. Track affinity/status changes.</rule>
  <rule>STATE: Output ONLY deltas. Update state IMMEDIATELY when events occur.</rule>
  <rule>HIDDEN: GM sees all \`hidden\` fields. \`unlocked\` = player knows. Reveal only through investigation.</rule>
  <rule>ICONS: Generate emoji \`icon\` for every entity.</rule>
</core_rules>
`;
}
