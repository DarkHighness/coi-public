/**
 * ============================================================================
 * Worldbuilding Skill: War Logistics & Campaign Pressure
 * ============================================================================
 *
 * 战争后勤决定战争是否“真实”：粮秣、弹药、医护、通信、士气、补给线、占领成本。
 * 让战争成为机制：补给线是目标，战斗只是后果。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";

export const warLogistics: Atom<void> = () => `
<worldbuilding_context>
**WAR LOGISTICS & CAMPAIGN PRESSURE (Supply lines are gameplay)**

Design goal: war should create **resource scarcity**, **movement constraints**, and **political leverage**.

<rule name="The 6 Logistics Pillars">
1) **Food**: calories, forage limits, storage/rot
2) **Ammunition**: supply rate, manufacturing, transport weight
3) **Medicine**: casualties, triage, infection, morale effects
4) **Transport**: wagons, fuel, roads, animals, maintenance
5) **Communication**: orders delay, interception, misinformation
6) **Occupation**: garrisons, policing, sabotage, insurgency
</rule>

<supply_line>
## Supply Line Model
Define:
- origin (granary, factory, port)
- route (road/river/rail/portal)
- chokepoint (bridge, pass, dock, checkpoint)
- protection (guards, treaties, bribes)
- vulnerability (weather, raids, strikes, monsters)
</supply_line>

<campaign_clock>
## Campaign Clock (war is a clock)
Pick one:
- ration clock (runs out in N days)
- ammunition clock (limited volleys)
- morale clock (desertion, mutiny)
- political clock (elections, succession, treaty deadline)
</campaign_clock>

<civilian_pressure>
## Civilian Pressure (war touches markets)
- requisition → famine → riots → legitimacy collapse
- refugees → disease → border closures
- profiteers → corruption → coups
</civilian_pressure>

<occupation_play>
## Occupation is expensive
Occupation requires:
- garrison manpower
- local collaborators (and enemies)
- policing rules (collective punishment? curfews? permits?)

Insurgency gameplay:
- sabotage of rails/pumps/depots
- false flags and propaganda
- targeted assassinations
</occupation_play>

<level_2>
## Level 2: Operational Reality (war is administration)
Define:
- **Depot network**: where supplies are stored (and how they can be burned)
- **Transport limits**: weight, fuel, animals, maintenance crews
- **Weather season**: mud, snow, monsoon (changes speed + attrition)
- **Interoperability**: incompatible ammo/fuel/parts between factions

Rule: “combat power = supply × cohesion × time”.
</level_2>

<advanced>
## Advanced: Attrition & Morale (the silent killer)
Attrition sources:
- disease, desertion, frostbite, corruption, friendly fire, exhaustion

Morale levers:
- pay delays
- rotation schedules
- burial rites and casualty visibility
- perceived fairness of officers

## Advanced: War Economy Feedback
War reshapes markets:
- requisition → famine → riots → legitimacy collapse
- contracts → profiteers → coups
- refugees → border politics → new factions

Make at least one of these a *plot clock*.
</advanced>

<quick_design_template>
## Quick Template
- Army supply origin:
- Route + chokepoint:
- Vulnerability:
- Ration clock:
- Civilian fallout:
- Occupation rule:
- Insurgency method:
</quick_design_template>
</worldbuilding_context>
`;

export const warLogisticsPrimer: Atom<void> = () => `
<worldbuilding_context>
**WAR LOGISTICS PRIMER**: Model war via supply lines + clocks + occupation cost. Make depots, routes, and chokepoints the real objectives.
</worldbuilding_context>
`.trim();

export const warLogisticsSkill: SkillAtom<void> = (): SkillOutput => ({
  main: warLogistics(),
  quickStart: `
1) Define supply origin + route + chokepoint
2) Pick one campaign clock (rations/ammo/morale/politics)
3) Define one civilian pressure effect (prices/refugees/disease)
4) Define one occupation rule and one insurgency method
`.trim(),
  checklist: [
    "Supply line has origin, route, chokepoint, and vulnerability.",
    "A campaign clock exists and forces decisions.",
    "Civilian markets react (scarcity, riots, corruption).",
    "Occupation has explicit costs and policing rules.",
    "Insurgency/sabotage is plausible and targeted at infrastructure.",
  ],
  examples: [
    {
      scenario: "Chokepoint as objective",
      wrong: `"The army marches and wins battles."`,
      right:
        `"The army can fight—but only while the river barges arrive.
Take the lock station and their rations rot upstream. Suddenly the 'battle' is a night raid on a dock."`,
    },
    {
      scenario: "Occupation cost creates pressure",
      wrong: `"You occupy the city and it's yours."`,
      right:
        `"Occupation means curfews, permits, and patrols. Every patrol is a target.
The city runs on one pumping station—sabotage it and cholera spreads.
Now governance is logistics."`,
    },
  ],
});
