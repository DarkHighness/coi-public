/**
 * ============================================================================
 * Entity Rendering Atom: World Foundation
 * ============================================================================
 *
 * Renders the foundational world context (Outline, Settings, Main Goal).
 */

import type { Atom, GameState } from "../types";
import { toToon } from "../../toon";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";


export type RenderWorldFoundationInput = {
  outline?: GameState["outline"];
  godMode?: boolean;
};

/**
 * Render basic world foundation
 */
export const renderWorldFoundation: Atom<RenderWorldFoundationInput> = defineAtom({ atomId: "atoms/renderers/worldFoundation#renderWorldFoundation", source: "atoms/renderers/worldFoundation.ts", exportName: "renderWorldFoundation" }, ({
  outline,
}) => {
  if (!outline) return "";

  return `<world_foundation>
<title>${outline.title}</title>
<premise>${outline.premise}</premise>
<main_goal>${toToon(outline.mainGoal)}</main_goal>
<world_setting>${toToon(outline.worldSetting)}</world_setting>
</world_foundation>`;
});

/**
 * Render God Mode context
 */
export const renderGodMode: Atom<RenderWorldFoundationInput> = defineAtom({ atomId: "atoms/renderers/worldFoundation#renderGodMode", source: "atoms/renderers/worldFoundation.ts", exportName: "renderGodMode" }, ({
  godMode,
}) => {
  if (!godMode) return "";

  return `<god_mode>
GOD MODE ACTIVE: Player has absolute power. All actions succeed. NPCs obey unconditionally.
</god_mode>`;
});
