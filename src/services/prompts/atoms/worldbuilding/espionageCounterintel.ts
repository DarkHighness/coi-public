/**
 * ============================================================================
 * Worldbuilding Skill: Espionage & Counterintelligence
 * ============================================================================
 *
 * 谍报是镜子的游戏：每面镜子都可能照出真相，也可能只是另一面镜子的倒影。
 * 核心是来源、验证成本、组织约束、以及每次动作留下的不可磨灭的痕迹。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const espionageCounterintel: Atom<void> = defineAtom(
  {
    atomId: "atoms/worldbuilding/espionageCounterintel#espionageCounterintel",
    source: "atoms/worldbuilding/espionageCounterintel.ts",
    exportName: "espionageCounterintel",
  },
  () => `
<worldbuilding_context>
**ESPIONAGE & COUNTERINTELLIGENCE (A hall of mirrors where every reflection costs something)**

Design goal: make intel operations create *procedural friction*, *tradeoffs*, and *long-tail consequences*.

<rule name="The 5 Signals (every intel has a signature)">
1) **Source**: who provides it, and why?
2) **Channel**: how it travels (face-to-face, dead drop, courier, encrypted comms, ritual)?
3) **Latency**: how long before it arrives / becomes stale?
4) **Verification**: how can it be tested, and what does testing cost?
5) **Trace**: what receipt is created (witnesses, logs, patterns, money trail)?
</rule>

<source_ecology>
## Source Ecology (everyone knows something; nobody tells for free)
Common sources:
- Bureaucrats/clerks (records access)
- Operators/doormen/drivers (movement patterns)
- Traders/brokers (prices, shipments)
- Medics/undertakers (injuries, deaths)
- Technicians/priests (systems and rituals)
- Prisoners/defectors (biased but valuable)

Each source needs:
- Incentive (money, safety, ideology, revenge)
- Constraint (fear, surveillance, dependence, stigma)
- Price (favor, risk, relocation, cover story)
</source_ecology>

<ops_menu>
## Ops Menu (use as scene engines)
- **Recruit**: approach → test → leverage → protection plan
- **Handle**: meetings + signals + loyalty maintenance
- **Dead drop**: route + watcher detection + decoys
- **Surveillance**: tailing has capacity limits; mistakes leave traces
- **Infiltrate**: credentials + role + cover maintenance + audit risk
- **Deception**: plant false docs, staged events, controlled leaks
</ops_menu>

<counterintel>
## Counterintelligence (the system fights back)
Counterintel is procedural:
- Pattern analysis (schedules, meetings, money)
- Audit posture (access logs, document requests, unusual movement)
- Compartmentalization (no one knows everything)
- Sting operations (bait, controlled leaks)
- Damage control (scapegoats, narrative control, arrests)

Always define capacity:
- How many tails can they run?
- How fast can they review logs?
- What triggers escalation from watch → detain → raid?
</counterintel>

<verification_play>
## Verification as Gameplay (avoid omniscience)
Verification options:
- Independent source corroboration
- Physical proof (document seal, ledger entry, device log)
- Controlled test (feed a unique lie and see where it appears)
- Time test (does behavior match prediction?)

Tradeoffs:
- Verify fast = leave a trace
- Verify quietly = slower, information may stale
</verification_play>

<quick_design_template>
## Quick Template (fill in 90 seconds)
- Primary target organization:
- Their security posture (lax/procedural/paranoid):
- 2 sources + incentives + constraints:
- 1 channel + latency + trace:
- Verification method (cost + risk):
- Counterintel trigger + response ladder:
</quick_design_template>
</worldbuilding_context>
`,
);

export const espionageCounterintelDescription: Atom<void> = defineAtom(
  {
    atomId:
      "atoms/worldbuilding/espionageCounterintel#espionageCounterintelDescription",
    source: "atoms/worldbuilding/espionageCounterintel.ts",
    exportName: "espionageCounterintelDescription",
  },
  () =>
    `
<worldbuilding_context>
**ESPIONAGE PRIMER**: Every intel needs source + channel + verification cost + trace. Counterintel is procedural and capacity-limited.
</worldbuilding_context>
`.trim(),
);

export const espionageCounterintelSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId:
      "atoms/worldbuilding/espionageCounterintel#espionageCounterintelSkill",
    source: "atoms/worldbuilding/espionageCounterintel.ts",
    exportName: "espionageCounterintelSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(espionageCounterintel),
    quickStart: `
1) Pick 2 intel sources (each has incentive + constraint + price)
2) Define one channel (latency + trace)
3) Define verification method (cost + risk)
4) Define counterintel trigger and response ladder (watch → detain → raid)
5) Put the table on a choice: speed vs secrecy vs certainty
`.trim(),
    checklist: [
      "Intel has a source with motive (not a magical narrator).",
      "A channel exists with latency (information can be stale).",
      "Verification is possible but costs time, money, or exposure.",
      "Operations leave traces (money trail, patterns, logs, witnesses).",
      "Counterintel capacity and escalation triggers are defined.",
      "Deception and stings are possible for both sides.",
    ],
    examples: [
      {
        scenario: "Verification without omniscience",
        wrong: `"We hack their database and instantly know everything."`,
        right: `"You access one compartment: payroll, not operations. To confirm the secret meeting,
you plant a unique rumor through one clerk and watch which security team changes patrol routes.
Fast verification leaves an access-log trace that will be reviewed tomorrow."`,
      },
      {
        scenario: "Counterintel with capacity limits",
        wrong: `"They always know you’re spying because they’re smart."`,
        right: `"They can run two tails per day. They start with watchlists and log review,
then escalate only when a trigger hits: repeated unusual document requests + cash withdrawals.
If you keep the pattern clean, they stay suspicious but can’t act decisively."`,
      },
    ],
  }),
);
