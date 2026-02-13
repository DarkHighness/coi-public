/**
 * ============================================================================
 * Worldbuilding Skill: Economy & Scarcity
 * ============================================================================
 *
 * 经济不是抽象概念——它是秤砣的重量、账簿上的墨迹、劳工脊背上的汗水。
 * 价格、稀缺、供应链、税费、信用、黑市、执法与腐败，都会把故事推向决策。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const economy: Atom<void> = defineAtom(
  {
    atomId: "atoms/worldbuilding/economy#economy",
    source: "atoms/worldbuilding/economy.ts",
    exportName: "economy",
  },
  () => `
<worldbuilding_context>
**ECONOMY & SCARCITY (The weight of coins, the ink on ledgers, the sweat of labor)**

Design goal: money is not abstract — it is grain rotting in a warehouse, a debtor's sleepless night, the calluses on a dockworker's hands. Make goods, scarcity, and labor create *choices* and *pressure*.

<rule name="The 6 Levers (use 2-3 per location)">
1) **Scarcity**: what is hard to get *here* and why?
2) **Friction**: what taxes, fees, permits, tolls, bribes exist?
3) **Dependency**: what does this place rely on imports for?
4) **Substitutes**: what do people use when the real thing is unavailable?
5) **Enforcement**: who punishes smuggling / counterfeits / tax evasion?
6) **Credit**: who lends, on what terms, and what happens on default?
</rule>

<supply_chain>
## Supply Chains (the world bleeds through its routes)
- **Route**: road/river/sea/portal/rail — every one a vein that can be cut.
- **Chokepoints**: bridges, passes, canals, customs stations — where power congeals.
- **Carriers**: guilds, caravans, unions, smugglers — each with loyalties that bend under weight.
- **Failure modes**: storms, bandits, strikes, war, sanctions, monster migration — the severed artery.

Questions:
- What happens to *prices* if the route breaks for a week?
- Who profits from shortages (hoarders, officials, smugglers)?
</supply_chain>

<price_pressure>
## Prices that create play (avoid "flat gold" — money must smell like something)
- **Food**: stable only when harvest + storage + security hold. Bread is cheap until it isn't — and then it is the only thing that matters.
- **Medicine**: scarcity spikes after violence/disease. The apothecary's price doubles when the screaming starts.
- **Weapons**: controlled by law + craft capacity.
- **Information**: rumor has a market (who pays to know / to silence?). A whispered name can be worth more than a ship.

Simple model per settlement:
- 1 **cheap** staple (abundant local)
- 1 **expensive** necessity (imported/controlled)
- 1 **volatile** good (seasonal / dangerous supply)
</price_pressure>

<labor_and_wages>
## Labor & Wages (who works, who owns, who can strike — and whose back breaks first)
- Identify 2-3 major employers (nobles, corp, temple, guild, state).
- Define **wage pressure**: debt, indenture, rent, quotas, conscription. Every one of these is a leash worn smooth by use.
- Add 1 **collective actor**: union, guild, brotherhood, clan — the fist that forms when individual fingers are too weak.
</labor_and_wages>

<tax_and_corruption>
## Tax, Fees, and Corruption (friction is a story engine — every toll gate is a scene)
- **Legal friction**: tariffs, licenses, permits, inspections, "safety" fees — the state's hand in every pocket.
- **Illegal friction**: bribes, protection money, kickbacks, confiscation — the shadow hand in every other pocket.
- **Conflict**: honest officials vs. corrupt chain-of-command — the rare clean coin in a bag of counterfeits.
</tax_and_corruption>

<black_market>
## Black Markets (the pressure valve — and the blade behind it)
- Black market exists when: **need + prohibition + enforcement gap**. Where the law draws a line, someone digs a tunnel.
- Smuggling logic: who provides cover, storage, transport, laundering?
- Consequences: informants, sting operations, gang wars, debt bondage — the market remembers every transaction.
</black_market>

<quick_design_template>
## Quick Template (fill in 90 seconds)
- Local staple:
- Imported necessity:
- Controlled good (law/guild/corp):
- Main route + chokepoint:
- Tax/bribe friction:
- Primary lender + collateral:
- Black market good + broker:
- What breaks if supply stops for 7 days:
</quick_design_template>
</worldbuilding_context>
`,
);

export const economyPrimer: Atom<void> = defineAtom(
  {
    atomId: "atoms/worldbuilding/economy#economyPrimer",
    source: "atoms/worldbuilding/economy.ts",
    exportName: "economyPrimer",
  },
  () =>
    `
<worldbuilding_context>
**ECONOMY PRIMER**: Money is not flavor — it is the weight of coins in a pocket, the ink drying on a ledger, the silence when someone cannot pay. Use scarcity + friction + dependency to create choices (tolls, bribes, shortages, debt). Avoid flat prices.
</worldbuilding_context>
`.trim(),
);

export const economySkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/worldbuilding/economy#economySkill",
    source: "atoms/worldbuilding/economy.ts",
    exportName: "economySkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(economy),
    quickStart: `
1) Pick 1 imported necessity (creates dependency)
2) Pick 1 controlled good (creates law/guild pressure)
3) Add 1 chokepoint (creates leverage)
4) Add 1 lender (creates debt threats)
5) Decide what happens when supply breaks for 7 days
`.trim(),
    checklist: [
      "At least one good is scarce and has a cause.",
      "A route + chokepoint exists (and someone controls it).",
      "There is friction (tax/fee/bribe) that affects player plans.",
      "A lender/credit system exists with real consequences on default.",
      "A black market exists for at least one prohibited/controlled good.",
      "Supply failure has a concrete, escalating timeline.",
    ],
    examples: [
      {
        scenario: "Scarcity that creates play",
        wrong: `"Everything costs about the same as everywhere else, and money is just flavor."`,
        right: `"Salt is the town’s blood. The river road washed out—prices tripled in two days.
The dockmaster offers 'emergency access' for a fee. Smugglers offer it cheaper,
but the customs captain hangs smugglers in the square."`,
      },
      {
        scenario: "Credit with teeth",
        wrong: `"You borrow money from the bank."`,
        right: `"The lender writes your name into a ledger kept by the temple.
Miss a payment and you’re 'unclean': guards can detain you at any gate,
and merchants refuse service unless you pay the purification fee."`,
      },
    ],
  }),
);
