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

    const [, calledContext] = mockedGenerateAdventureTurn.mock.calls[0] as any[];

    expect(calledContext.userAction).toContain("<cleanup_anchor>");
    expect(calledContext.userAction).toContain("<target_fork_id>5</target_fork_id>");
    expect(calledContext.userAction).toContain(
      "<target_turn_number>42</target_turn_number>",
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

    const [, calledContext] = mockedGenerateAdventureTurn.mock.calls[0] as any[];

    expect(calledContext.vfsMode).toBe("normal");
    expect(calledContext.vfsElevationToken).toBeNull();
  });
});
