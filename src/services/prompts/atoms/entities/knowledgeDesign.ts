/**
 * ============================================================================
 * Entity Design Atom: Knowledge Design Context
 * ============================================================================
 *
 * Knowledge 设计上下文 - 用于 StoryOutline Phase 8。
 * 定义创建 Knowledge 时的设计哲学和质量要求。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

/**
 * Knowledge 设计上下文 - 完整版
 */
export const knowledgeDesign: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/knowledgeDesign#knowledgeDesign",
    source: "atoms/entities/knowledgeDesign.ts",
    exportName: "knowledgeDesign",
  },
  () => `
<game_system_context>
**KNOWLEDGE DESIGN FOR REALITY RENDERING ENGINE:**

Knowledge entries are what the WORLD believes. They are often WRONG.

**VISIBLE vs HIDDEN EXAMPLES:**
✅ GOOD:
- visible.description: "The Great Flood was divine punishment for the sins of the Old Kingdom."
- hidden.fullTruth: "The Flood was caused by a failed magical experiment. The 'sins' story was propaganda to hide the Mage Council's responsibility."

❌ BAD:
- visible.description: "The kingdom has a history."
- hidden.fullTruth: "It's more complicated."

**MISCONCEPTIONS FIELD:**
What do people WRONGLY believe?
- "Everyone thinks the King died of illness; he was poisoned by his own son."
- "The common folk believe iron wards off spirits; it only works if forged during an eclipse."
- "Merchants claim the Eastern Road is safe; bandits pay them to say so."

**FORESHADOWING:**
Hint at revelations the protagonist will discover later:
- A legend about a "sleeping dragon" that matches the description of a location from Phase 3
- A prophecy that uses imagery from the protagonist's coreTrauma
- A historical figure whose description matches a "dead" NPC

<quality_guidelines>
  - Knowledge entries should CONTRADICT each other between visible and hidden layers
  - Public knowledge should be PLAUSIBLE but WRONG
  - Hidden truth should EXPLAIN the visible layer's mistakes
  - Each entry should connect to at least one other story element (NPC, location, quest)
</quality_guidelines>
</game_system_context>
`,
);

/**
 * Knowledge design primer (system-prompt safe).
 */
export const knowledgeDesignDescription: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/knowledgeDesign#knowledgeDesignDescription",
    source: "atoms/entities/knowledgeDesign.ts",
    exportName: "knowledgeDesignDescription",
  },
  () => `
<game_system_context>
**KNOWLEDGE DESIGN**: Knowledge is what the world believes (often wrong).
- Visible vs hidden contradiction
- Misconceptions (what people wrongly believe)
- Foreshadowing (hints at future revelations)
- Connect to other story elements
</game_system_context>
`,
);

export default knowledgeDesign;

// ============================================================================
// Skill Version - Returns structured output for VFS multi-file generation
// ============================================================================

export const knowledgeDesignSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/entities/knowledgeDesign#knowledgeDesignSkill",
    source: "atoms/entities/knowledgeDesign.ts",
    exportName: "knowledgeDesignSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(knowledgeDesign),
    quickStart: `
1. Define visible belief and hidden truth contradiction
2. Add misconception mechanics and propagation vectors
3. Connect entry to at least one NPC/location/quest
4. Plant foreshadowing that can be verified later
`.trim(),
    checklist: [
      "Visible layer plausible but incomplete/wrong?",
      "Hidden layer concretely explains visible error?",
      "Misconception has source and spread mechanism?",
      "Entry is linked to at least one other entity?",
      "Foreshadowing hook can be paid off later?",
    ],
  }),
);

// ============================================================================
// Knowledge Logic - belief propagation, verification, and contradiction rules
// ============================================================================

export const knowledgeLogic: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/knowledgeDesign#knowledgeLogic",
    source: "atoms/entities/knowledgeDesign.ts",
    exportName: "knowledgeLogic",
  },
  () => `
<game_system_context>
**KNOWLEDGE LOGIC**: Information is a contested, evolving system.
- Beliefs spread through channels (rumor, records, institutions, propaganda).
- Confidence levels change with evidence, authority, and contradiction pressure.
- Contradictory knowledge can coexist by audience, class, faction, or location.
- Verification has cost (time, risk, access), and failed verification can mislead.
- Knowledge changes must ripple into quests, faction moves, and timeline interpretation.
</game_system_context>
`,
);

export const knowledgeLogicDescription: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/knowledgeDesign#knowledgeLogicDescription",
    source: "atoms/entities/knowledgeDesign.ts",
    exportName: "knowledgeLogicDescription",
  },
  () => `
<game_system_context>
**KNOWLEDGE LOGIC**: Model spread, confidence, and verification cost.
- Who believes what and why
- How evidence updates confidence
- How contradictions persist by audience
</game_system_context>
`,
);

export const knowledgeLogicSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/entities/knowledgeDesign#knowledgeLogicSkill",
    source: "atoms/entities/knowledgeDesign.ts",
    exportName: "knowledgeLogicSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(knowledgeLogic),
    quickStart: `
1. Identify active knowledge carriers and channels
2. Apply evidence/confidence update
3. Resolve audience-specific contradictions
4. Propagate downstream effects to quest/faction/timeline state
`.trim(),
    checklist: [
      "Knowledge update tied to channel and source?",
      "Confidence shifts justified by evidence quality?",
      "Audience segmentation handled (who knows/believes)?",
      "Verification cost or risk represented?",
      "Downstream entity impacts applied?",
    ],
  }),
);
