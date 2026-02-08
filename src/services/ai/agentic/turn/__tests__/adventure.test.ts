import { describe, it, expect, vi } from "vitest";
import { runAgenticLoop } from "../adventure";
import { runAgenticLoopRefactored } from "../agenticLoop";

vi.mock("../agenticLoop", () => ({
  runAgenticLoopRefactored: vi.fn(),
}));

describe("runAgenticLoop", () => {
  it("forwards vfsSession to the refactored loop", async () => {
    const vfsSession = { snapshot: () => ({}) } as any;
    const mock = vi.mocked(runAgenticLoopRefactored);
    mock.mockResolvedValue({
      response: { narrative: "", choices: [] },
      logs: [],
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        cacheRead: 0,
        cacheWrite: 0,
      },
      changedEntities: [],
      _conversationHistory: [],
    });

    await runAgenticLoop(
      "openai" as any,
      { id: "provider", protocol: "openai" } as any,
      "model",
      "system",
      [],
      {} as any,
      undefined,
      {} as any,
      false,
      false,
      "session-1",
      vfsSession,
      undefined,
      undefined,
      undefined,
      undefined,
      [],
    );

    expect(mock).toHaveBeenCalledWith(
      expect.objectContaining({
        vfsSession,
        requiredPresetSkillPaths: [],
      }),
    );
  });
});
