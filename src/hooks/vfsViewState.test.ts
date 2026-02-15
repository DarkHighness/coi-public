import { describe, it, expect } from "vitest";
import type { GameState } from "../types";
import { mergeDerivedViewState } from "./vfsViewState";

const makeState = (overrides: Partial<GameState> = {}): GameState =>
  ({
    nodes: {},
    activeNodeId: null,
    rootNodeId: null,
    currentFork: [],
    actors: [],
    playerActorId: "char:player",
    placeholders: [],
    locationItemsByLocationId: {},
    inventory: [],
    npcs: [],
    quests: [],
    character: {} as any,
    knowledge: [],
    factions: [],
    worldInfo: null,
    currentLocation: "Base Camp",
    locations: [],
    uiState: {
      inventory: { pinnedIds: [], customOrder: [] },
      locations: { pinnedIds: [], customOrder: [] },
      npcs: { pinnedIds: [], customOrder: [] },
      knowledge: { pinnedIds: [], customOrder: [] },
      quests: { pinnedIds: [], customOrder: [] },
      feedLayout: "scroll",
    },
    outline: null,
    summaries: [],
    lastSummarizedIndex: 0,
    isProcessing: false,
    isImageGenerating: false,
    generatingNodeId: null,
    error: null,
    atmosphere: { envTheme: "fantasy", ambience: "quiet" } as any,
    theme: "fantasy",
    time: "Day 1, 08:00",
    language: "zh",
    tokenUsage: {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      cacheRead: 0,
      cacheWrite: 0,
    },
    logs: [],
    timeline: [],
    causalChains: [],
    turnNumber: 0,
    forkId: 0,
    forkTree: { nodes: {}, nextForkId: 1 } as any,
    customRules: [],
    ...overrides,
  }) as GameState;

describe("mergeDerivedViewState", () => {
  it("prefers derived world state and preserves UI/meta fields", () => {
    const base = makeState({
      uiState: {
        inventory: { pinnedIds: [], customOrder: [] },
        locations: { pinnedIds: [], customOrder: [] },
        npcs: { pinnedIds: [], customOrder: [] },
        knowledge: { pinnedIds: [], customOrder: [] },
        quests: { pinnedIds: [], customOrder: [] },
        feedLayout: "scroll",
      },
      language: "en",
    });

    const derived = makeState({
      currentLocation: "Dock District",
      theme: "noir",
      time: "Night 1, 22:00",
      turnNumber: 3,
      forkId: 2,
      language: "fr",
    });

    const merged = mergeDerivedViewState(base, derived);

    expect(merged.currentLocation).toBe("Dock District");
    expect(merged.theme).toBe("noir");
    expect(merged.turnNumber).toBe(3);
    expect(merged.forkId).toBe(2);
    expect(merged.uiState.feedLayout).toBe("scroll");
    expect(merged.language).toBe("fr");
  });

  it("can reset runtime flags and prefer derived outline", () => {
    const base = makeState({
      error: "boom",
      isProcessing: true,
      outline: { title: "Old" } as any,
    });
    const derived = makeState({
      outline: { title: "New" } as any,
    });

    const merged = mergeDerivedViewState(base, derived, { resetRuntime: true });

    expect(merged.error).toBeNull();
    expect(merged.isProcessing).toBe(false);
    expect(merged.outline?.title).toBe("New");
  });

  it("preserves playerRate metadata when derived nodes omit it", () => {
    const base = makeState({
      nodes: {
        "model-fork-0/turn-1": {
          id: "model-fork-0/turn-1",
          parentId: null,
          text: "Base",
          choices: [],
          imagePrompt: "",
          role: "model",
          timestamp: 1,
          segmentIdx: 0,
          ending: "continue",
          playerRate: {
            vote: "up",
            createdAt: 100,
            processedAt: 200,
          },
        } as any,
      },
      activeNodeId: "model-fork-0/turn-1",
    });

    const derived = makeState({
      nodes: {
        "model-fork-0/turn-1": {
          id: "model-fork-0/turn-1",
          parentId: null,
          text: "Derived",
          choices: [],
          imagePrompt: "",
          role: "model",
          timestamp: 2,
          segmentIdx: 0,
          ending: "continue",
        } as any,
      },
      activeNodeId: "model-fork-0/turn-1",
    });

    const merged = mergeDerivedViewState(base, derived);
    expect(merged.nodes["model-fork-0/turn-1"]?.playerRate).toEqual({
      vote: "up",
      createdAt: 100,
      processedAt: 200,
    });
  });
});
