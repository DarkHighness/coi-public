import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateEntityCleanup } from "./cleanup";
import { generateAdventureTurn } from "../turn/adventure";

vi.mock("../turn/adventure", () => ({
  generateAdventureTurn: vi.fn(),
}));

const mockedGenerateAdventureTurn = vi.mocked(generateAdventureTurn);

describe("generateEntityCleanup anchor and context forwarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGenerateAdventureTurn.mockResolvedValue({
      response: { narrative: "cleanup done", choices: [] },
      logs: [],
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      changedEntities: [],
      _conversationHistory: [],
    } as any);
  });

  it("injects fork and turn anchors from input state", async () => {
    await generateEntityCleanup(
      {
        forkId: 5,
        turnNumber: 42,
      } as any,
      {
        slotId: "slot-clean",
        userAction: "ignored",
      } as any,
    );

    const [, calledContext] = mockedGenerateAdventureTurn.mock
      .calls[0] as any[];

    expect(calledContext.userAction).toContain("<cleanup_anchor>");
    expect(calledContext.userAction).toContain("<loop_quickstart>");
    expect(calledContext.userAction).toContain(
      "<target_fork_id>5</target_fork_id>",
    );
    expect(calledContext.userAction).toContain(
      "<target_turn_number>42</target_turn_number>",
    );
    expect(calledContext.userAction).toContain(
      "use `vfs_read` to load command protocol (hub first)",
    );
    expect(calledContext.userAction).toContain(
      "current/skills/commands/runtime/SKILL.md",
    );
    expect(calledContext.userAction).toContain(
      "current/skills/commands/runtime/cleanup/SKILL.md",
    );
    expect(calledContext.userAction).toContain(
      "current/world/characters/char:player/views/quests/<id>.json",
    );
    expect(calledContext.userAction).toContain(
      "worldSettingUnlocked/mainGoalUnlocked",
    );
    expect(calledContext.userAction).not.toContain(
      'current/world/quests/<id>.json", mode: "json", pointers: ["/visible", "/hidden", "/status", "/unlocked"]',
    );
    expect(calledContext.userAction).not.toContain(
      'current/world/timeline/<id>.json", mode: "json", pointers: ["/visible", "/hidden", "/time", "/unlocked"]',
    );
  });

  it("defaults vfsMode/vfsElevationToken when they are not provided", async () => {
    await generateEntityCleanup(
      {
        forkId: 1,
      } as any,
      {
        userAction: "ignored",
      } as any,
    );

    const [, calledContext] = mockedGenerateAdventureTurn.mock
      .calls[0] as any[];

    expect(calledContext.vfsMode).toBe("normal");
    expect(calledContext.vfsElevationToken).toBeNull();
  });
});
