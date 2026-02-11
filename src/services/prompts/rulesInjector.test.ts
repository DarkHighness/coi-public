import { describe, expect, it } from "vitest";
import {
  formatImageStyleRules,
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

  it("formats image style requirements section", () => {
    const result = formatImageStyleRules(rules as any);
    expect(result).toContain("**Style Requirements:**");
    expect(result).toContain("rule-b");
    expect(result).toContain("rule-a");
  });

  it("returns empty style output when no enabled image rules", () => {
    const result = formatImageStyleRules([
      {
        id: "3",
        title: "C",
        content: "rule-c",
        category: "dialogue",
        priority: 1,
        enabled: true,
      },
    ] as any);
    expect(result).toBe("");
  });
});
