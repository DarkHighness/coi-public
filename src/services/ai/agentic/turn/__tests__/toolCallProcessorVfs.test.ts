import { describe, it, expect } from "vitest";
import { DEFAULTS } from "@/utils/constants";
import { VfsSession } from "@/services/vfs/vfsSession";
import { deriveGameStateFromVfs } from "@/services/vfs/derivations";
import { createLoopState } from "../loopInitializer";
import { executeGenericTool } from "../toolCallProcessor";
import { buildResponseFromVfs } from "../resultAccumulator";

describe("toolCallProcessor VFS integration", () => {
  it("passes VFS session to tool handlers", () => {
    const session = new VfsSession();
    const gameState = deriveGameStateFromVfs({});
    const loopState = createLoopState(gameState, DEFAULTS, false);

    const output = executeGenericTool(
      "vfs_write",
      {
        files: [
          {
            path: "current/world/global.json",
            content: "{}",
            contentType: "application/json",
          },
        ],
      },
      {
        loopState,
        gameState,
        settings: DEFAULTS,
        vfsSession: session,
      },
    ) as { success?: boolean };

    expect(output.success).toBe(true);
    expect(session.readFile("world/global.json")?.content).toBe("{}");
  });

  it("builds response from conversation turn files", () => {
    const session = new VfsSession();
    const gameState = deriveGameStateFromVfs({});
    const loopState = createLoopState(gameState, DEFAULTS, false);

    executeGenericTool(
      "vfs_write",
      {
        files: [
          {
            path: "current/conversation/index.json",
            content: JSON.stringify({
              activeForkId: 0,
              activeTurnId: "fork-0/turn-0",
              rootTurnIdByFork: { "0": "fork-0/turn-0" },
              latestTurnNumberByFork: { "0": 0 },
              turnOrderByFork: { "0": ["fork-0/turn-0"] },
            }),
            contentType: "application/json",
          },
          {
            path: "current/conversation/turns/fork-0/turn-0.json",
            content: JSON.stringify({
              turnId: "fork-0/turn-0",
              forkId: 0,
              turnNumber: 0,
              parentTurnId: null,
              createdAt: 1,
              userAction: "start",
              assistant: { narrative: "hello", choices: [] },
            }),
            contentType: "application/json",
          },
        ],
      },
      {
        loopState,
        gameState,
        settings: DEFAULTS,
        vfsSession: session,
      },
    );

    const response = buildResponseFromVfs(session);
    expect(response?.narrative).toBe("hello");
  });
});
