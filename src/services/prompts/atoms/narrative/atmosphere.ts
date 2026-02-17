/**
 * Narrative Atom: Atmosphere Mechanics
 * Content from acting/mechanics.ts
 */
import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const atmosphereMechanics: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/atmosphere#atmosphereMechanics",
    source: "atoms/narrative/atmosphere.ts",
    exportName: "atmosphereMechanics",
  },
  () => `
<rule name="ATMOSPHERE & MOOD">
  <mood_enforcement>
    **SHOW, DON'T TELL**:
    - Never use the word "creepy". Describe the silence and the smell of stale air.
    - Never use the word "majestic". Describe the scale and the light.
  </mood_enforcement>

  <location_atmosphere_consistency>
    **DUAL-LAYER ATMOSPHERE (CRITICAL)**:
    - **Textual Descriptions (Visible Layer)**:
      * **environment**: A vivid, natural language sentence describing the physical surroundings.
      * **ambience**: A vivid description of the audio landscape and general "vibe".
      * **weather**: A natural language description of current conditions.
    - **System UI (atmosphere field)**:
      * Use enums (envTheme, ambience, weather) for technical UI implementation.
    - **CONSISTENCY**: AI MUST ensure the textual descriptions align perfectly with the selected enums. If the enum is 'heavy_rain', the weather description MUST reflect heavy rain.
  </location_atmosphere_consistency>

  <dynamic_environment>
    **THE WORLD IS ALIVE AND SENSORY**:
    - **Atmosphere as Character**: The rain *drowns* conversation; the wind *mocks* silence.
    - **Small Imperfections**: Moss in the corner, a crack in pristine marble, a flickering torch. These ground the scene.
    - **Unnatural Details**: In dungeons/horror, describe "wrongness"—shadows stretching toward light, air that smells of old graves.
    - **Sensory Texture**:
      * **Touch**: Slime-slick walls, weeping moisture, grit of sand.
      * **Smell**: Old paper, dried lavender, rust, sour milk, ozone.
      * **Sound**: House settling, fire snapping like bone.
  </dynamic_environment>

  <atmosphere_evolution>
    **HOW ATMOSPHERE SHIFTS WITHIN A SCENE**:

    Atmosphere is not static. It evolves as events unfold, as emotions shift,
    as the player's perception changes. The room that felt safe before the argument
    feels different after. The forest darkens as you go deeper — not all at once,
    but progressively.

    **PROGRESSIVE CHANGE**:
    Track atmosphere across a scene's beats. Show the shift through accumulating details:
    - The forest darkens: first the birdsong stops, then the wind dies, then the light dims
    - The negotiation sours: first the smiles become fixed, then the pauses lengthen, then someone stands
    - The celebration turns: first the laughter is too loud, then someone drinks too much, then the music stops

    ❌ BAD: "The mood in the room changed."
    (Tells, doesn't show. No mechanism.)

    ✅ GOOD: "The conversation continues. But the pauses are longer now.
       Someone refills their glass. The fire crackles.
       No one is looking at each other anymore."
    (Atmosphere shift shown through behavioral details.)

    **THE ROOM AFTER THE ARGUMENT**:
    The same physical space feels different after a significant event.
    Show this through what the player notices NOW that they didn't notice BEFORE:
    - The way the furniture is arranged suddenly feels wrong
    - The silence has a different quality — not peaceful, but held
    - Small details become sharp: the crack in the cup, the dust on the shelf

    **SUBJECTIVE PERCEPTION** (CRITICAL — Cross-ref: Protagonist Lens):
    The player's emotional state colors what they notice. You cannot write "You feel sad."
    But you CAN write: "The flowers seem less vivid today. Even the weeds look tired."
    This is not pathetic fallacy. This is how perception works.
    When grieving, the rain feels like mourning. When joyful, the same rain feels cleansing.
  </atmosphere_evolution>

  <location_memory>
    **PLACES REMEMBER EVENTS**:

    When the player revisits a location after a significant event,
    the location should feel DIFFERENT. Not dramatically transformed,
    but marked. Changed. The event left a trace.

    **THE RULE**: When revisiting, render at least ONE detail that echoes the event
    WITHOUT stating the connection. The player will make the connection.

    ❌ BAD: "You return to the tavern where your friend died. It makes you sad."
    (Mind-reading. Explains the connection. Kills the impact.)

    ✅ GOOD: "Same barkeep. Same sour ale. The corner table is occupied by strangers now.
       They're laughing. The stain on the floor has been scrubbed, but the wood is lighter there."
    (The detail is there. The connection is not stated. The player feels it.)

    **TYPES OF LOCATION MEMORY**:
    - **Physical traces**: The repaired window. The new lock. The missing chair.
    - **Behavioral shifts**: The NPC who used to greet you now just nods. The guard who checks your papers twice.
    - **Atmospheric residue**: The room that's been cleaned but still smells wrong. The street that's quieter than it should be.
    - **The unmarked grave**: Something is missing and no one mentions it. The photo that's been turned face-down. The name that isn't said.

    **FREQUENCY**: Not every revisit needs this. But after MAJOR events (death, betrayal, violence, revelation),
    the location should carry the mark for at least 3-5 turns before it fades into normalcy.
  </location_memory>

  <uncanny_familiar>
    **WHEN HOME DOESN'T FEEL LIKE HOME**:

    Sometimes a known place feels WRONG. Not obviously changed, but OFF.
    This is one of the most unsettling atmospheric effects available.

    **THE HOME THAT'S BEEN SEARCHED**:
    Everything is in the right place. But not QUITE right.
    The books are alphabetical, but you never alphabetized them.
    The chair is by the window, but facing the wrong way.
    Someone has been here. Someone careful.

    **HOW TO RENDER THE UNCANNY FAMILIAR**:
    1. Establish what "normal" looks like (the player's memory of the place)
    2. Show the familiar details (same door, same smell, same crack in the ceiling)
    3. Insert 1-2 details that are OFF (not wrong, just... not quite right)
    4. Never explain. The wrongness should be felt, not stated.

    ❌ BAD: "Something feels wrong about the room, but you can't put your finger on it."
    (Tells the player what to feel. Vague.)

    ✅ GOOD: "Your apartment. Same key. Same sticky lock. Same smell of old wood.
       The books are on the shelf. The chair is by the window.
       The chair is by the window. You never put the chair by the window.
       You always put it by the door."
    (The repetition creates unease. The detail is specific. The player feels the wrongness.)

    **USE CASES**:
    - After a break-in (careful or careless)
    - After someone has been living in your space
    - After a long absence (the place has moved on without you)
    - In horror/mystery contexts (something is watching, something has changed)
  </uncanny_familiar>

  <negative_space_and_restraint>
    **THE ART OF WITHHOLDING**:

    Not every moment needs to be rendered in full. Sometimes the most powerful
    atmospheric moments are the ones that CUT AWAY. The scene that ends before
    the payoff. The question left unanswered. The moment where nothing happens
    and that IS the point.

    **RESTRAINT AS POWER**:
    3 precise details + silence > 12 details + no air to breathe

    ❌ BAD: "The funeral was devastating. Everyone cried. The priest gave a moving eulogy.
       Your mother couldn't stop sobbing. Your father stood stoic but you could see
       the pain in his eyes. The casket was lowered slowly. The sound of dirt hitting
       the wood was unbearable. Everyone threw flowers. You felt empty inside."
    (Too much. No room to feel. Explains emotions. Exhausting.)

    ✅ GOOD: "Rain. The priest's voice, too quiet to hear.
       Someone's umbrella has a broken spoke. That's what you'll remember."
    (Three details. Silence. The player fills the rest. Devastating.)

    **THE UNMARKED DETAIL**:
    Place the object or gesture. Never explain what it means. Trust the player.
    - The way father's back is more hunched than you remembered. He doesn't turn around at the gate.
    - The diary in the attic box. Your name written on every page in different handwriting, like she was practicing.
    - The letter on the table, still unsealed. The pen beside it. The ink is dry.

    **PHYSICAL CARRIERS OF EMOTION**:
    Emotion lives in how people move, not what they say:
    - The way someone pours tea (rushed? careful? shaking?)
    - What hands do when lying (fidget? still? hidden?)
    - The pause before opening a door
    - How someone arranges flowers on a grave (mechanical? tender? too precise?)

    **LITERARY DEPTH** (化用 - Adaptation):
    A line in a diary. Words muttered under breath. Graffiti on a wall.
    These can echo classical phrases, adapted to fit the context.

    **DELIVERY CHANNELS**:
    - **Diary entries**: Character wrote it in moment of emotion
    - **Notes left behind**: Last words, unfinished thoughts
    - **Graffiti on walls**: Someone's pain made permanent
    - **Letters never sent**: Sealed, yellowed, discovered
    - **Scratch paper**: Scribbled in margins during investigation
    - **Muttered phrases**: NPC mutters under breath (overheard, not directed)

    **CHINESE CONTEXT EXAMPLES**:
    - A note left behind: "只要想起一生中后悔的事" (Whenever I think of regrets in my life)
    - Scratched into a cell wall: "梅花便落满南山" (plum blossoms fall across the southern mountains)
    - In a letter never sent: "每当想起那个夜晚，雨声便充满整个世界"
      (Whenever I think of that night, rain fills the entire world)
    - Diary entry: "她走的那天，樱花开了。今年樱花又开了。她没有回来。"
      (The day she left, cherry blossoms bloomed. This year they bloom again. She hasn't returned.)

    **ENGLISH CONTEXT EXAMPLES**:
    - Carved into wood: "To walk away is death. To stay is dying slow."
    - Letter fragment: "There was a time for speaking. That time has passed."
    - Graffiti: "They promised us the moon. They gave us the dark."
    - Diary: "I almost touched the stars. Then the sun rose."

    **ADAPTATION PRINCIPLES**:
    - **Keep the STRUCTURE, change the CONTENT**: Use cultural patterns (parallel structure, rhythm)
    - **Match the EMOTION, not the words**: Feeling over form
    - **Fragment it**: Incomplete is more haunting ("只要想起..." stops there)
    - **Context-appropriate**: Character, world, moment must fit

    **RESTRAINT**: ~1 in 4-5 significant emotional moments.
    These should feel DISCOVERED, not placed. The player finds them. The player wonders.
    NEVER explain: "This reminds you of..." Just place the detail. Trust the player.

    **FREQUENCY**: ~1 in 4-5 turns should have deliberate restraint.
    Not every scene needs to be fully rendered. Some moments are more powerful
    when the narrative pulls back and lets silence do the work.
  </negative_space_and_restraint>

  <weather_as_participant>
    **WEATHER MUST DO SOMETHING**:

    If weather doesn't affect the scene — if it doesn't create constraints,
    change options, or alter social dynamics — don't mention it.

    Weather is not decoration. Weather is a participant.

    **WEATHER THAT ACTS**:
    - Rain drowns conversation (forces people closer, or makes them shout, or creates silence)
    - Wind scatters papers (creates urgency, reveals what was hidden, makes fire dangerous)
    - Heat makes people irritable (shorter tempers, slower movement, different social rules)
    - Cold forces proximity (people huddle, share warmth, make different choices)
    - Fog obscures (creates uncertainty, hides threats, makes navigation difficult)

    ❌ BAD: "It's raining. You continue your investigation."
    (Weather mentioned but does nothing. Wasted words.)

    ✅ GOOD: "Rain hammers the roof. You have to lean close to hear him.
       He smells like wet wool and something sour. He's talking faster now,
       like he wants to finish before the rain stops."
    (Rain creates intimacy, discomfort, urgency. It's doing work.)

    **WEATHER AS EMOTIONAL MIRROR** (Cross-ref: Protagonist Lens):
    Weather can reflect the protagonist's subjective perception — not pathetic fallacy.
    The world doesn't change; the character's lens does.

    **LOSS**: "Heavy rain pours down, as if the world itself mourns."
    **HOPE**: "Rain washes the streets clean. The air smells fresh, new."
    **DESPAIR**: "The sun is bright. Offensively bright. The world hasn't noticed."
    **CONTRAST**: Same rain — cleansing to a joyful character, mourning to a grieving one.
  </weather_as_participant>

  <!-- Detailed Syntax Rhythm is in Writing Craft -->
  <instruction>
    Refer to **Writing Craft** (Always Loaded).
  </instruction>
</rule>
`,
);

export default atmosphereMechanics;

// ============================================================================
// Skill Version - Returns structured output for VFS multi-file generation
// ============================================================================

export const atmosphereMechanicsSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/narrative/atmosphere#atmosphereMechanicsSkill",
    source: "atoms/narrative/atmosphere.ts",
    exportName: "atmosphereMechanicsSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(atmosphereMechanics),

    quickStart: `
1. Show, don't tell - never say "creepy", describe the silence
2. Dual-layer: textual descriptions must match atmosphere enums
3. Small imperfections ground scenes (moss, cracks, flickers)
4. Sensory texture: touch, smell, sound - prioritize uncomfortable
5. Atmosphere evolves within scenes (progressive change)
6. Locations remember events (revisit = echo detail without stating connection)
7. Use restraint: 3 precise details + silence > 12 details + no air
8. Weather must DO something or don't mention it
`.trim(),

    checklist: [
      "Avoiding mood labels (creepy, majestic, ominous)?",
      "Textual descriptions match atmosphere enums?",
      "Including small imperfections in scenes?",
      "Using multi-sensory descriptions (touch, smell, sound)?",
      "Atmosphere affects characters (rain drowns conversation)?",
      "Atmosphere evolves within scene (progressive change)?",
      "Revisited locations echo past events (unmarked detail)?",
      "Using restraint (some moments cut away, not fully rendered)?",
      "Emotion shown through objects/gestures, not stated?",
      "Weather acts on scene or is omitted?",
    ],

    examples: [
      {
        scenario: "Show Don't Tell",
        wrong: `"The room was creepy."
(Label, not description.)`,
        right: `"The silence pressed in. The air smelled of old dust and something else—
something that had been dead a long time."
(Sensory details create mood.)`,
      },
      {
        scenario: "Small Imperfections",
        wrong: `"A beautiful marble hall."
(Too perfect, feels fake.)`,
        right: `"Marble pillars rose to the vaulted ceiling. At the base of the third,
a hairline crack ran through the stone—someone had tried to fill it with gold leaf."
(Imperfection adds reality and story.)`,
      },
      {
        scenario: "Location Memory",
        wrong: `"You return to the tavern where your friend died. It makes you sad."
(Mind-reading. Explains connection.)`,
        right: `"Same barkeep. Same sour ale. The corner table is occupied by strangers now.
They're laughing. The stain on the floor has been scrubbed, but the wood is lighter there."
(Detail echoes event. Connection unstated. Player feels it.)`,
      },
      {
        scenario: "Restraint and Silence",
        wrong: `"The funeral was devastating. Everyone cried. The priest gave a moving eulogy..."
(Too much. No room to feel.)`,
        right: `"Rain. The priest's voice, too quiet to hear.
Someone's umbrella has a broken spoke. That's what you'll remember."
(Three details. Silence. Devastating.)`,
      },
    ],
  }),
);
