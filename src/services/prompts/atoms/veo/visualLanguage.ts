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
export const visualLanguageTemplate: Atom<
  void
> = defineAtom({ atomId: "atoms/veo/visualLanguage#visualLanguageTemplate", source: "atoms/veo/visualLanguage.ts", exportName: "visualLanguageTemplate" }, () => `**VISUAL LANGUAGE & CINEMATOGRAPHY**

Lighting Design:
- PRIMARY LIGHT: (e.g., "Harsh side-lighting creating deep shadows")
- COLOR TEMPERATURE: (e.g., "Warm 3200K tungsten")
- LIGHT QUALITY: (e.g., "Hard shadows for tension")
- MOTIVATED SOURCES: Reference items from <game_state><inventory> (e.g., "Firelight flicker," "Glowing artifact")

Color Grading & Palette:
- PRIMARY COLORS: (e.g., "Teal shadows / Orange highlights")
- SATURATION LEVEL: (e.g., "Hyper-saturated fantasy")
- CONTRAST: (e.g., "High contrast noir")

Atmospheric Elements:
- MOOD: (e.g., "Oppressive dread")
- WEATHER/EFFECTS: (e.g., "Heavy rain distortion")
- DEPTH CUES: (e.g., "Layered fog planes")

Film Language:
- FORMAT: (e.g., "Anamorphic 2.39:1")
- TEXTURE: (e.g., "35mm film grain")
- MOTION QUALITY: (e.g., "180° shutter motion blur")`);

/**
 * 角色视觉描述模板
 */
export const characterVisualProfile: Atom<
  void
> = defineAtom({ atomId: "atoms/veo/visualLanguage#characterVisualProfile", source: "atoms/veo/visualLanguage.ts", exportName: "characterVisualProfile" }, () => `**CHARACTER VISUAL PROFILE**

Describe the PROTAGONIST from <game_state><protagonist> in THIS SPECIFIC FRAME:
- Physical State: <status> content (reflect in posture/movement)
- Expression & Body Language: Micro-expressions, posture
- Costume Details: <appearance> content
- Visible Equipment: Items from <inventory> that should be visible
- Spatial Position: Relationship to environment`);

/**
 * 输出结构模板
 */
export const veoOutputStructure: Atom<
  void
> = defineAtom({ atomId: "atoms/veo/visualLanguage#veoOutputStructure", source: "atoms/veo/visualLanguage.ts", exportName: "veoOutputStructure" }, () => `**REQUIRED OUTPUT STRUCTURE:**

**1. NARRATIVE ESSENCE & CONTINUITY**
Distill the EMOTIONAL CORE and DRAMATIC STAKES of this moment from <game_state><current_scene>.
Explicitly state how this scene connects visually to <recent_narrative_flow>.
(2-3 sentences)

**2. VISUAL LANGUAGE & CINEMATOGRAPHY**
(Use visual language template above)

**3. CHARACTER VISUAL PROFILE**
(Use character visual profile template above)

**4. PROFESSIONAL SHOT BREAKDOWN**
(Use shot breakdown template)

**5. MASTER VEO VIDEO GENERATION PROMPT**
**CRITICAL FORMULA:**
[SECOND PERSON PERSPECTIVE] + [PRECISE SUBJECT/ACTION] + [RICH ENVIRONMENT] + [LIGHTING/ATMOSPHERE] + [CAMERA TECHNIQUE] + [STYLE MODIFIERS]`);

/**
 * VEO 提示要求
 */
export const veoPromptRequirements: Atom<void> = defineAtom({ atomId: "atoms/veo/visualLanguage#veoPromptRequirements", source: "atoms/veo/visualLanguage.ts", exportName: "veoPromptRequirements" }, () => `**PROMPT REQUIREMENTS:**
- PERSPECTIVE: STRICTLY use SECOND PERSON ("You"). Focus on what protagonist SEES and DOES.
- EQUIPMENT VISIBILITY: Mention visible items from <game_state><inventory> (e.g., "glowing sword in your hand," "potion vials on your belt")
- SCENE FIDELITY: Base action on <game_state><current_scene> content
- LENGTH: DETAILED and DENSE visual description
- SPECIFICITY: Every noun needs adjective, every action needs context
- TECHNICAL PRECISION: Use industry-standard cinematography terms
- SENSORY RICHNESS: Describe not just what's seen, but how it FEELS
- COHERENCE: Ensure all elements harmonize with <game_state><theme> AND <game_state>`);

/**
 * VEO 最终指令
 */
export const veoFinalDirective: Atom<void> = defineAtom({ atomId: "atoms/veo/visualLanguage#veoFinalDirective", source: "atoms/veo/visualLanguage.ts", exportName: "veoFinalDirective" }, () => `**FINAL DIRECTIVE:**
Channel the visual mastery of Blade Runner 2049, the intimate character work of The Revenant, and the epic scope of Lawrence of Arabia. This is NOT a draft—this is your FINAL CUT, ready for Cannes.

Make it UNFORGETTABLE.`);

export { visualLanguageTemplate as default };
