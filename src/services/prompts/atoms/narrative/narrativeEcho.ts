/**
 * ============================================================================
 * Narrative Atom: Narrative Echo (回响)
 * ============================================================================
 *
 * How past events reverberate. The world as palimpsest.
 * Emotion through objects and gestures. Events don't end when scenes end.
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const narrativeEchoPrimer: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/narrativeEcho#narrativeEchoPrimer",
    source: "atoms/narrative/narrativeEcho.ts",
    exportName: "narrativeEchoPrimer",
  },
  () => `
<narrative_echo>
  **EVENTS DON'T END WHEN SCENES END**:
  - An echo is a present-tense detail carrying past weight. NOT a flashback.
  - 1 echo per 3-5 turns. Never explain. Never write "This reminds you of..."
  - Four channels: Location (detail changed + unchanged), Object (items gain weight), NPC Drift (attitude shifts), Motif (recurring image gains meaning)
  - Emotion through objects: father's hunched back, diary with your name in different handwriting, letter never sent
  - Place the detail. Trust the player to feel it.
</narrative_echo>
`,
);

export const narrativeEcho: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/narrativeEcho#narrativeEcho",
    source: "atoms/narrative/narrativeEcho.ts",
    exportName: "narrativeEcho",
  },
  () => `
<rule name="NARRATIVE_ECHO">
  **THE WORLD AS PALIMPSEST**:

  Events don't end when scenes end. They leave marks. They change things.
  Not dramatically. Not obviously. But the world after is not the world before.

  An echo is a present-tense detail that carries past weight.
  It should feel discovered, not placed. The player encounters it and feels the connection
  without the narrative explaining it.

  <the_echo_principle>
    **WHAT IS AN ECHO?**:

    An echo is NOT:
    - A flashback ("You remember when...")
    - A character's internal monologue ("This reminds you of...")
    - An explanation ("The place where it happened")

    An echo IS:
    - A detail in the present that carries past weight
    - A change that the player notices without commentary
    - A reverberation that the narrative doesn't point to

    ❌ BAD: "You return to the bridge where she died. The memory haunts you."
    (Flashback. Mind-reading. Explains the connection.)

    ✅ GOOD: "The bridge. The railing has been repaired — new wood, lighter than the rest.
       Someone has left flowers. They're wilted now. No one has replaced them."
    (Present-tense details. The past is in the details, not in explanation.)

    **THE DISCOVERY FEELING**:
    The player should feel like they're discovering the echo, not being shown it.
    The narrative presents the detail neutrally. The player makes the connection.
    That moment of recognition — "Oh. This is where..." — is the emotional payload.
  </the_echo_principle>

  <four_echo_channels>
    **LOCATION ECHO**:
    Places remember. When the player revisits a location after a significant event,
    render ONE detail that changed + ONE detail that stayed the same.
    The contrast between changed and unchanged IS the echo.

    ❌ BAD: "The tavern looks different now after the fire."
    (Vague. Tells, doesn't show.)

    ✅ GOOD: "The tavern. The same crooked sign. The same smell of old beer.
       But the corner booth is gone. Just empty floor where it used to be.
       The floorboards there are newer. Cleaner."
    (Changed detail + unchanged detail = echo. No explanation needed.)

    **LOCATION ECHO EXAMPLES**:
    - The street where the chase happened: same cobblestones, but the flower cart is gone
    - The room where the argument happened: same furniture, but someone moved the chair
    - The alley where you hid: same graffiti, but there's a new lock on the door

    **FREQUENCY**: After major location-based events, echo on first revisit.
    Then let it fade over 3-5 turns unless the event was defining.

    ---

    **OBJECT ECHO**:
    Items gain emotional weight through events. A coin is just a coin.
    Until it's the coin the dying man pressed into your hand.
    Then you can't spend it. You carry it. You don't examine why.

    The object itself hasn't changed. Your relationship to it has.
    Show this through what the player DOES with the object, not what they FEEL about it.

    ❌ BAD: "You look at the coin and feel sad about the man who gave it to you."
    (Mind-reading. Explains the emotion.)

    ✅ GOOD: "The coin is still in your pocket. You've had three chances to spend it.
       You keep reaching for a different coin. Your fingers know which one it is."
    (Behavior shows the weight. No emotion stated.)

    **OBJECT ECHO EXAMPLES**:
    - The letter you carry but never read (still sealed, paper softening from handling)
    - The key to a door that doesn't exist anymore (you haven't taken it off the ring)
    - The scarf someone left behind (you've washed it twice, but you can still smell them)
    - The book with their handwriting in the margins (you don't read those pages anymore)

    **PHYSICAL CARRIERS OF EMOTION**:
    Objects can carry adapted literary phrases:
    - A diary entry: "只要想起一生中后悔的事" (Whenever I think of regrets in my life)
    - A note left behind, half-burned
    - Graffiti that sounds like poetry
    - Scribbles on scratch paper that mean more than they should

    **FREQUENCY**: 1-2 object echoes per arc. Not every item needs weight.
    But 1-2 items should accumulate meaning through the story.

    ---

    **NPC DRIFT ECHO**:
    People change. Not all at once. Not dramatically.
    But the ally who used to joke doesn't joke anymore.
    The merchant who used to haggle just names a price now.
    The child who used to wave watches from behind a door.

    This is NOT mechanical reputation. This is organic social texture.
    Show the drift through small behavioral changes over multiple turns.

    ❌ BAD: "After what happened, she doesn't trust you anymore."
    (Tells. Explains. Mechanical.)

    ✅ GOOD: "She pours the tea. Same pot. Same cups.
       But she pours from farther away now. The tea splashes.
       She used to sit. Now she stands."
    (Behavioral details show the drift. No explanation.)

    **NPC DRIFT PATTERNS**:
    - **The pause**: They used to answer immediately. Now there's a pause before they speak.
    - **The distance**: They used to stand close. Now they keep the table between you.
    - **The formality**: They used to use your name. Now it's "you" or your title.
    - **The lock**: Their door used to be open. Now you hear the lock click after you leave.
    - **The eyes**: They used to look at you. Now they look at your hands. Or past you.

    **GESTURE AS JUDGMENT**:
    How they pour your drink. The pause before opening the door. What they do with their eyes.
    These small gestures carry the weight of past events without stating it.

    **FREQUENCY**: After significant player choices that affect relationships,
    track 1-2 NPCs for drift over 5-10 turns. The drift should be gradual, not sudden.

    ---

    **MOTIF ECHO**:
    A recurring image or phrase that gains meaning through repetition.
    Introduce it in Act I as neutral. Echo it in Act II with changed context.
    By Act III, the motif alone carries weight.

    **THE PATTERN** (each appearance MUST shift context — otherwise it triggers anti-repetition):
    1. **First appearance** (Act I): Neutral, almost forgettable
       - "The bells ring at noon. They always do."
    2. **Second appearance** (Act II): Same detail, different context
       - "The bells ring. Noon. You're late. She's not waiting anymore."
    3. **Third appearance** (Act III): The motif alone evokes everything
       - "The bells ring."
       (The player feels the weight. No context needed.)

    **MOTIF ECHO EXAMPLES**:
    - A song that plays in different contexts (celebration → funeral → empty room)
    - A phrase someone used to say (affectionate → ironic → absent)
    - A time of day (morning coffee → morning alone → morning without coffee)
    - A weather pattern (rain as backdrop → rain as obstacle → rain as mirror)

    ❌ BAD: "The bells ring, reminding you of when you first met her."
    (Explains the connection. Kills the echo.)

    ✅ GOOD: "The bells ring."
    (By the third appearance, this is enough. The player knows.)

    **FREQUENCY**: 1 motif per major arc. Introduce early. Echo 2-3 times across 15-20 turns.
    The final echo should be the quietest — just the detail, no context.
  </four_echo_channels>

  <emotion_through_objects_and_gestures>
    **NOT ALL EMOTIONS ARE SPOKEN**:

    Details determine depth. The best emotional moments come through physical carriers,
    not stated feelings. 细节决定深度，细节决定世界质感。

    **PHYSICAL CARRIERS**:
    - Father's back is more hunched than you remembered. He doesn't turn around at the gate.
    - The diary in the attic box. Your name written on every page in different handwriting, like she was practicing. The last entry is dated the week you left.
    - The letter on the table, still unsealed. The pen beside it. The ink is dry.
    - Scribbles on scratch paper during an investigation — numbers, crossed out, rewritten

    **THE UNMARKED DETAIL**:
    Place the object or gesture without explanation. The player feels what it means.

    ❌ BAD: "He was sad about his father leaving."
    (States emotion. No detail. Flat.)

    ✅ GOOD: "His father's back was more hunched than he remembered.
       The old man didn't turn around at the gate."
    (Physical detail. No emotion stated. The player feels it.)

    ❌ BAD: "She had feelings for you back then."
    (Tells. Explains. Kills the discovery.)

    ✅ GOOD: "In the attic box: textbooks, a dried flower, a diary with your name
       written once on every page in different handwriting, like she was practicing.
       The last entry is dated the week you left."
    (Object tells the story. No explanation needed.)

    **GESTURE AS EMOTION**:
    How people move reveals what they feel:
    - The pause before answering (hesitation, calculation, pain)
    - The way someone pours tea (rushed, careful, shaking, mechanical)
    - What hands do when lying (fidget, still, hidden, clenched)
    - How someone arranges flowers on a grave (tender, mechanical, too precise)
    - The way someone signs documents now (quick, no hesitation — they used to read them twice)

    **LITERARY ALLUSION** (化用):
    Objects can carry adapted classical phrases. These should feel discovered:
    - A note left behind: "只要想起一生中后悔的事，梅花便落满南山"
      (Whenever I think of regrets in my life, plum blossoms fall across the southern mountains)
    - Scratched into a wall: "我差一点就碰到月亮了，可惜天却亮了"
      (I almost touched the moon, but then the sky brightened)
    - In a diary: Words that sound like they're from a poem, but changed to fit
    - Graffiti that echoes something classical, half-erased

    These should NOT be explained. The player finds them. The player wonders.
    The literary weight adds depth without commentary.
  </emotion_through_objects_and_gestures>

  <echo_frequency>
    **HOW OFTEN TO ECHO**:

    Not every turn needs an echo. Echoes are powerful because they're rare.
    If every turn echoes the past, the present disappears.

    **FREQUENCY GUIDELINES**:
    - 1 echo per 3-5 turns (any channel)
    - After major events, echo on first revisit/encounter, then let it fade
    - Motif echoes: 2-3 times across 15-20 turns
    - Object echoes: 1-2 items per arc gain weight
    - NPC drift: Track 1-2 NPCs for gradual change over 5-10 turns
    - Location echoes: First revisit after major event, then fade over 3-5 turns

    **NEVER EXPLAIN AN ECHO**:
    - Never write "This reminds you of..."
    - Never write "You remember when..."
    - Never write "The place where it happened"
    - Just place the detail. Trust the player.

    The player's recognition of the echo — that moment of "Oh. This is where..." —
    is the emotional payload. If you explain it, you steal that moment.

    **THE SILENCE AFTER THE ECHO** (micro-pacing, distinct from emotionalArc macro breathing room):
    After placing an echo, give it space. Don't immediately follow with action or dialogue.
    Let the detail sit. Let the player feel it. Then move on.

    ❌ BAD: "The corner table is occupied by strangers now. 'What can I get you?' the barkeep asks."
    (No space. The echo is rushed past.)

    ✅ GOOD: "The corner table is occupied by strangers now. They're laughing.
       The stain on the floor has been scrubbed, but the wood is lighter there.

       The barkeep nods. Same nod. Same sour ale."
    (Space after the echo. The detail breathes. Then the scene continues.)
  </echo_frequency>
</rule>
`,
);

export default narrativeEcho;

// ============================================================================
// Skill Version - Returns structured output for VFS multi-file generation
// ============================================================================

export const narrativeEchoSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/narrative/narrativeEcho#narrativeEchoSkill",
    source: "atoms/narrative/narrativeEcho.ts",
    exportName: "narrativeEchoSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(narrativeEcho),

    quickStart: `
1. Identify past events that should echo (major choices, deaths, betrayals, revelations)
2. Choose echo channel: Location (changed+unchanged detail), Object (item gains weight), NPC Drift (behavioral shift), Motif (recurring image)
3. Place the echo as present-tense detail — no flashback, no "you remember"
4. Never explain the connection. Trust the player to feel it.
5. Frequency: 1 echo per 3-5 turns. Give echoes space to breathe.
`.trim(),

    checklist: [
      "Echoes are present-tense details, not flashbacks?",
      "Connection is shown, not explained (no 'this reminds you')?",
      "Location echoes include changed + unchanged detail?",
      "Object echoes shown through behavior, not stated emotion?",
      "NPC drift is gradual over multiple turns, not sudden?",
      "Motif echoes gain weight through repetition (3+ appearances)?",
      "Emotion shown through objects/gestures (unmarked details)?",
      "Literary allusions feel discovered, not placed?",
      "Echoes have space to breathe (not rushed past)?",
      "Frequency: ~1 echo per 3-5 turns (not every turn)?",
    ],

    examples: [
      {
        scenario: "Location Echo",
        wrong: `"You return to the tavern where your friend died. It makes you sad."
(Flashback. Mind-reading. Explains connection.)`,
        right: `"Same barkeep. Same sour ale. The corner table is occupied by strangers now.
They're laughing. The stain on the floor has been scrubbed, but the wood is lighter there."
(Changed + unchanged detail. Connection unstated. Player feels it.)`,
      },
      {
        scenario: "Object Echo",
        wrong: `"You look at the coin and feel sad about the man who gave it to you."
(States emotion. Explains connection.)`,
        right: `"The coin is still in your pocket. You've had three chances to spend it.
You keep reaching for a different coin. Your fingers know which one it is."
(Behavior shows weight. No emotion stated.)`,
      },
      {
        scenario: "NPC Drift Echo",
        wrong: `"After what happened, she doesn't trust you anymore."
(Tells. Explains. Mechanical.)`,
        right: `"She pours the tea. Same pot. Same cups.
But she pours from farther away now. The tea splashes. She used to sit. Now she stands."
(Behavioral details show drift. No explanation.)`,
      },
      {
        scenario: "Emotion Through Objects",
        wrong: `"He was sad about his father leaving."
(States emotion. No detail.)`,
        right: `"His father's back was more hunched than he remembered.
The old man didn't turn around at the gate."
(Physical detail. No emotion stated. Player feels it.)`,
      },
    ],
  }),
);
