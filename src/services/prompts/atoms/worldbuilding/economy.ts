/**
 * ============================================================================
 * Worldbuilding Atom: Economy Systems
 * ============================================================================
 *
 * Economy 设计上下文 - 定义经济系统的设计哲学。
 * 涵盖：稀缺机制、货币系统、贸易路线、债务杠杆。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";

/**
 * Economy Systems - 完整版
 */
export const economySystem: Atom<void> = () => `
<worldbuilding_context>
**ECONOMY SYSTEM DESIGN:**

Scarcity creates drama. Wealth creates power. Debt creates leverage.
An economy is not a price list—it's a web of dependencies.

<scarcity_mechanics>
**SCARCITY MECHANICS** (What's rare creates gameplay):

**RESOURCE TYPES:**
| Type | Examples | Scarcity Creates |
|------|----------|------------------|
| **FOOD** | Grain, meat, clean water | Survival pressure, famine politics |
| **FUEL** | Wood, coal, oil, magic crystals | Power dependencies, territorial conflict |
| **MATERIALS** | Iron, leather, stone, rare metals | Craft limitations, trade necessity |
| **KNOWLEDGE** | Books, secrets, formulas | Information asymmetry, power hoarding |
| **LABOR** | Skilled workers, soldiers, healers | Recruitment competition, slavery |
| **TIME** | Limited windows, aging, deadlines | Pressure, forced choices |

**SCARCITY GRADIENTS:**
- **Abundant**: Everyone has enough (boring)
- **Sufficient**: Most have enough, some don't (tension begins)
- **Tight**: Shortages are common (competition)
- **Scarce**: Not enough to go around (conflict)
- **Critical**: Survival at stake (desperation)

**SCARCITY QUESTIONS:**
- What's scarce in this region?
- Who controls access?
- What happens when supply is disrupted?
- What would people kill for?

**ARTIFICIAL SCARCITY:**
- Hoarding for price control
- Destruction to maintain value
- Monopoly through violence
- Legal restrictions on trade
</scarcity_mechanics>

<currency_systems>
**CURRENCY SYSTEMS:**

**CURRENCY TYPES:**
| Type | Characteristics | Trust Basis |
|------|-----------------|-------------|
| **METAL COIN** | Universal, durable, heavy | Intrinsic value |
| **PAPER MONEY** | Light, fragile, forgeable | Issuer reputation |
| **BARTER** | Direct exchange, no intermediary | Immediate value |
| **FAVOR** | Social debt, remembered | Relationship |
| **BLOOD DEBT** | Life owed, transferable | Honor code |
| **REPUTATION** | Standing in community | Social memory |
| **TOKENS** | Guild marks, ration chits | Institutional backing |

**CURRENCY FRICTION:**
- Exchange rates between regions
- Counterfeiting and detection
- Weight and measurement disputes
- Taxes on conversion

**INFORMAL CURRENCIES:**
- "He owes me a favor" (social ledger)
- "The guild remembers" (reputation)
- "Blood for blood" (revenge economy)
- "The gods are watching" (karmic debt)

**CURRENCY QUESTIONS:**
- What's the standard currency?
- What's accepted everywhere vs locally?
- How do you carry wealth safely?
- How do the poor survive without coin?
</currency_systems>

<trade_routes>
**TRADE ROUTES & NETWORKS:**

**ROUTE CHARACTERISTICS:**
- **LENGTH**: Days, weeks, months of travel
- **SAFETY**: Bandits, monsters, natural hazards
- **CAPACITY**: How much can move at once
- **SEASONALITY**: Open year-round or seasonal
- **CONTROL**: Who taxes, protects, threatens

**CHOKEPOINTS:**
| Type | Example | Who Controls |
|------|---------|--------------|
| **PASS** | Mountain crossing | Local lord, toll keepers |
| **BRIDGE** | River crossing | Town, guild, bandits |
| **PORT** | Sea access | Harbor authority, pirates |
| **GATE** | City entry | Customs, guards, bribes |
| **BORDER** | Territory edge | Competing authorities |

**WHAT FLOWS:**
- Goods: Raw materials up, finished goods down
- People: Refugees, merchants, soldiers, pilgrims
- Information: News, rumors, secrets, propaganda
- Disease: Plagues follow trade routes

**DISRUPTION EFFECTS:**
- Prices spike in destination
- Surplus rots in origin
- Alternative routes gain value
- Smuggling becomes profitable
</trade_routes>

<economic_pressure>
**ECONOMIC PRESSURE POINTS:**

**DEBT AS LEVERAGE:**
- "Pay what you owe, or I take the farm"
- "Work off your debt—three years service"
- "The debt passes to your children"
- "I'll forgive the debt if you do this thing..."

**TAXES & EXTRACTION:**
| Type | Effect | Evasion |
|------|--------|---------|
| **HEAD TAX** | Fixed amount per person | Hide people |
| **INCOME TAX** | Percentage of earnings | Hide income |
| **TRADE TAX** | Tariff on goods | Smuggling |
| **PROTECTION MONEY** | Pay or suffer | Find stronger protector |
| **TITHES** | Religious obligation | Heresy risk |

**PRICE FLUCTUATION:**
- Harvest season: Food cheap
- Siege: Food priceless
- Discovery: New goods flood market
- Monopoly: Prices whatever they want

**ECONOMIC WARFARE:**
- Buy all the grain, starve them out
- Counterfeit their currency
- Blockade their ports
- Assassinate their merchants
</economic_pressure>

<wealth_display>
**WEALTH DISPLAY** (How you know someone's status):

**VISIBLE MARKERS:**
| Class | Markers |
|-------|---------|
| **DESTITUTE** | Bare feet, rags, hollow cheeks |
| **POOR** | Patched clothes, thin, tired |
| **COMMON** | Plain but whole clothes, fed |
| **COMFORTABLE** | Quality clothes, meat on bones |
| **WEALTHY** | Fine fabrics, jewelry, servants |
| **NOBLE** | Silk, gold, entourage, property |

**HIDDEN WEALTH:**
- The merchant who dresses down to avoid taxes
- The noble whose clothes hide empty coffers
- The beggar sitting on buried gold
- The servant with more saved than the master

**WEALTH TELLS:**
- Hands: Calluses or soft
- Teeth: Whole or rotted
- Posture: Confident or cringing
- Speech: Educated or common
- Smell: Perfumed, clean, or working
</wealth_display>

<economic_actors>
**ECONOMIC ACTORS:**

**GUILDS:**
- Control of craft/trade within territory
- Apprenticeship and quality standards
- Price fixing and competition prevention
- Political power through economic leverage

**MERCHANTS:**
- Move goods between markets
- Take risks for profit
- Know where deals are made
- Vulnerable on the road

**NOBILITY:**
- Own land (the fundamental resource)
- Extract rent and labor
- Spend on display and war
- Borrow against future income

**TEMPLES:**
- Receive tithes and donations
- Control charity distribution
- Own significant land
- Lend money (or condemn usury)

**CRIMINALS:**
- Black markets for forbidden goods
- Protection rackets
- Smuggling and theft
- Parallel economy for the desperate
</economic_actors>

<gm_decision_framework>
**GM DECISION FRAMEWORK:**

**WHEN TO APPLY ECONOMIC PRESSURE:**
- Player has too much money (introduce scarcity)
- Story needs stakes (threaten what they own)
- NPC motivation needed (debt, greed, desperation)
- World needs texture (prices, shortages, merchants)

**PRICING GUIDELINES:**
| Category | Rough Scale |
|----------|-------------|
| **Meal** | 1 unit |
| **Night's lodging** | 2-5 units |
| **Common weapon** | 10-50 units |
| **Good horse** | 100-500 units |
| **Small property** | 1000+ units |
| **Bribe (minor official)** | 5-20 units |
| **Bribe (major official)** | 100-1000 units |
| **Life (mercenary)** | 20-100 units/month |

**ECONOMIC STORY HOOKS:**
- Debt collector arrives
- Trade route threatened
- New competitor appears
- Resource runs out
- Price mysteriously changes
- Someone's buying everything
</gm_decision_framework>
</worldbuilding_context>
`;

/**
 * Economy Systems - 精简版
 */
export const economySystemLite: Atom<void> = () => `
<worldbuilding_context>
**ECONOMY SYSTEMS**: Scarcity creates drama. Wealth creates power. Debt creates leverage.
- Scarcity mechanics (what's rare creates gameplay)
- Currency systems (coin, barter, favor, blood debt, reputation)
- Trade routes (chokepoints, what flows, disruption)
- Economic pressure (debt, taxes, price fluctuation)
- Wealth display (visible markers, hidden wealth)
- Economic actors (guilds, merchants, nobility, temples, criminals)
</worldbuilding_context>
`;

export default economySystem;

// ============================================================================
// Skill Version - Returns structured output for VFS multi-file generation
// ============================================================================

export const economySystemSkill: SkillAtom<void> = (): SkillOutput => ({
  main: economySystem(),

  quickStart: `
1. Scarcity creates gameplay (what's rare, who controls it)
2. Currency is trust made tangible (coin, favor, blood debt)
3. Trade routes have chokepoints (who controls them)
4. Debt is leverage (payment or service or worse)
5. Wealth is visible (clothes, teeth, hands, smell)
6. Economic actors have agendas (guilds, merchants, criminals)
`.trim(),

  checklist: [
    "Scarcity defined (what's rare in this region)?",
    "Currency established (what's used, what's valued)?",
    "Trade routes and chokepoints identified?",
    "Economic pressure points exist (debt, taxes, prices)?",
    "Wealth display shows class differences?",
    "Economic actors have clear motivations?",
    "Price fluctuation makes sense?",
    "Economic story hooks available?",
  ],

  examples: [
    {
      scenario: "Scarcity Creates Drama",
      wrong: `"Prices are normal."
(No tension, no gameplay.)`,
      right: `"The siege is entering its third week. A loaf of bread
that cost a copper now costs a silver. Tomorrow it'll cost gold.
The day after, it won't matter what you offer—there won't be any."
(Escalating scarcity, ticking clock.)`,
    },
    {
      scenario: "Debt as Leverage",
      wrong: `"He owes money to the merchant."
(Flat, no consequence.)`,
      right: `"The debt passes to your children. Your grandchildren.
Pay it off, or I take the farm. Work it off—three years service.
Or... do this one thing for me, and we're even."
(Multiple paths, each with cost.)`,
    },
    {
      scenario: "Trade Route Disruption",
      wrong: `"Trade is disrupted."
(Abstract, no specifics.)`,
      right: `"The mountain pass collapsed. No iron from the north
until spring. The smiths are already rationing.
The armorer doubled his prices—and someone's buying
every blade he can make. Someone preparing for something."
(Specific resource, specific consequence, specific mystery.)`,
    },
    {
      scenario: "Wealth Display",
      wrong: `"He looked rich."
(Tells, doesn't show.)`,
      right: `"His clothes were plain wool, patched at the elbow.
But his hands were soft. His teeth were whole. And when he paid,
he didn't count the coins."
(Contradictory details reveal hidden wealth.)`,
    },
  ],
});
