import { describe, it, expect } from "vitest";
import type { GameState } from "../types";
import { mergeDerivedViewState } from "./vfsViewState";

const makeState = (overrides: Partial<GameState> = {}): GameState =>
  ({
    nodes: {},
    activeNodeId: null,
    rootNodeId: null,
    currentFork: [],
    inventory: [],
    npcs: [],
    quests: [],
    character: {} as any,
    knowledge: [],
    factions: [],
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
        feedLayout: "cards",
      },
      language: "en",
    });

    const derived = makeState({
      currentLocation: "Dock District",
      theme: "noir",
      time: "Night 1, 22:00",
      turnNumber: 3,
      forkId: 2,
    });

    const merged = mergeDerivedViewState(base, derived);

    expect(merged.currentLocation).toBe("Dock District");
    expect(merged.theme).toBe("noir");
    expect(merged.turnNumber).toBe(3);
    expect(merged.forkId).toBe(2);
    expect(merged.uiState.feedLayout).toBe("cards");
    expect(merged.language).toBe("en");
  });
});
