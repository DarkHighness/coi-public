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
    expect(calledContext.userAction).toContain("<cleanup_anchor>");
    expect(calledContext.userAction).toContain("<target_fork_id>7</target_fork_id>");
    expect(calledContext.userAction).toContain("required_first_read");
    expect(calledContext.userAction).toContain("Never read/mutate other forks");
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

  it("passes recovery trace through when cleanup recovered", async () => {
    const recovery = {
      attempts: [{ level: 2, kind: "context", attempt: 3, timestamp: Date.now() }],
      finalLevel: 2,
      kind: "context",
      recovered: true,
      durationMs: 88,
    };

    mockedGenerateAdventureTurn.mockResolvedValue({
      response: { narrative: "ok", choices: [] },
      logs: [],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      changedEntities: [],
      _conversationHistory: [],
      recovery,
    } as any);

    const result = await generateEntityCleanup({} as any, {
      userAction: "ignored",
    } as any);

    expect(result.recovery).toEqual(recovery);
  });
});
