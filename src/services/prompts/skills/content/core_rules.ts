/**
 * ============================================================================
 * Skill Content: Core Rules (World Consistency)
 * ============================================================================
 *
 * MIGRATED TO ATOMS
 * Reference: src/services/prompts/atoms/core/index.ts
 */

import type { SkillContext } from "../types";
import {
  worldConsistency,
  consequences,
  maliceAndAntagonism,
  humanityAndHope,
  livingWorld,
  informationRevelation,
  ontologicalPriorityAtom,
} from "../../atoms/core";

export function getWorldConsistencyContent(_ctx: SkillContext): string {
  return worldConsistency();
}

export function getConsequencesContent(_ctx: SkillContext): string {
  return consequences();
}

export function getMaliceAndAntagonismContent(_ctx: SkillContext): string {
  return maliceAndAntagonism();
}

export function getHumanityAndHopeContent(_ctx: SkillContext): string {
  return humanityAndHope();
}

export function getLivingWorldContent(_ctx: SkillContext): string {
  return livingWorld();
}

export function getInformationRevelationContent(_ctx: SkillContext): string {
  return informationRevelation();
}

/**
 * 组合所有核心规则（完整版）
 */
export function getCoreRulesContent(ctx: SkillContext): string {
  if (ctx.isLiteMode) {
    return getCoreRulesLiteContent(ctx);
  }

  return `
<core_rules>
${ontologicalPriorityAtom()}

${getWorldConsistencyContent(ctx)}
${getConsequencesContent(ctx)}
${getMaliceAndAntagonismContent(ctx)}
${getHumanityAndHopeContent(ctx)}
${getLivingWorldContent(ctx)}
${getInformationRevelationContent(ctx)}
</core_rules>
`;
}

/**
 * 精简版核心规则
 */
export function getCoreRulesLiteContent(ctx: SkillContext): string {
  return `
<core_rules>
  <rule>WORLD CONSISTENCY: Adhere strictly to genre (realistic/fantasy/sci-fi). No crossover elements.</rule>
  <rule>CONSEQUENCES: Every action has reactions. The world never forgets.</rule>
  <rule>NPC: Use \`hidden\` for true motives, \`visible\` for public face. Track affinity/status changes.</rule>
  <rule>STATE: Output ONLY deltas. Update state IMMEDIATELY when events occur.</rule>
  <rule>HIDDEN: GM sees all \`hidden\` fields. \`unlocked\` = player knows. Reveal only through investigation.</rule>
  ${
    ctx.disableImagePrompt
      ? ""
      : "<rule>VISUALS: Provide `imagePrompt` for key moments. Include protagonist, NPCs, lighting.</rule>"
  }
  <rule>ICONS: Generate emoji \`icon\` for every entity.</rule>
</core_rules>
`;
}
