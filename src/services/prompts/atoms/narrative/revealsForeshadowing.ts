/**
 * ============================================================================
 * Craft Skill: Reveals & Foreshadowing
 * ============================================================================
 *
 * 伏笔与反转的目标不是“惊讶”，而是：公平、可追溯、改变选择。
 * 这套技能把 reveal 当作一种可操作的结构，而不是灵感。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";

export const revealsForeshadowing: Atom<void> = () => `
<craft_context>
**REVEALS & FORESHADOWING (Fairness + Consequence + Traceability)**

Design goal: make reveals feel inevitable *in hindsight* and immediately change player options.

<rule name="The 3 Tests of a Good Reveal">
1) **Traceable**: players can point to earlier signals ("Oh, that’s why…")
2) **Actionable**: reveal changes choices now (new gate opens/closes)
3) **Costed**: getting/using the truth has costs (time, exposure, relationships, risk)
</rule>

<foreshadowing_types>
## Foreshadowing Types (use 2-3, not all)
- **Physical residue**: scars, broken seals, missing supplies
- **Procedural residue**: logs, permits, audits, paperwork anomalies
- **Behavioral tells**: avoidance, rehearsed lines, mismatched incentives
- **Environmental tells**: smells, footprints, dust patterns, animal behavior
- **Social tells**: who won’t speak, who speaks too quickly, who demands witnesses
</foreshadowing_types>

<reveal_lanes>
## Reveal Lanes (avoid single-point failure)
Always provide multiple lanes:
1) Scene evidence (what’s in the world)
2) Human evidence (witnesses, incentives, fear)
3) Record evidence (documents/logs/ledger)

If one lane is blocked, another can still progress the story.
</reveal_lanes>

<fair_reversal>
## Fair Reversal (fast twists that remain fair)
To do a fast twist (e.g., short drama / thriller), ensure:
- The **new fact** was possible earlier (not new magic)
- There were at least **2 prior signals** (even subtle)
- The twist creates **new gates** and **new costs**, not instant victory
</fair_reversal>

<templates>
## Templates
**Signal ledger (per reveal):**
- Truth:
- 2 prior signals:
- 1 misleading-but-true signal (fair red herring):
- How to verify (cost + risk):
- What changes after reveal (new gate / new pressure):

**Reversal beat:**
Setup (public or procedural gate) → Signal → Misread → Reveal → Immediate consequence → New decision
</templates>
</craft_context>
`;

export const revealsForeshadowingPrimer: Atom<void> = () => `
<craft_context>
**REVEAL PRIMER**: Every reveal must be traceable (2 prior signals), actionable (changes choices), and costed (verification has tradeoffs).
</craft_context>
`.trim();

export const revealsForeshadowingSkill: SkillAtom<void> = (): SkillOutput => ({
  main: revealsForeshadowing(),
  quickStart: `
1) Write the truth (1 sentence)
2) Add 2 prior signals in different lanes (world + people + records)
3) Add a verification method with cost/risk
4) Decide what changes after reveal (gate opens/closes, pressure escalates)
5) Ensure the reveal forces an immediate decision (not just lore)
`.trim(),
  checklist: [
    "Reveal is traceable: at least 2 prior signals exist.",
    "Signals appear in at least 2 lanes (scene/human/records).",
    "Verification is possible and costs time/exposure/money.",
    "Reveal changes present choices (opens/closes a gate).",
    "Red herrings are fair: they explain behavior without contradicting facts.",
  ],
  examples: [
    {
      scenario: "Fair twist",
      wrong: `"It was all a dream / sudden magic / random betrayal."`,
      right:
        `"The ‘ally’ was on a debt chain (signal: delayed payments in a ledger; signal: rehearsed lines).
Verification costs exposure (ask the clerk → leaves a trace). The reveal closes safehouse access
and opens a new option: trade evidence to the debt-holder for protection."`,
    },
  ],
});
