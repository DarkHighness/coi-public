import { describe, it, expect } from "vitest";
import { VfsSession } from "../vfsSession";
import { InMemoryVfsStore } from "../store";
import {
  restoreVfsSessionFromSnapshot,
  saveVfsSessionSnapshot,
} from "../persistence";

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

  it("restores relative paths from a snapshot", () => {
    const session = new VfsSession();
    const snapshot = {
      saveId: "slot-1",
      forkId: 0,
      turn: 1,
      createdAt: 1,
      files: {
        "turns/fork-0/turn-1/world/global.json": {
          path: "turns/fork-0/turn-1/world/global.json",
          content: "{}",
          contentType: "application/json" as const,
          hash: "hash",
          size: 2,
          updatedAt: 0,
        },
      },
    };

    restoreVfsSessionFromSnapshot(session, snapshot);
    expect(session.readFile("world/global.json")?.content).toBe("{}");
  });
});
