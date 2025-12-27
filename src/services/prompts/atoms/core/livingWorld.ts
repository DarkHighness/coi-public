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
