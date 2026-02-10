/**
 * ============================================================================
 * Image Atom: Lighting Context
 * ============================================================================
 *
 * 光照上下文 - 根据游戏时间提供合适的光照描述。
 */

import type { Atom } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";


export type LightingContextInput = {
  time?: string;
};

/**
 * 根据时间生成光照描述
 */
export const lightingContext: Atom<LightingContextInput> = defineAtom({ atomId: "atoms/image/lighting#lightingContext", source: "atoms/image/lighting.ts", exportName: "lightingContext" }, ({ time }) => {
  if (!time) return "";

  const timeLower = time.toLowerCase();
  let lightingDetails = "";

  if (timeLower.match(/night|midnight|晚|夜/)) {
    lightingDetails = `Moonlight casting silver highlights, deep indigo and black shadows, stars visible in sky, artificial light sources (torches, lanterns, magical glows, neon signs) providing warm or colored accents, cold blue color temperature, high contrast between light and shadow, mysterious atmosphere, specular highlights on wet surfaces`;
  } else if (timeLower.match(/dawn|sunrise|晨|黎明/)) {
    lightingDetails = `Soft diffused morning light, golden hour warmth beginning to spread, pastel pink and orange sky, long gentle shadows, dew glistening on surfaces, cool-to-warm color transition, ethereal and peaceful atmosphere, rim lighting on characters, volumetric morning mist`;
  } else if (timeLower.match(/dusk|sunset|黄昏|傍晚/)) {
    lightingDetails = `Dramatic golden hour lighting, vibrant orange and purple sky, long dramatic shadows, warm backlight creating silhouettes, rich color saturation, lens flare potential, romantic or melancholic atmosphere, strong rim lighting, subsurface scattering on skin`;
  } else {
    lightingDetails = `Balanced natural daylight, clear visibility, soft ambient shadows, realistic color rendering, even illumination, bright and open atmosphere, sharp shadows, high dynamic range`;
  }

  return `<temporal_context>
  <time>${time}</time>
  <lighting>
    ${lightingDetails}
  </lighting>
</temporal_context>`;
});

export default lightingContext;
