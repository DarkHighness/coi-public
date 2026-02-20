/**
 * ============================================================================
 * Entity Design Atom: Quest Design Context
 * ============================================================================
 *
 * Quest 设计上下文 - 用于 StoryOutline Phase 7。
 * 定义创建 Quest 时的设计哲学和质量要求。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

/**
 * Quest 设计上下文 - 完整版
 */
export const questDesign: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/questDesign#questDesign",
    source: "atoms/entities/questDesign.ts",
    exportName: "questDesign",
  },
  () => `
<game_system_context>
**QUEST DESIGN FOR REALITY RENDERING ENGINE:**

Quests are NOT fetch tasks -- they are the questions the story asks the protagonist, and the answers cost something. The visible layer is bait; the hidden layer is the hook. The best quests, like Oedipus seeking his father's killer, reveal that the answer was something the seeker never wanted to find.

**TWIST EXAMPLES:**
✅ GOOD hidden.twist: "The 'cursed village' isn't cursed—the villagers are hiding a fugitive who knows the Duke's secret. The Duke wants him silenced, and he hired you to do it without knowing."
❌ BAD hidden.twist: "There's a plot twist."

**VISIBLE vs HIDDEN CONTRADICTION:**
| visible | hidden |
|---------|--------|
| "Rescue the kidnapped princess" | "The princess staged her own kidnapping to escape an arranged marriage" |
| "Kill the monster terrorizing the village" | "The 'monster' is protecting the village from a worse threat" |
| "Find the cure for the plague" | "The cure exists, but it's hoarded and weaponized by the people in power—getting it means becoming their tool or making enemies you can't outrun" |

**TIME PRESSURE EXAMPLES:**
- "The ritual completes in 3 days. After that, the portal opens permanently."
- "The winter storms arrive in a week. After that, the mountain pass closes until spring."
- "The merchant caravan leaves at dawn. Miss it, and you're stranded for a month."

**FAILURE CONSEQUENCES:**
What happens if the protagonist fails or delays?
- Someone dies
- An opportunity closes forever
- The enemy grows stronger
- Trust is lost

**STAKES ESCALATION**:
- **Personal Stakes**: What does the protagonist lose if they fail? (Not just "the world ends" -- something CLOSE to them, something with a name and a face)
- **Time Pressure**: Why can't this wait? What ticking clock forces action? Every hesitation has a body count.
- **Impossible Choice**: The best outcome should require sacrificing something the protagonist values. Sophie's choice is the template -- not because it is cruel, but because it is true.

<quest_playability>
**MAKE QUESTS PLAYABLE (NOT JUST COOL)**

Every quest should have:
- **A clear entry point**: who asks, where, what immediate proof exists.
- **A lead chain** (3–5 steps): each lead is something you can DO (talk/search/tail/bribe/break in), and each step produces a concrete artifact:
  * a name, a place, a document, a physical trace, a time window, or a leverage point.
- **At least two approaches** to progress:
  * social (talk/bribe/threaten), physical (sneak/break/steal), procedural (paperwork/permits/records), violent (raid/ambush).
- **A “what if you do nothing” outcome**: by tomorrow, something changes (deadline passes, target moves, evidence destroyed, someone is arrested).

Avoid:
- “Find the truth” with no actionable steps.
- Clues that require mind-reading (“You sense he’s lying”).
- Single-point-of-failure design (one roll/NPC or nothing).
</quest_playability>

<schema_field_mapping>
**WHERE TO WRITE — Quest Schema Field Paths:**
| Design Concept | → Schema Field |
|---|---|
| Apparent objective | \`visible.description\` |
| Known task steps | \`visible.objectives[]\` |
| True purpose (GM-only) | \`hidden.trueDescription\` |
| Real hidden objectives | \`hidden.trueObjectives[]\` |
| Hidden complication or moral dilemma | \`hidden.twist\` |
| Outcome revealed on completion | \`hidden.secretOutcome\` |
| Quest type | \`type\` (main / side / hidden) |
| Visibility scope | \`knownBy[]\` |
| Internal planning notes | \`notes\` — or entity \`notes.md\` for extended context |

**FALLBACK**: Lead chains, approach matrices, "do nothing" timelines, or fail-forward branching → write to quest \`notes\` field or \`notes.md\`.
</schema_field_mapping>
</game_system_context>
`,
);

/**
 * Quest 设计上下文 - 精简版
 */
export const questDesignDescription: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/questDesign#questDesignDescription",
    source: "atoms/entities/questDesign.ts",
    exportName: "questDesignDescription",
  },
  () => `
<game_system_context>
**QUEST DESIGN**: Quests are the questions the story asks -- and the answers cost something.
- Visible vs hidden contradiction (the surface conceals the wound)
- Twist (complication or moral dilemma)
- Time pressure
- Failure consequences
- Stakes escalation
</game_system_context>
`,
);

export default questDesign;

// ============================================================================
// Skill Version - Returns structured output for VFS multi-file generation
// ============================================================================

export const questDesignSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/entities/questDesign#questDesignSkill",
    source: "atoms/entities/questDesign.ts",
    exportName: "questDesignSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(questDesign),

    quickStart: `
1. Visible vs Hidden: Surface objective contradicts hidden truth
2. Twist: Complication or moral dilemma (not just "there's a twist")
3. Time Pressure: Deadline with specific consequences
4. Failure Stakes: What happens if protagonist fails or delays
5. Playability: Lead chain (3-5 steps), multiple approaches, entry point
`.trim(),

    checklist: [
      "Visible layer contradicts hidden layer?",
      "Twist is specific (not just 'plot twist')?",
      "Time pressure has specific deadline?",
      "Failure consequences are concrete (someone dies, opportunity closes)?",
      "Clear entry point (who asks, where, what proof)?",
      "Lead chain exists (3-5 actionable steps)?",
      "At least two approaches to progress?",
      "'Do nothing' outcome defined?",
    ],

    examples: [
      {
        scenario: "Visible vs Hidden",
        wrong: `visible: "Rescue the princess"
hidden: "There's a twist"
(No actual contradiction defined.)`,
        right: `visible: "Rescue the kidnapped princess"
hidden: "The princess staged her own kidnapping to escape
an arranged marriage. 'Rescuing' her means returning her to prison."
(Surface objective contradicts moral reality.)`,
      },
      {
        scenario: "Time Pressure",
        wrong: `"You should hurry."
(Vague, no stakes.)`,
        right: `"The ritual completes in 3 days. After that, the portal opens permanently.
The merchant caravan leaves at dawn. Miss it, and you're stranded for a month."
(Specific deadline with specific consequence.)`,
      },
      {
        scenario: "Lead Chain",
        wrong: `"Find the truth about the murder."
(No actionable steps defined.)`,
        right: `Lead 1: Talk to the bartender (witnessed the argument)
Lead 2: Search the victim's room (find the letter)
Lead 3: Tail the suspect (observe meeting at warehouse)
Lead 4: Bribe the dockworker (get shipping manifest)
Lead 5: Confront the merchant (with evidence)
(Each step produces artifact, leads to next.)`,
      },
      {
        scenario: "Playability",
        wrong: `"You sense something is wrong. Find out what."
(Mind-reading, no concrete clues.)`,
        right: `Entry: The widow hires you. She has her husband's last letter (physical artifact).
Approaches:
- Social: Interview the business partner
- Physical: Break into the warehouse at night
- Procedural: Check shipping records at the guild
- Violent: Raid the smuggler's den
(Multiple paths, concrete actions.)`,
      },
    ],
  }),
);

// ============================================================================
// Quest Logic - progression, gating, failure-forward, and dependency rules
// ============================================================================

export const questLogic: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/questDesign#questLogic",
    source: "atoms/entities/questDesign.ts",
    exportName: "questLogic",
  },
  () => `
<game_system_context>
**QUEST LOGIC**: Quests are state machines with pressure, branches, and cost.

**STATE MACHINE MECHANICS:**
- Quests exist in states: UNDISCOVERED → AVAILABLE → ACTIVE → (COMPLETED | FAILED | ABANDONED | TRANSFORMED)
- State transitions require EVIDENCE: an artifact found, a conversation overheard, an action taken
- Transitions can be triggered by player action OR world events (the quest clock expires, an NPC acts independently)
- TRANSFORMED means the quest mutated into something else (the rescue mission becomes an escape; the investigation becomes a cover-up)

**FAIL-FORWARD DESIGN:**
- Quest failure is NEVER a dead end. It is a fork to a different path with different costs.
- Failed rescue → survivor's guilt + enemy emboldened + potential revenge arc
- Missed deadline → opportunity lost forever + the world moved on without you + new problems from the gap
- Botched negotiation → relationship damaged + harder path still available + NPC remembers
- The CONSEQUENCES of failure should be more narratively interesting than the rewards of success

**DISCOVERY CHAIN TRIGGERS:**
- Completing or advancing one quest should reveal breadcrumbs to others
- The merchant's ledger reveals a name → the name connects to a faction → the faction is running a parallel operation
- Discovery feels earned when each link requires ACTION, not just information receipt
- "Show, don't tell" applies to quest hooks: the player should STUMBLE ONTO leads, not be handed briefings

**PRESSURE ESCALATION:**
- Quest clocks advance whether the player is paying attention or not
- Each clock tick should produce VISIBLE consequences: the kidnap victim is moved further away; the plague spreads to another district; the enemy fortifies their position
- Escalation should compress the protagonist's options: early in the quest, many approaches are viable; late in the quest, only desperate measures remain
- The protagonist's OWN delays should be the cause of escalation, creating genuine regret

**CROSS-ENTITY SYNCHRONIZATION:**
- Quest state changes ripple to: NPC attitudes (allies lose patience, enemies prepare), location states (the hideout is abandoned, the bridge is destroyed), faction postures (support withdrawn, counter-operations launched), timeline events (new entries created from quest outcomes)
- Abandoned quests don't disappear — their unresolved consequences continue to develop off-screen
</game_system_context>
`,
);

export const questLogicDescription: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/questDesign#questLogicDescription",
    source: "atoms/entities/questDesign.ts",
    exportName: "questLogicDescription",
  },
  () => `
<game_system_context>
**QUEST LOGIC**: Drive progress by evidence, clocks, and fail-forward.
- Actionable leads
- Branchable approaches
- Consequence-carrying failure
</game_system_context>
`,
);

export const questLogicSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/entities/questDesign#questLogicSkill",
    source: "atoms/entities/questDesign.ts",
    exportName: "questLogicSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(questLogic),
    quickStart: `
1. Identify current quest state and available transitions
2. Validate transition evidence (artifact, witness, action, or world event)
3. Advance quest clocks and resolve deadline consequences
4. If failed: apply fail-forward (new path, not dead end)
5. Check for discovery chain triggers to other quests
6. Synchronize changes to NPC/location/faction/timeline entities
`.trim(),
    checklist: [
      "Quest state transition backed by concrete evidence?",
      "At least two viable approaches preserved at current stage?",
      "Quest clock advanced with visible consequences?",
      "Failure results in forward pressure (not reset or dead end)?",
      "Discovery chain checked (does this step reveal new leads)?",
      "Linked entities updated (NPC attitudes, location states, faction posture)?",
      "Abandoned quest consequences continue off-screen?",
      "Pressure escalation compresses options over time?",
    ],
  }),
);
