import { describe, it, expect } from "vitest";
import * as skills from "../index";

describe("skills index export contract", () => {
  it("exports current APIs and excludes removed legacy APIs", () => {
    expect(typeof skills.buildSkillContext).toBe("function");
    expect(typeof skills.buildCoreSystemInstructionWithSkills).toBe("function");

    expect("getCoreSystemInstructionWithSkills" in skills).toBe(false);
    expect("registerAllSkills" in skills).toBe(false);
  });
});
