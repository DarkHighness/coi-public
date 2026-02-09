import { describe, it, expect } from "vitest";
import { dispatchToolCall } from "@/services/tools/toolHandlerRegistry";
import "@/services/tools/handlers/storyQueryHandlers";

describe("query_summary handler guardrails", () => {
  it("returns alreadyInContext when called without keyword/nodeRange", () => {
    const gameState = {
      summaries: [
        {
          id: 0,
          displayText: "Old summary",
          visible: {
            narrative: "",
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
          nodeRange: { fromIndex: 0, toIndex: 10 },
          timeRange: { from: "D1", to: "D2" },
        },
        {
          id: 1,
          displayText: "Latest summary",
          visible: {
            narrative: "",
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
          nodeRange: { fromIndex: 11, toIndex: 20 },
          timeRange: { from: "D2", to: "D3" },
        },
      ],
    } as any;

    const result = dispatchToolCall("query_summary", {}, { gameState }) as any;

    expect(result.success).toBe(true);
    expect(result.alreadyInContext).toBe(true);
    expect(result.results).toEqual([]);
    expect(result.message).toContain("already in context");
    expect(result.hint).toContain("query_turn");
  });
});
