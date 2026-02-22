import { describe, expect, it } from "vitest";
import {
  isSystemProtectedSkillPath,
  normalizeSkillPolicyPath,
  resolveSkillPolicyGateConfig,
  resolveSkillPolicySelection,
  toCurrentSkillPolicyPath,
} from "./skillPolicies";

describe("skillPolicies", () => {
  it("normalizes supported skill path variants", () => {
    expect(normalizeSkillPolicyPath("skills/core/protocols/SKILL.md")).toBe(
      "skills/core/protocols/SKILL.md",
    );
    expect(
      normalizeSkillPolicyPath("current/skills/core/protocols/SKILL.md"),
    ).toBe("skills/core/protocols/SKILL.md");
    expect(
      normalizeSkillPolicyPath("shared/system/skills/core/protocols/SKILL.md"),
    ).toBe("skills/core/protocols/SKILL.md");
    expect(
      normalizeSkillPolicyPath("\\current\\skills\\core\\protocols\\SKILL.md"),
    ).toBe("skills/core/protocols/SKILL.md");
    expect(normalizeSkillPolicyPath("current/skills/index.json")).toBeNull();
    expect(normalizeSkillPolicyPath("workspace/SOUL.md")).toBeNull();
  });

  it("converts canonical skill paths to current alias", () => {
    expect(toCurrentSkillPolicyPath("skills/core/protocols/SKILL.md")).toBe(
      "current/skills/core/protocols/SKILL.md",
    );
    expect(toCurrentSkillPolicyPath("workspace/SOUL.md")).toBeNull();
  });

  it("marks system-level skills as protected from forbidden policy", () => {
    expect(
      isSystemProtectedSkillPath("skills/commands/runtime/turn/SKILL.md"),
    ).toBe(true);
    expect(
      isSystemProtectedSkillPath("skills/presets/runtime/culture/SKILL.md"),
    ).toBe(true);
    expect(isSystemProtectedSkillPath("skills/core/protocols/SKILL.md")).toBe(
      true,
    );
    expect(
      isSystemProtectedSkillPath("skills/gm/moral-complexity/SKILL.md"),
    ).toBe(false);
  });

  it("resolves configured policies and filters invalid/default entries", () => {
    const selection = resolveSkillPolicySelection({
      extra: {
        skillReadPolicies: {
          "skills/core/protocols/SKILL.md": "required",
          "current/skills/craft/writing/SKILL.md": "recommended",
          "skills/theme/fantasy/SKILL.md": "forbidden",
          "skills/commands/runtime/SKILL.md": "default",
          "invalid/path.md": "required",
          "skills/core/id-and-entities/SKILL.md": "unknown",
        },
      },
    } as any);

    expect(selection.required).toEqual(["skills/core/protocols/SKILL.md"]);
    expect(selection.recommended).toEqual(["skills/craft/writing/SKILL.md"]);
    expect(selection.forbidden).toEqual(["skills/theme/fantasy/SKILL.md"]);
    expect(selection.invalidEntries).toEqual(["invalid/path.md"]);
  });

  it("builds gate config and ignores forbidden entries that hard gate requires", () => {
    const gate = resolveSkillPolicyGateConfig({
      settings: {
        extra: {
          skillReadPolicies: {
            "skills/core/protocols/SKILL.md": "forbidden",
            "skills/theme/fantasy/SKILL.md": "forbidden",
            "skills/craft/writing/SKILL.md": "required",
            "skills/npc/logic/SKILL.md": "recommended",
            "skills/presets/runtime/narrative-style/SKILL.md": "forbidden",
          },
        },
      } as any,
      hardRequiredPaths: [
        "skills/commands/runtime/SKILL.md",
        "skills/core/protocols/SKILL.md",
      ],
      hardPresetRequiredPaths: ["skills/presets/runtime/culture/SKILL.md"],
    });

    expect(gate.required).toEqual(["skills/craft/writing/SKILL.md"]);
    expect(gate.recommended).toEqual(["skills/npc/logic/SKILL.md"]);
    expect(gate.forbidden).toEqual(["skills/theme/fantasy/SKILL.md"]);
    expect(gate.ignoredForbidden).toEqual([
      "skills/core/protocols/SKILL.md",
      "skills/presets/runtime/narrative-style/SKILL.md",
    ]);
  });
});
