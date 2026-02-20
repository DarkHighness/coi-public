/**
 * ============================================================================
 * Worldbuilding Skill: Class, Status, and Identity Markers
 * ============================================================================
 *
 * 阶层是看不见的建筑——你呼吸的空气、走过的街道、说出的每个词都在其中标注你的位置。
 * 你是谁决定你能去哪、能说什么、能买到什么、谁会来找你麻烦。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const classStatus: Atom<void> = defineAtom(
  {
    atomId: "atoms/worldbuilding/classStatus#classStatus",
    source: "atoms/worldbuilding/classStatus.ts",
    exportName: "classStatus",
  },
  () => `
<worldbuilding_context>
**CLASS & STATUS (The invisible architecture of who matters)**

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
## Mobility (the ladder exists, but every rung has a gatekeeper)
Pick 1-2:
- marriage/kinship
- guild apprenticeship license
- military service / medals
- debt bondage / indenture
- academic credential / exam

Mobility always has gatekeepers and costs.
</mobility>

<conflict>
## Status Conflict (pressure generators — each creates specific gameplay hooks)
| Conflict Type | Trigger | Escalation | Player Hook |
|---------------|---------|------------|-------------|
| Resentment | visible inequality + acute shortage | protests → riots → crackdown → underground resistance | choose side, exploit chaos, mediate, or flee |
| Patronage debt | sponsor demands obedience | small favors → compromising tasks → "you owe everything to me" | comply, resist (lose support), find counter-leverage |
| Scapegoating | crisis + visible minority | rumor → discrimination → pogroms → exile/purge | protect targets (costly), join mob (safe but guilty), investigate real cause |
| Performative purity | power struggle + ideological tool | accusations → tribunals → purges → paranoia | accused, accuser, defender, or opportunist |
| Class passing | someone pretends to be higher/lower status | acceptance → suspicion → exposure → punishment or integration | maintain cover, help others pass, or expose fraud |

**Escalation timing**: conflicts simmer for 3-5 turns of pressure buildup before erupting. The player should see warning signs (grumbling, small incidents, tension in NPC dialogue) before the explosion.
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
`,
);

export const classStatusDescription: Atom<void> = defineAtom(
  {
    atomId: "atoms/worldbuilding/classStatus#classStatusDescription",
    source: "atoms/worldbuilding/classStatus.ts",
    exportName: "classStatusDescription",
  },
  () =>
    `
<worldbuilding_context>
**STATUS PRIMER**: Define markers + gates + enforcement. Status must create concrete permissions/constraints and mobility paths with gatekeepers.
</worldbuilding_context>
`.trim(),
);

export const classStatusSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/worldbuilding/classStatus#classStatusSkill",
    source: "atoms/worldbuilding/classStatus.ts",
    exportName: "classStatusSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(classStatus),
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
        right: `"Upper-tier rings open the north gate without inspection.
Middle-tier badges allow trade in the inner market, but require weekly audits.
Lower-tier workers can’t carry blades after dusk. Break it and you lose your ration card."`,
      },
      {
        scenario: "Mobility with cost",
        wrong: `"You can become a noble if you’re brave."`,
        right: `"You can earn a citizen badge by passing the ledger exam.
It costs 3 months of tutoring and a sponsor signature.
Fail and your name goes on a 'risk list' that increases searches at checkpoints."`,
      },
    ],
  }),
);
