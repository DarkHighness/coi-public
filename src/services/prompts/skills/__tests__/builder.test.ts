import { describe, it, expect } from "vitest";
import { buildCoreSystemInstructionWithSkills } from "../builder";

describe("skills prompt builder hygiene", () => {
  it("does not include compaction protocol in turn system prompt", () => {
    const prompt = buildCoreSystemInstructionWithSkills({ language: "en" });
    expect(prompt).not.toContain("[SYSTEM: COMPACT_NOW]");
    expect(prompt).not.toContain("vfs_finish_summary");
    expect(prompt).toContain("current/custom_rules/NN-*/RULES.md");
  });
});

