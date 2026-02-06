import { describe, expect, it } from "vitest";
import type { GameState, StorySegment, TokenUsage } from "../types";
import { createModelNode } from "./gameActionHelpers";

const baseUsage: TokenUsage = {
  promptTokens: 10,
  completionTokens: 5,
  totalTokens: 15,
};

const createUserNode = (
  id: string = "user-1",
  segmentIdx: number = 2,
): StorySegment => ({
  id,
  parentId: null,
  text: "player action",
  choices: [],
  role: "user",
  timestamp: 0,
  segmentIdx,
  ending: "continue",
});

const createMinimalGameState = (overrides: Partial<GameState> = {}): GameState => {
  const userNode = createUserNode();
  const base: GameState = {
    nodes: { [userNode.id]: userNode },
    activeNodeId: userNode.id,
    rootNodeId: userNode.id,
    currentFork: [userNode],

    actors: [],
    playerActorId: "char:player",
    placeholders: [],

    inventory: [],
    npcs: [],
    quests: [],
    character: {} as any,
    knowledge: [],
    factions: [],
    worldInfo: null,

    currentLocation: "loc:start",
    locations: [],
    locationItemsByLocationId: {},

    uiState: {
      inventory: { pinnedIds: [], customOrder: [] },
      locations: { pinnedIds: [], customOrder: [] },
      npcs: { pinnedIds: [], customOrder: [] },
      knowledge: { pinnedIds: [], customOrder: [] },
      quests: { pinnedIds: [], customOrder: [] },
    },

    outline: null,
    summaries: [],
    lastSummarizedIndex: 0,

    isProcessing: false,
    isImageGenerating: false,
    generatingNodeId: null,
    error: null,
    atmosphere: { envTheme: "fantasy", ambience: "quiet" },
    theme: "Fantasy",
    time: "Dawn",

    language: "en",
    tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    logs: [],
    timeline: [],
    causalChains: [],

    turnNumber: 1,
    forkId: 0,
    forkTree: {
      nodes: {
        0: {
          id: 0,
          parentId: null,
          createdAt: 0,
          createdAtTurn: 0,
          sourceNodeId: "",
        },
      },
      nextForkId: 1,
    },
  };

  return {
    ...base,
    ...overrides,
  };
};

describe("createModelNode", () => {
  it("throws when finalState is missing", () => {
    const gameState = createMinimalGameState();

    expect(() =>
      createModelNode(
        { narrative: "narrative", choices: [] },
        gameState,
        "user-1",
        false,
        [],
        0,
        undefined,
        baseUsage,
        "segment-1",
      ),
    ).toThrow("Missing final state for model node snapshot.");
  });

  it("sanitizes mixed choice formats into stable output", () => {
    const gameState = createMinimalGameState();
    const finalState = createMinimalGameState({
      currentLocation: "loc:mid",
      time: "Noon",
    });

    const { modelNode } = createModelNode(
      {
        narrative: "A fork in the road.",
        choices: [
          { text: "Go left", consequence: "safer" },
          { choice: "Go right" },
          { label: "Wait" },
          { unknown: "field" },
          "Look around",
          42,
        ],
        finalState,
      },
      gameState,
      "user-1",
      false,
      [],
      3,
      undefined,
      baseUsage,
      "segment-2",
    );

    expect(modelNode.choices).toEqual([
      { text: "Go left", consequence: "safer" },
      { text: "Go right", consequence: undefined },
      { text: "Wait", consequence: undefined },
      { text: "Continue", consequence: undefined },
      "Look around",
      "42",
    ]);
    expect(modelNode.segmentIdx).toBe(3);
  });

  it("forces envTheme when forceTheme is provided", () => {
    const gameState = createMinimalGameState({
      atmosphere: { envTheme: "modern", ambience: "city" },
    });
    const finalState = createMinimalGameState({
      currentLocation: "loc:final",
      time: "Night",
    });

    const { responseAtmosphere, modelNode } = createModelNode(
      {
        narrative: "Storm clouds gather.",
        choices: [],
        atmosphere: {
          envTheme: "nature",
          ambience: "forest",
        },
        finalState,
      },
      gameState,
      "user-1",
      false,
      [],
      2,
      undefined,
      baseUsage,
      "segment-3",
      "horror",
    );

    expect(responseAtmosphere).toMatchObject({
      envTheme: "horror",
      ambience: "forest",
    });
    expect(modelNode.stateSnapshot?.atmosphere.envTheme).toBe("horror");
  });
});
