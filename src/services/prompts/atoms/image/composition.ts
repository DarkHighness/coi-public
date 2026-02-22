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
 * 构图指令 — 电影级摄影构图与镜头引导
 */
export const compositionDirectives: Atom<void> = defineAtom(
  {
    atomId: "atoms/image/composition#compositionDirectives",
    source: "atoms/image/composition.ts",
    exportName: "compositionDirectives",
  },
  () =>
    `Cinematic third-person camera angle with dynamic perspective. Rule of thirds framing, leading lines drawing the eye to the main subject. Appropriate depth of field with soft bokeh background separating subject from environment. Foreground, midground, and background layers creating atmospheric depth. Rim lighting to separate characters from the background. Environmental storytelling through props, textures, and setting details.`,
);

/**
 * 渲染指令 — 角色与场景渲染质量要求
 */
export const renderingInstructions: Atom<void> = defineAtom(
  {
    atomId: "atoms/image/composition#renderingInstructions",
    source: "atoms/image/composition.ts",
    exportName: "renderingInstructions",
  },
  () =>
    `Realistic human anatomy with natural proportions. Detailed facial features showing micro-expressions and emotion through body language and posture. Skin with visible texture and subsurface scattering. Hair with fine individual strands. Clothing and equipment showing authentic wear, weathering, and fabric physics. Surface material variety — stone grain, metal patina, wood texture, leather creases. Environmental particles where appropriate: dust motes, mist, magical effects, rain droplets. Cinematic color grading matching the scene mood.`,
);

export default compositionDirectives;
