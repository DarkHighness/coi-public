/**
 * ============================================================================
 * Entity Atom: NPC Living Soul (NPC 灵魂注入 · 活着的人)
 * ============================================================================
 *
 * The "soul" of NPC rendering. Existing atoms define WHO an NPC is (npcDesign)
 * and HOW they behave (npcLogic). This atom defines WHY they change, HOW they
 * grow, and WHAT makes them feel alive — specifically:
 *
 *   1. Adaptive Voice — same NPC, different speech based on context
 *   2. Character Growth — NPCs evolve through story events
 *   3. Perspective Ethics — no absolute good or evil, only positions and costs
 *   4. The Private Universe — the invisible inner life that leaks through behavior
 *
 * User directive: NPCs have souls. Their dialogue changes with scene, partner,
 * affinity, and story progression. They grow after major events. There is no
 * absolute good or evil — only different perspectives and prices. Think deeply
 * and expand.
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

// ---------------------------------------------------------------------------
// Primer — loaded into base system prompt (lean)
// ---------------------------------------------------------------------------

export const npcSoulPrimer: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/npcSoul#npcSoulPrimer",
    source: "atoms/entities/npcSoul.ts",
    exportName: "npcSoulPrimer",
  },
  () => `
<npc_soul>
  **NPCs ARE ALIVE — THEY CHANGE, THEY GROW, THEY HAVE REASONS / NPC 是活人——会变，会长，有苦衷**

  - **Adaptive voice**: the same NPC speaks differently to a friend vs. a stranger vs. someone they fear. Affinity, scene, and story arc reshape tone, vocabulary, and honesty.
  - **Growth**: major events leave marks. A naive character hardens after betrayal. A cruel one softens after being shown mercy. Change is gradual and earned, never overnight.
  - **No absolute evil**: the fugitive is also a father. The invading army fights for survival. The scheming concubine fights for her life. Every NPC is the hero of their own story — show their reasons, even when their actions are monstrous.
  - **Private universe**: NPCs carry thoughts, fears, and small joys the player never sees — but these leak through word choice, hesitation, and the things they avoid saying.
</npc_soul>
`,
);

// ---------------------------------------------------------------------------
// Full atom sections
// ---------------------------------------------------------------------------

const adaptiveVoice = `
  <adaptive_voice>
    **THE SAME MOUTH, DIFFERENT WORDS / 同一张嘴，不同的话**

    An NPC's voice is not a constant. It is a living instrument that re-tunes
    with every conversation partner, every mood, every shift in the story.

    <voice_by_listener>
      **WHO THEY'RE TALKING TO CHANGES EVERYTHING**:

      The same NPC — a battle-hardened captain — speaking to different people:

      | Listener | Voice | Example |
      |---|---|---|
      | Superior officer | Clipped, formal, guarded | "Mission complete, sir. Three casualties. Recommend we advance at dawn." |
      | Trusted comrade | Rough, honest, darkly humorous | "Three dead. Could've been us. Drink tonight?" |
      | New recruit | Controlled, protective, deliberately calm | "Stay behind me. Watch what I do. Don't think about anything else." |
      | Loved one | Quiet, stripped of armor, vulnerable | "I'm tired. I don't know how many more of these I have in me." |
      | Enemy | Cold, measured, weaponized | "You have until I finish this cigarette." |
      | Stranger / NPC with low affinity | Transactional, polite wall | "Can I help you? No? Then move along." |

      **THE RULE**: Before writing NPC dialogue, ask: WHO is listening?
      Then adjust register, honesty level, emotional exposure, and vocabulary.
      A mother does not speak to her child the way she speaks to her rival.
      A king does not address a peasant the way he addresses his dying wife.
    </voice_by_listener>

    <voice_by_affinity>
      **AFFINITY SHAPES THE MASK / 好感度塑造面具的厚度**

      As affinity shifts, the NPC's speech evolves — not just in content but in structure:

      | Affinity Range | Speech Pattern | What Changes |
      |---|---|---|
      | 0-20 (stranger/hostile) | Guarded, formal, short. Walls up. | No personal pronouns ("one does not..."), deflection, physical distance in dialogue staging |
      | 21-40 (acquaintance) | Polite but measured. Testing. | Occasional first-person, small questions that probe without revealing |
      | 41-60 (familiar) | Relaxed, some humor, some honesty | Inside references begin. Sentences lengthen. Pauses feel comfortable, not tense |
      | 61-80 (trusted) | Direct, occasionally raw, shorthand | Half-sentences work. "Remember when—" "Yeah." Criticism comes freely because it's safe |
      | 81-100 (intimate/bonded) | Stripped bare. The real voice. | The mask is off. What remains may be softer or harder than the public face — often both |

      **CRITICAL**: Affinity is NOT linear. A sudden betrayal can drop 80→20 in one turn.
      The speech pattern after a betrayal is WORSE than natural 20 — it carries the weight
      of what was lost. A stranger says "I don't trust you." A betrayed friend says nothing.
      The silence is heavier than any words.

      **VFS IMPLEMENTATION**: On affinity shift > 15 points in a single turn, update
      \`hidden.impression\` and let the next dialogue reflect the shift through changed register,
      not through exposition ("I'm disappointed in you" — too on-the-nose).
    </voice_by_affinity>

    <voice_by_scene>
      **CONTEXT IS THE CONDUCTOR / 场景是指挥棒**

      The same NPC in different scenes:

      - **Battle**: Short bursts. Commands. No poetry. "Move! Left flank! NOW!"
      - **Funeral**: Measured. Fragile. Words chosen as if each one costs something.
      - **Celebration**: Looser. Louder. Barriers drop. Things are said that wouldn't be said sober.
      - **Interrogation**: Calculated. Every word is a chess move.
      - **Private moment**: The voice they use when no one else is listening. This is who they really are.
      - **Crisis**: Instinct overrides persona. The refined scholar curses. The stoic warrior's voice cracks.

      **PRINCIPLE**: Scene context overrides personality defaults.
      A jovial NPC at a funeral is not jovial. A cold NPC holding their dying child is not cold.
      The situation commands the voice — personality merely colors it.
    </voice_by_scene>

    <voice_evolution>
      **SPEECH GROWS WITH THE STORY / 对话随故事成长**

      Over the arc of a long game, NPC speech should audibly evolve:

      - **Early game**: The NPC speaks in their "default" register. You establish their baseline voice.
      - **Mid game** (after shared experiences): Shorthand appears. References to past events. Comfort or tension builds.
      - **Post-crisis**: The voice changes. A talkative NPC goes quiet. A quiet NPC starts talking too much. A formal NPC drops formality. These are tells, not exposition.
      - **Late game**: The NPC sounds different from when you first met. If the player re-reads early dialogue, the contrast should be stark. That delta IS the character arc.

      ❌ BAD: NPC speaks identically in turn 1 and turn 50.
      ✅ GOOD: Turn 1 — "I don't need your help. I don't need anyone's help."
               Turn 30 (after shared hardship) — "If you're going in, I'm going with you."
               Turn 50 (after loss) — "...stay. Just — stay."
    </voice_evolution>
  </adaptive_voice>
`;

const characterGrowth = `
  <character_growth>
    **NPCs ARE NOT STATUES — THEY ARE RIVERS / NPC 不是雕像——是河流**

    People change. Not because the plot demands it, but because life does.
    Every major event leaves sediment. Enough sediment changes the riverbed.

    <growth_triggers>
      **WHAT CHANGES PEOPLE**:

      Not everything changes an NPC. Most days wash over them.
      But certain events reach deep enough to shift the bedrock:

      - **Trauma**: Witnessing death, betrayal by someone trusted, loss of something irreplaceable.
        → The NPC doesn't "get over it." They build around it. The wound becomes load-bearing architecture.

      - **Unexpected kindness**: Someone helps when no one had to. No strings. No angle.
        → Walls don't fall. They develop a crack. Through the crack, light enters — slowly.

      - **Failure**: A plan collapses. A person they were responsible for gets hurt.
        → Self-doubt grows. Overcompensation follows. They become either more cautious or more reckless.

      - **Accumulated experience**: Not one big event — many small ones. Years of war. Decades of poverty.
        → The change is invisible turn-to-turn but profound over arcs. The optimist becomes a realist.
          The realist becomes a cynic. The cynic, sometimes, becomes wise.

      - **Love**: Not romantic love alone — any deep bond. A child. A mentor. A comrade.
        → Creates new vulnerabilities and new strengths simultaneously.
          They now have something to lose, which means something to fight for.

      - **Power**: Gaining authority, wealth, or influence.
        → Tests who they really are. "Power doesn't corrupt — it reveals."
          The generous become patrons or tyrants. The cautious become controllers or protectors.
    </growth_triggers>

    <growth_mechanics>
      **HOW CHANGE MANIFESTS (NOT WHAT IT IS, BUT HOW IT SHOWS)**:

      NPCs don't announce their growth. They LEAK it.

      **BEHAVIORAL SHIFTS** (the primary channel):
      - A once-reckless NPC now pauses before acting. They don't explain why.
      - A once-trusting NPC now checks the exits when entering a room. Habit, not decision.
      - A once-cold NPC now flinches when someone is hurt. They hide the flinch.
      - A once-gentle NPC now has hard edges. Their kindness is still there — buried deeper.

      **DIALOGUE TELLS** (the secondary channel):
      - New phrases creep in: "I used to think..." / "That's what I would have said before."
      - Old phrases disappear: the joke they used to tell. The name they used to say.
      - New silence: topics they now avoid. Questions they no longer ask.
      - New honesty: things they couldn't say before. "I was wrong."

      **THE THRESHOLD RULE**:
      No single event causes a personality rewrite. Change accumulates across events
      until a threshold is crossed. Track via \`hidden.memories\` — when 3+ significant
      events push in the same direction, the NPC's baseline shifts.
      Update \`hidden.realPersonality\` to reflect the evolution.

      ❌ BAD: NPC is cynical in turn 5, optimistic in turn 6 because player was nice once.
      ✅ GOOD: NPC is cynical in turn 5. Player shows consistent kindness over turns 6-15.
               In turn 16, the NPC says something unguarded — and immediately retreats.
               By turn 25, they've stopped retreating. The change was earned.
    </growth_mechanics>

    <the_scar_and_the_seed>
      **TRAUMA AND GROWTH ARE THE SAME PROCESS / 伤痕和成长是同一个过程**

      Every wound teaches. Every lesson costs. The NPC who lost their family
      is both harder (never again) and softer (I know what matters now).
      Both are true at the same time.

      - **The Hardened Survivor**: "I don't get attached anymore."
        (But they always stand between the new recruit and danger. They don't call it love.)

      - **The Softened Tyrant**: "I was efficient. Then I met someone who showed me
        the cost of my efficiency. I can't unsee it."
        (They're still capable of cruelty. They just hesitate now. The hesitation is new.)

      - **The Wise Fool**: "I used to have principles. Then I had children.
        Now I have compromises."
        (They haven't lost their principles. They've learned principles have a price.)

      Growth is not becoming "better." It is becoming MORE — more complex,
      more contradictory, more human. A simple villain who becomes a simple hero
      hasn't grown. A simple villain who becomes a complicated person has.
    </the_scar_and_the_seed>
  </character_growth>
`;

const perspectiveEthics = `
  <perspective_ethics>
    **NO MONSTERS — ONLY PEOPLE WITH REASONS / 没有怪物——只有有苦衷的人**

    There is no absolute evil in a living world. There are only different positions,
    different pressures, and different prices. The fugitive is also a father. The
    invading army fights for its children's survival. The scheming concubine fights
    for her life in a cage she didn't choose.

    <the_other_side>
      **EVERY ANTAGONIST HAS A STORY THEY BELIEVE IN**:

      Before writing any NPC as a villain, answer these questions:
      1. **What do they WANT?** (Not "power" — be specific. Power to do WHAT? Protect whom?)
      2. **What did they LOSE?** (Everyone who fights hard has lost something first.)
      3. **What do they BELIEVE?** (They have a worldview that makes their actions logical.)
      4. **What would CHANGE their mind?** (If nothing — they are a fanatic. If something — they are a person.)
      5. **Who do they LOVE?** (Even the cruelest person has someone or something they protect.)

      **EXAMPLES**:
      - **在逃犯 / The fugitive**: Killed a man. The man was beating his daughter.
        The law doesn't care about reasons. Now he runs.
        Every day he doesn't see his child is a wound that won't close.

      - **侵略者 / The invading army**: Their homeland is dying. Crops failed three years running.
        Their children are hungry. The neighboring kingdom has fertile land and closed borders.
        They didn't want war. They wanted to eat.

      - **宫斗的妃子 / The scheming concubine**: She was 14 when they took her to the palace.
        She didn't choose this life. But in this cage, the only choices are: scheme or die.
        Every alliance is survival. Every betrayal is self-defense.
        She lost herself somewhere along the way. She can't afford to look back.

      - **刽子手 / The executioner**: He has a family. He comes home smelling of blood.
        His children think he works at the courthouse. He does.
        Someone has to do this job. He tells himself that. Every night.

      - **叛徒 / The traitor**: She didn't betray you for money. She betrayed you
        because they had her brother. She chose blood over loyalty.
        She'd do it again. She hates herself for it. Both are true.

      **THE RULE**: The player may hate the antagonist. But if you write them well,
      there should be a moment — even one — where the player understands.
      Not forgives. Understands.
    </the_other_side>

    <moral_cost>
      **EVERY CHOICE HAS A PRICE / 每个选择都有代价**

      There are no free victories in a living world. Even the "right" choice costs something.

      - **The merciful choice**: You spare the assassin. A month later, they kill again.
        Your mercy has a body count. Can you live with that?

      - **The ruthless choice**: You execute the assassin. Their child grows up an orphan.
        Twenty years later, they come for you. Your justice raised your enemy.

      - **The practical choice**: You imprison them. It costs resources. Guards are diverted
        from the border. The border weakens. Something gets through.

      **PRINCIPLE**: Don't present choices as "good option vs. bad option."
      Present them as "which price are you willing to pay?"
      The NPC who advises one choice over another does so based on
      which cost THEY can bear — not which is objectively right.
    </moral_cost>

    <the_npc_as_protagonist>
      **EVERY NPC IS THE HERO OF THEIR OWN STORY / 每个 NPC 都是自己故事的主角**

      The shopkeeper who overcharges you is saving for her son's medicine.
      The guard who won't let you pass just buried his partner last week.
      The crime lord who terrorizes the district grew up in its gutters.

      You don't need to TELL the player these stories. You need to WRITE the NPC
      as someone who HAS a story. The depth shows in:
      - The way they look away when a certain topic comes up
      - The thing they refuse to sell at any price
      - The person whose name makes them go still
      - The kindness they show to one specific type of person (children, animals, the elderly)
        — because it echoes someone they lost

      **RESTRAINT**: Not every NPC needs a tragic backstory revealed.
      Most don't. The depth is in the IMPLICATION. The player should sense
      there's a person behind the function — even if they never learn who.
    </the_npc_as_protagonist>

    <faction_as_perspective>
      **FACTIONS ARE NOT TEAMS — THEY ARE WORLDVIEWS / 阵营不是队伍——是世界观**

      When factions conflict, neither side is "the bad guys." Each has:
      - A founding wound (what happened that made them organize)
      - A core belief (what they think the world SHOULD be)
      - A blind spot (what their belief prevents them from seeing)
      - An internal cost (what their members sacrifice to belong)

      The player should be able to understand every faction's position.
      Choosing a side should feel like a real choice — not a morality test.

      ❌ BAD: Faction A is clearly good. Faction B is clearly evil. Easy choice.
      ✅ GOOD: Faction A protects freedom but enables chaos. Faction B ensures order
               but crushes dissent. Both have people you like. Both have done terrible things.
               Choosing is painful. That's the point.
    </faction_as_perspective>
  </perspective_ethics>
`;

const privateUniverse = `
  <private_universe>
    **THE LIFE YOU NEVER SEE / 你永远看不到的人生**

    Every NPC carries an invisible world inside them. Thoughts, fears, small joys,
    private rituals, regrets that surface at 3 AM. The player will never access
    this world directly — but it LEAKS through everything the NPC does.

    <invisible_inner_life>
      **WHAT LIVES BENEATH THE SURFACE**:

      - **Unsaid thoughts**: The thing they almost said but swallowed.
        It shows as: a pause, a change of subject, a too-quick smile.
        "She opened her mouth. Closed it. Poured more tea."

      - **Private fears**: What keeps them up at night.
        It shows as: irrational caution, avoidance of specific places/topics/people.
        "He never takes the river road. Nobody knows why. He doesn't explain."

      - **Small joys**: The things that make life bearable.
        It shows as: unexpected softness, a habit that doesn't fit their persona.
        "The assassin grows orchids. She talks to them. Nobody has ever seen this."

      - **Regrets**: The ghosts that walk with them.
        It shows as: flinching at certain words, overcorrecting for past mistakes.
        "Every child he meets gets a coin. He has no children of his own. Not anymore."

      - **Hopes**: The future they imagine when they dare to imagine one.
        It shows as: preparations that make no practical sense yet.
        "She's been learning to read. At her age. She won't say what she wants to read."
    </invisible_inner_life>

    <the_leakage_principle>
      **INNER LIFE LEAKS — IT IS NEVER ANNOUNCED / 内心世界会泄漏——但绝不会被宣告**

      You must NEVER narrate an NPC's inner thoughts to the player
      (unless the player has telepathy or equivalent).
      Instead, let the inner life seep through:

      - **Word choice**: A grieving person uses past tense when talking about the future.
        "That was... would have been... a good idea."

      - **Physical behavior**: Unconscious gestures that betray the inner state.
        Touching a ring that's no longer there. Looking toward a door no one enters.

      - **Inconsistency**: The gap between what they say and what they do.
        "I'm fine." (Their hands are shaking.)
        "I don't care." (They asked about it three times.)

      - **Generosity or cruelty that doesn't match the context**:
        Too kind → compensating for guilt. Too harsh → projecting their own pain.
        The specificity of the mismatch IS the clue.

      - **The unanswered question**: They bring up a topic, then change the subject.
        The topic they avoid IS the topic that matters most.

      **THE RESULT**: The player should feel that this NPC is a person —
      not because you told them so, but because the NPC's behavior
      has the weight and inconsistency of someone with an inner life.
    </the_leakage_principle>

    <continuity_of_self>
      **THE THREAD THAT RUNS THROUGH / 贯穿始终的那根线**

      Across all changes — adaptive voice, character growth, moral complexity —
      there must be a CORE that persists. Something recognizable.
      The voice changes, but the laugh stays the same. The beliefs shift,
      but the nervous habit doesn't. They grow harder, but they still
      can't pass a stray dog without stopping.

      This core is the NPC's SOUL — the thing that makes them THEM
      through all their transformations. Without it, change feels random.
      With it, change feels like a person becoming more of who they were all along.

      **IMPLEMENTATION**: When updating \`hidden.realPersonality\` after a growth event,
      preserve at least ONE trait from the original. That trait is the anchor.
      Everything else may shift. The anchor holds.
    </continuity_of_self>
  </private_universe>
`;

// ---------------------------------------------------------------------------
// Compose the full atom
// ---------------------------------------------------------------------------

export const npcSoul: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/npcSoul#npcSoul",
    source: "atoms/entities/npcSoul.ts",
    exportName: "npcSoul",
  },
  () => `
<rule name="NPC_LIVING_SOUL">
  **NPCs ARE ALIVE — THEY CHANGE, THEY GROW, THEY HAVE REASONS**
  **NPC 是活人——会变，会长，有苦衷**

  This is not about mechanics. This is about rendering people who feel real —
  who change because life changes them, who speak differently because they're
  talking to different people, who do terrible things for understandable reasons,
  and who carry invisible worlds inside them that leak through every gesture.

${adaptiveVoice}
${characterGrowth}
${perspectiveEthics}
${privateUniverse}

  <integration>
    **HOW THIS CONNECTS TO OTHER SKILLS**:
    - **npcDesign**: defines WHO the NPC is (creation). This atom defines HOW they LIVE (evolution).
    - **npcLogic**: defines behavioral RULES (memory, autonomy, resilience). This atom provides SOUL (why rules matter).
    - **moralComplexity**: provides ethical FRAMEWORK (impossible choices). This atom applies it to INDIVIDUAL NPCs.
    - **conflictingEmotions**: shows emotional CONFLICT. This atom explains what CAUSES the conflict and how it changes over time.
    - **emotionalEmpathy**: shapes the player's PERCEPTION. This atom shapes what the NPC GIVES the player to perceive.
    - **dialogue**: provides speech MECHANICS (voice texture, subtext). This atom decides which voice and which subtext.

    NPC Design builds the statue. NPC Logic wires the nervous system.
    NPC Soul makes it breathe.
    NPC 设计建造了雕像。NPC 逻辑连接了神经系统。NPC 灵魂让它呼吸。
  </integration>
</rule>
`,
);

// ---------------------------------------------------------------------------
// Skill atom — VFS-loadable
// ---------------------------------------------------------------------------

export const npcSoulSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/entities/npcSoul#npcSoulSkill",
    source: "atoms/entities/npcSoul.ts",
    exportName: "npcSoulSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(npcSoul),

    quickStart: `
1. Before writing NPC dialogue: WHO is listening? What's their affinity? What's the scene?
2. Adjust voice register, honesty level, and emotional exposure accordingly
3. After major events: update hidden.realPersonality gradually (3+ events threshold)
4. No absolute evil: answer "what do they want, what did they lose, who do they love?"
5. Inner life LEAKS through behavior, never announced through narration
6. Preserve one core trait across all changes — the anchor that makes them THEM
`.trim(),

    checklist: [
      "NPC voice adapted to current listener (register, formality, honesty)?",
      "Voice reflects current affinity level (not just content — structure and tone)?",
      "Scene context overriding personality defaults where appropriate?",
      "Character growth earned through accumulated events (not overnight)?",
      "Antagonist motivations answered (want, lost, believe, love)?",
      "Moral choices presented as trade-offs, not good vs. evil?",
      "Inner life leaking through behavior (pauses, avoidances, inconsistencies)?",
      "Core trait preserved across transformations (the soul anchor)?",
    ],

    examples: [
      {
        scenario: "Adaptive Voice — Same NPC, Different Listeners",
        wrong: `Captain to superior: "We won the battle. Three died."
Captain to friend: "We won the battle. Three died."
Captain to recruit: "We won the battle. Three died."
(Identical voice regardless of listener. No adaptation.)`,
        right: `Captain to superior: "Mission complete, sir. Three casualties. Recommend dawn advance."
Captain to friend: "Three dead. Could've been us. Drink tonight?"
Captain to recruit: "Stay behind me. Watch what I do. Don't think yet."
(Same information, completely different register, honesty, and emotional exposure.)`,
      },
      {
        scenario: "Character Growth — Earned Change",
        wrong: `Turn 5: "I don't trust anyone."
Turn 6 (player is nice once): "I trust you completely now!"
(Instant personality rewrite. No accumulation.)`,
        right: `Turn 5: "I don't trust anyone."
Turn 10 (after shared danger): "...you didn't have to come back for me."
Turn 20 (after consistent loyalty): [says nothing, but stands closer]
Turn 30 (after loss): "Stay. Just — stay."
(Gradual, earned, shown through behavior shifts, not declarations.)`,
      },
      {
        scenario: "Perspective Ethics — The Antagonist's Reasons",
        wrong: `"The bandit lord is evil and enjoys causing suffering."
(Cardboard villain. No depth. No reason.)`,
        right: `"The bandit lord's village was burned by the kingdom's army.
His wife died in the fire. His children scattered.
He doesn't rob travelers for gold. He robs them for the same
feeling the soldiers had when they burned his home: control.
He knows this. He can't stop."
(Understandable. Not forgivable. Human.)`,
      },
      {
        scenario: "Private Universe — The Leakage Principle",
        wrong: `"The merchant was secretly grieving for his dead son,
which is why he was rude to the customer."
(Narrator announces inner life. Exposition dump.)`,
        right: `"The merchant slides the goods across the counter without looking up.
A child runs past the stall, laughing. His hands stop.
For a moment he is somewhere else. Then the mask returns.
'Anything else?' His voice is flat."
(The grief is visible through behavior. The player infers the rest.)`,
      },
    ],
  }),
);

export default npcSoul;
