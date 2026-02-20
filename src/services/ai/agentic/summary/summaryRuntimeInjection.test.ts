import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SummaryLoopInput } from "./summary";

const mockGetOrCreateSession = vi.fn();
const mockGetProvider = vi.fn();
const mockGetEffectiveToolChoice = vi.fn();

vi.mock("../../sessionManager", () => ({
  sessionManager: {
    getOrCreateSession: (...args: any[]) => mockGetOrCreateSession(...args),
    getProvider: (...args: any[]) => mockGetProvider(...args),
    getEffectiveToolChoice: (...args: any[]) =>
      mockGetEffectiveToolChoice(...args),
  },
}));

const mockCallWithAgenticRetry = vi.fn();
vi.mock("../retry", () => ({
  callWithAgenticRetry: (...args: any[]) => mockCallWithAgenticRetry(...args),
  createPromptTokenBudgetContext: () => ({
    get: () => null,
    set: () => {},
  }),
}));

const mockDispatchToolCallAsync = vi.fn();
vi.mock("../../../tools/handlers", () => ({
  dispatchToolCallAsync: (...args: any[]) => mockDispatchToolCallAsync(...args),
}));

import { runSummaryLoop } from "./summaryLoop";

const makeInput = (): SummaryLoopInput => ({
  vfsSession: {
    snapshot: vi.fn(() => ({})),
    mergeJson: vi.fn(() => {}),
    setActiveForkId: vi.fn(() => {}),
  } as any,
  slotId: "slot-1",
  forkId: 0,
  nodeRange: { fromIndex: 3, toIndex: 8 },
  baseSummaries: [],
  baseIndex: 3,
  language: "English",
  settings: {
    providers: {
      instances: [
        {
          id: "p1",
          enabled: true,
          protocol: "openai",
          apiKey: "test-key",
          baseUrl: "http://localhost",
        },
      ],
      defaultProviderId: "p1",
    } as any,
    story: {
      providerId: "p1",
      modelId: "m1",
      enabled: true,
    } as any,
    lore: {} as any,
    script: {} as any,
    image: {} as any,
    video: {} as any,
    audio: {} as any,
    audioVolume: {
      bgmVolume: 1,
      bgmMuted: false,
      ttsVolume: 1,
      ttsMuted: false,
    },
    language: "en" as any,
    imageTimeout: 30,
    enableFallbackBackground: true,
    lockEnvTheme: false,
    typewriterSpeed: 50,
    extra: {
      maxAgenticRounds: 1,
      maxToolCalls: 2,
    },
  } as any,
});

beforeEach(() => {
  vi.clearAllMocks();

  mockGetOrCreateSession.mockResolvedValue({ id: "summary-session" });
  mockGetProvider.mockReturnValue({} as any);
  mockGetEffectiveToolChoice.mockReturnValue("required");

  mockDispatchToolCallAsync.mockResolvedValue({
    success: true,
    data: {
      summary: {
        id: 1,
        displayText: "ok",
        visible: {
          narrative: "n",
          majorEvents: [],
          characterDevelopment: "c",
          worldState: "w",
        },
        hidden: {
          truthNarrative: "t",
          hiddenPlots: [],
          npcActions: [],
          worldTruth: "wt",
          unrevealed: [],
        },
        nodeRange: { fromIndex: 3, toIndex: 8 },
      },
    },
  });
});

describe("summary runtime field injection", () => {
  it("passes content-only args and runtime injection context for vfs_finish_summary", async () => {
    mockCallWithAgenticRetry.mockResolvedValue({
      result: {
        functionCalls: [
          {
            id: "call_1",
            name: "vfs_finish_summary",
            args: {
              displayText: "summary",
              visible: {
                narrative: "n",
                majorEvents: ["e"],
                characterDevelopment: "c",
                worldState: "w",
              },
              hidden: {
                truthNarrative: "t",
                hiddenPlots: ["p"],
                npcActions: ["a"],
                worldTruth: "wt",
                unrevealed: ["u"],
              },
            },
          },
        ],
      },
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      raw: {},
    });

    await runSummaryLoop(makeInput(), "query_summary");

    expect(mockDispatchToolCallAsync).toHaveBeenCalledTimes(1);
    const [, dispatchedArgs, dispatchedContext] = mockDispatchToolCallAsync.mock
      .calls[0] as [string, any, any];
    expect(dispatchedArgs.nodeRange).toBeUndefined();
    expect(dispatchedArgs.lastSummarizedIndex).toBeUndefined();
    expect(dispatchedContext.vfsSummaryNodeRange).toEqual({
      fromIndex: 3,
      toIndex: 8,
    });
  });

  it("rejects AI-supplied runtime fields before dispatch", async () => {
    mockCallWithAgenticRetry.mockResolvedValue({
      result: {
        functionCalls: [
          {
            id: "call_1",
            name: "vfs_finish_summary",
            args: {
              displayText: "summary",
              visible: {
                narrative: "n",
                majorEvents: ["e"],
                characterDevelopment: "c",
                worldState: "w",
              },
              hidden: {
                truthNarrative: "t",
                hiddenPlots: ["p"],
                npcActions: ["a"],
                worldTruth: "wt",
                unrevealed: ["u"],
              },
              nodeRange: { fromIndex: 0, toIndex: 1 },
            },
          },
        ],
      },
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      raw: {},
    });

    const result = await runSummaryLoop(makeInput(), "query_summary");

    expect(result.summary).toBeNull();
    expect(mockDispatchToolCallAsync).not.toHaveBeenCalled();
  });
});
