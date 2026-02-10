/**
 * ============================================================================
 * Worldbuilding Skill: Institutions & Bureaucracy
 * ============================================================================
 *
 * 制度是活的有机体——用流程吞噬个体意志，用表格消化自由裁量。
 * 许可、登记、审计、配额、申诉、黑箱裁量：文件、队列、窗口、责任链。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";

export const institutions: Atom<void> = () => `
<worldbuilding_context>
**INSTITUTIONS & BUREAUCRACY (Process is power)**

Design goal: institutions create **friction**, **leverage**, and **alternative routes** (insiders, forged papers, bribes).

<rule name="Institution = Authority + Process + Incentives">
- **Authority**: what can they approve/deny?
- **Process**: steps, documents, waiting, inspections
- **Incentives**: what do staff want (promotion, bribes, safety, quotas)?
</rule>

<process_map>
## Process Map (turn into scenes)
Pick one institutional action relevant to play:
- travel permit, weapons license, business registration, burial certificate, corp access badge, ration card

Define:
1) Entry point (front desk / online portal / clerk)
2) Required docs (ID, stamp, witness, fee, proof of address)
3) Bottleneck (inspector, signature, background check, quota)
4) Timeline (same day / 3 days / 2 weeks)
5) Failure modes (lost file, rejected, “come back tomorrow”)
</process_map>

<responsibility_chain>
## Responsibility Chain (who can say yes?)
- Clerk: can delay/lose/flag
- Supervisor: can override, but risks audit
- Auditor: can punish staff, freeze accounts, retroactively invalidate

Add one rule: “nobody wants to be the one who signed it.”
</responsibility_chain>

<metrics_and_quotas>
## Metrics & Quotas (why they behave badly)
- quota for approvals/denials
- budget shortages
- anti-corruption campaigns (creates fear + new bribe methods)
- corporate KPIs (security incidents = punishment)
</metrics_and_quotas>

<level_2>
## Level 2: Queue Power (waiting is how institutions digest people)
Institutions control people by controlling **time**:
- appointment scarcity
- “lost file” delays
- office hours as choke points
- deliberate understaffing

Turn into play:
- the player can pay, threaten, charm, or *re-route* the queue
- rivals can sabotage your paperwork (flagging, audits, complaints)
</level_2>

<advanced>
## Advanced: Audit Cycles (the organism has seasons of vigilance)
Define:
- audit frequency (weekly/monthly/crisis-only)
- audit triggers (complaints, anomalies, political pressure)
- audit scope (random sampling vs full review)

Workarounds shift during audits:
- bribes become less direct (gifts, favors, intermediaries)
- “temporary passes” become common (expires after audit)

## Advanced: Responsibility Avoidance
Add one rule:
- nobody wants to be “the signer”
- decisions are pushed upward until they stall
- exceptions require a scapegoat clause

This creates insider-leverage and negotiation scenes.
</advanced>

<workarounds>
## Workarounds (gameplay)
- insider sponsor letter
- forged stamp and risk of verification
- bribe gate and price ladder
- “temporary pass” that expires (creates a clock)
- jurisdiction hop (different office, different rules)
</workarounds>

<quick_design_template>
## Quick Template
- Institution action:
- Required docs:
- Bottleneck official:
- Timeline:
- Quota/incentive:
- Workaround #1:
- Workaround #2:
- Audit trigger:
</quick_design_template>
</worldbuilding_context>
`;

export const institutionsPrimer: Atom<void> = () =>
  `
<worldbuilding_context>
**INSTITUTIONS PRIMER**: Model power as process + bottlenecks + incentives. Always define docs, timelines, and workarounds (insiders, forged papers, bribes).
</worldbuilding_context>
`.trim();

export const institutionsSkill: SkillAtom<void> = (): SkillOutput => ({
  main: institutions(),
  quickStart: `
1) Pick one institutional action (permit/license/badge)
2) Define required documents + one bottleneck official
3) Set a timeline and a failure mode ("come back tomorrow")
4) Add two workarounds (insider, forged stamp, bribe, temp pass)
`.trim(),
  checklist: [
    "Institution has authority and a concrete action it controls.",
    "Process has documents, steps, and a bottleneck.",
    "Staff incentives/quotas explain behavior.",
    "At least two workarounds exist with risks.",
    "Audit/verification exists (workarounds can fail).",
  ],
  examples: [
    {
      scenario: "Paperwork as leverage",
      wrong: `"You go to the office and get a permit."`,
      right: `"The clerk accepts your fee—then slides a form back: missing 'Residence Verification.'
The only verifier is the neighborhood captain, who hates your faction.
An insider offers a sponsor letter. A forger offers a stamp. Either way, you pick risk."`,
    },
    {
      scenario: "Temporary pass creates a clock",
      wrong: `"You get access to the restricted district."`,
      right: `"You get a 48-hour temporary badge. It pings security every time you cross a gate.
If you fail your task, your badge becomes evidence of trespass."`,
    },
  ],
});
