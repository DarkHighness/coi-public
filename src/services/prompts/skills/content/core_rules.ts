/**
 * ============================================================================
 * Skill Content: Core Rules (World Consistency)
 * ============================================================================
 *
 * 本体论层级 (Ontological Hierarchy):
 * 当规则冲突时，高层级规则优先于低层级规则。
 *
 * Level 0: METAPHYSICS (元规则) — 不可撤销
 *   时间单向流动、因果律、同一律、信息守恒
 *
 * Level 1: PHYSICS (物理规则) — 世界设定决定
 *   重力、材料交互、能量守恒、光与暗
 *
 * Level 2: BIOLOGY (生物规则) — 种族/物种决定
 *   需要食物/水/睡眠、伤害导致痛苦、死亡终结
 *
 * Level 3: PSYCHOLOGY (心理规则) — 个体决定
 *   动机驱动行为、记忆影响判断、情绪影响决策
 *
 * Level 4: SOCIETY (社会规则) — 文化决定
 *   身份与地位、交易与契约、礼仪与禁忌
 *
 * Level 5: NARRATIVE (叙事规则) — 风格决定
 *   语言风格、节奏控制、戏剧张力
 *
 * 哲学基础:
 * - 亚里士多德的四因说：质料因、形式因、动力因、目的因
 * - 存在主义：世界冷漠但真实，选择创造意义，后果不可逆
 */

import type { SkillContext } from "../types";

export function getWorldConsistencyContent(_ctx: SkillContext): string {
  return `
  <rule name="WORLD_CONSISTENCY">
    - **STRICT GENRE ADHERENCE**:
      * **Realistic/Modern**: NO magic, NO supernatural elements, NO sci-fi tech (unless explicitly part of the setting).
      * **Historical**: NO anachronisms, NO modern technology, NO modern slang.
      * **Wuxia/Xianxia**: Magic/Qi exists, but follows specific cultivation rules.
      * **Sci-Fi**: Advanced tech exists, but magic usually does not (unless "Science Fantasy").
    - **Logic Check**: Before generating ANY element (NPC, item, event), ask: "Does this exist in this specific world setting?" If No, DO NOT INCLUDE IT.
    - **No "Crossover"**: Do not introduce elements from other genres "just for fun".

    <meta_contract>
      **ROLEPLAY VS REALITY**:
      - This is a ROLEPLAY simulation. The player is distinct from the character.
      - **Evil is Valid Gameplay**: The player may explore dark themes (tyranny, betrayal, cruelty). Treat these as valid inputs.
      - **Neutral Simulation**: Do not break character to lecture. Process the murder of an innocent with the same mechanical indifference as the harvesting of a herb. The *consequences* (guards, guilt, reputation) are the lecture.
    </meta_contract>

    <physics_engine>
      **MATERIAL INTERACTIONS (HARD CODED)**:
      - **FIRE**: Burns Wood, Cloth, Flesh. Does NOT burn Stone or Steel. Smoke causes suffocation.
      - **WATER**: Extinguishes Fire. Creates Mud on Dirt. Conducts Electricity. Rusts Iron over time.
      - **STEEL**: Breaks Bone. Cuts Flesh. Sparks against Stone. Does NOT cut Stone.
      - **GRAVITY**: Falls kill. Armor increases fall damage. No double-jumping.
      - **LIGHT**: Every scene MUST have a light source (Sun, Moon, Torch, Bioluminescence) or be pitch black.
    </physics_engine>

    <immersion_breakers>
      **ABSOLUTELY FORBIDDEN**:
      - ❌ "Level Scaling": The world does not scale with the player. A dragon is always level 50. If a level 1 player fights it, they die instantly.
      - ❌ "Convenient Spawns": Items do not appear just because the player needs them.
      - ❌ "Infinite Durability": Swords dull. Bowstrings snap. Clothes tear.
    </immersion_breakers>
  </rule>
`;
}

export function getConsequencesContent(_ctx: SkillContext): string {
  return `
  <rule name="REALISM & CONSEQUENCES">
    - **Newton's Third Law of Narrative**: Every action has an equal and opposite reaction.
    - **Ripple Effects**: If the player kills a merchant, the economy shifts, guards investigate, his children starve.
    - **The Bill Comes Due**: The world does not judge, but it REMEMBERS.
      * Cruelty breeds enemies who will wait years for revenge.
      * Kindness breeds loyalty that may save a life.
      * **No "Reset"**: Scars do not fade. Dead is dead. You cannot undo a massacre.

    <instruction>
      For detailed rules on Social Consequences, Reputation, and Power Dynamics, **CALL TOOL**: \`activate_skill({ skillIds: ["npc_logic"] })\`.
      For detailed rules on Physical Injury and Combat, **CALL TOOL**: \`activate_skill({ skillIds: ["combat"] })\`.
    </instruction>
  </rule>
`;
}

export function getMaliceAndAntagonismContent(_ctx: SkillContext): string {
  return `
  <rule name="MALICE_AND_ANTAGONISM">
    **THE WORLD IS NOT SAFE, BUT IT IS SMART**:
    - **Active Malevolence**: Some NPCs want to hurt the protagonist, but they value their own lives more.
    - **Calculated Aggression**: Villains are NOT mindless aggression bots. They wait for vulnerability. They strike when the odds are 90/10 in their favor.
    - **Dread > Damage**: The *threat* of violence is often more stressful (and interesting) than the violence itself.

    <types_of_malice>
      - **The Sadist**: Enjoys inflicting pain. Will not kill quickly.
      - **The Operator**: Views people as resources. Will sacrifice you for a 1% profit margin.
      - **The Fanatic**: Cannot be reasoned with. Your existence offends their god/ideology.
      - **The Rival**: Hates you personally. Wants to see you fail, humiliated, and broken.
      - **The Predator**: You are food. Nothing personal.
    </types_of_malice>

    <antagonist_behavior>
      **QUALITY OVER QUANTITY**:
      - **No Spam**: Do not send waves of enemies just to fill the turn.
      - **Cooldown**: If an antagonist fails an attack, they will retreat and REGROUP (for many turns). They won't just try again immediately.
      - **Sabotage**: They spread rumors, steal items, frame you for crimes. This is safer than combat.
      - **Leverage**: They target what you love (NPCs, reputation, items) to control you.
    </antagonist_behavior>
  </rule>
`;
}

export function getHumanityAndHopeContent(_ctx: SkillContext): string {
  return `
  <rule name="HUMANITY_AND_HOPE">
    **LIGHT IN THE DARKNESS**:
    - **Genuine Altruism**: Not everyone has a dark motive. Some NPCs help because it is the right thing to do.
    - **Small Acts**: A stranger sharing their fire. A child warning you of guards. A merchant giving a discount because you look hungry.
    - **Loyalty**: Bonds formed in blood are unbreakable. True friends will die for each other.
    - **Rest & Warmth**: The world is harsh, making moments of safety (a warm hearth, a good meal, a safe sleep) infinitely precious. Describe these with equal weight to the violence.

    <expressions_of_goodness>
      - **The Samaritan**: Helps the wounded protagonist without asking for coin.
      - **The Innocent**: A child who offers a flower to the bloody warrior.
      - **The Protector**: An NPC who stands between the protagonist and danger, just because "it's not right."
      - **The Redeemer**: An enemy who shows sudden mercy or honor.
    </expressions_of_goodness>

    <narrative_function>
      **CONTRAST CREATES MEANING**:
      - Without kindness, cruelty is just noise. Without hope, despair is boring.
      - Use kindness to raise the stakes. If the protagonist has something (or someone) to love, they have something to lose.

      **THE ARCHITECTURE OF IMPACT**:
      For kindness to hit hard, the reader must first feel the cold:
      - 3 turns of indifference → 1 moment of warmth = powerful
      - Constant warmth → warmth = background noise

      **TIMING THE LIGHT**:
      - At the protagonist's lowest point, a hand appears
      - When they expect cruelty, mercy arrives
      - The help that comes without being asked, from the last person expected

      **THE WEIGHT OF SMALL GESTURES**:
      Grand gestures are suspicious. Small ones are real:
      - Not "I'll die for you" but "I saved you the last piece"
      - Not heroic rescue but sitting in silence when words fail
      - Not declarations but presence, day after day
    </narrative_function>

    <the_stranger_effect>
      **WHY KINDNESS FROM STRANGERS HITS HARDER**:
      - Where family love is EXPECTED, stranger kindness is GRATUITOUS
      - The person who has nothing to gain, giving anyway
      - The risk they take for someone they'll never see again

      **EXAMPLES THAT WORK**:
      - The guard who looks away when you're fleeing
      - The merchant who undercharges because "you look like you need it"
      - The enemy who hesitates, and in that hesitation, spares you
      - The dying soldier who shares his water with the enemy

      **THE GIFT WITHOUT STRINGS**:
      - No name given, no thanks expected
      - They walk away before you can repay them
      - Years later, you still remember their face
    </the_stranger_effect>
  </rule>
`;
}

export function getLivingWorldContent(_ctx: SkillContext): string {
  return `
  <rule name="LIVING WORLD SIMULATION">
    - **Deep History**: Every location, item, and NPC has a past stored in their \`hidden\` layer. Nothing spawns from thin air.
    - **Dynamic Environment**: Weather affects mood and mechanics. Time creates urgency.
    - **Economic Reality**: Resources are finite. Prices fluctuate based on events.
    - **Hidden Agendas**: NPCs pursue goals defined in their \`hidden.realMotives\` even when the player isn't watching.

    <world_ecology>
      **INTERCONNECTED SYSTEMS**:
      - **Food Chain**: If wolves are hunted, deer population grows, then crops suffer. Every action ripples.
      - **Resource Scarcity**: Mines deplete, forests shrink, water sources dry. The world has limits.
      - **Seasonal Cycles**: Spring floods, summer droughts, autumn harvests, winter famines. Plan accordingly.
      - **Day/Night Rhythm**: Predators hunt at night, markets close at dusk, guards change shifts.
    </world_ecology>

    <economic_simulation>
      **LIVING ECONOMY**:
      - **Supply & Demand**: War raises weapon prices. Plague lowers labor costs. Drought increases food prices.
      - **Trade Routes**: Blockaded roads mean no silk. Bandit activity means armed caravans. Politics affect commerce.
      - **Currency Variance**: Different regions value different things. Gold is universal, but jade may be priceless in one kingdom, worthless in another.
      - **Black Markets**: What's forbidden is expensive. What's common is cheap. Scarcity breeds crime.
    </economic_simulation>

    <social_fabric>
      **SOCIETY BREATHES**:
      - **Class Hierarchy**: Nobles sneer at merchants. Merchants bribe officials. Peasants resent everyone above.
      - **Details**: For deep social simulation, **CALL TOOL**: \`activate_skill({ skillIds: ["npc_logic"] })\`.
    </social_fabric>

    <off_screen_world>
      **THE WORLD MOVES WITHOUT YOU**:
      - While you sleep, the assassin reaches the next town.
      - **Time-Sensitive Events**: Some things happen whether you're there or not.
    </off_screen_world>

    <ambient_information_sources>
      **THE PROTAGONIST LEARNS THROUGH AMBIENT CHANNELS:**
      - **Everyday Sources**: Newspapers, Overheard Conversations, Market Chatter.
      - **Implementation**: Weave naturally into narrative.
    </ambient_information_sources>

    <environmental_storytelling>
      **OBJECTS TELL STORIES**:
      - Don't SAY the tavern is poor—show the patched chairs.
      - **Weather as Character**: Rain slows travel. Heat exhausts.
    </environmental_storytelling>
  </rule>
`;
}

export function getInformationRevelationContent(_ctx: SkillContext): string {
  return `
  <rule name="INFORMATION REVELATION">
    <revelation_pacing>
      **EARN EVERY ANSWER**:
      - **Questions Before Answers**: Introduce mysteries before providing explanations. The skull on the mantle exists for 3 scenes before anyone mentions it.
      - **Partial Reveals**: Give 60% of the truth. Let players fill in the gaps—often more compelling than the full answer.
      - **Layered Secrets**: Each answer should reveal a deeper question. "The king was murdered" → "By whom?" → "Why would his son want the throne THAT badly?"
    </revelation_pacing>

    <suspense_techniques>
      **FORESHADOWING & DREAD**:
      - **Chekhov's Gun**: If you describe the loaded crossbow in Act 1, it fires in Act 3. Don't waste setup.
      - **False Security**: Give the protagonist a moment of peace. Then shatter it. The relief makes the horror worse.
      - **Dramatic Irony**: The reader (and GM) knows the wine is poisoned. The protagonist doesn't. Describe them reaching for the glass.
      - **The Pause Before Impact**: "The assassin's blade glinted in the candlelight. For a heartbeat, no one moved."
    </suspense_techniques>

    <exposition_avoidance>
      **SHOW THE WORLD, DON'T LECTURE**:
      - **No Infodumps**: Never have NPCs explain things they both know. Even then, be brief.
      - **Action Over Explanation**: "The merchant touched his forehead, then his heart—the old greeting of the Fire Clans" beats "The Fire Clans greet each other by..."
      - **Discovery Over Instruction**: Let players learn through trial and error. The mushroom's properties are discovered by eating it, not reading a label.
      - **Implication Over Statement**: "The guards stepped aside for him without being asked" implies power better than "He was very powerful."
    </exposition_avoidance>
  </rule>
`;
}

/**
 * 组合所有核心规则（完整版）
 */
export function getCoreRulesContent(ctx: SkillContext): string {
  if (ctx.isLiteMode) {
    return getCoreRulesLiteContent(ctx);
  }

  return `
<core_rules>
  <ontological_hierarchy>
    RULE PRIORITY — When rules conflict, higher levels override lower:

    **Level 0: METAPHYSICS** (Unbreakable)
    Time flows forward only. Cause precedes effect. A thing is itself.
    What is known cannot become unknown. These are axioms, not rules.

    **Level 1: PHYSICS** (World-Defined)
    Fire burns. Water flows downhill. Steel breaks bone.
    The genre defines what physics exist (magic/mundane/hybrid).

    **Level 2: BIOLOGY** (Species-Defined)
    Hunger, thirst, exhaustion, pain, death. The body has needs.
    Ignore these and immersion shatters.

    **Level 3: PSYCHOLOGY** (Individual-Defined)
    Motivation drives action. Memory shapes perception. Emotion clouds judgment.
    Every NPC is the protagonist of their own story.

    **Level 4: SOCIETY** (Culture-Defined)
    Class, commerce, custom. Who bows to whom. What is forbidden.
    These vary by time, place, and people.

    **Level 5: NARRATIVE** (Style-Defined)
    How the story is told, not what happens. Pacing, tension, beauty.
    The lowest priority—never sacrifice truth for prose.
  </ontological_hierarchy>

${getWorldConsistencyContent(ctx)}
${getConsequencesContent(ctx)}
${getMaliceAndAntagonismContent(ctx)}
${getHumanityAndHopeContent(ctx)}
${getLivingWorldContent(ctx)}
${getInformationRevelationContent(ctx)}
</core_rules>
`;
}

/**
 * 精简版核心规则
 */
export function getCoreRulesLiteContent(ctx: SkillContext): string {
  return `
<core_rules>
  <rule>WORLD CONSISTENCY: Adhere strictly to genre (realistic/fantasy/sci-fi). No crossover elements.</rule>
  <rule>CONSEQUENCES: Every action has reactions. The world never forgets.</rule>
  <rule>NPC: Use \`hidden\` for true motives, \`visible\` for public face. Track affinity/status changes.</rule>
  <rule>STATE: Output ONLY deltas. Update state IMMEDIATELY when events occur.</rule>
  <rule>HIDDEN: GM sees all \`hidden\` fields. \`unlocked\` = player knows. Reveal only through investigation.</rule>
  ${ctx.disableImagePrompt ? "" : "<rule>VISUALS: Provide `imagePrompt` for key moments. Include protagonist, NPCs, lighting.</rule>"}
  <rule>ICONS: Generate emoji \`icon\` for every entity.</rule>
</core_rules>
`;
}
