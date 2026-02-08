import { describe, expect, it } from "vitest";
import { buildGlobalVfsSkills } from "../globalSkills";
import {
  generateVfsSkillSeeds,
  getSkillIndexEntries,
  getSkillMappings,
} from "../globalSkills/generator";

describe("VFS global skills generator", () => {
  it("generates unique skill seed paths and SKILL.md for each mapping", () => {
    const mappings = getSkillMappings();
    const seeds = generateVfsSkillSeeds();
    const paths = seeds.map((seed) => seed.path);

    expect(new Set(paths).size).toBe(paths.length);

    for (const mapping of mappings) {
      expect(paths).toContain(`skills/${mapping.path}/SKILL.md`);
    }

    expect(seeds.every((seed) => seed.contentType === "text/markdown")).toBe(
      true,
    );
  });

  it("keeps skill index entries aligned with mappings", () => {
    const mappings = getSkillMappings();
    const entries = getSkillIndexEntries();

    expect(entries).toHaveLength(mappings.length);
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(entries.length);

    entries.forEach((entry, index) => {
      const mapping = mappings[index];
      expect(entry.id).toBe(mapping.name);
      expect(entry.title).toBe(mapping.title);
      expect(entry.tags).toEqual(mapping.tags);
      expect(entry.path).toBe(`current/skills/${mapping.path}/SKILL.md`);
    });
  });

  it("builds markdown with frontmatter and converted section headers", () => {
    const seeds = generateVfsSkillSeeds();

    const identitySkill = seeds.find(
      (seed) => seed.path === "skills/core/identity/SKILL.md",
    )?.content;
    const stateManagementSkill = seeds.find(
      (seed) => seed.path === "skills/gm/state-management/SKILL.md",
    )?.content;

    expect(identitySkill).toContain("name: core-identity");
    expect(identitySkill).toContain("domain: core");
    expect(identitySkill).toContain("priority: high");
    expect(identitySkill).toContain("## When to Use");
    expect(identitySkill).toContain("## See Also");
    expect(identitySkill).toContain("`core/essence`");

    expect(stateManagementSkill).toContain("## STATE MANAGEMENT");
    expect(stateManagementSkill).not.toContain('<rule name="STATE MANAGEMENT">');

    const commandSudo = seeds.find(
      (seed) => seed.path === "skills/commands/sudo/SKILL.md",
    )?.content;
    const commandSudoChecklist = seeds.find(
      (seed) => seed.path === "skills/commands/sudo/CHECKLIST.md",
    )?.content;
    const commandSudoExamples = seeds.find(
      (seed) => seed.path === "skills/commands/sudo/EXAMPLES.md",
    )?.content;
    const commandSudoRef = seeds.find(
      (seed) =>
        seed.path === "skills/commands/sudo/references/coverage-audit.md",
    )?.content;
    const commandSummary = seeds.find(
      (seed) => seed.path === "skills/commands/summary/SKILL.md",
    )?.content;
    const commandCompact = seeds.find(
      (seed) => seed.path === "skills/commands/compact/SKILL.md",
    )?.content;

    expect(commandSudo).toContain("name: commands-sudo");
    expect(commandSudo).toContain("domain: commands");
    expect(commandSudo).toContain("vfs_search");
    expect(commandSudoChecklist).toContain("residual verification");
    expect(commandSudoExamples).toContain("Protagonist rename across world files");
    expect(commandSudoRef).toContain("Coverage Audit for /sudo");
    expect(commandSummary).toContain("name: commands-summary");
    expect(commandSummary).toContain("query_summary");
    expect(commandSummary).toContain("vfs_finish_summary");
    expect(commandCompact).toContain("name: commands-compact");
    expect(commandCompact).toContain("session_compact");
    expect(commandCompact).toContain("current session history in context");
  });

  it("includes generated skill entries inside global skills index", () => {
    const files = buildGlobalVfsSkills(0);
    const rawIndex = files["skills/index.json"]?.content ?? "{}";
    const parsed = JSON.parse(rawIndex) as {
      version: number;
      skills: Array<{ id: string; path: string }>;
    };

    const expectedEntries = getSkillIndexEntries();

    expect(parsed.version).toBe(1);
    expect(parsed.skills.length).toBeGreaterThan(expectedEntries.length);

    for (const entry of expectedEntries) {
      expect(parsed.skills).toContainEqual({
        id: entry.id,
        path: entry.path,
        title: entry.title,
        tags: entry.tags,
      });
    }
  });

  it("registers preset runtime skills in generator and index", () => {
    const seeds = generateVfsSkillSeeds();
    const entries = getSkillIndexEntries();

    expect(
      seeds.some(
        (seed) => seed.path === "skills/presets/narrative-style/SKILL.md",
      ),
    ).toBe(true);
    expect(
      seeds.some(
        (seed) => seed.path === "skills/presets/world-disposition/SKILL.md",
      ),
    ).toBe(true);
    expect(
      seeds.some(
        (seed) =>
          seed.path === "skills/presets/player-malice-profile/SKILL.md",
      ),
    ).toBe(true);
    expect(
      seeds.some(
        (seed) =>
          seed.path === "skills/presets/player-malice-intensity/SKILL.md",
      ),
    ).toBe(true);

    expect(
      entries.some(
        (entry) => entry.path === "current/skills/presets/narrative-style/SKILL.md",
      ),
    ).toBe(true);
    expect(
      entries.some(
        (entry) => entry.path === "current/skills/presets/world-disposition/SKILL.md",
      ),
    ).toBe(true);
    expect(
      entries.some(
        (entry) =>
          entry.path === "current/skills/presets/player-malice-profile/SKILL.md",
      ),
    ).toBe(true);
    expect(
      entries.some(
        (entry) =>
          entry.path ===
          "current/skills/presets/player-malice-intensity/SKILL.md",
      ),
    ).toBe(true);
  });
});
