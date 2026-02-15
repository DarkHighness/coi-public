import { beforeEach, describe, expect, it, vi } from "vitest";
import JSZip from "jszip";

const saveMetadataMock = vi.fn<(key: string, value: any) => Promise<void>>(
  async () => undefined,
);
const loadMetadataMock = vi.fn<(key: string) => Promise<any>>(async () => null);

const vfsMetaRowsRef: { rows: any[] } = { rows: [] };
const vfsSnapshotRowsRef: { rows: any[] } = { rows: [] };

const openVfsDBMock = vi.fn(async () => ({
  transaction: ([storeName]: string[]) => ({
    objectStore: () => ({
      getAll: () => {
        const request: any = { result: undefined, error: null };
        queueMicrotask(() => {
          request.result =
            storeName === "vfs_snapshots"
              ? vfsSnapshotRowsRef.rows
              : vfsMetaRowsRef.rows;
          request.onsuccess?.();
        });
        return request;
      },
    }),
  }),
}));

const saveImageMock = vi.fn(async () => "new-image-id");
const getImagesBySaveIdMock = vi.fn(async () => []);

type SnapshotRecord = {
  saveId: string;
  forkId: number;
  turn: number;
  createdAt: number;
  files: Record<string, any>;
};

const savedSnapshots: SnapshotRecord[] = [];

const sourceSnapshots = new Map<string, SnapshotRecord>();

const snapshotKey = (saveId: string, forkId: number, turn: number) =>
  `${saveId}:${forkId}:${turn}`;

const saveSnapshotMock = vi.fn(async (snapshot: SnapshotRecord) => {
  savedSnapshots.push(JSON.parse(JSON.stringify(snapshot)));
});

const loadSnapshotMock = vi.fn(
  async (
    saveId: string,
    forkId: number,
    turn: number,
  ): Promise<SnapshotRecord | null> => {
    const found = sourceSnapshots.get(snapshotKey(saveId, forkId, turn));
    if (!found) return null;
    return JSON.parse(JSON.stringify(found));
  },
);

vi.mock("../utils/indexedDB", () => ({
  saveMetadata: saveMetadataMock,
  loadMetadata: loadMetadataMock,
  openVfsDB: openVfsDBMock,
  VFS_META_STORE: "vfs_meta",
  VFS_SNAPSHOTS_STORE: "vfs_snapshots",
}));

vi.mock("../utils/imageStorage", () => ({
  saveImage: saveImageMock,
  getImagesBySaveId: getImagesBySaveIdMock,
}));

vi.mock("./rag", () => ({
  getRAGService: () => ({
    exportSaveData: vi.fn(async () => null),
    importSaveData: vi.fn(async () => ({ imported: 0 })),
    getSaveStats: vi.fn(async () => ({ totalDocuments: 0 })),
  }),
}));

vi.mock("./vfs/store", () => ({
  IndexedDbVfsStore: class {
    async saveSnapshot(snapshot: any) {
      return saveSnapshotMock(snapshot);
    }

    async loadSnapshot(saveId: string, forkId: number, turn: number) {
      return loadSnapshotMock(saveId, forkId, turn);
    }
  },
}));

vi.mock("./vfs/vfsSession", () => ({
  VfsSession: class {
    snapshot() {
      return {};
    }
  },
}));

vi.mock("./vfs/persistence", () => ({
  applySharedMutableStateToSession: vi.fn(),
  extractSharedMutableStateFromSnapshot: vi.fn(() => ({})),
  restoreVfsSessionFromSnapshot: vi.fn(),
  saveVfsSessionSnapshot: vi.fn(async () => undefined),
}));

vi.mock("./vfs/derivations", () => ({
  deriveGameStateFromVfs: vi.fn(() => ({
    _saveVersion: { version: 2, createdAt: 1 },
    theme: "wuxia",
    outline: { title: "导入存档", premise: "测试摘要" },
    seedImageId: "new-image-id",
    nodes: {
      n1: {
        id: "n1",
        text: "hello",
        imageId: "old-image-id",
      },
    },
    logs: [],
  })),
}));

vi.mock("./vfs/seed", () => ({
  seedVfsSessionFromGameState: vi.fn(),
}));

vi.mock("./vfs/outline", () => ({
  writeOutlineFile: vi.fn(),
  writeOutlineProgress: vi.fn(),
}));

vi.mock("./vfs/conversation", () => ({
  buildTurnId: vi.fn(
    (forkId: number, turn: number) => `fork-${forkId}/turn-${turn}`,
  ),
  writeConversationIndex: vi.fn(),
  writeForkTree: vi.fn(),
  writeTurnFile: vi.fn(),
}));

const createZipFile = async (zip: JSZip, name: string) => {
  const bytes = await zip.generateAsync({ type: "uint8array" });
  return Object.assign(bytes, { name }) as unknown as File;
};

const makeSnapshot = (saveId: string): SnapshotRecord => ({
  saveId,
  forkId: 0,
  turn: 0,
  createdAt: 1,
  files: {
    "turns/fork-0/turn-0/world/global.json": {
      path: "turns/fork-0/turn-0/world/global.json",
      content: JSON.stringify({ seedImageId: "old-image-id" }),
      contentType: "application/json",
      hash: "h1",
      size: 10,
      updatedAt: 1,
    },
    "turns/fork-0/turn-0/world/story.json": {
      path: "turns/fork-0/turn-0/world/story.json",
      content: JSON.stringify({ nodes: [{ imageId: "old-image-id" }] }),
      contentType: "application/json",
      hash: "h2",
      size: 10,
      updatedAt: 1,
    },
    "turns/fork-0/turn-0/conversation/turns/fork-0/turn-0.json": {
      path: "turns/fork-0/turn-0/conversation/turns/fork-0/turn-0.json",
      content: JSON.stringify({
        assistant: {
          imageId: "old-image-id",
          imageUrl: "https://example.com/old.png",
        },
      }),
      contentType: "application/json",
      hash: "h3",
      size: 10,
      updatedAt: 1,
    },
  },
});

const makeSnapshotWithConversationHistory = (
  saveId: string,
  snapshotTurn: number,
  conversationTurnMax: number,
): SnapshotRecord => {
  const root = `turns/fork-0/turn-${snapshotTurn}`;
  const files: Record<string, any> = {
    [`${root}/world/global.json`]: {
      path: `${root}/world/global.json`,
      content: JSON.stringify({ seedImageId: "old-image-id" }),
      contentType: "application/json",
      hash: "g1",
      size: 10,
      updatedAt: 1,
    },
    [`${root}/world/story.json`]: {
      path: `${root}/world/story.json`,
      content: JSON.stringify({ nodes: [{ imageId: "old-image-id" }] }),
      contentType: "application/json",
      hash: "s1",
      size: 10,
      updatedAt: 1,
    },
  };

  for (let turn = 0; turn <= conversationTurnMax; turn += 1) {
    const path = `${root}/conversation/turns/fork-0/turn-${turn}.json`;
    files[path] = {
      path,
      content: JSON.stringify({
        turnId: `fork-0/turn-${turn}`,
        forkId: 0,
        turnNumber: turn,
        parentTurnId: turn > 0 ? `fork-0/turn-${turn - 1}` : null,
        createdAt: turn + 1,
        userAction: turn === 0 ? "" : `user-${turn}`,
        assistant: {
          narrative: `assistant-${turn}`,
          choices: [],
          imageId: "old-image-id",
        },
      }),
      contentType: "application/json",
      hash: `c${turn}`,
      size: 10,
      updatedAt: turn + 1,
    };
  }

  return {
    saveId,
    forkId: 0,
    turn: snapshotTurn,
    createdAt: snapshotTurn + 1,
    files,
  };
};

const makeSnapshotWithSessionArtifacts = (saveId: string): SnapshotRecord => ({
  saveId,
  forkId: 0,
  turn: 0,
  createdAt: 1,
  files: {
    "turns/fork-0/turn-0/world/global.json": {
      path: "turns/fork-0/turn-0/world/global.json",
      content: JSON.stringify({ currentLocation: "loc_a" }),
      contentType: "application/json",
      hash: "wg",
      size: 10,
      updatedAt: 1,
    },
    "turns/fork-0/turn-0/conversation/turns/fork-0/turn-0.json": {
      path: "turns/fork-0/turn-0/conversation/turns/fork-0/turn-0.json",
      content: JSON.stringify({
        turnId: "fork-0/turn-0",
        forkId: 0,
        turnNumber: 0,
        userAction: "",
        assistant: { narrative: "n0", choices: [] },
      }),
      contentType: "application/json",
      hash: "ct0",
      size: 10,
      updatedAt: 1,
    },
    "turns/fork-0/turn-0/conversation/session.jsonl": {
      path: "turns/fork-0/turn-0/conversation/session.jsonl",
      content: '{"role":"assistant","content":"cached"}\n',
      contentType: "application/jsonl",
      hash: "sj",
      size: 10,
      updatedAt: 1,
    },
    "turns/fork-0/turn-0/runtime/transient.json": {
      path: "turns/fork-0/turn-0/runtime/transient.json",
      content: JSON.stringify({ temp: true }),
      contentType: "application/json",
      hash: "rt",
      size: 10,
      updatedAt: 1,
    },
  },
});

const createValidManifest = () => ({
  version: 2,
  exportDate: new Date().toISOString(),
  appVersion: "0.1.0",
  saveVersion: 2,
  slot: {
    id: "slot-old",
    name: "旧存档",
    theme: "wuxia",
    summary: "摘要",
    timestamp: Date.now(),
    previewImage: "old-image-id",
  },
  includes: {
    images: true,
    embeddings: false,
    logs: false,
  },
  stats: {
    nodeCount: 1,
    imageCount: 1,
    embeddingCount: 0,
    logCount: 0,
  },
});

const createImportArchive = async () => {
  const zip = new JSZip();
  zip.file("manifest.json", JSON.stringify(createValidManifest(), null, 2));
  zip.file(
    "vfs/index.json",
    JSON.stringify(
      {
        version: 1,
        latest: { forkId: 0, turn: 0 },
        snapshots: [{ forkId: 0, turn: 0, createdAt: 1 }],
      },
      null,
      2,
    ),
  );

  zip.file(
    "vfs/snapshots/fork-0/turn-0.json",
    JSON.stringify(makeSnapshot("slot-old"), null, 2),
  );

  zip.file("images/old-image-id.png", new Uint8Array([1, 2, 3, 4]));

  return createZipFile(zip, "import.zip");
};

describe("saveExportService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    savedSnapshots.length = 0;
    sourceSnapshots.clear();
    vfsMetaRowsRef.rows = [];
    vfsSnapshotRowsRef.rows = [];
    loadMetadataMock.mockImplementation(async () => null);
  });

  it("validateImport rejects malformed manifest with invalidManifest", async () => {
    const { validateImport } = await import("./saveExportService");

    const zip = new JSZip();
    zip.file("manifest.json", JSON.stringify({ version: 2 }));
    zip.file(
      "vfs/index.json",
      JSON.stringify({ version: 1, snapshots: [{ forkId: 0, turn: 0 }] }),
    );
    zip.file(
      "vfs/snapshots/fork-0/turn-0.json",
      JSON.stringify(makeSnapshot("slot-x")),
    );

    const file = await createZipFile(zip, "broken.zip");
    const result = await validateImport(file);

    expect(result.valid).toBe(false);
    expect(result.errorsI18n?.[0]?.key).toBe("import.errors.invalidManifest");
  });

  it("importSave remaps image references in imported VFS snapshots", async () => {
    const { importSave } = await import("./saveExportService");

    const file = await createImportArchive();
    const result = await importSave(file, []);

    expect(result.success).toBe(true);
    expect(saveImageMock).toHaveBeenCalledTimes(1);
    expect(savedSnapshots.length).toBe(1);

    const imported = savedSnapshots[0];

    const globalJson = JSON.parse(
      imported.files["turns/fork-0/turn-0/world/global.json"].content,
    );
    expect(globalJson.seedImageId).toBe("new-image-id");

    const storyJson = JSON.parse(
      imported.files["turns/fork-0/turn-0/world/story.json"].content,
    );
    expect(storyJson.nodes[0].imageId).toBe("new-image-id");

    const turnJson = JSON.parse(
      imported.files[
        "turns/fork-0/turn-0/conversation/turns/fork-0/turn-0.json"
      ].content,
    );
    expect(turnJson.assistant.imageId).toBe("new-image-id");
  });

  it("importSave remaps slot previewImage to the new image id", async () => {
    const { importSave } = await import("./saveExportService");

    const file = await createImportArchive();
    const result = await importSave(file, []);

    expect(result.success).toBe(true);

    const slotsCall = saveMetadataMock.mock.calls.find(
      (call) => call[0] === "slots",
    );
    expect(slotsCall).toBeTruthy();

    const savedSlots = slotsCall?.[1] as Array<{ previewImage?: string }>;
    expect(savedSlots[0]?.previewImage).toBe("new-image-id");
  });

  it("exportSave strips image references from VFS snapshots when includeImages is false", async () => {
    const { exportSave } = await import("./saveExportService");

    const slotId = "slot-export";
    sourceSnapshots.set(snapshotKey(slotId, 0, 0), makeSnapshot(slotId));
    vfsMetaRowsRef.rows = [
      { saveId: slotId, forkId: 0, turn: 0, createdAt: 1 },
    ];
    loadMetadataMock.mockImplementation(async (key: string) => {
      if (key === `vfs_latest:${slotId}`) {
        return { forkId: 0, turn: 0 };
      }
      if (key === `vfs_shared:${slotId}`) {
        return { files: {} };
      }
      return null;
    });

    const slot = {
      id: slotId,
      name: "导出存档",
      theme: "wuxia",
      summary: "摘要",
      timestamp: Date.now(),
      previewImage: "old-image-id",
    };

    const blob = await exportSave(slotId, slot as any, {
      includeImages: false,
      includeEmbeddings: false,
      includeLogs: true,
    });

    expect(blob).toBeTruthy();

    const zip = await JSZip.loadAsync(
      new Uint8Array(await (blob as Blob).arrayBuffer()),
    );

    const snapshotJson = JSON.parse(
      await zip.file("vfs/snapshots/fork-0/turn-0.json")!.async("text"),
    );

    const worldGlobal = JSON.parse(
      snapshotJson.files["turns/fork-0/turn-0/world/global.json"].content,
    );
    expect(worldGlobal.seedImageId).toBeUndefined();

    const storyJson = JSON.parse(
      snapshotJson.files["turns/fork-0/turn-0/world/story.json"].content,
    );
    expect(storyJson.nodes[0].imageId).toBeUndefined();

    const turnJson = JSON.parse(
      snapshotJson.files[
        "turns/fork-0/turn-0/conversation/turns/fork-0/turn-0.json"
      ].content,
    );
    expect(turnJson.assistant.imageId).toBeUndefined();
    expect(turnJson.assistant.imageUrl).toBeUndefined();
  });

  it("exportSave repairs stale shared conversation index using latest snapshot turn files", async () => {
    const { exportSave } = await import("./saveExportService");

    const slotId = "slot-export-stale-index";
    sourceSnapshots.set(
      snapshotKey(slotId, 0, 0),
      makeSnapshotWithConversationHistory(slotId, 0, 1),
    );
    sourceSnapshots.set(
      snapshotKey(slotId, 0, 1),
      makeSnapshotWithConversationHistory(slotId, 1, 5),
    );

    vfsMetaRowsRef.rows = [
      { saveId: slotId, forkId: 0, turn: 0, createdAt: 1 },
      { saveId: slotId, forkId: 0, turn: 1, createdAt: 2 },
    ];

    const staleIndex = {
      activeForkId: 0,
      activeTurnId: "fork-0/turn-1",
      rootTurnIdByFork: { "0": "fork-0/turn-0" },
      latestTurnNumberByFork: { "0": 1 },
      turnOrderByFork: { "0": ["fork-0/turn-0", "fork-0/turn-1"] },
    };

    loadMetadataMock.mockImplementation(async (key: string) => {
      if (key === `vfs_latest:${slotId}`) {
        return { forkId: 0, turn: 1 };
      }
      if (key === `vfs_shared:${slotId}`) {
        const content = JSON.stringify(staleIndex);
        return {
          files: {
            "conversation/index.json": {
              path: "conversation/index.json",
              content,
              contentType: "application/json",
              hash: "stale",
              size: content.length,
              updatedAt: 1,
            },
          },
        };
      }
      return null;
    });

    const slot = {
      id: slotId,
      name: "导出存档",
      theme: "wuxia",
      summary: "摘要",
      timestamp: Date.now(),
    };

    const blob = await exportSave(slotId, slot as any, {
      includeImages: false,
      includeEmbeddings: false,
      includeLogs: false,
    });

    expect(blob).toBeTruthy();

    const zip = await JSZip.loadAsync(
      new Uint8Array(await (blob as Blob).arrayBuffer()),
    );
    const shared = JSON.parse(await zip.file("vfs/shared.json")!.async("text"));
    const repaired = JSON.parse(
      shared.files["conversation/index.json"].content,
    ) as {
      activeTurnId: string;
      latestTurnNumberByFork: Record<string, number>;
      turnOrderByFork: Record<string, string[]>;
    };

    expect(repaired.latestTurnNumberByFork["0"]).toBe(5);
    expect(repaired.turnOrderByFork["0"]).toHaveLength(6);
    expect(repaired.activeTurnId).toBe("fork-0/turn-5");
  });

  it("exportSave writes a structured VFS layout", async () => {
    const { exportSave } = await import("./saveExportService");

    const slotId = "slot-export-structured-layout";
    sourceSnapshots.set(
      snapshotKey(slotId, 0, 0),
      makeSnapshotWithConversationHistory(slotId, 0, 2),
    );
    vfsMetaRowsRef.rows = [
      { saveId: slotId, forkId: 0, turn: 0, createdAt: 1 },
    ];

    const staleIndex = {
      activeForkId: 0,
      activeTurnId: "fork-0/turn-0",
      rootTurnIdByFork: { "0": "fork-0/turn-0" },
      latestTurnNumberByFork: { "0": 0 },
      turnOrderByFork: { "0": ["fork-0/turn-0"] },
    };

    loadMetadataMock.mockImplementation(async (key: string) => {
      if (key === `vfs_latest:${slotId}`) {
        return { forkId: 0, turn: 0 };
      }
      if (key === `vfs_shared:${slotId}`) {
        const content = JSON.stringify(staleIndex);
        return {
          files: {
            "conversation/index.json": {
              path: "conversation/index.json",
              content,
              contentType: "application/json",
              hash: "stale",
              size: content.length,
              updatedAt: 1,
            },
          },
        };
      }
      return null;
    });

    const slot = {
      id: slotId,
      name: "导出存档",
      theme: "wuxia",
      summary: "摘要",
      timestamp: Date.now(),
    };

    const blob = await exportSave(slotId, slot as any, {
      includeImages: false,
      includeEmbeddings: false,
      includeLogs: false,
    });

    expect(blob).toBeTruthy();

    const zip = await JSZip.loadAsync(
      new Uint8Array(await (blob as Blob).arrayBuffer()),
    );

    expect(zip.file("vfs/README.md")).toBeTruthy();
    expect(
      zip.file("vfs/history/fork-0/turn-0/world/global.json"),
    ).toBeTruthy();
    expect(
      zip.file("vfs/current/world/global.json"),
    ).toBeTruthy();
    expect(zip.file("vfs/shared/conversation/index.json")).toBeTruthy();
    expect(
      zip.file("vfs/current/conversation/turns/fork-0/turn-2.json"),
    ).toBeTruthy();

    const currentIndex = JSON.parse(
      await zip
        .file("vfs/current/conversation/index.json")!
        .async("text"),
    ) as {
      latestTurnNumberByFork: Record<string, number>;
    };
    expect(currentIndex.latestTurnNumberByFork["0"]).toBe(2);
  });

  it("exportSave includes runtime metadata when available", async () => {
    const { exportSave } = await import("./saveExportService");

    const slotId = "slot-export-runtime-meta";
    sourceSnapshots.set(snapshotKey(slotId, 0, 0), makeSnapshot(slotId));
    vfsMetaRowsRef.rows = [
      { saveId: slotId, forkId: 0, turn: 0, createdAt: 1 },
    ];

    const uiState = { panel: "stateEditor", width: 420 };
    const runtimeStats = {
      tokenUsage: { totalTokens: 123 },
      logs: [{ role: "system", content: "x" }],
      unlockMode: false,
      godMode: false,
    };

    loadMetadataMock.mockImplementation(async (key: string) => {
      if (key === `vfs_latest:${slotId}`) return { forkId: 0, turn: 0 };
      if (key === `vfs_shared:${slotId}`) return { files: {} };
      if (key === `ui_state:${slotId}`) return uiState;
      if (key === `runtime_stats:${slotId}`) return runtimeStats;
      return null;
    });

    const slot = {
      id: slotId,
      name: "导出存档",
      theme: "wuxia",
      summary: "摘要",
      timestamp: Date.now(),
    };

    const blob = await exportSave(slotId, slot as any, {
      includeImages: false,
      includeEmbeddings: false,
      includeLogs: false,
    });

    expect(blob).toBeTruthy();
    const zip = await JSZip.loadAsync(
      new Uint8Array(await (blob as Blob).arrayBuffer()),
    );

    expect(zip.file("meta/ui_state.json")).toBeTruthy();
    expect(zip.file("meta/runtime_stats.json")).toBeTruthy();

    const exportedUi = JSON.parse(
      await zip.file("meta/ui_state.json")!.async("text"),
    );
    const exportedStats = JSON.parse(
      await zip.file("meta/runtime_stats.json")!.async("text"),
    );
    expect(exportedUi).toEqual(uiState);
    expect(exportedStats).toEqual(runtimeStats);
  });

  it("exportSave can include snapshots that exist only in vfs snapshot store", async () => {
    const { exportSave } = await import("./saveExportService");

    const slotId = "slot-export-snapshot-fallback";
    sourceSnapshots.set(snapshotKey(slotId, 0, 3), {
      ...makeSnapshot(slotId),
      turn: 3,
      createdAt: 9,
      files: {
        "turns/fork-0/turn-3/world/global.json": {
          path: "turns/fork-0/turn-3/world/global.json",
          content: JSON.stringify({ seedImageId: "old-image-id" }),
          contentType: "application/json",
          hash: "h9",
          size: 10,
          updatedAt: 9,
        },
      },
    });

    vfsMetaRowsRef.rows = [];
    vfsSnapshotRowsRef.rows = [
      { saveId: slotId, forkId: 0, turn: 3, createdAt: 9 },
    ];

    loadMetadataMock.mockImplementation(async (key: string) => {
      if (key === `vfs_latest:${slotId}`) return null;
      if (key === `vfs_shared:${slotId}`) return { files: {} };
      return null;
    });

    const slot = {
      id: slotId,
      name: "导出存档",
      theme: "wuxia",
      summary: "摘要",
      timestamp: Date.now(),
    };

    const blob = await exportSave(slotId, slot as any, {
      includeImages: false,
      includeEmbeddings: false,
      includeLogs: false,
    });

    expect(blob).toBeTruthy();

    const zip = await JSZip.loadAsync(
      new Uint8Array(await (blob as Blob).arrayBuffer()),
    );
    expect(zip.file("vfs/snapshots/fork-0/turn-3.json")).toBeTruthy();
    expect(zip.file("vfs/history/fork-0/turn-3/world/global.json")).toBeTruthy();
  });

  it("exportSave excludes rebuildable session artifacts from VFS payload", async () => {
    const { exportSave } = await import("./saveExportService");

    const slotId = "slot-export-trim-session-artifacts";
    sourceSnapshots.set(
      snapshotKey(slotId, 0, 0),
      makeSnapshotWithSessionArtifacts(slotId),
    );
    vfsMetaRowsRef.rows = [
      { saveId: slotId, forkId: 0, turn: 0, createdAt: 1 },
    ];

    loadMetadataMock.mockImplementation(async (key: string) => {
      if (key === `vfs_latest:${slotId}`) return { forkId: 0, turn: 0 };
      if (key === `vfs_shared:${slotId}`) return { files: {} };
      return null;
    });

    const slot = {
      id: slotId,
      name: "导出存档",
      theme: "wuxia",
      summary: "摘要",
      timestamp: Date.now(),
    };

    const blob = await exportSave(slotId, slot as any, {
      includeImages: false,
      includeEmbeddings: false,
      includeLogs: false,
    });

    expect(blob).toBeTruthy();
    const zip = await JSZip.loadAsync(
      new Uint8Array(await (blob as Blob).arrayBuffer()),
    );

    const exportedSnapshot = JSON.parse(
      await zip.file("vfs/snapshots/fork-0/turn-0.json")!.async("text"),
    ) as SnapshotRecord;
    const snapshotPaths = Object.keys(exportedSnapshot.files);
    expect(
      snapshotPaths.some((path) => path.endsWith("/conversation/session.jsonl")),
    ).toBe(false);
    expect(
      snapshotPaths.some((path) => path.includes("/runtime/")),
    ).toBe(false);

    expect(zip.file("vfs/history/fork-0/turn-0/conversation/session.jsonl")).toBeNull();
    expect(zip.file("vfs/current/conversation/session.jsonl")).toBeNull();
    expect(zip.file("vfs/history/fork-0/turn-0/runtime/transient.json")).toBeNull();
    expect(zip.file("vfs/current/runtime/transient.json")).toBeNull();

    expect(zip.file("vfs/current/world/global.json")).toBeTruthy();
    expect(zip.file("vfs/current/conversation/turns/fork-0/turn-0.json")).toBeTruthy();
  });
});

describe("saveExportService validation edge cases", () => {
  it("validateImport rejects unsupported file extension", async () => {
    const { validateImport } = await import("./saveExportService");

    const file = Object.assign(new Uint8Array([1, 2, 3]), {
      name: "save.txt",
    }) as unknown as File;

    const result = await validateImport(file);

    expect(result.valid).toBe(false);
    expect(result.errorsI18n?.[0]?.key).toBe("import.errors.unsupportedFormat");
  });

  it("validateImport warns when export version is newer than supported", async () => {
    const { validateImport } = await import("./saveExportService");

    const zip = new JSZip();
    zip.file(
      "manifest.json",
      JSON.stringify(
        {
          ...createValidManifest(),
          version: 999,
        },
        null,
        2,
      ),
    );
    zip.file(
      "vfs/index.json",
      JSON.stringify(
        {
          version: 1,
          latest: { forkId: 0, turn: 0 },
          snapshots: [{ forkId: 0, turn: 0, createdAt: 1 }],
        },
        null,
        2,
      ),
    );
    zip.file(
      "vfs/snapshots/fork-0/turn-0.json",
      JSON.stringify(makeSnapshot("slot-x"), null, 2),
    );

    const file = await createZipFile(zip, "warn-version.zip");
    const result = await validateImport(file);

    expect(result.valid).toBe(true);
    expect(
      result.warningsI18n?.some(
        (warning) => warning.key === "import.warnings.newerVersion",
      ),
    ).toBe(true);
  });

  it("validateImport rejects when latest snapshot file is missing", async () => {
    const { validateImport } = await import("./saveExportService");

    const zip = new JSZip();
    zip.file("manifest.json", JSON.stringify(createValidManifest(), null, 2));
    zip.file(
      "vfs/index.json",
      JSON.stringify(
        {
          version: 1,
          latest: { forkId: 9, turn: 9 },
          snapshots: [{ forkId: 9, turn: 9, createdAt: 1 }],
        },
        null,
        2,
      ),
    );

    const file = await createZipFile(zip, "missing-snapshot.zip");
    const result = await validateImport(file);

    expect(result.valid).toBe(false);
    expect(result.errorsI18n?.[0]?.key).toBe(
      "import.errors.missingSnapshotFile",
    );
  });

  it("importSave keeps working and reports embeddings parse warning", async () => {
    const { importSave } = await import("./saveExportService");

    const zip = new JSZip();
    zip.file(
      "manifest.json",
      JSON.stringify(
        {
          ...createValidManifest(),
          includes: {
            images: false,
            embeddings: true,
            logs: false,
          },
        },
        null,
        2,
      ),
    );
    zip.file(
      "vfs/index.json",
      JSON.stringify(
        {
          version: 1,
          latest: { forkId: 0, turn: 0 },
          snapshots: [{ forkId: 0, turn: 0, createdAt: 1 }],
        },
        null,
        2,
      ),
    );
    zip.file(
      "vfs/snapshots/fork-0/turn-0.json",
      JSON.stringify(makeSnapshot("slot-old"), null, 2),
    );
    zip.file("embeddings.json", "{not-json");

    const file = await createZipFile(zip, "embeddings-broken.zip");
    const result = await importSave(file, []);

    expect(result.success).toBe(true);
    expect(
      result.warningsI18n?.some(
        (warning) => warning.key === "import.warnings.embeddingsRegen",
      ),
    ).toBe(true);
  });
});

describe("saveExportService import/export additional branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    savedSnapshots.length = 0;
    sourceSnapshots.clear();
    vfsMetaRowsRef.rows = [];
    vfsSnapshotRowsRef.rows = [];
    loadMetadataMock.mockImplementation(async () => null);
  });

  it("validateImport reports parseFailed for unreadable zip bytes", async () => {
    const { validateImport } = await import("./saveExportService");

    const brokenFile = Object.assign(new Uint8Array([0, 1, 2, 3]), {
      name: "broken.zip",
    }) as unknown as File;

    const result = await validateImport(brokenFile);

    expect(result.valid).toBe(false);
    expect(result.errorsI18n?.[0]?.key).toBe("import.errors.parseFailed");
  });

  it("validateImport rejects unreadable vfs index payload", async () => {
    const { validateImport } = await import("./saveExportService");

    const zip = new JSZip();
    zip.file("manifest.json", JSON.stringify(createValidManifest(), null, 2));
    zip.file("vfs/index.json", "{not-json");

    const file = await createZipFile(zip, "bad-index.zip");
    const result = await validateImport(file);

    expect(result.valid).toBe(false);
    expect(result.errorsI18n?.[0]?.key).toBe(
      "import.errors.unreadableVfsIndex",
    );
  });

  it("importSave returns noSnapshotsImported when index entries are unusable", async () => {
    const { importSave } = await import("./saveExportService");

    const zip = new JSZip();
    zip.file("manifest.json", JSON.stringify(createValidManifest(), null, 2));
    zip.file(
      "vfs/index.json",
      JSON.stringify(
        {
          version: 1,
          latest: null,
          snapshots: [{ createdAt: 1 }],
        },
        null,
        2,
      ),
    );

    const file = await createZipFile(zip, "no-snapshot-import.zip");
    const result = await importSave(file, []);

    expect(result.success).toBe(false);
    expect(result.errorI18n?.key).toBe("import.errors.noSnapshotsImported");
  });

  it("importSave repairs stale shared conversation index from imported snapshots", async () => {
    const { importSave } = await import("./saveExportService");

    const staleIndex = {
      activeForkId: 0,
      activeTurnId: "fork-0/turn-1",
      rootTurnIdByFork: { "0": "fork-0/turn-0" },
      latestTurnNumberByFork: { "0": 1 },
      turnOrderByFork: { "0": ["fork-0/turn-0", "fork-0/turn-1"] },
    };

    const zip = new JSZip();
    zip.file(
      "manifest.json",
      JSON.stringify(
        {
          ...createValidManifest(),
          includes: {
            images: false,
            embeddings: false,
            logs: false,
          },
        },
        null,
        2,
      ),
    );
    zip.file(
      "vfs/index.json",
      JSON.stringify(
        {
          version: 1,
          latest: { forkId: 0, turn: 1 },
          snapshots: [
            { forkId: 0, turn: 0, createdAt: 1 },
            { forkId: 0, turn: 1, createdAt: 2 },
          ],
        },
        null,
        2,
      ),
    );
    zip.file(
      "vfs/snapshots/fork-0/turn-0.json",
      JSON.stringify(makeSnapshotWithConversationHistory("slot-old", 0, 1), null, 2),
    );
    zip.file(
      "vfs/snapshots/fork-0/turn-1.json",
      JSON.stringify(makeSnapshotWithConversationHistory("slot-old", 1, 5), null, 2),
    );

    const staleIndexContent = JSON.stringify(staleIndex);
    zip.file(
      "vfs/shared.json",
      JSON.stringify(
        {
          version: 1,
          files: {
            "conversation/index.json": {
              path: "conversation/index.json",
              content: staleIndexContent,
              contentType: "application/json",
              hash: "stale",
              size: staleIndexContent.length,
              updatedAt: 1,
            },
          },
        },
        null,
        2,
      ),
    );

    const file = await createZipFile(zip, "stale-shared-index.zip");
    const result = await importSave(file, []);

    expect(result.success).toBe(true);

    const sharedCall = saveMetadataMock.mock.calls.find(
      (call) =>
        typeof call[0] === "string" &&
        String(call[0]).startsWith("vfs_shared:"),
    );
    expect(sharedCall).toBeTruthy();

    const savedShared = sharedCall?.[1] as {
      files?: Record<string, { content?: string }>;
    };
    const repaired = JSON.parse(
      savedShared.files?.["conversation/index.json"]?.content ?? "{}",
    ) as {
      activeTurnId: string;
      latestTurnNumberByFork: Record<string, number>;
      turnOrderByFork: Record<string, string[]>;
    };

    expect(repaired.latestTurnNumberByFork["0"]).toBe(5);
    expect(repaired.turnOrderByFork["0"]).toHaveLength(6);
    expect(repaired.activeTurnId).toBe("fork-0/turn-5");
  });

  it("importSave restores runtime metadata from archive", async () => {
    const { importSave } = await import("./saveExportService");

    const zip = new JSZip();
    zip.file("manifest.json", JSON.stringify(createValidManifest(), null, 2));
    zip.file(
      "vfs/index.json",
      JSON.stringify(
        {
          version: 1,
          latest: { forkId: 0, turn: 0 },
          snapshots: [{ forkId: 0, turn: 0, createdAt: 1 }],
        },
        null,
        2,
      ),
    );
    zip.file(
      "vfs/snapshots/fork-0/turn-0.json",
      JSON.stringify(makeSnapshot("slot-old"), null, 2),
    );
    zip.file("meta/ui_state.json", JSON.stringify({ panel: "rag", width: 300 }));
    zip.file(
      "meta/runtime_stats.json",
      JSON.stringify({
        tokenUsage: { totalTokens: 99 },
        logs: [{ role: "assistant", content: "ok" }],
        unlockMode: true,
        godMode: false,
      }),
    );

    const file = await createZipFile(zip, "runtime-meta-import.zip");
    const result = await importSave(file, []);

    expect(result.success).toBe(true);

    const uiStateCall = saveMetadataMock.mock.calls.find((call) =>
      String(call[0]).startsWith("ui_state:"),
    );
    const runtimeStatsCall = saveMetadataMock.mock.calls.find((call) =>
      String(call[0]).startsWith("runtime_stats:"),
    );
    expect(uiStateCall).toBeTruthy();
    expect(runtimeStatsCall).toBeTruthy();
    expect(uiStateCall?.[1]).toEqual({ panel: "rag", width: 300 });
    expect(runtimeStatsCall?.[1]).toMatchObject({
      tokenUsage: { totalTokens: 99 },
      unlockMode: true,
      godMode: false,
    });
  });

  it("importSave returns vfsImportFailed when snapshot persistence throws", async () => {
    const { importSave } = await import("./saveExportService");

    saveSnapshotMock.mockRejectedValueOnce(new Error("persist failed"));

    const zip = new JSZip();
    zip.file("manifest.json", JSON.stringify(createValidManifest(), null, 2));
    zip.file(
      "vfs/index.json",
      JSON.stringify(
        {
          version: 1,
          latest: { forkId: 0, turn: 0 },
          snapshots: [{ forkId: 0, turn: 0, createdAt: 1 }],
        },
        null,
        2,
      ),
    );
    zip.file(
      "vfs/snapshots/fork-0/turn-0.json",
      JSON.stringify(makeSnapshot("slot-old"), null, 2),
    );

    const file = await createZipFile(zip, "persist-fail.zip");
    const result = await importSave(file, []);

    expect(result.success).toBe(false);
    expect(result.errorI18n?.key).toBe("import.errors.vfsImportFailed");
  });
});
