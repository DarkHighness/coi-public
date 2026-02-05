/**
 * ============================================================================
 * Worldbuilding Skill: History-as-Residue
 * ============================================================================
 *
 * “历史”不应该是背景年表，而是：留在地面上的残渣。
 * 废墟、条约、家族仇恨、制度惯性、地名、禁忌、旧债、旧科技……都在逼迫现在的人做决定。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";

export const historyResidue: Atom<void> = () => `
<worldbuilding_context>
**HISTORY-AS-RESIDUE (Past as a live constraint)**

Design goal: history should appear as **physical**, **institutional**, and **psychological** residues that shape current play.

<rule name="The 3 Residue Layers (always define all three)">
1) **Physical**: ruins, scars, infrastructure, geography changes
2) **Institutional**: laws, borders, treaties, guild monopolies, corp protocols
3) **Psychological**: grudges, taboos, trauma, pride, myths, propaganda
</rule>

<method>
## Method: Build 3 Eras in 6 bullets
Pick:
- **Era A (old order)**: who ruled, what they built
- **Era B (rupture)**: war, plague, revolution, collapse, invasion
- **Era C (current compromise)**: who profits now, what is forbidden now

For each era, write:
- 1 thing people **still use**
- 1 thing people **still fear**
</method>

<residue_hooks>
## Residue Hooks (turn history into scenes)
- A ruined wall becomes a smuggler route (physical)
- A treaty clause becomes a legal weapon (institutional)
- A family name triggers instant hostility (psychological)

Ask:
- What does a local refuse to do, even for money?
- What does an outsider accidentally do that causes offense?
</residue_hooks>

<memory_and_truth>
## Memory vs Truth (use dual narratives)
History is contested:
- Official record (who benefits?)
- Folk story (who suffers?)
- Private archive (who hides it?)

Reveals should change **actions**, not just lore.
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
`;

export const historyResiduePrimer: Atom<void> = () => `
<worldbuilding_context>
**HISTORY PRIMER**: Show the past as residue (physical/institutional/psychological) that creates constraints and leverage now.
</worldbuilding_context>
`.trim();

export const historyResidueSkill: SkillAtom<void> = (): SkillOutput => ({
  main: historyResidue(),
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
      right:
        `"The tavern’s floor is old fortress stone—still warm in winter because of buried steam pipes.
The guild controls the valves. The last time someone tampered with them, a neighborhood burned.
Now the pipes are leverage: comfort, industry, and sabotage in one place."`,
    },
    {
      scenario: "Contested truth changes play",
      wrong: `"The king was evil and was overthrown."`,
      right:
        `"Officially: the king was a tyrant. Folk story: he held back the plague at terrible cost.
Private archive: the 'plague' was a weapon. If you reveal it, the current council loses legitimacy—
and the border treaty collapses. Truth is an action, not trivia."`,
    },
  ],
});

