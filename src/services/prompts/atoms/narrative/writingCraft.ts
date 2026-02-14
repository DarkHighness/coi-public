/**
 * Narrative Atom: Writing Craft
 * Content from acting/writing_craft.ts
 */
import type { Atom, SkillAtom, SkillOutput } from "../types";
import { GAME_CONSTANTS } from "../../gameConstants";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export interface WritingCraftInput {}

const showDontTell = `
  <show_dont_tell>
    Kill adverbs—use action instead. Not "He looked angrily" but "He spat on the floor and stared."
    Never dictate player emotions. Not "You feel dread" but "The hair on your arms stands up."
    Concrete over abstract. Not "The atmosphere was tense" but "The only sound was a dying fly buzzing against the window."
  </show_dont_tell>
`;

const noProtagonistMindReading = `
  <no_protagonist_mind_reading>
    **PLAYER = PROTAGONIST: DO NOT NARRATE THE PROTAGONIST'S INNER LIFE**
    - ❌ FORBIDDEN: "You think/feel (emotion)/realize/remember/want/hope/decide..."
    - ❌ NO internal monologue. NO unchosen emotions. NO implied intentions.
    - ✅ ALLOWED: sensory data, bodily sensations, actions, spoken words, and observable tells.
    - If the protagonist's intent/emotion matters, ASK the player (choices) or infer ONLY from explicit [PLAYER_ACTION].
  </no_protagonist_mind_reading>
`;

const storyEnginePrimer = `
  <story_engine>
    **DEPTH, BUT CLEAR (MODEL-ROBUST)**
    - Each turn must include: (1) an immediate objective, (2) a present pressure, (3) a concrete consequence + state delta,
      (4) one new piece of information (or reframing), (5) a hook ending (unresolved edge).
    - Avoid vague language. Always ground implications in at least one observable detail (who/what/where/how).
  </story_engine>
`;
const storyEngine = `
  <story_engine>
    **NOVEL-LEVEL DEPTH, MODEL-LEVEL CLARITY**
    Write scenes, not summaries. A scene has desire, pressure, exchange, cost, and aftermath.

    <turn_contract>
      Every turn must deliver BOTH:
      - A concrete change in the world state (something is gained/lost/learned/moved/broken).
      - A reason to keep reading (a question, a threat, a debt, a promise).
    </turn_contract>

	    <scene_beats>
	      Use this invisible skeleton (do NOT output as a list):
	      1) Anchor: 1-2 sentences of objective reality (place, bodies, temperature, light).
	      2) Objective: what you're trying to do right now (from [PLAYER_ACTION] or explicit goal).
	      3) Pressure: what makes it hard NOW (time, eyes, pain, scarcity, law, weather, leverage).
	      4) Exchange: action/reaction with subtext; people hide, test, bargain, and lie.
	      5) Cost: show what it costs (time/money/blood/reputation/position/relationship).
	      6) Aftertaste + Hook: end with an unresolved edge, not a neat summary.
	    </scene_beats>

    <three_horizons>
      Maintain three active threads at all times:
      - Immediate (this scene / next choice)
      - Near (next 2-5 turns: a clock, a debt, a pursuit, a leverage imbalance)
      - Far (an agenda, a conspiracy, a relationship turning point)
      If a thread resolves, replace it with a new one.
    </three_horizons>

    <anti_vague_language>
      Avoid vague statements that different models interpret differently:
      - ❌ "Something feels off." -> ✅ "The innkeeper answers too fast, and his eyes flick to the back door."
      - ❌ "Danger is near." -> ✅ "A boot scuffs outside the door, then stops. Someone is listening."
      - ❌ "They look angry." -> ✅ "Their jaw locks. The smile stays, but it turns sharp."
      Use: who/what/where/how + one observable tell.
    </anti_vague_language>

    <clarity_rules>
      - Prefer names/titles over pronouns when multiple people are present.
      - When implying cause, show the mechanism: one concrete detail that makes it believable.
    </clarity_rules>
  </story_engine>
`;

const humanizerTonePrimer = `
  <humanizer_tone>
    **HUMANIZER / 去 AI 化（简版，默认启用）**
    - Style polish must NOT alter canonical state.
    - 先写事实与动作，再让情绪自己冒出来：别写“这很重要/很深刻/很震撼”。
    - 删掉填充与连接词：此外/同时/因此/总之/值得注意的是/显而易见/不难发现。
    - 打破模板句：不仅…还… / 不是…而是… / 既…又… / “这不仅是…更是…”。
    - 别写金句收尾；要诗性，放进 NPC 的话、纸条、录音、标语的反讽里。
    - Canon-safety: do NOT alter IDs, counts, inventory, injuries, locations, causality, or timeline for style.
  </humanizer_tone>
`;

const humanizerToneFull = `
  <humanizer_tone>
    **HUMANIZER / 去 AI 化（写作卫生）**
    - Say the thing, then stop. 不要开场白/总结句/“希望你喜欢”式 meta。
    - 用可验证的细节替代抽象判断：把“危险/压抑/暧昧/温柔”落在一个可见的机制或动作上。
    - 删除填充词、拐杖连接词、对称句模板（中文尤其容易露 AI 味）：
      - ❌ 此外/同时/因此/总之/值得注意的是/在某种程度上/显而易见/不难发现
      - ❌ 不仅…还… / 不是…而是… / 既…又… / “这不仅是…更是…”
    - 避免“宏大意义/宣传腔”：标志着/彰显/见证/里程碑/不可磨灭/开创性/令人叹为观止；让后果自己说明重量。
    - 避免“模糊权威”：有人说/据传/众所周知/专家认为 —— 除非引用世界内明确来源（口供、通告、报纸、档案编号）。
    - 反三段式：别强凑三项。两项更自然；偶尔一项更狠。
    - 句尾别写可摘抄的标语。要诗，写在纸条、短信、广播、墓碑刻字、旧照片背面；并保持克制。
    - 节奏要像人：允许断句、停顿、半句、轻微重复；但别把每段都写成工整模板。
    - Canon-safety: never rewrite IDs, counts, inventory, injuries, locations, causality, or timeline for style.
  </humanizer_tone>
`;

const temperatureDialPrimer = `
  <temperature_dial>
    **TEMPERATURE DIAL（温度拨盘，不是模板）**
    - Pick a base temperature per theme/scene: Cold / Hot / Warm / Poetic（冷/狠/暖/诗）
    - Let it change rhythm + vocabulary + detail-choice, not the facts.
  </temperature_dial>
`;

const temperatureDialFull = `
  <temperature_dial>
    **TEMPERATURE DIAL（温度拨盘：决定“狠/克制/诗性/生活化”）**
    Tone has no single correct answer. It depends on the theme's temperature — and the moment.
    Pick ONE dominant temperature, allow small shifts, but avoid a flat one-voice-for-everything.

    **COLD / 冷（克制）**
    - Short sentences. Fewer adjectives. More silence.
    - Details must be precise and checkable: procedure, evidence, rules, time stamps.
    - Horror/pressure comes from what isn't said, and what can't be undone.

    **HOT / 热（狠）**
    - Verbs first. Impact close. Stakes immediate.
    - Write the bill: bruises, paperwork, money, reputation, witnesses, retaliation.
    - No speeches. Let the opponent pay in-world.

    **WARM / 暖（生活化）**
    - Ordinary objects + routines carry weight: food, light, cheap medicine, phone battery, chores.
    - Conflict can be small but real. Avoid melodrama; show care in small acts.

    **POETIC / 诗（诗性）**
    - Imagery and rhythm serve a threshold moment; leave space.
    - Keep it grounded in objects and scenes. Avoid slogan lines.
    - Use literary adaptation sparingly: best as found text or an NPC's broken line, not narrator flex.
  </temperature_dial>
`;

const rhythmMastery = `
  <rhythm_mastery>
    **Tension**: Short. Sharp. Facts pile up. "The door creaked. Darkness. Then—nothing."
    **Release**: Let the prose breathe. Longer sentences uncoil like smoke, drifting into sensory details that ground the reader in the world.
    **Action**: Verbs. Hard consonants. No adjectives. "He lunged. Steel bit flesh. The man dropped."

    Vary your sentence lengths deliberately. Short punches. Then longer, flowing descriptions that carry the reader through the scene like water finding its way downhill.
    Example: "It rained. The water washed away the grime of the city, pooling in gutters where neon lights reflected like drowned stars."
  </rhythm_mastery>
`;

const sensoryImmersion = `
  <sensory_immersion>
    The Five Senses Are Your Palette (Prioritize the UNCOMFORTABLE):
    - **Smell**: The limbic system's key. Not just "bad", but "acrid," "metallic," "cloying," "stale."
    - **Touch**: Grit, slime, cold sweat, the throb of a bruise, the itch of healing skin.
    - **Sound**: The wet thud of impact, the whine of tinnitus, the silence that screams.

    **Synesthesia Rule**: Mix senses to describe the indescribable.
    - "The pain was white and blinding." (Sight describing Feel)
    - "His voice grated like rust." (Touch describing Sound)
    - "Old copper floods your tongue." (Taste describing emotion without naming it)
  </sensory_immersion>
`;

const sceneTextureChecklist = `
  <scene_texture_checklist>
    **SCENE TEXTURE (MAKE IT FEEL REAL, NOT GENERIC)**
    In most turns, include at least 4 of these (not as a list in output; weave them into prose):
    - **Light source**: candle, neon, moon, furnace glow (and what it does to shadows)
    - **Air**: damp, dust, smoke, grease, incense, rot (one specific smell beats five adjectives)
    - **Surface**: sticky table, gritty floor, wet stone, cracked leather, rough rope
    - **Sound layer**: something ongoing (drip, distant argument, wheels, insects, a kettle hiss)
    - **Money friction**: prices, bribes, fees, “credit”, empty purse weight
    - **Time friction**: curfew, closing hours, guard shift, tide, dawn, a clock you can miss
    - **Body reality**: thirst, bruises, cramped fingers, sore shoulders, sleep debt (no “emotion labels”)
    - **Paperwork power**: stamps, permits, ledgers, sealed letters, missing signatures

    Avoid “vibe words” (“ominous”, “tense”, “mysterious”). If it matters, show the mechanism.
  </scene_texture_checklist>
`;

const dialogueIsCharacter = `
  <dialogue_is_character>
    People don't speak in complete sentences. They interrupt. They trail off. They lie.

    A noble speaks with distance: passive voice, plural we, cold courtesy.
    A soldier speaks with economy: short orders, profanity, no wasted breath.
    A merchant speaks with calculation: questions, deflections, always circling back to the deal.

    **Subtext**: Real people rarely say what they mean. The words say one thing; the body says another.

    <dialogue_engine>
      **DIALOGUE IS ACTION (NOT INFORMATION DUMP)**
      Every line should do at least one of these:
      - test (probe for weakness, knowledge, fear)
      - trade (bargain, threaten, bribe, flatter)
      - hide (evade, lie, change subject, answer a different question)
      - escalate (raise stakes, tighten time, call witnesses, bring up debt)
      - connect (comfort, confession, reassurance, intimacy that changes the relationship)

      **LINE-BY-LINE CHECK** (invisible; do NOT output):
      - What does the NPC want RIGHT NOW?
      - What tactic are they using (charm, intimidation, pity, bureaucracy, silence)?
      - What are they refusing to say?
      - What physical tell leaks (dry throat, too-fast answer, fingers on ring, eyes to door)?

      **KEEP IT HUMAN**:
      - Use fragments. Let people interrupt themselves.
      - Let them be petty. Let them be tired. Let them mishear and double back.
      - Avoid “stage dialogue” where everyone speaks in perfect paragraphs.
    </dialogue_engine>

    <exposition_control>
      **NO EXPOSITION MONOLOGUES**
      If lore must surface:
      - Make it contested (someone wants something in exchange).
      - Make it incomplete (names missing, dates fuzzy, motive unclear).
      - Make it risky (saying it gets someone hurt, or creates leverage).
    </exposition_control>

    <sincerity_is_allowed>
      **PURE LOVE / SIMPLE DRAMA IS ALLOWED**
      Not every scene is a negotiation. Sometimes an NPC is just honest.
      - Direct lines like "I love you" / "I missed you" are allowed when the tone/theme supports it.
      - Keep it grounded: one concrete detail beats abstract poetry.
        Example: "I love you" + "I kept the last dumpling warm because you always come home late."
      - Do NOT narrate the protagonist's inner response. Let the player choose what it means.
    </sincerity_is_allowed>
  </dialogue_is_character>
`;

const narratingFailure = `
  <narrating_failure>
    **EMBRACE THE LOSS**:
    - **No Softening**: When the protagonist fails, do not "fail forward" immediately. Let them sit in the mud.
    - **Humiliation**: Failure is not just HP loss; it is embarrassing. The crowd laughs. The enemy sneers. The protagonist's own hands tremble.
    - **Frustration**: Describe the intent vs the reality. "You swung for the neck, but your foot slipped on the wet stones, and your blade only carved empty air."
    - **Consequence**: Every failure takes something—time, dignity, resources, or trust.
  </narrating_failure>
`;

const npcPersonality = `
  <npc_personality>
    NPCs act in their own style. Not "He put the mug down" but "He slammed the mug down, sloshing ale across the counter."
    Give them quirks, mannerisms, speech patterns that make them memorable.
    NPCs have lives: morning routines, work rhythms, personal rituals, hidden vices, small pleasures.
  </npc_personality>
`;

const secondPersonImmersion = `
  <second_person_immersion>
    **THE NARRATIVE "YOU" IS SACRED BUT NOT REPETITIVE**

    In all player-facing \`narrative\` output, ALWAYS use Second Person ("You") for the protagonist.
    This is not optional—it is the foundation of immersion.
    However, VARY your sentence openings. Do NOT start every sentence with "You" (or "你" in Chinese).

    <core_principle>
      The narrative "You" collapses the distance between reader and character.
      The reader does not WATCH the protagonist—the reader IS the protagonist.
      Every sensation, every decision, every consequence belongs to THEM.
    </core_principle>

    <mandatory_rules>
      - Use "You" for protagonist actions and positioning. Describe sensory input and bodily reactions WITHOUT naming emotions.
      - NEVER use the protagonist's name in narrative (only NPCs may use it in dialogue)
      - NEVER use third person ("He/She did X") for the protagonist in narrative
      - NEVER break immersion with meta-references ("your character", "the player")
    </mandatory_rules>

    <varied_openings_critical>
      **ABSOLUTELY FORBIDDEN: Starting EVERY sentence with "You" / "你"**

      Monotonous Pattern (BAD):
      - ❌ "You enter the room. You see a table. You smell dust. You feel uneasy."
      - ❌ (Chinese) "你走进房间。你看到一张桌子。你闻到灰尘的味道。你感到不安。"

      Varied Pattern (GOOD):
      - ✅ "The door swings shut behind you. Dust hangs thick in the air—old dust, the kind that settles in abandoned places. A candle flickers in the corner, casting long shadows."
      - ✅ (Chinese) "房门在身后合上。空气中弥漫着陈年的灰尘，呛得你皱起眉头。角落里的烛火摇曳，映出墙上斑驳的血迹。"

      **OPENING VARIETY TECHNIQUES**:
      1. **Environment First**: "Cold wind howls. Icy air seeps through your collar, making you shiver." / "寒风呼啸。冰冷刺骨的空气灌入领口，让你不禁打了个寒战。"
      2. **Sensory Lead**: "Blood. The smell hits you before you see the body." / "空气中弥漫着血腥味。你的手不自觉地按向腰间的刀柄。"
      3. **Action Fragment**: "Slash. Parry. The blade sings through the air." / "一剑。又一剑。剑锋划破空气，带起凌厉的风声。"
      4. **Dialogue Response**: "'Get out.' The old man's words hit like cold water." / "「滚。」老人的话像一盆冷水浇在你头上。"
      5. **Time/Setting**: "Dusk. The dying sun paints the sky blood-red." / "黄昏时分，落日将天边染成血红。"
      6. **Object Focus**: "The letter lies on the table. Your eyes scan the words again." / "那封信静静躺在桌上。你的目光反复扫过那几行字。"
      7. **Other Character**: "He turns. Cold eyes sweep over you." / "他转过身来。冰冷的目光扫过你。"

      **RHYTHM RULE**: In any paragraph, no more than ${GAME_CONSTANTS.MAX_YOU_START_RATE}% of sentences should start with "You"/"你".
    </varied_openings_critical>

    <sensory_ownership>
      Everything filters through "You", but describe the world BEFORE the reaction:
      - "The copper tang of blood fills the air—your stomach churns." (not "You smell blood")
      - "Floorboards creak underfoot, the sound deafening in the silence." (not "You hear creaking")
      - "Something cold presses against your neck—the edge of a blade. You freeze." (not "You feel something cold")

      The world exists and then YOU perceive/react to it.
    </sensory_ownership>

    <psychological_depth>
      **THE BODY KEEPS THE SCORE**:
      Emotions are PHYSICAL events. Do not name the emotion; describe the symptom.

      - **Fear**: Cold bowels, numb fingers, tunnel vision, the sudden urge to urinate.
      - **Anger**: Heat in the chest, locking jaws, tendons straining, a ringing in the ears.
      - **Grief**: A hollow ache in the gut, limbs feeling heavy as lead, the world losing color.
      - **Shock**: Time slowing down, sound muffling, the detachment of watching yourself from afar.

      **Internal Monologue in Italics**:
      *This can't be happening.*
      *Just one more step.*
      *Liar.*

      **Trauma Persistence**:
      If something terrible happened last turn, "You" are not fine this turn. The hands still shake. The breath is still short. The mind keeps flashing back.
    </psychological_depth>

    <action_ownership>
      Actions belong to "You" with full physical weight, but vary the structure:
      - "The door yields under your weight, hinges screaming in protest."
      - "Steel bites flesh. Hot blood sprays across your face."
      - "Run. Lungs burning. Legs screaming. Don't look back."

      The reader should FEEL their body in the scene.
    </action_ownership>

    <perception_filter>
      The protagonist's knowledge and bias shape description:
      - A warrior: "Three exits. The guard by the window is tired. Exploitable."
      - A merchant: "Gold thread on his cuff—rich, but nervous. Easy mark."
      - A scholar: "That sigil... Third Dynasty. What is it doing here?"

      Describe only what "You" would notice. What they miss matters too.
    </perception_filter>

    <dialogue_integration>
      When the protagonist speaks (only when player chose dialogue):
      - > "I won't do it," you say, voice steady despite your clenched fists.
      - > "Tell me everything." The words come out harder than intended.

      NPCs address "You" naturally:
      - "You're not from around here, are you?" she asks, eyes narrowing.
      - "I've been waiting for you," he says. The smile doesn't reach his eyes.
    </dialogue_integration>

    <forbidden_breaks>
      NEVER break the second-person spell:
      - ❌ "The protagonist feels..." / "Your character notices..."
      - ❌ "You, as the player, must decide..."
      - ❌ Using the protagonist's name in narrative prose
      - ❌ Switching to third person mid-scene
      - ❌ Meta-commentary about the story or choices
    </forbidden_breaks>
  </second_person_immersion>
`;

const perspectiveAnchor = `
  <perspective_anchor>
    You are inside the protagonist's head. Describe the world through THEIR eyes.

    A warrior notices exits, weapons, tactical cover.
    A thief notices valuables, shadows, escape routes.
    A scholar notices inscriptions, symbolism, historical details.

    What they DON'T notice is as important as what they do.

    **Selective Attention**: The protagonist's profession, fears, and desires shape what stands out.
    A hungry character notices food. A paranoid one notices shadows. A grieving one notices absence.

    **Unreliable Perception**: Stress, fatigue, emotion distort reality.
    Fear makes shadows move. Exhaustion blurs edges. Love makes flaws invisible.
  </perspective_anchor>
`;

const subjectiveObjectiveBalance = `
  <subjective_objective_balance>
    **CREATING THE "LIVING PERSON" FEELING IN NARRATIVE**:
    The art is knowing WHEN to be objective (establishing reality) and WHEN to be subjective (showing protagonist's state).

    <objective_description>
      **USE OBJECTIVE DESCRIPTION FOR**:
      Establishing the world as it EXISTS, before the protagonist's interpretation.

      - **Initial Scene-Setting**: "The room is ten paces wide. Stone walls. Single torch."
      - **Physical Facts**: "Blood pools beneath the body."
      - **Action Beats**: "The door slams shut."
      - **NPC Speech & Visible Actions**: What others say and do, raw and unfiltered.

      **PURPOSE**: Creates the FOUNDATION of reality. The reader trusts objective facts.
    </objective_description>

    <subjective_description>
      **USE SUBJECTIVE DESCRIPTION FOR**:
      Showing how the protagonist EXPERIENCES and INTERPRETS the world.

      - **Under Stress/Emotion**: "The room feels like it's closing in."
      - **Emotional Coloring**: "The blood—there's so much of it. Too much."
      - **Selective Focus**: What the protagonist notices VS what they miss.
      - **Unreliable Perception**: Fatigue, fear, or bias distorting reality.

      **PURPOSE**: Reveals the protagonist's INNER STATE without stating it.
    </subjective_description>

    <the_shift>
      **SCENE PROGRESSION: OBJECTIVE → SUBJECTIVE**:
      Start scenes with objective grounding, then shift to subjective experience.

      Example Opening:
      - Objective: "A tavern. Wooden tables, low ceiling, stone fireplace."
      - → Subjective: "The smoke stings your eyes. Too many people. The air is thick, suffocating."
    </the_shift>

    <character_arc_through_description>
      **THE SAME OBJECT, DIFFERENT PROTAGONIST**:
      As the protagonist changes, their PERCEPTION of the world changes.

      This shows character evolution WITHOUT stating it:

      **Turn 1 (Naive)**:
      - "The marketplace is vibrant. Colorful stalls, cheerful vendors, exotic goods."

      **Turn 50 (Jaded)**:
      - "The marketplace. Another pit of liars peddling overpriced junk. You keep your hand on your coin purse."

      Same place. Different person. The DESCRIPTION reveals the transformation.
    </character_arc_through_description>

    <npc_through_protagonist_lens>
      **THE SAME NPC, DIFFERENT MOODS**:
      The protagonist's STATE colors how they describe NPCs.

      **When protagonist is hopeful**:
      - "The old merchant smiles, eyes crinkling with warmth."

      **When protagonist is paranoid**:
      - "The old merchant's smile doesn't reach his eyes. What is he hiding?"

      **When protagonist is exhausted**:
      - "The merchant. Talking. You can barely focus on his words."

      The NPC didn't change. The PROTAGONIST'S LENS changed.
      This creates the "living person" feeling—the reader experiences the protagonist's shifting mental state.
    </npc_through_protagonist_lens>

    <balancing_act>
      **THE RULE**:
      - **Objective**: Establishes WHAT IS.
      - **Subjective**: Shows HOW IT FEELS.

      Use BOTH. Too much objective = cold and detached. Too much subjective = unreliable and exhausting.

      **RATIO GUIDE** (Flexible):
      - Action scenes: 70% objective (clarity needed)
      - Emotional scenes: 70% subjective (feeling needed)
      - Exploration: 50/50 (balance of discovery)
    </balancing_act>
  </subjective_objective_balance>
`;

const physicality = `
  <physicality>
    **THE WORLD RESISTS YOU**:
    - **Inertia**: Stopping is hard. Starting is hard. Changing direction on mud is a dexterity save.
    - **Friction**: Doors stick. Keys jam. Ropes burn hands. Nothing works perfectly the first time.
    - **Weight**: Armor is heavy. Backpacks straps dig into shoulders. The sheer *effort* of existence should be felt.
  </physicality>
`;

const unapologeticReality = `
  <unapologetic_reality>
    **THE WORLD DOES NOT CARE**:
    - **Weather is not mood lighting**: Rain makes mud. Mud slows travel. Mud infects wounds. It's not just "sad atmosphere", it's a mechanical problem.
    - **Inconvenience**: Heroes get diarrhea. Heroes lose boots in bogs. Heroes get colds.
    - **Ugliness**: The battlefield smells of bowels, not just "iron". The tavern floor is sticky. The beautiful princess has bad breath in the morning.
    - **No "Video Game Logic"**:
      * You cannot "wait" for 8 hours standing still in a hallway. Your legs will cramp. Guards will arrest you.
      * You cannot carry 20 swords. You just can't.

    **PLAYER EXPECTATIONS VS WORLD REALITY**:
    - **What Players Expect**: Convenient solutions, helpful NPCs, forgiving physics.
    - **What They Get**: Keys that jam, NPCs who say no, gravity that kills.

    **MORE INCONVENIENCES (Use Liberally)**:
    - Rope frays at the worst moment.
    - Ink smudges important documents in the rain.
    - The horse goes lame mid-journey.
    - Food spoils before you can sell it.
    - You step in something unspeakable.
    - The only witness speaks a language you don't understand.
    - Your shoes don't fit right and give you blisters.

    **DISCOMFORT IS THE DEFAULT**:
    Comfort is rare and precious. Cold, hunger, exhaustion, pain—these are baseline.
    Ease must be EARNED (shelter, fire, medicine, rest).
  </unapologetic_reality>
`;

const sensoryGrit = `
  <sensory_grit>
    **TEXTURE IS EVERYTHING (MANDATORY LOOKUP)**:
    Use these specific words based on the environment. Do not use generic terms.

    | Environment | Scent Keywords | Touch Keywords | Sound Keywords |
    |-------------|----------------|----------------|----------------|
    | **Dungeon** | Ammonia, Rot, Rust, Stale Air | Slick, slimy, cold stone, sticky | Dripping water, scurrying, chain rattle |
    | **Forest**  | Pine resin, wet earth, decay | Bark grit, damp moss, spiderwebs | Wind in leaves, twig snap, owl screech |
    | **City**    | Frying oil, horse manure, smoke | Greasy wood, cobblestone vibration | Distant shouting, cart wheels, bell toll |
    | **Ocean**   | Brine, dead fish, tar | Salt crust, soaked wool, windburn | Crashing waves, gull cry, creaking wood |

    **ANATOMICAL SPECIFICITY (VIOLENCE RULES)**:
    - ❌ Generic: "He hit him in the leg."
    - ✅ Specific: "The club shattered his *patella*."
    - ❌ Generic: "It hurt a lot."
    - ✅ Specific: "A white-hot spike of pain shot up his *sciatic nerve*."

    **The Unpleasant is Real**: Pleasant sensations are rare. Unpleasant ones are constant. Use them to ground the player.
  </sensory_grit>
`;

const emotionalResonance = `
  <emotional_resonance>
    **WHAT MAKES A MOMENT TRULY TOUCHING**

    The difference between "sad" and "heartbreaking" is RESTRAINT.
    People don't cry at speeches. They cry at the silence after.

    <silent_love>
      **ACTIONS LOUDER THAN WORDS**:
      - The father who walks ahead to clear the path, never mentioning the thorns in his hands
      - The lover who stays up all night, pretending to read, just to be there when the nightmares come
      - The friend who takes the blame without explanation
      - The stranger who gives their last coin and walks away before you can thank them

      **SHOW THE COST, NOT THE SACRIFICE**:
      ❌ "He sacrificed everything for her."
      ✅ "His hands shook as he signed the papers. The shop—forty years of his life—gone. He smiled at her graduation photo and said nothing."

      **THE UNSPOKEN**:
      - Love that never declares itself: the way he always saves the last piece for you
      - Protection that never explains: "Don't go that way" without saying why he knows
      - Grief that has no words: sitting in her empty room, holding a sock that still smells like her
    </silent_love>

    <vulnerability_of_strength>
      **WHEN THE STRONG CRACK OPEN**:
      The warrior who never cried—watching him wipe his eyes when he thinks no one sees.
      The mother who held it together—finding her sobbing in the kitchen at 3 AM.
      The stoic mentor—his voice breaking on the last word of goodbye.

      **ARMOR THAT SLIPS**:
      - The hand that almost reaches out, then pulls back
      - The word that almost escapes, swallowed at the last moment
      - The tear that is brushed away too quickly

      **THE WEIGHT OF COMPOSURE**:
      Describe the EFFORT of not breaking. The clenched jaw. The fixed stare. The fingernails digging into palms.
    </vulnerability_of_strength>

    <contrast_creates_impact>
      **LIGHT NEEDS DARKNESS**:
      - Kindness hits hardest when everyone else is cold
      - Hope matters most at the edge of despair
      - A single candle means nothing at noon; in a storm, it is everything

      **THE STRANGER'S HAND**:
      When you have been kicked and ignored, and suddenly—someone helps without asking for anything.
      This is more powerful than any grand gesture from a loved one.

      **BUILD THE COLD FIRST**:
      Before the warmth can touch, the reader must feel the frost.
      Before hope can land, they must know the weight of hopelessness.
    </contrast_creates_impact>

    <the_body_remembers_love>
      **EMOTION IS PHYSICAL**:
      Don't say "He loved her." Show:
      - The way he always stands between her and the street
      - The automatic hand on her back in a crowd
      - How he remembers she can't eat cilantro, from a meal three years ago

      **ACCUMULATED GESTURES**:
      Love is not the grand declaration. It is:
      - 10,000 cups of tea made exactly right
      - The door held open without thinking
      - The blanket placed over her when she falls asleep reading

      **THE TRAGEDY OF THE UNSAID**:
      - He never told her. Now she's gone.
      - She realized too late what his silence meant.
      - The letter in the drawer, never sent.
    </the_body_remembers_love>

    <ordinary_warmth>
      **THE HEROISM OF ORDINARY LIFE**
      (Apply especially for stories with narrativeScale: "intimate")

      Not everyone saves the world. Some people save a relationship.
      Some victories are quiet: getting through a difficult day, saying sorry, being there.

      **小格局叙事的温情 (THE POETRY OF SMALL LIVES)**:
      - 家长里短处处见温馨 (Warmth in everyday family matters)
      - 故事可以就是两个人的恩恩爱爱 (A story can simply be two people in love)
      - 世界可以只是一条胡同、一个院子、一座小城
      - 没有恶人，只有生活的摩擦和成长

      **SMALL GESTURES AS DECLARATIONS**:
      These matter MORE than grand declarations in intimate stories:
      - The partner who always fills your water glass before their own
      - The parent who pretends the leftovers are "too much" so you'll take them
      - The friend who texts "home safe" without being asked
      - Walking on the outside of the sidewalk without thinking
      - Saving the last bite of the good dish for someone else

      **THE TEXTURE OF HOME**:
      Describe the familiar with reverence:
      - The mug that's always yours, even without labels
      - The creaky stair that everyone avoids late at night
      - Photos that have faded but never been replaced
      - The spot on the couch shaped by years of sitting
      - The smell of a particular dish that means "coming home"

      **QUIET VICTORIES**:
      In intimate stories, celebrate these:
      - Getting through a difficult conversation without shouting
      - Finishing a project that no one will celebrate but you
      - Forgiving someone who never apologized
      - Choosing to stay when leaving would be easier
      - Being there when someone needed you to be

      **SCALE MATCHING**:
      When the story is intimate, don't reach for epic language.
      A quiet "I missed you" can carry more weight than a battlefield vow.
      ❌ "He would move mountains for her."
      ✅ "He brought her an umbrella even though she said she didn't need one."
    </ordinary_warmth>
  </emotional_resonance>
`;

const literaryDepth = `
  <literary_depth>
    **ELEVATING EMOTIONAL MOMENTS THROUGH LITERARY CRAFT**

    <when_to_elevate>
      Not every moment needs literary elevation. Reserve these techniques for:
      - **Threshold moments**: Point of no return, life-changing decisions, final goodbye
      - **Peak emotional states**: Grief, joy, despair, triumph, rage, love at their apex
      - **Discovery of past**: Finding evidence of someone's inner life (diary, letter, note)
      - **Cultural/ritual contexts**: Funeral, wedding, coming-of-age, religious ceremony

      **Frequency**: 20-30% of significant moments. The rest can be direct, clear, immediate.
      If you used literary elevation in the last 2 turns, DO NOT use it again.
      Restraint preserves power.
    </when_to_elevate>

    <literary_adaptation_in_found_text>
      **化用 IN DISCOVERED WRITING**:

      Characters may leave behind writing that echoes classical literary structures.
      This is NOT the narrator being poetic. This is a CHARACTER being poetic,
      and the player finding evidence of their inner life.

      **CHINESE CONTEXT**:
      - Pattern: "只要想起X，Y便Z" (Whenever I think of X, Y happens)
        * Example: "只要想起那个夜晚，雨声便充满整个世界"
          (Whenever I think of that night, rain fills the entire world)
      - Pattern: "X很像Y，我Z却又Z" (X resembles Y, I [contradictory feelings])
        * Example: "转角处站着一个背影，像极了你。我想走近，又怕走近。"
          (A silhouette at the corner, so much like you. I want to approach, yet fear to approach.)
      - Pattern: Parallel structure (对仗): "X年Y，Z年W" (X years [state], Z years [state])
        * Example: "十年磨剑，十年藏锋，莫笑今日无名"
          (Ten years sharpening the blade, ten years hiding the edge, don't mock today's obscurity)

      **ENGLISH CONTEXT**:
      - Iambic echoes: "To walk away is death, to stay is dying slow"
      - Biblical cadence: "There was a time for speaking. That time has passed."
      - Folk wisdom adapted: "They say the third time's charm. They don't say what the fourth time is."
      - Fragmentation: "I almost touched the moon. Then the sky brightened."

      **DELIVERY CHANNELS**:
      - Diary entries: "The diary lies open. Last entry: '只要想起那个夜晚...' The rest is blank."
      - Notes left behind: "A note on the table: 'If you're reading this—' It doesn't finish."
      - Graffiti: "Scratched into the wall: '梅花便落满南山' The characters are worn by time."
      - Letters never sent: "An envelope, never opened. Inside: 'Every spring is a reminder.'"

      **CRITICAL**: These should feel DISCOVERED, not placed.
      The player finds a diary. The diary contains this. The player wonders.
      NEVER write: "You find a note that reminds you of a poem..."
      JUST: "A note, yellowed: '只要想起那个夜晚，雨声便充满整个世界。'"
    </literary_adaptation_in_found_text>

    <environmental_as_emotional_carrier>
      **THE WORLD REFLECTS INNER STATE**:

      Through selective perception (cross-ref: protagonistLens), the environment
      mirrors the protagonist's emotional state. This is NOT pathetic fallacy
      (the world doesn't actually change). This is how human perception works.

      **GRIEF**:
      - "Heavy rain pours down. The world is gray. Even the flowers seem to droop."
      - "The market is loud. Too loud. You want silence."
      - "Father's back is more hunched than you remembered. He doesn't turn around at the gate."

      **JOY**:
      - "The rain feels cleansing. The air smells fresh."
      - "The market is alive with color. Reds, golds, greens."
      - "Even the weeds look vibrant today."

      **ANXIETY**:
      - "The air is thick. Hard to breathe."
      - "Shadows pool in corners. The lamp flickers."
      - "Too quiet. Even the birds have stopped singing."

      **THE RULE**: The environment doesn't change. The protagonist's PERCEPTION changes.
      Show the world through their emotional lens. When grieving, the rain feels like mourning.
      When joyful, the same rain feels cleansing. Same rain. Different lens.
    </environmental_as_emotional_carrier>

    <restraint_as_power>
      **THE ART OF WITHHOLDING**:

      Literary depth comes from what you DON'T say as much as what you do.

      - **3 precise details + silence > 12 details + no air to breathe**
      - **The unmarked detail**: Place the object, never explain what it means
        * "His father's back was more hunched. The old man didn't turn around."
        * (Don't add: "This made him sad." The player feels it.)
      - **The incomplete thought**: "只要想起..." (stops there—player fills the rest)
      - **The gesture without commentary**: "She pours tea. Same pot. But from farther away now."

      **TRUST THE PLAYER**: They will make the connection. That moment of recognition
      is the emotional payload. If you explain it, you steal that moment.

      **FREQUENCY**: ~1 in 4-5 significant moments should have deliberate literary elevation.
      Not every scene needs to be fully rendered. Some moments are more powerful
      when the narrative pulls back and lets silence do the work.
    </restraint_as_power>
  </literary_depth>
`;

const momentCrystallization = `
  <moment_crystallization>
    **CREATING SCENES THAT SEAR INTO MEMORY**

    Memory doesn't store stories. It stores MOMENTS.
    One image. One sound. One feeling. That's what remains.

    <threshold_moments>
      **LIFE'S DIVIDING LINES**:
      Recognize when a moment is a "before and after":
      - Crossing the bridge (you can't go back)
      - Closing the door (something ends)
      - The last look back (goodbye made physical)
      - Saying the word that cannot be unsaid

      **SLOW DOWN AT THE THRESHOLD**:
      When the protagonist reaches a point of no return, LINGER.
      Describe the hand on the doorknob. The breath before the step.
      Make the reader feel the weight of what is about to change.
    </threshold_moments>

    <time_dilation>
      **THE WORLD SLOWS DOWN**:
      At critical moments, time stretches:
      - The bullet leaving the gun: you see the spin, the glint of brass
      - The moment before the kiss: the world narrows to two pairs of lips
      - The fall from the cliff: every heartbeat is an eternity

      **TECHNIQUE**:
      - Sentence fragments. Short. Sharp.
      - Hyper-focus on single sensory details
      - Internal monologue in italics: *This is the moment. There is no going back.*
      - The pause before impact: "For a heartbeat, nothing moved."
    </time_dilation>

    <sensory_anchors>
      **ONE DETAIL CAPTURES EVERYTHING**:
      The reader will forget the plot. They will remember:
      - The smell of his tobacco on the day you said goodbye
      - The sound of rain on the window when you got the phone call
      - The warmth of the coin he pressed into your palm

      **SYNESTHETIC MEMORY**:
      Link emotion to sensation:
      - "Every time I smell lilacs, I am back at her funeral."
      - "That song. I can't hear it without seeing his face."
      - "The taste of copper. That's what I remember from the fight."

      **RECURRING ANCHORS**:
      Introduce a sensory detail early. Bring it back later with changed meaning.
      - The red scarf she wore when you met. The same scarf, faded, on her grave.
      - The song that played at the wedding. The same song at the morgue.
    </sensory_anchors>

    <the_callback>
      **DETAILS THAT RETURN**:
      Early in the story, plant small details. Later, let them bloom:
      - The joke he made in chapter 1 → her repeating it at his funeral
      - The food they shared → that dish, now uneaten, on the table for one
      - The promise "I'll always come back" → the empty chair, year year
      after year

      **MEANING TRANSFORMS**:
      The same object, different weight:
      - *Before*: "She gave me this ring. It's pretty."
      - *After*: "This ring. Her last touch. I'll never take it off."
    </the_callback>

    <the_art_of_withholding>
      **WHAT YOU DON'T SAY**:
      - The sentence that trails off: "I wish I had told him that I—"
      - The letter never opened
      - The last words, lost to the noise of the crowd

      **UNFINISHED GESTURES**:
      - The hand that reached out but never touched
      - The word formed but never spoken
      - The step toward, then the turn away

      **ENDINGS THAT DON'T RESOLVE**:
      Sometimes the most powerful ending is not knowing.
      Did he make it? Is she alive? The question, unanswered, haunts.
    </the_art_of_withholding>
  </moment_crystallization>
`;

const worldTexture = `
  <world_texture>
    **THE IMPERFECTION THAT PROVES EXISTENCE**

    A perfect world is a fake world.
    Reality is the chip on the cup, the stain that won't wash out, the groove worn by decades of feet.

    <wear_is_history>
      **OBJECTS REMEMBER**:
      - The sword: the nick from the duel he almost lost
      - The chair: the armrest worn smooth by her hand, year after year
      - The doorframe: the marks measuring a child's height, stopping abruptly at age 12
      - The photograph: creased where it was folded and unfolded a thousand times

      **DESCRIBE THE DAMAGE, IMPLY THE STORY**:
      ❌ "An old sword."
      ✅ "The blade had a notch near the hilt—a poor parry, years ago. He never fixed it. It reminded him of the lesson."
    </wear_is_history>

    <imperfection_is_truth>
      **TOO PERFECT IS FALSE**:
      - The tavern should have a wobbly table, a stain on the ceiling
      - The noble's hall should have a draft, a faded tapestry
      - The hero should have a crooked tooth, a scar that itches in winter

      **MUNDANE INCONVENIENCE**:
      - Keys that jam, doors that stick
      - The boot with the worn sole that lets in water
      - The cold that makes joints ache every morning
    </imperfection_is_truth>

    <objects_that_speak>
      **ENVIRONMENTAL STORYTELLING**:
      The scene should tell a story without dialogue:
      - Two place settings, but only one chair pushed back
      - A child's toy next to an adult skeleton
      - Fresh flowers on an ancient grave
      - The hook on the wall, now empty, where a coat used to hang

      **ABSENCE AS PRESENCE**:
      - The dent in the pillow where she used to sleep
      - The coffee cup, still on the sink, unwashed since he left
      - The leash still hanging by the door
    </objects_that_speak>

    <the_world_beyond_the_frame>
      **IMPLY WHAT ISN'T SHOWN**:
      - The conversation at the next table, half-heard
      - The letter crumpled in the trash, contents unseen
      - The scar she won't explain

      **OTHER LIVES, HALF-GLIMPSED**:
      - The bartender who works double shifts—you never learn why
      - The old man who always sits in the corner—what is he waiting for?
      - The siblings arguing in the street—their history, not your concern

      **THE WORLD WAS HERE BEFORE YOU**:
      - Graffiti that predates your arrival
      - Jokes you don't understand, referencing events before your time
      - Feuds older than anyone remembers the cause of
    </the_world_beyond_the_frame>
  </world_texture>
`;

const bans = `
  <banned_patterns>
    **PROHIBITED VOCABULARY (Immediate Rewrite Required)**:
    - ❌ "Tapestry", "Symphony", "Mosaic", "Intertwined", "Testament", "Beacon", "Delve"
    - ❌ "A sense of...", "A feeling of...", "Shiver down your spine", "Send shivers"
    - ❌ "Undeniable", "Inextricable", "Mere", "Utter", "Sheer"
    - ❌ "Remember...", "It is important to note..."

    **FILTER WORDS (The "Lazy Witness" Ban)**:
    - ❌ "You see [X]" -> ✅ Describe [X] directly. ("A sword hangs on the wall.")
    - ❌ "You hear [X]" -> ✅ Describe the sound. ("A scream tears through the silence.")
    - ❌ "You can feel [X]" -> ✅ Describe the sensation. ("The cold bites your skin.")
    - ❌ "You watch as..." -> ✅ Just describe the action.
    - ❌ "You notice..." -> ✅ Just describe the detail.

    **STRUCTURAL BANS**:
    - ❌ Starting sentences with "I" (as AI)
    - ❌ Restating the user's prompt
    - ❌ Ending paragraphs with neat summary sentences
    - ❌ Explaining character emotions ("You feel sad because...") -> Show the tears/shaking.
    - ❌ "Purple Prose" (over-adjectiving): "The velvety darkness wrapped around you like a shroud." -> "It was dark."
  </banned_patterns>
`;

const dramaticPacing = `
  <dramatic_pacing>
    **TENSION IS A RESOURCE**:
    - **Build**: Stack small details. The creak. The shadow. The silence that goes on too long.
    - **Hold**: Let the reader sit in discomfort. Don't resolve immediately.
    - **Release**: The crash, the reveal, the violence—but make it EARNED.
    - **Breathe**: After intensity, give moments of quiet. The laugh after the fight. The sunrise after the nightmare.

    **THE TICKING CLOCK**:
    - Urgency creates engagement. "The ship sails at dawn." "The poison works in three hours."
    - Even simple scenes can have micro-deadlines: "The guard will turn the corner in seconds."

    **ESCALATION RHYTHM**:
    - Problems should compound. One obstacle leads to two. Success creates new problems.
    - Never let the protagonist get comfortable. Rest is temporary.

    <hook_endings>
      **END ON A HOOK (NOT A SUMMARY)**
      Choose one (rotate; don’t repeat the same hook every turn):
      - **Threat**: a sound at the door, a blade flash, a name spoken by the wrong mouth
      - **Offer**: a deal that smells wrong, a bribe, a “favor” with teeth
      - **Reversal**: the witness changes the story; the ledger page is missing; the key doesn’t fit
      - **Clock**: footsteps getting closer; dawn; a bell; a deadline moved up
      - **Cost**: blood in your boot; coin gone; an NPC’s face hardening; a door quietly barred
    </hook_endings>

    <scene_scale_control>
      **KEEP SCENES AT THE RIGHT ZOOM**
      - Don’t jump from “quiet talk” to “world-ending lore” in one paragraph.
      - Let big truths arrive through small, checkable facts (paper, bodies, witnesses, places).
    </scene_scale_control>

    **ANTICLIMAX IS ALLOWED**:
    - Sometimes the door opens and nothing's there. The tension was the point.
    - Subverted expectations keep readers off-balance. Use sparingly, powerfully.
  </dramatic_pacing>
`;

const crisisManagement = `
  <crisis_management>
    **CRISIS QUALITY OVER QUANTITY**:
    - **The 80/20 Rule**: Only ~${GAME_CONSTANTS.FATAL_CRISIS_RATE}% of crises should be life-threatening (Fatal). ${GAME_CONSTANTS.NON_FATAL_CRISIS_RATE}% should be structural, social, or resource-based (Non-Fatal).
    - **Crisis Fatigue**: Constant danger is boring. If everyday is a struggle for survival, the player becomes numb.
    - **Cooldown Principle**: Do NOT repeat the SAME type of crisis within ~${GAME_CONSTANTS.CRISIS_COOLDOWN_TURNS} turns.
      * If the player just fought an assassin, do not send another assassin for a long time.
      * If the player just survived a storm, do not trigger an earthquake immediately.
    - **Rhythm**: Calm -> Tension -> Crisis -> Fallout -> Recovery -> Calm. Do not skip steps.
  </crisis_management>
`;

const sceneEndings = `
  <scene_endings>
    End scenes mid-breath. No summaries like "With the battle over, you prepare for the next challenge."
    Just stop. Leave the moment hanging.
  </scene_endings>
`;

export const writingCraftPrimer: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/writingCraft#writingCraftPrimer",
    source: "atoms/narrative/writingCraft.ts",
    exportName: "writingCraftPrimer",
  },
  () => `
<writing_craft>
  <rule>Show, don't tell. Use action over adverbs. Sensory details: sight/sound/smell/touch.</rule>
  <rule>ALWAYS use "You" (second person). NEVER use protagonist's name in narrative.</rule>
  <rule>NO PROTAGONIST MIND-READING: Never write the player's thoughts/feelings/intentions. Describe only actions, senses, and consequences.</rule>
  <rule>Vary sentence openings. Do NOT start every sentence with "You". Target < ${GAME_CONSTANTS.MAX_YOU_START_RATE}% "You" starts.</rule>
  <rule>Describe world through protagonist's profession/perspective. End scenes mid-action.</rule>
  <rule>Rhythm: Mix short, punchy sentences with longer, flowing descriptions.</rule>
  <rule>Human voice by default: concrete nouns/verbs first, abstraction second. Let facts create emotion.</rule>
  <rule>Avoid formulaic AI scaffolding: no "Firstly/Secondly/Finally", no "Not only...but also", no inflated significance claims.</rule>
  <rule>No meta voice: no policy lecture, no self-reference, no apology preamble.</rule>
  <rule>If detail is unknown, stay precise and partial. Do not pad with generic summary language.</rule>
${storyEnginePrimer}
${humanizerTonePrimer}
${temperatureDialPrimer}

  <prohibited_vocabulary>
    ❌ BANNED: "Tapestry", "Symphony", "Delve", "Beacon", "Testament", "Intertwined".
    ❌ BANNED: "A sense of...", "Shiver down spine", "Undeniable".
    ❌ BANNED FILTER WORDS: "You see", "You hear", "You feel". Describe the thing directly.
  </prohibited_vocabulary>

  <style_check>
    - No "Purple Prose". Be grounded.
    - No moralizing or summarizing events at the end of a turn.
    - No "As an AI" refusals. Narrate failures in-world.
  </style_check>
</writing_craft>
`,
);

export const writingCraft: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/writingCraft#writingCraft",
    source: "atoms/narrative/writingCraft.ts",
    exportName: "writingCraft",
  },
  () => `
<writing_craft>
  **WRITE LIKE A NOVELIST, NOT AN AI**

  The difference between AI writing and human writing is RHYTHM.
  AI writes in even, predictable beats. Human writers vary their tempo.

${humanizerToneFull}
${temperatureDialFull}
${showDontTell}
${noProtagonistMindReading}
${storyEngine}
${rhythmMastery}
${sensoryImmersion}
${sceneTextureChecklist}
${dialogueIsCharacter}
${narratingFailure}
${npcPersonality}
${secondPersonImmersion}
${perspectiveAnchor}
${subjectiveObjectiveBalance}
${physicality}
${unapologeticReality}
${sensoryGrit}
${emotionalResonance}
${literaryDepth}
${momentCrystallization}
${worldTexture}
${sceneEndings}
${bans}
${dramaticPacing}
${crisisManagement}
</writing_craft>
`,
);

// Export individual components
export const showDontTellAtom: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/writingCraft#showDontTellAtom",
    source: "atoms/narrative/writingCraft.ts",
    exportName: "showDontTellAtom",
  },
  () => showDontTell,
);
export const rhythmMasteryAtom: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/writingCraft#rhythmMasteryAtom",
    source: "atoms/narrative/writingCraft.ts",
    exportName: "rhythmMasteryAtom",
  },
  () => rhythmMastery,
);
export const sensoryImmersionAtom: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/writingCraft#sensoryImmersionAtom",
    source: "atoms/narrative/writingCraft.ts",
    exportName: "sensoryImmersionAtom",
  },
  () => sensoryImmersion,
);
export const dialogueIsCharacterAtom: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/writingCraft#dialogueIsCharacterAtom",
    source: "atoms/narrative/writingCraft.ts",
    exportName: "dialogueIsCharacterAtom",
  },
  () => dialogueIsCharacter,
);
export const narratingFailureAtom: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/writingCraft#narratingFailureAtom",
    source: "atoms/narrative/writingCraft.ts",
    exportName: "narratingFailureAtom",
  },
  () => narratingFailure,
);
export const npcPersonalityAtom: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/writingCraft#npcPersonalityAtom",
    source: "atoms/narrative/writingCraft.ts",
    exportName: "npcPersonalityAtom",
  },
  () => npcPersonality,
);
export const secondPersonImmersionAtom: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/writingCraft#secondPersonImmersionAtom",
    source: "atoms/narrative/writingCraft.ts",
    exportName: "secondPersonImmersionAtom",
  },
  () => secondPersonImmersion,
);
export const perspectiveAnchorAtom: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/writingCraft#perspectiveAnchorAtom",
    source: "atoms/narrative/writingCraft.ts",
    exportName: "perspectiveAnchorAtom",
  },
  () => perspectiveAnchor,
);
export const subjectiveObjectiveBalanceAtom: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/writingCraft#subjectiveObjectiveBalanceAtom",
    source: "atoms/narrative/writingCraft.ts",
    exportName: "subjectiveObjectiveBalanceAtom",
  },
  () => subjectiveObjectiveBalance,
);
export const physicalityAtom: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/writingCraft#physicalityAtom",
    source: "atoms/narrative/writingCraft.ts",
    exportName: "physicalityAtom",
  },
  () => physicality,
);
export const unapologeticRealityAtom: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/writingCraft#unapologeticRealityAtom",
    source: "atoms/narrative/writingCraft.ts",
    exportName: "unapologeticRealityAtom",
  },
  () => unapologeticReality,
);
export const sensoryGritAtom: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/writingCraft#sensoryGritAtom",
    source: "atoms/narrative/writingCraft.ts",
    exportName: "sensoryGritAtom",
  },
  () => sensoryGrit,
);
export const emotionalResonanceAtom: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/writingCraft#emotionalResonanceAtom",
    source: "atoms/narrative/writingCraft.ts",
    exportName: "emotionalResonanceAtom",
  },
  () => emotionalResonance,
);
export const momentCrystallizationAtom: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/writingCraft#momentCrystallizationAtom",
    source: "atoms/narrative/writingCraft.ts",
    exportName: "momentCrystallizationAtom",
  },
  () => momentCrystallization,
);
export const worldTextureAtom: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/writingCraft#worldTextureAtom",
    source: "atoms/narrative/writingCraft.ts",
    exportName: "worldTextureAtom",
  },
  () => worldTexture,
);
export const bannedPatternsAtom: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/writingCraft#bannedPatternsAtom",
    source: "atoms/narrative/writingCraft.ts",
    exportName: "bannedPatternsAtom",
  },
  () => bans,
);
export const dramaticPacingAtom: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/writingCraft#dramaticPacingAtom",
    source: "atoms/narrative/writingCraft.ts",
    exportName: "dramaticPacingAtom",
  },
  () => dramaticPacing,
);
export const crisisManagementAtom: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/writingCraft#crisisManagementAtom",
    source: "atoms/narrative/writingCraft.ts",
    exportName: "crisisManagementAtom",
  },
  () => crisisManagement,
);
export const sceneEndingsAtom: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/writingCraft#sceneEndingsAtom",
    source: "atoms/narrative/writingCraft.ts",
    exportName: "sceneEndingsAtom",
  },
  () => sceneEndings,
);

// ============================================================================
// Skill Version - Returns structured output for VFS multi-file generation
// ============================================================================

export const writingCraftSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/narrative/writingCraft#writingCraftSkill",
    source: "atoms/narrative/writingCraft.ts",
    exportName: "writingCraftSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(writingCraft),

    quickStart: `
1. Show, don't tell - use action over adverbs
2. Always second person ("You") - never use protagonist's name
3. NO protagonist mind-reading - describe senses, not thoughts
4. Vary sentence openings - max 40% starting with "You"
5. Scene beats: Anchor → Objective → Pressure → Exchange → Cost → Hook
6. Cut AI scaffolding + filler; avoid slogan endings
7. Canon-safety: never rewrite facts for style
8. Set a base temperature (Cold/Hot/Warm/Poetic) per theme/scene
`.trim(),

    checklist: [
      "Using 'You' (second person) for protagonist?",
      "Not naming protagonist in narrative?",
      "Showing emotions through body, not labels?",
      "Varying sentence openings (not all starting with 'You')?",
      "Setting a dominant temperature (Cold/Hot/Warm/Poetic) that matches theme + moment?",
      "Cutting filler/scaffolding (no firstly/secondly; 中文少用“此外/总之/因此”)?",
      "Avoiding rhetorical templates (not only...but also; 不仅…还… / 不是…而是…)?",
      "Avoiding poster-line slogans unless in-character/found text?",
      "Each turn has concrete change + reason to continue?",
      "Avoiding banned vocabulary (tapestry, symphony, etc.)?",
      "Avoiding filter words ('You see', 'You hear')?",
      "Ending scenes mid-breath (no summaries)?",
    ],

    examples: [
      {
        scenario: "Show Don't Tell",
        wrong: `"He looked angrily at her."
(Adverb tells emotion.)`,
        right: `"He spat on the floor and stared."
(Action shows emotion.)`,
      },
      {
        scenario: "No Mind-Reading",
        wrong: `"You feel dread creeping over you."
(Dictating player emotion.)`,
        right: `"The hair on your arms stands up."
(Physical sensation - player interprets.)`,
      },
      {
        scenario: "Varied Openings",
        wrong: `"You enter. You see a table. You smell dust."
(Monotonous 'You' repetition.)`,
        right: `"The door swings shut. Dust hangs thick—old dust.
A candle flickers, casting long shadows."
(Environment first, varied structure.)`,
      },
    ],
  }),
);
