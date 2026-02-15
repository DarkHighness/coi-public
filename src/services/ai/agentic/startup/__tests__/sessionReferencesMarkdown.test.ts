import { describe, expect, it } from "vitest";
import {
  getLatestSummaryReferencesMarkdown,
  parseSessionReferencesMarkdown,
} from "../sessionReferencesMarkdown";
import { buildSessionStartupProfile } from "../sessionStartupProfile";

describe("sessionReferencesMarkdown", () => {
  it("parses mixed markdown styles into normalized paths", () => {
    const result = parseSessionReferencesMarkdown(
      [
        "- `current/skills/commands/runtime/SKILL.md`",
        "- [Turn Skill](current/skills/commands/runtime/turn/SKILL.md)",
        "Please read current/conversation/session.jsonl before continuing.",
      ].join("\n"),
    );

    expect(result.validRefs).toEqual(
      expect.arrayContaining([
        "current/skills/commands/runtime/SKILL.md",
        "current/skills/commands/runtime/turn/SKILL.md",
        "current/conversation/session.jsonl",
      ]),
    );
    expect(result.skillRefs).toEqual(
      expect.arrayContaining([
        "current/skills/commands/runtime/SKILL.md",
        "current/skills/commands/runtime/turn/SKILL.md",
      ]),
    );
    expect(result.anchorRefs).toEqual(["current/conversation/session.jsonl"]);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Dropped 1 unparseable reference"),
      ]),
    );
  });

  it("drops invalid refs and marks overwide payloads", () => {
    const result = parseSessionReferencesMarkdown(
      [
        "- https://example.com/not-vfs",
        "- /tmp/local.txt",
        "- current/skills/index.json",
        "- current/skills/a/SKILL.md",
        "- current/skills/b/SKILL.md",
        "- current/skills/c/SKILL.md",
        "- current/skills/d/SKILL.md",
      ].join("\n"),
      { maxRefs: 3 },
    );

    expect(result.validRefs).toContain("current/skills/index.json");
    expect(result.validRefs).toContain("current/skills/a/SKILL.md");
    expect(result.droppedRefs.length).toBeGreaterThan(0);
    expect(result.isOverwide).toBe(true);
    expect(result.warnings.join("\n")).toContain("narrow fallback refs");
  });

  it("builds markdown-first startup profile with fallback but no mutation", () => {
    const profile = buildSessionStartupProfile({
      mode: "turn",
      latestSummaryReferencesMarkdown: "random prose with no valid path",
      mandatoryReadPaths: ["skills/commands/runtime/SKILL.md"],
      fallbackReadPaths: ["current/conversation/session.jsonl"],
    });

    expect(profile.usedFallback).toBe(true);
    expect(profile.preloadReadPaths).toEqual([
      "current/skills/commands/runtime/SKILL.md",
      "current/conversation/session.jsonl",
    ]);
    expect(profile.hotStartReferencesMarkdown).toBe(
      "random prose with no valid path",
    );
  });

  it("reads latest markdown handoff from game state", () => {
    const markdown = getLatestSummaryReferencesMarkdown({
      summaries: [
        {
          nextSessionReferencesMarkdown: "- current/skills/commands/runtime/SKILL.md",
        },
        {
          nextSessionReferencesMarkdown:
            "- current/skills/commands/runtime/turn/SKILL.md",
        },
      ],
    } as any);

    expect(markdown).toBe("- current/skills/commands/runtime/turn/SKILL.md");
  });
});
