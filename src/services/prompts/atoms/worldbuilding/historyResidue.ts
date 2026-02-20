/**
 * ============================================================================
 * Worldbuilding Skill: History-as-Residue
 * ============================================================================
 *
 * "历史"不是背景年表——它是渗入地基的残留物，是擦不掉的指纹。
 * 废墟、条约、家族仇恨、制度惯性、地名、禁忌、旧债、旧科技……
 * 都像地下水一样，从裂缝中渗出，浸湿现在的人脚下的地面。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const historyResidue: Atom<void> = defineAtom(
  {
    atomId: "atoms/worldbuilding/historyResidue#historyResidue",
    source: "atoms/worldbuilding/historyResidue.ts",
    exportName: "historyResidue",
  },
  () => `
<worldbuilding_context>
**HISTORY-AS-RESIDUE (The past is not behind us — it is beneath the floorboards)**

Design goal: history should appear as **physical**, **institutional**, and **psychological** residues that shape current play. The past does not stay buried. It leaks through cracks like damp through old stone — staining everything it touches.

<rule name="The 3 Residue Layers (always define all three)">
1) **Physical**: ruins, scars, infrastructure, geography changes — the bones of dead eras showing through the skin of the present
2) **Institutional**: laws, borders, treaties, guild monopolies, corp protocols — the machinery that outlives its builders
3) **Psychological**: grudges, taboos, trauma, pride, myths, propaganda — the ghosts that live in the living
</rule>

<method>
## Method: Build 3 Eras in 6 bullets
Pick:
- **Era A (old order)**: who ruled, what they built, why they believed they would last
- **Era B (rupture)**: war, plague, revolution, collapse, invasion — the event that broke the continuity
- **Era C (current compromise)**: who profits now from the wreckage, what is forbidden now because of the rupture

For each era, write:
- 1 thing people **still use** (physical: a road, an aqueduct, a calendar; institutional: a law, a guild charter, a border; psychological: a phrase, a gesture, a superstition)
- 1 thing people **still fear** (physical: a ruin no one enters, a sealed vault, a poisoned well; institutional: a dormant treaty clause, a bloodline claim, a debt ledger; psychological: a name spoken in whispers, a date people avoid, a ritual performed "just in case")
</method>

<contested_truth_mechanics>
## Contested Truth → Gameplay Impact
When a hidden truth is revealed, it must change at least one of:
| Discovery | Consequence |
|-----------|------------|
| Official history was fabricated | Legitimacy of current rulers shaken → faction loyalty shifts, potential uprising |
| Folk memory was correct | Underground group gains credibility → recruitment surge, resource access |
| Private archive proves guilt | Blackmail leverage unlocked → new quest branch, NPC alliance/betrayal |
| Ancient treaty still legally binding | Territorial claim revived → diplomatic crisis, border closure |
| Technology was suppressed, not lost | Arms race or gold rush → economic disruption, faction scramble |

**Trigger rule**: Truths surface when the player enters the context where they matter — visits the archive, meets the descendant, reads the inscription. Do NOT dump lore as exposition.
</contested_truth_mechanics>

<residue_hooks>
## Residue Hooks (turn history into scenes — every ruin is a story waiting to be read by someone who knows the alphabet)
- A ruined wall becomes a smuggler route (physical — the dead city serves the living underworld)
- A treaty clause becomes a legal weapon (institutional — the pen outlasts the sword, and cuts deeper)
- A family name triggers instant hostility (psychological — hatred is the most faithful inheritance)

Ask:
- What does a local refuse to do, even for money?
- What does an outsider accidentally do that causes offense?
</residue_hooks>

<memory_and_truth>
## Memory vs Truth (use dual narratives — because memory is not a recording, it is a story told by the survivor)
History is contested. For each major event, define three accounts:
- **Official record** (who benefits from this version? What does it justify?)
- **Folk story** (who suffers in the official version? What do they remember differently?)
- **Private archive** (who hid the evidence? What would happen if it surfaced?)

Verification methods shape the conflict:
- Physical evidence (ruins, bones, artifacts) — hard to fake, easy to destroy
- Written records (treaties, ledgers, letters) — easy to forge, hard to destroy completely
- Oral tradition (songs, proverbs, rituals) — survives destruction, drifts over generations
- Living witnesses (elders, prisoners, exiles) — reliable but mortal, and can be silenced

Reveals should change **actions**, not just lore. A truth that doesn't alter what someone does next is trivia, not history.
</memory_and_truth>

<quick_design_template>
## Quick Template
- Era A built:
- Era B ruptured:
- Era C compromise:
- Physical residue:
- Institutional residue:
- Psychological residue:
- One contested truth:
</quick_design_template>
</worldbuilding_context>
`,
);

export const historyResidueDescription: Atom<void> = defineAtom(
  {
    atomId: "atoms/worldbuilding/historyResidue#historyResidueDescription",
    source: "atoms/worldbuilding/historyResidue.ts",
    exportName: "historyResidueDescription",
  },
  () =>
    `
<worldbuilding_context>
**HISTORY PRIMER**: The past is not behind us -- it is beneath the floorboards. Show it as residue (physical/institutional/psychological) that creates constraints and leverage now.
</worldbuilding_context>
`.trim(),
);

export const historyResidueSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/worldbuilding/historyResidue#historyResidueSkill",
    source: "atoms/worldbuilding/historyResidue.ts",
    exportName: "historyResidueSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(historyResidue),
    quickStart: `
1) Define 3 eras (old order → rupture → compromise)
2) For each era: 1 thing still used + 1 thing still feared
3) Add 1 physical + 1 institutional + 1 psychological residue
4) Write 1 contested truth and who hides it
`.trim(),
    checklist: [
      "Three residue layers exist (physical/institutional/psychological).",
      "At least one residue changes player options (not just lore).",
      "History is contested (official vs folk vs private).",
      "Reveals change actions or alliances, not only exposition.",
    ],
    examples: [
      {
        scenario: "Residue creates leverage",
        wrong: `"Long ago there was a war. Anyway, you go to the tavern."`,
        right: `"The tavern’s floor is old fortress stone—still warm in winter because of buried steam pipes.
The guild controls the valves. The last time someone tampered with them, a neighborhood burned.
Now the pipes are leverage: comfort, industry, and sabotage in one place."`,
      },
      {
        scenario: "Contested truth changes play",
        wrong: `"The king was evil and was overthrown."`,
        right: `"Officially: the king was a tyrant. Folk story: he held back the plague at terrible cost.
Private archive: the 'plague' was a weapon. If you reveal it, the current council loses legitimacy—
and the border treaty collapses. Truth is an action, not trivia."`,
      },
    ],
  }),
);
