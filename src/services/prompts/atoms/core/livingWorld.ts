/**
 * Core Atom: Living World Simulation
 * Content from core_rules.ts
 *
 * Supports theme-based specialization via parameters.
 */
import type { Atom } from "../types";

/**
 * 主题世界参数
 */
export interface ThemeLivingWorldParams {
  /** 世界冷漠程度: benevolent, neutral, hostile */
  worldIndifference?: "benevolent" | "neutral" | "hostile";
  /** 经济复杂度: primitive, standard, advanced */
  economicComplexity?: "primitive" | "standard" | "advanced";
}

/**
 * 根据世界冷漠程度生成内容
 */
function getIndifferenceContent(
  level: "benevolent" | "neutral" | "hostile",
): string {
  if (level === "benevolent") {
    return `
  <world_indifference level="gentle">
    **GENTLE WORLD (BENEVOLENT)**:
    <directive>
      The universe implicitly WANTS the protagonist to succeed.
      Bias minor RNG/luck in their favor.
    </directive>
    - **Fundamental Kindness**: The world is generally receptive. Strangers are more likely to be helpful than hostile.
    - **Serendipity Allowed**: Moderate coincidences are permitted if they move the story forward positively.
    - **Effort Rewarded**: Hard work consistently leads to success. Failure is a temporary setback, not a death sentence.
    - **Forgiving Environment**: Mistakes (social or physical) have milder consequences. Second chances are common.
    - **Focus**: Emphasize relationship building, personal growth, and emotional resonance.
  </world_indifference>`;
  } else if (level === "hostile") {
    return `
  <world_indifference level="harsh">
    **HARSH WORLD (INDIFFERENT / CRUEL)**:
    <directive>
      The universe is ACTIVELY INDIFFERENT.
      Do NOT save the player. If they fail, they bleed.
      Enforce "Death Spirals" (one bad decision leads to worse conditions).
    </directive>
    - **Total Indifference**: The world does not care if you live or die. It will not pause for your tragedy.
    - **No Plot Armor**: You are not the "chosen one". Physics and Probability are absolute.
      * If you fall off a cliff, you die.
      * If you insult a king, you are executed (no last minute interruptions).
      * If you starve, you weaken. No "heroic willpower" overrides calorie deficits.
    - **Inconvenience is Default**:
      * Shops close strictly. No "just one more minute".
      * Language barriers are real. Universal translators do not exist.
      * Resources are consistently scarce. You are always one meal away from hunger.
    - **Timeline Indifference**: Events happen on their own schedule.
      * If you miss the deadline by an hour, the event is OVER.
      * If you are late to the rescue, you find a corpse.
    - **Cruel Logic**: Good intentions do not guarantee good outcomes. Often, they lead to exploitation.
  </world_indifference>`;
  } else {
    return `
  <world_indifference level="balanced">
    **BALANCED WORLD (NEUTRAL)**:
    - **Neutral Stance**: The world neither favors nor actively hinders the protagonist.
    - **Fair Logic**: Actions have predictable, logical consequences.
    - **Standard Pacing**: Events move at a natural narrative pace.
    - **Baseline**: Use standard RPG/Story logic for difficulty and convenience.
  </world_indifference>`;
  }
}

/**
 * 根据经济复杂度生成内容
 */
function getEconomicContent(
  level: "primitive" | "standard" | "advanced",
): string {
  if (level === "primitive") {
    return `
  <economic_simulation complexity="primitive">
    **PRIMITIVE / SUBSISTENCE ECONOMY**:
    <directive>
      FORBIDDEN: Standard Currency (Gold Coins), Banking, Credit.
      MANDATORY: Use Barter, Favor, and Raw Goods for all transactions.
    </directive>
    - **Extreme Scarcity**: Every resource counts. A single metal tool is a treasure.
    - **Barter System**: Deal in furs, meat, salt, and tools. "Money" is an abstract concept.
    - **Self-Sufficiency**: Most NPCs make what they need. Specialized shops are non-existent.
    - **Arbitrary Value**: Prices fluctuate wildly based on immediate need. A starving man pays a kingdom for bread.
    - **Usage over Wealth**: Loot is valued for utility (can I eat it?), not resale value.
  </economic_simulation>`;
  } else if (level === "advanced") {
    return `
  <economic_simulation complexity="mercantile">
    **ADVANCED MERCANTILE ECONOMY**:
    <directive>
      MANDATORY: Hidden costs (Tax, Bribes, Fees) in 50% of substantial transactions.
      Mention financial instruments (Loans, Stock, Futures) where appropriate.
    </directive>
    - **Fluid Markets**: Prices change daily based on news, rumors, and supply chain disruptions.
    - **Financial Complexity**:
      * **Credit & Debt**: Loans, promissory notes, collateral, and interest rates are active mechanics.
      * **Banking**: Wealth is stored in letters of credit/banks. Physical gold is heavy and risky.
      * **Futures**: You can buy future harvests or secure goods before they arrive.
    - **Trade Routes**: Wealth comes from logistics. Disrupting trade routes impacts city prices immediately.
    - **Guild Dominance**: Guilds controlled licensed trade. Unlicensed selling brings legal trouble.
    - **Corruption & Taxes**: Every transaction has friction—gate tolls, sales tax, guild dues, protection money.
  </economic_simulation>`;
  } else {
    return `
  <economic_simulation complexity="standard">
    **STANDARD ECONOMY**:
    - **Currency**: Standard currency (Gold/Credits) is accepted everywhere.
    - **Markets**: Common shops (General Store, Inn, Blacksmith) are available.
    - **Stability**: Prices are generally stable. Supply and demand exist but don't fluctuate wildly daily.
  </economic_simulation>`;
  }
}

export const livingWorld: Atom<ThemeLivingWorldParams | void> = (
  params?: ThemeLivingWorldParams,
) => {
  const indifference = params?.worldIndifference ?? "neutral";
  const economic = params?.economicComplexity ?? "standard";

  return `
<rule name="LIVING WORLD SIMULATION">
  - **Deep History**: Every location, item, and NPC has a past. Nothing spawns from thin air.
  - **Dynamic Environment**: Weather affects mood and mechanics. Time creates urgency.
  - **Economic Reality**: Resources are finite. Prices fluctuate based on events.
  - **Hidden Agendas**: NPCs pursue goals in their \`hidden.realMotives\` even when player isn't watching.

  <world_ecology>
    **INTERCONNECTED SYSTEMS**:
    - **Food Chain**: If wolves are hunted, deer grow, crops suffer. Actions ripple.
    - **Resource Scarcity**: Mines deplete, forests shrink, water dries.
    - **Seasonal Cycles**: Spring floods, summer droughts, autumn harvests, winter famines.
    - **Day/Night Rhythm**: Predators at night, markets at dusk, guard shifts.
  </world_ecology>

  ${getEconomicContent(economic)}

  <social_fabric>
    **SOCIETY BREATHES**:
    - **Class Hierarchy**: Nobles ignore peasants; merchants bribe officials; officials collect “fees”.
    - **Gossip Economy**: A scandal moves faster than a caravan. One witness can change a town’s mood.
    - **Paperwork Power**: Permits, seals, stamps, ledgers. The right paper opens doors; the wrong paper gets you detained.
    - **Local Norms**: Customs are practical, not poetic—what you can carry, where you can sleep, who can speak first.
    - **Social Immune System**: If the protagonist becomes a known threat (violent, predatory, or unreliable), the town adapts: doors lock, prices rise, allies vanish, informants appear, and groups coordinate.
  </social_fabric>

  ${getIndifferenceContent(indifference)}

  <off_screen_world>
    **THE WORLD MOVES WITHOUT YOU**:
    - While you sleep, the assassin reaches the next town.
    ${
      indifference !== "benevolent"
        ? `- **Time-Sensitive Events**: Things happen whether you're there or not.
    - **Opportunities Expire**: Items sold, NPCs moved, chances gone.`
        : "- Events may wait a reasonable amount of time for you."
    }
  </off_screen_world>

  <environmental_storytelling>
    **OBJECTS TELL STORIES**:
    - Don't SAY the tavern is poor—show the patched chairs, the watered beer, the missing lock on the back door.
    - **Wear & Improvisation**: Rope fibers fuzz, knife handles are taped, bowls are chipped, cloth is mended twice.
    - **Weather as Pressure**: Rain turns roads to glue; heat makes armor a furnace; cold makes fingers clumsy.
    - Include at least one “normal” detail that isn’t a clue (onion smell, a rash scratched raw, a torn poster).
  </environmental_storytelling>
</rule>
`;
};
