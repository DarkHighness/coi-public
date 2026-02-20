/**
 * ============================================================================
 * Core Atom: Game System Design Context
 * ============================================================================
 *
 * Reality Rendering Engine 的核心设计上下文。
 * 用于 StoryOutline 各阶段，解释游戏系统的设计哲学。
 */

import type { Atom } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

/**
 * 游戏系统设计上下文 - 无参数
 */
export const gameSystemDesignDescription: Atom<void> = defineAtom(
  {
    atomId: "atoms/core/gameSystemDesign#gameSystemDesignDescription",
    source: "atoms/core/gameSystemDesign.ts",
    exportName: "gameSystemDesignDescription",
  },
  () => `
<game_system_design_primer>
  - Design for a playable world simulation, not fixed-script storytelling.
  - Keep dual-layer truth: visible player knowledge vs hidden GM mechanism.
  - Ensure off-screen world motion: factions, clocks, and incentives advance without player focus.
  - Every major setup should produce concrete decision pressure and downstream consequences.
</game_system_design_primer>
`,
);

export const gameSystemDesign: Atom<void> = defineAtom(
  {
    atomId: "atoms/core/gameSystemDesign#gameSystemDesign",
    source: "atoms/core/gameSystemDesign.ts",
    exportName: "gameSystemDesign",
  },
  () => `
<game_system_design_context>
You are designing for a **reality simulation** that happens to be written like fiction.

The game system you are creating content for operates on these principles:
1. **Dual-Layer Reality**: Everything has visible (what player perceives) and hidden (GM truth) layers
2. **No Plot Armor**: Consequences are real. Death is possible (subject to early-game protection rules elsewhere). The world is not tailored to the protagonist.
3. **Living World Simulation**: NPCs pursue their own agendas. The economy responds to events. Time passes.
4. **Information Asymmetry**: NPCs know more about their world than the player. Secrets are earned, not given.
5. **Deep History**: Nothing exists without a past. Every item, NPC, and location has origins.

**Your outline should be playable, not just readable:**
- Create conflicts that can unfold organically (not a fixed script). Always ask: “What happens if the player does nothing?”
- Give factions goals, methods, and leverage (money, law, violence, blackmail). Let them collide.
- Seed secrets with discoverable trails (witness → rumor → ledger → location). No secrets that require mind-reading to find.
- Add at least one clock (deadline), one debt (owed favor), and one pursuit (someone watching/looking for the protagonist).
- Make the world runnable off-screen: who moves where, who benefits, who gets hurt, what changes by tomorrow.
</game_system_design_context>
`,
);

export default gameSystemDesign;
