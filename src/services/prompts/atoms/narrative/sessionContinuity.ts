/**
 * ============================================================================
 * Narrative Atom: Session Continuity
 * ============================================================================
 *
 * 长期游戏的最大敌人是遗忘——不是玩家的遗忘，而是AI的遗忘。
 * 当对话窗口越来越长，上下文越来越远，保持世界的连续性就成了一场与熵的战争。
 * 这个 SKILL 是反熵工具箱。
 */

import type { SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const sessionContinuity = defineAtom(
  {
    atomId: "atoms/narrative/sessionContinuity#sessionContinuity",
    source: "atoms/narrative/sessionContinuity.ts",
    exportName: "sessionContinuity",
  },
  () => `
<rule name="SESSION_CONTINUITY">
  <core_principle>
    **THE WORLD MUST NOT FORGET**

    As sessions grow long, context windows compress, and summaries lose detail. The player notices when:
    - An NPC forgets a conversation from 10 turns ago
    - A wound healed without treatment
    - A promise made was never followed up
    - The weather changed without transition
    - A dead character is mentioned as alive

    These are not minor bugs. They are REALITY FRACTURES that destroy immersion.
    Your job is to prevent them by reading state before writing narrative.
  </core_principle>

  <anti_drift_protocol>
    **BEFORE RENDERING EACH TURN** (mandatory checks):

    1. **PROTAGONIST STATE CHECK**: Read protagonist conditions array. Are they wounded? Tired? Hungry? Carrying anything heavy? The body's state MUST appear in the narrative.
       - Wounded → movement limited, pain referenced
       - Exhausted → reactions slower, shorter patience
       - Hungry → distraction, food-seeking behavior
       - Carrying burden → slower, choices about what to drop

    2. **LOCATION CONSISTENCY**: Read current location file. What's the weather? Time of day? Who else is here?
       - If it was raining last turn, it's still raining unless time passed
       - If an NPC was present, they're still present unless they left (and their leaving should have been narrated)
       - If the door was locked, it's still locked

    3. **NPC RELATIONSHIP CHECK**: Before rendering NPC dialogue, read their \`hidden.impression\` and \`hidden.memories\`. Their tone MUST reflect accumulated history.
       - Positive history → warmer greeting, willingness to help, reference to shared past
       - Negative history → cold, suspicious, may refuse interaction, reference to grievance
       - Mixed history → ambivalent behavior, testing, guarded

    4. **TIMELINE CONSISTENCY**: What happened recently? Check the last 3-5 turns of narrative context.
       - Don't repeat information the protagonist already knows
       - Don't forget decisions made 2 turns ago
       - If the protagonist set something in motion, advance it
  </anti_drift_protocol>

  <long_session_strategies>
    **STRATEGIES FOR SESSIONS 20+ TURNS**:

    | Problem | Cause | Solution |
    |---------|-------|----------|
    | NPC amnesia | Context window compressed NPC interaction history | Read \`hidden.memories\` array before every NPC re-encounter; reference specific past events |
    | Wound disappears | Condition not checked before narrative render | ALWAYS check protagonist conditions at ORIENT phase; injured = narrate pain |
    | Plot thread dropped | Too many concurrent threads | Maintain max 3 active threads in \`plan.md\`; resolve or shelve others explicitly |
    | Tone drift | Early tone instructions compressed out of context | Re-read \`soul.md\` § Style Preferences at session start and every ~10 turns |
    | World inconsistency | Location/NPC state diverged from files | Read canonical state (VFS files) before narrating; files are truth, memory is fallible |
    | Repetitive prose | Same descriptions reused | Track adjectives/images used in \`soul.md\` § Evidence Log; rotate sensory anchors |

    **THREAD MANAGEMENT**:
    - **Active threads** (max 3): Currently in play, advancing every 1-3 turns
    - **Simmering threads** (max 5): Background pressure, surface every 5-10 turns via echo/ripple
    - **Dormant threads**: Resolved or shelved. Can be reactivated by player action or delayed consequence.
    - Update thread status in \`plan.md\` when threads move between categories.
  </long_session_strategies>

  <continuity_anchors>
    **ANCHORING TECHNIQUES** (use these to maintain coherence):

    1. **Callback phrases**: When an NPC references a past event, use a SPECIFIC detail from that event.
       ❌ "He remembers when you helped him."
       ✅ "He touches the scar on his forearm — the one you bandaged with your last clean cloth."

    2. **Environmental persistence**: Locations bear marks of player passage.
       ❌ The market looks the same as before.
       ✅ The market stall you overturned last week has been rebuilt — badly. The vendor sees you and his hand moves to the cudgel under the counter.

    3. **Consequence echoes**: Past actions ripple forward.
       ❌ Nothing has changed since you left.
       ✅ The price of bread has doubled. The baker mutters about "that incident at the granary." Your incident.

    4. **Physical continuity**: The protagonist's body is a record.
       ❌ You feel fine.
       ✅ Your ribs ache where the guard's boot landed two days ago. The bruise has yellowed at the edges. Breathing is easier, but sudden movements still catch.

    5. **Temporal markers**: Ground the passage of time in physical reality.
       ❌ Some time has passed.
       ✅ The candle has burned down to a stub. The tea is cold. Outside, the shadows have moved from one side of the courtyard to the other.
  </continuity_anchors>

  <recovery_from_inconsistency>
    **WHEN YOU NOTICE A CONTRADICTION** (it will happen):

    Do NOT retcon silently. Choose one of:
    1. **Incorporate**: Make the inconsistency diegetic. "Wait — you said she was in the north. But here she is." (NPC lied, or circumstances changed.)
    2. **Correct via soul.md**: Note the inconsistency in \`soul.md\` § Tool Usage Hints for future reference. Quietly align going forward.
    3. **Acknowledge via NPC**: Have an NPC notice the inconsistency if it's visible. "Didn't you say you'd never been here before? Then how did you know about the passage?"

    NEVER: pretend the inconsistency didn't happen while the player clearly noticed it.
  </recovery_from_inconsistency>
</rule>
`,
);

export const sessionContinuityDescription = defineAtom(
  {
    atomId: "atoms/narrative/sessionContinuity#sessionContinuityDescription",
    source: "atoms/narrative/sessionContinuity.ts",
    exportName: "sessionContinuityDescription",
  },
  () =>
    `
<continuity_primer>
**SESSION CONTINUITY**: Read protagonist conditions, location state, and NPC memories BEFORE rendering each turn. The body stays wounded, the weather stays wet, NPCs remember what you did. Max 3 active plot threads; surface simmering threads via echoes. When contradictions arise, incorporate them diegetically — never retcon silently.
</continuity_primer>
`.trim(),
);

export const sessionContinuitySkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/narrative/sessionContinuity#sessionContinuitySkill",
    source: "atoms/narrative/sessionContinuity.ts",
    exportName: "sessionContinuitySkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(sessionContinuity),
    quickStart: `
1. ORIENT: Check protagonist conditions (wounds, fatigue, hunger) — narrate them
2. Check location state (weather, time, present NPCs) — maintain consistency
3. Read NPC hidden.memories before dialogue — reference specific past events
4. Track max 3 active threads + 5 simmering in plan.md
5. Contradictions: incorporate diegetically, never silently retcon
`.trim(),
    checklist: [
      "Protagonist's physical state (wounds, fatigue) reflected in narrative?",
      "Location details consistent with last visit (weather, objects, NPCs)?",
      "NPC dialogue references specific past interactions (not generic)?",
      "Active plot threads ≤ 3; excess moved to simmering or dormant?",
      "Time passage grounded in physical markers (candle, shadows, seasons)?",
      "No wound/condition disappeared without treatment?",
      "Contradictions handled diegetically if noticed?",
    ],
    examples: [
      {
        scenario: "NPC remembers past interaction",
        wrong: `"The blacksmith greets you. 'What can I do for you?'" (amnesia — you saved his daughter 5 turns ago)`,
        right: `"The blacksmith sees you and stops mid-swing. The hammer stays raised for a beat too long.
'You,' he says. His voice is rough. 'I still owe you for my girl.'
He sets the hammer down carefully. 'Whatever you need. Cost is different for you.'"`,
      },
      {
        scenario: "Physical continuity across turns",
        wrong: `"You climb the wall easily." (you broke your hand 3 turns ago)`,
        right: `"You reach for the wall. Your hand closes — and the broken fingers scream.
You shift to your left hand. It's slower, clumsier. The wall is slick.
Three attempts. On the fourth, you hook your elbow over the edge and drag yourself up,
leaving a smear of blood on the stone."`,
      },
    ],
  }),
);
