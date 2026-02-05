import { describe, it, expect } from "vitest";
import { buildGlobalVfsSkills } from "../globalSkills";

describe("VFS global skills markdown conversion", () => {
  it("converts <rule name=\"...\"> blocks into readable markdown headers", () => {
    const files = buildGlobalVfsSkills(0);
    const skill = files["skills/gm/state-management/SKILL.md"]?.content ?? "";

    expect(skill).toContain("## STATE MANAGEMENT");
    expect(skill).not.toContain('<rule name="STATE MANAGEMENT">');
  });
});

