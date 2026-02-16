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
    expect(prompt).toContain('vfs_read({ path: "current/skills/index.json" })');
    expect(prompt).toContain(
      'vfs_read({ path: "current/skills/theme/<genre>/SKILL.md" })',
    );
    expect(prompt).toContain(
      "Theme skills are optional accelerators, not hard gates",
    );
    expect(prompt).toContain("Theme skills live under `current/skills/theme/**`");
  });

  it("includes culture skill protocol and resolved circle path", () => {
    const prompt = buildCoreSystemInstructionWithSkills({
      language: "en",
      culturePreference: "japanese",
      culturePreferenceSource: "explicit",
      cultureEffectiveCircle: "japanese",
      cultureSkillPath: "skills/presets/runtime/culture-japanese/SKILL.md",
      cultureHubSkillPath: "skills/presets/runtime/culture/SKILL.md",
      cultureNamingPolicy: "transliterate_to_output_language_single_script",
    });

    expect(prompt).toContain("<culture_skill_protocol>");
    expect(prompt).toContain("Do NOT bind cultural circle by output language alone");
    expect(prompt).toContain("Runtime preference: `japanese`");
    expect(prompt).toContain("source: `explicit`");
    expect(prompt).toContain("effective circle: `japanese`");
    expect(prompt).toContain(
      'vfs_read({ path: "current/skills/presets/runtime/culture/SKILL.md" })',
    );
    expect(prompt).toContain(
      'vfs_read({ path: "current/skills/presets/runtime/culture-japanese/SKILL.md" })',
    );
    expect(prompt).toContain("single-script output, transliterated to output language");
  });

  it("does not hard-bind cultural circle from output language", () => {
    const prompt = buildCoreSystemInstructionWithSkills({ language: "zh" });

    expect(prompt).toContain("<culture_skill_protocol>");
    expect(prompt).toContain("Do NOT bind cultural circle by output language alone");
    expect(prompt).not.toContain("Chinese-style backgrounds");
    expect(prompt).not.toContain("ALL characters MUST have authentic Chinese names");
  });

  it("renders a compact hierarchical skills navigation map", () => {
    const prompt = buildCoreSystemInstructionWithSkills({ language: "en" });
    expect(prompt).toContain("<skills_catalog>");
    expect(prompt).toContain("<hierarchy>");
    expect(prompt).toContain("`commands/runtime`");
    expect(prompt).toContain("`commands/runtime/turn`");
    expect(prompt).toContain("`presets/runtime`");
    expect(prompt).toContain("`worldbuilding`");
    expect(prompt).toContain("`core/id-and-entities`");
    expect(prompt).toContain(
      "See `current/skills/index.json` for complete skill coverage.",
    );
  });

  it("keeps index entries aligned with catalog metadata source", () => {
    const indexEntries = getAllSkillIndexEntries();
    const catalogIds = new Set(
      getAllSkillCatalogEntries().map((entry) => entry.id),
    );

    expect(indexEntries.length).toBeGreaterThan(0);
    for (const entry of indexEntries) {
      expect(catalogIds.has(entry.id)).toBe(true);
      expect(entry.path).toMatch(/^current\/skills\/.+\/SKILL\.md$/);
    }
  });

  it("includes priority metadata and explicit load protocol in catalog", () => {
    const prompt = buildCoreSystemInstructionWithSkills({ language: "en" });

    expect(prompt).toContain(
      "Hierarchy below is a navigation map (hubs + entry points), not a complete catalog.",
    );
    expect(prompt).toContain("Priority protocol: load hub/high first");
    expect(prompt).toContain("Execution requirement:");
  });
});
