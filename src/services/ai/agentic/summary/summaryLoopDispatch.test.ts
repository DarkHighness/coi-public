import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SummaryLoopInput } from "./summary";

const compactMock = vi.fn();
const queryMock = vi.fn();

vi.mock("./summaryCompactLoop", () => ({
  runCompactSummaryLoop: (...args: any[]) => compactMock(...args),
}));

vi.mock("./summaryQueryLoop", () => ({
  runQuerySummaryLoop: (...args: any[]) => queryMock(...args),
}));

import { runSummaryLoop } from "./summaryLoop";

const makeInput = (): SummaryLoopInput =>
  ({
    vfsSession: {} as any,
    slotId: "slot-1",
    forkId: 0,
    nodeRange: { fromIndex: 0, toIndex: 1 },
    baseSummaries: [],
    baseIndex: 0,
    language: "en",
    settings: {} as any,
  }) as SummaryLoopInput;

const makeResult = (label: string) => ({
  summary: {
    id: label,
    displayText: label,
    visible: {
      narrative: label,
      majorEvents: [],
      characterDevelopment: "",
      worldState: "",
    },
    hidden: {
      truthNarrative: "",
      hiddenPlots: [],
      npcActions: [],
      worldTruth: "",
      unrevealed: [],
    },
    nodeRange: { fromIndex: 0, toIndex: 1 },
  },
  logs: [],
  usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
});

describe("runSummaryLoop dispatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefers compact mode in auto when compact succeeds", async () => {
    const compactResult = makeResult("compact");
    compactMock.mockResolvedValue(compactResult);

    const result = await runSummaryLoop(makeInput(), "auto");

    expect(compactMock).toHaveBeenCalledTimes(1);
    expect(queryMock).not.toHaveBeenCalled();
    expect(result).toBe(compactResult);
  });

  it("falls back to query_summary when compact fails with context overflow", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    compactMock.mockRejectedValue(new Error("CONTEXT_LENGTH_EXCEEDED: too long"));

    const queryResult = makeResult("query");
    queryMock.mockResolvedValue(queryResult);

    const result = await runSummaryLoop(makeInput(), "auto");

    expect(compactMock).toHaveBeenCalledTimes(1);
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(result).toBe(queryResult);

    warnSpy.mockRestore();
  });

  it("rethrows non-fallback compact errors in auto mode", async () => {
    compactMock.mockRejectedValue(new Error("boom"));

    await expect(runSummaryLoop(makeInput(), "auto")).rejects.toThrow("boom");

    expect(compactMock).toHaveBeenCalledTimes(1);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("uses query loop directly when mode=query_summary", async () => {
    const queryResult = makeResult("query-only");
    queryMock.mockResolvedValue(queryResult);

    const result = await runSummaryLoop(makeInput(), "query_summary");

    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(compactMock).not.toHaveBeenCalled();
    expect(result).toBe(queryResult);
  });

  it("uses compact loop directly when mode=session_compact", async () => {
    const compactResult = makeResult("compact-only");
    compactMock.mockResolvedValue(compactResult);

    const result = await runSummaryLoop(makeInput(), "session_compact");

    expect(compactMock).toHaveBeenCalledTimes(1);
    expect(queryMock).not.toHaveBeenCalled();
    expect(result).toBe(compactResult);
  });
});
