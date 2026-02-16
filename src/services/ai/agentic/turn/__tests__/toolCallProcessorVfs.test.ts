import { describe, expect, it } from "vitest";
import { DEFAULTS } from "@/utils/constants";
import { VfsSession } from "@/services/vfs/vfsSession";
import { deriveGameStateFromVfs } from "@/services/vfs/derivations";
import { createLoopState } from "../loopInitializer";
import { executeGenericTool } from "../toolCallProcessor";
import {
  buildResponseFromVfs,
  getConversationMarker,
} from "../resultAccumulator";

const createValidGlobal = () => ({
  time: "Day 1",
  theme: "fantasy",
  currentLocation: "loc:1",
  atmosphere: {
    envTheme: "fantasy",
    ambience: "forest",
    weather: "clear",
  },
  turnNumber: 1,
  forkId: 0,
});

const createAssistantPayload = (narrative: string) => ({
  narrative,
  choices: [
    { text: "Continue" },
    { text: "Wait" },
  ],
});

describe("toolCallProcessor VFS integration", () => {
  it("passes VFS session to tool handlers", () => {
    const session = new VfsSession();
    const gameState = deriveGameStateFromVfs({});
    const loopState = createLoopState(
      gameState,
      DEFAULTS,
      false,
      false,
      session,
      [],
    );

    const output = executeGenericTool(
      "vfs_mutate",
      {
        ops: [
          {
            op: "write_file",
            path: "current/world/global.json",
            content: JSON.stringify(createValidGlobal()),
            contentType: "application/json",
          },
        ],
      },
      {
        loopState,
        gameState,
        settings: DEFAULTS,
      },
    ) as { success?: boolean };

    expect(output.success).toBe(true);
    const snapshot = session.snapshot();
    const globalEntry = Object.values(snapshot).find((entry) =>
      entry?.content?.includes('"time":"Day 1"'),
    );
    expect(globalEntry).toBeTruthy();
    expect(JSON.parse(globalEntry?.content ?? "{}").time).toBe("Day 1");
  });

  it("builds response from conversation turn files", () => {
    const session = new VfsSession();
    const gameState = deriveGameStateFromVfs({});
    const loopState = createLoopState(
      gameState,
      DEFAULTS,
      false,
      false,
      session,
      [],
    );

    const commit = executeGenericTool(
      "vfs_finish_turn",
      {
        userAction: "start",
        assistant: createAssistantPayload("hello"),
      },
      {
        loopState,
        gameState,
        settings: DEFAULTS,
      },
    ) as { success?: boolean };

    expect(commit.success).toBe(true);

    const response = buildResponseFromVfs(session);
    expect(response?.narrative).toBe("hello");
  });

  it("returns null when conversation has not advanced from baseline", () => {
    const session = new VfsSession();
    const gameState = deriveGameStateFromVfs({});
    const loopState = createLoopState(
      gameState,
      DEFAULTS,
      false,
      false,
      session,
      [],
    );

    const commit = executeGenericTool(
      "vfs_finish_turn",
      {
        userAction: "start",
        assistant: createAssistantPayload("hello"),
      },
      {
        loopState,
        gameState,
        settings: DEFAULTS,
      },
    ) as { success?: boolean };

    expect(commit.success).toBe(true);

    const baseline = getConversationMarker(session);
    const response = buildResponseFromVfs(session, baseline);
    expect(response).toBeNull();
  });

  it("returns response when conversation advances beyond baseline", () => {
    const session = new VfsSession();
    const gameState = deriveGameStateFromVfs({});
    const loopState = createLoopState(
      gameState,
      DEFAULTS,
      false,
      false,
      session,
      [],
    );

    const firstCommit = executeGenericTool(
      "vfs_finish_turn",
      {
        userAction: "start",
        assistant: createAssistantPayload("hello"),
      },
      {
        loopState,
        gameState,
        settings: DEFAULTS,
      },
    ) as { success?: boolean };

    expect(firstCommit.success).toBe(true);

    const baseline = getConversationMarker(session);

    const secondCommit = executeGenericTool(
      "vfs_finish_turn",
      {
        userAction: "next",
        assistant: createAssistantPayload("second"),
      },
      {
        loopState,
        gameState,
        settings: DEFAULTS,
      },
    ) as { success?: boolean };

    expect(secondCommit.success).toBe(true);

    const response = buildResponseFromVfs(session, baseline);
    expect(response?.narrative).toBe("second");
  });

  it("initial tools are vfs-only", () => {
    const session = new VfsSession();
    const gameState = deriveGameStateFromVfs({});
    const loopState = createLoopState(
      gameState,
      DEFAULTS,
      false,
      false,
      session,
      [],
    );

    expect(
      loopState.activeTools.every((tool) => tool.name.startsWith("vfs_")),
    ).toBe(true);
  });
});
