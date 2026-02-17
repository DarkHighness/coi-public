/**
 * ============================================================================
 * Worldbuilding Skill: Medicine & Forensics
 * ============================================================================
 *
 * 医疗是阅读身体的艺术——伤口讲述暴力的故事，毒素留下化学的签名。
 * 伤病时钟、证据链、鉴定标准、资源稀缺、监管/腐败与信息不对称：身体从不撒谎，但读它的人会。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const medicineForensics: Atom<void> = defineAtom(
  {
    atomId: "atoms/worldbuilding/medicineForensics#medicineForensics",
    source: "atoms/worldbuilding/medicineForensics.ts",
    exportName: "medicineForensics",
  },
  () => `
<worldbuilding_context>
**MEDICINE & FORENSICS (Pressure, Proof, and Persistent Consequence)**

Design goal: make wounds, treatment, and evidence create *choices*, not just flavor.

<rule name="The 4 Layers (pick 2-3 per setting)">
1) **Care level**: what can be treated locally vs requires specialists?
2) **Capacity**: what bottlenecks exist (beds, staff, supplies, time)?
3) **Verification**: what counts as proof (tests, witnesses, records, chain-of-custody)?
4) **Control**: who controls access (guild/temple/state/corp/mafias) and why?
</rule>

<injury_clocks>
## Injury as Clocks (the body keeps its own merciless schedule)
Use a **clock per injury** with concrete segment counts:

| Injury Type | Segments | Per Segment ≈ | Untreated End State |
|-------------|----------|---------------|---------------------|
| Bleeding | 4 | minutes | death |
| Infection | 6 | hours | fever → sepsis → death |
| Shock | 3 | minutes | organ failure |
| Exposure (cold/heat) | 6 | hours | hypothermia/heatstroke |
| Broken bone | 8 | days | permanent disability if unset |
| Poison (fast) | 3 | minutes to hours | depends on toxin |
| Poison (slow) | 6 | days | organ damage → death |

**Clock mechanics**:
1) **Stabilize** — stop the clock from advancing (tourniquet, warmth, antidote first dose). Requires basic supplies or improvisation.
2) **Treat** — reduce segments (surgery, medicine, magic). Requires skill + materials. Failure = clock resumes or complication added.
3) **Recover** — remaining segments tick down as rest (days/weeks). Recovery creates constraints: can't fight, can't travel fast, vulnerable.

Treatment failure modes: wrong dose (new clock: overdose), counterfeit meds (clock pauses then resumes worse), relapse (healed clock reactivates at half), complications (new secondary clock).
</injury_clocks>

<care_access>
## Access & Gatekeeping (who can treat you?)
- **Gate**: insurance, fee, sponsor, license, triage, morality rules, bribe point.
- **Workaround**: black-market clinic, forged referral, stolen supplies, insider nurse.
- **Verification risk**: audits, records, cameras, witness statements, lab logs.
</care_access>

<evidence_chain>
## Forensics as a System (the dead still testify)
Define:
- **What can be detected** (blood type/DNA/poison/metals/ballistics/ritual residue)
- **Where it is processed** (lab, temple, coroner, private clinic)
- **Who can request it** (police, courts, nobles, corp legal)
- **How it can be faked** (contamination, swapped samples, bribed tech, forged paperwork)

Chain-of-custody template:
1) Collection (who collected, where, when?)
2) Sealing (stamp/signature/witness)
3) Transport (route + opportunity for tampering)
4) Processing (lab logs + methods)
5) Interpretation (expert bias + standards)
</evidence_chain>

<poison_and_toxins>
## Poisons / Toxins / Drugs (not instant-kill buttons — they are processes with timelines)
Every poison has 5 properties:

| Property | Define It |
|----------|-----------|
| **Vector** | ingested / injected / contact / inhaled |
| **Onset** | instant (combat), minutes (assassination), hours (political), days (slow murder) |
| **Symptoms** | visible progression the player can observe or diagnose |
| **Antidote** | what cures it, who has it, what it costs, how fast it works |
| **Detection** | how forensics can identify it post-mortem or during treatment |

Antidotes are gated by **sponsor**, **payment**, or **institutional approval**:
- Temple antidote: requires confession + donation (hours to access)
- Guild pharmacist: cash + prescription from recognized healer (available but expensive)
- Black market: immediate, 5× price, might be counterfeit (10-20% failure rate)
- Self-treatment: herbalism/alchemy skill check, wrong ingredients = second poisoning

Counterfeit medicine circulates when: high demand + scarce supply + weak enforcement. It looks right, costs less, and kills slowly.
</poison_and_toxins>

<quick_design_template>
## Quick Template (fill in 90 seconds)
- Care baseline (what’s treatable locally):
- Specialist gate (who/where):
- Capacity bottleneck:
- Payment/sponsor rule:
- Recordkeeping (what gets logged):
- Forensics standard (what convinces the authority):
- Tampering vectors (how proof can be faked):
- Counterfeit market (what’s faked, who sells):
</quick_design_template>
</worldbuilding_context>
`,
);

export const medicineForensicsPrimer: Atom<void> = defineAtom(
  {
    atomId: "atoms/worldbuilding/medicineForensics#medicineForensicsPrimer",
    source: "atoms/worldbuilding/medicineForensics.ts",
    exportName: "medicineForensicsPrimer",
  },
  () =>
    `
<worldbuilding_context>
**MEDICINE PRIMER**: Treat injuries as clocks with capacity + access gates. Make proof a mechanic (chain-of-custody, standards, tampering).
</worldbuilding_context>
`.trim(),
);

export const medicineForensicsSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/worldbuilding/medicineForensics#medicineForensicsSkill",
    source: "atoms/worldbuilding/medicineForensics.ts",
    exportName: "medicineForensicsSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(medicineForensics),
    quickStart: `
1) Make one injury a clock (bleeding/infection/shock)
2) Add one access gate to treatment (fee/sponsor/triage/license)
3) Add one workaround (black-market clinic/forged referral) with audit risk
4) Define what counts as proof (test/record/witness) and how it can be faked
5) Put an explicit choice: heal now vs stay hidden vs keep evidence clean
`.trim(),
    checklist: [
      "At least one wound has a clock and a failure mode.",
      "Treatment access is gated (capacity, payment, sponsor, or license).",
      "A workaround exists with verification/audit risk.",
      "Evidence has a chain-of-custody (and a tampering vector).",
      "Proof standard is explicit for the relevant authority (court/police/temple/corp).",
      "Counterfeit meds/toxins exist if scarcity + profit + enforcement gaps exist.",
    ],
    examples: [
      {
        scenario: "Injury creates choices",
        wrong: `"You patch the wound and keep going. Nothing changes."`,
        right: `"The wound stops bleeding but infection clock starts (4 segments). The clinic can treat it,
but requires ID + a logged payment. A street medic can help without ID—if you steal antibiotics
from a warehouse, which will show up on a missing-inventory audit in 24 hours."`,
      },
      {
        scenario: "Forensics as gameplay",
        wrong: `"The detective finds DNA and solves the case immediately."`,
        right: `"The sample must be sealed and processed at a lab with logs. The suspect can bribe the courier
or contaminate the sample route. The player can protect the chain-of-custody—or take a faster path
that gets results sooner but creates a tampering vulnerability."`,
      },
    ],
  }),
);
