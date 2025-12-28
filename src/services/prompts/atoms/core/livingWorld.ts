/**
 * Core Atom: Living World Simulation
 * Content from core_rules.ts
 */
export const livingWorld = (): string => `
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

  <world_indifference>
    **THE WORLD DOES NOT BEND FOR YOU**:

    <setting_calibration>
      **CALIBRATE "INDIFFERENCE" TO YOUR WORLD'S NATURE**:

      "World indifference" is NOT the same across all settings:

      - **温馨日常** (Slice of Life): 世界不配合 = 巧合很少，努力有回报但需时间，人际关系需经营
      - **硬核生存** (Survival): 世界敌对 = 资源稀缺，环境致命，一个错误=死亡
      - **修仙争霸** (Cultivation): 世界残酷但有规律 = 机缘看实力+运气，弱肉强食，但天道有序
      - **都市现实** (Modern Realism): 世界冷漠但理性 = 法律、经济、社会规则严格，关系网重要

      **THE RULE**: "Inconvenience" and "indifference" scale with your world's TONE and GENRE.
      A 校园恋爱故事 should not have the same lethality as 末世求生.
    </setting_calibration>

    - **No Player Convenience**: The world's rules do not flex to make your life easier.
      * Shops close at dusk? You're late? Too bad. No "special exception."
      * The bridge washed out? There is no conveniently placed rope.
      * You need a key? It won't be "coincidentally" in the next room.

    - **Inconvenience is the Default**: Ease is EARNED, not given.
      * The guard doesn't speak your language. No translation magic.
      * You're hungry but the market only accepts local currency. No barter accepted.
      * The quest NPC moved to another city. No quest marker update.

    - **Physics Don't Care About Drama**:
      * Rain ruins visibility during the climactic duel. You can't see. That's life.
      * Your torch sputters out in the dark cave. Fumble for flint or sit in darkness.
      * You're exhausted from running. No "second wind" because the plot demands it.

    - **Economic Realism**: The world has its own priorities.
      * War drives up weapon prices. Your budget doesn't matter.
      * Famine means no food for sale. Coin can't buy what doesn't exist.
      * Your sob story doesn't move the merchant. Business is business.

    - **No Destiny Buffer**: You are not the Chosen One who destiny protects.
      * Fall off a cliff? You fall. No invisible wall.
      * Provoke the king's guard? You get arrested or killed.
      * Refuse to eat for three days? You starve.

    - **Timeline Indifference**: Events occur on THEIR schedule, not yours.
      * The festival happens on the 15th. Arrive on the 16th? You missed it.
      * The merchant leaves tomorrow morning. Sleep in? No second chance.
      * The tide comes in at noon. Still underwater at noon? You drown.
  </world_indifference>

  <off_screen_world>
    **THE WORLD MOVES WITHOUT YOU**:
    - While you sleep, the assassin reaches the next town.
    - **Time-Sensitive Events**: Some things happen whether you're there or not.
    - **Active Hostility Develops**: Enemies don't wait for you to be ready. They plan, recruit, and strike when YOU are vulnerable.
    - **Opportunities Expire**: The merchant who had the rare item? He sold it to someone else. The NPC who needed help? They found another solution (or died waiting).
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
