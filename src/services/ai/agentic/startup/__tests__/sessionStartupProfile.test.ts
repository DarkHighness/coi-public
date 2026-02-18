import { describe, expect, it } from "vitest";
import { buildSessionStartupProfile } from "../sessionStartupProfile";

describe("sessionStartupProfile", () => {
  it("prefers specific skill refs over broad catalog refs", () => {
    const profile = buildSessionStartupProfile({
      mode: "turn",
      latestSummaryReferencesMarkdown: [
        "- current/skills/index.json",
        "- current/skills/worldbuilding/travel/SKILL.md",
        "- current/session/session-a.jsonl",
      ].join("\n"),
      mandatoryReadPaths: ["skills/commands/runtime/SKILL.md"],
      maxOptionalRefs: 3,
    });

    expect(profile.usedFallback).toBe(false);
    expect(profile.recommendedReadPaths).toContain(
      "current/skills/worldbuilding/travel/SKILL.md",
    );
    expect(profile.recommendedReadPaths).toContain(
      "current/session/session-a.jsonl",
    );
    expect(profile.recommendedReadPaths).not.toContain(
      "current/skills/index.json",
    );
    expect(profile.preloadReadPaths[0]).toBe(
      "current/skills/commands/runtime/SKILL.md",
    );
  });

  it("falls back to narrow anchors for overwide handoff refs", () => {
    const profile = buildSessionStartupProfile({
      mode: "turn",
      latestSummaryReferencesMarkdown: [
        "- current/skills/a/SKILL.md",
        "- current/skills/b/SKILL.md",
        "- current/skills/c/SKILL.md",
        "- current/skills/d/SKILL.md",
        "- current/skills/e/SKILL.md",
      ].join("\n"),
      mandatoryReadPaths: ["current/skills/commands/runtime/SKILL.md"],
      fallbackReadPaths: ["session/session-a.jsonl", "workspace/SOUL.md"],
      maxOptionalRefs: 1,
      maxParsedRefs: 3,
    });

    expect(profile.usedFallback).toBe(true);
    expect(profile.parsed.isOverwide).toBe(true);
    expect(profile.preloadReadPaths).toEqual([
      "current/skills/commands/runtime/SKILL.md",
      "current/session/session-a.jsonl",
      "current/workspace/SOUL.md",
    ]);
    expect(profile.warnings.join("\n")).toContain(
      "Using narrow runtime fallback refs",
    );
  });

  it("uses default anchor fallback when handoff is empty", () => {
    const profile = buildSessionStartupProfile({
      mode: "turn",
      latestSummaryReferencesMarkdown: "   ",
      mandatoryReadPaths: ["current/skills/core/protocols/SKILL.md"],
    });

    expect(profile.usedFallback).toBe(true);
    expect(profile.preloadReadPaths).toEqual([
      "current/skills/core/protocols/SKILL.md",
      "current/session/lineage.json",
    ]);
    expect(profile.hotStartReferencesMarkdown).toBe("");
  });
});
