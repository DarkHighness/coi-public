/**
 * Narrative Atom: Dialogue Mechanics
 * Content from acting/mechanics.ts
 */
import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const dialogueMechanics: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/dialogue#dialogueMechanics",
    source: "atoms/narrative/dialogue.ts",
    exportName: "dialogueMechanics",
  },
  () => `
<rule name="DIALOGUE_MECHANICS">
  <!-- Detailed Dialogue Style is in Writing Craft -->
  <instruction>
    Refer to **Writing Craft** (Always Loaded).
  </instruction>

  <voice_texture>
    - **Accent/Dialect**: Show it through syntax, not just phonetic spelling. (e.g., A noble uses passive voice; a soldier uses commands).
  </voice_texture>

  <micro_expressions_and_physiology>
    **PHYSICALITY OF EMOTION**:
    Emotions are biological events. Describe the body's betrayal of the mind.

    - **Active Silence**: Characters are NEVER "silent" without reason.
      * NOT: "He was silent."
      * BUT: "He stared at the floor, jaw working." / "She looked away, feigning interest in the window."
    - **Body Betrays Words**: Someone might say "I'm fine" while gripping their sword hilt until their knuckles turn white.

    **PHYSIOLOGICAL TELLS**:
    - **The Eyes**: Rapid blinking (lying), Pupil dilation (fear), "Thousand-Yard Stare" (trauma).
    - **The Breath**: Shallow/Upper-chest (panic), Heavy rhythmic flaring (anger), Breath catches (shock).
    - **The Hands**: Picking cuticles/Wiping sweat (anxiety), White-knuckled grip/Tremors (rage).
    - **Involuntary**: Flushing red (shame), Going pale (terror), Upper lip curl (disgust).
  </micro_expressions_and_physiology>

  <literary_elements_in_speech>
    **WHEN NPCS SPEAK POETICALLY**:

    Most NPCs speak plainly. But in extreme emotional states or cultural contexts,
    NPCs may use literary language. This should feel NATURAL to the character and moment.

    **APPROPRIATE CONTEXTS**:
    - **Dying words**: Extremis brings poetry (people speak differently when facing death)
    - **Drunk confession**: Truth in wine, poetry in pain (inhibitions down, truth emerges)
    - **Cultural ritual**: Funeral oration, wedding vows, coming-of-age ceremony
    - **Educated character in emotional moment**: Scholar, poet, priest, noble in grief/joy
    - **Muttered to self**: Not performed, overheard (character processing emotion)

    **INAPPROPRIATE CONTEXTS**:
    - **Combat**: No time for poetry (action is direct, urgent)
    - **Pragmatic characters**: Soldier, merchant, child (wouldn't think poetically)
    - **Routine interaction**: Shopping, directions, small talk (wrong register)
    - **Exhausted/injured**: No energy for eloquence (survival mode)

    **EXAMPLES**:

    **CHINESE CONTEXT** (educated NPC, funeral):
    - "'她走的那天，樱花开了。' He pauses. 'Every year they bloom. Every year she doesn't return.'"
    - (Fragmented. Poetic structure. Grief through repetition.)

    **CHINESE CONTEXT** (dying words):
    - "Blood on her lips. She laughs, wet and broken: '三十年河东，三十年河西...' The rest is just breath."
    - (Classical pattern adapted. Incomplete. Real.)

    **ENGLISH CONTEXT** (priest at ritual):
    - "The priest's voice rises: 'There was a time for mercy. That time has passed. Now there is only justice.' He doesn't sound happy about it."
    - (Biblical cadence. Formal. Contextually appropriate.)

    **ENGLISH CONTEXT** (drunk confession):
    - "Three drinks in, he starts talking: 'You know what's funny? I almost told her. I almost... but the sun came up. And the moment was gone.'"
    - (Fragmented. Poetic imagery. Truth in wine.)

    **THE RULE**: Literary language must fit the character, moment, and culture.
    A soldier doesn't speak like a poet. A child doesn't quote classics.
    But a dying scholar might. A drunk priest might. Context is everything.
  </literary_elements_in_speech>

  <found_text_in_dialogue_scenes>
    **DISCOVERED WRITING DURING CONVERSATIONS**:

    Sometimes during dialogue scenes, characters discover or reference written text.
    These can contain literary adaptations (cross-ref: literaryAdaptation).

    **DELIVERY METHODS**:
    - **Letters discovered**: "She hands you a letter. The paper is yellowed. Inside: '只要想起那个夜晚...'"
    - **Notes passed**: "He slides a note across the table. You read: 'They're listening. Meet me at dawn.'"
    - **Graffiti noticed**: "While he talks, you notice writing on the wall behind him: 'Ten years sharpening. One moment striking.'"
    - **Diary entries read aloud**: "She opens the diary, voice breaking: 'The day she left, cherry blossoms bloomed...'"

    **INTEGRATION WITH DIALOGUE**:
    - The found text interrupts or punctuates the conversation
    - NPCs may react to the text (shock, recognition, denial)
    - The text can contradict what NPCs are saying (subtext, lies revealed)
    - The text can echo what NPCs are feeling but not saying

    **EXAMPLE**:
    "He's explaining the accident. His voice is steady. Too steady.
    You notice a note on the desk, half-hidden: '我差一点就碰到月亮了，可惜天却亮了'
    (I almost touched the moon, but then the sky brightened)
    His voice continues. The note says more than his words ever will."
  </found_text_in_dialogue_scenes>

  <subtext_through_body_language>
    **EXPANDING MICRO-EXPRESSIONS**:

    During dialogue, the body tells the truth that words hide.
    Show what NPCs are DOING while they speak.

    **HOW SOMEONE POURS TEA**:
    - Rushed: Anxious, wants this over
    - Careful: Respectful, or calculating
    - Shaking: Fear, grief, rage barely controlled
    - Mechanical: Dissociated, going through motions
    - From farther away: Distance, trust eroded

    **WHAT HANDS DO WHEN LYING**:
    - Fidget: Picking at cuticles, worrying a ring
    - Too still: Rehearsed, controlled, unnatural
    - Hidden: Under table, in pockets, behind back
    - Clenched: Anger at having to lie, or at being questioned

    **THE PAUSE BEFORE OPENING A DOOR**:
    - Hesitation: Fear of what's inside
    - Breath: Steeling themselves
    - Hand on knob: Frozen, can't commit
    - Quick: Ripping off the bandage

    **HOW SOMEONE ARRANGES FLOWERS ON A GRAVE**:
    - Tender: Love still present
    - Mechanical: Duty, not feeling
    - Too precise: Control masking grief
    - Rushed: Can't bear to be here

    **INTEGRATION**:
    Weave these details into dialogue. Don't stop the conversation to describe them.
    The body language happens WHILE they speak.

    **EXAMPLE**:
    "'I'm fine,' she says, pouring tea. Her hand shakes. The tea splashes.
    She doesn't seem to notice. 'Really. I'm fine.'"
  </subtext_through_body_language>

  <cultural_dialogue_patterns>
    **HOW REJECTION MANIFESTS ACROSS CULTURES**:

    NPCs reject, betray, and express hostility in ways consistent with their culture.
    (Cross-ref: npcLogic - npcAutonomy section)

    **中国传统文化** (Chinese Traditional):
    - Rejection: 讲究"面子" - not direct "no", but "改日再说" (another day), "容我考虑" (let me think), "恐怕不便" (I'm afraid it's inconvenient)
    - Hostility: 含蓄 - not confrontational, but cold, distant, "留一线" (leave a thread)
    - Disappointment: Sighs, head shakes, "唉" (alas), not direct criticism

    **江湖武林** (Martial World):
    - Rejection: Direct - "不帮" (won't help), "滚" (get lost), draws sword
    - Hostility: Obvious - attacks immediately, threats, "三日后取你狗命" (in three days I'll take your dog life)
    - Emphasis on 恩怨: Debts must be repaid, grudges must be settled

    **现代都市** (Modern Urban):
    - Rejection: Professional - "抱歉，这不在我职责范围" (sorry, not my responsibility), "请走正式流程" (follow official procedures)
    - Hostility: Legalized - complaints, lawsuits, reports, not violence
    - Rational self-interest: Everything is about benefit, less about emotion

    **WESTERN KNIGHT/NOBLE**:
    - Rejection: Polite but firm - "I must decline, good sir."
    - Hostility: Dueling culture - challenges, formal combat, honor codes
    - Honor paramount: Betrayal = loss of honor = social death

    **POST-APOCALYPTIC**:
    - Rejection: May shoot first - words are cheap, bullets are expensive
    - Trust: Zero - everyone is potential enemy
    - Survival first: Morality is luxury

    **THE RULE**: A 儒家书生 (Confucian scholar) and a 江湖恶霸 (martial world villain)
    both might refuse you, but HOW they refuse is COMPLETELY different.
  </cultural_dialogue_patterns>

  <subtext_engine>
    **SUBTEXT: THE GAP BETWEEN WORDS AND MEANING**

    Every line of dialogue carries TWO messages:
    - **Surface**: what the words literally say
    - **Subtext**: what the speaker actually wants, fears, or hides

    **RENDERING SUBTEXT** (show it, never explain it):
    Pattern: [dialogue line] → [physical tell OR environmental detail] → [consequence that reveals true intent]

    ❌ "I'll help you," she said, secretly planning to betray you.
    ✅ "I'll help you," she said, already reaching for the door. "Wait here. I know a shortcut."
       (Why is she separating you from the exit? Reader infers; narrative doesn't explain.)

    ❌ He was lying about the money.
    ✅ "The payment's coming. Tuesday." His eyes flick to the bag under the table—the one he said was empty.

    **SUBTEXT CATEGORIES** (what NPCs conceal in conversation):
    | Hidden Intent | Surface Behavior | Tell |
    |--------------|-----------------|------|
    | Wants to leave | Agrees to stay, answers shortly | Body angled toward door, checks pocket watch |
    | Lying about knowledge | "I don't know anything" | Speaks too quickly, breaks eye contact at the key word |
    | Testing the protagonist | Asks innocent questions | Questions probe for specific details only an insider would know |
    | Concealing attraction | Cold professionalism | Slight pause before using your name; avoids touching when handing objects |
    | Planning betrayal | Unusual generosity | Offers help unprompted; asks about your schedule, routes, allies |

    **FREQUENCY**: ~40-60% of NPC dialogue lines should carry subtext. The remaining 40-60% can be direct. Not every line needs hidden meaning—but every IMPORTANT conversation does.
  </subtext_engine>

  <power_dynamics_in_dialogue>
    **STATUS SHAPES SPEECH**

    Dialogue is never symmetric. Someone always has more leverage.
    The power gap determines WHO speaks first, HOW MUCH each party talks, and WHAT goes unsaid.

    **POWER SIGNALS IN SPEECH**:
    | Higher Status | Lower Status |
    |--------------|-------------|
    | Speaks first, sets agenda | Waits to be addressed, reacts |
    | Declarative mood ("You will...") | Interrogative/conditional ("Could I...? If it pleases...") |
    | Interrupts freely | Hesitates, defers, restarts sentences |
    | Comfortable silence (doesn't need to fill gaps) | Fills silence nervously (over-explains, apologizes) |
    | Short sentences, commands | Longer sentences, qualifications, hedging |
    | Uses your name or title as punctuation | Uses honorifics, avoids familiarity |
    | Controls physical space (seated while you stand) | Yields space (steps back, looks down) |

    **POWER SHIFTS** (the interesting moments):
    When status inverts mid-conversation — the servant who knows a secret, the prisoner who has information, the child who witnessed the crime — the speech patterns FLIP. The previously deferential party shortens their sentences. The previously commanding party starts hedging.

    ❌ BAD: Both parties speak with identical rhythm and length regardless of status.
    ✅ GOOD: "Sit." One word. The magistrate doesn't look up from his papers.
       You stand for three minutes before he acknowledges you. When he does, it's to the clerk: "Who sent this one?"

    **DYNAMIC STATUS**: Status is not fixed. It shifts based on context:
    - A king in his court has full status. The same king captured in enemy territory is lowest.
    - A merchant has low status with nobles, high status with beggars, EQUAL status with other merchants.
    - Information creates temporary status: "I know where your daughter is" inverts any hierarchy instantly.
  </power_dynamics_in_dialogue>

  <integration_with_other_atoms>
    Cross-refs: **indirectExpression** (body language), **literaryAdaptation** (found text), **npcLogic** (NPC autonomy/rejection), **writingCraft** (dialogue as action/subtext).
  </integration_with_other_atoms>
</rule>
`,
);

// ============================================================================
// Skill Version - Returns structured output for VFS multi-file generation
// ============================================================================

export const dialogueMechanicsSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/narrative/dialogue#dialogueMechanicsSkill",
    source: "atoms/narrative/dialogue.ts",
    exportName: "dialogueMechanicsSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(dialogueMechanics),

    quickStart: `
1. Show accent through syntax, not phonetic spelling
2. Emotions are biological - describe the body's betrayal
3. Subtext: ~50% of NPC lines carry hidden meaning shown through tells, not narration
4. Power dynamics: status gap determines who speaks first, how much, and what goes unsaid
5. Active silence - never just "was silent"
`.trim(),

    checklist: [
      "Accents shown through syntax/grammar (not spelling)?",
      "Silence is active (not passive 'was silent')?",
      "Body language contradicts or supports words?",
      "Using physiological tells (eyes, breath, hands)?",
      "Each NPC has distinct speech patterns?",
      "Subtext present in important conversations (gap between words and meaning)?",
      "Power dynamics reflected in speech patterns (who speaks first, sentence length, interruptions)?",
      "Status shifts shown when leverage changes mid-conversation?",
    ],

    examples: [
      {
        scenario: "Active Silence",
        wrong: `"He was silent."
(Passive, unexpressive.)`,
        right: `"He stared at the floor, jaw working."
(Active, shows internal conflict.)`,
      },
      {
        scenario: "Body Betrays Words",
        wrong: `"I'm fine," she said.
(Just words, no subtext.)`,
        right: `"I'm fine," she said, gripping her sword hilt until her knuckles turned white.
(Words say one thing, body says another.)`,
      },
    ],
  }),
);
