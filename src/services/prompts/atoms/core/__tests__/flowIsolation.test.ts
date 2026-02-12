import { describe, expect, it } from "vitest";
import { getOutlineSystemInstruction } from "../../../storyOutline";
import {
  cleanupTurnInstruction,
  normalTurnInstruction,
  sudoModeInstruction,
} from "../systemMessages";
import { getOutlineRuntimeFloor, getTurnRuntimeFloor } from "../../../runtimeFloor";
import { stateManagement } from "../stateManagement";

describe("prompt flow isolation", () => {
  it("keeps outline role+contract only in outline prompt shell", () => {
    const outlinePrompt = getOutlineSystemInstruction({ language: "en" });

    expect(outlinePrompt).toContain("You are in OUTLINE MODE");
    expect(outlinePrompt).toContain(
      "Treat the current phase user message as the authoritative contract",
    );
    expect(outlinePrompt).not.toContain("Loop quick-start (recommended)");
  });

  it("does not leak outline exception phrase into turn/cleanup/system prompts", () => {
    const forbiddenPhrase = "outline-flow only";

    expect(normalTurnInstruction({})).not.toContain(forbiddenPhrase);
    expect(cleanupTurnInstruction({})).not.toContain(forbiddenPhrase);
    expect(sudoModeInstruction({})).not.toContain(forbiddenPhrase);
    expect(getTurnRuntimeFloor()).not.toContain(forbiddenPhrase);
    expect(stateManagement()).not.toContain(forbiddenPhrase);
  });

  it("keeps runtime floor skill guidance as soft-gate (non-blocking)", () => {
    expect(getTurnRuntimeFloor()).toContain("Loop quick-start (recommended)");
    expect(getTurnRuntimeFloor()).toContain("Soft gate (advisory, not blocking)");
    expect(getTurnRuntimeFloor()).toContain("commands/runtime/turn/SKILL.md");
    expect(getTurnRuntimeFloor()).toContain("Structured error recovery flow");

    expect(getOutlineRuntimeFloor()).toContain("Loop quick-start (recommended)");
    expect(getOutlineRuntimeFloor()).toContain("Soft gate (advisory, not blocking)");
    expect(getOutlineRuntimeFloor()).toContain("commands/runtime/outline/SKILL.md");
    expect(getOutlineRuntimeFloor()).toContain("Structured error recovery flow");
  });
});
