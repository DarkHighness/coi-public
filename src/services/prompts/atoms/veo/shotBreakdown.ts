/**
 * ============================================================================
 * VEO Atom: Shot Breakdown Template
 * ============================================================================
 *
 * 镜头分解模板 - VEO 脚本的镜头描述格式。
 */

import type { Atom } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

/**
 * 镜头分解模板
 */
export const shotBreakdownTemplate: Atom<void> = defineAtom(
  {
    atomId: "atoms/veo/shotBreakdown#shotBreakdownTemplate",
    source: "atoms/veo/shotBreakdown.ts",
    exportName: "shotBreakdownTemplate",
  },
  () => `For each shot, specify all visual parameters:

SHOT N: [Narrative Purpose — what emotion or information this shot conveys]
- FRAME: Shot size and angle (e.g., "Extreme Wide Shot establishing scale", "Medium Close-up capturing reaction", "Low-angle hero shot", "Over-the-shoulder dialogue framing", "Dutch angle for unease")
- LENS: Focal length and characteristics (e.g., "14mm ultra-wide for environmental grandeur", "35mm standard for immersive perspective", "50mm for natural human-eye feel", "85mm telephoto for intimate portrait with bokeh separation", "macro for detail inserts")
- LIGHTING: Key light source, direction, quality, and color temperature for this specific shot
- ACTION: Specific physical action — what the subject does, facial expression, body language, interaction with environment
- CAMERA MOVE: Precise movement with speed (e.g., "Slow crane up revealing the vista over 3 seconds", "Steady push-in dolly closing distance", "Handheld follow with slight shake for tension", "Static locked-off tripod for stillness", "Smooth arc orbit around subject")
- ATMOSPHERE: Particles, depth haze, volumetric light, environmental effects in this shot`,
);

/**
 * 必须使用的关键词
 */
export const mandatoryKeywords: Atom<void> = defineAtom(
  {
    atomId: "atoms/veo/shotBreakdown#mandatoryKeywords",
    source: "atoms/veo/shotBreakdown.ts",
    exportName: "mandatoryKeywords",
  },
  () =>
    `Include these cinematography keywords naturally in descriptions: cinematic, highly detailed textures, atmospheric volumetric lighting, shallow depth of field with bokeh, professional cinematography, immersive spatial audio, film grain, motivated lighting, production design.`,
);

/**
 * 输出避免事项
 */
export const avoidList: Atom<void> = defineAtom(
  {
    atomId: "atoms/veo/shotBreakdown#avoidList",
    source: "atoms/veo/shotBreakdown.ts",
    exportName: "avoidList",
  },
  () => `Avoid these in your script:
- Third-person narration ("The character sees...") — always use "You see...", "You step forward..."
- Empty superlatives without visual specifics ("beautiful", "amazing", "epic", "breathtaking") — instead describe WHAT makes it visually striking
- Items not established in <game_state><inventory>
- NPCs not listed in <game_state><npcs_present>
- Contradictory visual elements (e.g., rain during "clear sky" weather)
- Abstract or non-visual descriptions — every sentence must paint something the camera can capture
- Jump cuts without spatial logic — camera moves must flow naturally`,
);

export default shotBreakdownTemplate;
