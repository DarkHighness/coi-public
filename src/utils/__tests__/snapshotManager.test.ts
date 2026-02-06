import { describe, expect, it } from "vitest";
import {
  createFork,
  createStateSnapshot,
  getAncestorForkIds,
  restoreStateFromSnapshot,
} from "../snapshotManager";

const createMinimalGameState = (overrides: Record<string, unknown> = {}) =>
  ({
    actors: [],
    playerActorId: "char:player",
    placeholders: [],
    locationItemsByLocationId: {},

    inventory: [],
    npcs: [],
    quests: [],
    character: {},
    knowledge: [],
    locations: [],
    currentLocation: "loc:start",
    factions: [],

    timeline: [],
    causalChains: [],

    uiState: {
      inventory: { pinnedIds: [], customOrder: [] },
      locations: { pinnedIds: [], customOrder: [] },
      npcs: { pinnedIds: [], customOrder: [] },
      knowledge: { pinnedIds: [], customOrder: [] },
      quests: { pinnedIds: [], customOrder: [] },
    },
    atmosphere: { envTheme: "fantasy", ambience: "quiet" },
    time: "Day 1",
    turnNumber: 2,
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
    ...overrides,
  }) as any;

describe("snapshotManager", () => {
  it("creates snapshot with metadata and fallback currentLocation", () => {
    const state = createMinimalGameState({ currentLocation: "" });

    const snapshot = createStateSnapshot(state, {
      summaries: [],
      lastSummarizedIndex: 3,
      currentLocation: "loc:fallback",
      time: "Night",
      atmosphere: { envTheme: "horror", ambience: "storm" },
      uiState: state.uiState,
      turnNumber: 9,
      forkId: 7,
      forkTree: {
        nodes: {
          7: {
            id: 7,
            parentId: 0,
            createdAt: 1,
            createdAtTurn: 9,
            sourceNodeId: "node-9",
          },
        },
        nextForkId: 8,
      },
    });

    expect(snapshot.currentLocation).toBe("loc:fallback");
    expect(snapshot.time).toBe("Night");
    expect(snapshot.lastSummarizedIndex).toBe(3);
    expect(snapshot.atmosphere).toEqual({ envTheme: "horror", ambience: "storm" });
    expect(snapshot.turnNumber).toBe(9);
    expect(snapshot.forkId).toBe(7);
    expect(snapshot.forkTree.nextForkId).toBe(8);
  });

  it("restores snapshot fields but keeps current fork metadata", () => {
    const currentState = createMinimalGameState({
      forkId: 99,
      forkTree: {
        nodes: {
          99: {
            id: 99,
            parentId: null,
            createdAt: 0,
            createdAtTurn: 0,
            sourceNodeId: "",
          },
        },
        nextForkId: 100,
      },
      atmosphere: { envTheme: "modern", ambience: "city" },
    });

    const snapshot = createStateSnapshot(createMinimalGameState({ currentLocation: "" }), {
      summaries: [],
      lastSummarizedIndex: 1,
      currentLocation: "loc:snapshot",
      time: "Dusk",
      atmosphere: { envTheme: "fantasy", ambience: "forest" },
      uiState: currentState.uiState,
      turnNumber: 5,
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
    });

    const restored = restoreStateFromSnapshot(currentState, snapshot);

    expect(restored.currentLocation).toBe("loc:snapshot");
    expect(restored.time).toBe("Dusk");
    expect(restored.atmosphere).toEqual({ envTheme: "fantasy", ambience: "forest" });

    expect(restored.forkId).toBe(99);
    expect(restored.forkTree.nextForkId).toBe(100);
  });

  it("creates a new fork node with correct linkage", () => {
    const tree = {
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
    };

    const forkResult = createFork(0, tree, "node-source", 12);

    expect(forkResult.newForkId).toBe(1);
    expect(forkResult.newForkTree.nextForkId).toBe(2);
    expect(forkResult.newForkTree.nodes[1]).toMatchObject({
      id: 1,
      parentId: 0,
      createdAtTurn: 12,
      sourceNodeId: "node-source",
    });
  });

  it("resolves ancestor chain from leaf to root", () => {
    const forkTree = {
      nodes: {
        0: { id: 0, parentId: null, createdAt: 0, createdAtTurn: 0, sourceNodeId: "" },
        1: { id: 1, parentId: 0, createdAt: 1, createdAtTurn: 1, sourceNodeId: "n1" },
        2: { id: 2, parentId: 1, createdAt: 2, createdAtTurn: 2, sourceNodeId: "n2" },
      },
      nextForkId: 3,
    };

    expect(getAncestorForkIds(2, forkTree as any)).toEqual([2, 1, 0]);
    expect(getAncestorForkIds(999, forkTree as any)).toEqual([999]);
  });
});
