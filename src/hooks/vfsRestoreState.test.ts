import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameState } from "../types";
import { persistRuntimeStats, loadRuntimeStats } from "./runtimeStatsStore";
import { buildRestoredGameState } from "./vfsRestoreState";

const metadataStore = vi.hoisted(() => new Map<string, unknown>());

vi.mock("../utils/indexedDB", () => ({
  saveMetadata: vi.fn(async (key: string, value: unknown) => {
    metadataStore.set(key, value);
  }),
  loadMetadata: vi.fn(async (key: string) => {
    return metadataStore.get(key) ?? null;
  }),
}));

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
    customRules: [],
    ...overrides,
  }) as GameState;

describe("vfs restore runtime stats integration", () => {
  beforeEach(() => {
    metadataStore.clear();
  });

  it("restores token usage and logs after persist/load cycle", async () => {
    const slotId = "slot-integration";

    await persistRuntimeStats(slotId, {
      tokenUsage: {
        promptTokens: 120,
        completionTokens: 80,
        totalTokens: 200,
        cacheRead: 30,
        cacheWrite: 10,
      },
      logs: [
        {
          id: "turn-log-1",
          timestamp: 111,
          provider: "openai",
          model: "gpt",
          endpoint: "turn",
        },
      ],
    } as any);

    const runtimeStats = await loadRuntimeStats(slotId);

    const previous = makeState({
      tokenUsage: {
        promptTokens: 1,
        completionTokens: 1,
        totalTokens: 2,
        cacheRead: 0,
        cacheWrite: 0,
      },
      logs: [
        {
          id: "old-log",
          timestamp: 1,
          provider: "x",
          model: "y",
          endpoint: "turn",
        },
      ],
      uiState: {
        inventory: { pinnedIds: [], customOrder: [] },
        locations: { pinnedIds: [], customOrder: [] },
        npcs: { pinnedIds: [], customOrder: [] },
        knowledge: { pinnedIds: [], customOrder: [] },
        quests: { pinnedIds: [], customOrder: [] },
        feedLayout: "stack",
      },
      unlockMode: true,
      godMode: true,
    });

    const derived = makeState({
      currentLocation: "Dock District",
      turnNumber: 7,
      isProcessing: true,
      error: "temp",
    });

    const restored = buildRestoredGameState({
      previous,
      derived,
      storedUiState: { feedLayout: "scroll" },
      runtimeStats,
      mergeUiState: (base, stored) => ({
        ...base,
        ...(stored as any),
      }),
    });

    expect(restored.currentLocation).toBe("Dock District");
    expect(restored.turnNumber).toBe(7);
    expect(restored.isProcessing).toBe(false);
    expect(restored.error).toBeNull();

    expect(restored.tokenUsage).toEqual({
      promptTokens: 120,
      completionTokens: 80,
      totalTokens: 200,
      cacheRead: 30,
      cacheWrite: 10,
    });
    expect(restored.logs).toHaveLength(1);
    expect(restored.logs[0].id).toBe("turn-log-1");
    expect(restored.unlockMode).toBe(false);
    expect(restored.godMode).toBe(false);
  });

  it("restores unlockMode and godMode from runtime stats", async () => {
    const slotId = "slot-modes";

    await persistRuntimeStats(slotId, {
      tokenUsage: {
        promptTokens: 1,
        completionTokens: 2,
        totalTokens: 3,
        cacheRead: 0,
        cacheWrite: 0,
      },
      logs: [],
      unlockMode: true,
      godMode: true,
    } as any);

    const runtimeStats = await loadRuntimeStats(slotId);

    const restored = buildRestoredGameState({
      previous: makeState({ unlockMode: false, godMode: false }),
      derived: makeState({ unlockMode: false, godMode: false }),
      storedUiState: {},
      runtimeStats,
      mergeUiState: (base) => base,
    });

    expect(restored.unlockMode).toBe(true);
    expect(restored.godMode).toBe(true);
  });
});
