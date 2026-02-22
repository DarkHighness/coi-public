/**
 * ============================================================================
 * Image Atom: IP Fidelity Requirements
 * ============================================================================
 *
 * IP 忠实度要求 - 确保图片生成尊重已有 IP 的视觉风格。
 */

import type { Atom } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

/**
 * IP 忠实度要求
 */
export const ipFidelityRequirements: Atom<void> = defineAtom(
  {
    atomId: "atoms/image/ipFidelity#ipFidelityRequirements",
    source: "atoms/image/ipFidelity.ts",
    exportName: "ipFidelityRequirements",
  },
  () =>
    `If this story is based on an established IP (game, novel, film, anime, or other known work), you MUST adhere to the original visual identity: match the art style and color palette of the source material, include iconic visual motifs and signature design elements, maintain character appearances consistent with official designs, and ensure architecture and environments match the IP's established aesthetic. Draw from official artwork, film stills, or game screenshots as visual reference. If NOT based on a known IP, use creative freedom while maintaining thematic consistency.`,
);

export default ipFidelityRequirements;
