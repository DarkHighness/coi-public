import { describe, expect, it } from "vitest";
import { consequences, narrativePolicy, outputFormat } from "../index";
import { getOutlineOpeningNarrativePrompt } from "../../../storyOutline";

describe("choice tradeoff policy", () => {
  it("prices player best-of-both-worlds attempts in consequence rules", () => {
    const content = consequences();

    expect(content).toContain('PLAYER "BEST-OF-BOTH-WORLDS" ATTEMPTS');
    expect(content).toContain("ALLOW, THEN PRICE IT");
    expect(content).toContain("Success with cost");
    expect(content).toContain("Partial success");
    expect(content).toContain("Fail-forward");
  });

  it("keeps tradeoff rules for player-authored custom actions", () => {
    const content = narrativePolicy();

    expect(content).toContain("Player Custom Actions");
    expect(content).toContain("best-of-both-worlds");
    expect(content).toContain("Avoid cost-free all-upside outcomes");
  });

  it("enforces non-dominant options in turn output and outline prompts", () => {
    const turnPrompt = outputFormat({
      language: "en",
      finishToolName: "vfs_finish_turn",
    });
    const outlinePrompt = getOutlineOpeningNarrativePrompt(
      false,
      "submit_phase_9",
    );

    expect(turnPrompt).toContain("carry different tradeoffs");
    expect(turnPrompt).toContain("avoid strictly dominant all-upside options");
    expect(outlinePrompt).toContain('Avoid "dominant" options');
  });

  it("keeps player-rate loop free from normal-turn choice constraints", () => {
    const playerRatePrompt = outputFormat({
      language: "en",
      finishToolName: "vfs_end_turn",
    });

    expect(playerRatePrompt).toContain(
      "Skip choice generation in `[Player Rate]` loops.",
    );
    expect(playerRatePrompt).not.toContain(
      "avoid strictly dominant all-upside options",
    );
  });
});
