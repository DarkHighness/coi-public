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
    getEffectiveToolChoice: (...args: any[]) =>
      mockGetEffectiveToolChoice(...args),
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
import { vfsToolRegistry } from "../../../vfs/tools";

const summaryToolset = vfsToolRegistry.getToolset("summary");

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
    } as any,
    ...overrides,
  };
}

function makeCommitSummaryArgs(displayText = "OK") {
  return {
    displayText,
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
          name: summaryToolset.finishToolName,
          args: makeCommitSummaryArgs(),
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

  it("injects fork/turn-aware consistency anchor before summary loop", async () => {
    const input = makeInput({
      forkId: 2,
      nodeRange: { fromIndex: 4, toIndex: 9 },
      baseIndex: 4,
      baseSummaries: [
        {
          id: "s-prev" as any,
          displayText: "prev",
          visible: {
            narrative: "n",
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
          nodeRange: { fromIndex: 0, toIndex: 3 },
          createdAt: 123 as any,
        } as any,
      ],
      pendingPlayerAction: { segmentIdx: 10, text: "Inspect old shrine" },
    });

    (input.vfsSession as any).snapshot = vi.fn(() => ({
      "conversation/index.json": {
        path: "conversation/index.json",
        contentType: "application/json",
        content: JSON.stringify({
          activeForkId: 2,
          activeTurnId: "fork-2/turn-14",
          latestTurnNumberByFork: { "2": 14 },
          rootTurnIdByFork: { "2": "fork-2/turn-0" },
          turnOrderByFork: { "2": [] },
        }),
      },
    }));

    await runSummaryLoop(input, "query_summary");

    const historyArg = mockCallWithAgenticRetry.mock.calls[0]?.[2] as any[];
    const allTexts =
      historyArg
        ?.flatMap((msg: any) =>
          Array.isArray(msg?.content)
            ? msg.content
                .filter((part: any) => part?.type === "text")
                .map((part: any) => part.text)
            : [],
        )
        .filter(Boolean) ?? [];

    const anchorText = allTexts.find((text: string) =>
      text.includes("[SUMMARY CONSISTENCY ANCHOR]"),
    );

    expect(anchorText).toContain("Target fork ID: 2");
    expect(anchorText).toContain("Active turn ID from index: fork-2/turn-14");
    expect(anchorText).toContain(
      "Latest turn path in target fork: `current/conversation/turns/fork-2/turn-14.json`",
    );
    expect(anchorText).toContain("Last summary checkpoint: id=s-prev");
    expect(anchorText).toContain("NEVER cross forks");
    expect(anchorText).toContain("current/session/<session_uid>.jsonl");
    expect(anchorText).toContain("query-style reads only");
    expect(anchorText).toContain("nextSessionReferencesMarkdown");
    expect(anchorText).toContain("useful SKILL docs first");
  });

  it("uses compact-specific anchor contract in session_compact mode", async () => {
    const input = makeInput({
      forkId: 3,
      nodeRange: { fromIndex: 6, toIndex: 8 },
      baseIndex: 6,
    });

    (input.vfsSession as any).snapshot = vi.fn(() => ({
      "conversation/index.json": {
        path: "conversation/index.json",
        contentType: "application/json",
        content: JSON.stringify({
          activeForkId: 3,
          activeTurnId: "fork-3/turn-21",
          latestTurnNumberByFork: { "3": 21 },
          rootTurnIdByFork: { "3": "fork-3/turn-0" },
          turnOrderByFork: { "3": [] },
        }),
      },
    }));

    await runSummaryLoop(input, "session_compact");

    const historyArg = mockCallWithAgenticRetry.mock.calls[0]?.[2] as any[];
    const allTexts =
      historyArg
        ?.flatMap((msg: any) =>
          Array.isArray(msg?.content)
            ? msg.content
                .filter((part: any) => part?.type === "text")
                .map((part: any) => part.text)
            : [],
        )
        .filter(Boolean) ?? [];

    const compactTrigger = allTexts.find((text: string) =>
      text.includes("[SYSTEM: COMPACT_NOW]"),
    );
    const compactAnchor = allTexts.find((text: string) =>
      text.includes("[COMPACT SUMMARY CONSISTENCY ANCHOR]"),
    );

    expect(compactTrigger).toContain(
      "`current/skills/commands/runtime/compact/SKILL.md`",
    );
    expect(compactAnchor).toContain("MODE CONTRACT: SESSION_COMPACT");
    expect(compactAnchor).toContain(
      "Current session history already loaded in context",
    );
    expect(compactAnchor).toContain("Verification-only reads (optional)");
    expect(compactAnchor).toContain("nextSessionReferencesMarkdown");
    expect(compactAnchor).toContain("useful SKILL docs first");
    expect(compactAnchor).toContain("Structured error recovery");
    expect(compactAnchor).toContain("FINISH_BLOCKED_BY_EXISTING_WRITE_FAILURE");
    expect(compactTrigger).toContain("nextSessionReferencesMarkdown");
    expect(compactTrigger).toContain("short markdown handoff notes");
  });

  it("blocks cross-fork path arguments in summary tool calls", async () => {
    const input = makeInput({ forkId: 2 });

    mockCallWithAgenticRetry
      .mockResolvedValueOnce({
        result: {
          functionCalls: [
            {
              id: "call-cross-fork",
              name: "vfs_read_chars",
              args: { path: "forks/1/story/summary/state.json" },
            },
          ],
        },
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        raw: {},
      })
      .mockResolvedValueOnce({
        result: {
          functionCalls: [
            {
              id: "call-finish-ok",
              name: summaryToolset.finishToolName,
              args: makeCommitSummaryArgs(),
            },
          ],
        },
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        raw: {},
      });

    const result = await runSummaryLoop(input, "query_summary");

    expect(result.summary?.id).toBe("s1");
    expect(mockDispatchToolCallAsync).toHaveBeenCalledTimes(1);
    expect(mockDispatchToolCallAsync.mock.calls[0]?.[0]).toBe(
      summaryToolset.finishToolName,
    );
  });

  it("blocks finish calls when AI provides runtime-only fields", async () => {
    const finishTool = summaryToolset.finishToolName;
    const input = makeInput({
      forkId: 2,
      nodeRange: { fromIndex: 4, toIndex: 9 },
    });

    mockCallWithAgenticRetry
      .mockResolvedValueOnce({
        result: {
          functionCalls: [
            {
              id: "call-finish-bad-range",
              name: finishTool,
              args: {
                ...makeCommitSummaryArgs(),
                nodeRange: { fromIndex: 0, toIndex: 3 },
                lastSummarizedIndex: 4,
              },
            },
          ],
        },
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        raw: {},
      })
      .mockResolvedValueOnce({
        result: {
          functionCalls: [
            {
              id: "call-finish-ok",
              name: finishTool,
              args: makeCommitSummaryArgs(),
            },
          ],
        },
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        raw: {},
      });

    const result = await runSummaryLoop(input, "query_summary");

    expect(result.summary?.id).toBe("s1");
    expect(mockCallWithAgenticRetry).toHaveBeenCalledTimes(2);
    expect(mockDispatchToolCallAsync).toHaveBeenCalledTimes(1);
    expect(mockDispatchToolCallAsync).toHaveBeenCalledWith(
      finishTool,
      makeCommitSummaryArgs(),
      expect.objectContaining({
        vfsSummaryNodeRange: { fromIndex: 4, toIndex: 9 },
      }),
    );
  });

  it("preserves nextSessionReferencesMarkdown on finish tool arguments", async () => {
    const finishTool = summaryToolset.finishToolName;
    const input = makeInput({
      forkId: 2,
      nodeRange: { fromIndex: 1, toIndex: 4 },
    });

    mockCallWithAgenticRetry.mockResolvedValueOnce({
      result: {
        functionCalls: [
          {
            id: "call-finish-with-refs",
            name: finishTool,
            args: {
              ...makeCommitSummaryArgs(),
              nextSessionReferencesMarkdown:
                "- current/skills/commands/runtime/SKILL.md\n- current/session/<session_uid>.jsonl",
            },
          },
        ],
      },
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      raw: {},
    });

    await runSummaryLoop(input, "query_summary");

    expect(mockDispatchToolCallAsync).toHaveBeenCalledWith(
      finishTool,
      expect.objectContaining({
        nextSessionReferencesMarkdown:
          "- current/skills/commands/runtime/SKILL.md\n- current/session/<session_uid>.jsonl",
      }),
      expect.objectContaining({
        vfsSummaryNodeRange: { fromIndex: 1, toIndex: 4 },
      }),
    );
  });

  it("retries once when finish summary contains forbidden tokens", async () => {
    const input = makeInput();

    let finishCount = 0;
    mockDispatchToolCallAsync.mockImplementation(async (name: string) => {
      if (name !== summaryToolset.finishToolName) {
        return { success: false, error: "unexpected tool" };
      }
      finishCount += 1;
      if (finishCount === 1) {
        return {
          success: true,
          data: {
            summary: {
              id: "s_forbidden",
              displayText: "includes vfs_read_chars (forbidden)",
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

  it("does not persist forbidden tokens even after multiple retries", async () => {
    const input = makeInput();
    (input.settings as any).extra = { maxAgenticRounds: 3 };

    mockDispatchToolCallAsync.mockImplementation(async (name: string) => {
      if (name !== summaryToolset.finishToolName) {
        return { success: false, error: "unexpected tool" };
      }
      return {
        success: true,
        data: {
          summary: {
            id: "s_forbidden",
            displayText: "includes vfs_write_file (forbidden)",
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

    expect(result.summary).toBeNull();
    expect(mockCallWithAgenticRetry).toHaveBeenCalledTimes(3);
    expect((input.vfsSession as any).mergeJson).toHaveBeenCalledTimes(4); // baseline + rollback per round
  });

  it("rejects finish calls when finish is not the last tool", async () => {
    const finishTool = summaryToolset.finishToolName;

    mockCallWithAgenticRetry
      .mockResolvedValueOnce({
        result: {
          functionCalls: [
            {
              id: "call_finish",
              name: finishTool,
              args: makeCommitSummaryArgs(),
            },
            { id: "call_read", name: "vfs_read_chars", args: {} },
          ],
        },
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        raw: {},
      })
      .mockResolvedValueOnce({
        result: {
          functionCalls: [
            {
              id: "call_finish_ok",
              name: finishTool,
              args: makeCommitSummaryArgs(),
            },
          ],
        },
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        raw: {},
      });

    const input = makeInput();
    const result = await runSummaryLoop(input, "query_summary");

    expect(result.summary?.id).toBe("s1");
    expect(mockCallWithAgenticRetry).toHaveBeenCalledTimes(2);
    expect(mockDispatchToolCallAsync).toHaveBeenCalledTimes(2);
    expect(mockDispatchToolCallAsync).toHaveBeenCalledWith(
      "vfs_read_chars",
      {},
      expect.any(Object),
    );
    expect(mockDispatchToolCallAsync).toHaveBeenCalledWith(
      finishTool,
      makeCommitSummaryArgs(),
      expect.objectContaining({
        vfsSummaryNodeRange: { fromIndex: 0, toIndex: 1 },
      }),
    );
  });

  it("rejects multiple finish calls in one response", async () => {
    const finishTool = summaryToolset.finishToolName;

    mockCallWithAgenticRetry
      .mockResolvedValueOnce({
        result: {
          functionCalls: [
            {
              id: "call_finish_1",
              name: finishTool,
              args: makeCommitSummaryArgs(),
            },
            {
              id: "call_finish_2",
              name: finishTool,
              args: makeCommitSummaryArgs(),
            },
          ],
        },
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        raw: {},
      })
      .mockResolvedValueOnce({
        result: {
          functionCalls: [
            {
              id: "call_finish_ok",
              name: finishTool,
              args: makeCommitSummaryArgs(),
            },
          ],
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

  it("blocks finish when earlier tools in the same batch fail", async () => {
    const finishTool = summaryToolset.finishToolName;

    mockCallWithAgenticRetry
      .mockResolvedValueOnce({
        result: {
          functionCalls: [
            { id: "call_read", name: "vfs_read_chars", args: {} },
            {
              id: "call_finish_blocked",
              name: finishTool,
              args: makeCommitSummaryArgs(),
            },
          ],
        },
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        raw: {},
      })
      .mockResolvedValueOnce({
        result: {
          functionCalls: [
            {
              id: "call_finish_ok",
              name: finishTool,
              args: makeCommitSummaryArgs(),
            },
          ],
        },
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        raw: {},
      });

    mockDispatchToolCallAsync.mockImplementation(async (name: string) => {
      if (name === "vfs_read_chars") {
        return {
          success: false,
          error: "read failed",
          code: "READ_FAILED",
        };
      }

      if (name === finishTool) {
        return {
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
        };
      }

      return { success: false, error: "unexpected tool" };
    });

    const input = makeInput();
    const result = await runSummaryLoop(input, "query_summary");

    expect(result.summary?.id).toBe("s1");
    expect(mockCallWithAgenticRetry).toHaveBeenCalledTimes(1);
    expect(mockDispatchToolCallAsync).toHaveBeenCalledTimes(2);
    expect(mockDispatchToolCallAsync.mock.calls[0]?.[0]).toBe("vfs_read_chars");
    expect(mockDispatchToolCallAsync.mock.calls[1]?.[0]).toBe(finishTool);
  });

  it("enforces finish-only mode when budget is critically low", async () => {
    const finishTool = summaryToolset.finishToolName;

    mockCallWithAgenticRetry
      .mockResolvedValueOnce({
        result: {
          functionCalls: [
            { id: "call_read", name: "vfs_read_chars", args: {} },
          ],
        },
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        raw: {},
      })
      .mockResolvedValueOnce({
        result: {
          functionCalls: [
            {
              id: "call_finish",
              name: finishTool,
              args: makeCommitSummaryArgs(),
            },
          ],
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
          summaryRetryLimit: 3,
        },
      } as any,
    });

    const result = await runSummaryLoop(input, "query_summary");

    expect(result.summary?.id).toBe("s1");
    expect(mockCallWithAgenticRetry).toHaveBeenCalledTimes(1);
    expect(mockCallWithAgenticRetry.mock.calls[0]?.[3]?.requiredToolName).toBe(
      finishTool,
    );
    expect(mockDispatchToolCallAsync).toHaveBeenCalledTimes(1);
    expect(mockDispatchToolCallAsync).toHaveBeenCalledWith(
      finishTool,
      makeCommitSummaryArgs(),
      expect.objectContaining({
        vfsSummaryNodeRange: { fromIndex: 0, toIndex: 1 },
      }),
    );
  });

  it("does not block query summary finish on soul anchor pre-read state", async () => {
    mockCallWithAgenticRetry.mockReset();
    mockCallWithAgenticRetry.mockResolvedValue({
      result: {
        functionCalls: [
          {
            id: "call_soul_gate_query",
            name: summaryToolset.finishToolName,
            args: makeCommitSummaryArgs(),
          },
        ],
      },
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      raw: {},
    });
    mockDispatchToolCallAsync.mockReset();
    mockDispatchToolCallAsync.mockResolvedValue({
      success: true,
      data: {
        summary: {
          id: "s1",
          ...makeCommitSummaryArgs(),
          nodeRange: { fromIndex: 0, toIndex: 1 },
          lastSummarizedIndex: 2,
        },
      },
    });

    const input = makeInput({
      settings: {
        ...makeInput().settings,
        extra: {
          maxToolCalls: 2,
          maxAgenticRounds: 1,
          summaryRetryLimit: 1,
        },
      } as any,
    });
    (input.vfsSession as any).hasToolSeenInCurrentEpoch = vi.fn(
      (_path: string) => false,
    );

    const result = await runSummaryLoop(input, "query_summary");

    expect(result.summary?.id).toBe("s1");
    expect(mockDispatchToolCallAsync).toHaveBeenCalledTimes(1);
    expect(
      (input.vfsSession as any).hasToolSeenInCurrentEpoch,
    ).not.toHaveBeenCalled();
  });

  it("does not block compact summary finish on soul anchor pre-read state", async () => {
    mockCallWithAgenticRetry.mockReset();
    mockCallWithAgenticRetry.mockResolvedValue({
      result: {
        functionCalls: [
          {
            id: "call_soul_gate_compact",
            name: summaryToolset.finishToolName,
            args: makeCommitSummaryArgs(),
          },
        ],
      },
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      raw: {},
    });
    mockDispatchToolCallAsync.mockReset();
    mockDispatchToolCallAsync.mockResolvedValue({
      success: true,
      data: {
        summary: {
          id: "s1",
          ...makeCommitSummaryArgs(),
          nodeRange: { fromIndex: 0, toIndex: 1 },
          lastSummarizedIndex: 2,
        },
      },
    });

    const input = makeInput({
      settings: {
        ...makeInput().settings,
        extra: {
          maxToolCalls: 2,
          maxAgenticRounds: 1,
          summaryRetryLimit: 1,
        },
      } as any,
    });
    (input.vfsSession as any).hasToolSeenInCurrentEpoch = vi.fn(
      (_path: string) => false,
    );

    const result = await runSummaryLoop(input, "session_compact");

    expect(result.summary?.id).toBe("s1");
    expect(mockDispatchToolCallAsync).toHaveBeenCalledTimes(1);
    expect(
      (input.vfsSession as any).hasToolSeenInCurrentEpoch,
    ).not.toHaveBeenCalled();
  });
});
