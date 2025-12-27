/**
 * ============================================================================
 * Turn Atom: God Mode Context
 * ============================================================================
 *
 * 上帝模式上下文 - 当上帝模式启用时注入。
 */

import type { Atom } from "../types";

export type GodModeContextInput = {
  enabled: boolean;
};

/**
 * 上帝模式上下文
 */
export const godModeContext: Atom<GodModeContextInput> = ({ enabled }) => {
  if (!enabled) return "";

  return `<god_mode>
GOD MODE ACTIVE: Player has absolute power. All actions succeed. NPCs obey unconditionally.
</god_mode>`;
};

export default godModeContext;
