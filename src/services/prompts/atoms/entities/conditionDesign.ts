/**
 * ============================================================================
 * Entity Design Atom: Condition Design Context
 * ============================================================================
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const conditionDesign: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/conditionDesign#conditionDesign",
    source: "atoms/entities/conditionDesign.ts",
    exportName: "conditionDesign",
  },
  () => `
<game_system_context>
**CONDITION DESIGN**: Conditions are temporary state pressures with narrative and mechanical weight.
- Define source vectors (injury, poison, stress, ritual, weather, social shock).
- Define symptom profile (visible signs, hidden progression, behavioral constraints).
- Define resolution routes (time, treatment, ritual, sacrifice, cost).
- Define interaction matrix with skills, traits, and attributes.
- Define escalation/failure thresholds if untreated.
</game_system_context>
`,
);

export const conditionDesignDescription: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/conditionDesign#conditionDesignDescription",
    source: "atoms/entities/conditionDesign.ts",
    exportName: "conditionDesignDescription",
  },
  () => `
<game_system_context>
**CONDITION DESIGN**: Source, symptoms, escalation, and recovery must be explicit.
</game_system_context>
`,
);

export const conditionDesignSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/entities/conditionDesign#conditionDesignSkill",
    source: "atoms/entities/conditionDesign.ts",
    exportName: "conditionDesignSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(conditionDesign),
    quickStart: `
1. Define source and symptom profile
2. Define escalation timeline
3. Define recovery pathways and costs
4. Define cross-entity interactions
`.trim(),
    checklist: [
      "Source and acquisition route defined?",
      "Symptoms include actionable constraints?",
      "Escalation threshold and timeline defined?",
      "Recovery routes and costs defined?",
    ],
  }),
);

export const conditionLogic: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/conditionDesign#conditionLogic",
    source: "atoms/entities/conditionDesign.ts",
    exportName: "conditionLogic",
  },
  () => `
<game_system_context>
**CONDITION LOGIC**: Conditions evolve by triggers, treatment, and time.
- Tick progression by time and context (rest, exertion, climate, stress).
- Apply effect modifiers to skill checks, movement, dialogue, and judgment.
- Support stacking/conflict rules between multiple conditions.
- Record remission, relapse, and chronic conversion where applicable.
- Propagate condition impacts to quest pace and social perception.
</game_system_context>
`,
);

export const conditionLogicDescription: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/conditionDesign#conditionLogicDescription",
    source: "atoms/entities/conditionDesign.ts",
    exportName: "conditionLogicDescription",
  },
  () => `
<game_system_context>
**CONDITION LOGIC**: Advance by time and triggers; resolve by treatment and cost.
</game_system_context>
`,
);

export const conditionLogicSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/entities/conditionDesign#conditionLogicSkill",
    source: "atoms/entities/conditionDesign.ts",
    exportName: "conditionLogicSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(conditionLogic),
    quickStart: `
1. Advance condition clock from context
2. Apply effect modifiers and stacking rules
3. Resolve treatment/remission outcomes
4. Propagate social/quest side effects
`.trim(),
    checklist: [
      "Condition clock advanced from concrete context?",
      "Modifiers applied consistently across actions?",
      "Stacking/conflict rules handled?",
      "Treatment and remission logic applied?",
    ],
  }),
);

export default conditionDesign;
