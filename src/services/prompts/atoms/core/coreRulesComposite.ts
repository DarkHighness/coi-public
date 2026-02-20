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
export const coreRulesDescription: Atom<void> = defineAtom(
  {
    atomId: "atoms/core/coreRulesComposite#coreRulesDescription",
    source: "atoms/core/coreRulesComposite.ts",
    exportName: "coreRulesDescription",
  },
  () => `
<core_rules>
  <rule>**CONSISTENCY IS CREATIVITY**: Adhere to genre boundaries. The constraints of the world are the source of its drama — a fantasy world that suddenly has gunpowder, or a noir that allows magic, has no tension. Consistency produces surprise; convenience kills it.</rule>
  <rule>**CONSEQUENCES ARE THE STORY**: Every action leaves marks — on skin, on paper, on reputation. The world never forgets, and neither should you. A story where choices don't matter is not a story.</rule>
  <rule>**DUAL NATURE OF PERSONS**: Actors use \`visible\` for surface signals and \`hidden\` for true motives. True affinity lives ONLY in \`relations[].hidden.affinity\`, hidden by default. People are layered — what they show and what they are rarely align.</rule>
  <rule>**STATE IS PHYSICS**: Output ONLY deltas. Update state IMMEDIATELY when events occur. If you narrate it, track it. If you track it, it happened. The gap between narrative and state is a lie the player will catch.</rule>
  <rule>**KNOWLEDGE IS EARNED**: GM sees all \`hidden\` fields. \`unlocked\` = the observer actor knows. Reveal only through investigation, evidence, confession, or direct observation. Suspicion is not proof. Rumor is not truth.</rule>
  <rule>**ICONS**: Generate emoji \`icon\` for every entity.</rule>

  For full world simulation rules (consequences, living world, antagonism, information revelation), read \`gm/core-rules\` skill.
</core_rules>
`,
);
