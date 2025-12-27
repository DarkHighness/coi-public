/**
 * ============================================================================
 * Core Atom: Game System Design Context
 * ============================================================================
 *
 * Reality Rendering Engine 的核心设计上下文。
 * 用于 StoryOutline 各阶段，解释游戏系统的设计哲学。
 */

import type { Atom } from "../types";

/**
 * 游戏系统设计上下文 - 无参数
 */
export const gameSystemDesign: Atom<void> = () => `
<game_system_design_context>
**CRITICAL: You are designing for a REALITY RENDERING ENGINE, not a simple story.**

The game system you are creating content for operates on these principles:
1. **Dual-Layer Reality**: Everything has visible (what player perceives) and hidden (GM truth) layers
2. **No Plot Armor**: Consequences are real. Death is possible. The world doesn't care about the protagonist.
3. **Living World Simulation**: NPCs pursue their own agendas. The economy responds to events. Time passes.
4. **Information Asymmetry**: NPCs know more about their world than the player. Secrets are earned, not given.
5. **Deep History**: Nothing exists without a past. Every item, NPC, and location has origins.

**Your outline must support this simulation:**
- Create CONFLICTS that can unfold organically (not scripted events)
- Design FACTIONS with their own goals that may clash with the protagonist
- Establish SECRETS that can be discovered through gameplay
- Build a world that continues to exist when the player isn't watching
</game_system_design_context>
`;

export default gameSystemDesign;
