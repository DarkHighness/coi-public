import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameState, StorySegment, TokenUsage } from "../types";

const summarizeContextMock = vi.hoisted(() => vi.fn());
const getProviderConfigMock = vi.hoisted(() => vi.fn());
const getProviderInstanceMock = vi.hoisted(() => vi.fn());
const getModelsForInstanceMock = vi.hoisted(() => vi.fn());
const conversationMock = vi.hoisted(() => ({
  writeSessionHistoryJsonl: vi.fn(),
}));
const sessionManagerMock = vi.hoisted(() => ({
  getOrCreateSession: vi.fn(),
  onSummaryCreated: vi.fn(),
  getHistory: vi.fn(),
  invalidate: vi.fn(),
}));

vi.mock("../services/aiService", () => ({
  summarizeContext: summarizeContextMock,
}));

vi.mock("../services/ai/provider/registry", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../services/ai/provider/registry")>();
  return {
    ...actual,
    getProviderConfig: getProviderConfigMock,
    getProviderInstance: getProviderInstanceMock,
    getModelsForInstance: getModelsForInstanceMock,
  };
});

vi.mock("../services/ai/sessionManager", () => ({
  sessionManager: sessionManagerMock,
}));

vi.mock("../services/vfs/conversation", () => ({
  writeSessionHistoryJsonl: conversationMock.writeSessionHistoryJsonl,
}));

import {
  createModelNode,
  handleSummarization,
  notifySessionSummaryCreated,
} from "./gameActionHelpers";

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

const createMinimalGameState = (
  overrides: Partial<GameState> = {},
): GameState => {
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
  getProviderConfigMock.mockReturnValue({
    instance: { id: "provider-1", protocol: "openai" },
    modelId: "model-1",
  });
  getProviderInstanceMock.mockReturnValue({
    id: "provider-1",
    protocol: "openai",
  });
  sessionManagerMock.getOrCreateSession.mockResolvedValue({
    id: "slot-1:0:provider-1:model-1",
  });
  sessionManagerMock.onSummaryCreated.mockResolvedValue(undefined);
  sessionManagerMock.getHistory.mockReturnValue([]);
  sessionManagerMock.invalidate.mockResolvedValue(undefined);
  getModelsForInstanceMock.mockReset();
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
        null,
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
      null,
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
      null,
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

  it("resolves summarization context window without fetching model list", async () => {
    const parentNode = {
      id: "model-parent",
      parentId: null,
      role: "model",
      text: "parent",
      choices: [],
      segmentIdx: 0,
      summarizedIndex: 0,
      summaries: [],
      usage: { promptTokens: 120 },
      timestamp: 0,
      ending: "continue",
    } as any;
    const gameState = createMinimalGameState({
      nodes: { [parentNode.id]: parentNode },
      activeNodeId: parentNode.id,
      forkId: 0,
    });

    await handleSummarization(
      gameState,
      parentNode.id,
      "user-temp",
      "",
      [],
      0,
      false,
      aiSettings,
      "en",
      {} as any,
      "slot-1",
      0,
      false,
    );

    expect(getModelsForInstanceMock).not.toHaveBeenCalled();
  });

  it("does not auto-compact from legacy aggregated usage without context snapshot", async () => {
    const parentNode = {
      id: "model-parent",
      parentId: null,
      role: "model",
      text: "parent",
      choices: [],
      segmentIdx: 0,
      summarizedIndex: 0,
      summaries: [],
      usage: { promptTokens: 600000, totalTokens: 600000, reported: true },
      timestamp: 0,
      ending: "continue",
    } as any;
    const gameState = createMinimalGameState({
      nodes: { [parentNode.id]: parentNode },
      activeNodeId: parentNode.id,
      forkId: 0,
    });

    await handleSummarization(
      gameState,
      parentNode.id,
      "user-temp",
      "",
      [],
      0,
      false,
      aiSettings,
      "en",
      {} as any,
      "slot-1",
      0,
      false,
    );

    expect(summarizeContextMock).not.toHaveBeenCalled();
  });

  it("does not auto-compact when snapshot ratio is below threshold", async () => {
    const parentNode = {
      id: "model-parent",
      parentId: null,
      role: "model",
      text: "parent",
      choices: [],
      segmentIdx: 0,
      summarizedIndex: 0,
      summaries: [],
      contextUsage: {
        usageTokens: 100000,
        totalTokens: 100000,
        promptTokens: 96000,
        completionTokens: 4000,
        contextWindowTokens: 300000,
        usageRatio: 100000 / 300000,
        autoCompactThreshold: 0.7,
        thresholdTokens: 210000,
        tokensToThreshold: 110000,
        source: "fallback.default",
      },
      timestamp: 0,
      ending: "continue",
    } as any;
    const gameState = createMinimalGameState({
      nodes: { [parentNode.id]: parentNode },
      activeNodeId: parentNode.id,
      forkId: 0,
    });

    await handleSummarization(
      gameState,
      parentNode.id,
      "user-temp",
      "",
      [],
      0,
      false,
      aiSettings,
      "en",
      {} as any,
      "slot-1",
      0,
      false,
    );

    expect(summarizeContextMock).not.toHaveBeenCalled();
  });

  it("auto-compacts when parent context usage exceeds threshold", async () => {
    const parentNode = {
      id: "model-parent",
      parentId: null,
      role: "model",
      text: "parent",
      choices: [],
      segmentIdx: 0,
      summarizedIndex: 0,
      summaries: [],
      contextUsage: {
        usageTokens: 90000,
        totalTokens: 90000,
        promptTokens: 85000,
        completionTokens: 5000,
        contextWindowTokens: 128000,
        usageRatio: 0.703125,
        autoCompactThreshold: 0.7,
        thresholdTokens: 89600,
        tokensToThreshold: 0,
        source: "fallback.default",
      },
      timestamp: 0,
      ending: "continue",
    } as any;
    const gameState = createMinimalGameState({
      nodes: { [parentNode.id]: parentNode },
      activeNodeId: parentNode.id,
      forkId: 0,
    });
    summarizeContextMock.mockResolvedValue({
      summary: createSummary("auto-compact", 0),
      logs: [],
    });

    await handleSummarization(
      gameState,
      parentNode.id,
      "user-temp",
      "",
      [],
      0,
      false,
      aiSettings,
      "en",
      {} as any,
      "slot-1",
      0,
      false,
    );

    expect(summarizeContextMock).toHaveBeenCalled();
  });
});

describe("notifySessionSummaryCreated", () => {
  it("invalidates summary and cleanup sessions after summary creation", async () => {
    const vfsSession = {
      setActiveForkId: vi.fn(),
      beginReadEpoch: vi.fn(),
    } as any;

    await notifySessionSummaryCreated(
      {
        story: {
          providerId: "provider-1",
          modelId: "model-1",
        },
        providers: {
          instances: [
            {
              id: "provider-1",
              protocol: "openai",
              enabled: true,
            },
          ],
          defaultProviderId: "provider-1",
        },
      } as any,
      "slot-1",
      0,
      "summary-1",
      vfsSession,
    );

    expect(sessionManagerMock.onSummaryCreated).toHaveBeenCalledWith(
      "slot-1:0:provider-1:model-1",
      "summary-1",
    );
    expect(sessionManagerMock.getOrCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({ slotId: "slot-1:summary" }),
    );
    expect(sessionManagerMock.getOrCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({ slotId: "slot-1:cleanup" }),
    );
    expect(sessionManagerMock.invalidate).toHaveBeenCalledTimes(2);
    expect(conversationMock.writeSessionHistoryJsonl).toHaveBeenCalledWith(
      vfsSession,
      [],
      { operation: "finish_commit" },
    );
    expect(vfsSession.beginReadEpoch).toHaveBeenCalledWith("summary_created");
  });
});
