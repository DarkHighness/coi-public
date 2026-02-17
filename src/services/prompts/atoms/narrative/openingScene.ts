/**
 * ============================================================================
 * Narrative Atom: Opening Scene Context
 * ============================================================================
 *
 * 开场场景上下文 - 用于 StoryOutline Phase 9。
 * 定义开场场景的设计原则：In Medias Res, NPC Presence, Environmental Storytelling, Choices.
 */

import type { Atom } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

/**
 * 开场场景上下文 - 完整版
 */
export const openingScene: Atom<void> = defineAtom(
  {
    atomId: "atoms/narrative/openingScene#openingScene",
    source: "atoms/narrative/openingScene.ts",
    exportName: "openingScene",
  },
  () => `
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

<opening_execution_structure>
**OPENING SCENE STRUCTURE** (required beats in this order):

1. **SENSORY HOOK** (first 1-2 sentences): A concrete physical sensation that places the protagonist IN the world. Temperature, sound, smell, or physical discomfort. NOT exposition. NOT narration about the world.
   ✅ "The cobblestones are slick under your boots. Rain has been falling since before dawn."
   ❌ "The kingdom of Valdris is a land of ancient magic and political intrigue."

2. **ESTABLISHED ACTION** (2-3 sentences): NPCs or environment mid-activity BEFORE noticing the protagonist. At least 2 concrete details of ongoing life that the protagonist walks into.
   ✅ "The innkeeper is counting coins — her lips move silently, finger tapping each stack. Across the room, two dockhands argue about a woman neither of them will name."
   ❌ "The innkeeper notices you and smiles."

3. **PROTAGONIST LENS** (woven throughout): At least 3 sensory/interpretive details that are UNIQUE to this protagonist's background. See examples below.

4. **TENSION SEED** (1-2 sentences): Something is wrong, incomplete, or about to change. Not a full conflict — a seed. The player should feel "I need to decide something soon."
   ✅ "The letter on the table is addressed to you. The handwriting is your father's. He's been dead for six years."
   ❌ "Everything seems peaceful and calm."

5. **ACTIONABLE CHOICES** (3-4 options): Each choice must change the protagonist's position, information, or relationships. No choices that are functionally identical.
</opening_execution_structure>

<opening_through_protagonist_lens>
**THE OPENING SCENE IS THE LENS CALIBRATION MOMENT.**

The very first scene establishes HOW this protagonist sees the world. The reader should understand the protagonist's identity through what the narrative CHOOSES to describe, not through exposition.

**Rule**: The opening scene's environmental details must be filtered through the protagonist's identity. At least 3 of the sensory details should be details that ONLY this specific identity would render with such precision.

❌ BAD (identity-blind opening):
"You stand in a busy marketplace. People shout. Stalls line the street."

✅ GOOD (merchant lens):
"The market is running hot — three competing spice vendors within shouting distance, and not one of them has noticed the Kessian pepper shipment hasn't arrived. The silk merchant in the corner stall is selling last season's patterns at this season's prices. The crowd flows like money: fast near the food stalls, slow near the luxuries."

✅ GOOD (soldier lens):
"The market has two exits — the main gate and a narrow alley between the tanner and the chandler. The crowd is dense enough to hide a blade. Three guards patrol in a triangle pattern with a blind spot near the fountain. The man by the dried-fish stall has a military posture and a bulge under his left arm."

✅ GOOD (orphan lens):
"The market smells like everything you can't afford. A baker pulls fresh rolls from the oven — the steam carries the scent across three stalls. The fruit vendor's reject pile sits behind the cart, bruised apples and soft pears. A dog got there first. The guard by the gate has a kind face but a quick hand."

✅ GOOD (courtier lens):
"The governor's wife is here — third palanquin from the left, the one with the slightly faded curtains. She used to have the best. The merchant bowing to her is overdoing it; he wants something. Two stalls down, the tax collector's nephew is buying silk he can't afford on his salary. Someone is paying him. The question is who."

The opening is the PROMISE of how the entire game will render. Get the lens right here, and every subsequent scene inherits it.
</opening_through_protagonist_lens>
`,
);

export default openingScene;
