import { beforeEach, describe, expect, it, vi } from "vitest";
import { runSummaryAgenticLoop } from "./summary";
import { runSummaryLoop } from "./summaryLoop";

vi.mock("./summaryLoop", () => ({
  runSummaryLoop: vi.fn(),
}));

const mockedRunSummaryLoop = vi.mocked(runSummaryLoop);

describe("runSummaryAgenticLoop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses auto mode by default", async () => {
    const expected = {
      summary: null,
      logs: [],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    };
    mockedRunSummaryLoop.mockResolvedValue(expected as any);

    const input = {
      vfsSession: {} as any,
      slotId: "slot-1",
      forkId: 0,
      nodeRange: { fromIndex: 0, toIndex: 1 },
      baseSummaries: [],
      baseIndex: 0,
      language: "en",
      settings: {},
    } as any;

    const result = await runSummaryAgenticLoop(input);

    expect(mockedRunSummaryLoop).toHaveBeenCalledWith(input, "auto");
    expect(result).toBe(expected);
  });

  it("forwards explicit mode to runSummaryLoop", async () => {
    mockedRunSummaryLoop.mockResolvedValue({
      summary: { id: 1 },
      logs: [{ endpoint: "summary" }],
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
    } as any);

    const input = {
      vfsSession: {} as any,
      slotId: "slot-2",
      forkId: 2,
      nodeRange: { fromIndex: 2, toIndex: 3 },
      baseSummaries: [],
      baseIndex: 1,
      language: "zh",
      settings: {},
    } as any;

    await runSummaryAgenticLoop(input, { mode: "query_summary" });

    expect(mockedRunSummaryLoop).toHaveBeenCalledWith(input, "query_summary");
  });
});
