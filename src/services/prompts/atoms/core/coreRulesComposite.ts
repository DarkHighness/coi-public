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

import type { Atom } from "../types";
import { defineAtom } from "../../trace/runtime";
import { ontologicalPriorityAtom } from "./glossary";
import { worldConsistency } from "./worldConsistency";
import { consequences } from "./consequences";
import { maliceAndAntagonism } from "./maliceAndAntagonism";
import { humanityAndHope } from "./humanityAndHope";
import { livingWorld } from "./livingWorld";
import { informationRevelation } from "./informationRevelation";

export interface CoreRulesInput {}

/**
 * Full version of core rules - combines all world operation atoms
 */
export const coreRulesComposite: Atom<CoreRulesInput | void> = defineAtom(
  {
    atomId: "atoms/core/coreRulesComposite#coreRulesComposite",
    source: "atoms/core/coreRulesComposite.ts",
    exportName: "coreRulesComposite",
  },
  (input, trace) => {
    void input;

    return `
<core_rules>
${trace.record(ontologicalPriorityAtom)}

${trace.record(worldConsistency)}
${trace.record(consequences)}
${trace.record(maliceAndAntagonism)}
${trace.record(humanityAndHope)}
${trace.record(livingWorld)}
${trace.record(informationRevelation)}
</core_rules>
`;
  },
);

/**
 * Primer version of core rules (minimal, system-prompt safe)
 */
export const coreRulesPrimer: Atom<void> = defineAtom(
  {
    atomId: "atoms/core/coreRulesComposite#coreRulesPrimer",
    source: "atoms/core/coreRulesComposite.ts",
    exportName: "coreRulesPrimer",
  },
  () => `
<core_rules>
  <rule>WORLD CONSISTENCY: Adhere strictly to genre (realistic/fantasy/sci-fi). No crossover elements.</rule>
  <rule>CONSEQUENCES: Every action has reactions. The world never forgets.</rule>
  <rule>NPC: Actors use \`visible\` for surface signals and \`hidden\` for true motives. True affinity is stored ONLY in \`relations[].hidden.affinity\` and is hidden by default.</rule>
  <rule>STATE: Output ONLY deltas. Update state IMMEDIATELY when events occur.</rule>
  <rule>HIDDEN: GM sees all \`hidden\` fields. \`unlocked\` = player knows. Reveal only through investigation.</rule>
  <rule>ICONS: Generate emoji \`icon\` for every entity.</rule>
</core_rules>
`,
);
