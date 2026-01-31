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
});
