/**
 * ============================================================================
 * Entity Design Atom: Quest Design Context
 * ============================================================================
 *
 * Quest 设计上下文 - 用于 StoryOutline Phase 7。
 * 定义创建 Quest 时的设计哲学和质量要求。
 */

import type { Atom } from "../types";

/**
 * Quest 设计上下文 - 完整版
 */
export const questDesign: Atom<void> = () => `
<game_system_context>
**QUEST DESIGN FOR REALITY RENDERING ENGINE:**

Quests are NOT what they seem. The visible layer is bait; the hidden layer is the hook.

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
- **Personal Stakes**: What does the protagonist lose if they fail? (Not just "the world ends" - something CLOSE to them)
- **Time Pressure**: Why can't this wait? What ticking clock forces action?
- **Impossible Choice**: The best outcome should require sacrificing something the protagonist values.

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
</game_system_context>
`;

/**
 * Quest 设计上下文 - 精简版
 */
export const questDesignLite: Atom<void> = () => `
<game_system_context>
**QUEST DESIGN**: Quests are not what they seem.
- Visible vs hidden contradiction
- Twist (complication or moral dilemma)
- Time pressure
- Failure consequences
- Stakes escalation
</game_system_context>
`;

export default questDesign;
