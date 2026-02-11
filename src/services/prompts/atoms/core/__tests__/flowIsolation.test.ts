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
  it("keeps outline exception only in outline prompt", () => {
    const outlinePrompt = getOutlineSystemInstruction({ language: "en" });

    expect(outlinePrompt).toContain(
      "Outline-phase submit is a controlled elevated-write exception",
    );
    expect(outlinePrompt).toContain(
      "does NOT apply to normal turn/cleanup/summary flows",
    );
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
    expect(getTurnRuntimeFloor()).toContain("Soft gate (advisory, not blocking)");
    expect(getTurnRuntimeFloor()).toContain("commands/runtime/turn/SKILL.md");
    expect(getTurnRuntimeFloor()).toContain("Structured error recovery flow");

    expect(getOutlineRuntimeFloor()).toContain("Soft gate (advisory, not blocking)");
    expect(getOutlineRuntimeFloor()).toContain("commands/runtime/outline/SKILL.md");
    expect(getOutlineRuntimeFloor()).toContain("Structured error recovery flow");
  });
});
