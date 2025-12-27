/**
 * ============================================================================
 * Core Atom: Depth Enforcement
 * ============================================================================
 *
 * 深度强制规则，确保内容不浮于表面。
 */

import type { Atom } from "../types";

/**
 * 深度强制规则 - 无参数
 */
export const depthEnforcement: Atom<void> = () => `
<depth_enforcement>
  <instruction>**AVOID SURFACE-LEVEL SUMMARIES**</instruction>
  <instruction>Every entity must have a "Soul" - a reason for existing.</instruction>
  <instruction>Ensure that every description implies a history. Nothing just "is". Everything "became".</instruction>
</depth_enforcement>
`;

export default depthEnforcement;
