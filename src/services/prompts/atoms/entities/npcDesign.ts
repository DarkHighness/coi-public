/**
 * ============================================================================
 * Entity Design Atom: NPC Design Context
 * ============================================================================
 *
 * NPC 设计上下文 - 用于 StoryOutline Phase 5。
 * 定义创建 NPC 时的设计哲学和质量要求。
 */

import type { Atom } from "../types";

/**
 * NPC 设计上下文 - 完整版
 */
export const npcDesign: Atom<void> = () => `
<game_system_context>
**NPC DESIGN FOR REALITY RENDERING ENGINE (TRUE PERSON LOGIC):**

NPCs are NOT quest dispensers. They are people living their own stories.

**DUAL PERSONALITY EXAMPLES:**
✅ visible.personality: "Cheerful innkeeper who remembers everyone's name and favorite drink."
   hidden.realPersonality: "Calculating predator. Memorizes habits to identify easy marks for the thieves' guild he reports to."
❌ BAD: visible = hidden (no depth)

**REAL MOTIVES EXAMPLES:**
✅ GOOD hidden.realMotives: "Needs 200 gold by month's end to pay his gambling debts, or the Crimson Hand will break his legs. Will do ANYTHING to get it—steal, lie, betray."
❌ BAD hidden.realMotives: "Wants money."

**AMBIVALENCE (REQUIRED):**
NPCs should have MIXED feelings about the protagonist:
✅ GOOD hidden.ambivalence: "Respects your combat skill but thinks you're morally weak. Would follow you into battle but never trust you with a secret."
❌ BAD hidden.ambivalence: "Likes you."

**TRANSACTIONAL BENEFIT:**
What does this NPC get from knowing the protagonist?
- Protection from enemies
- Information about the outside world
- Money/resources
- Status by association
- Someone to manipulate

**ROUTINE (REQUIRED):**
Where is this NPC at dawn? Noon? Midnight? What do they do on rest days?

**LOVE EXPRESSION MODE (FOR CLOSE RELATIONSHIPS):**
How does this NPC show they care? Not everyone says "I love you."
- THE PROTECTOR: Takes hits, walks on the street side, checks rooms first
- THE PROVIDER: Leaves food, covers debts, works extra shifts
- THE COMPANION: Just... stays. Says nothing. Needs nothing.
- THE REMEMBERER: Knows details from years ago, notices everything
- THE TRUTH-TELLER: Harsh words born from caring enough to be honest

**UNSPOKEN BONDS:**
What has this NPC sacrificed that the protagonist doesn't know?
What do they hide to protect the protagonist?
What would they die for, but never admit?
</game_system_context>
`;

/**
 * NPC 设计上下文 - 精简版
 */
export const npcDesignLite: Atom<void> = () => `
<game_system_context>
**NPC DESIGN**: NPCs are people, not quest dispensers.
- Dual personality (visible vs hidden)
- Real motives (specific, not generic)
- Ambivalence (mixed feelings about protagonist)
- Routine (daily schedule)
- Love expression mode (how they show care)
</game_system_context>
`;

export default npcDesign;
