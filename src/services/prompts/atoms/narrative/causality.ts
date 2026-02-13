/**
 * Narrative Atom: Narrative Causality
 * Content from conditional.ts
 */
import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const narrativeCausality: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/causality#narrativeCausality",
    source: "atoms/narrative/causality.ts",
    exportName: "narrativeCausality",
  },
  () => `
<narrative_causality>
  **COLD CAUSALITY**:
  - **No Moralizing**: The world does not care about "good" or "evil". If the player does something cruel, do not describe it with judgment, describe it with physics.
  - **Incomplete Information**: Do not explain *why* an NPC is reacting. Describe the *reaction* (e.g., "His eyes dart to the exit," NOT "He is nervous because he is lying"). Let the player deduce the motive.
  - **Delayed Consequences**: Not everything has an instant effect. Some actions plant seeds that rot silently before sprouting.
  - **Soldier's Resilience**: Characters with military or hardened backgrounds (Soldiers, Mercenaries) DO NOT break easily. They expect hardship. They do not whine about pain or insults. They endure.

  **MOMENTUM WITHIN REALISM**:
  - **Realism != Stagnation**: Real life is full of friction, but stories die without movement.
  - **The "Boring" Trap**: Do not describe a character staring at a wall for 3 paragraphs to be "realistic".
  - **Conflict is Constant**: Even in quiet moments, there is internal conflict, environmental pressure, or the ticking clock.
  - **Every Turn Moves**: If the physical position doesn't change, the *understanding* or *stakes* must change.
</narrative_causality>

<anti_repetition_protocol>
  **CRITICAL: NARRATIVE FRESHNESS - AVOID REPETITION**

  <core_principle>
    Each turn should feel FRESH and DISTINCT. The story must evolve organically without falling into loops of repetitive situations, dialogue, or plot beats.
  </core_principle>

  <forbidden_patterns>
    **DO NOT REPEAT** (unless intentionally designed as a time loop or recurring nightmare scenario):

    1. **Plot Events**:
       ❌ Same obstacle appearing multiple times (e.g., "bandits attack again", "another locked door")
       ❌ Identical quest structures recycled with different names
       ❌ The same dramatic reveal happening to different characters
       ✅ Vary challenges, introduce new complications, escalate stakes

    2. **Dialogue Patterns**:
       ❌ NPCs using the exact same phrases repeatedly ("Well, well, well...")
       ❌ The protagonist having the same inner monologue every danger
       ❌ Verbatim repetition of past conversations or information dumps
       ✅ Give each NPC distinct speech patterns, evolve character voices over time

    3. **Scene Structure**:
       ❌ Identical scene composition (e.g., always: enter room → observe → dialogue → leave)
       ❌ Reusing the same descriptive metaphors or imagery
       ❌ Repeating the same atmospheric beats (e.g., "ominous silence" every turn)
       ✅ Vary pacing, scene entry/exit methods, sensory focus (visual → auditory → tactile)

    4. **Character Actions**:
       ❌ NPCs reacting identically to different stimuli
       ❌ The player being offered the same type of choices repeatedly
       ❌ Every NPC "narrowing their eyes suspiciously" or "crossing their arms"
       ✅ Diverse body language, unexpected reactions, character growth
  </forbidden_patterns>

  <implementation_guidelines>
    **Before generating each turn, mentally check**:
    - "Have I used this exact plot device in the last 10 turns?"
    - "Would this dialogue feel fresh to someone reading chronologically?"
    - "Am I recycling descriptions or falling into a template?"

    **If the answer is YES to any → CHANGE IT**:
    - Introduce a new complication instead of repeating an old one
    - Have NPCs surprise the player with unexpected perspectives
    - Vary sentence structure, descriptive focus, and pacing

    **Exception - Intentional Repetition**:
    - Time loops (if explicitly designed into the narrative)
    - Ritualistic/ceremonial scenes (where repetition serves world-building)
    - Psychological horror (where repetition creates unease)
    → When using intentional repetition, make it OBVIOUS and purposeful
  </implementation_guidelines>

  <quality_benchmark>
    **GOLD STANDARD**: Every turn should feel like a NEW PAGE in a well-edited novel, not a rehash of previous content. The world evolves, characters develop, and the narrative progresses with organic variety.
  </quality_benchmark>
</anti_repetition_protocol>
`,
);

// ============================================================================
// Skill Version - Returns structured output for VFS multi-file generation
// ============================================================================

export const narrativeCausalitySkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/narrative/causality#narrativeCausalitySkill",
    source: "atoms/narrative/causality.ts",
    exportName: "narrativeCausalitySkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(narrativeCausality),

    quickStart: `
1. No moralizing - describe with physics, not judgment
2. Incomplete information - show reaction, not motive
3. Delayed consequences - seeds rot before sprouting
4. Every turn moves - position or understanding changes
5. Avoid repetition - fresh content every turn
`.trim(),

    checklist: [
      "Describing events without moral judgment?",
      "Showing reactions without explaining motives?",
      "Allowing delayed consequences to unfold naturally?",
      "Every turn advances position or understanding?",
      "Avoiding repetitive plot devices/dialogue/scenes?",
      "Hardened characters showing appropriate resilience?",
    ],

    examples: [
      {
        scenario: "No Moralizing",
        wrong: `"He cruelly struck the innocent child."
(Moral judgment embedded in description.)`,
        right: `"His fist connected. The child fell. Blood pooled."
(Physics, no judgment - let reader judge.)`,
      },
      {
        scenario: "Anti-Repetition",
        wrong: `Turn 5: "Bandits attack." Turn 12: "More bandits attack."
(Same challenge recycled.)`,
        right: `Turn 5: "Bandits." Turn 12: "The merchant's guards - recognizing you."
(Escalation with new complications.)`,
      },
    ],
  }),
);
