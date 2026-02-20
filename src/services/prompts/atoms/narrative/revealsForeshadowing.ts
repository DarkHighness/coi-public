/**
 * ============================================================================
 * Craft Skill: Reveals & Foreshadowing
 * ============================================================================
 *
 * 伏笔与反转的目标不是“惊讶”，而是：公平、可追溯、改变选择。
 * 这套技能把 reveal 当作一种可操作的结构，而不是灵感。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const revealsForeshadowing: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/revealsForeshadowing#revealsForeshadowing",
    source: "atoms/narrative/revealsForeshadowing.ts",
    exportName: "revealsForeshadowing",
  },
  () => `
<craft_context>
**REVEALS & FORESHADOWING (Fairness + Consequence + Traceability)**

Design goal: make reveals feel inevitable *in hindsight* and immediately change player options.

<rule name="The 3 Tests of a Good Reveal">
1) **Traceable**: players can point to earlier signals ("Oh, that’s why…")
2) **Actionable**: reveal changes choices now (new gate opens/closes)
3) **Costed**: getting/using the truth has costs (time, exposure, relationships, risk)
</rule>

<foreshadowing_types>
## Foreshadowing Types (pick 2-3 signal types per reveal)

| Signal Type | What It Looks Like | Detection Method | Subtlety Level |
|-------------|-------------------|------------------|----------------|
| Physical residue | Scars, broken seals, missing supplies, bloodstains | Observation, search | Low (visible) |
| Procedural residue | Logs, permits, audits, paperwork anomalies, altered dates | Investigation, records check | Medium |
| Behavioral tells | Avoidance, rehearsed lines, mismatched incentives | Conversation, observation over time | Medium-High |
| Environmental tells | Smells, footprints, dust patterns, animal behavior | Exploration, sensory awareness | High |
| Social tells | Who won't speak, who speaks too quickly, who demands witnesses | Social navigation, trust building | High |

**LAYERING RULE**: Never use only one signal type. A physical residue + a behavioral tell creates a crosshair the player can triangulate. A single signal creates doubt; two create suspicion; three create certainty.
</foreshadowing_types>

<reveal_lanes>
## Reveal Lanes (distribute signals across lanes; avoid single-point failure)

Three discovery channels — place signals in at least 2 lanes:

| Lane | Source | Example Signal | How Player Accesses |
|------|--------|---------------|-------------------|
| **Scene evidence** | Physical world | Bloodstain under new paint, lock scratches, chemical smell | Search, observe, investigate location |
| **Human evidence** | Witnesses, NPCs | Nervous repetition, conflicting stories, avoidance of topic | Conversation, persuasion, intimidation |
| **Record evidence** | Documents, logs | Altered ledger entry, missing page, backdated permit | Reading, stealing, bribing for access |

Types describe WHAT the signal is; lanes describe WHERE it can be found.
If one lane is blocked (e.g., the witness is dead), another can still progress the story.

**REDUNDANCY PRINCIPLE**: If the reveal is plot-critical, ensure at least 2 lanes remain accessible at all times. If the player destroys one lane (burns the documents), the other lane must still work (the witness remembers).
</reveal_lanes>

<signal_placement_guide>
## Signal Placement — How to Seed a Reveal

**Timing**: Signals should appear 2-5 turns before the reveal. Closer = thriller pacing. Further = mystery pacing.

**Graduated visibility**:
1. **First signal** (3-5 turns before): Background detail, easily missed. Part of environmental description or NPC small talk.
   Example: "The innkeeper wipes the same spot on the counter three times." (Nervous habit — but about what?)
2. **Second signal** (1-3 turns before): More prominent, contextualizable if the player is paying attention.
   Example: "The ledger has a gap — three days missing in late autumn." (Matches when the merchant disappeared.)
3. **Optional red herring**: A signal that explains behavior WITHOUT contradicting the truth.
   Example: "He's nervous because of the tax audit" (true — but not the whole truth).

**The Retrospect Test**: After the reveal, the player should be able to look back and say "Of COURSE — the innkeeper's nervousness, the missing ledger pages, the red herring about taxes — it all pointed here." If they can't trace backward, the reveal is unfair.
</signal_placement_guide>

<fair_reversal>
## Fair Reversal (fast twists that remain fair)

To do a fast twist (e.g., short drama / thriller), ensure:
- The **new fact** was possible earlier (not new magic)
- There were at least **2 prior signals** (even subtle)
- The twist creates **new gates** and **new costs**, not instant victory

**Reversal Impact Matrix**:
| Reveal Type | Immediate Effect | Long-Term Effect |
|-------------|-----------------|------------------|
| Ally was enemy | Trust recalculated, safe resources compromised | Player questions all alliances |
| Location has secret | New area accessible, old assumptions invalidated | World feels deeper, exploration rewarded |
| NPC lied about motive | Current quest recontextualized | Player reads NPC behavior more carefully |
| Timeline was wrong | Urgency recalculated, missed opportunities surfaced | Player respects temporal information |
| Player's past action caused this | Moral weight, responsibility | Choices feel heavy, consequences real |
</fair_reversal>

<templates>
## Templates

**Signal ledger (per reveal):**
- Truth: [1 sentence — what actually happened]
- Signal 1 (scene lane): [physical detail, placed at turn N]
- Signal 2 (human lane): [behavioral tell, placed at turn N]
- Red herring: [fair misdirection that doesn't contradict truth]
- Verification method: [how to confirm, with cost + risk]
- Post-reveal change: [what gate opens/closes, what pressure escalates]

**Reversal beat:**
Setup (public or procedural gate) → Signal (background detail) → Misread (player/NPC draws wrong conclusion) → Reveal (truth emerges) → Immediate consequence (gate/relationship/resource shift) → New decision (what does the player do with this knowledge?)
</templates>
</craft_context>
`,
);

export const revealsForeshadowingDescription: Atom<void> = defineAtom(
  {
    atomId:
      "atoms/narrative/revealsForeshadowing#revealsForeshadowingDescription",
    source: "atoms/narrative/revealsForeshadowing.ts",
    exportName: "revealsForeshadowingDescription",
  },
  () =>
    `
<craft_context>
**REVEAL PRIMER**: Every reveal must be traceable (2 prior signals), actionable (changes choices), and costed (verification has tradeoffs).
</craft_context>
`.trim(),
);

export const revealsForeshadowingSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/narrative/revealsForeshadowing#revealsForeshadowingSkill",
    source: "atoms/narrative/revealsForeshadowing.ts",
    exportName: "revealsForeshadowingSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(revealsForeshadowing),
    quickStart: `
1) Write the truth in 1 sentence
2) Place 2 prior signals in different lanes (scene + human + record)
3) Time signals 2-5 turns before the reveal (further = mystery, closer = thriller)
4) Add an optional red herring that explains behavior without contradicting truth
5) Define verification method with cost + risk
6) Decide post-reveal change: what gate opens/closes, what pressure shifts
7) Run the Retrospect Test: can the player trace backward from reveal to signals?
`.trim(),
    checklist: [
      "Truth is statable in 1 sentence?",
      "At least 2 prior signals planted in different lanes?",
      "Signals placed 2-5 turns before the reveal?",
      "First signal is background (easily missed), second is more prominent?",
      "Verification is possible and costs something (time/exposure/money)?",
      "Reveal changes present choices (opens/closes a gate)?",
      "Red herrings are fair (explain behavior without contradicting truth)?",
      "Retrospect test passes (player can trace backward to signals)?",
      "Reveal creates a new decision, not just lore?",
    ],
    examples: [
      {
        scenario: "Fair twist with signal placement",
        wrong: `"It was all a dream / sudden magic / random betrayal."
(No prior signals. Player feels cheated.)`,
        right: `"The 'ally' was on a debt chain.\nSignal 1 (record lane, turn 5): delayed payments in a ledger.\nSignal 2 (human lane, turn 8): rehearsed lines when asked about finances.\nRed herring: nervous about upcoming inspection (true, but not the whole story).\nVerification: ask the clerk (costs exposure).\nPost-reveal: safehouse access revoked, new option: trade debt evidence for protection."`,
      },
      {
        scenario: "Signal graduation",
        wrong: `"Turn 3: NPC acts suspicious. Turn 4: MORE suspicious. Turn 5: Reveal."
(Same signal repeated with increasing intensity. No triangulation.)`,
        right: `"Turn 3 (scene lane): Boot prints near locked cellar — wrong size for anyone in the house.\nTurn 5 (human lane): Housekeeper avoids cellar hallway; excuses vary each time.\nTurn 7: Player connects boot size + avoidance, checks cellar, finds hidden room."
(Two signal types in different lanes converge into discovery.)`,
      },
    ],
  }),
);
