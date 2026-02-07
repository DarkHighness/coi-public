import { describe, it, expect, vi, beforeEach } from "vitest";

import type { SummaryLoopInput } from "./summary";

// Mocks for modules used by summaryLoop.ts
const mockGetOrCreateSession = vi.fn();
const mockGetProvider = vi.fn();
const mockGetHistory = vi.fn();
const mockGetSystemInstruction = vi.fn();
const mockGetEffectiveToolChoice = vi.fn();

vi.mock("../../sessionManager", () => ({
  sessionManager: {
    getOrCreateSession: (...args: any[]) => mockGetOrCreateSession(...args),
    getProvider: (...args: any[]) => mockGetProvider(...args),
    getHistory: (...args: any[]) => mockGetHistory(...args),
    getSystemInstruction: (...args: any[]) => mockGetSystemInstruction(...args),
    getEffectiveToolChoice: (...args: any[]) => mockGetEffectiveToolChoice(...args),
  },
}));

const mockCallWithAgenticRetry = vi.fn();
vi.mock("../retry", () => ({
  callWithAgenticRetry: (...args: any[]) => mockCallWithAgenticRetry(...args),
}));

const mockDispatchToolCallAsync = vi.fn();
vi.mock("../../../tools/handlers", () => ({
  dispatchToolCallAsync: (...args: any[]) => mockDispatchToolCallAsync(...args),
}));

// Import after mocks are registered
import { runSummaryLoop } from "./summaryLoop";
import { VFS_TOOLSETS } from "../../../vfsToolsets";

function makeInput(overrides?: Partial<SummaryLoopInput>): SummaryLoopInput {
  const vfsSession = {
    snapshot: vi.fn(() => ({})),
    mergeJson: vi.fn(() => {}),
  } as any;

  const providerInstance = {
    id: "p1",
    enabled: true,
    protocol: "openai",
    apiKey: "test-key",
    baseUrl: "http://localhost",
  } as any;

  return {
    vfsSession,
    slotId: "slot-1",
    forkId: 0,
    nodeRange: { fromIndex: 0, toIndex: 1 },
    baseSummaries: [],
    baseIndex: 0,
    language: "English",
    settings: {
      providers: {
        instances: [providerInstance],
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
      audioVolume: { bgmVolume: 1, bgmMuted: false, ttsVolume: 1, ttsMuted: false },
      language: "en" as any,
      imageTimeout: 30,
      enableFallbackBackground: true,
      lockEnvTheme: false,
      typewriterSpeed: 50,
    } as any,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  mockGetOrCreateSession.mockImplementation(async (args: any) => ({
    id: `${args.slotId}:${args.forkId}:${args.providerId}:${args.modelId}`,
  }));
  mockGetProvider.mockReturnValue({} as any);
  mockGetEffectiveToolChoice.mockReturnValue("required");
  mockGetHistory.mockReturnValue([]);
  mockGetSystemInstruction.mockReturnValue("SYSTEM");

  mockCallWithAgenticRetry.mockResolvedValue({
    result: {
      functionCalls: [
        {
          id: "call_1",
          name: VFS_TOOLSETS.summary.finishToolName,
          args: {},
        },
      ],
    },
    usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
    raw: {},
  });

  mockDispatchToolCallAsync.mockResolvedValue({
    success: true,
    data: {
      summary: {
        id: "s1",
        displayText: "OK",
        visible: {
          narrative: "ok",
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
        lastSummarizedIndex: 2,
      },
    },
  });
});

describe("runSummaryLoop", () => {
  it("falls back to query-based summary when story systemInstruction is missing", async () => {
    mockGetSystemInstruction.mockReturnValue(null);

    const input = makeInput();
    const result = await runSummaryLoop(input, "auto");

    expect(result.summary?.displayText).toBe("OK");
    expect(mockGetOrCreateSession).toHaveBeenCalled();

    const calls = mockGetOrCreateSession.mock.calls.map((c) => c[0]);
    expect(calls.some((c) => c.slotId === "slot-1")).toBe(true); // story session attempt
    expect(calls.some((c) => c.slotId === "slot-1:summary")).toBe(true); // fallback summary session
  });

  it("retries once when finish summary contains forbidden tokens", async () => {
    const input = makeInput();

    let finishCount = 0;
    mockDispatchToolCallAsync.mockImplementation(async (name: string) => {
      if (name !== VFS_TOOLSETS.summary.finishToolName) {
        return { success: false, error: "unexpected tool" };
      }
      finishCount += 1;
      if (finishCount === 1) {
        return {
          success: true,
          data: {
            summary: {
              id: "s_forbidden",
              displayText: "includes vfs_read_json (forbidden)",
              visible: {
                narrative: "ok",
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
              lastSummarizedIndex: 2,
            },
          },
        };
      }

      return {
        success: true,
        data: {
          summary: {
            id: "s_clean",
            displayText: "clean",
            visible: {
              narrative: "ok",
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
            lastSummarizedIndex: 2,
          },
        },
      };
    });

    const result = await runSummaryLoop(input, "query_summary");
    expect(result.summary?.id).toBe("s_clean");
    expect(mockCallWithAgenticRetry).toHaveBeenCalledTimes(2);
    expect((input.vfsSession as any).mergeJson).toHaveBeenCalledTimes(2); // baseline + rollback
  });

  it("rejects finish calls when finish is not the last tool", async () => {
    const finishTool = VFS_TOOLSETS.summary.finishToolName;

    mockCallWithAgenticRetry
      .mockResolvedValueOnce({
        result: {
          functionCalls: [
            { id: "call_finish", name: finishTool, args: {} },
            { id: "call_read", name: "vfs_read_json", args: {} },
          ],
        },
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        raw: {},
      })
      .mockResolvedValueOnce({
        result: {
          functionCalls: [{ id: "call_finish_ok", name: finishTool, args: {} }],
        },
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        raw: {},
      });

    const input = makeInput();
    const result = await runSummaryLoop(input, "query_summary");

    expect(result.summary?.id).toBe("s1");
    expect(mockCallWithAgenticRetry).toHaveBeenCalledTimes(2);
    expect(mockDispatchToolCallAsync).toHaveBeenCalledTimes(1);
    expect(mockDispatchToolCallAsync).toHaveBeenCalledWith(
      finishTool,
      {},
      expect.any(Object),
    );
  });

  it("rejects multiple finish calls in one response", async () => {
    const finishTool = VFS_TOOLSETS.summary.finishToolName;

    mockCallWithAgenticRetry
      .mockResolvedValueOnce({
        result: {
          functionCalls: [
            { id: "call_finish_1", name: finishTool, args: {} },
            { id: "call_finish_2", name: finishTool, args: {} },
          ],
        },
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        raw: {},
      })
      .mockResolvedValueOnce({
        result: {
          functionCalls: [{ id: "call_finish_ok", name: finishTool, args: {} }],
        },
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        raw: {},
      });

    const input = makeInput();
    const result = await runSummaryLoop(input, "query_summary");

    expect(result.summary?.id).toBe("s1");
    expect(mockCallWithAgenticRetry).toHaveBeenCalledTimes(2);
    expect(mockDispatchToolCallAsync).toHaveBeenCalledTimes(1);
  });

  it("enforces finish-only mode when budget is critically low", async () => {
    const finishTool = VFS_TOOLSETS.summary.finishToolName;

    mockCallWithAgenticRetry
      .mockResolvedValueOnce({
        result: {
          functionCalls: [{ id: "call_read", name: "vfs_read_json", args: {} }],
        },
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        raw: {},
      })
      .mockResolvedValueOnce({
        result: {
          functionCalls: [{ id: "call_finish", name: finishTool, args: {} }],
        },
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        raw: {},
      });

    const input = makeInput({
      settings: {
        ...makeInput().settings,
        extra: {
          maxToolCalls: 2,
          maxAgenticRounds: 3,
          maxErrorRetries: 3,
        },
      } as any,
    });

    const result = await runSummaryLoop(input, "query_summary");

    expect(result.summary?.id).toBe("s1");
    expect(mockCallWithAgenticRetry).toHaveBeenCalledTimes(2);
    expect(mockCallWithAgenticRetry.mock.calls[0]?.[3]?.requiredToolName).toBe(
      finishTool,
    );
    expect(mockDispatchToolCallAsync).toHaveBeenCalledTimes(1);
    expect(mockDispatchToolCallAsync).toHaveBeenCalledWith(
      finishTool,
      {},
      expect.any(Object),
    );
  });
});
