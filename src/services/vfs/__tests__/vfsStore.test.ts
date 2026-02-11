import { describe, it, expect, vi } from "vitest";
import { buildVfsIndex, InMemoryVfsStore, IndexedDbVfsStore } from "../store";

describe("VFS store", () => {
  it("builds deterministic index entries sorted by path", () => {
    const index = buildVfsIndex(
      {
        "world/b.json": {
          path: "world/b.json",
          content: "{}",
          contentType: "application/json",
          hash: "b",
          size: 2,
          updatedAt: 1,
        },
        "world/a.json": {
          path: "world/a.json",
          content: "{}",
          contentType: "application/json",
          hash: "a",
          size: 2,
          updatedAt: 1,
        },
      },
      {
        saveId: "s1",
        forkId: 2,
        turn: 3,
        createdAt: 9,
      },
    );

    expect(index).toEqual({
      saveId: "s1",
      forkId: 2,
      turn: 3,
      createdAt: 9,
      files: [
        { path: "world/a.json", hash: "a", size: 2 },
        { path: "world/b.json", hash: "b", size: 2 },
      ],
    });
  });

  it("saves and loads snapshots", async () => {
    const store = new InMemoryVfsStore();
    await store.saveSnapshot({
      saveId: "s1",
      forkId: 0,
      turn: 1,
      createdAt: 1,
      files: {},
    });
    const snapshot = await store.loadSnapshot("s1", 0, 1);
    expect(snapshot?.saveId).toBe("s1");
  });

  it("does not expose mutable snapshot references", async () => {
    const store = new InMemoryVfsStore();
    await store.saveSnapshot({
      saveId: "s1",
      forkId: 0,
      turn: 1,
      createdAt: 1,
      files: {
        "world/global.json": {
          path: "world/global.json",
          content: "{}",
          contentType: "application/json",
          hash: "abc",
          size: 2,
          updatedAt: 1,
        },
      },
    });

    const loaded = await store.loadSnapshot("s1", 0, 1);
    loaded!.files["world/global.json"].hash = "mutated";

    const reloaded = await store.loadSnapshot("s1", 0, 1);
    expect(reloaded!.files["world/global.json"].hash).toBe("abc");
  });

  it("lists snapshots in turn order and keeps index snapshots immutable", async () => {
    const store = new InMemoryVfsStore();
    await store.saveSnapshot({
      saveId: "s1",
      forkId: 0,
      turn: 2,
      createdAt: 2,
      files: {},
    });
    await store.saveSnapshot({
      saveId: "s1",
      forkId: 0,
      turn: 1,
      createdAt: 1,
      files: {
        "world/one.json": {
          path: "world/one.json",
          content: "{}",
          contentType: "application/json",
          hash: "one",
          size: 2,
          updatedAt: 1,
        },
      },
    });
    await store.saveSnapshot({
      saveId: "s1",
      forkId: 1,
      turn: 1,
      createdAt: 1,
      files: {},
    });

    const indexes = await store.listSnapshots("s1", 0);
    expect(indexes.map((entry) => entry.turn)).toEqual([1, 2]);

    indexes[0].files[0].hash = "mutated";
    const reloaded = await store.listSnapshots("s1", 0);
    expect(reloaded[0].files[0].hash).toBe("one");
  });

  it("delegates through IndexedDbVfsStore adapter and clones returned values", async () => {
    const adapter = {
      saveSnapshot: vi.fn(async () => undefined),
      loadSnapshot: vi.fn(async () => ({
        saveId: "s1",
        forkId: 0,
        turn: 1,
        createdAt: 1,
        files: {
          "world/global.json": {
            path: "world/global.json",
            content: "{}",
            contentType: "application/json",
            hash: "abc",
            size: 2,
            updatedAt: 1,
          },
        },
      })),
      listSnapshots: vi.fn(async () => [
        {
          saveId: "s1",
          forkId: 0,
          turn: 1,
          createdAt: 1,
          files: [{ path: "world/global.json", hash: "abc", size: 2 }],
        },
      ]),
    };

    const store = new IndexedDbVfsStore(adapter as any);
    const snapshot = {
      saveId: "s1",
      forkId: 0,
      turn: 1,
      createdAt: 1,
      files: {
        "world/b.json": {
          path: "world/b.json",
          content: "{}",
          contentType: "application/json",
          hash: "b",
          size: 2,
          updatedAt: 1,
        },
        "world/a.json": {
          path: "world/a.json",
          content: "{}",
          contentType: "application/json",
          hash: "a",
          size: 2,
          updatedAt: 1,
        },
      },
    } as const;

    await store.saveSnapshot(snapshot as any);
    expect(adapter.saveSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ saveId: "s1" }),
      expect.objectContaining({
        files: [
          { path: "world/a.json", hash: "a", size: 2 },
          { path: "world/b.json", hash: "b", size: 2 },
        ],
      }),
    );

    const loaded = await store.loadSnapshot("s1", 0, 1);
    expect(loaded?.files["world/global.json"].hash).toBe("abc");
    loaded!.files["world/global.json"].hash = "changed";
    const loadedAgain = await store.loadSnapshot("s1", 0, 1);
    expect(loadedAgain?.files["world/global.json"].hash).toBe("abc");

    const indexes = await store.listSnapshots("s1", 0);
    indexes[0].files[0].hash = "changed";
    const indexesAgain = await store.listSnapshots("s1", 0);
    expect(indexesAgain[0].files[0].hash).toBe("abc");

    adapter.loadSnapshot.mockResolvedValueOnce(null);
    await expect(store.loadSnapshot("s1", 0, 99)).resolves.toBeNull();
  });
});
