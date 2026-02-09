import { describe, it, expect } from "vitest";
import { buildCoreSystemInstructionWithSkills } from "../builder";

describe("skills prompt builder hygiene", () => {
  it("does not include compaction protocol in turn system prompt", () => {
    const prompt = buildCoreSystemInstructionWithSkills({ language: "en" });
    expect(prompt).not.toContain("[SYSTEM: COMPACT_NOW]");
    expect(prompt).not.toContain("vfs_finish_summary");
    expect(prompt).toContain("current/custom_rules/NN-*/RULES.md");
    expect(prompt).toContain("shared/system/skills");
  });

  it("includes optional theme skill self-selection protocol", () => {
    const prompt = buildCoreSystemInstructionWithSkills({
      language: "en",
      themeKey: "long_aotian",
    });

    expect(prompt).toContain("<theme_key>long_aotian</theme_key>");
    expect(prompt).toContain("<theme_skill_selection_protocol>");
    expect(prompt).toContain("read current/skills/index.json first");
    expect(prompt).toContain("selectively read 0-2 files under current/skills/theme/**/SKILL.md");
    expect(prompt).toContain("Theme skills are optional accelerators, not hard gates");
    expect(prompt).toContain("theme-face-slapping-reversal");
    expect(prompt).toContain("theme-ip-faithful-adaptation");
  });
});
