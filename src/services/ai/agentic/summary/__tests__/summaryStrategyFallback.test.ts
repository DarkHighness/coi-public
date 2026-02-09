import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../summaryLoop", () => ({
  runSummaryLoopRefactored: vi.fn(),
}));

describe("runSummaryAgenticLoop strategy fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses compact first and returns when compact succeeds", async () => {
    const { runSummaryLoopRefactored } = await import("../summaryLoop");
    const { runSummaryAgenticLoop } = await import("../summary");

    vi.mocked(runSummaryLoopRefactored).mockResolvedValue({
      summary: {
        id: 1,
        displayText: "ok",
        visible: {
          narrative: "v",
          majorEvents: [],
          characterDevelopment: "",
          worldState: "",
        },
        hidden: {
          truthNarrative: "h",
          hiddenPlots: [],
          npcActions: [],
          worldTruth: "",
          unrevealed: [],
        },
        nodeRange: { fromIndex: 0, toIndex: 1 },
      },
      logs: [{ id: "1", provider: "p", model: "m", endpoint: "e", timestamp: Date.now() }],
      usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 },
      strategyUsed: "compact",
    } as any);

    const result = await runSummaryAgenticLoop({
      previousSummary: null,
      segmentsToSummarize: [],
      gameState: {} as any,
      nodeRange: { fromIndex: 0, toIndex: 1 },
      language: "en",
      settings: {} as any,
    });

    expect(runSummaryLoopRefactored).toHaveBeenCalledTimes(1);
    expect((runSummaryLoopRefactored as any).mock.calls[0][0].strategy).toBe("compact");
    expect(result.strategyUsed).toBe("compact");
  });

  it("falls back to query_summary when compact throws context error", async () => {
    const { runSummaryLoopRefactored } = await import("../summaryLoop");
    const { runSummaryAgenticLoop } = await import("../summary");

    vi.mocked(runSummaryLoopRefactored)
      .mockRejectedValueOnce(new Error("context_length_exceeded"))
      .mockResolvedValueOnce({
        summary: {
          id: 2,
          displayText: "fallback",
          visible: {
            narrative: "v",
            majorEvents: [],
            characterDevelopment: "",
            worldState: "",
          },
          hidden: {
            truthNarrative: "h",
            hiddenPlots: [],
            npcActions: [],
            worldTruth: "",
            unrevealed: [],
          },
          nodeRange: { fromIndex: 0, toIndex: 1 },
        },
        logs: [{ id: "2", provider: "p", model: "m", endpoint: "e", timestamp: Date.now() }],
        usage: { promptTokens: 2, completionTokens: 3, totalTokens: 5 },
        strategyUsed: "query_summary",
      } as any);

    const result = await runSummaryAgenticLoop({
      previousSummary: null,
      segmentsToSummarize: [],
      gameState: {} as any,
      nodeRange: { fromIndex: 0, toIndex: 1 },
      language: "en",
      settings: {} as any,
    });

    expect(runSummaryLoopRefactored).toHaveBeenCalledTimes(2);
    expect((runSummaryLoopRefactored as any).mock.calls[0][0].strategy).toBe("compact");
    expect((runSummaryLoopRefactored as any).mock.calls[1][0].strategy).toBe("query_summary");
    expect(result.strategyUsed).toBe("query_summary");
  });

  it("falls back to query_summary when compact returns null summary", async () => {
    const { runSummaryLoopRefactored } = await import("../summaryLoop");
    const { runSummaryAgenticLoop } = await import("../summary");

    vi.mocked(runSummaryLoopRefactored)
      .mockResolvedValueOnce({
        summary: null,
        logs: [
          {
            id: "compact-null",
            provider: "p",
            model: "m",
            endpoint: "summary-iteration-1",
            timestamp: Date.now(),
          },
        ],
        usage: { promptTokens: 4, completionTokens: 1, totalTokens: 5 },
        strategyUsed: "compact",
      } as any)
      .mockResolvedValueOnce({
        summary: {
          id: 3,
          displayText: "fallback-after-null",
          visible: {
            narrative: "v",
            majorEvents: [],
            characterDevelopment: "",
            worldState: "",
          },
          hidden: {
            truthNarrative: "h",
            hiddenPlots: [],
            npcActions: [],
            worldTruth: "",
            unrevealed: [],
          },
          nodeRange: { fromIndex: 0, toIndex: 1 },
        },
        logs: [
          {
            id: "query-ok",
            provider: "p",
            model: "m",
            endpoint: "summary-iteration-1",
            timestamp: Date.now(),
          },
        ],
        usage: { promptTokens: 6, completionTokens: 2, totalTokens: 8 },
        strategyUsed: "query_summary",
      } as any);

    const result = await runSummaryAgenticLoop({
      previousSummary: null,
      segmentsToSummarize: [],
      gameState: {} as any,
      nodeRange: { fromIndex: 0, toIndex: 1 },
      language: "en",
      settings: {} as any,
    });

    expect(runSummaryLoopRefactored).toHaveBeenCalledTimes(2);
    expect(result.summary?.displayText).toBe("fallback-after-null");
    expect(result.usage.totalTokens).toBe(13);
    expect(result.strategyUsed).toBe("query_summary");
  });
});
