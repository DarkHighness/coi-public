/**
 * ============================================================================
 * Worldbuilding Skill: Knowledge, Education, and Information Control
 * ============================================================================
 *
 * 知识决定社会的上限：谁能学、谁能传播、谁能验证、谁能封口。
 * 把信息做成机制：谣言、宣传、审查、学位、行会秘密、证据标准、图书馆与黑市文献。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";

export const knowledgeEducation: Atom<void> = () => `
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
## Propaganda & Censorship (control is a machine)
Define:
- official narrative outlet (gazette, screens, sermons)
- censorship method (licenses, seizures, filters, informants)
- one taboo topic
- one “allowed dissent” channel (pressure valve)
</propaganda_and_censorship>

<expert_markets>
## Expert Markets (who sells expertise?)
Define:
- one expert-for-hire (scribe, investigator, doctor, hacker, mage)
- one pricing model (per page, per case, per risk tier)
- one liability (if they help you, who comes after them?)
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
`;

export const knowledgeEducationPrimer: Atom<void> = () => `
<worldbuilding_context>
**KNOWLEDGE PRIMER**: Model info as access + verification + control. Always name sources, costs, and censorship workarounds.
</worldbuilding_context>
`.trim();

export const knowledgeEducationSkill: SkillAtom<void> = (): SkillOutput => ({
  main: knowledgeEducation(),
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
      right:
        `"The public stacks have travel guides. The plague records are sealed.
You need a scholar’s key and your name goes into a ledger. You can steal the key—
but the vault uses wax seals checked daily by an auditor."`,
    },
    {
      scenario: "Propaganda creates conflict",
      wrong: `"People believe the official story."`,
      right:
        `"The screens repeat the story. The sermons sanctify it.
But dockworkers trade a different version for coin. Now 'truth' is a market:
pay to learn, pay to silence, pay to publish."`,
    },
  ],
});

