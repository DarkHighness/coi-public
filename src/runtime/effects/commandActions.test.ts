import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCommandActions } from "./commandActions";

const generateForceUpdateMock = vi.hoisted(() => vi.fn());
const generateEntityCleanupMock = vi.hoisted(() => vi.fn());
const deriveGameStateFromVfsMock = vi.hoisted(() => vi.fn());
const mergeDerivedViewStateMock = vi.hoisted(() => vi.fn());
const createStateSnapshotMock = vi.hoisted(() => vi.fn());
const updateRAGDocumentsBackgroundMock = vi.hoisted(() => vi.fn());

vi.mock("../../services/aiService", () => ({
  generateForceUpdate: generateForceUpdateMock,
  generateEntityCleanup: generateEntityCleanupMock,
}));

vi.mock("../../services/vfs/derivations", () => ({
  deriveGameStateFromVfs: deriveGameStateFromVfsMock,
}));

vi.mock("../../hooks/vfsViewState", () => ({
  mergeDerivedViewState: mergeDerivedViewStateMock,
}));

vi.mock("../../utils/snapshotManager", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../utils/snapshotManager")>();
  return {
    ...actual,
    createStateSnapshot: createStateSnapshotMock,
  };
});

vi.mock("./ragDocuments", () => ({
  updateRAGDocumentsBackground: updateRAGDocumentsBackgroundMock,
}));

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
});

describe("commandActions", () => {
  it("creates command + system nodes on force update success", async () => {
    const deps = createDeps();
    const actions = createCommandActions(deps as any);

    const result = await actions.handleForceUpdate("Shift weather to thunderstorm");

    expect(result).toEqual({ success: true });

    const nodes = Object.values(deps.gameStateRef.current.nodes) as any[];
    const commandNode = nodes.find((node) => node.role === "command");
    const systemNode = nodes.find(
      (node) => node.role === "system" && node.parentId === commandNode?.id,
    );

    expect(commandNode?.text).toBe("Shift weather to thunderstorm");
    expect(systemNode?.text).toBe("World updated.");
    expect(deps.gameStateRef.current.activeNodeId).toBe(systemNode?.id);
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
    expect(deps.triggerSave).toHaveBeenCalledTimes(1);
  });
});
