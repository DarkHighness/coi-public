/**
 * ============================================================================
 * Worldbuilding Skill: Crime, Underworld, and Informal Power
 * ============================================================================
 *
 * 黑道不是"坏人聚集地"——它是官方秩序投下的影子，有自己的荣誉法则。
 * 暴力垄断、保护费、情报市场、洗钱、执法勾连：一套平行于国法的完整体系。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const crimeUnderworld: Atom<void> = defineAtom(
  {
    atomId: "atoms/worldbuilding/crimeUnderworld#crimeUnderworld",
    source: "atoms/worldbuilding/crimeUnderworld.ts",
    exportName: "crimeUnderworld",
  },
  () => `
<worldbuilding_context>
**CRIME & UNDERWORLD (Order for a price, loyalty until a better price)**

Design goal: the underworld provides services the official system cannot or will not, at **risk** and **obligation** cost.

<rule name="Underworld = Services + Violence + Information">
1) **Services**: smuggling, forged papers, debt collection, safehouses
2) **Violence**: credible enforcement and deterrence
3) **Information**: who knows what, who sells it, who buries it
</rule>

<market_and_prohibition>
## Market & Prohibition
Underworld thrives where: need + prohibition + enforcement gap.
Define:
- 1 prohibited/controlled good (weapons, magic, meds, IDs)
- 1 enforcement gap (corruption, capacity, jurisdiction boundary)
- 1 broker who connects buyers/sellers
</market_and_prohibition>

<territory_and_protection>
## Territory & Protection
Pick a protection model:
- neighborhood boss (street-level)
- union/guild racket (semi-legal)
- corporate security subcontractor (white-collar)

Define:
- what protection buys (safe passage, dispute resolution, retaliation)
- what triggers punishment (snitching, unpaid debt, disrespect)
</territory_and_protection>

<money_laundering>
## Money Laundering (keep it plausible)
Define 2 laundering fronts:
- tavern, clinic, shipping company, charity, temple tithe ledger, art auctions
Define 1 audit risk and a mitigation (bribed inspector, fake invoices).
</money_laundering>

<informant_ecology>
## Informant Ecology (every shadow has ears)
Always define:
- one informant stream (clerks, dockworkers, street kids)
- one counter-intel method (dead drops, code phrases, vetting, tests)
- one betrayal consequence (public example, quiet disappearance)
</informant_ecology>

<anti_patterns>
## Anti-patterns
- “The gang is evil and chaotic” (no services/order)
- “Crime is everywhere with no response” (no enforcement feedback)
- “No one ever talks” (no informant ecology)
</anti_patterns>

<quick_design_template>
## Quick Template
- Prohibited good:
- Broker:
- Protection model:
- Violence line (what they will do):
- Informant stream:
- Laundering front:
- Audit risk:
</quick_design_template>
</worldbuilding_context>
`,
);

export const crimeUnderworldPrimer: Atom<void> = defineAtom(
  {
    atomId: "atoms/worldbuilding/crimeUnderworld#crimeUnderworldPrimer",
    source: "atoms/worldbuilding/crimeUnderworld.ts",
    exportName: "crimeUnderworldPrimer",
  },
  () =>
    `
<worldbuilding_context>
**UNDERWORLD PRIMER**: Model the underworld as services + violence + information. Define brokers, protection, informants, and laundering with audit risk.
</worldbuilding_context>
`.trim(),
);

export const crimeUnderworldSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/worldbuilding/crimeUnderworld#crimeUnderworldSkill",
    source: "atoms/worldbuilding/crimeUnderworld.ts",
    exportName: "crimeUnderworldSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(crimeUnderworld),
    quickStart: `
1) Pick one prohibited good and one broker
2) Define one protection model (what it buys, what it punishes)
3) Define one informant stream and one counter-intel method
4) Define one laundering front and one audit risk
`.trim(),
    checklist: [
      "Underworld provides concrete services with obligations.",
      "Violence is credible and has clear triggers.",
      "Information flows exist (informants) and can be countered.",
      "Laundering fronts exist with audit/verification risks.",
      "Official enforcement reacts (crackdowns, deals, jurisdiction games).",
    ],
    examples: [
      {
        scenario: "Protection has a price",
        wrong: `"The gang protects you because they like you."`,
        right: `"Protection buys safe passage through Dock Ward.
Pay weekly, obey curfew, never talk to inspectors.
Break it and they don’t kill you—they burn your supplier and spread your name."`,
      },
      {
        scenario: "Informants create tension",
        wrong: `"No one knows anything."`,
        right: `"Street kids sell gossip by the hour. Clerks sell records by the page.
The boss tests new hires with a fake leak. Fail and you vanish."`,
      },
    ],
  }),
);
