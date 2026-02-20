/**
 * ============================================================================
 * Entity Design Atom: Trait Design Context
 * ============================================================================
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const traitDesign: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/traitDesign#traitDesign",
    source: "atoms/entities/traitDesign.ts",
    exportName: "traitDesign",
  },
  () => `
<game_system_context>
**TRAIT DESIGN**: Traits are persistent identity pressures, not temporary buffs.
- Define origin (innate, formative event, oath, culture, curse, training).
- Define expression pattern (how trait appears in behavior and decisions).
- Define upside/downside tradeoff (strength with vulnerability).
- Define social readability (who recognizes or misreads this trait).
- Define transformation conditions (reinforcement, fracture, inversion).
</game_system_context>
`,
);

export const traitDesignDescription: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/traitDesign#traitDesignDescription",
    source: "atoms/entities/traitDesign.ts",
    exportName: "traitDesignDescription",
  },
  () => `
<game_system_context>
**TRAIT DESIGN**: Persistent behavior pattern with tradeoffs and social consequences.
</game_system_context>
`,
);

export const traitDesignSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/entities/traitDesign#traitDesignSkill",
    source: "atoms/entities/traitDesign.ts",
    exportName: "traitDesignSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(traitDesign),
    quickStart: `
1. Define origin and expression pattern
2. Define benefit-cost asymmetry
3. Define social readability effects
4. Define transformation triggers
`.trim(),
    checklist: [
      "Origin of trait is concrete?",
      "Behavioral expression is observable?",
      "Upside/downside tradeoff defined?",
      "Transformation triggers defined?",
    ],
  }),
);

export const traitLogic: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/traitDesign#traitLogic",
    source: "atoms/entities/traitDesign.ts",
    exportName: "traitLogic",
  },
  () => `
<game_system_context>
**TRAIT LOGIC**: Traits bias decisions and outcomes over long horizons.
- Traits modify option preference and risk appetite, not deterministic scripts.
- Trait pressure increases in aligned contexts and weakens in contradictory contexts.
- Trait conflicts produce friction events (hesitation, overreach, self-sabotage).
- Trait evolution requires repeated evidence, not one-off events.
- Trait state updates ripple into reputation, relationships, and quest outcomes.
</game_system_context>
`,
);

export const traitLogicDescription: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/traitDesign#traitLogicDescription",
    source: "atoms/entities/traitDesign.ts",
    exportName: "traitLogicDescription",
  },
  () => `
<game_system_context>
**TRAIT LOGIC**: Trait pressure is contextual, cumulative, and evidence-driven.
</game_system_context>
`,
);

export const traitLogicSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/entities/traitDesign#traitLogicSkill",
    source: "atoms/entities/traitDesign.ts",
    exportName: "traitLogicSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(traitLogic),
    quickStart: `
1. Detect context alignment for active traits
2. Apply preference/risk modifiers
3. Resolve trait conflicts and friction events
4. Evaluate cumulative trait evolution
`.trim(),
    checklist: [
      "Trait context alignment detected?",
      "Decision bias applied without removing agency?",
      "Trait conflicts produced coherent friction?",
      "Evolution changes backed by repeated evidence?",
    ],
  }),
);

export default traitDesign;
