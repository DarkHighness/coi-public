import { describe, it, expect } from "vitest";
import { buildGlobalVfsSkills } from "../globalSkills";

describe("VFS global skills docs", () => {
  it("documents the domain/skill path layout under current/skills", () => {
    const files = buildGlobalVfsSkills(0);
    const readme = files["skills/README.md"]?.content ?? "";
    const style = files["skills/STYLE.md"]?.content ?? "";

    expect(readme).toContain(
      'vfs_read_json({ path: "current/skills/index.json", pointers: ["/skills"] })',
    );
    expect(readme).toContain(
      'vfs_read_lines({ path: "current/skills/<domain>/<skill>/SKILL.md", startLine: 1, lineCount: 220 })',
    );
    expect(readme).toContain(
      'vfs_read_markdown({ path: "current/skills/<domain>/<skill>/SKILL.md", headings: ["Quick Start"] })',
    );
    expect(readme).not.toContain('vfs_read_chars path="');
    expect(readme).not.toContain("vfs_ls patterns=");

    expect(style).toContain("current/skills/<domain>/<skill>/SKILL.md");
    expect(style).toContain("current/skills/**");
  });

  it("keeps theme skills as real skills with When to Use", () => {
    const files = buildGlobalVfsSkills(0);
    const cyberpunk = files["skills/theme/cyberpunk/SKILL.md"]?.content ?? "";
    const faceSlapping =
      files["skills/theme/face-slapping-reversal/SKILL.md"]?.content ?? "";
    const ipFaithful =
      files["skills/theme/ip-faithful-adaptation/SKILL.md"]?.content ?? "";
    expect(cyberpunk).toContain("# Cyberpunk Theme");
    expect(cyberpunk).toContain("## When to Use");
    expect(cyberpunk).toContain("## Checklist");
    expect(cyberpunk).toContain("Scenario focus:");
    expect(cyberpunk).toContain("Failure signal:");
    expect(cyberpunk).toContain("#### Constraints to Keep True");
    expect(cyberpunk).toContain("### Step 1");
    expect(cyberpunk).toContain("Action focus:");
    expect(cyberpunk).toContain("Trigger condition:");
    expect(cyberpunk).toContain("Recovery move:");
    expect(cyberpunk).toContain("### Pattern 1");
    expect(cyberpunk).toContain("Pattern focus:");
    expect(cyberpunk).toContain("### Clock 1");
    expect(cyberpunk).toContain("Clock focus:");
    expect(cyberpunk).toContain("### Checkpoint 1");
    expect(cyberpunk).toContain("Checkpoint focus:");
    expect(cyberpunk).toContain("#### When to Use");
    expect(cyberpunk).toContain("#### Execution Constraints");
    expect(cyberpunk).toContain("#### Misuse Signals");
    expect(cyberpunk).toContain("#### Recovery Moves");
    expect(cyberpunk).toContain("#### Template Body");
    expect(faceSlapping).toContain("# Face-Slapping Reversal Theme");
    expect(faceSlapping).toContain("## Anti-patterns");
    expect(faceSlapping).toContain("## Checklist");
    expect(faceSlapping).toContain(
      "tags: [theme, face-slapping-reversal, shuangwen]",
    );
    expect(ipFaithful).toContain("# IP Faithful Adaptation Theme");
    expect(ipFaithful).toContain("## When to Use");
    expect(ipFaithful).toContain("## Anti-patterns");
    expect(ipFaithful).toContain("tags: [theme, ip-faithful-adaptation, ip]");
  });

  it("ships preset runtime skills as VFS-registered documents", () => {
    const files = buildGlobalVfsSkills(0);
    const narrativeStyle =
      files["skills/presets/runtime/narrative-style/SKILL.md"]?.content ?? "";
    const worldDisposition =
      files["skills/presets/runtime/world-disposition/SKILL.md"]?.content ?? "";
    const maliceProfile =
      files["skills/presets/runtime/player-malice-profile/SKILL.md"]?.content ??
      "";
    const maliceIntensity =
      files["skills/presets/runtime/player-malice-intensity/SKILL.md"]
        ?.content ?? "";
    const cultureHub =
      files["skills/presets/runtime/culture/SKILL.md"]?.content ?? "";
    const cultureSinosphere =
      files["skills/presets/runtime/culture-sinosphere/SKILL.md"]?.content ??
      "";
    const cultureJapanese =
      files["skills/presets/runtime/culture-japanese/SKILL.md"]?.content ?? "";

    expect(narrativeStyle).toContain("# Preset Narrative Style Runtime");
    expect(worldDisposition).toContain("# Preset World Disposition Runtime");
    expect(maliceProfile).toContain("# Preset Player Malice Profile Runtime");
    expect(maliceIntensity).toContain(
      "# Preset Player Malice Intensity Runtime",
    );
    expect(cultureHub).toContain("# Runtime Culture Preference Hub");
    expect(cultureHub).toContain(
      "current/skills/presets/runtime/culture-japanese/SKILL.md",
    );
    expect(cultureSinosphere).toContain("# Preset Culture - Sinosphere");
    expect(cultureSinosphere).toContain("人名必须自然");
    expect(cultureSinosphere).toContain(
      "## Anti-AI Name Checklist (Hard Gate)",
    );
    expect(cultureJapanese).toContain("# Preset Culture - Japanese");
    expect(cultureJapanese).toContain(
      "single-script output (no dual-script pairing)",
    );
  });
});
