import { describe, it, expect } from "vitest";
import { InMemoryVfsStore } from "../store";

describe("VFS store", () => {
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
});
