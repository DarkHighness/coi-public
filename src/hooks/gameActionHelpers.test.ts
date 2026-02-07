import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameState, StorySegment, TokenUsage } from "../types";

const summarizeContextMock = vi.hoisted(() => vi.fn());

vi.mock("../services/aiService", () => ({
  summarizeContext: summarizeContextMock,
}));

import { createModelNode, handleSummarization } from "./gameActionHelpers";

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

const createSummary = (id: string, toIndex: number) =>
  ({
    id,
    displayText: "summary",
    visible: {
      narrative: "narrative",
      majorEvents: [],
      characterDevelopment: "",
      worldState: "",
    },
    hidden: {
      truthNarrative: "",
      hiddenPlots: [],
      npcActions: [],
      worldTruth: "",
      unrevealed: [],
    },
    nodeRange: { fromIndex: 0, toIndex },
    lastSummarizedIndex: toIndex + 1,
  }) as any;

beforeEach(() => {
  vi.clearAllMocks();
});

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

describe("handleSummarization", () => {
  const aiSettings = {
    story: { providerId: "p1", modelId: "m1" },
    extra: { autoCompactEnabled: true, autoCompactThreshold: 0.7 },
  } as any;

  it("uses explicit currentForkId instead of gameState.forkId", async () => {
    const parentNode = {
      id: "model-parent",
      parentId: null,
      role: "model",
      text: "parent",
      choices: [],
      segmentIdx: 0,
      summarizedIndex: 0,
      summaries: [],
      usage: { promptTokens: 100 },
      timestamp: 0,
      ending: "continue",
    } as any;

    const gameState = createMinimalGameState({
      nodes: { [parentNode.id]: parentNode },
      activeNodeId: parentNode.id,
      forkId: 1,
    });

    summarizeContextMock.mockResolvedValue({
      summary: createSummary("s1", 0),
      logs: [],
    });

    await handleSummarization(
      gameState,
      parentNode.id,
      "user-temp",
      "Inspect the room",
      [],
      0,
      false,
      aiSettings,
      "en",
      {} as any,
      "slot-1",
      7,
      true,
    );

    expect(summarizeContextMock).toHaveBeenCalledWith(
      expect.objectContaining({ forkId: 7 }),
    );
  });

  it("keeps compact boundary on committed nodes only and excludes pending action", async () => {
    const parentNode = {
      id: "model-parent",
      parentId: null,
      role: "model",
      text: "parent",
      choices: [],
      segmentIdx: 0,
      summarizedIndex: 0,
      summaries: [],
      usage: { promptTokens: 100 },
      timestamp: 0,
      ending: "continue",
    } as any;

    const gameState = createMinimalGameState({
      nodes: { [parentNode.id]: parentNode },
      activeNodeId: parentNode.id,
      forkId: 0,
    });

    summarizeContextMock.mockResolvedValue({
      summary: createSummary("s2", 0),
      logs: [],
    });

    const result = await handleSummarization(
      gameState,
      parentNode.id,
      "user-temp",
      "Pending player action",
      [],
      0,
      false,
      aiSettings,
      "en",
      {} as any,
      "slot-1",
      0,
      true,
    );

    expect(summarizeContextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        nodeRange: { fromIndex: 0, toIndex: 0 },
        pendingPlayerAction: {
          segmentIdx: 1,
          text: "Pending player action",
        },
      }),
    );
    expect(result.lastIndex).toBe(1);
    expect(result.contextNodes).toHaveLength(2);
  });
});
