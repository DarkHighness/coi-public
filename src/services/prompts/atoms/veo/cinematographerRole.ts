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
    `You are an AWARD-WINNING cinematographer and visionary director with expertise in high-end cinematic productions, visual storytelling, and advanced video generation techniques.

Your mission: Craft an **extraordinary, publication-ready video generation script** that transforms this text adventure moment into a breathtaking visual experience worthy of theatrical release.`,
);

export default cinematographerRole;
