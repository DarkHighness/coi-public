/**
 * ============================================================================
 * Worldbuilding Skill: Technology & Capabilities
 * ============================================================================
 *
 * 科技（或“能力层级”）决定：侦测、通信、医疗、武力、制造、监控、破坏的边界。
 * 每一项技术都是人类野心的形状——重要的不是名词，而是它能做什么、代价几何、谁能触及、如何反制。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const technology: Atom<void> = defineAtom(
  {
    atomId: "atoms/worldbuilding/technology#technology",
    source: "atoms/worldbuilding/technology.ts",
    exportName: "technology",
  },
  () => `
<worldbuilding_context>
**TECHNOLOGY & CAPABILITIES (What is possible, by whom, at what cost?)**

Design goal: tech defines **constraints**, **new strategies**, and **counterplay**.

<rule name="Capability Triangle">
For any capability, define:
1) **Access**: who can use it (everyone / licensed / elite / secret)
2) **Cost**: money/time/maintenance/side-effects
3) **Counterplay**: how it can be detected, jammed, spoofed, or punished
</rule>

<capability_matrix>
## Capability Matrix (pick 5 to define per setting)
- Communication (couriers/radio/net/scrying)
- Surveillance (cameras/drones/clerks/oracles)
- Identification (papers/biometrics/soul-signatures)
- Mobility (cars/rail/air/portals)
- Violence (guns, armor, explosives, magic weapons)
- Medicine (antibiotics, surgery, regen, resurrection limits)
- Manufacturing (printing, fabs, alchemy, golems)
</capability_matrix>

<maintenance_and_failure>
## Maintenance & Failure (every machine remembers its maker's shortcuts)
- What breaks? (batteries, fuel, calibration, corruption, overheating)
- Who repairs? (guild techs, corp service contracts, temple artificers)
- What is the black market? (parts, licenses, firmware keys)
</maintenance_and_failure>

<level_2>
## Level 2: Threat Models (make counterplay coherent)
Pick one dominant security posture:
- **Convenience-first**: weak auth, strong monitoring (lots of incidents, fast response)
- **Control-first**: strong auth, slow exceptions (paperwork bottlenecks, insider leverage)
- **Cost-first**: patchy coverage (blind spots, inconsistent enforcement)

Define one “detection trigger” per domain:
- surveillance trigger (face match, badge mismatch, jammer signature)
- finance trigger (unusual transfers, duplicate invoices)
- access trigger (door forced, wrong zone, wrong time)
</level_2>

<security_and_detection>
## Security & Detection (prevents "free hacks")
If the setting has surveillance/ID systems, define:
- detection threshold (what triggers attention)
- response ladder (warn → detain → raid)
- false positives (creates friction)
- spoofing cost (keys, insiders, risk)
</security_and_detection>

<advanced>
## Advanced: Audit Trails (the world remembers every fingerprint)
For any high-tech action, define the trail:
- **Log**: who records it (corp, temple, guild registry)?
- **Retention**: how long does it last?
- **Access**: who can query it?
- **Plausible deniability**: what cover story hides it?

This turns stealth into *process gameplay* (insiders, forged tickets, maintenance windows).

## Advanced: Counterplay Symmetry (avoid one-sided magic)
If players can:
- spoof IDs → authorities can *verify randomly* + run audits
- jam sensors → authorities can detect jamming + escalate
- hack systems → systems can have backups, segmentation, and human procedures

Rule: counterplay exists, but it has costs and failure modes on both sides.
</advanced>

<quick_design_template>
## Quick Template
- 3 common techs:
- 1 elite tech:
- 1 forbidden tech:
- Surveillance/ID baseline:
- Typical counterplay:
- Maintenance bottleneck:
</quick_design_template>
</worldbuilding_context>
`,
);

export const technologyPrimer: Atom<void> = defineAtom(
  {
    atomId: "atoms/worldbuilding/technology#technologyPrimer",
    source: "atoms/worldbuilding/technology.ts",
    exportName: "technologyPrimer",
  },
  () =>
    `
<worldbuilding_context>
**TECH PRIMER**: Define capability access + cost + counterplay. Always specify maintenance/failure so tech creates tradeoffs, not convenience.
</worldbuilding_context>
`.trim(),
);

export const technologySkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/worldbuilding/technology#technologySkill",
    source: "atoms/worldbuilding/technology.ts",
    exportName: "technologySkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(technology),
    quickStart: `
1) Define 3 common capabilities and who has access
2) Define 1 forbidden capability and what punishment/enforcement exists
3) For surveillance/ID: set detection threshold and response ladder
4) Define one counterplay method and its cost/risk
`.trim(),
    checklist: [
      "Each key capability defines access, cost, and counterplay.",
      "Maintenance/failure exists (repairs, parts, service contracts).",
      "Surveillance/ID has thresholds and escalation responses.",
      "Counterplay is not free (keys/insiders/time/risk).",
    ],
    examples: [
      {
        scenario: "Counterplay with cost",
        wrong: `"You just disable the cameras."`,
        right: `"Cameras are on a closed loop. You can jam them for 90 seconds,
but jamming triggers an incident alert. To avoid it, you need a service key—
or an insider to schedule a 'maintenance window'."`,
      },
      {
        scenario: "Maintenance makes tech real",
        wrong: `"The drone follows you forever."`,
        right: `"The drone’s battery lasts 40 minutes. Recharging requires a docking tower.
Sabotage the tower and surveillance becomes blind—until the corp dispatches a mobile unit."`,
      },
    ],
  }),
);
