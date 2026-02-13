/**
 * ============================================================================
 * Entity Design Atom: Timeline Design Context
 * ============================================================================
 *
 * Timeline 设计上下文 - 用于 StoryOutline Phase 9。
 * 定义创建 Timeline 时的设计哲学和质量要求。
 */

import type { Atom } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

/**
 * Timeline 设计上下文 - 完整版
 */
export const timelineDesign: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/timelineDesign#timelineDesign",
    source: "atoms/entities/timelineDesign.ts",
    exportName: "timelineDesign",
  },
  () => `
<game_system_context>
**TIMELINE DESIGN FOR REALITY RENDERING ENGINE:**

Timeline events are the BACKBONE of your world. They create cause-and-effect chains.

**CAUSAL CHAIN EXAMPLES:**
✅ GOOD: Event A → Event B → Event C
- "Year 1: Drought (world_event) → Year 2: Famine riots (consequence) → Year 3: King executes rioters (npc_action) → Year 5: Rioters' children form rebel faction (consequence)"

❌ BAD: Random disconnected events
- "Year 1: A war happened. Year 50: The protagonist was born. Year 100: A prophecy was made."

**VISIBLE vs HIDDEN EXAMPLES:**
✅ GOOD:
- visible.description: "The Hero of the Northern War died defending the capital."
- hidden.trueDescription: "He was assassinated by his own second-in-command, who feared he would expose the kingdom's use of blood magic."

**OFF-SCREEN PROGRESSION:**
While the protagonist exists, the world continues:
- The war in the East escalates—each turn, casualties rise
- The merchant's debt comes due—he'll be ruined by week's end
- The baby born in Chapter 1 will be 5 years old by Chapter 5

**INCITING INCIDENT:**
The LAST timeline event should set up why the story begins NOW:
- "Yesterday: The letter arrives. Your brother is dead. You must claim his inheritance—or lose everything."

<timeline_quality>
  **CAUSAL CHAIN REQUIREMENT**: Each event's hidden.trueDescription MUST include:
  - Cause → Action → Effect chain
  - Example: "Famine → Desperation → Demon summoning → Blood pact"

  **TEMPORAL ORDERING**:
  - Oldest events first, newest last
  - Include at least one "ancient" event (100+ years) and one "recent" event (days/weeks)
  - Events should BUILD on each other causally

  **VISIBLE/HIDDEN CONTRADICTION**:
  - Public accounts should be WRONG but BELIEVABLE
  - Hidden truths should EXPLAIN the contradictions
</timeline_quality>

**THEMATIC RESONANCE**:
- The timeline should echo the story's core themes. If the theme is "betrayal," timeline events should contain betrayals at different scales.
- The protagonist's origin story should MIRROR a larger world event (microcosm/macrocosm).
- The final timeline event should set up the INCITING INCIDENT of the story.
</game_system_context>
`,
);

/**
 * Timeline 设计上下文 - 精简版
 */
export const timelineDesignPrimer: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/timelineDesign#timelineDesignPrimer",
    source: "atoms/entities/timelineDesign.ts",
    exportName: "timelineDesignPrimer",
  },
  () => `
<game_system_context>
**TIMELINE DESIGN**: Events create cause-and-effect chains.
- Causal chain (Event A → B → C)
- Visible vs hidden contradiction
- Off-screen progression
- Inciting incident (why story begins NOW)
- Thematic resonance
</game_system_context>
`,
);

export default timelineDesign;
