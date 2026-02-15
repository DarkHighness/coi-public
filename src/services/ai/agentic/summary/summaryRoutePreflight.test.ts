import { beforeEach, describe, expect, it, vi } from "vitest";

const getProviderConfigMock = vi.hoisted(() => vi.fn());
const getOrCreateSessionMock = vi.hoisted(() => vi.fn());
const getSystemInstructionMock = vi.hoisted(() => vi.fn());
const getHistoryMock = vi.hoisted(() => vi.fn());
const readConversationIndexMock = vi.hoisted(() => vi.fn());
const fromGeminiFormatMock = vi.hoisted(() => vi.fn());

vi.mock("../../utils", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    getProviderConfig: (...args: any[]) => getProviderConfigMock(...args),
  };
});

vi.mock("../../sessionManager", () => ({
  sessionManager: {
    getOrCreateSession: (...args: any[]) => getOrCreateSessionMock(...args),
    getSystemInstruction: (...args: any[]) => getSystemInstructionMock(...args),
    getHistory: (...args: any[]) => getHistoryMock(...args),
  },
}));

vi.mock("../../../vfs/conversation", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    readConversationIndex: (...args: any[]) => readConversationIndexMock(...args),
  };
});

vi.mock("../../../messageTypes", () => ({
  fromGeminiFormat: (...args: any[]) => fromGeminiFormatMock(...args),
}));

import { preflightSummaryRoute } from "./summaryRoutePreflight";

const makeInput = () =>
  ({
    vfsSession: {
      snapshot: vi.fn(() => ({})),
    },
    slotId: "slot-1",
    forkId: 1,
    nodeRange: { fromIndex: 0, toIndex: 1 },
    baseSummaries: [],
    baseIndex: 0,
    language: "en",
    settings: {
      story: {
        providerId: "p1",
        modelId: "m1",
      },
      providers: {
        instances: [
          {
            id: "p1",
            protocol: "openai",
          },
        ],
      },
    },
  }) as any;

describe("preflightSummaryRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getProviderConfigMock.mockReturnValue({
      instance: {
        id: "p1",
        protocol: "openai",
      },
      modelId: "m1",
    });
    getOrCreateSessionMock.mockResolvedValue({ id: "slot-1:1:p1:m1" });
    getSystemInstructionMock.mockReturnValue("SYSTEM");
    getHistoryMock.mockReturnValue([
      {
        role: "assistant",
        content: [{ type: "text", text: "history" }],
      },
    ]);
    fromGeminiFormatMock.mockImplementation((history) => history);
    readConversationIndexMock.mockReturnValue({
      activeForkId: 1,
      activeTurnId: "fork-1/turn-3",
      latestTurnNumberByFork: { "1": 3 },
    });
  });

  it("routes to query_summary when story instruction is missing", async () => {
    getSystemInstructionMock.mockReturnValue(null);

    const decision = await preflightSummaryRoute(makeInput());

    expect(decision.mode).toBe("query_summary");
    expect(decision.reason).toBe("story_system_instruction_missing");
  });

  it("routes to session_compact when story session is healthy", async () => {
    const decision = await preflightSummaryRoute(makeInput());

    expect(decision.mode).toBe("session_compact");
    expect(decision.reason).toBe("compact_ready");
  });

  it("routes to query_summary when session history is too large", async () => {
    getHistoryMock.mockReturnValue(
      Array.from({ length: 20 }, () => ({ text: "x".repeat(12000) })),
    );

    const decision = await preflightSummaryRoute(makeInput());

    expect(decision.mode).toBe("query_summary");
    expect(decision.reason).toBe("story_history_too_large");
  });

  it("routes to query_summary when story provider is missing", async () => {
    getProviderConfigMock.mockReturnValue(null);

    const decision = await preflightSummaryRoute(makeInput());

    expect(decision.mode).toBe("query_summary");
    expect(decision.reason).toBe("story_provider_missing");
  });

  it("routes to query_summary when story session is unavailable", async () => {
    getOrCreateSessionMock.mockRejectedValueOnce(new Error("session failed"));

    const decision = await preflightSummaryRoute(makeInput());

    expect(decision.mode).toBe("query_summary");
    expect(decision.reason).toBe("story_session_unavailable");
  });

  it("routes to query_summary when story history is empty", async () => {
    getHistoryMock.mockReturnValue([]);

    const decision = await preflightSummaryRoute(makeInput());

    expect(decision.mode).toBe("query_summary");
    expect(decision.reason).toBe("story_history_empty");
  });

  it("routes to query_summary when conversation anchor is missing", async () => {
    readConversationIndexMock.mockReturnValue(null);

    const decision = await preflightSummaryRoute(makeInput());

    expect(decision.mode).toBe("query_summary");
    expect(decision.reason).toBe("conversation_anchor_missing");
    expect(decision.diagnostics.hasConversationIndex).toBe(false);
  });

  it("converts gemini history before preflight checks", async () => {
    getProviderConfigMock.mockReturnValue({
      instance: {
        id: "p1",
        protocol: "gemini",
      },
      modelId: "m1",
    });
    getHistoryMock.mockReturnValue([{ role: "model", parts: [{ text: "raw" }] }]);
    fromGeminiFormatMock.mockReturnValue([
      {
        role: "assistant",
        content: [{ type: "text", text: "converted" }],
      },
    ]);

    const decision = await preflightSummaryRoute(makeInput());

    expect(fromGeminiFormatMock).toHaveBeenCalledWith([
      { role: "model", parts: [{ text: "raw" }] },
    ]);
    expect(decision.mode).toBe("session_compact");
    expect(decision.reason).toBe("compact_ready");
  });
});
