import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCommandActions } from "./commandActions";

const generateForceUpdateMock = vi.hoisted(() => vi.fn());
const generateEntityCleanupMock = vi.hoisted(() => vi.fn());
const generateAdventureTurnMock = vi.hoisted(() => vi.fn());
const deriveGameStateFromVfsMock = vi.hoisted(() => vi.fn());
const mergeDerivedViewStateMock = vi.hoisted(() => vi.fn());
const createStateSnapshotMock = vi.hoisted(() => vi.fn());
const createForkMock = vi.hoisted(() => vi.fn());
const forkConversationMock = vi.hoisted(() => vi.fn());
const writeForkTreeMock = vi.hoisted(() => vi.fn());
const updateRAGDocumentsBackgroundMock = vi.hoisted(() => vi.fn());
const rebuildSessionsAfterHeavyMutationMock = vi.hoisted(() => vi.fn());

vi.mock("../../services/aiService", () => ({
  generateForceUpdate: generateForceUpdateMock,
  generateEntityCleanup: generateEntityCleanupMock,
  generateAdventureTurn: generateAdventureTurnMock,
}));

vi.mock("../../services/vfs/derivations", () => ({
  deriveGameStateFromVfs: deriveGameStateFromVfsMock,
}));

vi.mock("../../services/vfs/conversation", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../services/vfs/conversation")>();
  return {
    ...actual,
    forkConversation: forkConversationMock,
    writeForkTree: writeForkTreeMock,
  };
});

vi.mock("../../hooks/vfsViewState", () => ({
  mergeDerivedViewState: mergeDerivedViewStateMock,
}));

vi.mock("../../utils/snapshotManager", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../utils/snapshotManager")>();
  return {
    ...actual,
    createFork: createForkMock,
    createStateSnapshot: createStateSnapshotMock,
  };
});

vi.mock("./ragDocuments", () => ({
  updateRAGDocumentsBackground: updateRAGDocumentsBackgroundMock,
}));

vi.mock("../../hooks/gameActionHelpers", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../hooks/gameActionHelpers")>();
  return {
    ...actual,
    rebuildSessionsAfterHeavyMutation: rebuildSessionsAfterHeavyMutationMock,
  };
});

function createBaseGameState() {
  const rootNode = {
    id: "model-root",
    parentId: null,
    text: "root",
    role: "model",
    segmentIdx: 0,
    choices: [],
    imagePrompt: "",
    timestamp: 1,
    summaries: [],
    summarizedIndex: 0,
    ending: "continue",
    stateSnapshot: {},
  } as any;

  return {
    nodes: { [rootNode.id]: rootNode },
    activeNodeId: rootNode.id,
    rootNodeId: rootNode.id,
    currentFork: [rootNode],
    isProcessing: false,
    liveToolCalls: [],
    error: null,
    logs: [],
    theme: "fantasy",
    atmosphere: { envTheme: "fantasy", ambience: "quiet" },
    currentLocation: "loc:start",
    time: "Day 1",
    veoScript: undefined,
    uiState: {
      inventory: { pinnedIds: [], customOrder: [] },
      locations: { pinnedIds: [], customOrder: [] },
      npcs: { pinnedIds: [], customOrder: [] },
      knowledge: { pinnedIds: [], customOrder: [] },
      quests: { pinnedIds: [], customOrder: [] },
    },
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
    factions: [],
    timeline: [],
    causalChains: [],
    summaries: [],
    lastSummarizedIndex: 0,
    turnNumber: 0,
    forkId: 0,
    forkTree: { nodes: { 0: { id: 0, parentId: null } }, nextForkId: 1 },
  } as any;
}

function createDeps(overrides: Record<string, unknown> = {}) {
  const gameStateRef = { current: createBaseGameState() } as any;
  const setGameState = vi.fn((updater: any) => {
    if (typeof updater === "function") {
      gameStateRef.current = updater(gameStateRef.current);
      return;
    }
    gameStateRef.current = updater;
  });

  const vfsSession = {
    snapshot: vi.fn(() => ({
      "world/global.json": {
        content: "{}",
        contentType: "application/json",
      },
    })),
    deleteFile: vi.fn(),
    writeFile: vi.fn(),
  } as any;

  return {
    aiSettings: {
      embedding: { enabled: false },
    } as any,
    language: "en" as any,
    currentSlotId: "slot-1",
    gameStateRef,
    setGameState,
    showToast: vi.fn(),
    t: (key: string) => key,
    vfsSession,
    restoreVfsToTurn: vi.fn(async () => true),
    saveToSlot: vi.fn(async () => true),
    triggerSave: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  rebuildSessionsAfterHeavyMutationMock.mockResolvedValue(undefined);
  createForkMock.mockImplementation(
    (
      currentForkId: number,
      currentForkTree: { nodes: Record<number, any>; nextForkId: number },
      sourceNodeId: string,
      currentTurn: number,
    ) => {
      const newForkId = currentForkTree.nextForkId;
      return {
        newForkId,
        newForkTree: {
          nodes: {
            ...currentForkTree.nodes,
            [newForkId]: {
              id: newForkId,
              parentId: currentForkId,
              createdAt: 0,
              createdAtTurn: currentTurn,
              sourceNodeId,
            },
          },
          nextForkId: newForkId + 1,
        },
      };
    },
  );
  forkConversationMock.mockImplementation(() => undefined);
  writeForkTreeMock.mockImplementation(() => undefined);

  createStateSnapshotMock.mockReturnValue({ snap: true });
  deriveGameStateFromVfsMock.mockImplementation(() => ({
    ...createBaseGameState(),
    currentLocation: "loc:derived",
    time: "Day 2",
  }));
  mergeDerivedViewStateMock.mockImplementation((base: any, derived: any) => ({
    ...base,
    ...derived,
  }));

  generateForceUpdateMock.mockResolvedValue({
    response: {
      narrative: "World updated.",
      choices: [{ text: "Continue" }],
      atmosphere: { envTheme: "fantasy", ambience: "storm" },
      narrativeTone: "tense",
    },
    logs: [],
  });

  generateEntityCleanupMock.mockResolvedValue({
    response: {
      narrative: "Cleanup complete.",
      choices: [{ text: "Continue" }],
    },
    logs: [],
    changedEntities: [],
  });

  generateAdventureTurnMock.mockResolvedValue({
    response: { narrative: "", choices: [] },
    logs: [],
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    changedEntities: [],
    _conversationHistory: [],
  });
});

describe("commandActions", () => {
  it("creates command + system nodes on force update success", async () => {
    const deps = createDeps();
    const actions = createCommandActions(deps as any);

    const result = await actions.handleForceUpdate(
      "Shift weather to thunderstorm",
    );

    expect(result).toEqual({ success: true });

    const nodes = Object.values(deps.gameStateRef.current.nodes) as any[];
    const commandNode = nodes.find((node) => node.role === "command");
    const systemNode = nodes.find(
      (node) => node.role === "system" && node.parentId === commandNode?.id,
    );

    expect(commandNode?.text).toBe("Shift weather to thunderstorm");
    expect(systemNode?.text).toBe("World updated.");
    expect(deps.gameStateRef.current.activeNodeId).toBe(systemNode?.id);
    expect(rebuildSessionsAfterHeavyMutationMock).toHaveBeenCalledTimes(1);
    expect(rebuildSessionsAfterHeavyMutationMock).toHaveBeenCalledWith(
      deps.aiSettings,
      "slot-1",
      0,
    );
    expect(deps.triggerSave).toHaveBeenCalledTimes(1);
  });

  it("fails safely and clears processing when force update snapshot is empty", async () => {
    const deps = createDeps({
      vfsSession: {
        snapshot: vi.fn(() => ({})),
        deleteFile: vi.fn(),
        writeFile: vi.fn(),
      },
    });

    const actions = createCommandActions(deps as any);
    const result = await actions.handleForceUpdate("Any change");

    expect(result.success).toBe(false);
    expect(result.error).toContain("VFS snapshot is empty after force update");
    expect(deps.gameStateRef.current.isProcessing).toBe(false);
  });

  it("restores baseline conversation files during cleanup", async () => {
    const baselineSnapshot = {
      "conversation/fork-0/turn-0.json": {
        content: "baseline",
        contentType: "application/json",
      },
      "world/global.json": {
        content: "{}",
        contentType: "application/json",
      },
    } as any;

    const afterCleanupSnapshot = {
      ...baselineSnapshot,
      "conversation/fork-0/turn-1.json": {
        content: "temp",
        contentType: "application/json",
      },
    } as any;

    const deps = createDeps({
      vfsSession: {
        snapshot: vi
          .fn()
          .mockReturnValueOnce(baselineSnapshot)
          .mockReturnValueOnce(afterCleanupSnapshot)
          .mockReturnValueOnce(baselineSnapshot),
        deleteFile: vi.fn(),
        writeFile: vi.fn(),
      },
    });

    const actions = createCommandActions(deps as any);
    const result = await actions.handleCleanupEntities();

    expect(result).toEqual({ success: true });
    expect(deps.vfsSession.deleteFile).toHaveBeenCalledWith(
      "conversation/fork-0/turn-1.json",
    );
    expect(deps.vfsSession.writeFile).toHaveBeenCalledWith(
      "conversation/fork-0/turn-0.json",
      "baseline",
      "application/json",
    );
    expect(rebuildSessionsAfterHeavyMutationMock).toHaveBeenCalledTimes(1);
    expect(rebuildSessionsAfterHeavyMutationMock).toHaveBeenCalledWith(
      deps.aiSettings,
      "slot-1",
      0,
    );
    expect(deps.triggerSave).toHaveBeenCalledTimes(1);
  });

  it("processes player rating immediately without adding visible nodes", async () => {
    const turnPayload = {
      turnId: "fork-0/turn-2",
      forkId: 0,
      turnNumber: 2,
      parentTurnId: "fork-0/turn-1",
      createdAt: 100,
      userAction: "inspect",
      assistant: { narrative: "result", choices: [{ text: "Continue" }] },
      meta: {},
    };

    const baseNode = {
      id: "model-fork-0/turn-2",
      parentId: "user-fork-0/turn-2",
      text: "result",
      role: "model",
      segmentIdx: 2,
      choices: [{ text: "Continue" }],
      imagePrompt: "",
      timestamp: 100,
      ending: "continue",
    } as any;

    const baselineSnapshot = {
      "conversation/turns/fork-0/turn-2.json": {
        content: JSON.stringify(turnPayload),
        contentType: "application/json",
      },
      "conversation/index.json": {
        content: JSON.stringify({ activeTurnId: "fork-0/turn-2" }),
        contentType: "application/json",
      },
      "world/global.json": {
        content: '{"time":"Day 1"}',
        contentType: "application/json",
      },
      "workspace/SOUL.md": {
        content: "# Player Soul (This Save)\n",
        contentType: "text/markdown",
      },
      "shared/config/workspace/USER.md": {
        content: "# Player Soul (Global)\n- Scope: Global\n",
        contentType: "text/markdown",
      },
    } as any;

    const afterRateSnapshot = {
      ...baselineSnapshot,
      "world/global.json": {
        content: '{"time":"Day 2"}',
        contentType: "application/json",
      },
      "workspace/SOUL.md": {
        content: "# Player Soul (This Save)\n- Last Updated: changed\n",
        contentType: "text/markdown",
      },
      "shared/config/workspace/USER.md": {
        content: "# Player Soul (Global)\n- Last Updated: changed\n",
        contentType: "text/markdown",
      },
    } as any;

    const deps = createDeps({
      vfsSession: {
        snapshot: vi
          .fn()
          .mockReturnValueOnce(baselineSnapshot)
          .mockReturnValueOnce(baselineSnapshot)
          .mockReturnValueOnce(afterRateSnapshot)
          .mockReturnValueOnce(baselineSnapshot)
          .mockReturnValueOnce(baselineSnapshot),
        deleteFile: vi.fn(),
        writeFile: vi.fn(),
      },
    });
    deps.gameStateRef.current = {
      ...createBaseGameState(),
      nodes: { [baseNode.id]: baseNode },
      activeNodeId: baseNode.id,
      currentFork: [baseNode],
    } as any;

    deriveGameStateFromVfsMock.mockImplementation(() => ({
      ...deps.gameStateRef.current,
      isProcessing: false,
      liveToolCalls: [],
    }));

    const actions = createCommandActions(deps as any);
    const beforeNodeCount = Object.keys(deps.gameStateRef.current.nodes).length;

    const result = await actions.handlePlayerRate("model-fork-0/turn-2", {
      vote: "down",
      preset: "AI flavor too strong",
      comment: "trim adjectives",
    });

    expect(result).toEqual({ success: true });
    expect(generateAdventureTurnMock).toHaveBeenCalledTimes(1);
    expect(generateAdventureTurnMock.mock.calls[0]?.[1]?.userAction).toContain(
      "[Player Rate]",
    );

    const afterNodeCount = Object.keys(deps.gameStateRef.current.nodes).length;
    expect(afterNodeCount).toBe(beforeNodeCount);
    expect(
      deps.gameStateRef.current.nodes["model-fork-0/turn-2"]?.playerRate,
    ).toMatchObject({
      vote: "down",
      preset: "AI flavor too strong",
      comment: "trim adjectives",
    });

    expect(deps.vfsSession.deleteFile).not.toHaveBeenCalled();
    expect(deps.vfsSession.writeFile).toHaveBeenCalledWith(
      "world/global.json",
      '{"time":"Day 1"}',
      "application/json",
    );
    expect(deps.triggerSave).toHaveBeenCalledTimes(1);
  });

  it("uses latest in-memory fork tree when creating a fork from restored history", async () => {
    const deps = createDeps();
    deps.gameStateRef.current = {
      ...createBaseGameState(),
      forkId: 4,
      forkTree: {
        nodes: {
          0: {
            id: 0,
            parentId: null,
            createdAt: 1,
            createdAtTurn: 0,
            sourceNodeId: "",
          },
          1: {
            id: 1,
            parentId: 0,
            createdAt: 2,
            createdAtTurn: 1,
            sourceNodeId: "model-fork-0/turn-1",
          },
          2: {
            id: 2,
            parentId: 1,
            createdAt: 3,
            createdAtTurn: 2,
            sourceNodeId: "model-fork-1/turn-2",
          },
          3: {
            id: 3,
            parentId: 2,
            createdAt: 4,
            createdAtTurn: 3,
            sourceNodeId: "model-fork-2/turn-3",
          },
          4: {
            id: 4,
            parentId: 3,
            createdAt: 5,
            createdAtTurn: 4,
            sourceNodeId: "model-fork-3/turn-4",
          },
        },
        nextForkId: 5,
      },
    } as any;

    deriveGameStateFromVfsMock
      .mockReset()
      // After restoreVfsToTurn: old snapshot with stale fork tree.
      .mockReturnValueOnce({
        ...createBaseGameState(),
        forkId: 0,
        forkTree: {
          nodes: {
            0: {
              id: 0,
              parentId: null,
              createdAt: 1,
              createdAtTurn: 0,
              sourceNodeId: "",
            },
          },
          nextForkId: 2,
        },
      })
      // After forkConversation/writeForkTree.
      .mockReturnValueOnce({
        ...createBaseGameState(),
        forkId: 5,
        forkTree: {
          nodes: {
            0: {
              id: 0,
              parentId: null,
              createdAt: 1,
              createdAtTurn: 0,
              sourceNodeId: "",
            },
            5: {
              id: 5,
              parentId: 0,
              createdAt: 6,
              createdAtTurn: 1,
              sourceNodeId: "model-fork-0/turn-1",
            },
          },
          nextForkId: 6,
        },
      });

    const actions = createCommandActions(deps as any);
    await actions.navigateToNode("model-fork-0/turn-1", true);

    expect(createForkMock).toHaveBeenCalledTimes(1);
    const createForkArgs = createForkMock.mock.calls[0];
    expect(createForkArgs?.[0]).toBe(0);
    expect(createForkArgs?.[1]?.nextForkId).toBe(5);
    expect(createForkArgs?.[2]).toBe("model-fork-0/turn-1");
    expect(createForkArgs?.[3]).toBe(1);
    expect(deps.gameStateRef.current.forkId).toBe(5);
  });
});
