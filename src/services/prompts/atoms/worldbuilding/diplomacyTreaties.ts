/**
 * ============================================================================
 * Worldbuilding Skill: Diplomacy & Treaties
 * ============================================================================
 *
 * 外交是穿着丝绸的暴力——承诺、担保、礼仪、利益交换与执行机制的精密组合。
 * 好的外交生成的不是对白，而是：边界、通行、制裁、担保人、违约成本与可预测的报复时间线。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const diplomacyTreaties: Atom<void> = defineAtom(
  {
    atomId: "atoms/worldbuilding/diplomacyTreaties#diplomacyTreaties",
    source: "atoms/worldbuilding/diplomacyTreaties.ts",
    exportName: "diplomacyTreaties",
  },
  () => `
<worldbuilding_context>
**DIPLOMACY & TREATIES (Elegant violence in the language of compromise)**

Design goal: make negotiation create durable constraints, access gates, and future clocks.

<rule name="The Treaty Skeleton (fill 6 slots)">
1) **Parties**: who signs (and who is excluded)?
2) **Scope**: what problem is being solved (borders, trade, war, religion, extradition)?
3) **Concessions**: who gives what (rights, territory, tariffs, hostages, access)?
4) **Verification**: how compliance is checked (inspectors, ledgers, rituals, patrols)?
5) **Enforcement**: what happens on breach (sanctions, raids, lawsuits, heresy trials)?
6) **Guarantee**: who backs it (third party, collateral, escrow, hostages, oath magic)?
</rule>

<diplomatic_gates>
## Diplomacy as Access Control
| Gate | Gatekeeper | Process | Forgery/Workaround | Detection Risk |
|------|-----------|---------|-------------------|----------------|
| Letters of passage | issuing authority (crown, corp, temple) | petition + fee + waiting period | forged seal (requires skilled forger + sample) | checkpoint comparison, magical/tech verification |
| Embassy immunity | ambassador + host state | formal accreditation | claim false identity/rank | staff recognition, records check, informant tip |
| Port/customs clearance | harbormaster + customs officer | manifest inspection + tariff | bribe, hidden compartments, falsified cargo list | random deep inspection, informant, rival tip-off |
| Audience protocol | court chamberlain / secretary | titles, gifts, sponsorship, waiting queue | patron connection, bribery, blackmail | other petitioners notice, rivals sabotage |
| Jurisdiction | local vs foreign authority | treaties, precedent, negotiation | flee jurisdiction, claim diplomatic immunity | host state decides on edge cases — politics, not law |
</diplomatic_gates>

<bargaining_tables>
## Negotiation Engines (use as scene patterns)
- **Trade for time**: ceasefire, prisoner exchange, humanitarian corridor
- **Trade for legitimacy**: recognition, titles, marriage alliances
- **Trade for access**: ports, routes, archives, temples, labs
- **Trade for constraint**: weapons limits, inspection rights, demilitarized zones
</bargaining_tables>

<breach_clocks>
## Breach & Retaliation Clocks (predictable reactions)
On breach, escalation is procedural:
1) Protest note / inquiry
2) Inspection demand / asset freeze / visa denial
3) Seizure / sanctions / raids / proxy support
4) War posture change / regime change attempt

Always define:
- How fast each step happens (24h / 7 days / 1 season)
- Who benefits from escalation (hawks vs doves)
</breach_clocks>

<hostages_and_collateral>
## Hostages, Collateral, and Guarantees (trust written in flesh and grain)
| Guarantee Type | Strength | Failure Mode | Player Hook |
|---------------|----------|-------------|-------------|
| Hostages/wards | high (personal stakes) | hostage escapes, hostage dies, captor grows attached, hostage converts | rescue, negotiate, weaponize attachment |
| Escrowed funds/grain/relics | medium (economic) | escrow agent embezzles, goods spoil, market crashes devaluing collateral | audit, steal from escrow, devalue enemy's collateral |
| Third-party guarantor | high (reputational) | guarantor picks a side, guarantor weakens, guarantor demands payment | influence guarantor, expose bias, become the guarantor |
| Oath/ritual enforcement | variable (belief-dependent) | oath broken with no divine consequence → faith crisis; OR divine consequence manifests → terror | test the oath, exploit true believers, fake the ritual |
| Marriage alliance | high (generational) | partner rebels, partner dies, heir disputed, cultural friction | romance, poison, annulment, secret heir |

Keep it legible:
- What counts as breach? (concrete acts, not vibes)
- Who decides? (arbiter with their own interests)
- What is the first consequence? (proportional, escalating, and exploitable)
</hostages_and_collateral>

<quick_design_template>
## Quick Template (fill in 90 seconds)
- Parties + excluded actor:
- 3 concessions (each side):
- Verification method:
- Guarantee/collateral:
- Breach definition + response ladder:
- One protocol rule (gift/seating/title) that matters:
</quick_design_template>
</worldbuilding_context>
`,
);

export const diplomacyTreatiesPrimer: Atom<void> = defineAtom(
  {
    atomId: "atoms/worldbuilding/diplomacyTreaties#diplomacyTreatiesPrimer",
    source: "atoms/worldbuilding/diplomacyTreaties.ts",
    exportName: "diplomacyTreatiesPrimer",
  },
  () =>
    `
<worldbuilding_context>
**DIPLOMACY PRIMER**: Treaties need scope + verification + enforcement + guarantees. Diplomacy creates access gates and breach clocks.
</worldbuilding_context>
`.trim(),
);

export const diplomacyTreatiesSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/worldbuilding/diplomacyTreaties#diplomacyTreatiesSkill",
    source: "atoms/worldbuilding/diplomacyTreaties.ts",
    exportName: "diplomacyTreatiesSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(diplomacyTreaties),
    quickStart: `
1) Define the treaty skeleton (parties, scope, concessions)
2) Pick 1 verification mechanism (inspectors/ledgers/ritual) with limits
3) Pick 1 guarantee (hostage/escrow/guarantor/oath) with failure mode
4) Define breach threshold and response ladder (24h/7 days/season)
5) Put a protocol gate into the scene (audience, gifts, safe conduct)
`.trim(),
    checklist: [
      "Treaty has a clear scope and parties (including who’s excluded).",
      "Concessions create access gates (routes, ports, archives, audiences).",
      "Verification exists and is capacity-limited (not omniscient).",
      "Enforcement is procedural with a timeline (retaliation clocks).",
      "Guarantee/collateral exists and can fail in a specific way.",
      "Protocol rules matter (titles, witnesses, gift debt).",
    ],
    examples: [
      {
        scenario: "Guarantees with teeth",
        wrong: `"They sign a treaty and everyone trusts it."`,
        right: `"They sign a ceasefire with inspection rights at two bridges. A third-party city holds
escrowed grain shipments; breach triggers automatic seizure. The prince’s ward stays at court:
harm to them is breach, and retaliation starts within 24 hours."`,
      },
      {
        scenario: "Breach as a clock",
        wrong: `"They break the treaty and war instantly starts."`,
        right: `"Breach starts with a protest note and an inspection demand. If refused, visas are revoked
and assets frozen (7 days). Only after those fail do raids and proxy funding begin. Hawks push
faster escalation; doves try to trade concessions for time."`,
      },
    ],
  }),
);
