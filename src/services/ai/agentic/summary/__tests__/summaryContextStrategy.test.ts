import { describe, it, expect } from "vitest";
import { buildSummaryInitialContext } from "../summaryContext";

describe("buildSummaryInitialContext strategy behavior", () => {
  const baseInput = {
    previousSummary: null,
    segmentsToSummarize: [
      {
        segmentIdx: 7,
        role: "user",
        text: "I ask the guard about the gate.",
        stateSnapshot: {
          time: "Day 3, Noon",
          currentLocation: "North Gate",
        },
      },
      {
        segmentIdx: 8,
        role: "model",
        text: "The guard narrows his eyes and answers cautiously.",
        stateSnapshot: {
          time: "Day 3, Noon",
          currentLocation: "North Gate",
        },
      },
    ],
    gameState: {
      forkId: 2,
      turnNumber: 8,
      activeNodeId: "model-8",
      summaries: [],
    },
    nodeRange: { fromIndex: 7, toIndex: 8 },
    language: "en",
    settings: {} as any,
  } as any;

  it("compact strategy includes full segment_list", () => {
    const context = buildSummaryInitialContext({
      ...baseInput,
      strategy: "compact",
    });

    expect(context).toContain("<segment_list>");
    expect(context).toContain("I ask the guard about the gate.");
    expect(context).toContain("The guard narrows his eyes");
  });

  it("query_summary strategy uses anchor manifest without full text", () => {
    const context = buildSummaryInitialContext({
      ...baseInput,
      strategy: "query_summary",
    });

    expect(context).toContain("<segments_anchor mode=\"query_summary_fallback\"");
    expect(context).toContain("<segment_manifest>");
    expect(context).toContain(
      'path="current/conversation/turns/fork-2/turn-7.json"',
    );
    expect(context).not.toContain("I ask the guard about the gate.");
    expect(context).not.toContain("The guard narrows his eyes");
  });
});
