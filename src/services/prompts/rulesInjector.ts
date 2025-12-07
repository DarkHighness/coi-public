/**
 * Rules Injector Utility
 * Formats custom rules for injection into AI prompts
 */

import { CustomRule, RuleCategory } from "../../types";

/**
 * Get enabled rules for a specific category, sorted by priority
 */
export function getRulesForCategory(
  rules: CustomRule[] | undefined,
  category: RuleCategory,
): CustomRule[] {
  if (!rules) return [];
  return rules
    .filter((r) => r.category === category && r.enabled)
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Get enabled rules for multiple categories
 */
export function getRulesForCategories(
  rules: CustomRule[] | undefined,
  categories: RuleCategory[],
): CustomRule[] {
  if (!rules) return [];
  return rules
    .filter((r) => categories.includes(r.category) && r.enabled)
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Format rules into a prompt block for a specific category
 */
export function formatRulesBlock(
  rules: CustomRule[] | undefined,
  category: RuleCategory,
  language?: string,
): string {
  const categoryRules = getRulesForCategory(rules, category);
  if (categoryRules.length === 0) return "";

  const content = categoryRules
    .map((r) => `- ${r.title}: ${r.content}`)
    .join("\n");

  return `
<custom_rules category="${category}">
${content}
</custom_rules>
`;
}

/**
 * Format ALL enabled rules into prompt blocks, grouped by category
 */
export function formatAllRulesBlocks(
  rules: CustomRule[] | undefined,
  language?: string,
): string {
  if (!rules || rules.length === 0) return "";

  const enabledRules = rules.filter((r) => r.enabled);
  if (enabledRules.length === 0) return "";

  // Group by category
  const byCategory: Record<RuleCategory, CustomRule[]> = {} as Record<
    RuleCategory,
    CustomRule[]
  >;

  for (const rule of enabledRules) {
    if (!byCategory[rule.category]) {
      byCategory[rule.category] = [];
    }
    byCategory[rule.category].push(rule);
  }

  // Build blocks
  const blocks: string[] = [];
  for (const [category, categoryRules] of Object.entries(byCategory)) {
    const sorted = categoryRules.sort((a, b) => a.priority - b.priority);
    const content = sorted.map((r) => `- ${r.title}: ${r.content}`).join("\n");
    blocks.push(
      `<custom_rules category="${category}">\n${content}\n</custom_rules>`,
    );
  }

  if (blocks.length === 0) return "";

  return `
<user_custom_rules>
**CRITICAL: The user has defined custom rules that MUST be followed.**
${blocks.join("\n\n")}
</user_custom_rules>
`;
}

/**
 * Get image-style specific rules formatted for image prompts
 */
export function formatImageStyleRules(rules: CustomRule[] | undefined): string {
  const imageRules = getRulesForCategory(rules, "imageStyle");
  if (imageRules.length === 0) return "";

  const content = imageRules.map((r) => r.content).join("\n");
  return `\n**Style Requirements:**\n${content}\n`;
}

/**
 * Category mapping to injection points in the prompt
 */
export const CATEGORY_INJECTION_POINTS: Record<RuleCategory, string> = {
  systemCore: "role instruction",
  worldSetting: "theme context",
  protagonist: "identity enforcement",
  npcBehavior: "NPC logic section",
  combatAction: "combat rules",
  writingStyle: "writing craft",
  dialogue: "dialogue section",
  mystery: "mystery section",
  stateManagement: "state management rules",
  hiddenTruth: "hidden truth rules",
  imageStyle: "image prompt",
  cultural: "cultural adaptation",
  custom: "end of system prompt",
};
