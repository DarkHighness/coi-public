/**
 * ============================================================================
 * Worldbuilding Skill: Finance & Banking
 * ============================================================================
 *
 * 金融是凝固的权力——借贷、票据、清算、冻结、审计与挤兑。
 * 每一枚硬币都是一个承诺，每一本账簿都是一张权力地图。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";

export const financeBanking: Atom<void> = () => `
<worldbuilding_context>
**FINANCE & BANKING (Receipts, Trust, and Freeze Power)**

Design goal: make money systems create *gates*, *leverage*, and *investigation trails*.

<rule name="The 6 Financial Primitives">
1) **Account/ledger**: where value is recorded (bank, temple, guild, chain, cashbook)
2) **Identity**: how ownership is proven (seal, biometrics, witnesses, token)
3) **Transfer**: how value moves (cash, drafts, letters of credit, remittance)
4) **Credit**: who lends and what is collateral (property, reputation, hostage, future labor)
5) **Clearing**: how disputes are resolved (arbitration, courts, priests, auditors)
6) **Freeze**: who can block transfers (state, bank, corp, cartel) and under what rules
</rule>

<credit_engines>
## Credit as Pressure (debt is a clock that ticks louder each day)
Debt creates clocks:
- Payment dates (rent day, harvest, payday)
- Penalties and compounding (fees, seizure, arrest, shame)
- Collateral triggers (property seized, license revoked, hostage moved)

Always define:
- Grace period
- Default consequence ladder (warning → fees → seizure → warrants)
</credit_engines>

<receipts_and_audits>
## Receipts & Audits (money leaves fingerprints on everything it touches)
Trails:
- Transaction logs
- Signatures/seals
- CCTV/witnesses at exchange points
- KYC/registry checks
- Merchant invoices and customs manifests

Audit posture:
- Realistic delay (24h review, weekly reconciliation, monthly audit)
- Capacity limits (how many flags can they review?)
</receipts_and_audits>

<letters_of_credit>
## Letters of Credit / Drafts (trust networks)
Useful when:
- Distance is big and cash is risky.
- Parties don’t trust each other.

Mechanism:
- Issuer (bank/guild) guarantees payment
- Beneficiary delivers goods/documents
- Documents are the gate: bills of lading, seals, witnesses

Failure modes:
- Forged documents
- Insolvent issuer
- Political freeze
</letters_of_credit>

<freeze_and_seizure>
## Freezes, Seizures, and Asset Warfare
Freeze power creates play:
- Bank freezes accounts after flags
- State/corp orders asset holds
- Cartels enforce "informal freezes" via intimidation

Use a response ladder:
1) Hold pending review
2) Partial hold / daily limit
3) Full freeze / seizure
4) Warrant / arrest / public blacklisting
</freeze_and_seizure>

<quick_design_template>
## Quick Template (fill in 90 seconds)
- Ledger authority (who records value):
- Identity proof (seal/token/biometric/witness):
- Default consequence ladder:
- Audit cadence (24h/7 days/monthly):
- Freeze authority + triggers:
- One fraud vector (how to fake/steal):
</quick_design_template>
</worldbuilding_context>
`;

export const financeBankingPrimer: Atom<void> = () =>
  `
<worldbuilding_context>
**FINANCE PRIMER**: Money systems are ledgers + identity proof + audits + freeze power. Debt creates clocks; transfers create receipts.
</worldbuilding_context>
`.trim();

export const financeBankingSkill: SkillAtom<void> = (): SkillOutput => ({
  main: financeBanking(),
  quickStart: `
1) Define the ledger authority and identity proof
2) Add a debt clock (payment date + default ladder)
3) Define audit cadence and capacity limits
4) Define freeze authority and triggers (flags → hold → freeze)
5) Add one fraud vector and one verification method
`.trim(),
  checklist: [
    "Value is recorded somewhere (ledger) with a real access gate.",
    "Ownership proof exists (seals/tokens/biometrics/witnesses) and can be disputed.",
    "Debt default has a ladder (fees → seizure → warrants), not instant ruin.",
    "Transfers leave receipts that can be audited later.",
    "Freeze power exists and is rule-bound/capacity-limited (not arbitrary omniscience).",
    "Fraud vectors exist (forgery, identity theft, insider abuse) with counterplay.",
  ],
  examples: [
    {
      scenario: "Freeze power creates a scene engine",
      wrong: `"We pay the bribe and it disappears forever."`,
      right: `"The payment clears today, but the bank reconciles weekly. A clerk flags an unusual transfer.
The account is put on a 24h hold pending review. You can wait (risk a full freeze), produce documents,
or move assets through a letter-of-credit broker who demands collateral."`,
    },
    {
      scenario: "Debt as a clock, not a binary",
      wrong: `"You miss payment; you're instantly arrested."`,
      right: `"Default triggers a ladder: 3-day grace, then fees, then collateral seizure, then a warrant.
You can negotiate a restructuring, trade a favor to an auditor, or accept seizure to buy time."`,
    },
  ],
});
