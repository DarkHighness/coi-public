/**
 * ============================================================================
 * Turn Atom: World Foundation
 * ============================================================================
 *
 * 世界基础上下文 - 用于 Turn 生成时的世界设定注入。
 */

import type { Atom } from "../types";

export type WorldFoundationInput = {
  title: string;
  premise: string;
  mainGoal: {
    visible?: string;
    hidden?: string;
  };
  worldSetting: {
    visible?: string;
    hidden?: string;
    history?: string;
  };
};

/**
 * 世界基础上下文
 */
export const worldFoundation: Atom<WorldFoundationInput> = ({
  title,
  premise,
  mainGoal,
  worldSetting,
}) => {
  const lines: string[] = [
    `<title>${title}</title>`,
    `<premise>${premise}</premise>`,
  ];

  // Main goal
  const goalParts: string[] = [];
  if (mainGoal.visible) goalParts.push(`visible: ${mainGoal.visible}`);
  if (mainGoal.hidden) goalParts.push(`hidden: ${mainGoal.hidden}`);
  if (goalParts.length) {
    lines.push(`<main_goal>\n${goalParts.join("\n")}\n</main_goal>`);
  }

  // World setting
  const settingParts: string[] = [];
  if (worldSetting.visible) settingParts.push(`visible: ${worldSetting.visible}`);
  if (worldSetting.hidden) settingParts.push(`hidden: ${worldSetting.hidden}`);
  if (worldSetting.history) settingParts.push(`history: ${worldSetting.history}`);
  if (settingParts.length) {
    lines.push(`<world_setting>\n${settingParts.join("\n")}\n</world_setting>`);
  }

  return `<world_foundation>
${lines.join("\n")}
</world_foundation>`;
};

export default worldFoundation;
