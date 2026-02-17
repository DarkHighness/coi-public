import { describe, expect, it } from "vitest";
import { getOutlineSystemInstruction } from "../../../storyOutline";
import {
  cleanupTurnInstruction,
  normalTurnInstruction,
  sudoModeInstruction,
} from "../systemMessages";
import {
  getOutlineRuntimeFloor,
  getTurnRuntimeFloor,
} from "../../../runtimeFloor";
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

  it("keeps runtime floor skill guidance explicit per loop type", () => {
    // Turn runtime floor: hard gate, skill paths, error recovery
    expect(getTurnRuntimeFloor()).toContain("Loop preflight");
    expect(getTurnRuntimeFloor()).toContain("hard gate");
    expect(getTurnRuntimeFloor()).toContain("commands/runtime/SKILL.md");
    expect(getTurnRuntimeFloor()).toContain("Error recovery");

    // Outline runtime floor: quick-start, skill paths, error recovery
    expect(getOutlineRuntimeFloor()).toContain("Quick-start (recommended)");
    expect(getOutlineRuntimeFloor()).toContain(
      "commands/runtime/outline/SKILL.md",
    );
    expect(getOutlineRuntimeFloor()).toContain("Error recovery");
  });
});
