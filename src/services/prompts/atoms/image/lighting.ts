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
export const lightingContext: Atom<LightingContextInput> = defineAtom(
  {
    atomId: "atoms/image/lighting#lightingContext",
    source: "atoms/image/lighting.ts",
    exportName: "lightingContext",
  },
  ({ time }) => {
    if (!time) return "";

    const timeLower = time.toLowerCase();
    let lightingDetails = "";

    if (timeLower.match(/night|midnight|晚|夜/)) {
      lightingDetails = `Nighttime scene. Cool blue moonlight casting silver highlights and deep indigo shadows. Warm accent lighting from torches, lanterns, or magical glows providing orange-gold contrast. Stars visible in the sky. High contrast between light pools and shadow areas. Specular highlights on wet or metallic surfaces. Mysterious, atmospheric mood. Color temperature around 4500K moonlight mixed with 2700K warm practicals.`;
    } else if (timeLower.match(/dawn|sunrise|晨|黎明/)) {
      lightingDetails = `Dawn scene. Soft diffused morning light with golden hour warmth beginning to spread. Pastel pink and orange sky gradients. Long, gentle shadows stretching across the ground. Dew glistening on surfaces catching the first light. Cool-to-warm color transition across the scene. Volumetric morning mist with visible light rays. Ethereal, peaceful atmosphere. Subtle rim lighting on characters from the rising sun.`;
    } else if (timeLower.match(/dusk|sunset|黄昏|傍晚/)) {
      lightingDetails = `Dusk scene. Dramatic golden hour lighting with rich, warm tones. Vibrant orange and purple sky with long dramatic shadows. Strong backlight creating silhouettes and rim lighting on characters. Saturated warm color palette with deep purple shadows. Subsurface scattering visible on skin and translucent materials. Romantic or melancholic atmosphere. Sun low on the horizon creating lens flare potential.`;
    } else {
      lightingDetails = `Daytime scene. Balanced natural sunlight with clear visibility. Soft ambient fill light with defined directional shadows. Realistic color rendering with high dynamic range. Bright, open atmosphere with natural color temperature around 5600K.`;
    }

    return `Time: ${time}. ${lightingDetails}`;
  },
);

export default lightingContext;
