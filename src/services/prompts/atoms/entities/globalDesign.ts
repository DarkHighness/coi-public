/**
 * ============================================================================
 * Entity Design Atom: Global State Design Context
 * ============================================================================
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const globalDesign: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/globalDesign#globalDesign",
    source: "atoms/entities/globalDesign.ts",
    exportName: "globalDesign",
  },
  () => `
<game_system_context>
**GLOBAL DESIGN**: Global state is the world-wide context envelope.
- Define invariant anchors (time basis, calendar, atmosphere, macro-pressure).
- Define mutable global dimensions (weather fronts, crisis state, region-wide events).
- Define how global state constrains local scenes and movement.
- Define visibility policy (what is publicly known vs hidden systemic state).
- Define update cadence and trigger classes for global changes.
</game_system_context>
`,
);

export const globalDesignDescription: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/globalDesign#globalDesignDescription",
    source: "atoms/entities/globalDesign.ts",
    exportName: "globalDesignDescription",
  },
  () => `
<game_system_context>
**GLOBAL DESIGN**: Invariants + mutable world context with clear update cadence.
</game_system_context>
`,
);

export const globalDesignSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/entities/globalDesign#globalDesignSkill",
    source: "atoms/entities/globalDesign.ts",
    exportName: "globalDesignSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(globalDesign),
    quickStart: `
1. Define invariant global anchors
2. Define mutable global dimensions
3. Define local-scene impact rules
4. Define update cadence and visibility
`.trim(),
    checklist: [
      "Global invariants explicitly listed?",
      "Mutable dimensions and triggers defined?",
      "Local impact pathways clear?",
      "Visibility and cadence policies defined?",
    ],
  }),
);

export const globalLogic: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/globalDesign#globalLogic",
    source: "atoms/entities/globalDesign.ts",
    exportName: "globalLogic",
  },
  () => `
<game_system_context>
**GLOBAL LOGIC**: Global state updates are event-driven and consistency-checked.
- Advance time and atmosphere deterministically from turn cadence and events.
- Merge concurrent macro events with precedence and conflict rules.
- Trigger regional effects into locations, travel, economy, and faction behavior.
- Reject impossible global transitions without bridge events.
- Global updates emit downstream synchronization tasks for dependent entities.
</game_system_context>
`,
);

export const globalLogicDescription: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/globalDesign#globalLogicDescription",
    source: "atoms/entities/globalDesign.ts",
    exportName: "globalLogicDescription",
  },
  () => `
<game_system_context>
**GLOBAL LOGIC**: Deterministic macro updates with dependency-safe propagation.
</game_system_context>
`,
);

export const globalLogicSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/entities/globalDesign#globalLogicSkill",
    source: "atoms/entities/globalDesign.ts",
    exportName: "globalLogicSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(globalLogic),
    quickStart: `
1. Advance global clock and atmospheric state
2. Resolve concurrent macro-event precedence
3. Apply region-level effects to dependent systems
4. Validate transition consistency and propagate sync updates
`.trim(),
    checklist: [
      "Global clock/atmosphere advanced consistently?",
      "Concurrent event precedence resolved?",
      "Regional effects propagated to dependents?",
      "Transition consistency checks passed?",
    ],
  }),
);

export default globalDesign;
