import { describe, expect, it, vi, beforeEach } from "vitest";
import { generateForceUpdate } from "./forceUpdate";
import { generateAdventureTurn } from "../turn/adventure";

vi.mock("../turn/adventure", () => ({
  generateAdventureTurn: vi.fn(),
}));

const mockedGenerateAdventureTurn = vi.mocked(generateAdventureTurn);

describe("generateForceUpdate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefixes prompt with [SUDO] and backfills finalState when missing", async () => {
    const inputState = { forkId: 0, marker: "state" } as any;
    const context = {
      userAction: "original",
      slotId: "slot-a",
      settings: {},
    } as any;

    mockedGenerateAdventureTurn.mockResolvedValue({
      response: { narrative: "done", choices: [] },
      logs: [{ endpoint: "x" }],
      usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 },
      changedEntities: [{ id: "npc:1", type: "npc" }],
      _conversationHistory: [],
    } as any);

    const result = await generateForceUpdate("refresh world", inputState, context);

    expect(mockedGenerateAdventureTurn).toHaveBeenCalledWith(
      inputState,
      expect.objectContaining({
        slotId: "slot-a",
        userAction: "[SUDO] refresh world",
      }),
    );

    expect((result.response as any).finalState).toBe(inputState);
    expect(result.logs).toEqual([{ endpoint: "x" }]);
    expect(result.usage).toEqual({ promptTokens: 1, completionTokens: 2, totalTokens: 3 });
    expect(result.changedEntities).toEqual([{ id: "npc:1", type: "npc" }]);
  });

  it("keeps existing finalState provided by adventure result", async () => {
    const inputState = { marker: "state" } as any;
    const existingFinalState = { marker: "from-adventure" };

    mockedGenerateAdventureTurn.mockResolvedValue({
      response: {
        narrative: "ok",
        choices: [],
        finalState: existingFinalState,
      },
      logs: [],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      changedEntities: [],
      _conversationHistory: [],
    } as any);

    const result = await generateForceUpdate("noop", inputState, {
      userAction: "ignored",
    } as any);

    expect((result.response as any).finalState).toBe(existingFinalState);
  });

  it("passes recovery trace through when adventure turn recovered", async () => {
    const recovery = {
      attempts: [{ level: 1, kind: "history", attempt: 2, timestamp: Date.now() }],
      finalLevel: 1,
      kind: "history",
      recovered: true,
      durationMs: 42,
    };

    mockedGenerateAdventureTurn.mockResolvedValue({
      response: { narrative: "ok", choices: [] },
      logs: [],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      changedEntities: [],
      _conversationHistory: [],
      recovery,
    } as any);

    const result = await generateForceUpdate("noop", {} as any, {
      userAction: "ignored",
    } as any);

    expect(result.recovery).toEqual(recovery);
  });
});
