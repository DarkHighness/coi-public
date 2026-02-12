import { describe, it, expect } from "vitest";
import { buildCoreSystemInstructionWithSkills } from "../builder";
import {
  getAllSkillCatalogEntries,
  getAllSkillIndexEntries,
} from "../../../vfs/globalSkills/index";

describe("skills prompt builder hygiene", () => {
  it("does not include compaction protocol in turn system prompt", () => {
    const prompt = buildCoreSystemInstructionWithSkills({ language: "en" });
    expect(prompt).not.toContain("[SYSTEM: COMPACT_NOW]");
    expect(prompt).not.toContain("vfs_commit_summary");
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

  it("renders skills catalog from skill metadata definitions to avoid drift", () => {
    const prompt = buildCoreSystemInstructionWithSkills({ language: "en" });
    const entries = getAllSkillCatalogEntries();

    for (const entry of entries) {
      const relativePath = entry.path
        .replace(/^current\/skills\//, "")
        .replace(/\/SKILL\.md$/, "");
      expect(prompt).toContain(`id="${entry.id}"`);
      expect(prompt).toContain(`path="${relativePath}"`);
    }
  });

  it("keeps index entries aligned with catalog metadata source", () => {
    const indexEntries = getAllSkillIndexEntries();
    const catalogIds = new Set(getAllSkillCatalogEntries().map((entry) => entry.id));

    expect(indexEntries.length).toBeGreaterThan(0);
    for (const entry of indexEntries) {
      expect(catalogIds.has(entry.id)).toBe(true);
      expect(entry.path).toMatch(/^current\/skills\/.+\/SKILL\.md$/);
    }
  });

  it("includes priority metadata and explicit load protocol in catalog", () => {
    const prompt = buildCoreSystemInstructionWithSkills({ language: "en" });

    expect(prompt).toContain("Priority protocol: within each domain");
    expect(prompt).toContain(`priority="high"`);
    expect(prompt).toContain(`priority="medium"`);
    expect(prompt).toContain("Trigger signal:");
    expect(prompt).toContain("Execution requirement:");
  });
});
