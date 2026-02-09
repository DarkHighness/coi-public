import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/services/aiService", () => ({
  summarizeContext: vi.fn(),
}));

import { handleSummarization } from "@/hooks/gameActionHelpers";
import { summarizeContext } from "@/services/aiService";

describe("handleSummarization vfs forwarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards vfsSession to summarizeContext when summarization triggers", async () => {
    vi.mocked(summarizeContext).mockResolvedValue({
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
        nodeRange: { fromIndex: 0, toIndex: 0 },
      },
      logs: [],
    } as any);

    const vfsSession = { snapshot: () => ({}) } as any;

    await handleSummarization(
      {
        nodes: {
          root: {
            id: "root",
            role: "model",
            text: "start",
            segmentIdx: 0,
            summaries: [],
            summarizedIndex: 0,
          },
        },
      } as any,
      "root",
      "user-1",
      "look around",
      [],
      0,
      false,
      { contextLen: 1 } as any,
      "en" as any,
      vfsSession,
      false,
    );

    expect(summarizeContext).toHaveBeenCalledTimes(1);
    expect((summarizeContext as any).mock.calls[0][6]).toBe(vfsSession);
  });
});
