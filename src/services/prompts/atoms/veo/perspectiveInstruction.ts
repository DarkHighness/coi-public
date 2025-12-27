/**
 * ============================================================================
 * VEO Atom: Perspective Instruction
 * ============================================================================
 *
 * 视角指令 - 强调 VEO 脚本使用第二人称。
 */

import type { Atom } from "../types";

/**
 * 第二人称视角指令
 */
export const perspectiveInstruction: Atom<void> = () =>
  `**CRITICAL PERSPECTIVE INSTRUCTION:**
The AI must write the video prompt in **SECOND PERSON ("You")** for the viewer/protagonist.
In the output script, describe what "You" (the protagonist) see, do, and how the world reacts to "You" (the protagonist).
Do NOT use "You" to address the AI itself in the script output.`;

export default perspectiveInstruction;
