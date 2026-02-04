/**
 * ============================================================================
 * Narrative Atom: Opening Scene Context
 * ============================================================================
 *
 * 开场场景上下文 - 用于 StoryOutline Phase 9。
 * 定义开场场景的设计原则：In Medias Res, NPC Presence, Environmental Storytelling, Choices.
 */

import type { Atom } from "../types";

/**
 * 开场场景上下文 - 完整版
 */
export const openingScene: Atom<void> = () => `
<game_system_context>
**OPENING NARRATIVE FOR REALITY RENDERING ENGINE:**

The opening is a HOOK, not an introduction. Drop the reader into a moment of tension.

**IN MEDIAS RES EXAMPLES:**
✅ GOOD: "The blade stops an inch from your throat. 'Last chance,' the woman says. 'Where is the seal?'"
❌ BAD: "You wake up in a tavern. It's morning. You feel rested."

**NPC PRESENCE:**
NPCs should be doing something BEFORE they notice the protagonist:
✅ GOOD: "The innkeeper is mid-argument with a merchant when you enter. Neither looks up."
❌ BAD: "The innkeeper greets you warmly."

**ENVIRONMENTAL STORYTELLING:**
Show don't tell—use details that imply history:
- "The chair has rope burns on its arms"
- "Three cups on the table, but only two people in the room"
- "The portrait above the fireplace has been slashed across the face"

**CHOICES THAT MATTER:**
✅ GOOD choices: Actions with consequences
- "Step forward to intervene" / "Slip out the back before they notice you" / "Search the room while they're distracted"
❌ BAD choices: Flavor text with no stakes
- "Say hello" / "Look around" / "Wait"

**AVOID:**
- Waking up as the opening (overused)
- Explaining the world's history before action
- Making the protagonist a passive observer
</game_system_context>

<opening_quality_guidelines>
- Start IN MEDIAS RES if appropriate - drop the reader into action
- Use the character's current condition and background to inform their actions, voice, and choices (no protagonist mind-reading)
- Hint at upcoming challenges without spelling them out
- Create curiosity about the world without info-dumping
</opening_quality_guidelines>
`;

export default openingScene;
