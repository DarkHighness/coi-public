/**
 * ============================================================================
 * VEO Atom: Visual Language & Cinematography
 * ============================================================================
 *
 * 视觉语言和电影摄影技术 - VEO 脚本中关于视觉和色彩的指导。
 */

import type { Atom } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

/**
 * 视觉语言模板
 */
export const visualLanguageTemplate: Atom<void> = defineAtom(
  {
    atomId: "atoms/veo/visualLanguage#visualLanguageTemplate",
    source: "atoms/veo/visualLanguage.ts",
    exportName: "visualLanguageTemplate",
  },
  () => `Lighting Design:
- Primary light source, direction, and intensity (e.g., "harsh overhead sun casting deep shadows" or "soft diffused overcast light")
- Color temperature specified (warm 3000K candlelight, neutral 5600K daylight, cool 7000K moonlight)
- Shadow quality matching mood (hard-edged for tension, soft gradients for calm, dappled for mystery)
- Motivated practical light sources from inventory or environment (lanterns, magic, fire, screens)
- Rim light or backlight separation from background

Color & Atmosphere:
- Primary and secondary color palette with specific hues
- Saturation level (desaturated for bleakness, vibrant for wonder, selective color for focus)
- Contrast ratio (high for drama, low for dreaminess)
- Atmospheric depth effects: volumetric fog, dust motes, rain, particles, heat haze
- Foreground/midground/background depth layers with atmospheric perspective`,
);

/**
 * 角色视觉描述模板
 */
export const characterVisualProfile: Atom<void> = defineAtom(
  {
    atomId: "atoms/veo/visualLanguage#characterVisualProfile",
    source: "atoms/veo/visualLanguage.ts",
    exportName: "characterVisualProfile",
  },
  () => `Describe the protagonist from <game_state><protagonist> with cinematic precision:
- Physical state reflecting <status>: posture changes, visible injuries, fatigue in movement
- Facial micro-expressions and eye direction conveying inner emotion
- Body language and gesture that reveals character without dialogue
- Costume and material details from <appearance>: fabric texture, armor wear, color and pattern
- Visible equipment from <inventory> placed naturally on the body
- Spatial relationship to environment: scale, position, facing direction
- How light falls on the character: highlight on features, shadow on form`,
);

/**
 * 输出结构模板
 */
export const veoOutputStructure: Atom<void> = defineAtom(
  {
    atomId: "atoms/veo/visualLanguage#veoOutputStructure",
    source: "atoms/veo/visualLanguage.ts",
    exportName: "veoOutputStructure",
  },
  () => `Output structure:

1. NARRATIVE ESSENCE (2-3 sentences)
   The emotional core of this moment. What dramatic stakes are at play? How does this scene connect visually and emotionally to recent events? What should the viewer FEEL?

2. VISUAL LANGUAGE
   Complete lighting design, color palette with specific hues, atmospheric effects, depth layering, and how these visual choices reinforce the narrative emotion.

3. CHARACTER PROFILE
   Protagonist's physical appearance, current state, equipment, expression, and body language in this specific moment. How their visual presentation reflects their journey.

4. SHOT BREAKDOWN (2-5 shots)
   Each shot with frame size, lens focal length, specific action, camera movement with speed/direction, lighting for that shot, and atmospheric effects. Shots should flow with cinematic logic.

5. VEO VIDEO PROMPT
   Dense, vivid second-person description following this formula:
   [You + action/sensation] + [Environment with specific details] + [Lighting with color and direction] + [Atmospheric effects] + [Camera technique with movement] + [Mood and style keywords]
   Every noun should have a descriptive modifier. Every action should have physical grounding.`,
);

/**
 * VEO 提示要求
 */
export const veoPromptRequirements: Atom<void> = defineAtom(
  {
    atomId: "atoms/veo/visualLanguage#veoPromptRequirements",
    source: "atoms/veo/visualLanguage.ts",
    exportName: "veoPromptRequirements",
  },
  () => `Requirements for the VEO prompt:
- STRICTLY second person ("You") — the viewer IS the protagonist
- Mention visible inventory items naturally integrated into action (not listed)
- Ground all action in <game_state><current_scene> — do not invent situations
- Dense, specific visual description — every noun needs a descriptive adjective, every verb needs physical context
- Use professional cinematography terminology (focal length, camera movement, shot size)
- Include multi-sensory richness: implied sound through visual cues, temperature through light color, texture through surface detail
- All visual elements must harmonize with <game_state><theme> and current atmosphere
- Describe spatial relationships precisely: distance, scale, depth, direction`,
);

/**
 * VEO 最终指令
 */
export const veoFinalDirective: Atom<void> = defineAtom(
  {
    atomId: "atoms/veo/visualLanguage#veoFinalDirective",
    source: "atoms/veo/visualLanguage.ts",
    exportName: "veoFinalDirective",
  },
  () =>
    `Create a polished cinematic script worthy of professional production. Every visual detail must serve the narrative — no decorative elements without purpose. Each frame should feel like a deliberate directorial choice. The final VEO prompt should be a vivid, continuous paragraph that a video generation model can render into a cohesive, atmospheric, emotionally resonant scene.`,
);

export { visualLanguageTemplate as default };
