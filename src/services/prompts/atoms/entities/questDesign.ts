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
| "Find the cure for the plague" | "The cure requires harvesting organs from living children" |

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
