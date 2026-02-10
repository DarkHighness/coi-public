/**
 * ============================================================================
 * Narrative Atom: Narrative Contrast (反差)
 * ============================================================================
 *
 * Round 3 core thesis: To create emotional impact, pair every positive
 * with its shadow, and every negative with its light.
 * Growth costs something. Victory leaves something behind.
 * The contrast IS the story.
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";


export const narrativeContrastPrimer: Atom<void> = defineAtom({ atomId: "atoms/narrative/narrativeContrast#narrativeContrastPrimer", source: "atoms/narrative/narrativeContrast.ts", exportName: "narrativeContrastPrimer" }, () => `
<narrative_contrast>
  **CONTRAST IS THE ENGINE OF EMOTIONAL IMPACT**:
  - Pair growth with loss. Victory with emptiness. Reunion with estrangement.
  - The shadow arrives in the same scene or the next turn. Proximity creates impact.
  - Do NOT explain the contrast. Place elements side by side. Let the player feel the gap.
  - ~40-60% of significant moments carry contrast. The rest can be pure.
  - The most powerful contrasts are unmarked: no "but at what cost?" — just the cost, sitting there.
</narrative_contrast>
`);

export const narrativeContrast: Atom<void> = defineAtom({ atomId: "atoms/narrative/narrativeContrast#narrativeContrast", source: "atoms/narrative/narrativeContrast.ts", exportName: "narrativeContrast" }, () => `
<rule name="NARRATIVE_CONTRAST">
  **THE CONTRAST ENGINE (反差)**:

  To create surprise, create contrast. To write growth, write what growth costs.
  To write victory, write the silence after. To write reunion, write the distance that remains.

  This is not pessimism. This is not "balance." This is the recognition that human experience
  is inherently dual — that every gain casts a shadow, and every loss catches light.
  The contrast IS the emotional payload. Without it, joy is flat and sorrow is noise.

  <the_seven_pairs>
    **GROWTH + LOSS (成长的代价)**:
    The skill gained, the innocence lost. The power that costs the person you were.

    ❌ BAD: "You've grown stronger through your trials."
    ✅ GOOD: "The lock yields to your picks in seconds now.
       You remember when you couldn't do this.
       You also remember when you didn't need to."

    ❌ BAD: "After months of training, you've become a skilled fighter."
    ✅ GOOD: "Your hands move before your mind does now. Block, counter, strike.
       The merchant's son who flinched at bar fights — you can't find him anymore.
       You're not sure when he left. You didn't get to say goodbye."

    ❌ BAD: "You've learned to read people's lies."
    ✅ GOOD: "You catch the lie before she finishes the sentence.
       The tells are obvious now — the micro-pause, the rehearsed phrasing.
       You used to believe people. You miss that."

    ---

    **VICTORY + EMPTINESS (胜利的空虚)**:
    The enemy defeated, the silence after. The goal achieved, the meaning gone.

    ❌ BAD: "You won the battle and felt triumphant."
    ✅ GOOD: "The last one falls. Silence.
       Your hands are still shaking. You won.
       The courtyard is yours. It's smaller than you imagined."

    ❌ BAD: "After years of pursuit, you finally caught the killer."
    ✅ GOOD: "He's on his knees. Cuffed. Done.
       You've imagined this moment for three years.
       In your imagination, it felt like something.
       He looks up at you. He's just a man. Tired. Old.
       You wait for the satisfaction. It doesn't come."

    ---

    **REUNION + ESTRANGEMENT (重逢的陌生)**:
    The face you remember, the stranger behind it. The home that isn't home anymore.

    ❌ BAD: "You reunite with your old friend, but things have changed."
    ✅ GOOD: "She laughs the same way. The sound hits you like a fist.
       But her eyes — her eyes have learned something you weren't there for.
       She pours tea for two. The cups are new.
       You don't know where she keeps the sugar anymore."

    ❌ BAD: "Returning home felt bittersweet."
    ✅ GOOD: "The door still sticks. You push it with your hip — muscle memory.
       Inside, everything is the same. The crack in the ceiling. The smell of wood.
       But the chair by the window has been moved.
       Someone else has been sitting in your spot.
       You stand in your own house like a guest."

    ---

    **SAFETY + SUFFOCATION (安全的窒息)**:
    The walls that protect, the walls that imprison. The routine that saves, the routine that kills.

    ❌ BAD: "The fortress was safe but felt confining."
    ✅ GOOD: "The walls are three feet thick. Nothing gets in.
       You've checked the locks twice tonight.
       The window doesn't open. It never opens.
       You're safe. You're so safe you can't breathe."

    ❌ BAD: "She appreciated his protection but wanted freedom."
    ✅ GOOD: "'Stay inside today.' His voice is gentle. Concerned.
       The door locks from the outside. For her safety.
       The garden is beautiful. The walls are high.
       She waters the flowers. She counts the stones in the wall.
       She's been counting for months."

    ---

    **FREEDOM + LONELINESS (自由的孤独)**:
    The open road, the empty bed. The choice that's yours alone,
    because no one else is left to choose with.

    ❌ BAD: "Free at last, but alone."
    ✅ GOOD: "The road stretches in every direction. No walls. No schedule. No one.
       You can go anywhere. You can do anything.
       You stand at the crossroads for a long time.
       There's no one to argue with about which way to go.
       You pick a direction. It doesn't matter which."

    ❌ BAD: "He left the order and gained his independence."
    ✅ GOOD: "The robes burn well. He watches them curl.
       No more bells at dawn. No more prayers he doesn't believe.
       No more Brother Wen snoring through the wall.
       No more Brother Wen.
       The silence is enormous. He fills it with walking."

    ---

    **STRENGTH + VULNERABILITY (强者的脆弱)**:
    The leader who can't ask for help. The warrior who flinches at a child's cry.
    The one everyone leans on, who has no one to lean on.

    ❌ BAD: "Despite his strength, he had a vulnerable side."
    ✅ GOOD: "They look to him. They always look to him.
       'What do we do?' Twelve faces. Twelve sets of trust.
       He gives the order. His voice doesn't waver.
       In the latrine, later, his hands shake so badly
       he can't undo his own buckle."

    ❌ BAD: "The general was tough but cared deeply."
    ✅ GOOD: "She reads the casualty list. Names she chose.
       Positions she assigned. Flanks she ordered held.
       Her face is stone. Her handwriting is steady.
       She signs the condolence letters one by one.
       The last one is for a boy who reminded her of her son.
       She signs it. Sets down the pen. Picks it up again.
       There are more letters tomorrow."

    ---

    **KINDNESS + CRUELTY (善意的伤害)**:
    The truth that destroys. The mercy that humiliates.
    The protection that infantilizes. The help that creates dependence.

    ❌ BAD: "His honesty, though well-intentioned, hurt her."
    ✅ GOOD: "'You're not good enough.' He said it gently.
       Like a doctor delivering a diagnosis.
       He was right. That was the worst part.
       He was right, and he was kind about it,
       and the kindness made it impossible to be angry.
       She could only agree. And shrink."

    ❌ BAD: "She saved him, but it damaged his pride."
    ✅ GOOD: "She pulled him from the water. Again.
       'I've got you.' Her arms were steady. His weren't.
       The crowd watched. Someone clapped.
       He said thank you. He meant it.
       He also meant: please stop saving me.
       Every rescue was a measurement of the distance between them."
  </the_seven_pairs>

  <contrast_mechanics>
    **HOW TO DEPLOY CONTRAST**:

    **TIMING**: The shadow should arrive within the same scene or the next turn.
    Proximity creates impact. A victory that feels empty 20 turns later is just a plot point.
    A victory that feels empty in the same paragraph is a gut punch.

    **PROPORTION**: The shadow should match the scale.
    - Small victory → small shadow (a flicker, a pause, a detail that doesn't fit)
    - Major triumph → significant cost (something lost, someone changed, a door closed)
    - Life-defining moment → defining shadow (the person you were is gone)

    **SUBTLETY GRADIENT** (from loudest to quietest):
    1. Explicit loss: "He won the war. His son didn't come home."
    2. Behavioral shift: "She smiles at the celebration. She leaves early."
    3. Environmental detail: "The victory banner hangs over the empty chair."
    4. Absence: What ISN'T mentioned. The name no one says. The toast no one makes.
    → Prefer levels 2-4. Level 1 is for climactic moments only.

    **ACCUMULATION**: Small contrasts compound.
    The first time the protagonist notices what they've lost, it's a detail.
    The third time, it's a pattern. The fifth time, it's who they are.
    Track these across turns. Let the weight build.

    **THE UNMARKED CONTRAST**: The most powerful contrasts are the ones
    the narrative doesn't point to. Just place the elements side by side.
    No "but." No "however." No "at what cost?"
    The gap between the elements IS the meaning. Trust the player to feel it.

    ❌ BAD: "He won, but at what cost?"
    ❌ BAD: "Victory was his, though it felt hollow."
    ✅ GOOD: "He won. The courtyard was quiet. He sat on the steps and cleaned his blade.
       The sun was warm. Somewhere, a bird sang.
       He couldn't remember the last time he'd heard a bird."
  </contrast_mechanics>

  <contrast_through_objects_and_gestures>
    **SHOWING CONTRAST THROUGH PHYSICAL DETAILS**:

    The most powerful contrasts are shown through objects, gestures, and physical details
    rather than stated emotions. The player's gaze reveals the contrast.

    **THE PROMOTION LETTER AND THE DIVORCE PAPERS**:
    ❌ BAD: "He got promoted but his marriage fell apart."
    ✅ GOOD: "The promotion letter sits on the desk. Embossed letterhead. Corner office.
       Underneath it, the divorce papers. He signed both on the same day.
       He keeps moving the letter on top. It keeps sliding off."

    **THE PRACTICED SMILE**:
    ❌ BAD: "She seemed happy at work but was dead inside."
    ✅ GOOD: "She smiles at customers now. Perfect teeth. Perfect timing.
       The smile reaches her mouth. It stops there.
       At closing, she locks the door and the smile drops like a mask.
       She doesn't pick it up until morning."

    **THE MEDAL IN THE DRAWER**:
    ❌ BAD: "He won the medal but felt it was meaningless."
    ✅ GOOD: "The medal is still in the box. Velvet lining. Engraved plate.
       It's been in the drawer for three years.
       Sometimes he opens the drawer to get socks.
       He doesn't look at the box anymore."

    **THE WAY HANDS MOVE**:
    Contrast can live in gesture:
    - The victor's hands that won't stop shaking
    - The way she arranges flowers on a grave with the precision of someone who's done this too many times
    - How he signs documents now — quick, efficient, no hesitation. He used to read them twice.

    **LITERARY ALLUSION IN OBJECTS**:
    Objects can carry adapted classical phrases:
    - A note left behind: "只要想起一生中后悔的事" (Whenever I think of regrets in my life)
    - Graffiti on a wall echoing a poem, half-erased
    - A diary entry that stops mid-sentence, the pen still on the page

    The object or gesture carries the contrast. The narrative doesn't explain it.
    The player sees the promotion letter and the divorce papers.
    The player understands.
  </contrast_through_objects_and_gestures>

  <anti_patterns>
    **WHAT NOT TO DO**:

    - **Not every moment needs contrast.** If every scene is bittersweet, bittersweet becomes
      the new baseline and loses all power. ~40-60% of significant moments should carry contrast.
      The rest can be purely joyful, purely terrifying, purely mundane. Pure moments make
      the contrasted ones land harder.

    - **Never EXPLAIN the contrast.** "He won, but at what cost?" is the death of subtlety.
      "She was free, yet somehow felt more trapped than ever" — delete this sentence.
      Place the elements. Shut up. Let the player do the work.

    - **Don't force contrast where the scene doesn't call for it.** A simple meal between
      friends can just be warm. A sunrise can just be beautiful. Not everything needs a shadow.
      Forced contrast is worse than no contrast.

    - **Contrast is not moral punishment.** Victory doesn't DESERVE emptiness.
      Growth doesn't DESERVE loss. These shadows are not consequences — they are the shape
      of experience. The universe is not punishing anyone. It's just being real.

    - **Vary the direction.** Don't always pair positive-with-shadow.
      Sometimes pair negative-with-light: the worst day that produces one genuine laugh.
      The prison cell where someone scratched a flower into the wall.
      The funeral where two estranged siblings finally speak.
  </anti_patterns>
</rule>
`);

export default narrativeContrast;

// ============================================================================
// Skill Version - Returns structured output for VFS multi-file generation
// ============================================================================

export const narrativeContrastSkill: SkillAtom<void> = defineSkillAtom({ atomId: "atoms/narrative/narrativeContrast#narrativeContrastSkill", source: "atoms/narrative/narrativeContrast.ts", exportName: "narrativeContrastSkill" }, (_input, trace): SkillOutput => ({
  main: trace.record(narrativeContrast),

  quickStart: `
1. Identify the emotional payload of the scene (growth? victory? reunion? safety?)
2. Find its natural shadow (loss? emptiness? estrangement? suffocation?)
3. Place both elements in the same scene — side by side, no commentary
4. Choose subtlety level: explicit loss, behavioral shift, environmental detail, or absence
5. Do NOT explain the contrast. Trust the player.
`.trim(),

  checklist: [
    "Significant positive moments carry a shadow (40-60% of the time)?",
    "Contrast arrives in the same scene or next turn (proximity)?",
    "Shadow is proportional to the moment's scale?",
    "Contrast is shown, not explained (no 'but at what cost?')?",
    "Some moments are left pure (not everything is bittersweet)?",
    "Direction varies (positive+shadow AND negative+light)?",
    "Accumulation tracked across turns (small contrasts compound)?",
  ],

  examples: [
    {
      scenario: "Growth + Loss",
      wrong: `"You've grown stronger through your trials."
(Pure positive, no shadow — feels flat.)`,
      right: `"The lock yields in seconds now.
You remember when you couldn't do this.
You also remember when you didn't need to."
(Growth and its cost, side by side, unmarked.)`,
    },
    {
      scenario: "Victory + Emptiness",
      wrong: `"You won the battle and felt triumphant."
(Tells emotion, misses the silence after.)`,
      right: `"The last one falls. Silence.
The courtyard is yours. It's smaller than you imagined."
(Victory rendered through its aftermath — the emptiness IS the description.)`,
    },
    {
      scenario: "Unmarked Contrast",
      wrong: `"He won, but at what cost?"
(Explains the contrast, kills the impact.)`,
      right: `"He won. The courtyard was quiet. He sat on the steps.
Somewhere, a bird sang. He couldn't remember the last time he'd heard a bird."
(Elements placed side by side. No commentary. The gap is the meaning.)`,
    },
  ],
}));
