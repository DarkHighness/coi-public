import { describe, it, expect } from "vitest";
import { VfsSession } from "../vfsSession";

describe("VfsSession", () => {
  it("writes and reads files", () => {
    const session = new VfsSession();
    session.writeFile("world/global.json", "{}", "application/json");
    expect(session.readFile("world/global.json")?.content).toBe("{}");
  });

  it("lists directories", () => {
    const session = new VfsSession();
    session.writeFile("world/npcs/npc:1.json", "{}", "application/json");
    expect(session.list("world/npcs")).toContain("npc:1.json");
  });

  it("lists root entries for empty or slash paths", () => {
    const session = new VfsSession();
    session.writeFile("world/npcs/npc:1.json", "{}", "application/json");
    session.writeFile("world/global.json", "{}", "application/json");
    session.writeFile("local/notes.txt", "hi", "text/plain");
    session.writeFile("root.txt", "root", "text/plain");

    const listEmpty = session.list("");
    const listSlash = session.list("/");

    expect(listEmpty).toEqual(
      expect.arrayContaining(["world", "local", "root.txt", "skills", "refs"]),
    );
    expect(listSlash).toEqual(
      expect.arrayContaining(["world", "local", "root.txt", "skills", "refs"]),
    );
    expect(new Set(listEmpty).size).toBe(listEmpty.length);
  });

  it("readFile returns a clone and normalizes paths", () => {
    const session = new VfsSession();
    session.writeFile("world/global.json", "{}", "application/json");

    const first = session.readFile("/world//global.json");
    expect(first).not.toBeNull();
    expect(first?.path).toBe("world/global.json");

    if (!first) {
      throw new Error("Expected file to exist");
    }

    first.content = "mutated";
    first.path = "mutated.json";

    const second = session.readFile("world/global.json");
    expect(second).not.toBeNull();
    expect(second?.content).toBe("{}");
    expect(second?.path).toBe("world/global.json");
    expect(second).not.toBe(first);
  });

  it("treats rename to same path as no-op", () => {
    const session = new VfsSession();
    session.writeFile("world/global.json", "{}", "application/json");

    session.renameFile("world/global.json", "world/global.json");

    expect(session.readFile("world/global.json")?.content).toBe("{}");
  });

  it("throws when renaming a missing file even if paths match", () => {
    const session = new VfsSession();
    expect(() =>
      session.renameFile("world/missing.json", "world/missing.json"),
    ).toThrow();
  });

  it("exposes global read-only skills files", () => {
    const session = new VfsSession();
    expect(session.readFile("skills/README.md")?.contentType).toBe(
      "text/markdown",
    );
    const indexContent = session.readFile("skills/index.json")?.content ?? "";
    const indexJson = JSON.parse(indexContent) as {
      skills?: Array<{ id?: string }>;
    };
    const ids = new Set(
      (indexJson.skills ?? []).map((s) => s.id).filter(Boolean),
    );

    // Representative skill IDs across domains (keep this resilient to library evolution).
    for (const id of [
      "core-identity",
      "gm-knowledge",
      "gm-fail-forward",
      "commands-runtime-hub",
      "presets-runtime-hub",
      "craft-writing",
      "craft-scene-beats",
      "craft-reveals-foreshadowing",
      "npc-logic",
      "worldbuilding-hub",
      "theme-fantasy",
      "theme-element-media",
    ]) {
      expect(ids.has(id)).toBe(true);
    }

    expect(session.list("skills")).toEqual(
      expect.arrayContaining([
        "README.md",
        "index.json",
        "STYLE.md",
        "TAXONOMY.md",
        "core",
        "gm",
        "worldbuilding",
        "craft",
        "commands",
        "npc",
        "conditional",
        "theme",
      ]),
    );

    expect(session.list("skills/gm/state-management")).toEqual(
      expect.arrayContaining(["SKILL.md", "CHECKLIST.md", "EXAMPLES.md"]),
    );

    expect(session.list("skills/commands/runtime/sudo")).toEqual(
      expect.arrayContaining([
        "SKILL.md",
        "CHECKLIST.md",
        "EXAMPLES.md",
        "references",
      ]),
    );

    expect(session.list("skills/commands/runtime/turn")).toEqual(
      expect.arrayContaining(["SKILL.md", "CHECKLIST.md", "EXAMPLES.md"]),
    );

    expect(session.list("skills/commands/runtime/unlock")).toEqual(
      expect.arrayContaining(["SKILL.md", "CHECKLIST.md", "EXAMPLES.md"]),
    );

    expect(session.list("skills/commands/runtime/outline")).toEqual(
      expect.arrayContaining(["SKILL.md", "CHECKLIST.md", "EXAMPLES.md"]),
    );

    expect(session.list("skills/gm/fail-forward")).toEqual(
      expect.arrayContaining(["SKILL.md", "CHECKLIST.md", "EXAMPLES.md"]),
    );
    expect(session.list("skills/craft/scene-beats")).toEqual(
      expect.arrayContaining(["SKILL.md", "CHECKLIST.md", "EXAMPLES.md"]),
    );
    expect(
      session.list("skills/worldbuilding/systems/medicine-forensics"),
    ).toEqual(
      expect.arrayContaining(["SKILL.md", "CHECKLIST.md", "EXAMPLES.md"]),
    );
    expect(session.list("skills/theme/element-media")).toEqual(
      expect.arrayContaining(["SKILL.md"]),
    );
  });

  it("treats skills/** as read-only and does not persist it in snapshots", () => {
    const session = new VfsSession();

    expect(() =>
      session.writeFile("skills/custom.txt", "nope", "text/plain"),
    ).toThrow(/read-only/i);
    expect(() =>
      session.renameFile("skills/README.md", "skills/x.txt"),
    ).toThrow(/read-only/i);
    expect(() => session.deleteFile("skills/README.md")).toThrow(/read-only/i);

    const snapshot = session.snapshot();
    expect(snapshot["skills/README.md"]).toBeUndefined();
    expect(Object.keys(snapshot).some((p) => p.startsWith("skills/"))).toBe(
      false,
    );
  });

  it("treats refs/** as read-only virtual files", () => {
    const session = new VfsSession();

    expect(session.readFile("refs/atmosphere/options.md")?.contentType).toBe(
      "text/markdown",
    );
    expect(session.readFile("refs/tools/README.md")?.contentType).toBe(
      "text/markdown",
    );
    expect(() =>
      session.writeFile("refs/custom.md", "nope", "text/markdown"),
    ).toThrow(/read-only/i);
  });

  it("drops read-only virtual entries when restoring snapshots", () => {
    const session = new VfsSession();
    session.restore({
      "skills/evil.txt": {
        path: "skills/evil.txt",
        content: "evil",
        contentType: "text/plain",
        hash: "deadbeef",
        size: 4,
        updatedAt: 0,
      },
      "refs/evil.md": {
        path: "refs/evil.md",
        content: "evil",
        contentType: "text/markdown",
        hash: "evil",
        size: 4,
        updatedAt: 0,
      },
      "world/global.json": {
        path: "world/global.json",
        content: "{}",
        contentType: "application/json",
        hash: "0",
        size: 2,
        updatedAt: 0,
      },
    });

    expect(session.readFile("skills/evil.txt")).toBeNull();
    expect(session.readFile("refs/evil.md")).toBeNull();
    expect(session.readFile("world/global.json")).toBeTruthy();
  });

  it("tracks out-of-band read invalidations for accessed files", () => {
    const session = new VfsSession();

    session.noteToolSeen("world/notes.md");
    session.noteToolAccessFile("world/notes.md");
    session.noteOutOfBandMutation("world/notes.md", "modified");

    expect(session.hasToolSeenInCurrentEpoch("world/notes.md")).toBe(false);
    expect(session.hasToolAccessedInCurrentEpoch("world/notes.md")).toBe(false);
    expect(session.drainOutOfBandReadInvalidations()).toEqual([
      { path: "world/notes.md", changeType: "modified" },
    ]);
    expect(session.drainOutOfBandReadInvalidations()).toEqual([]);

    session.noteToolSeen("world/notes.md");
    expect(session.drainOutOfBandReadInvalidations()).toEqual([]);
  });

  it("ignores out-of-band invalidations for never-accessed files", () => {
    const session = new VfsSession();

    session.noteOutOfBandMutation("world/notes.md", "modified");

    expect(session.drainOutOfBandReadInvalidations()).toEqual([]);
  });

  it("supports scope-based access for out-of-band invalidation", () => {
    const session = new VfsSession();

    session.noteToolAccessScope("world");
    session.noteOutOfBandMutation("world/notes.md", "modified");

    expect(session.drainOutOfBandReadInvalidations()).toEqual([
      { path: "world/notes.md", changeType: "modified" },
    ]);
  });

  it("treats empty access scope as global for out-of-band invalidation", () => {
    const session = new VfsSession();

    session.noteToolAccessScope("");
    session.noteOutOfBandMutation("custom_rules/01-guide.md", "modified");

    expect(session.drainOutOfBandReadInvalidations()).toEqual([
      { path: "custom_rules/01-guide.md", changeType: "modified" },
    ]);
  });

  it("tracks moved out-of-band invalidations", () => {
    const session = new VfsSession();

    session.noteToolAccessFile("world/notes.md");
    session.noteOutOfBandMove("world/notes.md", "world/archive/notes.md");

    expect(session.drainOutOfBandReadInvalidations()).toEqual([
      {
        from: "world/notes.md",
        to: "world/archive/notes.md",
        changeType: "moved",
      },
    ]);
  });

  it("invalidates seen paths when read epoch advances", () => {
    const session = new VfsSession();
    session.noteToolSeen("world/notes.md");

    expect(session.hasToolSeenInCurrentEpoch("world/notes.md")).toBe(true);

    session.beginReadEpoch("summary_created");

    expect(session.hasToolSeenInCurrentEpoch("world/notes.md")).toBe(false);
  });

  it("bumps read epoch when conversation session changes", () => {
    const session = new VfsSession();

    const firstBind = session.bindConversationSession("session-a");
    expect(firstBind.changed).toBe(true);

    session.noteToolSeen("world/notes.md");
    expect(session.hasToolSeenInCurrentEpoch("world/notes.md")).toBe(true);

    const sameBind = session.bindConversationSession("session-a");
    expect(sameBind.changed).toBe(false);
    expect(session.hasToolSeenInCurrentEpoch("world/notes.md")).toBe(true);

    const switched = session.bindConversationSession("session-b");
    expect(switched.changed).toBe(true);
    expect(session.hasToolSeenInCurrentEpoch("world/notes.md")).toBe(false);
  });

  it("restores read fence state from snapshot", () => {
    const session = new VfsSession();

    session.bindConversationSession("session-a");
    session.noteToolSeen("world/notes.md");
    const snapshot = session.snapshotReadFenceState();

    session.beginReadEpoch("manual_invalidate");
    expect(session.hasToolSeenInCurrentEpoch("world/notes.md")).toBe(false);

    session.restoreReadFenceState(snapshot);
    expect(session.hasToolSeenInCurrentEpoch("world/notes.md")).toBe(true);
  });

  it("restores global access scope from read fence snapshot", () => {
    const session = new VfsSession();

    session.noteToolAccessScope("");
    const snapshot = session.snapshotReadFenceState();

    session.beginReadEpoch("manual_invalidate");
    session.restoreReadFenceState(snapshot);
    session.noteOutOfBandMutation("custom_rules/01-guide.md", "modified");

    expect(session.drainOutOfBandReadInvalidations()).toEqual([
      { path: "custom_rules/01-guide.md", changeType: "modified" },
    ]);
  });
});
