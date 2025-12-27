/**
 * ============================================================================
 * VEO Atom: Shot Breakdown Template
 * ============================================================================
 *
 * 镜头分解模板 - VEO 脚本的镜头描述格式。
 */

import type { Atom } from "../types";

/**
 * 镜头分解模板
 */
export const shotBreakdownTemplate: Atom<void> = () => `**PROFESSIONAL SHOT BREAKDOWN**

Create AS MANY SHOTS AS NEEDED to tell the story (minimum 2, typically 3-5, more for complex scenes).
For each shot, specify:

SHOT N: [Shot Purpose/Type]
- FRAME: (e.g., "Extreme Wide Shot (EWS)", "Medium Close-up (MCU)", "Over-the-shoulder")
- LENS: (e.g., "14mm ultra-wide", "50mm standard", "Macro 105mm")
- COMPOSITION: (e.g., "Rule of thirds", "Centered framing", "Negative space")
- ACTION: [Precise description from <current_scene>]
- CAMERA MOVE: (e.g., "Slow crane up", "Push-in dolly", "Handheld follow", "Static")`;

/**
 * 必须使用的关键词
 */
export const mandatoryKeywords: Atom<void> = () => `**MANDATORY KEYWORDS:**
- Quality: "Cinematic," "Hyper-realistic," "8K resolution," "High production value"
- Detail: "Intricate details," "Photorealistic textures," "Volumetric rendering"
- Atmosphere: "Atmospheric lighting," "Mood-driven," "Immersive"
- Technical: "Depth of field," "Motion blur," "Color graded," "Professional cinematography"
- Perspective: "First-person view," "Over-the-shoulder," "Immersive POV"`;

/**
 * 输出避免事项
 */
export const avoidList: Atom<void> = () => `**AVOID:**
❌ Third-person descriptions ("The character sees...") -> USE "You see..."
❌ Generic descriptions ("beautiful," "amazing," "epic" without specifics)
❌ Mentioning items NOT in <game_state><inventory>
❌ Including NPCs NOT in <game_state><npcs_present>
❌ Contradictory visual elements
❌ Missing technical details`;

export default shotBreakdownTemplate;
