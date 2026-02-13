import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  getOutlineSystemInstruction,
  getOutlinePhase0Prompt,
  getOutlinePhase1Prompt,
  getOutlinePhase2WorldFoundationPrompt,
  getOutlinePhase2Prompt,
  getOutlinePhase3Prompt,
  getOutlinePhase4Prompt,
  getOutlinePhase5Prompt,
  getOutlinePhase7Prompt,
  getOutlinePhase8Prompt,
  getOutlinePhase9Prompt,
} from "../../storyOutline";
import {
  clearPromptTraceRegistry,
  getLatestPromptTrace,
  setPromptTraceEnabled,
} from "../runtime";
import { validatePromptTrace } from "../policy";
const loadGraph = () =>
  JSON.parse(
    fs.readFileSync(
      path.resolve(
        process.cwd(),
        "src/services/prompts/trace/generated/prompt-atom-graph.json",
      ),
      "utf8",
    ),
  );

describe("prompt trace coverage - outline", () => {
  afterEach(() => {
    clearPromptTraceRegistry();
    setPromptTraceEnabled(false);
  });

  it("covers required atoms in outline system + phase prompts", () => {
    setPromptTraceEnabled(true);

    const cases = [
      {
        promptId: "outline.system",
        build: () =>
          getOutlineSystemInstruction({
            language: "en",
            isRestricted: false,
            narrativeStyle: "Standard",
          }),
      },
      {
        promptId: "outline.phase0",
        build: () => getOutlinePhase0Prompt("en", "vfs_commit_outline_phase_0"),
      },
      {
        promptId: "outline.phase1",
        build: () =>
          getOutlinePhase1Prompt(
            "fantasy",
            "en",
            "ctx",
            false,
            "wanderer",
            "vfs_commit_outline_phase_1",
          ),
      },
      {
        promptId: "outline.phase2.worldFoundation",
        build: () =>
          getOutlinePhase2WorldFoundationPrompt(
            "fantasy",
            "en",
            "ctx",
            false,
            "wanderer",
            "vfs_commit_outline_phase_2",
          ),
      },
      {
        promptId: "outline.phase3.playerActor",
        build: () =>
          getOutlinePhase2Prompt("wanderer", "vfs_commit_outline_phase_3"),
      },
      {
        promptId: "outline.phase4.locations",
        build: () => getOutlinePhase3Prompt("vfs_commit_outline_phase_4"),
      },
      {
        promptId: "outline.phase5.factions",
        build: () => getOutlinePhase4Prompt("vfs_commit_outline_phase_5"),
      },
      {
        promptId: "outline.phase6.npcs",
        build: () => getOutlinePhase5Prompt("vfs_commit_outline_phase_6"),
      },
      {
        promptId: "outline.phase7.questsKnowledge",
        build: () => getOutlinePhase7Prompt("vfs_commit_outline_phase_7"),
      },
      {
        promptId: "outline.phase8.timelineAtmosphere",
        build: () => getOutlinePhase8Prompt("vfs_commit_outline_phase_8"),
      },
      {
        promptId: "outline.phase9.openingNarrative",
        build: () =>
          getOutlinePhase9Prompt(false, "vfs_commit_outline_phase_9"),
      },
    ] as const;

    const graph = loadGraph() as any;
    for (const testCase of cases) {
      const prompt = testCase.build();
      expect(prompt.length).toBeGreaterThan(0);

      const trace = getLatestPromptTrace(testCase.promptId);
      expect(trace).toBeDefined();

      const result = validatePromptTrace(testCase.promptId, trace!, graph);
      expect(result.ok).toBe(true);
    }
  });
});
