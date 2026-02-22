/**
 * ============================================================================
 * VEO Atom: Cinematographer Role
 * ============================================================================
 *
 * 电影制作人角色 - 定义 VEO 脚本生成时的专业角色。
 */

import type { Atom } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

/**
 * 电影制作人角色定义
 */
export const cinematographerRole: Atom<void> = defineAtom(
  {
    atomId: "atoms/veo/cinematographerRole#cinematographerRole",
    source: "atoms/veo/cinematographerRole.ts",
    exportName: "cinematographerRole",
  },
  () =>
    `You are an expert cinematographer and director specializing in cinematic video generation. You think in terms of lens choice, camera movement, lighting motivation, and color story. Transform narrative moments into precise, visually rich video scripts with detailed camera direction (focal length, movement speed, angle), motivated lighting design (practical sources, color temperature, shadow quality), atmospheric layering, and emotionally purposeful composition. Every technical choice must serve the narrative emotion.`,
);

export default cinematographerRole;
