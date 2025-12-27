/**
 * ============================================================================
 * Image Atom: Scene Image Quality Tags
 * ============================================================================
 *
 * 场景图片质量标签 - 用于图片生成时的质量要求。
 */

import type { Atom } from "../types";

/**
 * 质量前缀标签
 */
export const imageQualityPrefix: Atom<void> = () =>
  `(Masterpiece, Best Quality, 8K Resolution, Ultra-Detailed, Cinematic Lighting, Ray Tracing, Global Illumination, Unreal Engine 5 Render, Photorealistic, Professional Photography, High Fidelity, Hyperrealistic Textures)`;

/**
 * 技术规格
 */
export const imageTechnicalSpecs: Atom<void> = () => `<technical_specs>
  masterpiece, best quality, 8k uhd, ultra detailed, highly detailed, professional photography, award winning composition, sharp focus, crystal clear, photorealistic, ray tracing, path tracing, lumen reflections, global illumination, subsurface scattering, ambient occlusion, physically based rendering, depth of field, bokeh, cinematic color grading, film grain (subtle), lens flare (if appropriate), chromatic aberration (minimal), vignette (subtle), ISO 100, f/1.8, high shutter speed
</technical_specs>`;

export default imageQualityPrefix;
