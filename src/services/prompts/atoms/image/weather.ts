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
  rain: "Heavy rain falling in visible sheets, wet surfaces with high reflectivity and mirror-like puddles reflecting the environment, water droplets beading on skin and clothing, misty atmosphere with reduced visibility in the distance, cool desaturated color palette with dramatic contrast, caustic light patterns on wet ground",
  snow: "Snow falling in soft flurries, accumulation on surfaces and shoulders, visible cold breath from characters, frost and ice crystals with subsurface scattering catching the light, muted white and blue color tones, soft diffused lighting with no harsh shadows, peaceful yet cold atmosphere",
  fog: "Dense volumetric fog obscuring the background and creating depth layers, limited visibility beyond midground, mysterious atmosphere with soft diffused light, muted desaturated colors, ethereal quality with visible light shafts piercing through the fog, foreground elements sharp while distant objects fade to silhouettes",
  embers:
    "Glowing embers and sparks floating through the air, warm orange-red point light sources, fire glow illuminating nearby surfaces, ash particles drifting, heat haze distortion in the air, warm color temperature dominating the scene, magical or destructive atmosphere",
  flicker:
    "Unstable flickering light sources creating shifting shadows, dramatic moment-to-moment light variation, high contrast between lit and unlit areas, supernatural or electrical atmosphere suggesting tension and unease, sharp shadow edges that seem alive",
  sunny:
    "Bright direct sunlight with clear blue sky, strong well-defined shadows with crisp edges, vibrant saturated colors, warm cheerful atmosphere, potential for lens flare from the sun, caustic reflections on glass and water surfaces, high visibility with excellent color rendering",
};

/**
 * 天气效果描述
 */
export const weatherEffects: Atom<WeatherEffectsInput> = defineAtom(
  {
    atomId: "atoms/image/weather#weatherEffects",
    source: "atoms/image/weather.ts",
    exportName: "weatherEffects",
  },
  ({ weather }) => {
    if (!weather || weather === "none") return "";

    const details = weatherDetails[weather] || weather;

    return `Weather: ${details}`;
  },
);

export default weatherEffects;
