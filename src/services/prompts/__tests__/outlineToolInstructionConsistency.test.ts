import { describe, expect, it } from "vitest";
import {
  getOutlineMasterPlanPrompt,
  getOutlinePhasePreludePrompt,
  getOutlineSystemInstruction,
} from "../storyOutline";

describe("outline tool instruction consistency", () => {
  it("keeps system shell minimal and puts tool protocol in per-phase prelude", () => {
    const systemPrompt = getOutlineSystemInstruction({ language: "en" });
    const phasePrelude = getOutlinePhasePreludePrompt(
      "master_plan",
      2,
      11,
      "vfs_finish_outline_master_plan",
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

    expect(phasePrelude).toContain("[PHASE 2 OF 11 PRELUDE: ROUND CONTRACT]");
    expect(phasePrelude).toContain("Use native function/tool calling");
    expect(phasePrelude).toContain(
      "direct phase object schema (no `phase` wrapper, no `data` wrapper)",
    );
    expect(phasePrelude).toContain("Tool names are exact and unprefixed");
    expect(phasePrelude).toContain("vfs_read_lines");
    expect(phasePrelude).toContain("vfs_finish_outline_master_plan");
  });

  it("master_plan prompt enforces markdown + metadata output contract", () => {
    const prompt = getOutlineMasterPlanPrompt(
      "fantasy",
      "en",
      "ctx",
      false,
      undefined,
      "vfs_finish_outline_master_plan",
      2,
      10,
    );

    expect(prompt).toContain("[PHASE 2 OF 10: MASTER STORY PLAN]");
    expect(prompt).toContain("storyPlanMarkdown");
    expect(prompt).toContain("planningMetadata");
    expect(prompt).toContain("forbidDeusExMachina");
  });
});
