// @vitest-environment jsdom

import React from "react";
import { render, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const generateAdventureTurn = vi.hoisted(() => vi.fn());
const invalidateSession = vi.hoisted(() => vi.fn(async () => undefined));
const getOrCreateSession = vi.hoisted(() =>
  vi.fn(async () => ({ id: "sess-test-opaque-id" })),
);
const handleForking = vi.hoisted(() => vi.fn());
const handleSummarization = vi.hoisted(() => vi.fn());
const updateProviderStats = vi.hoisted(() => vi.fn());
const createModelNode = vi.hoisted(() => vi.fn());
const notifySessionSummaryCreated = vi.hoisted(() => vi.fn());

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock("../contexts/ToastContext", () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

vi.mock("../services/aiService", () => ({
  generateAdventureTurn,
}));

vi.mock("../services/ai/sessionManager", () => ({
  sessionManager: {
    getOrCreateSession,
    invalidate: invalidateSession,
  },
}));

vi.mock("./gameActionHelpers", () => ({
  updateProviderStats,
  handleForking,
  handleSummarization,
  createModelNode,
  notifySessionSummaryCreated,
}));

import { useGameAction } from "./useGameAction";

const makeGameState = () =>
  ({
    isProcessing: false,
    turnNumber: 0,
    activeNodeId: null,
    nodes: {},
    summaries: [],
    lastSummarizedIndex: 0,
    forkId: 0,
    logs: [],
    theme: "fantasy",
    uiState: {},
    outlineConversation: null,
  }) as any;

const makeSettings = () =>
  ({
    story: {
      providerId: "provider-1",
      modelId: "model-1",
    },
    providers: {
      instances: [{ id: "provider-1", protocol: "openai" }],
    },
    extra: {},
  }) as any;

describe("useGameAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    handleForking.mockImplementation((state: any) => ({
      currentForkId: state.forkId ?? 0,
      currentForkTree: state.forkTree,
    }));
    handleSummarization.mockResolvedValue({
      effectiveSummaries: [],
      lastIndex: 0,
      summarySnapshot: undefined,
      contextNodes: [],
      logs: [],
      error: undefined,
    });
  });

  it("returns null immediately when a turn is already processing", async () => {
    const setGameState = vi.fn();
    const vfsSession = {
      snapshot: vi.fn(() => ({})),
      beginReadEpoch: vi.fn(),
    } as any;

    let api: ReturnType<typeof useGameAction> | null = null;
    const Harness = () => {
      api = useGameAction({
        gameState: { ...makeGameState(), isProcessing: true },
        setGameState,
        aiSettings: makeSettings(),
        handleSaveSettings: vi.fn(),
        language: "en",
        currentSlotId: "slot-1",
        generateImageForNode: vi.fn(async () => undefined),
        triggerSave: vi.fn(),
        vfsSession,
      });
      return React.createElement("div");
    };

    render(React.createElement(Harness));

    let result: any;
    await act(async () => {
      result = await api!.handleAction("hello world");
    });

    expect(result).toBeNull();
    expect(generateAdventureTurn).not.toHaveBeenCalled();
    expect(setGameState).not.toHaveBeenCalled();
  });

  it("invalidates session and starts a new VFS read epoch", async () => {
    const vfsSession = {
      snapshot: vi.fn(() => ({})),
      beginReadEpoch: vi.fn(),
    } as any;

    let api: ReturnType<typeof useGameAction> | null = null;
    const Harness = () => {
      api = useGameAction({
        gameState: makeGameState(),
        setGameState: vi.fn(),
        aiSettings: makeSettings(),
        handleSaveSettings: vi.fn(),
        language: "en",
        currentSlotId: "slot-77",
        generateImageForNode: vi.fn(async () => undefined),
        triggerSave: vi.fn(),
        vfsSession,
      });
      return React.createElement("div");
    };

    render(React.createElement(Harness));

    await act(async () => {
      await api!.handleInvalidateSession();
    });

    expect(getOrCreateSession).toHaveBeenCalledWith({
      slotId: "slot-77",
      forkId: 0,
      providerId: "provider-1",
      modelId: "model-1",
      protocol: "openai",
    });
    expect(invalidateSession).toHaveBeenCalledWith(
      "sess-test-opaque-id",
      "manual_clear",
    );
    expect(vfsSession.beginReadEpoch).toHaveBeenCalledWith("manual_invalidate");
  });

  it("skips invalidation when slot id is missing", async () => {
    const vfsSession = {
      snapshot: vi.fn(() => ({})),
      beginReadEpoch: vi.fn(),
    } as any;

    let api: ReturnType<typeof useGameAction> | null = null;
    const Harness = () => {
      api = useGameAction({
        gameState: makeGameState(),
        setGameState: vi.fn(),
        aiSettings: makeSettings(),
        handleSaveSettings: vi.fn(),
        language: "en",
        currentSlotId: null,
        generateImageForNode: vi.fn(async () => undefined),
        triggerSave: vi.fn(),
        vfsSession,
      });
      return React.createElement("div");
    };

    render(React.createElement(Harness));

    await act(async () => {
      await api!.handleInvalidateSession();
    });

    expect(invalidateSession).not.toHaveBeenCalled();
    expect(vfsSession.beginReadEpoch).not.toHaveBeenCalled();
  });

  it("rolls back optimistic user node when turn generation fails", async () => {
    generateAdventureTurn.mockRejectedValueOnce(
      new Error("[ERROR: UNKNOWN_PROVIDER_ERROR] boom"),
    );

    let state: any = {
      ...makeGameState(),
      activeNodeId: "model-0",
      rootNodeId: "model-0",
      nodes: {
        "model-0": {
          id: "model-0",
          role: "model",
          text: "The road splits ahead.",
          choices: ["Go left", "Go right"],
          parentId: null,
          segmentIdx: 0,
          timestamp: Date.now(),
          summaries: [],
          summarizedIndex: 0,
          ending: "continue",
        },
      },
      currentFork: [],
    };

    const setGameState = vi.fn((updater: any) => {
      if (typeof updater === "function") {
        state = updater(state);
      } else {
        state = updater;
      }
    });

    const vfsSession = {
      snapshot: vi.fn(() => ({})),
      beginReadEpoch: vi.fn(),
    } as any;

    let api: ReturnType<typeof useGameAction> | null = null;
    const Harness = () => {
      api = useGameAction({
        gameState: state,
        setGameState,
        aiSettings: makeSettings(),
        handleSaveSettings: vi.fn(),
        language: "en",
        currentSlotId: "slot-1",
        generateImageForNode: vi.fn(async () => undefined),
        triggerSave: vi.fn(),
        vfsSession,
      });
      return React.createElement("div");
    };

    render(React.createElement(Harness));

    let result: any;
    await act(async () => {
      result = await api!.handleAction("Go left");
    });

    expect(result).toEqual({
      success: false,
      error: "game.errors.unknownProviderManualRetry",
    });
    expect(state.activeNodeId).toBe("model-0");
    expect(state.nodes["model-0"]).toBeTruthy();
    expect(
      Object.values(state.nodes).some(
        (node: any) => node?.role === "user" && node?.text === "Go left",
      ),
    ).toBe(false);
  });
});
