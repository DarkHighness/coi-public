import { describe, expect, it, vi } from "vitest";
import type { VfsFileMap } from "../../services/vfs/types";
import {
  invalidateRAGSnapshotCache,
  indexInitialEntities,
  updateRAGDocumentsBackground,
} from "./ragDocuments";

const getRAGServiceMock = vi.hoisted(() => vi.fn());

vi.mock("../../services/rag", () => ({
  getRAGService: getRAGServiceMock,
}));

const createFile = (
  path: string,
  content: string,
  hash: string,
  contentType:
    | "text/plain"
    | "application/json"
    | "text/markdown" = "text/plain",
) => ({
  path,
  content,
  contentType,
  hash,
  size: content.length,
  updatedAt: 1,
});

describe("runtime/effects/ragDocuments", () => {
  it("deletes old path chunks for incremental updates and upserts changed chunks", async () => {
    const ragService = {
      initialized: true,
      reindexAll: vi.fn().mockResolvedValue({ deleted: 0, count: 2 }),
      deleteByPaths: vi.fn().mockResolvedValue({ deleted: 2 }),
      upsertFileChunks: vi.fn().mockResolvedValue({ count: 2 }),
    };

    getRAGServiceMock.mockReturnValue(ragService);

    const snapshot1: VfsFileMap = {
      "current/world/a.txt": createFile("current/world/a.txt", "alpha", "ha-1"),
      "current/world/b.txt": createFile("current/world/b.txt", "beta", "hb-1"),
    };

    const snapshot2: VfsFileMap = {
      "current/world/a.txt": createFile(
        "current/world/a.txt",
        "alpha changed",
        "ha-2",
      ),
      "current/world/c.txt": createFile("current/world/c.txt", "gamma", "hc-1"),
    };

    const snapshots = [snapshot1, snapshot2];
    const vfsSession = {
      snapshotAllCanonical: vi.fn(() => snapshots.shift() || snapshot2),
    } as any;

    await updateRAGDocumentsBackground(
      [],
      { saveId: "save-inc-1", forkId: 0, turnNumber: 1 } as any,
      vfsSession,
    );

    expect(ragService.reindexAll).toHaveBeenCalledTimes(1);
    expect(ragService.deleteByPaths).not.toHaveBeenCalled();

    await updateRAGDocumentsBackground(
      [],
      { saveId: "save-inc-1", forkId: 0, turnNumber: 2 } as any,
      vfsSession,
    );

    expect(ragService.deleteByPaths).toHaveBeenCalledTimes(1);
    const deletePayload = ragService.deleteByPaths.mock.calls[0]?.[0];
    expect(deletePayload.saveId).toBe("save-inc-1");
    expect(deletePayload.forkId).toBe(0);
    expect(deletePayload.paths).toEqual(
      expect.arrayContaining([
        "current/world/a.txt",
        "current/world/b.txt",
        "current/world/c.txt",
      ]),
    );

    expect(ragService.upsertFileChunks).toHaveBeenCalledTimes(1);
    const upsertDocs = ragService.upsertFileChunks.mock.calls[0]?.[0] || [];
    const upsertPaths = upsertDocs.map((doc: any) => doc.sourcePath);
    expect(upsertPaths).toEqual(
      expect.arrayContaining(["world/a.txt", "world/c.txt"]),
    );
    expect(upsertPaths).not.toContain("world/b.txt");
  });

  it("switches save context then reindexes on initial indexing", async () => {
    const ragService = {
      initialized: true,
      switchSave: vi.fn().mockResolvedValue({ success: true }),
      reindexAll: vi.fn().mockResolvedValue({ deleted: 0, count: 1 }),
    };

    getRAGServiceMock.mockReturnValue(ragService);

    const vfsSession = {
      snapshotAllCanonical: vi.fn(
        () =>
          ({
            "current/world/intro.txt": createFile(
              "current/world/intro.txt",
              "intro",
              "h-intro",
            ),
          }) as VfsFileMap,
      ),
    } as any;

    const gameState = {
      forkId: 2,
      turnNumber: 5,
      forkTree: {
        nodes: {
          2: { id: 2, parentId: null },
        },
      },
    } as any;

    await indexInitialEntities(gameState, "save-init-1", vfsSession);

    expect(ragService.switchSave).toHaveBeenCalledWith(
      "save-init-1",
      2,
      gameState.forkTree,
    );

    expect(ragService.reindexAll).toHaveBeenCalledTimes(1);
    const payload = ragService.reindexAll.mock.calls[0]?.[0];
    expect(payload.saveId).toBe("save-init-1");
    expect(payload.forkId).toBe(2);
    expect(payload.turnNumber).toBe(5);
    expect(Array.isArray(payload.documents)).toBe(true);
    expect(payload.documents.length).toBeGreaterThan(0);
  });

  it("invalidates snapshot cache to force a fresh reindex", async () => {
    const ragService = {
      initialized: true,
      reindexAll: vi.fn().mockResolvedValue({ deleted: 0, count: 1 }),
      deleteByPaths: vi.fn().mockResolvedValue({ deleted: 0 }),
      upsertFileChunks: vi.fn().mockResolvedValue({ count: 1 }),
    };

    getRAGServiceMock.mockReturnValue(ragService);

    const snapshot: VfsFileMap = {
      "current/world/a.txt": createFile("current/world/a.txt", "alpha", "ha-1"),
    };

    const vfsSession = {
      snapshotAllCanonical: vi.fn(() => snapshot),
    } as any;

    await updateRAGDocumentsBackground(
      [],
      { saveId: "save-cache-1", forkId: 0, turnNumber: 1 } as any,
      vfsSession,
    );

    expect(ragService.reindexAll).toHaveBeenCalledTimes(1);

    invalidateRAGSnapshotCache("save-cache-1", 0);

    await updateRAGDocumentsBackground(
      [],
      { saveId: "save-cache-1", forkId: 0, turnNumber: 2 } as any,
      vfsSession,
    );

    expect(ragService.reindexAll).toHaveBeenCalledTimes(2);
    expect(ragService.deleteByPaths).not.toHaveBeenCalled();
  });
});
