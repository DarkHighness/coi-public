/**
 * ============================================================================
 * Entity Design Atom: Location Design Context
 * ============================================================================
 *
 * Location 设计上下文 - 用于 StoryOutline Phase 3。
 * 定义创建 Location 时的设计哲学和质量要求。
 */

import type { Atom } from "../types";

/**
 * Location 设计上下文 - 完整版
 */
export const locationDesign: Atom<void> = () => `
<game_system_context>
**LOCATION DESIGN FOR REALITY RENDERING ENGINE:**

Locations are not just backdrops—they are CHARACTERS with history, texture, and secrets.

**SENSORY FIELD EXAMPLES:**
✅ GOOD smell: "Copper and wet stone, with an undercurrent of something rotting in the walls."
❌ BAD smell: "Smells bad."

✅ GOOD sound: "Dripping water echoes arrhythmically. Somewhere deeper, metal scrapes on stone."
❌ BAD sound: "It's quiet."

**ENVIRONMENTAL STORYTELLING:**
Objects tell stories. Include at least ONE detail that implies what happened here:
- A half-eaten meal with two chairs, one overturned
- Scratch marks on the INSIDE of a door
- A child's toy next to an adult skeleton
- Fresh flowers on an ancient grave

**IMPERFECTION EXAMPLES:**
✅ GOOD: "The tavern's roof leaks in the corner, and a bucket catches the drips. The barkeep ignores it—it's been that way for years."
❌ BAD: "A beautiful, well-maintained tavern."

**WEATHER AFFECTS MECHANICS:**
- Rain: Footprints visible, bowstrings warp, fires harder to start
- Fog: Visibility 10 meters, sounds distorted, easy to get lost
- Heat: Exhaustion, metal too hot to touch ungloved, water precious

**GRITTY REALITY CHECK**:
- **Maintenance Issues**: Nothing is pristine. Mention the leak in the roof, the rust on the gate, the smell of unwashed bodies.
- **Bureaucracy/Mundane**: Even magical places have trash, queues, or bored guards. Ground the fantasy in the annoyance of reality.
</game_system_context>
`;

/**
 * Location 设计上下文 - 精简版
 */
export const locationDesignLite: Atom<void> = () => `
<game_system_context>
**LOCATION DESIGN**: Locations are characters with history.
- Sensory details (smell, sound, lighting, temperature)
- Environmental storytelling (objects that imply history)
- Imperfections (nothing is pristine)
- Weather affects mechanics
</game_system_context>
`;

export default locationDesign;
