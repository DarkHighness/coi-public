/**
 * ============================================================================
 * Entity Design Atom: Skill Design Context
 * ============================================================================
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const skillDesign: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/skillDesign#skillDesign",
    source: "atoms/entities/skillDesign.ts",
    exportName: "skillDesign",
  },
  () => `
<game_system_context>
**SKILL DESIGN**: Skills are capabilities with context, limits, and growth paths.
- Define trigger context (when this skill can be applied).
- Define capability boundary (what it can and cannot solve).
- Define progression route (training, mentorship, field use, ritual, cost).
- Define synergy and tension with traits, attributes, conditions, and items.
- Define visible reputation impact when skill is demonstrated publicly.
</game_system_context>
`,
);

export const skillDesignDescription: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/skillDesign#skillDesignDescription",
    source: "atoms/entities/skillDesign.ts",
    exportName: "skillDesignDescription",
  },
  () => `
<game_system_context>
**SKILL DESIGN**: Skills need trigger context, boundaries, and progression.
</game_system_context>
`,
);

export const skillDesignSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/entities/skillDesign#skillDesignSkill",
    source: "atoms/entities/skillDesign.ts",
    exportName: "skillDesignSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(skillDesign),
    quickStart: `
1. Define trigger and scope
2. Define hard limits and failure modes
3. Define progression path and cost
4. Define cross-entity interactions
`.trim(),
    checklist: [
      "Trigger context defined?",
      "Capability limits explicit?",
      "Progression route and cost defined?",
      "Interactions with traits/attributes/conditions/items defined?",
    ],
  }),
);

export const skillLogic: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/skillDesign#skillLogic",
    source: "atoms/entities/skillDesign.ts",
    exportName: "skillLogic",
  },
  () => `
<game_system_context>
**SKILL LOGIC**: Skill activation and growth are evidence-bound.
- Activation requires preconditions (state, equipment, timing, knowledge).
- Outcome quality scales with attribute support and condition penalties.
- Usage creates traces (fatigue, witnesses, heat, cooldown, resource depletion).
- Growth is incremental and gated by repeated validated use or instruction.
- Regression/degradation can occur from trauma, disuse, or conflicting conditions.
</game_system_context>
`,
);

export const skillLogicDescription: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/skillDesign#skillLogicDescription",
    source: "atoms/entities/skillDesign.ts",
    exportName: "skillLogicDescription",
  },
  () => `
<game_system_context>
**SKILL LOGIC**: Activation, outcome, and growth must follow preconditions.
</game_system_context>
`,
);

export const skillLogicSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/entities/skillDesign#skillLogicSkill",
    source: "atoms/entities/skillDesign.ts",
    exportName: "skillLogicSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(skillLogic),
    quickStart: `
1. Validate activation preconditions
2. Compute modifiers (attributes/conditions/resources)
3. Apply outcomes and traces
4. Update progression or degradation state
`.trim(),
    checklist: [
      "Activation preconditions checked?",
      "Outcome modifiers applied consistently?",
      "Skill-use traces recorded?",
      "Progression/regression gates respected?",
    ],
  }),
);

export default skillDesign;
