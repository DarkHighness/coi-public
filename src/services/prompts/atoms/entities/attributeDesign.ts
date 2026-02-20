/**
 * ============================================================================
 * Entity Design Atom: Attribute Design Context
 * ============================================================================
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const attributeDesign: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/attributeDesign#attributeDesign",
    source: "atoms/entities/attributeDesign.ts",
    exportName: "attributeDesign",
  },
  () => `
<game_system_context>
**ATTRIBUTE DESIGN**: Attributes are foundational capacities, not cosmetic numbers.
- Define semantic meaning for each attribute in this world context.
- Define high/low expression in behavior and scene outcomes.
- Define coupling with skills, conditions, and equipment.
- Define growth channels (training, trauma, ritual, technology, age).
- Define narrative readability so attribute deltas are visible in play.
</game_system_context>
`,
);

export const attributeDesignDescription: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/attributeDesign#attributeDesignDescription",
    source: "atoms/entities/attributeDesign.ts",
    exportName: "attributeDesignDescription",
  },
  () => `
<game_system_context>
**ATTRIBUTE DESIGN**: Define capacity semantics, coupling rules, and growth channels.
</game_system_context>
`,
);

export const attributeDesignSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/entities/attributeDesign#attributeDesignSkill",
    source: "atoms/entities/attributeDesign.ts",
    exportName: "attributeDesignSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(attributeDesign),
    quickStart: `
1. Define attribute semantic envelope
2. Define observable high/low expression
3. Define coupling with systems
4. Define growth and degradation channels
`.trim(),
    checklist: [
      "Attribute meaning is explicit and non-overlapping?",
      "Behavioral expression for high/low levels defined?",
      "Cross-system coupling defined?",
      "Growth/degradation channels defined?",
    ],
  }),
);

export const attributeLogic: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/attributeDesign#attributeLogic",
    source: "atoms/entities/attributeDesign.ts",
    exportName: "attributeLogic",
  },
  () => `
<game_system_context>
**ATTRIBUTE LOGIC**: Attribute values gate capability and reliability.
- Actions read attribute thresholds and produce partial/critical outcomes.
- Temporary modifiers from conditions/items stack with explicit caps.
- Long-term change uses bounded deltas and recovery windows.
- Overextension can induce penalties, injuries, or condition triggers.
- Attribute changes must re-evaluate dependent skill effectiveness.
</game_system_context>
`,
);

export const attributeLogicDescription: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/attributeDesign#attributeLogicDescription",
    source: "atoms/entities/attributeDesign.ts",
    exportName: "attributeLogicDescription",
  },
  () => `
<game_system_context>
**ATTRIBUTE LOGIC**: Thresholds, modifiers, and bounded long-term deltas.
</game_system_context>
`,
);

export const attributeLogicSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/entities/attributeDesign#attributeLogicSkill",
    source: "atoms/entities/attributeDesign.ts",
    exportName: "attributeLogicSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(attributeLogic),
    quickStart: `
1. Evaluate attribute thresholds for action
2. Apply temporary modifiers with caps
3. Resolve overextension and penalties
4. Recompute dependent skill outcomes
`.trim(),
    checklist: [
      "Threshold logic applied to action outcomes?",
      "Modifier stacking and caps enforced?",
      "Overextension penalties handled?",
      "Dependent skill effects recalculated?",
    ],
  }),
);

export default attributeDesign;
