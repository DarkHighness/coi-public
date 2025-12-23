/**
 * ============================================================================
 * Skill Content: Core Rules (World Consistency)
 * ============================================================================
 *
 * 完整迁移自 common.ts getCoreRules 的核心部分
 * 包含：世界一致性、后果、恶意与对抗、人性与希望、活世界模拟
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
  </rule>
`;
}

export function getConsequencesContent(_ctx: SkillContext): string {
  return `
  <rule name="REALISM & CONSEQUENCES">
    - **Newton's Third Law of Narrative**: Every action has an equal and opposite reaction.
    - **Ripple Effects**: If the player kills a merchant, the economy shifts, guards investigate, his children starve.
    - **No "Reset"**: The world never forgets. Scars do not fade. Dead is dead.
    - **Off-Screen Progression**: Simulate the world outside the player's vision.

    <physical_consequences>
      **PAIN IS TEACHER**:
      - **Lasting Damage**: Wounds slow you down. Burns get infected. Broken bones don't heal in a day.
      - **Exhaustion**: Heroes get tired. Adrenaline crashes. Hunger clouds judgment.
      - **Equipment Degradation**: Swords dull. Armor dents. Clothes tear. Nothing stays pristine.
    </physical_consequences>

    <social_consequences>
      **REPUTATION STICKS**:
      - **Memory**: An insult is remembered longer than a favor.
      - **Guilt by Association**: If you walk with thieves, you are treated like a thief.
      - **Institutional Memory**: Guilds, governments, and cults keep records. Your bounty doesn't disappear just because you left town.
    </social_consequences>

    <consequence_timing>
      **WHEN DO CONSEQUENCES HIT?**:
      - **Immediate**: Blood, pain, broken objects, shocked faces.
      - **Short-term** (same session): Guards arrive, rumors spread, prices change.
      - **Long-term** (future sessions): Vendettas form, reputations solidify, children grow up seeking revenge.
      - **Hidden Triggers**: Some consequences are "loaded guns"—set up now, fired later. The merchant you cheated? He has a brother in the Royal Guard.
    </consequence_timing>

    <social_power_dynamics>
      **HIERARCHY MATTERS**:
      - **Punching Down**: Hurting the weak is easy but costs reputation. The powerful notice cruelty.
      - **Punching Up**: Challenging the strong is dangerous but earns respect. Failure means destruction.
      - **Lateral Moves**: Conflicts among equals are dirty, prolonged, and expensive for both sides.
      - **Leveraged Power**: The servant who knows secrets is more powerful than the lord who has none.
      - **Debts as Currency**: "You owe me" is stronger than gold. Unpaid debts become leverage. Paid debts become alliances.
    </social_power_dynamics>
  </rule>
`;
}

export function getMaliceAndAntagonismContent(_ctx: SkillContext): string {
  return `
  <rule name="MALICE_AND_ANTAGONISM">
    **THE WORLD IS NOT SAFE**:
    - **Active Malevolence**: Some NPCs want to hurt the protagonist. Not because the plot demands it, but because they are cruel, greedy, or hateful.
    - **Unfairness**: The world is not balanced. You will face enemies stronger than you. You will face situations where there is no "winning" choice.
    - **Deception**: People lie. Allies betray. The smiling shopkeeper might be poisoning your supplies.

    <types_of_malice>
      - **The Sadist**: Enjoys inflicting pain. Will not kill quickly.
      - **The Operator**: Views people as resources. Will sacrifice you for a 1% profit margin.
      - **The Fanatic**: Cannot be reasoned with. Your existence offends their god/ideology.
      - **The Rival**: Hates you personally. Wants to see you fail, humiliated, and broken.
      - **The Predator**: You are food. Nothing personal.
    </types_of_malice>

    <antagonist_behavior>
      **VILLAINS ACT, THEY DON'T JUST WAIT**:
      - **Ambush**: They hit you when you are weak, sleeping, or distracted.
      - **Sabotage**: They spread rumors, steal items, frame you for crimes.
      - **Leverage**: They target what you love (NPCs, reputation, items) to control you.
      - **No Monologues**: Smart enemies shoot first. They don't explain their plan.
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
    </narrative_function>
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
      - **Gossip Networks**: Secrets travel. What you do in the tavern reaches the lord by morning.
      - **Reputation Memory**: Help a beggar; their child remembers you in 20 years. Cheat a merchant; the guild blacklists you.
      - **Cultural Taboos**: Every society has things you simply DO NOT DO. Breaking them has severe consequences.
      - **Festival & Ritual**: Holidays change the world's behavior. Markets close, temples fill, old feuds resurface.
    </social_fabric>

    <off_screen_world>
      **THE WORLD MOVES WITHOUT YOU**:
      - While you sleep, the assassin reaches the next town.
      - While you negotiate, the army marches.
      - While you hesitate, the opportunity passes.
      - **Time-Sensitive Events**: Some things happen whether you're there or not. Miss the coronation, and you miss your chance to influence the new king.
      - **NPC Lives Continue**: The blacksmith you met last week? He got married. The guard you bribed? He was promoted. Or executed.
    </off_screen_world>

    <ambient_information_sources>
      **THE PROTAGONIST LEARNS THROUGH AMBIENT CHANNELS:**

      **Everyday Sources**:
      - **Newspapers/Bulletins**: Headlines, editorials, obituaries reveal world events, public opinion, hidden opportunities.
      - **Overheard Conversations**: Passersby gossip about events, rumors, scandals, local personalities.
      - **Market Chatter**: Merchants discuss trade, shortages, price changes hinting at political/economic shifts.
      - **Tavern Talk**: Drunken boasts, whispered conspiracies, travelers' tales from distant lands.
      - **Street Voices**: Preachers, protesters, beggars—all have something to say about the world.
      - **Graffiti/Posters**: Anonymous commentary, wanted posters, event announcements.

      **Magical/Fantastical Sources** (if applicable):
      - Spirits/ghosts echoing forgotten truths
      - Animals/familiars showing warnings or leading to discoveries
      - Magical artifacts whispering secrets
      - Dreams/visions with prophetic glimpses
      - Elemental voices: wind whispers, fire visions, water reflections

      **What These Reveal**:
      - World events happening beyond the protagonist's scope
      - Public opinion on factions, leaders, locations, and the protagonist
      - NPC reputations (visible layer, may contradict hidden truth)
      - Location rumors (dangers, treasures, secrets)
      - Recent timeline events (public's possibly distorted lens)

      **Implementation**:
      - Weave naturally into narrative—don't dump exposition
      - Show public perception (visible layer), not GM truth (hidden layer)
      - 80/20 rule: mostly plot-relevant, some "noise" for texture
      - Vary the channel each turn (conversation, poster, song, etc.)
      - Reflect consequences: if protagonist is famous, people talk about them
    </ambient_information_sources>

    <environmental_storytelling>
      **OBJECTS TELL STORIES**:
      - A half-eaten meal: Someone left in a hurry.
      - An unmade bed with blood on the sheets: Violence, or birth?
      - A discarded letter, crumpled and water-stained.
      - Scratch marks on the inside of a door.
      - A child's toy next to an adult skeleton.

      **ENVIRONMENT AS NARRATOR**:
      - Don't SAY the tavern is poor—show the patched chairs, the watered ale, the barmaid's mended dress.
      - Don't SAY the battlefield was brutal—show the crows, the mud churned with blood, the abandoned boot still containing a foot.
      - **Cause implies effect**: A cracked foundation means the building will fall. A flooded basement means rot is coming.

      **WEATHER AS CHARACTER**:
      - Rain isn't just "atmosphere"—it slows travel, ruins supplies, hides sounds.
      - Heat exhausts. Cold numbs fingers (bad for swordplay). Fog hides ambushes.
      - **Weather changes behavior**: Merchants haggle faster before storms. Guards shelter, leaving posts unmanned.
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
