import { describe, it, expect } from "vitest";
import { buildGlobalVfsSkills } from "../globalSkills";

describe("VFS global skills docs", () => {
  it("documents the domain/skill path layout under current/skills", () => {
    const files = buildGlobalVfsSkills(0);
    const readme = files["skills/README.md"]?.content ?? "";
    const style = files["skills/STYLE.md"]?.content ?? "";

    expect(readme).toContain('vfs_read path="current/skills/index.json"');
    expect(readme).toContain(
      'vfs_read path="current/skills/<domain>/<skill>/SKILL.md"',
    );

    expect(style).toContain("current/skills/<domain>/<skill>/SKILL.md");
    expect(style).toContain("current/skills/**");
  });

  it("keeps theme skills as real skills with When to Use", () => {
    const files = buildGlobalVfsSkills(0);
    const cyberpunk = files["skills/theme/cyberpunk/SKILL.md"]?.content ?? "";
    expect(cyberpunk).toContain("# Cyberpunk Theme");
    expect(cyberpunk).toContain("## When to Use");
    expect(cyberpunk).toContain("## Checklist");
  });
});
