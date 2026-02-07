import { describe, expect, it, vi, beforeEach } from "vitest";
import { createLifecycleActions } from "./lifecycleOrchestration";
import { HistoryCorruptedError } from "../../services/ai/contextCompressor";

const runOutlineGenerationPhasedMock = vi.hoisted(() => vi.fn());
const buildOutlineHydratedStateMock = vi.hoisted(() => vi.fn());
const buildOpeningNarrativeSegmentMock = vi.hoisted(() => vi.fn());
const applyOpeningNarrativeStateMock = vi.hoisted(() => vi.fn());
const persistOutlineCheckpointMock = vi.hoisted(() => vi.fn());
const applyCustomContextThemeOverridesMock = vi.hoisted(() => vi.fn());
const indexInitialEntitiesMock = vi.hoisted(() => vi.fn());

vi.mock("./outlineGeneration", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./outlineGeneration")>();
  return {
    ...actual,
    runOutlineGenerationPhased: runOutlineGenerationPhasedMock,
  };
});

vi.mock("./outlineHydration", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./outlineHydration")>();
  return {
    ...actual,
    buildOutlineHydratedState: buildOutlineHydratedStateMock,
    buildOpeningNarrativeSegment: buildOpeningNarrativeSegmentMock,
    applyOpeningNarrativeState: applyOpeningNarrativeStateMock,
    persistOutlineCheckpoint: persistOutlineCheckpointMock,
  };
});

vi.mock("./ragDocuments", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./ragDocuments")>();
  return {
    ...actual,
    applyCustomContextThemeOverrides: applyCustomContextThemeOverridesMock,
    indexInitialEntities: indexInitialEntitiesMock,
  };
});

function createBaseDeps() {
  const baseState = {
    nodes: {},
    activeNodeId: null,
    rootNodeId: null,
    currentFork: [],
    outlineConversation: {
      theme: "fantasy",
      language: "en",
      customContext: "ctx",
      currentPhase: 3,
      conversationHistory: [],
      partial: {},
      modelId: "model-a",
      providerId: "provider-a",
      liveToolCalls: [],
    },
    isProcessing: false,
    liveToolCalls: [],
    error: null,
    logs: [],
    tokenUsage: {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      cacheRead: 0,
      cacheWrite: 0,
    },
    character: {},
    theme: "fantasy",
    language: "en",
  } as any;

  const gameStateRef = { current: baseState } as any;
  const setGameState = vi.fn((updater: any) => {
    if (typeof updater === "function") {
      gameStateRef.current = updater(gameStateRef.current);
      return;
    }
    gameStateRef.current = updater;
  });

  const deps = {
    aiSettings: {
      audioVolume: { bgmMuted: true, bgmVolume: 0 },
      lore: { modelId: "model-a", providerId: "provider-a" },
      embedding: { enabled: false },
    } as any,
    language: "en",
    t: vi.fn((key: string) => key),
    showToast: vi.fn(),
    navigate: vi.fn(),
    vfsSession: {
      restore: vi.fn(),
      writeFile: vi.fn(),
      mergeJson: vi.fn(),
      readFile: vi.fn(() => null),
      deleteFile: vi.fn(),
    } as any,
    gameStateRef,
    setGameState,
    createSaveSlot: vi.fn(() => "slot-new"),
    setCurrentSlotId: vi.fn(),
    currentSlotId: "slot-a",
    saveToSlot: vi.fn(async () => true),
    deleteSlot: vi.fn(),
    resetState: vi.fn(),
  };

  return deps;
}

function makeOutlineResult() {
  return {
    outline: {
      title: "World",
      openingNarrative: {
        narrative: "Opening",
        choices: [{ text: "Continue" }],
        atmosphere: { envTheme: "fantasy", ambience: "quiet" },
      },
      initialAtmosphere: { envTheme: "fantasy", ambience: "quiet" },
      initialTime: "Day 1",
      locations: [{ id: "loc:start" }],
    },
    logs: [],
    themeConfig: { name: "Fantasy" },
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();

  applyCustomContextThemeOverridesMock.mockImplementation((config: any) => config);
  indexInitialEntitiesMock.mockResolvedValue(undefined);
  persistOutlineCheckpointMock.mockResolvedValue(undefined);

  buildOutlineHydratedStateMock.mockImplementation(({ baseState, outline }: any) => ({
    ...baseState,
    outline,
    currentLocation: "loc:start",
    time: "Day 1",
  }));

  buildOpeningNarrativeSegmentMock.mockReturnValue({
    firstNode: {
      id: "model-fork-0/turn-0",
      parentId: null,
      text: "Opening",
      choices: [{ text: "Continue" }],
      imagePrompt: "",
      role: "model",
      timestamp: 1,
      segmentIdx: 0,
      summaries: [],
      summarizedIndex: 0,
      ending: "continue",
    },
    openingAtmosphere: { envTheme: "fantasy", ambience: "quiet" },
    fallbackPrompt: "initial prompt",
  });

  applyOpeningNarrativeStateMock.mockImplementation((state: any, firstNode: any) => ({
    ...state,
    nodes: { [firstNode.id]: firstNode },
    activeNodeId: firstNode.id,
    rootNodeId: firstNode.id,
    currentFork: [firstNode],
    initialPrompt: "initial prompt",
    isProcessing: false,
    liveToolCalls: [],
  }));
});

describe("createLifecycleActions", () => {
  it("uses imageBased theme key for image-start flow", async () => {
    runOutlineGenerationPhasedMock.mockRejectedValueOnce(new Error("outline failed"));

    const deps = createBaseDeps();
    const actions = createLifecycleActions({ ...deps, confirm: vi.fn(() => false) } as any);

    await actions.startNewGame(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      new Blob(["img"], { type: "image/png" }),
    );

    expect(runOutlineGenerationPhasedMock).toHaveBeenCalledWith(
      expect.objectContaining({ theme: "imageBased" }),
    );
  });

  it("hydrates opening segment against latest hydrated state", async () => {
    runOutlineGenerationPhasedMock.mockResolvedValueOnce(makeOutlineResult());

    const deps = createBaseDeps();
    const hydratedState = {
      ...deps.gameStateRef.current,
      currentLocation: "loc:hydrated",
    };
    const committedState = {
      ...hydratedState,
      marker: "committed",
      isProcessing: false,
      liveToolCalls: [],
    } as any;

    buildOutlineHydratedStateMock.mockReturnValue(hydratedState);
    buildOpeningNarrativeSegmentMock.mockImplementation(({ baseState }: any) => {
      expect(baseState).toBe(hydratedState);
      return {
        firstNode: {
          id: "model-fork-0/turn-0",
          parentId: null,
          text: "Opening",
          choices: [{ text: "Continue" }],
          imagePrompt: "",
          role: "model",
          timestamp: 1,
          segmentIdx: 0,
          summaries: [],
          summarizedIndex: 0,
          ending: "continue",
        },
        openingAtmosphere: { envTheme: "fantasy", ambience: "quiet" },
        fallbackPrompt: "initial prompt",
      };
    });
    applyOpeningNarrativeStateMock.mockReturnValue(committedState);

    const actions = createLifecycleActions(deps as any);
    await actions.startNewGame("fantasy", "ctx");

    expect(deps.gameStateRef.current).toBe(committedState);
    expect(persistOutlineCheckpointMock).toHaveBeenCalledWith(
      expect.objectContaining({ nextState: committedState }),
    );
  });

  it("does not persist checkpoint when opening segment creation fails", async () => {
    runOutlineGenerationPhasedMock.mockResolvedValueOnce(makeOutlineResult());
    buildOpeningNarrativeSegmentMock.mockImplementation(() => {
      throw new Error("Missing opening narrative from Phase 9");
    });

    const deps = createBaseDeps();
    const actions = createLifecycleActions(deps as any);

    await actions.startNewGame("fantasy", "ctx");

    expect(persistOutlineCheckpointMock).not.toHaveBeenCalled();
    expect(deps.showToast).toHaveBeenCalledWith(
      "initializing.errors.firstSegmentFailed",
      "error",
      5000,
    );
    expect(deps.deleteSlot).toHaveBeenCalled();
    expect(deps.setCurrentSlotId).toHaveBeenLastCalledWith(null);
    expect(deps.navigate).toHaveBeenLastCalledWith("/");
  });

  it("restarts via startNewGame when model mismatch and confirm restart", async () => {
    runOutlineGenerationPhasedMock.mockRejectedValueOnce(new Error("stop early"));

    const deps = createBaseDeps();
    deps.aiSettings.lore = { modelId: "model-b", providerId: "provider-b" };

    const confirmSpy = vi
      .fn()
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    const actions = createLifecycleActions({ ...deps, confirm: confirmSpy } as any);
    await actions.resumeOutlineGeneration();

    expect(confirmSpy).toHaveBeenCalled();
    expect(deps.showToast).toHaveBeenCalledWith(
      "outline.restartingWithNewModel",
      "info",
    );
    expect(runOutlineGenerationPhasedMock).toHaveBeenCalled();
  });

  it("clears outlineConversation on history-corrupted resume failure", async () => {
    runOutlineGenerationPhasedMock.mockRejectedValueOnce(
      new HistoryCorruptedError(new Error("bad history")),
    );

    const deps = createBaseDeps();
    const actions = createLifecycleActions(deps as any);
    await actions.resumeOutlineGeneration();

    expect(deps.showToast).toHaveBeenCalledWith(
      "initializing.errors.historyCacheCorruptedResume",
      "error",
      5000,
    );
    expect(deps.navigate).toHaveBeenCalledWith("/");
    expect(deps.gameStateRef.current.outlineConversation).toBeUndefined();
  });

  it("retries startNewGame from scratch when no saved progress", async () => {
    const deps = createBaseDeps();
    deps.gameStateRef.current.outlineConversation = undefined;

    const confirmSpy = vi
      .fn()
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    runOutlineGenerationPhasedMock
      .mockRejectedValueOnce(new Error("first attempt failed"))
      .mockRejectedValueOnce(new Error("second attempt failed"));

    const actions = createLifecycleActions({ ...deps, confirm: confirmSpy } as any);
    await actions.startNewGame("fantasy", "ctx");

    expect(runOutlineGenerationPhasedMock).toHaveBeenCalledTimes(2);
    expect(confirmSpy).toHaveBeenCalledTimes(2);
    expect(deps.deleteSlot).toHaveBeenCalledTimes(1);
    expect(deps.navigate).toHaveBeenLastCalledWith("/");
  });

  it("switches to resume flow when startNewGame has saved progress", async () => {
    const deps = createBaseDeps();
    deps.gameStateRef.current.outlineConversation = {
      theme: "fantasy",
      language: "en",
      customContext: "ctx",
      currentPhase: 4,
      conversationHistory: [],
      partial: {},
      modelId: "model-a",
      providerId: "provider-a",
      liveToolCalls: [],
    };

    const confirmSpy = vi.fn().mockReturnValueOnce(true);

    runOutlineGenerationPhasedMock
      .mockRejectedValueOnce(new Error("outline failed"))
      .mockRejectedValueOnce(new Error("resume failed"));

    const actions = createLifecycleActions({ ...deps, confirm: confirmSpy } as any);
    await actions.startNewGame("fantasy", "ctx");

    expect(runOutlineGenerationPhasedMock).toHaveBeenCalledTimes(2);
    const resumeCallArgs = runOutlineGenerationPhasedMock.mock.calls[1]?.[0];
    expect(resumeCallArgs?.resumeFrom).toBeDefined();
    expect(deps.showToast).toHaveBeenCalledWith(
      "initializing.errors.resumeFailed",
      "error",
      5000,
    );
  });
});
