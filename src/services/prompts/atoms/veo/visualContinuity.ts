/**
 * ============================================================================
 * VEO Atom: Visual Continuity Rules
 * ============================================================================
 *
 * 视觉连续性规则 - 确保 VEO 脚本与游戏状态一致。
 */

import type { Atom } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

/**
 * 视觉连续性规则
 */
export const visualContinuityRules: Atom<void> = defineAtom(
  {
    atomId: "atoms/veo/visualContinuity#visualContinuityRules",
    source: "atoms/veo/visualContinuity.ts",
    exportName: "visualContinuityRules",
  },
  () => `**CRITICAL: VISUAL CONTINUITY & COHERENCE**
You must analyze <veo_context> to ensure visual consistency.
- **Environment Fidelity**: The video MUST reflect environment details in <game_state><location><environment>.
- **Character State**: If <game_state><protagonist><status> mentions injuries, camera movement should be heavy/shaky; if <game_state><inventory> has glowing items, they must be visible light sources.
- **Item Visibility**: Items in <game_state><inventory> should be visible on character (weapons held, potions on belt, etc.)
- **NPC Presence**: Only include NPCs listed in <game_state><npcs_present>.
- **Lighting/Weather Continuity**: Maintain environmental consistency from <recent_narrative_flow>.`,
);

export default visualContinuityRules;
