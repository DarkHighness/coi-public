/**
 * ============================================================================
 * Entity Design Atom: Faction Design Context
 * ============================================================================
 *
 * Faction 设计上下文 - 用于 StoryOutline Phase 4。
 * 定义创建 Faction 时的设计哲学和质量要求。
 */

import type { Atom } from "../types";

/**
 * Faction 设计上下文 - 完整版
 */
export const factionDesign: Atom<void> = () => `
<game_system_context>
**FACTION DESIGN FOR REALITY RENDERING ENGINE:**

Factions are not monolithic—they are coalitions of individuals with competing interests.

**HIDDEN AGENDA EXAMPLES:**
✅ GOOD hidden.agenda: "The Order publicly 'protects' villages from monsters. In truth, they breed the monsters to justify their protection fees. Elder Varen knows but stays silent—the Order funds his daughter's medicine."
❌ BAD hidden.agenda: "They have secret evil plans."

**INTERNAL CONFLICT (REQUIRED):**
Every faction has at least ONE schism:
- Reformists vs Traditionalists ("The old ways are failing")
- Hawks vs Doves ("We should strike first" vs "Diplomacy is cheaper")
- Leader vs Heir ("Father is too cautious" / "My son is too reckless")

**FACTION PROGRESSION OFF-SCREEN:**
While the protagonist sleeps, factions:
- Hold secret meetings
- Assassinate rivals
- Forge and break alliances
- Move troops and resources

**FACTION RELATIONS EXAMPLES:**
✅ GOOD hidden.relations: "{ target: 'merchant_guild', status: 'Publicly allies, but we're embezzling their trade taxes through our port officials.' }"
❌ BAD hidden.relations: "{ target: 'merchant_guild', status: 'enemies' }"
</game_system_context>
`;

/**
 * Faction 设计上下文 - 精简版
 */
export const factionDesignLite: Atom<void> = () => `
<game_system_context>
**FACTION DESIGN**: Factions are coalitions with competing interests.
- Hidden agenda (detailed, not generic)
- Internal conflict (schisms and rivalries)
- Off-screen progression
- Complex relations (not just "allies" or "enemies")
</game_system_context>
`;

export default factionDesign;
