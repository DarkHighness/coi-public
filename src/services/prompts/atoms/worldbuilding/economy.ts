/**
 * ============================================================================
 * Worldbuilding Skill: Economy & Scarcity
 * ============================================================================
 *
 * 经济不是“背景设定”，它是玩家选择的摩擦力来源：
 * 价格、稀缺、供应链、税费、信用、黑市、执法与腐败，都会把故事推向决策。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";

export const economy: Atom<void> = () => `
<worldbuilding_context>
**ECONOMY & SCARCITY (Systemic, Play-Generating)**

Design goal: make money, goods, and labor create *choices* and *pressure*.

<rule name="The 6 Levers (use 2-3 per location)">
1) **Scarcity**: what is hard to get *here* and why?
2) **Friction**: what taxes, fees, permits, tolls, bribes exist?
3) **Dependency**: what does this place rely on imports for?
4) **Substitutes**: what do people use when the real thing is unavailable?
5) **Enforcement**: who punishes smuggling / counterfeits / tax evasion?
6) **Credit**: who lends, on what terms, and what happens on default?
</rule>

<supply_chain>
## Supply Chains (the world moves through routes)
- **Route**: road/river/sea/portal/rail.
- **Chokepoints**: bridges, passes, canals, customs stations.
- **Carriers**: guilds, caravans, unions, smugglers.
- **Failure modes**: storms, bandits, strikes, war, sanctions, monster migration.

Questions:
- What happens to *prices* if the route breaks for a week?
- Who profits from shortages (hoarders, officials, smugglers)?
</supply_chain>

<price_pressure>
## Prices that create play (avoid “flat gold”)
- **Food**: stable only when harvest + storage + security hold.
- **Medicine**: scarcity spikes after violence/disease.
- **Weapons**: controlled by law + craft capacity.
- **Information**: rumor has a market (who pays to know / to silence?).

Simple model per settlement:
- 1 **cheap** staple (abundant local)
- 1 **expensive** necessity (imported/controlled)
- 1 **volatile** good (seasonal / dangerous supply)
</price_pressure>

<labor_and_wages>
## Labor & Wages (who works, who owns, who can strike)
- Identify 2-3 major employers (nobles, corp, temple, guild, state).
- Define **wage pressure**: debt, indenture, rent, quotas, conscription.
- Add 1 **collective actor**: union, guild, brotherhood, clan.
</labor_and_wages>

<tax_and_corruption>
## Tax, Fees, and Corruption (friction is a story engine)
- **Legal friction**: tariffs, licenses, permits, inspections, “safety” fees.
- **Illegal friction**: bribes, protection money, kickbacks, confiscation.
- **Conflict**: honest officials vs. corrupt chain-of-command.
</tax_and_corruption>

<black_market>
## Black Markets (pressure valve + danger)
- Black market exists when: **need + prohibition + enforcement gap**.
- Smuggling logic: who provides cover, storage, transport, laundering?
- Consequences: informants, sting operations, gang wars, debt bondage.
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
`;

export const economyPrimer: Atom<void> = () => `
<worldbuilding_context>
**ECONOMY PRIMER**: Use scarcity + friction + dependency to create choices (tolls, bribes, shortages, debt). Avoid flat prices.
</worldbuilding_context>
`.trim();

export const economySkill: SkillAtom<void> = (): SkillOutput => ({
  main: economy(),
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
      wrong:
        `"Everything costs about the same as everywhere else, and money is just flavor."`,
      right:
        `"Salt is the town’s blood. The river road washed out—prices tripled in two days.
The dockmaster offers 'emergency access' for a fee. Smugglers offer it cheaper,
but the customs captain hangs smugglers in the square."`,
    },
    {
      scenario: "Credit with teeth",
      wrong: `"You borrow money from the bank."`,
      right:
        `"The lender writes your name into a ledger kept by the temple.
Miss a payment and you’re 'unclean': guards can detain you at any gate,
and merchants refuse service unless you pay the purification fee."`,
    },
  ],
});

