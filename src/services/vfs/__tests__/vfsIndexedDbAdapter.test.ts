import { describe, it, expect } from "vitest";
import type { VfsIndex, VfsSnapshot } from "../types";
import { buildVfsIndex, IndexedDbVfsStore } from "../store";

const createAdapter = () => {
  const snapshots = new Map<string, VfsSnapshot>();
  const indexes = new Map<string, VfsIndex>();

  const makeKey = (saveId: string, forkId: number, turn: number) =>
    `${saveId}:${forkId}:${turn}`;

  return {
    async saveSnapshot(snapshot: VfsSnapshot, index: VfsIndex): Promise<void> {
      const key = makeKey(snapshot.saveId, snapshot.forkId, snapshot.turn);
      snapshots.set(key, JSON.parse(JSON.stringify(snapshot)) as VfsSnapshot);
      indexes.set(key, JSON.parse(JSON.stringify(index)) as VfsIndex);
    },
    async loadSnapshot(
      saveId: string,
      forkId: number,
      turn: number,
    ): Promise<VfsSnapshot | null> {
      const key = makeKey(saveId, forkId, turn);
      return snapshots.get(key) ?? null;
    },
    async listSnapshots(saveId: string, forkId: number): Promise<VfsIndex[]> {
      return Array.from(indexes.values())
        .filter((entry) => entry.saveId === saveId && entry.forkId === forkId)
        .sort((a, b) => a.turn - b.turn)
        .map((entry) => ({
          ...entry,
          files: entry.files.map((file) => ({ ...file })),
        }));
    },
  };
};

describe("IndexedDbVfsStore adapter", () => {
  it("saves, loads, and lists snapshots", async () => {
    const adapter = createAdapter();
    const store = new IndexedDbVfsStore(adapter);
    const snapshot: VfsSnapshot = {
      saveId: "save-1",
      forkId: 0,
      turn: 3,
      createdAt: 123,
      files: {
        "world/global.json": {
          path: "world/global.json",
          content: "{}",
          contentType: "application/json",
          hash: "hash-1",
          size: 2,
          updatedAt: 123,
        },
      },
    };

    await store.saveSnapshot(snapshot);

    const loaded = await store.loadSnapshot("save-1", 0, 3);
    expect(loaded).toEqual(snapshot);

    const expectedIndex = buildVfsIndex(snapshot.files, {
      saveId: "save-1",
      forkId: 0,
      turn: 3,
      createdAt: 123,
    });
    const list = await store.listSnapshots("save-1", 0);
    expect(list).toEqual([expectedIndex]);
  });
});
