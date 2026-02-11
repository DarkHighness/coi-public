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
 * Get image-style specific rules formatted for image prompts
 */
export function formatImageStyleRules(rules: CustomRule[] | undefined): string {
  const imageRules = getRulesForCategory(rules, "imageStyle");
  if (imageRules.length === 0) return "";

  const content = imageRules.map((r) => r.content).join("\n");
  return `\n**Style Requirements:**\n${content}\n`;
}
