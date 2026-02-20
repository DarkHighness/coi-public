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

<schema_field_mapping>
**WHERE TO WRITE — Knowledge Schema Field Paths:**
| Design Concept | → Schema Field |
|---|---|
| What is commonly known | \`visible.description\` |
| Additional context | \`visible.details\` |
| Complete truth (GM-only) | \`hidden.fullTruth\` |
| Common false beliefs | \`hidden.misconceptions[]\` |
| Reserved for future reveal | \`hidden.toBeRevealed[]\` |
| Category | \`category\` (landscape, history, item, legend, etc.) |
| Cross-entity links | \`relatedTo[]\` (entity IDs) |
| Visibility scope | \`knownBy[]\` |
| Internal planning notes | \`notes\` — or entity \`notes.md\` for extended context |

**FALLBACK**: Confidence levels, spread models, verification costs, or contradiction resolution logic → write to knowledge \`notes\` or \`notes.md\`.
</schema_field_mapping>
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

**INFORMATION UNLOCK TIMING:**
- Knowledge becomes available through specific CHANNELS: direct observation, NPC testimony, documents, eavesdropping, investigation, deduction
- Each channel has a RELIABILITY profile: direct observation is hard to dispute; testimony is colored by motive; documents can be forged or incomplete
- DISCOVERY TIMING is narratively critical: a truth learned too early is confusing; too late is tragic; at the right moment, it is a revelation
- The protagonist should EARN knowledge through action, not receive it through exposition dumps

**MISCONCEPTION CLEARANCE:**
- Misconceptions are not simply "overwritten" — they are CONTESTED
- When new evidence contradicts a held belief, the character (and player) must weigh: Is the evidence trustworthy? Is the source reliable? Could the old belief still be correct?
- Clearance stages: DOUBT (evidence suggests the belief is wrong) → INVESTIGATION (active testing of the old belief) → CONFIRMATION (decisive evidence) → INTEGRATION (the new truth reshapes understanding)
- Some misconceptions are DEFENDED by powerful interests — clearing them has social and political cost
- Partially cleared misconceptions create nuanced states: "I'm not sure the king was murdered, but I'm not sure he wasn't, and that uncertainty changes how I deal with the prince"

**KNOWLEDGE PROPAGATION MODEL:**
- Information spreads through social networks with MUTATION: the original fact degrades or transforms as it passes through each intermediary
- Rumors are partial, biased, time-delayed versions of truths (or fictions)
- Institutional knowledge (guild records, church archives, government ledgers) is more stable but access-gated
- The protagonist can CHOOSE to propagate knowledge: sharing a secret with an NPC has consequences (alliance, betrayal, cascade)
- Knowledge can be WEAPONIZED: releasing information at the right moment to the right audience can destabilize factions, expose enemies, or force allies' hands

**KNOWLEDGE-ENTITY COUPLING:**
- Knowledge state changes propagate to: quest availability (you can't investigate what you don't know exists), NPC trust levels (sharing or withholding knowledge affects relationships), faction strategies (what a faction believes determines how it acts), timeline interpretation (new knowledge recontextualizes past events)
- A single knowledge revelation can cascade through the entire game state: learning the duke is the murderer changes EVERY interaction with the duke's faction, allies, and enemies
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
1. Identify knowledge channel and reliability (observation, testimony, document, rumor)
2. Apply evidence to confidence level: does this confirm, contradict, or complicate?
3. If contradicting held belief: progress through clearance stages (doubt → investigation → confirmation)
4. Resolve audience-specific contradictions (who believes the old version? who has updated?)
5. Propagate knowledge state changes to quests, NPCs, factions, timeline
6. If protagonist shares knowledge: compute social/political consequences
`.trim(),
    checklist: [
      "Knowledge source channel and reliability identified?",
      "Confidence shift justified by evidence quality?",
      "Misconception clearance is gradual (not instant overwrite)?",
      "Audience segmentation handled (different groups believe different versions)?",
      "Verification cost or risk represented (time, danger, access)?",
      "Knowledge propagation mutations modeled (rumor ≠ fact)?",
      "Downstream entity impacts applied (quest/NPC/faction/timeline)?",
      "Knowledge sharing consequences computed (alliance, betrayal, cascade)?",
    ],
  }),
);
