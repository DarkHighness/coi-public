import { beforeEach, describe, expect, it, vi } from "vitest";

const summaryMock = vi.hoisted(() => ({
  runSummaryAgenticLoop: vi.fn(),
}));

const utilsMock = vi.hoisted(() => ({
  getProviderConfig: vi.fn(),
  createLogEntry: vi.fn(),
}));

vi.mock("../summary/summary", () => ({
  runSummaryAgenticLoop: summaryMock.runSummaryAgenticLoop,
}));

vi.mock("../../utils", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("../../utils");
  return {
    ...actual,
    getProviderConfig: utilsMock.getProviderConfig,
    createLogEntry: utilsMock.createLogEntry,
  };
});

import { summarizeContext } from "./outline";

describe("outline summarizeContext adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    utilsMock.getProviderConfig.mockReturnValue({
      instance: { protocol: "openai" },
      modelId: "model-x",
    });
    utilsMock.createLogEntry.mockReturnValue({ endpoint: "summary-error" });
  });

  it("returns summary and logs when summary loop succeeds", async () => {
    const summary = { id: 1, displayText: "ok" };
    summaryMock.runSummaryAgenticLoop.mockResolvedValue({
      summary,
      logs: [{ endpoint: "summary-ok" }],
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
    });

    const input = {
      vfsSession: {} as any,
      slotId: "slot-1",
      forkId: 0,
      baseSummaries: [],
      baseIndex: 0,
      nodeRange: { fromIndex: 0, toIndex: 1 },
      language: "en",
      settings: {},
    } as any;

    const result = await summarizeContext(input);

    expect(summaryMock.runSummaryAgenticLoop).toHaveBeenCalledWith(
      expect.objectContaining({
        slotId: "slot-1",
        forkId: 0,
        nodeRange: { fromIndex: 0, toIndex: 1 },
        language: "en",
      }),
      { mode: undefined },
    );
    expect(result).toEqual({
      summary,
      logs: [{ endpoint: "summary-ok" }],
    });
  });

  it("returns failure envelope when summary is null", async () => {
    summaryMock.runSummaryAgenticLoop.mockResolvedValue({
      summary: null,
      logs: [{ endpoint: "summary-null" }],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    });

    const result = await summarizeContext({
      vfsSession: {} as any,
      slotId: "slot-2",
      forkId: 1,
      baseSummaries: [],
      baseIndex: 0,
      nodeRange: { fromIndex: 2, toIndex: 3 },
      language: "zh",
      settings: {},
    } as any);

    expect(result).toEqual({
      summary: null,
      logs: [{ endpoint: "summary-null" }],
      error: "Summary generation failed",
    });
  });

  it("maps thrown errors to summary-error log entry", async () => {
    summaryMock.runSummaryAgenticLoop.mockRejectedValue(new Error("boom"));
    utilsMock.getProviderConfig.mockReturnValue({
      instance: { protocol: "gemini" },
      modelId: "gemini-1",
    });
    utilsMock.createLogEntry.mockReturnValue({ endpoint: "summary-error-log" });

    const result = await summarizeContext({
      vfsSession: {} as any,
      slotId: "slot-3",
      forkId: 2,
      baseSummaries: [],
      baseIndex: 0,
      nodeRange: { fromIndex: 4, toIndex: 5 },
      language: "en",
      settings: {},
    } as any);

    expect(utilsMock.createLogEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "gemini",
        model: "gemini-1",
        endpoint: "summary-error",
      }),
    );

    expect(result).toEqual({
      summary: null,
      logs: [{ endpoint: "summary-error-log" }],
      error: "boom",
    });
  });
});
