/**
 * ============================================================================
 * Entity Design Atom: Causal Chain Design Context
 * ============================================================================
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const causalChainDesign: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/causalChainDesign#causalChainDesign",
    source: "atoms/entities/causalChainDesign.ts",
    exportName: "causalChainDesign",
  },
  () => `
<game_system_context>
**CAUSAL CHAIN DESIGN**: Causal chains encode why the world changed.
- Define root cause with actor motive, constraints, and trigger condition.
- Define intermediate links with observable evidence.
- Define branch points and uncertainty markers.
- Define delayed effects and activation context.
- Define closure criteria and unresolved residue.
</game_system_context>
`,
);

export const causalChainDesignDescription: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/causalChainDesign#causalChainDesignDescription",
    source: "atoms/entities/causalChainDesign.ts",
    exportName: "causalChainDesignDescription",
  },
  () => `
<game_system_context>
**CAUSAL CHAIN DESIGN**: Root cause, links, branch points, delayed effects.
</game_system_context>
`,
);

export const causalChainDesignSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/entities/causalChainDesign#causalChainDesignSkill",
    source: "atoms/entities/causalChainDesign.ts",
    exportName: "causalChainDesignSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(causalChainDesign),
    quickStart: `
1. Set root cause and trigger
2. Define evidence-bearing links
3. Model branch points and uncertainty
4. Define delayed activation and closure
`.trim(),
    checklist: [
      "Root cause includes motive + trigger?",
      "Each link has observable evidence?",
      "Branch points and uncertainty represented?",
      "Closure and unresolved residue defined?",
    ],
  }),
);

export const causalChainLogic: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/causalChainDesign#causalChainLogic",
    source: "atoms/entities/causalChainDesign.ts",
    exportName: "causalChainLogic",
  },
  () => `
<game_system_context>
**CAUSAL CHAIN LOGIC**: Chain evolution must remain dependency-safe.
- New evidence can confirm, weaken, or redirect existing links.
- Competing hypotheses can coexist with confidence weights.
- Trigger context decides when delayed links activate.
- Invalidated links require cascade reconciliation for descendants.
- Chain updates propagate to timeline events, quests, and knowledge confidence.
</game_system_context>
`,
);

export const causalChainLogicDescription: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/causalChainDesign#causalChainLogicDescription",
    source: "atoms/entities/causalChainDesign.ts",
    exportName: "causalChainLogicDescription",
  },
  () => `
<game_system_context>
**CAUSAL CHAIN LOGIC**: Confirm, redirect, or reconcile links with evidence.
</game_system_context>
`,
);

export const causalChainLogicSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/entities/causalChainDesign#causalChainLogicSkill",
    source: "atoms/entities/causalChainDesign.ts",
    exportName: "causalChainLogicSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(causalChainLogic),
    quickStart: `
1. Re-evaluate links with latest evidence
2. Update confidence/branch resolution
3. Reconcile invalidated descendants
4. Propagate consequences to dependent entities
`.trim(),
    checklist: [
      "Evidence update applied to relevant links?",
      "Confidence weights adjusted coherently?",
      "Invalidated links reconciled downstream?",
      "Dependent timeline/quest/knowledge updates applied?",
    ],
  }),
);

export default causalChainDesign;
