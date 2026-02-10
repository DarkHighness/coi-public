/**
 * ============================================================================
 * Image Atom: Composition Directives
 * ============================================================================
 *
 * 场景构图指令 - 用于图片生成时的构图要求。
 */

import type { Atom } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";


/**
 * 构图指令
 */
export const compositionDirectives: Atom<void> = defineAtom({ atomId: "atoms/image/composition#compositionDirectives", source: "atoms/image/composition.ts", exportName: "compositionDirectives" }, () => `<composition_directives>
  <camera>
    <angle>Third-person cinematic angle, dynamic perspective, appropriate depth of field with bokeh on background</angle>
    <framing>Rule of thirds composition, balanced negative space, leading lines drawing eye to subject, frame within frame if applicable</framing>
    <focus>Sharp focus on main subject (protagonist), soft focus on background for depth, selective focus emphasizing emotion or action</focus>
  </camera>
  <visual_elements>
    <texture_details>
      High fidelity surface details: visible skin pores, fabric weave patterns, metal scratches and patina, wood grain, leather creases, realistic material properties (roughness, metallicity, specular)
    </texture_details>
    <lighting_and_reflections>
      Cinematic lighting setup, volumetric fog/lighting, screen space reflections, specular highlights on wet or shiny surfaces, caustics for water/glass, rim lighting to separate subjects from background, high dynamic range (HDR)
    </lighting_and_reflections>
    <color_grading>Cinematic color grading appropriate to mood and theme, color contrast for visual interest, color harmony, saturated where appropriate, desaturated for mood where needed</color_grading>
    <details>Environmental particles (dust, mist, magic, snow, rain), atmospheric effects, motion blur on moving elements, depth haze, realistic shadows with soft penumbra</details>
  </visual_elements>
</composition_directives>`);

/**
 * 渲染指令
 */
export const renderingInstructions: Atom<void> = defineAtom({ atomId: "atoms/image/composition#renderingInstructions", source: "atoms/image/composition.ts", exportName: "renderingInstructions" }, () => `<rendering_instructions>
  <character_rendering>
    Realistic human anatomy and proportions, detailed facial features with micro-expressions, skin with visible texture (pores, imperfections, subsurface scattering), realistic hair with individual strands visible, believable clothing physics and draping, armor/equipment with wear and weathering, sweat or moisture where contextually appropriate
  </character_rendering>
  <realism_level>
    Photorealistic rendering quality, physically based materials (PBR), accurate light behavior (ray tracing), realistic shadows and reflections, proper perspective and foreshortening, anatomically correct poses, believable weight and mass
  </realism_level>
  <artistic_direction>
    Capture emotional intensity through visual storytelling, emphasize tension or intimacy through composition and framing, use lighting to guide viewer attention, create atmosphere that supports narrative, don't shy away from depicting scene's true nature (beauty, violence, intimacy, horror as contextually appropriate), aesthetic appeal and visual impact prioritized
  </artistic_direction>
</rendering_instructions>`);

export default compositionDirectives;
