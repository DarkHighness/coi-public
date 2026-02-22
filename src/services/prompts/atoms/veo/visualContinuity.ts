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
  () => `Analyze <veo_context> to ensure visual consistency and continuity:
- Environment must match <game_state><location> details — architecture, props, lighting, and atmosphere should be spatially coherent.
- Character state (injuries, fatigue, status effects) should visually affect posture, movement speed, and expression throughout the shot sequence.
- Visible items from <game_state><inventory> should appear on the character naturally (holstered weapons, worn armor, carried items).
- Only include NPCs listed in <game_state><npcs_present> — maintain their established appearance, clothing, and distinguishing features.
- Maintain lighting direction and weather continuity from <recent_narrative_flow> — light sources should remain consistent across cuts.
- Color palette should stay coherent throughout the sequence, shifting only with motivated narrative changes.`,
);

export default visualContinuityRules;
