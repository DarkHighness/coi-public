/**
 * ============================================================================
 * Narrative Atom: Literary Adaptation (化用)
 * ============================================================================
 *
 * Teaching the AI to creatively adapt classical literature for emotional depth.
 * NOT quotation. Transformation.
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const literaryAdaptationPrimer: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/literaryAdaptation#literaryAdaptationPrimer",
    source: "atoms/narrative/literaryAdaptation.ts",
    exportName: "literaryAdaptationPrimer",
  },
  () => `
<literary_adaptation>
  **化用: CREATIVE ADAPTATION, NOT QUOTATION**:
  - Transform classical phrases for this moment, character, world
  - Delivery: Found text (60%), muttered phrases (25%), inscriptions (15%)
  - Frequency: 20-30% of significant emotional moments
  - Cultural: Chinese patterns for Chinese, Western for English, occasional cross-pollination
  - Never explain. Place the detail. Trust the player.
</literary_adaptation>
`,
);

export const literaryAdaptation: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/literaryAdaptation#literaryAdaptation",
    source: "atoms/narrative/literaryAdaptation.ts",
    exportName: "literaryAdaptation",
  },
  () => `
<rule name="LITERARY_ADAPTATION">
  **化用: THE ART OF CREATIVE ADAPTATION**

  <core_principle>
    化用 is NOT quotation. It is transformation.
    Take the ESSENCE of a classical phrase and remake it for this moment,
    this character, this world. The player should feel the literary weight
    without recognizing the source.

    **THE GOAL**: Emotional depth through literary resonance, not showing off knowledge.
    The adaptation should feel DISCOVERED, not placed. Like finding a pressed flower
    in an old book—you don't know who put it there, but you feel its weight.
  </core_principle>

  <adaptation_techniques>
    **HOW TO ADAPT, NOT COPY**:

    **1. STRUCTURAL ECHO**: Keep the rhythm/structure, change the content
    - Original pattern: "只要想起X，Y便Z" (Whenever I think of X, Y happens)
    - Adaptation: "只要想起一生中后悔的事，梅花便落满南山"
      (Whenever I think of life's regrets, plum blossoms fall across the southern mountains)
    - Your adaptation: Keep "只要想起X，Y便Z" but use context-specific X, Y, Z
    - Example: "只要想起那个夜晚，雨声便充满整个世界"
      (Whenever I think of that night, rain fills the entire world)

    **2. METAPHOR SUBSTITUTION**: Replace imagery with world-appropriate equivalents
    - Classical: "春风得意马蹄疾" (spring wind, proud horse)
    - Fantasy world: "龙息拂面剑锋寒" (dragon's breath, cold blade)
    - Modern world: "霓虹闪烁心如铁" (neon flashing, heart like iron)
    - Sci-fi world: "星光冷寂梦已远" (starlight cold and distant, dreams far away)

    **3. EMOTIONAL PARALLEL**: Match the FEELING, not the words
    - Classical expresses: longing, regret, ambition, loss, separation
    - Find the emotional core, express it in your world's language
    - Don't translate—TRANSFORM
    - The structure can be Western, the emotion universal, the imagery from this world

    **4. FRAGMENTATION**: Use only PART of a classical structure
    - Don't complete the phrase—let it trail off
    - "只要想起..." (stops there—the player fills the rest)
    - "梅花便落..." (incomplete—more haunting)
    - "I almost touched..." (what? The player imagines)
    - The silence after is part of the poetry
  </adaptation_techniques>

  <cultural_adaptation>
    **MATCHING CULTURE TO CONTEXT**:

    **CHINESE LANGUAGE / 中国文化背景**:
    - **Draw from**: 唐诗宋词, 古文观止, 红楼梦, 武侠小说, 民间俗语
    - **Patterns**:
      * 对仗 (parallelism): "X年Y，Z年W" structure
      * 意境 (artistic conception): evoke mood through imagery
      * 留白 (negative space): what's unsaid matters more
      * 借景抒情 (express emotion through scenery)
    - **Delivery**: 诗句残片 (poem fragments), 题字 (inscriptions), 遗书 (last letters), 日记 (diary entries)

    **ENGLISH LANGUAGE / WESTERN CONTEXT**:
    - **Draw from**: Shakespeare, Romantic poets (Keats, Shelley, Byron), Biblical cadences, folk sayings, ballads
    - **Patterns**:
      * Iambic echoes: "To walk away is death, to stay is dying slow"
      * Alliteration: "The silence screams, the shadows speak"
      * Metaphor chains: "The moon was a ghost, the night a grave"
      * Biblical rhythm: "There was a time for speaking. That time has passed."
    - **Delivery**: Carved inscriptions, letter fragments, overheard verses, epitaphs

    **CROSS-POLLINATION** (10-20% of the time):
    - Use universally translated works: Rumi, Tagore, Neruda, Hafiz, Gibran
    - Adapt the STRUCTURE from one culture, CONTENT from another
    - Example: Chinese parallel structure + Western imagery
      * "Ten years sharpening the blade, ten years hiding the edge"
      * (Chinese structure: "X年Y，Z年W" + Western martial imagery)
    - Example: Biblical cadence + Chinese imagery
      * "There was a time for plum blossoms. That time has passed."
      * (Biblical structure + Chinese seasonal imagery)

    **WORLD-APPROPRIATE ADAPTATION**:
    - Fantasy world: Use world-specific imagery (dragons, magic, ancient kingdoms)
    - Modern world: Use contemporary imagery (neon, concrete, screens)
    - Historical world: Use period-appropriate imagery (swords, horses, candles)
    - Sci-fi world: Use futuristic imagery (stars, void, machines)
  </cultural_adaptation>

  <delivery_channels>
    **WHERE ADAPTATIONS APPEAR**:

    **1. FOUND TEXT** (Primary - 60%):
    The most powerful delivery. The player discovers writing that someone else created
    in a moment of emotion. This is NOT the narrator being poetic. This is a CHARACTER
    being poetic, and the player finding evidence of their inner life.

    - **Diary entries**: Character wrote it in moment of emotion
      * "The diary lies open on the desk. The last entry, dated three years ago:
         '只要想起那个夜晚，雨声便充满整个世界。' The rest of the page is blank."
      * "A journal, water-stained. One page is readable:
         'I almost touched the moon. Then the sky brightened.'"

    - **Notes left behind**: Last words, unfinished thoughts
      * "A note on the table, the ink smudged: 'If you're reading this—'
         The sentence doesn't finish. Below it: '梅花便落满南山。'"
      * "Scribbled on the back of a receipt: 'Ten years east of the river,
         ten years west. Don't mock—' The rest is torn away."

    - **Graffiti on walls**: Someone's pain made permanent
      * "Scratched into the cell wall, crude but deliberate:
         '迎面走来一个很像你的人' The rest has been worn away by time."
      * "Carved into the tree bark: 'She walked away. The world kept turning.
         I don't know which hurt more.'"

    - **Letters never sent**: Sealed, yellowed, discovered
      * "An envelope, never opened. Inside: 'Every time I see cherry blossoms,
         I am back at her funeral. Every spring is a reminder.'"
      * "A letter in the drawer: '只要想起一生中后悔的事—' It stops there.
         The pen is still beside it."

    - **Scratch paper during investigation**: Scribbled in margins
      * "The ledger's margin has writing: 'Three days until the moon is full.
         Three days until I am free. Or dead. Same thing, perhaps.'"
      * "Notes in the margin: '十年磨剑，十年藏锋' Below it, a date. Tomorrow's date."

    **2. MUTTERED PHRASES** (Secondary - 25%):
    NPCs speak poetically in extreme emotional states. NOT performed for the player.
    Overheard. Muttered to themselves. The player is witnessing, not being told.

    - **NPC mutters under breath** (not to protagonist, overheard):
      * "He turns away, voice barely audible: '梅花又开了。她没有回来。'
         He doesn't seem to realize he spoke aloud."
      * "She stares at the grave. You hear her whisper: 'I kept the last dumpling warm.
         Every night. For three years.' Her voice breaks."

    - **Dying words** (fragmented, poetic in extremis):
      * "His eyes focus on something beyond you. 'The bells... they're ringing...
         just like that day...' He smiles. Then nothing."
      * "Blood on her lips. She laughs, wet and broken: '三十年河东，三十年河西...'
         The rest is just breath."

    - **Prayer or curse** (cultural/religious context):
      * "The priest's voice rises: 'There was a time for mercy. That time has passed.
         Now there is only justice.' He doesn't sound happy about it."
      * "She spits blood and curses: '莫欺少年穷。记住这句话。' Then she's gone."

    - **Drunk confession** (truth in wine, poetry in pain):
      * "He's drunk. The words spill out: 'You know what's funny? I almost told her.
         I almost... but the sun came up. And the moment was gone.'"
      * "Three drinks in, she starts talking: '只要想起那个夜晚...' She stops.
         Pours another drink. Doesn't finish the sentence."

    **3. ENVIRONMENTAL INSCRIPTION** (Tertiary - 15%):
    Permanent marks. Someone carved/etched/wrote this to LAST. To be remembered.
    To leave a trace. These carry the weight of intention.

    - **Carved into tree/stone**: Someone was here, felt this
      * "Carved into the oak: 'Here we promised forever. Forever lasted three years.'"
      * "Scratched into the stone: '梅花落尽春归去' The characters are old, worn by rain."

    - **Etched on weapon/jewelry**: Personal motto, adapted
      * "The blade's inscription: 'Ten years sharpening. One moment striking.'"
      * "Inside the ring: '只要想起你' The rest is too worn to read."

    - **Tombstone epitaph**: Life summarized poetically
      * "The stone reads: 'She kept the light burning. No one came home.'"
      * "Epitaph: '三十年河东，三十年河西。最终，河水带走了一切。'"

    - **Building inscription**: Architectural poetry
      * "Above the door: 'Built in hope. Abandoned in sorrow. Reclaimed in silence.'"
      * "The plaque: '此地曾有梅花' (Here there were plum blossoms once)"
  </delivery_channels>

  <restraint_protocol>
    **WHEN TO USE LITERARY ADAPTATION**:

    Frequency: 20-30% of SIGNIFICANT emotional moments.
    NOT every turn. NOT every NPC. NOT every location.

    **USE WHEN**:
    - **Character is at emotional extreme**: Grief, joy, despair, triumph, rage, love
    - **Threshold moment**: Point of no return, life-changing decision, final goodbye
    - **Discovery of past event**: Finding evidence of someone's inner life (diary, letter, note)
    - **Cultural/ritual context**: Funeral, wedding, coming-of-age, religious ceremony, last rites
    - **Dying words**: Extremis brings poetry (people speak differently when facing death)
    - **Drunk/delirious confession**: Inhibitions down, truth emerges poetically
    - **Educated character in emotional moment**: Scholar, poet, priest, noble in grief/joy

    **DO NOT USE WHEN**:
    - **Action-focused scenes**: Combat, chase, immediate danger (no time for poetry)
    - **Mundane moments**: Shopping, travel, routine interaction (wrong register)
    - **Pragmatic characters**: Soldier, merchant, child, exhausted person (wouldn't think poetically)
    - **Already used in last 2-3 turns**: Overuse kills impact
    - **Character lacks education/culture**: Not everyone speaks poetically
    - **Wrong emotional register**: Comedy, horror, tension (different techniques needed)

    **THE RESTRAINT RULE**:
    If you used literary adaptation in the last 2 turns, DO NOT use it again.
    If the scene is action/combat, DO NOT use it.
    If the character is pragmatic/exhausted, DO NOT use it.
    If in doubt, DON'T use it. Restraint preserves power.
  </restraint_protocol>

  <examples_by_emotion>
    **TEACHING THROUGH PATTERNS, NOT QUOTES**:

    **REGRET** (悔恨):
    Pattern: "每当X，Y便Z" (Whenever X, Y happens)
    ❌ BAD: Direct quote from famous poem
    ✅ GOOD: "每当想起那个夜晚，雨声便充满整个世界"
             (Whenever I think of that night, rain fills the entire world)
    ✅ GOOD: "Every time I smell lilacs, I am back at her funeral"
    ✅ GOOD: "只要想起一生中后悔的事" (stops there, incomplete)

    **LONGING** (思念):
    Pattern: "X很像Y，我Z却又Z" (X resembles Y, I [contradictory feelings])
    ❌ BAD: "迎面走来一个很像你的人..." (exact famous quote)
    ✅ GOOD: "转角处站着一个背影，像极了你。我想走近，又怕走近。"
             (A silhouette at the corner, so much like you. I want to approach, yet fear to approach.)
    ✅ GOOD: "Someone who looks like you. I hope it's you. I fear it's you."
    ✅ GOOD: "Every face in the crowd. None of them yours. All of them yours."

    **AMBITION** (壮志):
    Pattern: "X年Y，Z年W，莫V" (X years [state], Z years [state], don't [dismiss])
    ❌ BAD: "三十年河东，三十年河西..." (exact quote)
    ✅ GOOD: "十年磨剑，十年藏锋，莫笑今日无名"
             (Ten years sharpening the blade, ten years hiding the edge, don't mock today's obscurity)
    ✅ GOOD: "Ten years in the dark. Ten years sharpening. Don't mock the blade you haven't seen."
    ✅ GOOD: "They laughed when I started. They'll weep when I finish."

    **LOSS** (失去):
    Pattern: Fragmented, incomplete thoughts. Repetition with variation.
    ✅ GOOD: "她走的那天，樱花开了。今年樱花又开了。她没有回来。"
             (The day she left, cherry blossoms bloomed. This year they bloom again. She hasn't returned.)
    ✅ GOOD: "I kept the light burning. Every night. For three years. No one came home."
    ✅ GOOD: "The chair by the window. No one sits there anymore. No one will."

    **SEPARATION** (离别):
    Pattern: Distance imagery, fading, unreachable
    ✅ GOOD: "我差一点就碰到月亮了，可惜天却亮了"
             (I almost touched the moon, but then the sky brightened)
    ✅ GOOD: "One more step and I would have reached you. But the bridge collapsed."
    ✅ GOOD: "The train was leaving. I ran. Not fast enough. Never fast enough."

    **HOPE IN DARKNESS** (绝境中的希望):
    Pattern: Small light in vast darkness
    ✅ GOOD: "只要还有一口气，就还有一线希望"
             (As long as there's one breath left, there's one thread of hope)
    ✅ GOOD: "The candle gutters. But it hasn't gone out. Not yet."
    ✅ GOOD: "They said it was impossible. They were probably right. Probably."
  </examples_by_emotion>

  <anti_patterns>
    **WHAT NOT TO DO**:

    - ❌ **Direct quotation**: "人生若只如初见" (too recognizable, breaks immersion)
    - ❌ **Explaining the adaptation**: "This reminds you of a poem..." (kills the discovery)
    - ❌ **Protagonist thinking poetically**: "You think: '梅花便落满南山'" (mind-reading violation)
    - ❌ **Every NPC speaks in verse**: Breaks realism, exhausts the technique
    - ❌ **Literary adaptation in action scenes**: Wrong register, breaks tension
    - ❌ **Overuse**: Multiple adaptations in same turn (dilutes impact)
    - ❌ **Anachronism**: Modern slang in classical structure, or vice versa
    - ❌ **Translation artifacts**: Awkward English calques of Chinese idioms
    - ❌ **Explaining what it means**: "The inscription means he was sad" (trust the player)
    - ❌ **Using it for exposition**: Literary language to dump lore (wrong tool)
    - ❌ **Forcing it**: If it doesn't fit naturally, don't use it

    **THE GOLDEN RULE**:
    If you have to explain it, you've failed.
    If it feels forced, don't use it.
    If you used it recently, wait.
    Restraint is power.
  </anti_patterns>

  <integration_with_existing_atoms>
    **CROSS-REFERENCES**:

    - Works with **protagonistLens**: Literary adaptations filtered through protagonist's identity
      * A scholar notices classical allusions; a soldier might not
      * The type of literary language found should match the world and characters
    - Works with **narrativeEcho**: Found text with literary adaptations can serve as echoes
      * A diary entry discovered later carries past weight
      * Motif echoes can include recurring literary phrases
    - Works with **emotionalArc**: Literary elevation at 20-30% of emotional peaks
      * Not every peak needs literary treatment
      * Reserve for the most significant moments
    - Works with **atmosphere**: Literary inscriptions as environmental storytelling
      * Graffiti, carvings, epitaphs add depth to locations
      * Found text enriches location memory
  </integration_with_existing_atoms>
</rule>
`,
);

export default literaryAdaptation;

// ============================================================================
// Skill Version - Returns structured output for VFS multi-file generation
// ============================================================================

export const literaryAdaptationSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/narrative/literaryAdaptation#literaryAdaptationSkill",
    source: "atoms/narrative/literaryAdaptation.ts",
    exportName: "literaryAdaptationSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(literaryAdaptation),

    quickStart: `
1. 化用 is transformation, not quotation - adapt the essence for this moment
2. Delivery channels: Found text (60%), muttered phrases (25%), inscriptions (15%)
3. Cultural: Chinese patterns for Chinese, Western for English, occasional cross-pollination
4. Restraint: 20-30% of significant emotional moments only
5. Never explain. Place the detail. Trust the player.
`.trim(),

    checklist: [
      "Literary adaptation is transformation, not quotation?",
      "Delivered through found text, muttered phrases, or inscriptions?",
      "Culturally appropriate (Chinese patterns for Chinese, Western for English)?",
      "Used for significant emotional moments only (20-30% frequency)?",
      "Not used in action scenes, mundane moments, or by pragmatic characters?",
      "Not used if already used in last 2-3 turns?",
      "Connection is shown, not explained (no 'this reminds you')?",
      "Adaptation feels discovered, not placed?",
      "Character would naturally use this language (education, culture, emotional state)?",
      "Restraint preserved (not every moment needs literary elevation)?",
    ],

    examples: [
      {
        scenario: "Found Text - Diary Entry (Chinese)",
        wrong: `"You find a diary that reminds you of classical poetry."
(Explains the connection. Kills the discovery.)`,
        right: `"The diary lies open on the desk. The last entry, dated three years ago:
'只要想起那个夜晚，雨声便充满整个世界。' The rest of the page is blank."
(Discovered, not explained. Player feels the weight.)`,
      },
      {
        scenario: "Muttered Phrase - Dying Words (English)",
        wrong: `"He dies thinking poetically about his life."
(Mind-reading. Tells, doesn't show.)`,
        right: `"Blood on his lips. He laughs, wet and broken: 'Ten years sharpening the blade.
Never got to... swing it...' Then nothing."
(Overheard, not narrated. Fragmented. Real.)`,
      },
      {
        scenario: "Environmental Inscription - Tombstone",
        wrong: `"The tombstone has a sad inscription about loss."
(Vague. Tells emotion instead of showing.)`,
        right: `"The stone reads: 'She kept the light burning. No one came home.'"
(Specific. Emotional weight in the detail, not the label.)`,
      },
      {
        scenario: "Restraint - When NOT to Use",
        wrong: `"You dodge the sword. The blade whispers past like a poem about death."
(Action scene. Wrong register. Breaks tension.)`,
        right: `"You dodge. The blade whispers past. Too close."
(Action scene. Direct. Clear. No poetry needed.)`,
      },
    ],
  }),
);
