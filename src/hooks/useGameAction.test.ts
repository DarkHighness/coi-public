// @vitest-environment jsdom

import React from "react";
import { render, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const generateAdventureTurn = vi.hoisted(() => vi.fn());
const invalidateSession = vi.hoisted(() => vi.fn(async () => undefined));

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
    invalidate: invalidateSession,
  },
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
      instances: [],
    },
    extra: {},
  }) as any;

describe("useGameAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null immediately when translation is in progress", async () => {
    const setGameState = vi.fn();
    const vfsSession = {
      snapshot: vi.fn(() => ({})),
      beginReadEpoch: vi.fn(),
    } as any;

    let api: ReturnType<typeof useGameAction> | null = null;
    const Harness = () => {
      api = useGameAction({
        gameState: makeGameState(),
        setGameState,
        aiSettings: makeSettings(),
        handleSaveSettings: vi.fn(),
        language: "en",
        isTranslating: true,
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
        isTranslating: false,
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

    expect(invalidateSession).toHaveBeenCalledWith(
      "slot-77:0:provider-1:model-1",
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
        isTranslating: false,
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
});
