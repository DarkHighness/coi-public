/**
 * ============================================================================
 * Craft Skill: Scene Beats & Objectives
 * ============================================================================
 *
 * 让每个场景都“有发动机”：目标、门槛、推进、代价、结尾决策点。
 * 这能显著提升任何 theme 的密度与可玩性，避免空转。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";

export const sceneBeatsObjectives: Atom<void> = () => `
<craft_context>
**SCENE BEATS & OBJECTIVES (Engines, Not Vibes)**

Design goal: each scene produces a concrete change: new access, new pressure, new decision.

<rule name="The 6-Part Scene Engine">
1) **Objective**: what does the player want *now*?
2) **Gate**: what blocks it (law/status/process/tech/fear)?
3) **Approach**: the player chooses a tactic (talk, sneak, pay, fight, research)
4) **Cost**: time/exposure/money/injury/relationship
5) **Result**: success, partial, or fail-forward (new information or new constraint)
6) **Decision hook**: scene ends with a tradeoff choice
</rule>

<fail_forward>
## Fail-Forward (never dead-end)
Failure should create:
- A new constraint (heat, injury clock, lost access)
- A new lead (partial truth, new suspect, new gatekeeper)
- A new obligation (debt, favor, apology, collateral)

Avoid:
- "Nothing happens"
- "You can’t proceed"
</fail_forward>

<beat_patterns>
## Beat Patterns (pick one per scene)
- **Gate → workaround → verification risk**
- **Reveal → consequence → choice**
- **Debt demand → refusal cost → compromise**
- **Clock tick → shortcut → trail**
- **Safehouse → failure mode → new obligation**
</beat_patterns>

<endings>
## Ending Types (always end with a decision)
- Two leads with different costs
- One lead but two approaches (fast risky vs slow safe)
- Opportunity vs obligation conflict
- Truth vs relationship (expose vs protect)
</endings>
</craft_context>
`;

export const sceneBeatsObjectivesPrimer: Atom<void> = () =>
  `
<craft_context>
**SCENE PRIMER**: Every scene needs objective + gate + cost + result + decision hook. Use fail-forward; no dead ends.
</craft_context>
`.trim();

export const sceneBeatsObjectivesSkill: SkillAtom<void> = (): SkillOutput => ({
  main: sceneBeatsObjectives(),
  quickStart: `
1) Write the objective in 7 words
2) Add one explicit gate (law/status/process/tech)
3) Offer 2 approaches with different costs
4) Decide how verification/audit can bite later
5) End with a decision hook (tradeoff)
`.trim(),
  checklist: [
    "Objective is concrete (not a mood).",
    "A gate exists (and can be worked around).",
    "Costs are explicit (time/exposure/money/injury/relationships).",
    "Failure still advances (new lead/constraint/obligation).",
    "Scene ends with an explicit decision hook.",
  ],
  examples: [
    {
      scenario: "Fail-forward",
      wrong: `"You fail the lockpick. You can't enter."`,
      right: `"You fail the lockpick, but you notice the maintenance schedule (new lead).
Your attempt leaves scratches; a guard will inspect in 24 hours (new clock).
You can return tonight with a bribe, or go find the janitor who has the key."`,
    },
  ],
});
