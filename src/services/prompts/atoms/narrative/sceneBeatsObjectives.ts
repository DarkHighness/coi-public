/**
 * ============================================================================
 * Craft Skill: Scene Beats & Objectives
 * ============================================================================
 *
 * 让每个场景都“有发动机”：目标、门槛、推进、代价、结尾决策点。
 * 这能显著提升任何 theme 的密度与可玩性，避免空转。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const sceneBeatsObjectives: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/sceneBeatsObjectives#sceneBeatsObjectives",
    source: "atoms/narrative/sceneBeatsObjectives.ts",
    exportName: "sceneBeatsObjectives",
  },
  () => `
<craft_context>
**SCENE BEATS & OBJECTIVES (Engines, Not Vibes)**

Design goal: each scene produces a concrete change — new access, new pressure, new decision.

<rule name="The 6-Part Scene Engine">
Every scene is an engine with 6 moving parts. If any part is missing, the scene stalls.

1) **Objective**: What does the player want *right now*? State it in 7 words or fewer.
   - "Get past the checkpoint" / "Find who sent the note" / "Survive until dawn"
   - If you cannot state it, the scene has no engine. Add one before writing.

2) **Gate**: What stands between the player and the objective?
   | Gate Type | Example | Bypass Cost |
   |-----------|---------|-------------|
   | Physical | Locked door, collapsed bridge | Time, noise, equipment |
   | Social | Guard loyalty, NPC distrust | Reputation, favors, risk |
   | Knowledge | Missing password, unknown ritual | Investigation, exposure |
   | Temporal | Deadline, patrol cycle, decay | Speed → errors, shortcuts → trails |
   | Moral | Betrayal required, innocent at risk | Conscience, reputation, self-image |

3) **Approach**: The player chooses HOW to bypass the gate. Offer at least 2 genuine options.
   - Each approach must have a DIFFERENT cost profile (not just difficulty level)
   - ✅ Talk (costs relationship capital) vs. Sneak (costs time + leaves evidence)
   - ❌ Easy fight vs. Hard fight (same cost type, different degree)

4) **Cost**: Every approach extracts something. Name it explicitly.
   - Time → clock advances, other events progress without you
   - Exposure → someone saw, someone knows, trail left
   - Resource → money spent, item consumed, favor called in
   - Injury → pain, reduced capability, treatment needed
   - Relationship → trust spent, bridge burned, debt created

5) **Result**: Never binary pass/fail. Always one of three outcomes:
   | Outcome | What Happens | What the Player Gains |
   |---------|--------------|----------------------|
   | Full success | Objective achieved | Access + momentum |
   | Partial success | Achieved WITH complication | Access + new constraint |
   | Fail-forward | NOT achieved, but new path opens | New information or new route |

6) **Decision hook**: The scene MUST end with a fork. Not "what do you do?" but a specific tradeoff.
   - ✅ "The back door is open, but the child is still inside. Leave now or go back?"
   - ❌ "What would you like to do next?"
</rule>

<fail_forward>
## Fail-Forward Mechanics (NEVER dead-end)

When the player fails, failure CREATES something:
| Failure Creates | Example |
|----------------|---------|
| New constraint | Guard alert raised → tighter patrols for 24 hours |
| New lead | Lockpick broke, but you saw papers through the gap — a name |
| New obligation | Caught, but released with a debt: "You owe me" |
| New clock | Alarm triggered → 10 minutes before reinforcements |
| New relationship | The person who caught you is sympathetic — for now |

**ABSOLUTE PROHIBITION**:
- ❌ "Nothing happens." (Every action changes the world.)
- ❌ "You can't do that." (You can attempt anything. The world responds.)
- ❌ "Try again." (Time passed. Circumstances changed. Same attempt, different result.)
</fail_forward>

<beat_patterns>
## Beat Patterns (pick one per scene)

Each pattern is a 3-beat structure. The rhythm: **pressure → player action → new pressure**.

| Pattern | Beat 1 | Beat 2 | Beat 3 |
|---------|--------|--------|--------|
| Gate → Workaround → Audit | Checkpoint blocks passage | Player bribes/sneaks/talks past | Evidence remains; someone will check |
| Reveal → Consequence → Choice | Hidden truth surfaces | Relationships and plans shift | Player must choose: act on truth or bury it |
| Debt → Refusal → Escalation | Creditor demands payment | Player refuses or negotiates | Creditor escalates: threatens, takes collateral |
| Clock → Shortcut → Trail | Deadline approaching | Player takes risky shortcut | Shortcut leaves evidence that surfaces later |
| Sanctuary → Breach → Obligation | Player reaches safe haven | Safe haven has a failure mode | Safety requires a new commitment |

**APPLICATION RULE**: When you pick a pattern, ALL 3 BEATS must appear in the scene. Don't start a debt scene and end at Beat 1.
</beat_patterns>

<scene_density_check>
## Scene Density Self-Check

Before finishing a scene, verify:
- Player GAINED or LOST something concrete (information, access, item, standing)
- World CHANGED in an observable way (guard rotation shifted, NPC mood changed, resource depleted)
- A NEW QUESTION was raised that the player didn't have before
- The ending FORCES a choice with a specific tradeoff (not "what next?" but "A or B, each costs something")

If fewer than 3 are true, the scene is too thin. Add a complication.
</scene_density_check>

<endings>
## Ending Types (every scene ends with a decision)

| Ending Type | Structure | Player Experience |
|-------------|-----------|-------------------|
| Two leads, different costs | "The clerk talks for 50 gold. The rival talks for a favor." | Resource vs. obligation |
| One lead, two approaches | "Front door (fast, guards) or sewer (slow, no witnesses)" | Risk profile choice |
| Opportunity vs. obligation | "The ship leaves at dawn. But you promised her tonight." | Desire vs. duty |
| Truth vs. relationship | "Telling him saves lives. It also destroys his trust." | Moral weight |
| Retreat vs. commitment | "You can walk away clean. Or see what's behind that door." | Safety vs. curiosity |
</endings>
</craft_context>
`,
);

export const sceneBeatsObjectivesPrimer: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/sceneBeatsObjectives#sceneBeatsObjectivesPrimer",
    source: "atoms/narrative/sceneBeatsObjectives.ts",
    exportName: "sceneBeatsObjectivesPrimer",
  },
  () =>
    `
<craft_context>
**SCENE PRIMER**: Every scene needs objective + gate + cost + result + decision hook. Use fail-forward; no dead ends.
</craft_context>
`.trim(),
);

export const sceneBeatsObjectivesSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/narrative/sceneBeatsObjectives#sceneBeatsObjectivesSkill",
    source: "atoms/narrative/sceneBeatsObjectives.ts",
    exportName: "sceneBeatsObjectivesSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(sceneBeatsObjectives),
    quickStart: `
1) Write the scene objective in 7 words or fewer
2) Pick a gate type (physical/social/knowledge/temporal/moral)
3) Offer 2+ approaches with DIFFERENT cost profiles
4) Determine result tier: full / partial / fail-forward
5) End with a decision hook — a specific tradeoff, not "what next?"
6) Run the density check: gained/lost, world changed, new question, forced choice
`.trim(),
    checklist: [
      "Objective is concrete and statable in 7 words?",
      "Gate has a specific type with clear bypass cost?",
      "At least 2 approaches with different cost profiles (not just difficulty)?",
      "Costs are named explicitly (time/exposure/resource/injury/relationship)?",
      "Failure creates something new (constraint/lead/obligation/clock/relationship)?",
      "Result is 3-tier (full/partial/fail-forward), never binary?",
      "Scene ends with a specific tradeoff decision, not an open prompt?",
      "Density check passes (3+ of 4 criteria met)?",
    ],
    examples: [
      {
        scenario: "Fail-forward",
        wrong: `"You fail the lockpick. You can't enter."`,
        right: `"You fail the lockpick, but you notice the maintenance schedule (new lead).
Your attempt leaves scratches; a guard will inspect in 24 hours (new clock).
You can return tonight with a bribe, or go find the janitor who has the key."`,
      },
      {
        scenario: "Decision hook",
        wrong: `"What would you like to do next?" (open-ended, no tension)`,
        right: `"The back door is unlocked. But the child is still in the basement.
You can hear boots on the floor above — two minutes, maybe less.
Leave now and you're clean. Go back and you might not leave at all."
(Specific tradeoff: safety vs. conscience, with a time pressure)`,
      },
    ],
  }),
);
