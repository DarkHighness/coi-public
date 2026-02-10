/**
 * ============================================================================
 * Worldbuilding Skill: Law & Jurisdiction
 * ============================================================================
 *
 * 法律的核心不是条文——它是刀锋的朝向。
 * 谁有权、谁执行、谁能被收买、谁能上诉、代价是什么——
 * 这些问题的答案，画出了权力的真实边界。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";


export const lawJurisdiction: Atom<void> = defineAtom({ atomId: "atoms/worldbuilding/lawJurisdiction#lawJurisdiction", source: "atoms/worldbuilding/lawJurisdiction.ts", exportName: "lawJurisdiction" }, () => `
<worldbuilding_context>
**LAW & JURISDICTION (Where authority ends, story begins)**

Design goal: make authority and enforcement create **risk**, **leverage**, and **alternative routes**. Every border between jurisdictions is a seam — and seams are where things tear.

<rule name="The 5 Questions">
1) **Who has authority here?** (and where does it stop?)
2) **Who enforces?** (capacity, incentives, chain-of-command)
3) **What is actually punished?** (in practice, not in theory)
4) **What can be bought?** (bribe points, blackmail points)
5) **What is the appeal path?** (and how slow/costly is it?)
</rule>

<jurisdiction_map>
## Jurisdiction Map (boundaries matter — power is not infinite, only local)
Create 2-3 layers:
- **Formal**: state/duke/corp/temple law — the map they print
- **Local**: guild codes, neighborhood bosses, clan rules — the map people actually live by
- **Special**: military zones, sacred grounds, quarantine districts — the map drawn by emergency

Edge cases (where jurisdiction frays, story grows):
- Who can arrest a foreigner?
- Does your warrant cross the river? the wall? the corporate campus?
</jurisdiction_map>

<enforcement_capacity>
## Enforcement Capacity (the real limiter — all authority is bounded by the number of boots on the ground)
- **Coverage**: how many patrols, how fast response?
- **Detention**: where do they hold people? who feeds them? (A jail is a budget line, not a moral statement)
- **Evidence**: what counts (witness, document, confession, magic, logs)?
- **Violence threshold**: when do they escalate to lethal force? (The line between order and murder is drawn by policy, not morality)
</enforcement_capacity>

<penalties>
## Penalties (costs that shape behavior — punishment is architecture, not revenge)
Prefer penalties that create story:
- **Fines** (creates debt)
- **Confiscation** (creates recovery missions)
- **Branding/registry** (creates social constraint)
- **Exile** (creates relocation)
- **Indenture** (creates obligation arcs)
- **Execution** (rare, but credible)

Rule of thumb: punishments should create *next actions*, not dead ends.
</penalties>

<corruption_and_leverage>
## Corruption & Leverage (every system has a price — the question is who pays it)
Define:
- 1 **bribe gate** (who can be paid to look away?)
- 1 **principled actor** (who cannot be bought?)
- 1 **blackmail chain** (who is protecting whom?)
- 1 **public line** (what scandal forces action?)
</corruption_and_leverage>

<procedures>
## Procedures (how the machine works — justice is a bureaucracy before it is a principle)
Pick defaults:
- Stop-and-question rules
- Search/seizure rules
- Right to counsel/advocate (or not)
- Trial method (judge, jury, dueling, arbitration)
- Bail/bond or hostage systems
</procedures>

<quick_design_template>
## Quick Template
- Authority:
- Enforcement arm + capacity:
- Practical taboo crime (always punished):
- Buyable infraction:
- Evidence standard:
- Typical detention duration:
- Appeal path:
- Bribe gate:
- Principled actor:
</quick_design_template>
</worldbuilding_context>
`);

export const lawJurisdictionPrimer: Atom<void> = defineAtom({ atomId: "atoms/worldbuilding/lawJurisdiction#lawJurisdictionPrimer", source: "atoms/worldbuilding/lawJurisdiction.ts", exportName: "lawJurisdictionPrimer" }, () =>
  `
<worldbuilding_context>
**LAW PRIMER**: Law is not a moral system -- it is a machine built by the powerful, operated by the underpaid, and maintained by everyone's agreement to pretend it is fair. Model it as authority + enforcement capacity + corruption + appeal path. Focus on practical punishment, not statutes.
</worldbuilding_context>
`.trim());

export const lawJurisdictionSkill: SkillAtom<void> = defineSkillAtom({ atomId: "atoms/worldbuilding/lawJurisdiction#lawJurisdictionSkill", source: "atoms/worldbuilding/lawJurisdiction.ts", exportName: "lawJurisdictionSkill" }, (_input, trace): SkillOutput => ({
  main: trace.record(lawJurisdiction),
  quickStart: `
1) Define jurisdiction boundary (where authority stops)
2) Define enforcement capacity (how fast/how many)
3) Pick one crime that is ALWAYS punished (sets fear line)
4) Pick one infraction that is ALWAYS buyable (sets corruption line)
5) Define appeal path (slow/fast, costly/cheap)
`.trim(),
  checklist: [
    "Jurisdiction boundaries exist and create edge cases.",
    "Enforcement capacity is finite and shapes player risk.",
    "There is at least one non-buyable principled actor.",
    "Penalties create story (debt/confiscation/exile), not dead ends.",
    "Corruption has specific gates (who/when/how much).",
    "Evidence standard is defined (what 'proves' a crime).",
  ],
  examples: [
    {
      scenario: "Authority boundary creates choices",
      wrong: `"The city guards can do anything anywhere."`,
      right: `"The duke’s writ ends at the canal. Across it is Temple District:
city guards cannot enter without a priest’s escort. Smugglers run the canal at night
because the escort is expensive—and the priests keep ledgers."`,
    },
    {
      scenario: "Punishment that generates play",
      wrong: `"You are arrested and executed."`,
      right: `"They seize your tools and register your name. You're released—on bond—
with a summons in three days. Miss it and every gatehouse posts your description.
If you show, you can argue your case… or pay someone to lose the file."`,
    },
  ],
}));
