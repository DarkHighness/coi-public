import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateEntityCleanup } from "./cleanup";
import { generateAdventureTurn } from "../turn/adventure";

vi.mock("../turn/adventure", () => ({
  generateAdventureTurn: vi.fn(),
}));

const mockedGenerateAdventureTurn = vi.mocked(generateAdventureTurn);

describe("generateEntityCleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds cleanup prompt with guardrails and routes through adventure loop", async () => {
    mockedGenerateAdventureTurn.mockResolvedValue({
      response: { narrative: "cleanup done", choices: [{ text: "Continue" }] },
      logs: [{ endpoint: "cleanup" }],
      usage: { promptTokens: 3, completionTokens: 2, totalTokens: 5 },
      changedEntities: [{ id: "quest:1", type: "quest" }],
      _conversationHistory: [],
    } as any);

    const inputState = { forkId: 7 } as any;
    const context = { slotId: "slot-clean", userAction: "old" } as any;

    const result = await generateEntityCleanup(inputState, context);

    expect(mockedGenerateAdventureTurn).toHaveBeenCalledTimes(1);
    const [, calledContext] = mockedGenerateAdventureTurn.mock.calls[0] as any[];

    expect(calledContext.slotId).toBe("slot-clean");
    expect(typeof calledContext.userAction).toBe("string");
    expect(calledContext.userAction.startsWith("[CLEANUP]")).toBe(true);
    expect(calledContext.userAction).toContain("vfs_ls_entries");
    expect(calledContext.userAction).toContain("vfs_suggest_duplicates");
    expect(calledContext.userAction).toContain("CRITICAL NARRATIVE PRIVACY RULE");

    expect(result).toEqual({
      response: { narrative: "cleanup done", choices: [{ text: "Continue" }] },
      logs: [{ endpoint: "cleanup" }],
      usage: { promptTokens: 3, completionTokens: 2, totalTokens: 5 },
      changedEntities: [{ id: "quest:1", type: "quest" }],
    });
  });

  it("keeps input game state untouched and injects generated cleanup action", async () => {
    mockedGenerateAdventureTurn.mockResolvedValue({
      response: { narrative: "ok", choices: [] },
      logs: [],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      changedEntities: [],
      _conversationHistory: [],
    } as any);

    const inputState = { outline: { title: "Demo" } } as any;
    const originalState = JSON.parse(JSON.stringify(inputState));

    await generateEntityCleanup(inputState, { userAction: "ignored" } as any);

    expect(inputState).toEqual(originalState);
    const [, calledContext] = mockedGenerateAdventureTurn.mock.calls[0] as any[];
    expect(calledContext.userAction).not.toBe("ignored");
  });
});
