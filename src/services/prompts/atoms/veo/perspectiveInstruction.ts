/**
 * ============================================================================
 * VEO Atom: Perspective Instruction
 * ============================================================================
 *
 * 视角指令 - 强调 VEO 脚本使用第二人称。
 */

import type { Atom } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

/**
 * 第二人称视角指令
 */
export const perspectiveInstruction: Atom<void> = defineAtom(
  {
    atomId: "atoms/veo/perspectiveInstruction#perspectiveInstruction",
    source: "atoms/veo/perspectiveInstruction.ts",
    exportName: "perspectiveInstruction",
  },
  () =>
    `Write the video prompt in SECOND PERSON ("You") for the viewer/protagonist. Describe what "You" see, do, and experience — the camera is the protagonist's eyes and presence. Ground descriptions in physical sensations and spatial relationships. Do NOT use "You" to address the AI itself. Do NOT narrate in third person ("The character sees...").`,
);

export default perspectiveInstruction;
