import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  getOutlineSystemInstruction,
  getOutlineImageSeedPrompt,
  getOutlineMasterPlanPrompt,
  getOutlineWorldFoundationPrompt,
  getOutlinePlayerActorPrompt,
  getOutlineLocationsPrompt,
  getOutlineFactionsPrompt,
  getOutlineNpcsRelationshipsPrompt,
  getOutlineQuestsPrompt,
  getOutlineKnowledgePrompt,
  getOutlineTimelinePrompt,
  getOutlineAtmospherePrompt,
  getOutlineOpeningNarrativePrompt,
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
        promptId: "outline.image_seed",
        build: () =>
          getOutlineImageSeedPrompt("en", "vfs_finish_outline_image_seed"),
      },
      {
        promptId: "outline.master_plan",
        build: () =>
          getOutlineMasterPlanPrompt(
            "fantasy",
            "en",
            "ctx",
            false,
            "wanderer",
            "vfs_finish_outline_master_plan",
          ),
      },
      {
        promptId: "outline.world_foundation",
        build: () =>
          getOutlineWorldFoundationPrompt(
            "fantasy",
            "en",
            "ctx",
            false,
            "wanderer",
            "vfs_finish_outline_world_foundation",
          ),
      },
      {
        promptId: "outline.player_actor",
        build: () =>
          getOutlinePlayerActorPrompt(
            "wanderer",
            "vfs_finish_outline_player_actor",
          ),
      },
      {
        promptId: "outline.locations",
        build: () => getOutlineLocationsPrompt("vfs_finish_outline_locations"),
      },
      {
        promptId: "outline.factions",
        build: () => getOutlineFactionsPrompt("vfs_finish_outline_factions"),
      },
      {
        promptId: "outline.npcs_relationships",
        build: () =>
          getOutlineNpcsRelationshipsPrompt(
            "vfs_finish_outline_npcs_relationships",
          ),
      },
      {
        promptId: "outline.quests",
        build: () => getOutlineQuestsPrompt("vfs_finish_outline_quests"),
      },
      {
        promptId: "outline.knowledge",
        build: () => getOutlineKnowledgePrompt("vfs_finish_outline_knowledge"),
      },
      {
        promptId: "outline.timeline",
        build: () => getOutlineTimelinePrompt("vfs_finish_outline_timeline"),
      },
      {
        promptId: "outline.atmosphere",
        build: () =>
          getOutlineAtmospherePrompt("vfs_finish_outline_atmosphere"),
      },
      {
        promptId: "outline.opening_narrative",
        build: () =>
          getOutlineOpeningNarrativePrompt(
            false,
            "vfs_finish_outline_opening_narrative",
          ),
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
