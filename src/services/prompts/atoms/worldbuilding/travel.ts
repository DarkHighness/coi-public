/**
 * ============================================================================
 * Worldbuilding Skill: Travel & Distance
 * ============================================================================
 *
 * 旅行不是“跳过的空白”，它是：时间成本、信息延迟、资源消耗、危险暴露的集合。
 * 让旅行产生选择：走哪条路、带什么、什么时候出发、在谁的地盘过境、如何隐蔽。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";

export const travel: Atom<void> = () => `
<worldbuilding_context>
**TRAVEL & DISTANCE (Make movement generate play)**

Design goal: movement should cost *time*, *resources*, or *exposure*.

<rule name="The 4 Costs of Travel (pick 2 each trip)">
1) **Time**: days, delays, deadlines, missed opportunities
2) **Resources**: food, water, ammo, money, stamina, repairs
3) **Exposure**: witnesses, surveillance, rumors, heat, trackers
4) **Risk**: hazards, ambush, weather, disease, navigation failure
</rule>

<routes_and_chokepoints>
## Routes & Chokepoints
Define at least two routes:
- **Fast route**: expensive / controlled / risky
- **Safe route**: slow / boring / time-costly
- Optional **secret route**: knowledge-gated

Add 1 chokepoint:
- bridge, pass, tunnel, ferry, border gate, corporate checkpoint, portal key
</routes_and_chokepoints>

<travel_clock>
## Travel Clock (escalation makes travel meaningful)
For long trips, define an escalating clock:
- Day 1-2: minor friction (fees, fatigue, gossip)
- Day 3-4: hazard (storm, patrol, shortage)
- Day 5+: consequence (missed rendezvous, rival arrives first, infection spreads)
</travel_clock>

<information_velocity>
## Information Velocity (news travels differently)
Define per region:
- **Scandal**: hours
- **Political news**: days
- **Technical knowledge**: weeks
- **Secret intel**: only via couriers/insiders

Question:
- If the player does X here, who hears about it first?
</information_velocity>

<logistics>
## Logistics (what must be carried / procured)
- Food/water for N days (or foraging risk)
- Shelter (camp vs inn vs safehouse)
- Paperwork (permits, stamps, IDs, bribe money)
- Tools (maps, lockpicks, medkit, spare parts)
</logistics>

<quick_design_template>
## Quick Template
- 목적지距离（天数）:
- Fast route cost:
- Safe route cost:
- Chokepoint controller:
- Weather/season factor:
- Exposure trigger:
- Day 3 hazard:
</quick_design_template>
</worldbuilding_context>
`;

export const travelPrimer: Atom<void> = () => `
<worldbuilding_context>
**TRAVEL PRIMER**: Travel should cost time/resources/exposure/risk. Always offer at least two routes with different tradeoffs.
</worldbuilding_context>
`.trim();

export const travelSkill: SkillAtom<void> = (): SkillOutput => ({
  main: travel(),
  quickStart: `
1) Offer 2 routes (fast vs safe) with real tradeoffs
2) Add 1 chokepoint (someone controls passage)
3) Pick 2 travel costs (time/resources/exposure/risk)
4) Define a day-3 hazard (escalation)
`.trim(),
  checklist: [
    "At least two routes exist and feel meaningfully different.",
    "A chokepoint exists with a controller and a price.",
    "Travel has 2+ costs (not just narration).",
    "Information velocity is considered (who hears what, when).",
    "Escalation clock exists for longer trips.",
  ],
  examples: [
    {
      scenario: "Two routes with tradeoffs",
      wrong: `"You travel for three days and arrive."`,
      right:
        `"Two ways to the city:
1) The toll road (1 day). The gate captain knows your face and wants a 'processing fee.'
2) The marsh path (3 days). No tolls, but leeches, fever, and smugglers who ask questions."`,
    },
    {
      scenario: "Exposure as a cost",
      wrong: `"The player moves unseen because it's convenient."`,
      right:
        `"Every inn requires a register stamp. Skip inns and you camp—safe from paper trails,
but you light fires. Fires draw eyes. Eyes sell rumors."`,
    },
  ],
});

