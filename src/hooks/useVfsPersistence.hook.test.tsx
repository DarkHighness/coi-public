// @vitest-environment jsdom

import React from "react";
import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const indexedDbMocks = vi.hoisted(() => ({
  saveMetadata: vi.fn(),
  loadMetadata: vi.fn(),
  deleteMetadata: vi.fn(),
  getStorageEstimate: vi.fn(),
  clearDatabase: vi.fn(),
  getAllVfsSaveIds: vi.fn(),
  deleteVfsSave: vi.fn(),
}));

const sessionManagerMocks = vi.hoisted(() => ({
  initialize: vi.fn(),
  deleteSlotSessions: vi.fn(),
}));

const storeMocks = vi.hoisted(() => ({
  loadSnapshot: vi.fn(),
  listSnapshots: vi.fn(),
}));

const vfsPersistenceMocks = vi.hoisted(() => ({
  applySharedMutableStateToSession: vi.fn(),
  buildSharedMutableStateFromSession: vi.fn(),
  extractSharedMutableStateFromSnapshot: vi.fn(),
  restoreVfsSessionFromSnapshot: vi.fn(),
  saveVfsSessionSnapshot: vi.fn(),
}));

const derivationMocks = vi.hoisted(() => ({
  deriveGameStateFromVfs: vi.fn(),
}));

const runtimeStatsMocks = vi.hoisted(() => ({
  loadRuntimeStats: vi.fn(),
  persistRuntimeStats: vi.fn(),
}));

const restoreStateMocks = vi.hoisted(() => ({
  buildRestoredGameState: vi.fn(),
}));

const imageStorageMocks = vi.hoisted(() => ({
  deleteImagesBySaveId: vi.fn(),
}));

const ragMocks = vi.hoisted(() => ({
  getRAGService: vi.fn(),
  deleteDocuments: vi.fn(),
}));

const seedMocks = vi.hoisted(() => ({
  seedVfsSessionFromDefaults: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

vi.mock("../utils/indexedDB", () => ({
  saveMetadata: indexedDbMocks.saveMetadata,
  loadMetadata: indexedDbMocks.loadMetadata,
  deleteMetadata: indexedDbMocks.deleteMetadata,
  getStorageEstimate: indexedDbMocks.getStorageEstimate,
  clearDatabase: indexedDbMocks.clearDatabase,
  getAllVfsSaveIds: indexedDbMocks.getAllVfsSaveIds,
  deleteVfsSave: indexedDbMocks.deleteVfsSave,
}));

vi.mock("../services/ai/sessionManager", () => ({
  sessionManager: {
    initialize: sessionManagerMocks.initialize,
    deleteSlotSessions: sessionManagerMocks.deleteSlotSessions,
  },
}));

vi.mock("../services/vfs/store", () => {
  class IndexedDbVfsStore {
    loadSnapshot = storeMocks.loadSnapshot;
    listSnapshots = storeMocks.listSnapshots;
  }
  return { IndexedDbVfsStore };
});

vi.mock("../services/vfs/derivations", () => ({
  deriveGameStateFromVfs: derivationMocks.deriveGameStateFromVfs,
}));

vi.mock("../services/vfs/persistence", () => ({
  applySharedMutableStateToSession:
    vfsPersistenceMocks.applySharedMutableStateToSession,
  buildSharedMutableStateFromSession:
    vfsPersistenceMocks.buildSharedMutableStateFromSession,
  extractSharedMutableStateFromSnapshot:
    vfsPersistenceMocks.extractSharedMutableStateFromSnapshot,
  restoreVfsSessionFromSnapshot:
    vfsPersistenceMocks.restoreVfsSessionFromSnapshot,
  saveVfsSessionSnapshot: vfsPersistenceMocks.saveVfsSessionSnapshot,
}));

vi.mock("../services/vfs/seed", () => ({
  seedVfsSessionFromDefaults: seedMocks.seedVfsSessionFromDefaults,
}));

vi.mock("../utils/imageStorage", () => ({
  deleteImagesBySaveId: imageStorageMocks.deleteImagesBySaveId,
}));

vi.mock("../services/rag", () => ({
  getRAGService: ragMocks.getRAGService,
}));

vi.mock("./runtimeStatsStore", () => ({
  loadRuntimeStats: runtimeStatsMocks.loadRuntimeStats,
  persistRuntimeStats: runtimeStatsMocks.persistRuntimeStats,
}));

vi.mock("./vfsRestoreState", () => ({
  buildRestoredGameState: restoreStateMocks.buildRestoredGameState,
}));

import { useVfsPersistence } from "./useVfsPersistence";

const createUiState = () => ({
  inventory: { pinnedIds: [], customOrder: [], hiddenIds: [] },
  locations: { pinnedIds: [], customOrder: [], hiddenIds: [] },
  npcs: { pinnedIds: [], customOrder: [], hiddenIds: [] },
  knowledge: { pinnedIds: [], customOrder: [], hiddenIds: [] },
  quests: { pinnedIds: [], customOrder: [], hiddenIds: [] },
  entityPresentation: {},
});

const createGameState = () =>
  ({
    forkId: 0,
    turnNumber: 0,
    isProcessing: false,
    theme: "fantasy",
    currentLocation: "Dock",
    outline: null,
    outlineConversation: null,
    activeNodeId: null,
    nodes: {},
    currentFork: [],
    uiState: createUiState(),
  }) as any;

describe("useVfsPersistence hook flows", () => {
  let metadata: Map<string, any>;

  beforeEach(() => {
    metadata = new Map<string, any>();

    vi.clearAllMocks();

    indexedDbMocks.saveMetadata.mockImplementation(
      async (key: string, value: any) => {
        metadata.set(key, value);
      },
    );
    indexedDbMocks.loadMetadata.mockImplementation(async (key: string) =>
      metadata.get(key),
    );
    indexedDbMocks.deleteMetadata.mockImplementation(async (key: string) => {
      metadata.delete(key);
    });
    indexedDbMocks.getStorageEstimate.mockResolvedValue({
      usage: 2 * 1024 * 1024,
      quota: 20 * 1024 * 1024,
    });
    indexedDbMocks.clearDatabase.mockResolvedValue(undefined);
    indexedDbMocks.getAllVfsSaveIds.mockResolvedValue([]);
    indexedDbMocks.deleteVfsSave.mockResolvedValue(undefined);

    sessionManagerMocks.initialize.mockResolvedValue(undefined);
    sessionManagerMocks.deleteSlotSessions.mockResolvedValue(undefined);

    storeMocks.loadSnapshot.mockResolvedValue(null);
    storeMocks.listSnapshots.mockResolvedValue([]);

    vfsPersistenceMocks.applySharedMutableStateToSession.mockImplementation(
      () => {},
    );
    vfsPersistenceMocks.buildSharedMutableStateFromSession.mockReturnValue({
      "world/flags.json": { active: true },
    });
    vfsPersistenceMocks.extractSharedMutableStateFromSnapshot.mockReturnValue({
      "world/flags.json": { active: true },
    });
    vfsPersistenceMocks.restoreVfsSessionFromSnapshot.mockImplementation(
      () => {},
    );
    vfsPersistenceMocks.saveVfsSessionSnapshot.mockResolvedValue(undefined);

    derivationMocks.deriveGameStateFromVfs.mockReturnValue({
      theme: "noir",
      currentLocation: "Moon Harbor",
      outline: {
        title: "Moon Harbor",
        premise: "A mystery unfolds in harbor fog.",
        openingNarrative: { narrative: "The fog never lifts." },
      },
      outlineConversation: { modelId: "gpt-4o" },
      currentFork: [{ role: "model", text: "Model continuation" }],
      seedImageId: "seed-1",
      activeNodeId: "model-1",
      nodes: {
        "model-1": { id: "model-1", imageId: "img-1" },
      },
      forkId: 0,
      forkTree: { id: "root" },
      uiState: createUiState(),
    });

    runtimeStatsMocks.loadRuntimeStats.mockResolvedValue({ runCount: 1 });
    runtimeStatsMocks.persistRuntimeStats.mockResolvedValue(undefined);

    restoreStateMocks.buildRestoredGameState.mockImplementation(
      ({ previous, derived, storedUiState }: any) => ({
        ...previous,
        ...derived,
        uiState: storedUiState || previous.uiState,
        restored: true,
      }),
    );

    imageStorageMocks.deleteImagesBySaveId.mockResolvedValue(undefined);
    ragMocks.deleteDocuments.mockResolvedValue(undefined);
    ragMocks.getRAGService.mockReturnValue({
      deleteDocuments: ragMocks.deleteDocuments,
    });

    seedMocks.seedVfsSessionFromDefaults.mockImplementation(() => {});
  });

  it("hydrates slots, cleans ghost entries, and restores the latest slot", async () => {
    metadata.set("slots", [
      {
        id: "slot-1",
        name: "Save 1",
        timestamp: 10,
        theme: "fantasy",
        summary: "placeholder",
      },
      {
        id: "ghost-slot",
        name: "Ghost",
        timestamp: 5,
        theme: "fantasy",
        summary: "ghost",
      },
    ]);
    metadata.set("vfs_latest:slot-1", { forkId: 0, turn: 1 });
    metadata.set("vfs_shared:slot-1", {
      files: { "world/flags.json": { active: true } },
    });
    metadata.set("ui_state:slot-1", {
      inventory: { pinnedIds: ["item-a"], customOrder: ["item-a"] },
      entityPresentation: {
        "inventory:item-a": { highlight: false },
      },
    });

    indexedDbMocks.getAllVfsSaveIds.mockResolvedValue(["slot-1"]);
    storeMocks.loadSnapshot.mockImplementation(async (saveId: string) => {
      if (saveId === "slot-1") {
        return {
          saveId: "slot-1",
          forkId: 0,
          turn: 1,
          createdAt: 99,
          files: {},
        };
      }
      return null;
    });

    const setGameState = vi.fn();
    let api: ReturnType<typeof useVfsPersistence> | null = null;

    const Harness = () => {
      api = useVfsPersistence(createGameState(), setGameState, "game");
      return React.createElement("div");
    };

    render(React.createElement(Harness));

    await waitFor(() => {
      expect(sessionManagerMocks.initialize).toHaveBeenCalled();
      expect(api?.currentSlotId).toBe("slot-1");
    });

    expect(api?.saveSlots).toHaveLength(1);
    expect(api?.saveSlots[0].id).toBe("slot-1");
    expect(api?.saveSlots[0].name).toBe("Moon Harbor");

    const savedKeys = indexedDbMocks.saveMetadata.mock.calls.map(
      (call) => call[0],
    );
    expect(savedKeys).toContain("slots");
    expect(setGameState).toHaveBeenCalled();
  });

  it("supports create, rename and clear-all workflows", async () => {
    const setGameState = vi.fn();
    let api: ReturnType<typeof useVfsPersistence> | null = null;

    const Harness = () => {
      api = useVfsPersistence(createGameState(), setGameState, "menu");
      return React.createElement("div");
    };

    render(React.createElement(Harness));

    await waitFor(() => expect(api).not.toBeNull());

    let slotId = "";
    await act(async () => {
      slotId = api!.createSaveSlot("sci-fi");
    });

    expect(slotId).toBeTruthy();
    await waitFor(() => expect(api?.saveSlots).toHaveLength(1));

    await act(async () => {
      await expect(api!.renameSlot(slotId, "   ")).resolves.toBe(false);
    });

    let renameResult = false;
    await act(async () => {
      renameResult = await api!.renameSlot(slotId, "Captain's Run");
    });

    expect(typeof renameResult).toBe("boolean");
    await waitFor(() => {
      expect(api?.saveSlots[0].name).toBe("Captain's Run");
    });

    await act(async () => {
      await expect(api!.clearAllSaves()).resolves.toBe(true);
    });

    expect(api?.saveSlots).toEqual([]);

    indexedDbMocks.clearDatabase.mockRejectedValueOnce(new Error("blocked"));
    await act(async () => {
      await expect(api!.clearAllSaves()).resolves.toBe(false);
    });
  });

  it("loads slots and performs full delete cleanup", async () => {
    metadata.set("slots", [
      {
        id: "slot-1",
        name: "Save 1",
        timestamp: 10,
        theme: "fantasy",
        summary: "placeholder",
      },
    ]);
    metadata.set("currentSlot", "slot-1");
    metadata.set("vfs_latest:slot-1", { forkId: 0, turn: 1 });
    metadata.set("vfs_shared:slot-1", {
      files: { "world/flags.json": { active: true } },
    });
    metadata.set("ui_state:slot-1", createUiState());

    indexedDbMocks.getAllVfsSaveIds.mockResolvedValue(["slot-1"]);
    storeMocks.loadSnapshot.mockResolvedValue({
      saveId: "slot-1",
      forkId: 0,
      turn: 1,
      createdAt: 101,
      files: {},
    });

    const setGameState = vi.fn();
    let api: ReturnType<typeof useVfsPersistence> | null = null;

    const Harness = () => {
      api = useVfsPersistence(createGameState(), setGameState, "game");
      return React.createElement("div");
    };

    render(React.createElement(Harness));

    await waitFor(() => expect(api?.currentSlotId).toBe("slot-1"));

    let loadResult: any;
    await act(async () => {
      loadResult = await api!.loadSlot("slot-1");
    });

    expect(loadResult).toMatchObject({ success: true, hasOutline: true });

    await act(async () => {
      await api!.deleteSlot("slot-1");
    });

    expect(indexedDbMocks.deleteVfsSave).toHaveBeenCalledWith("slot-1");
    expect(imageStorageMocks.deleteImagesBySaveId).toHaveBeenCalledWith(
      "slot-1",
    );
    expect(sessionManagerMocks.deleteSlotSessions).toHaveBeenCalledWith(
      "slot-1",
    );
    expect(ragMocks.deleteDocuments).toHaveBeenCalledWith({ saveId: "slot-1" });

    const deletedMetaKeys = indexedDbMocks.deleteMetadata.mock.calls.map(
      (call) => call[0],
    );
    expect(deletedMetaKeys).toEqual(
      expect.arrayContaining([
        "currentSlot",
        "vfs_latest:slot-1",
        "vfs_shared:slot-1",
        "ui_state:slot-1",
        "runtime_stats:slot-1",
      ]),
    );
  });
});
