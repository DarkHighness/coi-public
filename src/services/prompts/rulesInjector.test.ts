import { describe, expect, it } from "vitest";
import {
  CATEGORY_INJECTION_POINTS,
  formatAllRulesBlocks,
  formatImageStyleRules,
  formatRulesBlock,
  getRulesForCategories,
  getRulesForCategory,
} from "./rulesInjector";

const rules = [
  {
    id: "1",
    title: "A",
    content: "rule-a",
    category: "imageStyle",
    priority: 2,
    enabled: true,
  },
  {
    id: "2",
    title: "B",
    content: "rule-b",
    category: "imageStyle",
    priority: 1,
    enabled: true,
  },
  {
    id: "3",
    title: "C",
    content: "rule-c",
    category: "dialogue",
    priority: 1,
    enabled: false,
  },
] as any;

describe("rulesInjector", () => {
  it("returns enabled category rules sorted by priority", () => {
    const result = getRulesForCategory(rules, "imageStyle" as any);
    expect(result.map((r: any) => r.title)).toEqual(["B", "A"]);
  });

  it("returns enabled rules across categories", () => {
    const result = getRulesForCategories(rules, ["imageStyle", "dialogue"] as any);
    expect(result).toHaveLength(2);
    expect(result.every((r: any) => r.enabled)).toBe(true);
  });

  it("formats category block with bullets", () => {
    const result = formatRulesBlock(rules as any, "imageStyle" as any);
    expect(result).toContain('<custom_rules category="imageStyle">');
    expect(result).toContain("- B: rule-b");
    expect(result).toContain("- A: rule-a");
  });

  it("formats grouped user custom rules", () => {
    const result = formatAllRulesBlocks(rules as any);
    expect(result).toContain("<user_custom_rules>");
    expect(result).toContain("CRITICAL");
    expect(result).toContain('<custom_rules category="imageStyle">');
  });

  it("formats image style requirements section", () => {
    const result = formatImageStyleRules(rules as any);
    expect(result).toContain("**Style Requirements:**");
    expect(result).toContain("rule-b");
    expect(result).toContain("rule-a");
  });

  it("exposes stable injection point mappings", () => {
    expect(CATEGORY_INJECTION_POINTS.imageStyle).toBe("image prompt");
    expect(CATEGORY_INJECTION_POINTS.dialogue).toBe("dialogue section");
  });
});
