/**
 * ============================================================================
 * GM Skill: Fail-Forward & Consequences
 * ============================================================================
 *
 * 失败不等于“关门”，失败是：代价、痕迹、时钟、义务、权限变化。
 * 这套技能把失败变成推进故事的发动机，并保持世界一致性与可追责性。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const failForwardConsequences: Atom<void> = defineAtom(
  {
    atomId: "atoms/core/failForwardConsequences#failForwardConsequences",
    source: "atoms/core/failForwardConsequences.ts",
    exportName: "failForwardConsequences",
  },
  () => `
<gm_context>
**FAIL-FORWARD & CONSEQUENCES (No Dead Ends, Persistent World)**

Design goal: every outcome changes the world state in a legible, persistent way.

<rule name="The 4 Outcome Modes">
1) **Success**: objective achieved; cost still exists (time/trace)
2) **Partial success**: objective achieved with a larger cost or reduced quality
3) **Fail-forward**: objective not achieved, but you gain a lead or new position
4) **Hard fail**: objective lost irreversibly — reserved for explicitly telegraphed lethal stakes where player received warnings and actively ignored them

**Decision flow**: Does the player have alternatives? → Yes: fail-forward. Was the risk explicitly warned and confirmed? → Yes + lethal: hard fail allowed. Otherwise → partial success.
</rule>

<consequence_palette>
## Consequence Palette (pick 1-2, not 6)
- **Time**: deadline advances; window closes; schedule shifts
- **Exposure/Trace**: witnesses, logs, rumors, receipts
- **Access**: gates tighten/loosen; permissions change
- **Resource**: money, ammo, supplies, favors drained
- **Injury/Condition**: clock starts; impairment constrains future scenes
- **Relationship**: trust shifts; reputation marks; obligation created
- **Institutional response**: audit, summons, raid, freeze

**Selection guide** — match consequence to action type:
- Discovery/infiltration attempt → Exposure/Trace + Time
- Economic/trade action → Resource + Relationship
- Social/political action → Relationship + Institutional
- Physical/combat action → Injury/Condition + Access
</consequence_palette>

<ladder>
## Escalation Ladder (make pressure coherent)
Use predictable ladders:
- Watch → question → detain → raid
- Rumor → headline → official statement → crackdown
- Warning → fee → seizure → warrant

Always define:
- Trigger
- Timeline (now/24h/7 days)
- Capacity limits (they can’t do everything)
</ladder>

<gates_and_workarounds>
## Gates + Workarounds (failure creates new gates)
When a plan fails:
- Create a new gate: procedure (extra steps), status (condition change), or proof (evidence requirement)
- Offer at least one workaround with a cost (bribe, favor, time, risk)
- Add verification risk so shortcuts can bite later
</gates_and_workarounds>

<quick_table>
## Quick Table (use in play)
When unsure, answer:
1) What did the action **change** (state)?
2) What **receipt** exists (trace)?
3) What **clock** advanced or started?
4) What **new decision** must be made now?
</quick_table>
</gm_context>
`,
);

export const failForwardConsequencesPrimer: Atom<void> = defineAtom(
  {
    atomId: "atoms/core/failForwardConsequences#failForwardConsequencesPrimer",
    source: "atoms/core/failForwardConsequences.ts",
    exportName: "failForwardConsequencesPrimer",
  },
  () =>
    `
<gm_context>
**FAIL-FORWARD PRIMER**: Avoid dead ends. Failure should create a new constraint/lead/obligation + a receipt (trace) + a clock.
</gm_context>
`.trim(),
);

export const failForwardConsequencesSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/core/failForwardConsequences#failForwardConsequencesSkill",
    source: "atoms/core/failForwardConsequences.ts",
    exportName: "failForwardConsequencesSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(failForwardConsequences),
    quickStart: `
1) Decide outcome mode (success / partial / fail-forward)
2) Pick 1-2 consequence types (time/trace/access/resource/injury/relationship/institution)
3) Start/advance one clock with a clear trigger
4) Add a receipt (log/witness/rumor/ledger) for later audits
5) End with an immediate decision hook
`.trim(),
    checklist: [
      "No dead ends: failure still changes state.",
      "Consequence types are limited (1-2) and legible.",
      "A receipt/trace exists that can return later.",
      "A clock starts/advances with a clear trigger.",
      "An immediate decision hook is presented.",
    ],
    examples: [
      {
        scenario: "Fail-forward after a failed roll",
        wrong: `"You fail. Nothing happens. Try again."`,
        right: `"You fail the pickup, but you spot the courier’s route (new lead).
Your attempt leaves a camera timestamp (receipt). A 24h review clock starts.
You can flee now, or stay to confirm identity (higher certainty, higher exposure). "`,
      },
    ],
  }),
);
