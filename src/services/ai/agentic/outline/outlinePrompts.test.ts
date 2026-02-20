import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPhasePrompt } from "./outlinePrompts";
import type { OutlinePhaseSharedContext } from "../../../prompts";
import type { OutlinePhaseId } from "../../../../types";

const promptsMock = vi.hoisted(() => ({
  getOutlinePhasePreludePrompt: vi.fn(),
  getOutlineImageSeedPrompt: vi.fn(),
  getOutlineMasterPlanPrompt: vi.fn(),
  getOutlinePlaceholderRegistryPrompt: vi.fn(),
  getOutlineWorldFoundationPrompt: vi.fn(),
  getOutlinePlayerActorPrompt: vi.fn(),
  getOutlineLocationsPrompt: vi.fn(),
  getOutlineFactionsPrompt: vi.fn(),
  getOutlineNpcsRelationshipsPrompt: vi.fn(),
  getOutlineQuestsPrompt: vi.fn(),
  getOutlineKnowledgePrompt: vi.fn(),
  getOutlineTimelinePrompt: vi.fn(),
  getOutlineAtmospherePrompt: vi.fn(),
  getOutlineOpeningNarrativePrompt: vi.fn(),
}));

vi.mock("../../../prompts/index", () => ({
  getOutlinePhasePreludePrompt: promptsMock.getOutlinePhasePreludePrompt,
  getOutlineImageSeedPrompt: promptsMock.getOutlineImageSeedPrompt,
  getOutlineMasterPlanPrompt: promptsMock.getOutlineMasterPlanPrompt,
  getOutlinePlaceholderRegistryPrompt:
    promptsMock.getOutlinePlaceholderRegistryPrompt,
  getOutlineWorldFoundationPrompt: promptsMock.getOutlineWorldFoundationPrompt,
  getOutlinePlayerActorPrompt: promptsMock.getOutlinePlayerActorPrompt,
  getOutlineLocationsPrompt: promptsMock.getOutlineLocationsPrompt,
  getOutlineFactionsPrompt: promptsMock.getOutlineFactionsPrompt,
  getOutlineNpcsRelationshipsPrompt:
    promptsMock.getOutlineNpcsRelationshipsPrompt,
  getOutlineQuestsPrompt: promptsMock.getOutlineQuestsPrompt,
  getOutlineKnowledgePrompt: promptsMock.getOutlineKnowledgePrompt,
  getOutlineTimelinePrompt: promptsMock.getOutlineTimelinePrompt,
  getOutlineAtmospherePrompt: promptsMock.getOutlineAtmospherePrompt,
  getOutlineOpeningNarrativePrompt:
    promptsMock.getOutlineOpeningNarrativePrompt,
}));

describe("outlinePrompts", () => {
  const sharedContext: OutlinePhaseSharedContext = {
    theme: "th",
    language: "en",
    customContext: "ctx",
    hasImageContext: true,
    protagonistFeature: "feat",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    promptsMock.getOutlinePhasePreludePrompt.mockReturnValue("prelude");
    promptsMock.getOutlineImageSeedPrompt.mockReturnValue("p0");
    promptsMock.getOutlineMasterPlanPrompt.mockReturnValue("p1");
    promptsMock.getOutlinePlaceholderRegistryPrompt.mockReturnValue("pp");
    promptsMock.getOutlineWorldFoundationPrompt.mockReturnValue("p2");
    promptsMock.getOutlinePlayerActorPrompt.mockReturnValue("p3");
    promptsMock.getOutlineLocationsPrompt.mockReturnValue("p4");
    promptsMock.getOutlineFactionsPrompt.mockReturnValue("p5");
    promptsMock.getOutlineNpcsRelationshipsPrompt.mockReturnValue("p6");
    promptsMock.getOutlineQuestsPrompt.mockReturnValue("p7");
    promptsMock.getOutlineKnowledgePrompt.mockReturnValue("p8");
    promptsMock.getOutlineTimelinePrompt.mockReturnValue("p9");
    promptsMock.getOutlineAtmospherePrompt.mockReturnValue("p10");
    promptsMock.getOutlineOpeningNarrativePrompt.mockReturnValue("p11");
  });

  it("routes each phaseId to corresponding prompt builder", () => {
    const phaseArgs: Array<[OutlinePhaseId, string]> = [
      ["image_seed", "p0"],
      ["master_plan", "p1"],
      ["placeholder_registry", "pp"],
      ["world_foundation", "p2"],
      ["player_actor", "p3"],
      ["locations", "p4"],
      ["factions", "p5"],
      ["npcs_relationships", "p6"],
      ["quests", "p7"],
      ["knowledge", "p8"],
      ["timeline", "p9"],
      ["atmosphere", "p10"],
      ["opening_narrative", "p11"],
    ];

    for (const [phaseId, body] of phaseArgs) {
      expect(getPhasePrompt(phaseId, 2, 11, "submit_tool", sharedContext)).toBe(
        `prelude\n\n${body}`,
      );
    }

    expect(promptsMock.getOutlineImageSeedPrompt).toHaveBeenCalledWith(
      "en",
      "submit_tool",
      2,
      11,
    );
    expect(promptsMock.getOutlineMasterPlanPrompt).toHaveBeenCalled();
    expect(
      promptsMock.getOutlinePlaceholderRegistryPrompt,
    ).toHaveBeenCalledWith("submit_tool", 2, 11);
    expect(promptsMock.getOutlineWorldFoundationPrompt).toHaveBeenCalled();
    expect(promptsMock.getOutlinePlayerActorPrompt).toHaveBeenCalledWith(
      "feat",
      "submit_tool",
      2,
      11,
      undefined,
    );
    expect(promptsMock.getOutlineLocationsPrompt).toHaveBeenCalledWith(
      "submit_tool",
      2,
      11,
    );
    expect(promptsMock.getOutlineFactionsPrompt).toHaveBeenCalledWith(
      "submit_tool",
      2,
      11,
    );
    expect(promptsMock.getOutlineNpcsRelationshipsPrompt).toHaveBeenCalledWith(
      "submit_tool",
      2,
      11,
    );
    expect(promptsMock.getOutlineQuestsPrompt).toHaveBeenCalledWith(
      "submit_tool",
      2,
      11,
    );
    expect(promptsMock.getOutlineKnowledgePrompt).toHaveBeenCalledWith(
      "submit_tool",
      2,
      11,
    );
    expect(promptsMock.getOutlineTimelinePrompt).toHaveBeenCalledWith(
      "submit_tool",
      2,
      11,
    );
    expect(promptsMock.getOutlineAtmospherePrompt).toHaveBeenCalledWith(
      "submit_tool",
      2,
      11,
    );
    expect(promptsMock.getOutlineOpeningNarrativePrompt).toHaveBeenCalledWith(
      true,
      "submit_tool",
      2,
      11,
    );

    expect(promptsMock.getOutlinePhasePreludePrompt).toHaveBeenCalledWith(
      "opening_narrative",
      2,
      11,
      "submit_tool",
      sharedContext,
    );
  });

  it("passes gender preference to player_actor prompt", () => {
    getPhasePrompt("player_actor", 5, 11, "submit_tool", {
      ...sharedContext,
      genderPreference: "pan_gender",
    });

    expect(promptsMock.getOutlinePlayerActorPrompt).toHaveBeenCalledWith(
      "feat",
      "submit_tool",
      5,
      11,
      "pan_gender",
    );
  });

  it("returns null for unknown phase ids", () => {
    expect(
      getPhasePrompt(
        "unknown_phase" as OutlinePhaseId,
        1,
        11,
        "submit_tool",
        sharedContext,
      ),
    ).toBeNull();
    expect(promptsMock.getOutlinePhasePreludePrompt).not.toHaveBeenCalled();
  });

  it("returns null when shared context is missing", () => {
    expect(getPhasePrompt("image_seed", 1, 11, "submit_tool")).toBeNull();
    expect(promptsMock.getOutlinePhasePreludePrompt).not.toHaveBeenCalled();
  });
});
