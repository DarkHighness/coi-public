import { describe, expect, it } from "vitest";
import {
  checkpointVfsSession,
  clearVfsCheckpoint,
  rollbackVfsSessionToCheckpoint,
} from "../runtimeCheckpoints";
import { VfsSession } from "../vfsSession";

describe("VFS runtime checkpoints", () => {
  it("rolls back files and read-fence state together", () => {
    const session = new VfsSession();
    const sessionId = "session-1";

    session.writeFile("world/notes.md", "A", "text/markdown");
    session.noteToolSeen("world/notes.md");
    session.noteToolAccessFile("world/notes.md");
    checkpointVfsSession(sessionId, session);

    session.beginReadEpoch("summary_created");
    session.writeFile("world/notes.md", "B", "text/markdown");
    session.noteToolAccessScope("world");
    session.noteOutOfBandMutation("world/notes.md", "modified");

    expect(session.readFile("world/notes.md")?.content).toBe("B");
    expect(session.hasToolSeenInCurrentEpoch("world/notes.md")).toBe(false);
    expect(session.drainOutOfBandReadInvalidations()).toEqual([
      { path: "world/notes.md", changeType: "modified" },
    ]);

    const rolledBack = rollbackVfsSessionToCheckpoint(sessionId, session);

    expect(rolledBack).toBe(true);
    expect(session.readFile("world/notes.md")?.content).toBe("A");
    expect(session.hasToolSeenInCurrentEpoch("world/notes.md")).toBe(true);
    expect(session.hasToolAccessedInCurrentEpoch("world/notes.md")).toBe(true);
    expect(session.drainOutOfBandReadInvalidations()).toEqual([]);

    clearVfsCheckpoint(sessionId);
  });

  it("returns false when no checkpoint exists", () => {
    const session = new VfsSession();
    const rolledBack = rollbackVfsSessionToCheckpoint("missing", session);
    expect(rolledBack).toBe(false);
  });
});
