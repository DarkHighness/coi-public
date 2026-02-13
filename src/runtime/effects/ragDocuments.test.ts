import { describe, expect, it, vi } from "vitest";
import type { VfsFileMap } from "../../services/vfs/types";
import {
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
  it("uses retireLatestByPaths for incremental updates and upserts changed chunks", async () => {
    const ragService = {
      initialized: true,
      reindexAll: vi.fn().mockResolvedValue({ deleted: 0, count: 2 }),
      retireLatestByPaths: vi.fn().mockResolvedValue({ deleted: 2 }),
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
    expect(ragService.retireLatestByPaths).not.toHaveBeenCalled();

    await updateRAGDocumentsBackground(
      [],
      { saveId: "save-inc-1", forkId: 0, turnNumber: 2 } as any,
      vfsSession,
    );

    expect(ragService.retireLatestByPaths).toHaveBeenCalledTimes(1);
    const retirePayload = ragService.retireLatestByPaths.mock.calls[0]?.[0];
    expect(retirePayload.saveId).toBe("save-inc-1");
    expect(retirePayload.forkId).toBe(0);
    expect(retirePayload.turnNumber).toBe(2);
    expect(retirePayload.paths).toEqual(
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
});
