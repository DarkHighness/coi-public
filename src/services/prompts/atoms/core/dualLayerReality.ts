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
- **Visible**: what the protagonist can reasonably know *right now* (evidence-based, incomplete, sometimes wrong)
- **Hidden**: what is actually true (mechanism, motives, origin, the part that explains consequences)

Write them as if you’re running an investigation:
- Visible should come from what can be seen/heard/touched/read/confirmed by witnesses.
- Hidden should explain *how* and *why* (who benefits, what’s the method, what happens next if untouched).

Examples:
- NPC.visible: “Calls himself a clerk; ink-stained fingers; avoids naming his employer.” / NPC.hidden: “Tax broker’s runner; paid to bait debtors into signing.”
- Location.visible: “Back room smells of oil and old paper.” / Location.hidden: “Counting house; ledger under floorboard #3.”

Do not reveal hidden names or truths in narrative until unlocked by proof.
</dual_layer_reality>
`;

export default dualLayerReality;
