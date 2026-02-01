import { describe, it, expect } from "vitest";
import { VfsSession } from "../vfsSession";
import { InMemoryVfsStore } from "../store";
import { saveVfsSessionSnapshot } from "../persistence";

describe("VFS persistence", () => {
  it("saves snapshots after session updates", async () => {
    const store = new InMemoryVfsStore();
    const session = new VfsSession();

    session.writeFile("world/global.json", "{}", "application/json");

    await saveVfsSessionSnapshot(store, session, {
      saveId: "slot-1",
      forkId: 0,
      turn: 1,
      createdAt: 123,
    });

    const loaded = await store.loadSnapshot("slot-1", 0, 1);
    expect(
      loaded?.files["turns/fork-0/turn-1/world/global.json"]?.content,
    ).toBe("{}");
  });
});
