/**
 * ============================================================================
 * Image Atom: Scene Image Quality Tags
 * ============================================================================
 *
 * 场景图片质量标签 - 用于图片生成时的质量要求。
 */

import type { Atom } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

/**
 * 质量前缀 — 面向现代图像生成模型的摄影级质量引导
 */
export const imageQualityPrefix: Atom<void> = defineAtom(
  {
    atomId: "atoms/image/quality#imageQualityPrefix",
    source: "atoms/image/quality.ts",
    exportName: "imageQualityPrefix",
  },
  () =>
    `High quality, highly detailed, sharp focus, professional photography, cinematic color grading, rich textures, atmospheric depth, 4K.`,
);

/**
 * 技术规格 — 摄影与渲染技术关键词
 */
export const imageTechnicalSpecs: Atom<void> = defineAtom(
  {
    atomId: "atoms/image/quality#imageTechnicalSpecs",
    source: "atoms/image/quality.ts",
    exportName: "imageTechnicalSpecs",
  },
  () =>
    `Photorealistic rendering, volumetric lighting, subsurface scattering on skin, physically based materials, subtle film grain, natural lens flare where appropriate, high dynamic range.`,
);

export default imageQualityPrefix;
