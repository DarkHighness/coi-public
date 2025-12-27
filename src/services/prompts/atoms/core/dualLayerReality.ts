/**
 * ============================================================================
 * Core Atom: Dual Layer Reality
 * ============================================================================
 *
 * 双层现实（Visible/Hidden）的核心概念说明。
 * 用于 StoryOutline 和 GM Knowledge。
 */

import type { Atom } from "../types";

/**
 * 双层现实说明 - 无参数
 */
export const dualLayerReality: Atom<void> = () => `
<dual_layer_reality>
Every entity in this world has TWO layers:
- **Visible**: What the player perceives (subjective, potentially flawed)
- **Hidden**: The objective truth (GM knowledge, secrets)

This creates depth, mystery, and opportunities for dramatic reveals.
</dual_layer_reality>
`;

export default dualLayerReality;
