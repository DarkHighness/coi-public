import { describe, it, expect } from "vitest";
import { VfsSession } from "../vfsSession";
import { InMemoryVfsStore } from "../store";
import {
  applySharedMutableStateToSession,
  buildSharedMutableStateFromSession,
  extractSharedMutableStateFromSnapshot,
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

  it("excludes shared paths from fork snapshots", async () => {
    const store = new InMemoryVfsStore();
    const session = new VfsSession();

    session.writeFile("world/global.json", "{}", "application/json");
    session.writeFile(
      "world/theme_config.json",
      JSON.stringify({
        name: "T",
        narrativeStyle: "",
        worldSetting: "",
        backgroundTemplate: "",
        example: "",
        isRestricted: false,
      }),
      "application/json",
    );
    session.writeFile(
      "custom_rules/00-core/RULES.md",
      "## What This Category Is\nCore\n",
      "text/markdown",
    );

    await saveVfsSessionSnapshot(store, session, {
      saveId: "slot-1",
      forkId: 0,
      turn: 2,
      createdAt: 456,
    });

    const loaded = await store.loadSnapshot("slot-1", 0, 2);
    const paths = Object.keys(loaded?.files ?? {});

    expect(paths).toContain("turns/fork-0/turn-2/world/global.json");
    expect(paths.some((path) => path.includes("world/theme_config.json"))).toBe(
      false,
    );
    expect(paths.some((path) => path.includes("custom_rules/"))).toBe(false);
  });

  it("restores relative paths from a snapshot", () => {
    const session = new VfsSession();
    session.noteToolSeen("world/global.json");
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
    expect(session.hasToolSeenInCurrentEpoch("world/global.json")).toBe(false);
  });

  it("applies shared mutable layer on top of restored fork snapshot", async () => {
    const store = new InMemoryVfsStore();
    const source = new VfsSession();

    source.writeFile("world/global.json", "{}", "application/json");
    source.writeFile(
      "custom_rules/00-core/RULES.md",
      "## What This Category Is\nCore\n",
      "text/markdown",
    );

    await saveVfsSessionSnapshot(store, source, {
      saveId: "slot-1",
      forkId: 0,
      turn: 3,
    });

    const snapshot = await store.loadSnapshot("slot-1", 0, 3);
    const shared = buildSharedMutableStateFromSession(source);

    const restored = new VfsSession();
    restoreVfsSessionFromSnapshot(restored, snapshot as any);
    expect(restored.readFile("custom_rules/00-core/RULES.md")).toBeNull();

    applySharedMutableStateToSession(restored, shared);
    expect(
      restored.readFile("custom_rules/00-core/RULES.md")?.content,
    ).toContain("What This Category Is");
  });

  it("extracts shared mutable files from legacy snapshots for migration", () => {
    const shared = extractSharedMutableStateFromSnapshot({
      saveId: "slot-1",
      forkId: 0,
      turn: 1,
      createdAt: 1,
      files: {
        "turns/fork-0/turn-1/custom_rules/00-core/RULES.md": {
          path: "turns/fork-0/turn-1/custom_rules/00-core/RULES.md",
          content: "## What This Category Is\nCore\n",
          contentType: "text/markdown",
          hash: "h1",
          size: 10,
          updatedAt: 1,
        },
        "turns/fork-0/turn-1/world/theme_config.json": {
          path: "turns/fork-0/turn-1/world/theme_config.json",
          content: "{}",
          contentType: "application/json",
          hash: "h2",
          size: 2,
          updatedAt: 1,
        },
      },
    });

    expect(Object.keys(shared).sort()).toEqual([
      "custom_rules/00-core/RULES.md",
      "world/theme_config.json",
    ]);
  });
});
