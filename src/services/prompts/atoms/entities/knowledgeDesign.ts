/**
 * ============================================================================
 * Entity Design Atom: Knowledge Design Context
 * ============================================================================
 *
 * Knowledge 设计上下文 - 用于 StoryOutline Phase 8。
 * 定义创建 Knowledge 时的设计哲学和质量要求。
 */

import type { Atom } from "../types";

/**
 * Knowledge 设计上下文 - 完整版
 */
export const knowledgeDesign: Atom<void> = () => `
<game_system_context>
**KNOWLEDGE DESIGN FOR REALITY RENDERING ENGINE:**

Knowledge entries are what the WORLD believes. They are often WRONG.

**VISIBLE vs HIDDEN EXAMPLES:**
✅ GOOD:
- visible.description: "The Great Flood was divine punishment for the sins of the Old Kingdom."
- hidden.fullTruth: "The Flood was caused by a failed magical experiment. The 'sins' story was propaganda to hide the Mage Council's responsibility."

❌ BAD:
- visible.description: "The kingdom has a history."
- hidden.fullTruth: "It's more complicated."

**MISCONCEPTIONS FIELD:**
What do people WRONGLY believe?
- "Everyone thinks the King died of illness; he was poisoned by his own son."
- "The common folk believe iron wards off spirits; it only works if forged during an eclipse."
- "Merchants claim the Eastern Road is safe; bandits pay them to say so."

**FORESHADOWING:**
Hint at revelations the protagonist will discover later:
- A legend about a "sleeping dragon" that matches the description of a location from Phase 3
- A prophecy that uses imagery from the protagonist's coreTrauma
- A historical figure whose description matches a "dead" NPC

<quality_guidelines>
  - Knowledge entries should CONTRADICT each other between visible and hidden layers
  - Public knowledge should be PLAUSIBLE but WRONG
  - Hidden truth should EXPLAIN the visible layer's mistakes
  - Each entry should connect to at least one other story element (NPC, location, quest)
</quality_guidelines>
</game_system_context>
`;

/**
 * Knowledge 设计上下文 - 精简版
 */
export const knowledgeDesignLite: Atom<void> = () => `
<game_system_context>
**KNOWLEDGE DESIGN**: Knowledge is what the world believes (often wrong).
- Visible vs hidden contradiction
- Misconceptions (what people wrongly believe)
- Foreshadowing (hints at future revelations)
- Connect to other story elements
</game_system_context>
`;

export default knowledgeDesign;
