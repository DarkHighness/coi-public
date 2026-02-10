/**
 * ============================================================================
 * Worldbuilding Skill: Governance & Politics
 * ============================================================================
 *
 * 治理是管理竞争欲望的艺术——合法性来源 + 政策工具 + 执行能力 + 反作用力。
 * 玩家的每一个行动都会在预算、执法、舆论、盟友与敌人之间激起涟漪。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";


export const governancePolitics: Atom<void> = defineAtom({ atomId: "atoms/worldbuilding/governancePolitics#governancePolitics", source: "atoms/worldbuilding/governancePolitics.ts", exportName: "governancePolitics" }, () => `
<worldbuilding_context>
**GOVERNANCE & POLITICS (Legitimacy → Tools → Enforcement → Blowback)**

Design goal: politics should generate **tradeoffs**, **stakeholders**, and **predictable reaction** (not random decrees).

<rule name="The 4-Part Model">
1) **Legitimacy**: why people accept rule (fear, faith, law, prosperity, tradition)
2) **Tools**: what rulers can do (tax, conscript, censor, subsidize, pardon)
3) **Capacity**: how well they can do it (bureaucracy, force, money, information)
4) **Blowback**: who resists and how (strikes, riots, sabotage, coups, secession)
</rule>

<legitimacy_sources>
## Legitimacy Sources (pick 2)
- **Tradition**: lineage, ancient charter, “always been so”
- **Performance**: security, food stability, jobs, low corruption
- **Faith**: divine mandate, prophecy, sacred rite
- **Law**: constitution, courts, procedure (“rule of law” optics)
- **Fear**: secret police, collective punishment, hostage systems
- **Patronage**: everyone depends on the regime for licenses/contracts

Gameplay: legitimacy determines what actions are “unthinkable” vs “normal”.
</legitimacy_sources>

<stakeholders>
## Stakeholders (always define 4)
1) Ruler/executive (what they want, what they fear)
2) Money (merchants, corp, landowners, banks)
3) Force (military, police, mercenaries)
4) Legitimacy brokers (temple, media, courts, guilds, universities)

For each: resource, red line, and “price to cooperate”.
</stakeholders>

<policy_tools>
## Policy Tools (turn into scenes)
- **Tax**: tariffs, head tax, property, “emergency levy”
- **Regulation**: permits, inspections, monopolies
- **Coercion**: raids, curfews, conscription, deportation
- **Information**: censorship, propaganda, registries, surveillance
- **Incentives**: subsidies, pardons, amnesties, contracts

Rule: every tool has a **bureaucratic surface area** (paperwork) and a **black market**.
</policy_tools>

<faction_dynamics>
## Faction Dynamics (politics is a game with no spectators)
Define 2 fault lines:
- ideology vs profit
- center vs periphery
- old elites vs new money
- security vs civil administration

Then define 1 “knife in the dark”: kompromat, audit, assassination, scandal.
</faction_dynamics>

<reaction_table>
## Reaction Table (every act of power sends ripples through the web)
When the player does a political act (exposes corruption, kills an official, smuggles weapons):
- Who benefits immediately?
- Who loses face immediately?
- What process triggers? (audit, crackdown, investigation, sanctions)
- What changes in 7 days? (prices, checkpoints, recruitment, rumors)
</reaction_table>

<anti_patterns>
## Anti-patterns (avoid)
- “The king is evil so guards are everywhere” (no incentive model)
- “Politics = speeches” (no tools/capacity/blowback)
- “Faction = monolith” (no internal tension)
</anti_patterns>

<quick_design_template>
## Quick Template
- Legitimacy (2):
- Stakeholders (money/force/brokers):
- Policy tool in focus:
- Capacity bottleneck:
- Blowback method:
- 7-day reaction change:
</quick_design_template>
</worldbuilding_context>
`);

export const governancePoliticsPrimer: Atom<void> = defineAtom({ atomId: "atoms/worldbuilding/governancePolitics#governancePoliticsPrimer", source: "atoms/worldbuilding/governancePolitics.ts", exportName: "governancePoliticsPrimer" }, () =>
  `
<worldbuilding_context>
**GOVERNANCE PRIMER**: Model rule as legitimacy + tools + capacity + blowback. Always define stakeholders and predictable reactions (7-day effects).
</worldbuilding_context>
`.trim());

export const governancePoliticsSkill: SkillAtom<void> = defineSkillAtom({ atomId: "atoms/worldbuilding/governancePolitics#governancePoliticsSkill", source: "atoms/worldbuilding/governancePolitics.ts", exportName: "governancePoliticsSkill" }, (_input, trace): SkillOutput => ({
  main: trace.record(governancePolitics),
  quickStart: `
1) Pick 2 legitimacy sources (why rule is accepted)
2) Define 4 stakeholders (money/force/legitimacy brokers/executive)
3) Choose 1 policy tool and its paperwork surface area
4) Define 1 blowback method and a 7-day reaction change
`.trim(),
  checklist: [
    "At least two legitimacy sources exist and constrain behavior.",
    "Four stakeholders are defined with resources and red lines.",
    "A policy tool has process + black market side effects.",
    "Capacity bottleneck exists (why rule is imperfect).",
    "Player actions cause predictable reactions on a timeline.",
  ],
  examples: [
    {
      scenario: "Predictable political reaction",
      wrong: `"You expose corruption. The ruler is angry."`,
      right: `"Expose corruption and the court launches an 'anti-corruption audit'.
In 48 hours, permits freeze. In 7 days, a scapegoat is executed.
Merchants hoard goods. The police set up checkpoints 'for inspections'."`,
    },
    {
      scenario: "Legitimacy constrains tools",
      wrong: `"The regime just massacres people whenever."`,
      right: `"The regime survives on 'rule of law' legitimacy. They can't massacre publicly—
they use selective arrests, asset freezes, and trials. Violence happens off-record.
Now the player can force them into visible hypocrisy."`,
    },
  ],
}));
