import { describe, it, expect } from "vitest";
import { VfsSession } from "../vfsSession";
import {
  buildTurnId,
  buildTurnPath,
  readConversationIndex,
  readTurnFile,
  writeConversationIndex,
  writeTurnFile,
} from "../conversation";

describe("VFS conversation helpers", () => {
  it("builds ids and paths", () => {
    expect(buildTurnId(0, 3)).toBe("fork-0/turn-3");
    expect(buildTurnPath(0, 3)).toBe(
      "conversation/turns/fork-0/turn-3.json",
    );
  });

  it("writes and reads index + turn files", () => {
    const session = new VfsSession();
    writeConversationIndex(session, {
      activeForkId: 0,
      activeTurnId: "fork-0/turn-0",
      rootTurnIdByFork: { "0": "fork-0/turn-0" },
      latestTurnNumberByFork: { "0": 0 },
      turnOrderByFork: { "0": ["fork-0/turn-0"] },
    });

    writeTurnFile(session, 0, 0, {
      turnId: "fork-0/turn-0",
      forkId: 0,
      turnNumber: 0,
      parentTurnId: null,
      createdAt: 1,
      userAction: "",
      assistant: { narrative: "", choices: [] },
    });

    const index = readConversationIndex(session.snapshot());
    const turn = readTurnFile(session.snapshot(), 0, 0);

    expect(index?.activeTurnId).toBe("fork-0/turn-0");
    expect(turn?.turnNumber).toBe(0);
  });
});
