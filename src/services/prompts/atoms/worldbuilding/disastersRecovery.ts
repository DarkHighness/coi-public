/**
 * ============================================================================
 * Worldbuilding Skill: Disasters, Crisis Response, and Recovery
 * ============================================================================
 *
 * 灾害是伟大的均衡器——它剥去文明的外衣，暴露出谁真正掌握资源、谁真正被抛弃。
 * 谁先得到救援、谁被封锁、谁趁火打劫、谁背锅：灾害面前，一切等级重新洗牌。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const disastersRecovery: Atom<void> = defineAtom(
  {
    atomId: "atoms/worldbuilding/disastersRecovery#disastersRecovery",
    source: "atoms/worldbuilding/disastersRecovery.ts",
    exportName: "disastersRecovery",
  },
  () => `
<worldbuilding_context>
**DISASTERS & RECOVERY (The great equalizer)**

Design goal: crises create **priority conflicts**, **process breakdowns**, and **secondary disasters**. Disaster strips away pretense and reveals the architecture of power beneath.

<rule name="The 5-Stage Disaster Model">
1) **Shock**: immediate damage, confusion
2) **Triage**: who gets help first, who is abandoned
3) **Control**: curfews, quarantine, rationing, checkpoints
4) **Exploitation**: profiteers, power grabs, scapegoats
5) **Recovery**: rebuilding, debt, reforms, memorials, grudges
</rule>

<secondary_disasters>
## Secondary Disasters (always define 2)
Primary event triggers secondaries:
- fire → smoke + looting + water shortage
- flood → disease + crop loss + refugee flow
- quake → infrastructure collapse + rationing + corruption spike
- plague → quarantine + black market meds + witch hunts
</secondary_disasters>

<triage_rules>
## Triage Rules (who matters?)
Define priority order:
- elites first? children first? workforce first? soldiers first?
Define a visible rule and a hidden rule (corruption).
</triage_rules>

<control_measures>
## Control Measures (make it playable)
Pick 2:
- quarantine zones + pass system
- ration cards + audits
- curfews + patrols
- information controls + rumor suppression

Each measure needs:
- enforcement capacity
- workarounds + risks
</control_measures>

<recovery_debt>
## Recovery Debt (the disaster ends, but its debts never do)
Recovery creates:
- debt (to lenders, temples, corps)
- reforms (new laws, new surveillance)
- resentment (who was saved vs abandoned)
- reconstruction contracts (corruption opportunities)
</recovery_debt>

<anti_patterns>
## Anti-patterns
- “Disaster happens, then normal resumes” (no recovery debt)
- “Everyone helps equally” (no triage politics)
- “Quarantine is perfect” (no workarounds/black markets)
</anti_patterns>

<quick_design_template>
## Quick Template
- Primary disaster:
- Secondary disaster #1:
- Secondary disaster #2:
- Visible triage rule:
- Hidden triage rule:
- Control measure + workaround:
- Recovery debt:
</quick_design_template>
</worldbuilding_context>
`,
);

export const disastersRecoveryPrimer: Atom<void> = defineAtom(
  {
    atomId: "atoms/worldbuilding/disastersRecovery#disastersRecoveryPrimer",
    source: "atoms/worldbuilding/disastersRecovery.ts",
    exportName: "disastersRecoveryPrimer",
  },
  () =>
    `
<worldbuilding_context>
**DISASTER PRIMER**: Model crises as cascades + triage + control measures + exploitation + recovery debt. Always define secondary disasters.
</worldbuilding_context>
`.trim(),
);

export const disastersRecoverySkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/worldbuilding/disastersRecovery#disastersRecoverySkill",
    source: "atoms/worldbuilding/disastersRecovery.ts",
    exportName: "disastersRecoverySkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(disastersRecovery),
    quickStart: `
1) Pick one primary disaster and two secondary cascades
2) Define visible vs hidden triage rules
3) Pick one control measure (passes/curfew/rationing) and a workaround with risk
4) Define one recovery debt (new law, new surveillance, new resentment)
`.trim(),
    checklist: [
      "Two secondary disasters are defined and plausible.",
      "Triage has visible and hidden rules (politics exists).",
      "Control measures have enforcement limits and workarounds.",
      "Exploitation occurs (profiteers/power grabs/scapegoats).",
      "Recovery creates debt and reforms that persist.",
    ],
    examples: [
      {
        scenario: "Secondary disaster cascade",
        wrong: `"A flood happens and people are sad."`,
        right: `"Flood destroys the granary. Two days later bread prices triple.
Quarantine blocks refugees at the bridge. Disease spreads in camps.
Merchants sell 'clean water' that’s counterfeit. Now every choice has stakes."`,
      },
      {
        scenario: "Control measure with workaround",
        wrong: `"The city is under curfew."`,
        right: `"Curfew is enforced by patrols, but only on main streets.
Smugglers use maintenance tunnels. Access requires a union token—expensive—
and the token is logged (audit risk)."`,
      },
    ],
  }),
);
