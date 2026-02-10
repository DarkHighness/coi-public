/**
 * ============================================================================
 * Image Atom: Weather Effects
 * ============================================================================
 *
 * 天气效果 - 根据天气类型提供视觉效果描述。
 */

import type { Atom } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";


export type WeatherEffectsInput = {
  weather?: string;
};

const weatherDetails: Record<string, string> = {
  rain: "Rain falling, wet surfaces with high reflectivity, water droplets on skin/clothing, puddles reflecting environment, misty atmosphere, cool color palette, dramatic contrast, screen space reflections",
  snow: "Snow falling, accumulation on surfaces, cold breath visible, frost and ice details with subsurface scattering, muted white and blue tones, soft diffused light, peaceful yet cold atmosphere",
  fog: "Dense volumetric fog obscuring background, limited visibility, mysterious atmosphere, soft focus on distant objects, diffused light, muted colors, ethereal quality, light shafts piercing through fog",
  embers:
    "Glowing embers floating in air, warm orange light sources, fire glow, ash particles, heat haze distortion, warm color temperature, magical or destructive atmosphere",
  flicker:
    "Unstable lighting, flickering shadows, dramatic light changes, supernatural or electrical atmosphere, high contrast, tension and unease, strobe effects",
  sunny:
    "Bright sunlight, clear sky, strong shadows, vibrant colors, warm atmosphere, lens flare, high visibility, cheerful or harsh depending on intensity, caustic reflections",
};

/**
 * 天气效果描述
 */
export const weatherEffects: Atom<WeatherEffectsInput> = defineAtom({ atomId: "atoms/image/weather#weatherEffects", source: "atoms/image/weather.ts", exportName: "weatherEffects" }, ({ weather }) => {
  if (!weather || weather === "none") return "";

  const details = weatherDetails[weather] || weather;

  return `<weather_effects>
  ${details}
</weather_effects>`;
});

export default weatherEffects;
