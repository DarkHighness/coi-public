/**
 * ============================================================================
 * Narrative Atom: Emotional Arc (情感弧线)
 * ============================================================================
 *
 * Macro-pacing across many turns. The rhythm that prevents both
 * monotony and exhaustion. Emotional temperature tracking,
 * breathing room, escalation curves, and the sawtooth pattern.
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const emotionalArcDescription: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/emotionalArc#emotionalArcDescription",
    source: "atoms/narrative/emotionalArc.ts",
    exportName: "emotionalArcDescription",
  },
  () => `
<emotional_arc>
  **MACRO-PACING: EMOTIONAL TEMPERATURE ACROSS TURNS**:
  - Track emotional temperature. Sustained high = noise. Sustained low = boredom.
  - After 3-4 high-intensity turns, provide breathing room (1-2 turns of different pace).
  - Sawtooth pattern: gradual build, sharp peak, quick drop, breathe, build again. Each peak slightly higher.
  - Breathing room is NOT "nothing happens." It is aftermath, processing, quiet character moments, seeds for next arc.
  - The plateau trap: if intensity hasn't changed in 3+ turns, something must shift.
</emotional_arc>
`,
);

export const emotionalArc: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/emotionalArc#emotionalArc",
    source: "atoms/narrative/emotionalArc.ts",
    exportName: "emotionalArc",
  },
  () => `
<rule name="EMOTIONAL_ARC">
  **THE MACRO-RHYTHM OF FEELING**:

  Single-turn writing quality means nothing if the emotional shape across 20 turns
  is a flat line — whether that line is flat-high (exhausting) or flat-low (boring).
  The GM must think in arcs, not just moments.

  <temperature_model>
    **EMOTIONAL TEMPERATURE**:

    Think of each turn's emotional intensity as a temperature — not a literal number,
    but a felt sense ranging from "frozen stillness" to "white heat."

    **THE SAWTOOTH PATTERN**:
    Good pacing looks like a sawtooth wave, not a sine wave:
    - Gradual build (tension accumulates across 2-4 turns)
    - Sharp peak (the crisis, the reveal, the confrontation)
    - Quick drop (immediate aftermath — shock, silence, cost)
    - Breathing room (1-2 turns of different pace)
    - Gradual build again — each cycle's peak slightly higher than the last

    **THE PLATEAU TRAP**:
    If emotional intensity hasn't meaningfully changed in 3+ consecutive turns,
    something is wrong. The player has adapted. The temperature has become room temperature.
    - 3 turns of combat → the combat must escalate, shift terrain, or end
    - 3 turns of tension → something must break, release, or transform
    - 3 turns of calm → a thread must pull, a seed must sprout, a knock must come
    This is not about forcing action. It is about preventing emotional flatline.

    **THE VALLEY TRAP**:
    Breathing room is essential, but valleys should be shorter than peaks.
    2-3 turns of low intensity maximum before a new thread pulls upward.
    The valley is a rest stop, not a destination.

    **THE NOISE TRAP**:
    Sustained high intensity is not exciting — it is exhausting.
    After 3-4 turns of high intensity, the player is numb.
    The screaming becomes background noise. The danger becomes routine.
    The GM MUST provide a valley. Not because the story demands it,
    but because the human reading it needs to breathe.
  </temperature_model>

  <four_act_shape>
    **THE EMOTIONAL SHAPE OF A LONG GAME**:

    These are not prescriptive act boundaries. The player drives.
    But the GM should be aware of where the emotional arc "wants" to go,
    and use that awareness to create satisfying rhythm.

    **ACT I — ORIENTATION + FIRST WOUND** (early game):
    Temperature starts cool. The player is learning the world.
    But orientation alone is boring — the first real hit should come early.
    Not a catastrophe. A wound. Something that says: this world has teeth.
    - The NPC who isn't what they seemed
    - The rule that turns out to be enforced
    - The price that turns out to be real
    The first wound calibrates expectations for everything that follows.

    **ACT II — THE ESCALATING SAWTOOTH** (mid game):
    The core of the experience. Multiple sawtooth cycles, each building higher.
    This is where the game lives. Key patterns:
    - **False victories**: the problem solved that creates a bigger problem
    - **Shifting alliances**: the ally who becomes complicated, the enemy who becomes useful
    - **The midpoint reversal**: somewhere in the middle, the player's understanding
      of the situation should fundamentally change. What they thought was the problem
      isn't. What they thought was the solution can't work. The ground shifts.
    - **Escalation across cycles**: each sawtooth peak should raise the stakes
      in at least one dimension (scope, intimacy, or irreversibility)

    **ACT III — THE CRUCIBLE** (late-mid game):
    Highest sustained temperature. The convergence of threads.
    But even here — ESPECIALLY here — breathing room between crises.
    The darkest moment should be followed by the quietest.
    The silence after the worst thing is where the player feels it most.

    **ACT IV — RESOLUTION + AFTERMATH** (late game):
    Temperature can go anywhere. The story earns its ending.
    But aftermath matters. Don't end on the climax.
    Show what the world looks like after. Show what the protagonist has become.
    The last turn should be quieter than the second-to-last.
    Let the player sit with what happened.
  </four_act_shape>

  <breathing_room>
    **THE ART OF THE VALLEY**:

    After a major crisis, the next 1-2 turns should offer a DIFFERENT KIND of experience.
    Not "nothing happens." Not filler. A change of register.

    **WHAT BREATHING ROOM LOOKS LIKE**:
    - **Aftermath**: The world reacts to what just happened. Smoke rises. People count losses.
      The NPC who was brave during the crisis is now shaking. The one who froze is now angry.
    - **Processing**: Characters (NPCs, not the protagonist — no mind-reading) process the event.
      The conversation by the fire. The argument about what went wrong. The silence between people
      who survived something together.
    - **Quiet revelation**: A detail noticed only now that the adrenaline has faded.
      The wound that's worse than it looked. The letter in the dead man's pocket.
      The fact that someone is missing and no one noticed until now.
    - **Seeds**: Gently plant the next arc. Not forced. A rumor overheard. A stranger arriving.
      A letter delivered. The seed should feel organic, not like a quest notification.

    ❌ BAD: "After the battle, another enemy appears."
    (No breathing room. The player is numb.)

    ❌ BAD: "The next day passes uneventfully. Nothing happens."
    (Empty valley. Boring. Wasted turn.)

    ✅ GOOD: "The morning after. Smoke still rises from the eastern quarter.
       A child sits on the steps of what used to be a bakery, holding a cat.
       The cat is the only thing that isn't covered in ash.
       The blacksmith is already working — the sound of his hammer
       is the first normal thing you've heard in three days."

    ✅ GOOD: "The inn is quiet. Too quiet. The barkeep pours without being asked.
       In the corner, the mercenary who fought beside you is staring at her hands.
       She hasn't spoken since the bridge. The fire crackles.
       Someone should say something. No one does."

    **EMOTION THROUGH OBJECTS IN BREATHING ROOM**:
    Breathing room is where small, unmarked details carry emotional weight:
    - The letter someone started writing but never sent (still on the table, pen beside it)
    - The way someone arranges flowers on a grave — too precisely, like they've done this before
    - Scribbles on scratch paper found in a pocket
    - A diary entry that stops mid-sentence, the pen still on the page

    **LITERARY ALLUSION IN QUIET MOMENTS**:
    Characters may leave notes, mutter phrases, or write in journals using adapted classical expressions:
    - A note left behind echoing a poem: "只要想起一生中后悔的事" (Whenever I think of regrets)
    - Words muttered under breath that sound like they're from somewhere else
    - Graffiti on a wall, half-erased, that feels like it means more than it says
    These should feel discovered, not placed. The player finds them in the aftermath.

    **THE FALSE CALM**:
    Sometimes breathing room is a setup. The quiet that feels wrong.
    The peace that has teeth. The valley that is actually a trap.
    Use sparingly — every 3rd or 4th valley at most.
    If every calm moment is a trap, the player never rests, and you're back to the noise trap.
  </breathing_room>

  <escalation_curves>
    **HOW STAKES GROW**:

    Within an act, each crisis should raise the stakes in at least one dimension:

    **SCOPE**: How many people are affected?
    personal → local → regional → existential
    (My problem → our town's problem → the kingdom's problem → everyone's problem)

    **INTIMACY**: How close is the threat to what the protagonist cares about?
    stranger → acquaintance → ally → loved one
    (A stranger dies → a merchant you know is threatened → your companion is captured → the person you'd die for is in danger)

    **IRREVERSIBILITY**: Can this be undone?
    recoverable → costly → permanent → defining
    (Lost money → lost reputation → lost limb → lost identity)

    **THE POWER OF ASYMMETRIC ESCALATION**:
    The most effective pattern is to escalate ONE dimension while holding the others steady:
    - Escalate intimacy while keeping scope small = personal drama that cuts deep
    - Escalate scope while keeping it impersonal = epic sweep that feels vast
    - Escalate irreversibility while keeping scope personal = the choice that changes everything

    When BOTH scope and intimacy escalate simultaneously, that is the climax.
    Save it. Don't spend it early.
  </escalation_curves>

  <anti_patterns>
    **WHAT NOT TO DO**:

    - **"Everything is epic"**: If every turn is a 10/10, nothing is.
      The player's emotional range compresses. A dragon attack should feel different
      from a bar fight. If they don't, you've been running too hot for too long.

    - **"Relentless grimdark"**: Darkness without breathing room becomes comedy.
      The player starts laughing at the horror because they've run out of other responses.
      Darkness needs light to be dark. (Cross-reference: narrativeContrast)

    - **"The reset button"**: After a major event, the world should feel DIFFERENT.
      Not "back to normal." The tavern has fewer patrons. The guard rotation has changed.
      The NPC who used to joke doesn't joke anymore. If the world resets, the event didn't matter.

    - **"Emotional whiplash"**: Don't jump from funeral to comedy in one paragraph.
      Unless that IS the point — the inappropriate laugh at the worst moment,
      the absurdity that breaks through grief. But that must be earned and intentional,
      not accidental tonal inconsistency.

    - **"The endless middle"**: If the sawtooth pattern has been running for 20+ turns
      without a fundamental shift in the player's understanding or situation,
      the story is treading water. Something structural must change.
  </anti_patterns>
</rule>
`,
);

export default emotionalArc;

// ============================================================================
// Skill Version - Returns structured output for VFS multi-file generation
// ============================================================================

export const emotionalArcSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/narrative/emotionalArc#emotionalArcSkill",
    source: "atoms/narrative/emotionalArc.ts",
    exportName: "emotionalArcSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(emotionalArc),

    quickStart: `
1. Assess current emotional temperature (how intense have the last 3 turns been?)
2. If 3+ turns at same intensity → shift (escalate, release, or transform)
3. After a peak → provide 1-2 turns of breathing room (aftermath, not emptiness)
4. Plant seeds for next arc during valleys
5. Escalate at least one dimension per cycle (scope, intimacy, or irreversibility)
`.trim(),

    checklist: [
      "Emotional intensity has changed in the last 3 turns?",
      "After high-intensity sequence, breathing room provided?",
      "Breathing room contains aftermath/processing, not emptiness?",
      "Stakes escalating across cycles (scope, intimacy, or irreversibility)?",
      "Not every valley is a trap (player gets genuine rest)?",
      "World shows change after major events (no reset button)?",
      "Peaks and valleys alternate (sawtooth, not flatline)?",
    ],

    examples: [
      {
        scenario: "Breathing Room",
        wrong: `"After the battle, another enemy appears."
(No valley. Player is numb. Noise trap.)`,
        right: `"The morning after. Smoke still rises. A child sits on the steps
of what used to be a bakery, holding a cat.
The cat is the only thing that isn't covered in ash."
(Aftermath. Different register. Seeds for next arc.)`,
      },
      {
        scenario: "The Plateau Trap",
        wrong: `Turn 5: Tense negotiation. Turn 6: Tense standoff. Turn 7: Tense waiting.
(Same intensity for 3 turns. Player has adapted. Flatline.)`,
        right: `Turn 5: Tense negotiation. Turn 6: The deal breaks — Loss (sharp peak).
Turn 7: Quiet aftermath — counting what's left (valley).
(Sawtooth: build, peak, drop, breathe.)`,
      },
    ],
  }),
);
