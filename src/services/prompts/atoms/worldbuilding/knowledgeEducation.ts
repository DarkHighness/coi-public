/**
 * ============================================================================
 * Worldbuilding Skill: Knowledge, Education, and Information Control
 * ============================================================================
 *
 * 知识既是权力也是负担——谁能学、谁能传播、谁能验证、谁能封口。
 * 知道得太多是一种危险，知道得太少是另一种。真相从来不免费。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const knowledgeEducation: Atom<void> = defineAtom(
  {
    atomId: "atoms/worldbuilding/knowledgeEducation#knowledgeEducation",
    source: "atoms/worldbuilding/knowledgeEducation.ts",
    exportName: "knowledgeEducation",
  },
  () => `
<worldbuilding_context>
**KNOWLEDGE & EDUCATION (Access + Verification + Control)**

Design goal: information should have **sources**, **costs**, and **verification**. Control creates conflict and workarounds.

<rule name="The 3 Knowledge Gates">
1) **Access**: who can obtain it (class, license, membership)
2) **Verification**: how truth is proven (witness, document, test, audit, experiment)
3) **Control**: who can suppress/shape it (censors, guilds, corps, temples)
</rule>

<education_pipeline>
## Education Pipeline (who trains whom?)
Define:
- basic literacy rate
- one credential (exam, apprenticeship, license)
- one gatekeeper (guild master, university dean, corp HR, temple scholar)
- one cost (tuition, patronage, oath, years)
</education_pipeline>

<archives_and_sources>
## Archives & Sources
Pick 2:
- public library (limited)
- restricted archive (membership, keys, surveillance)
- corporate knowledge base (logged)
- temple vault (ritual access)
- black-market documents (forged, incomplete, dangerous)

Define an access method and a detection risk.
</archives_and_sources>

<propaganda_and_censorship>
## Propaganda & Censorship (silence is also a message)
Define:
- official narrative outlet (gazette, screens, sermons)
- censorship method (licenses, seizures, filters, informants)
- one taboo topic
- one “allowed dissent” channel (pressure valve)
</propaganda_and_censorship>

<expert_markets>
## Expert Markets (knowledge is a commodity, and commodities have prices)
Define:
- one expert-for-hire (scribe, investigator, doctor, hacker, mage)
- pricing: base fee + risk multiplier (legal work × 1, grey-area × 3, forbidden × 10+)
- liability chain: who punishes the expert if discovered (guild revokes license, corp blacklists, temple excommunicates, state arrests)
- refusal conditions: what makes an expert walk away (too hot, too connected, personal code)
- failure mode: what happens mid-job (expert gets threatened, demands more money, delivers partial work, disappears)

Expert archetypes (pick 1-2):
| Type | Base Cost | Risk Gate | Failure Mode |
|------|-----------|-----------|-------------|
| Licensed scribe | per page | monitored for sedition | seized mid-copy, client named |
| Street investigator | per case | hunted if target is powerful | warns you off, keeps deposit |
| Temple healer | donation + oath | temple reviews patient worthiness | refuses heretics, reports plague |
| Black-market forger | per document | executed if caught | forges wrong, sells you out |
| Mercenary scholar | per question | guild expulsion if unlicensed | overcharges, delivers half-truths |
</expert_markets>

<anti_patterns>
## Anti-patterns
- “Information is free” (no cost, no sources)
- “Everyone knows everything” (no access gates)
- “Censorship is magic and perfect” (no leaks/workarounds)
</anti_patterns>

<quick_design_template>
## Quick Template
- Literacy baseline:
- Credential:
- Gatekeeper:
- Archive type + risk:
- Official narrative channel:
- Taboo topic:
- Expert-for-hire:
</quick_design_template>
</worldbuilding_context>
`,
);

export const knowledgeEducationDescription: Atom<void> = defineAtom(
  {
    atomId:
      "atoms/worldbuilding/knowledgeEducation#knowledgeEducationDescription",
    source: "atoms/worldbuilding/knowledgeEducation.ts",
    exportName: "knowledgeEducationDescription",
  },
  () =>
    `
<worldbuilding_context>
**KNOWLEDGE PRIMER**: Model info as access + verification + control. Always name sources, costs, and censorship workarounds.
</worldbuilding_context>
`.trim(),
);

export const knowledgeEducationSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/worldbuilding/knowledgeEducation#knowledgeEducationSkill",
    source: "atoms/worldbuilding/knowledgeEducation.ts",
    exportName: "knowledgeEducationSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(knowledgeEducation),
    quickStart: `
1) Set literacy baseline + one credential (exam/license)
2) Define one restricted archive with surveillance risk
3) Define one propaganda channel + one taboo topic
4) Define one expert-for-hire and who threatens them
`.trim(),
    checklist: [
      "Information has sources and costs (not omniscience).",
      "Verification standard exists (how truth is proven).",
      "Control mechanisms exist (censorship/propaganda) with leaks/workarounds.",
      "Education pipeline has gatekeepers and prices.",
      "Experts are part of the economy and face liability.",
    ],
    examples: [
      {
        scenario: "Restricted archive with risk",
        wrong: `"You look it up in the library."`,
        right: `"The public stacks have travel guides. The plague records are sealed.
You need a scholar’s key and your name goes into a ledger. You can steal the key—
but the vault uses wax seals checked daily by an auditor."`,
      },
      {
        scenario: "Propaganda creates conflict",
        wrong: `"People believe the official story."`,
        right: `"The screens repeat the story. The sermons sanctify it.
But dockworkers trade a different version for coin. Now 'truth' is a market:
pay to learn, pay to silence, pay to publish."`,
      },
    ],
  }),
);
