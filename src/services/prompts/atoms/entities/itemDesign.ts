/**
 * ============================================================================
 * Entity Design Atom: Item Design Context
 * ============================================================================
 *
 * Item 设计上下文 - 用于 StoryOutline Phase 6。
 * 定义创建 Item 时的设计哲学和质量要求。
 */

import type { Atom } from "../types";

/**
 * Item 设计上下文 - 完整版
 */
export const itemDesign: Atom<void> = () => `
<game_system_context>
**ITEM DESIGN FOR REALITY RENDERING ENGINE:**

Items are not just "loot"—they are pieces of the world's history.

**LORE FIELD EXAMPLES:**
✅ GOOD lore: "Forged by Master Yun of the Iron Peaks in the Year of Falling Stars. The blade was quenched in wolf's blood, giving it a faint howl when swung. It passed through three owners—all died violently. The protagonist found it in his father's chest, hidden under old letters."
❌ BAD lore: "An old sword with magic power."

**EMOTIONAL WEIGHT EXAMPLES:**
✅ GOOD emotionalWeight: "This compass belonged to your brother, who never returned from his voyage. You carry it hoping it will lead you to answers—or his grave."
❌ BAD emotionalWeight: "It's useful for navigation."

**HIDDEN PROPERTIES:**
Items may have secrets that reveal under conditions:
- Blood: The blade glows when it tastes blood (any blood)
- Moonlight: The inscription becomes visible only under full moon
- Emotion: The amulet grows warm when someone nearby lies
- Death: The ring tightens when its wearer is about to die

**DEGRADATION:**
Note the item's current condition:
- "The edge is chipped from blocking a sword meant for your neck"
- "The grip is worn smooth where your father's hand held it for 20 years"
</game_system_context>
`;

/**
 * Item 设计上下文 - 精简版
 */
export const itemDesignLite: Atom<void> = () => `
<game_system_context>
**ITEM DESIGN**: Items are history pieces.
- Rich lore (creator, method, history, current state)
- Emotional weight (why it matters)
- Hidden properties (reveal under conditions)
- Degradation (current condition)
</game_system_context>
`;

export default itemDesign;
