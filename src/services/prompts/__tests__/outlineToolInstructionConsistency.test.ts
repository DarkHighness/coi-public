import { describe, expect, it } from "vitest";
import {
  getOutlinePhase1Prompt,
  getOutlineSystemInstruction,
} from "../storyOutline";

describe("outline tool instruction consistency", () => {
  it("does not ask for raw JSON text output in tool-calling mode", () => {
    const prompt = getOutlineSystemInstruction({ language: "en" });

    expect(prompt).not.toContain("ONLY THE RAW JSON");
    expect(prompt).not.toContain("Failure to output raw JSON");
    expect(prompt).toContain("You MUST call the currently provided submit tool");
    expect(prompt).toContain("Return no extra text outside the tool call");
    expect(prompt).toContain("outline generation flow");
    expect(prompt).toContain("does NOT apply to normal turn/cleanup/summary flows");
  });

  it("phase 1 prompt enforces master plan markdown and governance metadata", () => {
    const prompt = getOutlinePhase1Prompt("fantasy", "en", "ctx", false);

    expect(prompt).toContain("[PHASE 1 OF 9: MASTER STORY PLAN]");
    expect(prompt).toContain("storyPlanMarkdown");
    expect(prompt).toContain("planningMetadata");
    expect(prompt).toContain("Runtime Adaptation Protocol");
    expect(prompt).toContain("forbidDeusExMachina");
    expect(prompt).toContain("current/skills/theme/<genre>/SKILL.md");
    expect(prompt).toContain("read `current/skills/index.json` first");
    expect(prompt).toContain("optionally read 0-2 relevant `current/skills/theme/**/SKILL.md` entries");
    expect(prompt).toContain("optional guidance in outline mode");
  });
});
