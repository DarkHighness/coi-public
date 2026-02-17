import { describe, expect, it } from "vitest";
import { buildGlobalVfsSkills } from "../globalSkills";
import {
  generateVfsSkillSeeds,
  getSkillCatalogEntries,
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

  it("keeps skill index entries aligned with catalog-visible mappings", () => {
    const mappings = getSkillMappings() as readonly {
      name: string;
      title: string;
      tags: string[];
      path: string;
      visibility?: "catalog" | "nested";
    }[];
    const entries = getSkillIndexEntries();
    const catalogMappings = mappings.filter(
      (mapping) => (mapping.visibility ?? "catalog") === "catalog",
    );

    expect(entries).toHaveLength(catalogMappings.length);
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(entries.length);

    entries.forEach((entry, index) => {
      const mapping = catalogMappings[index];
      expect(entry.id).toBe(mapping.name);
      expect(entry.title).toBe(mapping.title);
      expect(entry.tags).toEqual(mapping.tags);
      expect(entry.path).toBe(`current/skills/${mapping.path}/SKILL.md`);
    });

    const nestedMappings = mappings.filter(
      (mapping) => mapping.visibility === "nested",
    );
    nestedMappings.forEach((mapping) => {
      expect(entries.some((entry) => entry.id === mapping.name)).toBe(false);
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
    expect(stateManagementSkill).not.toContain(
      '<rule name="STATE MANAGEMENT">',
    );

    const commandSudo = seeds.find(
      (seed) => seed.path === "skills/commands/runtime/sudo/SKILL.md",
    )?.content;
    const commandSudoChecklist = seeds.find(
      (seed) => seed.path === "skills/commands/runtime/sudo/CHECKLIST.md",
    )?.content;
    const commandSudoExamples = seeds.find(
      (seed) => seed.path === "skills/commands/runtime/sudo/EXAMPLES.md",
    )?.content;
    const commandSudoRef = seeds.find(
      (seed) =>
        seed.path ===
        "skills/commands/runtime/sudo/references/coverage-audit.md",
    )?.content;
    const commandRuntimeHub = seeds.find(
      (seed) => seed.path === "skills/commands/runtime/SKILL.md",
    )?.content;
    const commandTurn = seeds.find(
      (seed) => seed.path === "skills/commands/runtime/turn/SKILL.md",
    )?.content;
    const commandPlayerRate = seeds.find(
      (seed) => seed.path === "skills/commands/runtime/player-rate/SKILL.md",
    )?.content;
    const commandCleanup = seeds.find(
      (seed) => seed.path === "skills/commands/runtime/cleanup/SKILL.md",
    )?.content;
    const commandSummary = seeds.find(
      (seed) => seed.path === "skills/commands/runtime/summary/SKILL.md",
    )?.content;
    const commandCompact = seeds.find(
      (seed) => seed.path === "skills/commands/runtime/compact/SKILL.md",
    )?.content;
    const commandOutline = seeds.find(
      (seed) => seed.path === "skills/commands/runtime/outline/SKILL.md",
    )?.content;

    expect(commandSudo).toContain("name: commands-sudo");
    expect(commandSudo).toContain("domain: commands");
    expect(commandSudo).toContain("vfs_search");
    expect(commandSudoChecklist).toContain("residual verification");
    expect(commandSudoExamples).toContain(
      "Protagonist rename across world files",
    );
    expect(commandSudoExamples).toContain("## How to Use These Examples");
    expect(commandSudoExamples).toContain("### Context");
    expect(commandSudoExamples).toContain("### Why It Fails");
    expect(commandSudoExamples).toContain("### Why It Works");
    expect(commandSudoExamples).toContain("Scenario focus:");
    expect(commandSudoExamples).toContain("Failure signal:");
    expect(commandSudoExamples).toContain(
      "Reach this minimum correction pattern:",
    );
    expect(commandSudoRef).toContain("Coverage Audit for /sudo");
    expect(commandRuntimeHub).toContain(
      "current/skills/commands/runtime/turn/SKILL.md",
    );
    expect(commandRuntimeHub).toContain(
      "current/skills/commands/runtime/player-rate/SKILL.md",
    );
    expect(commandRuntimeHub).toContain(
      "current/skills/commands/runtime/outline/SKILL.md",
    );
    expect(commandRuntimeHub).toContain("vfs_vm");
    expect(commandRuntimeHub).toContain("JavaScript");
    expect(commandRuntimeHub).toContain("globalThis");
    expect(commandTurn).toContain("name: commands-turn");
    expect(commandTurn).toContain("vfs_finish_turn");
    expect(commandTurn).toContain("retconAck?: { summary }");
    expect(commandTurn).not.toContain("vfs_finish_turn({ userAction");
    expect(commandTurn).not.toContain("retconAck?: { hash");
    expect(commandTurn).toContain("vfs_vm");
    expect(commandTurn).toContain("JavaScript");
    expect(commandTurn).toContain("globalThis");
    expect(commandPlayerRate).toContain("name: commands-player-rate");
    expect(commandPlayerRate).toContain("[Player Rate]");
    expect(commandPlayerRate).toContain("current/world/soul.md");
    expect(commandPlayerRate).toContain("vfs_finish_soul");
    expect(commandPlayerRate).toContain("vfs_vm");
    expect(commandPlayerRate).toContain("JavaScript");
    expect(commandPlayerRate).toContain("globalThis");
    expect(commandPlayerRate).toContain("internal self-guidance notes");
    expect(commandCleanup).toContain("vfs_vm");
    expect(commandCleanup).toContain("retconAck?: { summary }");
    expect(commandCleanup).toContain("JavaScript");
    expect(commandCleanup).toContain("globalThis");
    expect(commandSudo).toContain("vfs_vm");
    expect(commandSudo).toContain("retconAck?: { summary }");
    expect(commandSudo).toContain("JavaScript");
    expect(commandSudo).toContain("globalThis");
    expect(commandSummary).toContain("name: commands-summary");
    expect(commandSummary).toContain("query_summary");
    expect(commandSummary).toContain("Structured Error Recovery Flow");
    expect(commandSummary).toContain("vfs_finish_summary");
    expect(commandCompact).toContain("name: commands-compact");
    expect(commandCompact).toContain("session_compact");
    expect(commandCompact).toContain("current session history in context");
    expect(commandCompact).toContain("Structured Error Recovery Flow");
    expect(commandOutline).toContain("name: commands-outline");
    expect(commandOutline).toContain("vfs_finish_outline_phase_4");
  });

  it("embeds gameplay-specific constraints in runtime examples", () => {
    const seeds = generateVfsSkillSeeds();
    const unlockExamples = seeds.find(
      (seed) => seed.path === "skills/commands/runtime/unlock/EXAMPLES.md",
    )?.content;
    const summaryExamples = seeds.find(
      (seed) => seed.path === "skills/commands/runtime/summary/EXAMPLES.md",
    )?.content;
    const compactExamples = seeds.find(
      (seed) => seed.path === "skills/commands/runtime/compact/EXAMPLES.md",
    )?.content;
    const maliceIntensityExamples = seeds.find(
      (seed) =>
        seed.path ===
        "skills/presets/runtime/player-malice-intensity/EXAMPLES.md",
    )?.content;

    expect(unlockExamples).toContain(
      "Some entities are already unlocked due to prior player actions (stored either on canonical actor/item files or on player view files for world entities).",
    );
    expect(summaryExamples).toContain(
      "Summarize only the target fork turn range.",
    );
    expect(compactExamples).toContain(
      "Any verification read must stay within target-fork paths.",
    );
    expect(maliceIntensityExamples).toContain(
      "Tune only risk curve dimensions (Trace/Heat, thresholds, latency), not profile identity.",
    );
  });

  it("expands all examples files with per-scenario context details", () => {
    const seeds = generateVfsSkillSeeds();
    const exampleSeeds = seeds.filter((seed) => seed.path.endsWith("/EXAMPLES.md"));

    expect(exampleSeeds.length).toBeGreaterThan(0);

    for (const exampleSeed of exampleSeeds) {
      expect(exampleSeed.content).toContain("Scenario focus:");
      expect(exampleSeed.content).toContain("Failure signal:");
      expect(exampleSeed.content).toContain(
        "Reach this minimum correction pattern:",
      );
      expect(exampleSeed.content).toContain(
        "Over-generalizing this scenario without re-checking trigger boundaries:",
      );
    }
  });

  it("derives catalog metadata from SKILL.md frontmatter and sections", () => {
    const entries = getSkillCatalogEntries();
    const seeds = generateVfsSkillSeeds();

    const identity = entries.find((entry) => entry.id === "core-identity");
    const commandSummary = entries.find(
      (entry) => entry.id === "commands-summary",
    );
    const commandSummarySeed = seeds.find(
      (seed) => seed.path === "skills/commands/runtime/summary/SKILL.md",
    )?.content;
    const commandSummaryFrontmatterPriority = commandSummarySeed?.match(
      /^priority:\s*(high|medium|low)\s*$/m,
    )?.[1];

    expect(identity).toBeDefined();
    expect(identity?.path).toBe("current/skills/core/identity/SKILL.md");
    expect(identity?.domain).toBe("core");
    expect(identity?.priority).toBe("high");
    expect(identity?.description.length).toBeGreaterThan(20);
    expect(identity?.whenToLoad.length).toBeGreaterThan(10);
    expect(identity?.tags.length).toBeGreaterThan(0);

    expect(commandSummary).toBeDefined();
    expect(commandSummaryFrontmatterPriority).toBeDefined();
    expect(commandSummary?.priority).toBe(commandSummaryFrontmatterPriority);
    expect(commandSummary?.whenToLoad).toContain("summary");
    expect(commandSummary?.seeAlso.length).toBeGreaterThan(0);
  });

  it("includes generated skill entries inside global skills index", () => {
    const files = buildGlobalVfsSkills(0);
    const rawIndex = files["skills/index.json"]?.content ?? "{}";
    const parsed = JSON.parse(rawIndex) as {
      version: number;
      skills: Array<{
        id: string;
        path: string;
        title: string;
        tags: string[];
      }>;
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

    const assertThemeEntry = (id: string, slug: string): void => {
      const entry = parsed.skills.find((skill) => skill.id === id);
      expect(entry).toBeDefined();
      expect(entry?.path).toBe(`current/skills/theme/${slug}/SKILL.md`);
      expect(entry?.tags).toEqual(expect.arrayContaining(["theme", slug]));
      expect(entry?.title.length ?? 0).toBeGreaterThan(0);
    };

    assertThemeEntry("theme-face-slapping-reversal", "face-slapping-reversal");
    assertThemeEntry("theme-tragic-angst", "tragic-angst");
    assertThemeEntry("theme-healing-redemption", "healing-redemption");
    assertThemeEntry("theme-mystery-horror", "mystery-horror");
    assertThemeEntry("theme-epic-worldbuilding", "epic-worldbuilding");
    assertThemeEntry("theme-ip-faithful-adaptation", "ip-faithful-adaptation");
  });

  it("registers preset runtime skills in generator and index", () => {
    const seeds = generateVfsSkillSeeds();
    const entries = getSkillIndexEntries();

    expect(
      seeds.some(
        (seed) =>
          seed.path === "skills/presets/runtime/narrative-style/SKILL.md",
      ),
    ).toBe(true);
    expect(
      seeds.some(
        (seed) =>
          seed.path === "skills/presets/runtime/world-disposition/SKILL.md",
      ),
    ).toBe(true);
    expect(
      seeds.some(
        (seed) =>
          seed.path === "skills/presets/runtime/player-malice-profile/SKILL.md",
      ),
    ).toBe(true);
    expect(
      seeds.some(
        (seed) =>
          seed.path ===
          "skills/presets/runtime/player-malice-intensity/SKILL.md",
      ),
    ).toBe(true);
    expect(
      seeds.some((seed) => seed.path === "skills/presets/runtime/culture/SKILL.md"),
    ).toBe(true);
    expect(
      seeds.some(
        (seed) =>
          seed.path === "skills/presets/runtime/culture-sinosphere/SKILL.md",
      ),
    ).toBe(true);
    expect(
      seeds.some(
        (seed) =>
          seed.path === "skills/presets/runtime/culture-japanese/SKILL.md",
      ),
    ).toBe(true);
    expect(
      seeds.some(
        (seed) => seed.path === "skills/presets/runtime/culture-korean/SKILL.md",
      ),
    ).toBe(true);
    expect(
      seeds.some(
        (seed) =>
          seed.path ===
          "skills/presets/runtime/culture-western-euro-american/SKILL.md",
      ),
    ).toBe(true);
    expect(
      seeds.some(
        (seed) =>
          seed.path ===
          "skills/presets/runtime/culture-arab-islamic/SKILL.md",
      ),
    ).toBe(true);
    expect(
      seeds.some(
        (seed) =>
          seed.path === "skills/presets/runtime/culture-south-asian/SKILL.md",
      ),
    ).toBe(true);
    expect(
      seeds.some(
        (seed) =>
          seed.path ===
          "skills/presets/runtime/culture-latin-american/SKILL.md",
      ),
    ).toBe(true);
    expect(
      seeds.some(
        (seed) =>
          seed.path ===
          "skills/presets/runtime/culture-sub-saharan-african/SKILL.md",
      ),
    ).toBe(true);

    expect(
      entries.some(
        (entry) => entry.path === "current/skills/presets/runtime/SKILL.md",
      ),
    ).toBe(true);
    expect(
      entries.some(
        (entry) =>
          entry.path ===
          "current/skills/presets/runtime/narrative-style/SKILL.md",
      ),
    ).toBe(false);
    expect(
      entries.some(
        (entry) =>
          entry.path === "current/skills/presets/runtime/culture/SKILL.md",
      ),
    ).toBe(false);
  });
});
