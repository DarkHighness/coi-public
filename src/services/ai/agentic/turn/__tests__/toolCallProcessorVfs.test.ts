import { describe, it, expect } from "vitest";
import { DEFAULTS } from "@/utils/constants";
import { VfsSession } from "@/services/vfs/vfsSession";
import { deriveGameStateFromVfs } from "@/services/vfs/derivations";
import { createLoopState } from "../loopInitializer";
import { executeGenericTool } from "../toolCallProcessor";

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
});
