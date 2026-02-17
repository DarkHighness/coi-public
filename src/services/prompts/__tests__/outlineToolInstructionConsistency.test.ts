import { describe, expect, it } from "vitest";
import {
  getOutlinePhase1Prompt,
  getOutlinePhasePreludePrompt,
  getOutlineSystemInstruction,
} from "../storyOutline";

describe("outline tool instruction consistency", () => {
  it("keeps system shell minimal and puts tool protocol in per-phase prelude", () => {
    const systemPrompt = getOutlineSystemInstruction({ language: "en" });
    const phasePrelude = getOutlinePhasePreludePrompt(
      1,
      "vfs_finish_outline_phase_0",
      {
        theme: "fantasy",
        language: "en",
        customContext: "ctx",
      },
    );

    expect(systemPrompt).not.toContain("ONLY THE RAW JSON");
    expect(systemPrompt).toContain("You are in OUTLINE MODE");
    expect(systemPrompt).toContain("authoritative contract for this round");
    expect(systemPrompt).toContain("<language_target>en</language_target>");

    expect(phasePrelude).toContain("[PHASE 1 PRELUDE: ROUND CONTRACT]");
    expect(phasePrelude).toContain("Use native function/tool calling");
    expect(phasePrelude).toContain(
      "direct phase object schema (no `phase` wrapper, no `data` wrapper)",
    );
    expect(phasePrelude).toContain("Tool names are exact and unprefixed");
    expect(phasePrelude).toContain("vfs_read_lines");
    expect(phasePrelude).toContain("vfs_finish_outline_phase_0");
  });

  it("phase 1 prompt enforces master plan markdown and governance metadata", () => {
    const prompt = getOutlinePhase1Prompt("fantasy", "en", "ctx", false);

    expect(prompt).toContain("[PHASE 1 OF 9: MASTER STORY PLAN]");
    expect(prompt).toContain("storyPlanMarkdown");
    expect(prompt).toContain("planningMetadata");
    expect(prompt).toContain("Runtime Adaptation Protocol");
    expect(prompt).toContain("forbidDeusExMachina");
    expect(prompt).toContain("current/skills/theme/<genre>/SKILL.md");
    expect(prompt).toContain(
      'vfs_read_chars({ path: "current/skills/theme/<genre>/SKILL.md" })',
    );
    expect(prompt).toContain("SKILL USAGE FOR GENRE DEPTH");
  });
});
