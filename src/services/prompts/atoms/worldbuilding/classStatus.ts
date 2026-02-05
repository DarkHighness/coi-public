/**
 * ============================================================================
 * Worldbuilding Skill: Class, Status, and Identity Markers
 * ============================================================================
 *
 * 阶层/身份不是“背景设定”，而是：通行证系统 + 特权/限制 + 羞耻/暴力的执行。
 * 把身份做成机制：你是谁决定你能去哪、能说什么、能买到什么、谁会来找你麻烦。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";

export const classStatus: Atom<void> = () => `
<worldbuilding_context>
**CLASS & STATUS (Access control as a social machine)**

Design goal: status creates **permissions**, **costs**, and **social risk**.

<rule name="Status = Marker + Gate + Enforcement">
- **Marker**: how identity is recognized (clothes, accent, papers, biometrics, lineage)
- **Gate**: where it matters (districts, jobs, courts, temples, markets)
- **Enforcement**: who polices it (guards, clerks, mobs, registries)
</rule>

<markers>
## Markers (define 3)
- visible: badge, ring, uniform color, tattoo, toolmark
- behavioral: greeting protocol, honorifics, posture
- documentary: stamps, registry entries, sponsor letters

Make markers falsifiable (forgery) and verifiable (audit) → gameplay.
</markers>

<privileges_and_constraints>
## Privileges & Constraints (concrete)
Define per class:
- 1 privilege (priority line, legal immunity, credit access)
- 1 constraint (curfew, weapon restriction, district ban, forced service)
- 1 “quiet tax” (bribes, protection, humiliations)
</privileges_and_constraints>

<mobility>
## Mobility (how people move between classes)
Pick 1-2:
- marriage/kinship
- guild apprenticeship license
- military service / medals
- debt bondage / indenture
- academic credential / exam

Mobility always has gatekeepers and costs.
</mobility>

<conflict>
## Status Conflict (pressure generators)
- resentment (riots, sabotage)
- patronage (sponsors demand obedience)
- scapegoating (minorities blamed during crisis)
- performative purity (witch hunts)
</conflict>

<anti_patterns>
## Anti-patterns
- “Nobles are rich” (no gates/enforcement)
- “Everyone is equal except vibes” (no privilege/constraint)
- “Discrimination is constant random cruelty” (no mechanism)
</anti_patterns>

<quick_design_template>
## Quick Template
- Classes (3 tiers):
- Markers (3):
- Gate location:
- Privilege + constraint (mid tier):
- Mobility path:
- Audit/verification:
</quick_design_template>
</worldbuilding_context>
`;

export const classStatusPrimer: Atom<void> = () => `
<worldbuilding_context>
**STATUS PRIMER**: Define markers + gates + enforcement. Status must create concrete permissions/constraints and mobility paths with gatekeepers.
</worldbuilding_context>
`.trim();

export const classStatusSkill: SkillAtom<void> = (): SkillOutput => ({
  main: classStatus(),
  quickStart: `
1) Define 3 tiers (upper/middle/lower) with one privilege + one constraint each
2) Define 3 identity markers (visible/behavioral/document)
3) Define one gate location where status matters (district/job/court)
4) Define one mobility path (exam/marriage/guild/military) and its cost
`.trim(),
  checklist: [
    "Markers exist and can be forged but also audited.",
    "Status matters at specific gates (districts, courts, markets).",
    "Each tier has a privilege and a constraint (not just wealth).",
    "Mobility exists with gatekeepers and costs.",
    "Conflict pressure exists (resentment, scapegoating, patronage).",
  ],
  examples: [
    {
      scenario: "Status as access control",
      wrong: `"The city has nobles and peasants."`,
      right:
        `"Upper-tier rings open the north gate without inspection.
Middle-tier badges allow trade in the inner market, but require weekly audits.
Lower-tier workers can’t carry blades after dusk. Break it and you lose your ration card."`,
    },
    {
      scenario: "Mobility with cost",
      wrong: `"You can become a noble if you’re brave."`,
      right:
        `"You can earn a citizen badge by passing the ledger exam.
It costs 3 months of tutoring and a sponsor signature.
Fail and your name goes on a 'risk list' that increases searches at checkpoints."`,
    },
  ],
});

