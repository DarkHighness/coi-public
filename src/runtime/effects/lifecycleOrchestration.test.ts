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
      currentPhaseId: "world_foundation",
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

  applyCustomContextThemeOverridesMock.mockImplementation(
    (config: any) => config,
  );
  indexInitialEntitiesMock.mockResolvedValue(undefined);
  persistOutlineCheckpointMock.mockResolvedValue(undefined);

  buildOutlineHydratedStateMock.mockImplementation(
    ({ baseState, outline }: any) => ({
      ...baseState,
      outline,
      currentLocation: "loc:start",
      time: "Day 1",
    }),
  );

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

  applyOpeningNarrativeStateMock.mockImplementation(
    (state: any, firstNode: any) => ({
      ...state,
      nodes: { [firstNode.id]: firstNode },
      activeNodeId: firstNode.id,
      rootNodeId: firstNode.id,
      currentFork: [firstNode],
      initialPrompt: "initial prompt",
      isProcessing: false,
      liveToolCalls: [],
    }),
  );
});

describe("createLifecycleActions", () => {
  it("uses imageBased theme key for image-start flow", async () => {
    runOutlineGenerationPhasedMock.mockRejectedValueOnce(
      new Error("outline failed"),
    );

    const deps = createBaseDeps();
    const actions = createLifecycleActions({
      ...deps,
      confirm: vi.fn(() => false),
    } as any);

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
    buildOpeningNarrativeSegmentMock.mockImplementation(
      ({ baseState }: any) => {
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
      },
    );
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
    runOutlineGenerationPhasedMock.mockRejectedValueOnce(
      new Error("stop early"),
    );

    const deps = createBaseDeps();
    deps.aiSettings.lore = { modelId: "model-b", providerId: "provider-b" };

    const confirmSpy = vi
      .fn()
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    const actions = createLifecycleActions({
      ...deps,
      confirm: confirmSpy,
    } as any);
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

  it("retries resume with sanitized checkpoint after history corruption", async () => {
    runOutlineGenerationPhasedMock
      .mockRejectedValueOnce(
        new HistoryCorruptedError(new Error("bad history")),
      )
      .mockResolvedValueOnce(makeOutlineResult());

    const deps = createBaseDeps();
    deps.gameStateRef.current.outlineConversation = {
      ...deps.gameStateRef.current.outlineConversation,
      conversationHistory: [
        {
          role: "user",
          content: [{ type: "text", text: "[OUTLINE GENERATION TASK]" }],
        },
        {
          role: "assistant",
          content: [
            {
              type: "tool_use",
              toolUse: {
                id: "call-1",
                name: "submit_outline_phase_3",
                args: {},
              },
            },
            { type: "text", text: "Trying phase" },
          ],
        },
        {
          role: "tool",
          content: [
            {
              type: "tool_result",
              toolResult: {
                id: "call-1",
                content: { success: false, error: "malformed" },
              },
            },
          ],
        },
      ],
    } as any;

    const actions = createLifecycleActions(deps as any);
    await actions.resumeOutlineGeneration();

    expect(runOutlineGenerationPhasedMock).toHaveBeenCalledTimes(2);
    const retryCall = runOutlineGenerationPhasedMock.mock.calls[1]?.[0] as any;
    expect(retryCall?.sessionTag).toBeUndefined();
    expect(retryCall?.sessionNamespace).toBe("resume");
    expect(retryCall?.logPrefix).toBe("ResumeOutlineRecovery");
    expect(retryCall?.resumeFrom?.liveToolCalls).toEqual([]);
    expect(retryCall?.resumeFrom?.conversationHistory).toEqual([
      {
        role: "user",
        content: [{ type: "text", text: "[OUTLINE GENERATION TASK]" }],
      },
      {
        role: "assistant",
        content: [{ type: "text", text: "Trying phase" }],
      },
    ]);
    expect(deps.showToast).not.toHaveBeenCalledWith(
      "initializing.errors.historyCacheCorruptedResume",
      "error",
      5000,
    );
    expect(deps.navigate).toHaveBeenCalledWith("/game");
  });

  it("retries resume after context-length failure with trimmed checkpoint", async () => {
    runOutlineGenerationPhasedMock
      .mockRejectedValueOnce(
        new Error("context_length_exceeded: too many tokens"),
      )
      .mockResolvedValueOnce(makeOutlineResult());

    const deps = createBaseDeps();
    deps.gameStateRef.current.outlineConversation = {
      ...deps.gameStateRef.current.outlineConversation,
      conversationHistory: [
        {
          role: "user",
          content: [{ type: "text", text: "[OUTLINE GENERATION TASK]" }],
        },
        ...Array.from({ length: 30 }, (_, idx) => ({
          role: idx % 2 === 0 ? "assistant" : "user",
          content: [
            { type: "text", text: `phase-msg-${idx}` },
            ...(idx === 3
              ? [
                  {
                    type: "tool_use",
                    toolUse: {
                      id: "bad-call",
                      name: "submit_outline_phase_3",
                      args: {},
                    },
                  },
                ]
              : []),
          ],
        })),
      ],
      liveToolCalls: [
        {
          name: "submit_outline_phase_3",
          input: {},
          output: null,
          timestamp: Date.now(),
        },
      ],
    } as any;

    const actions = createLifecycleActions(deps as any);
    await actions.resumeOutlineGeneration();

    expect(runOutlineGenerationPhasedMock).toHaveBeenCalledTimes(2);
    const retryCall = runOutlineGenerationPhasedMock.mock.calls[1]?.[0] as any;
    expect(retryCall?.sessionTag).toContain("context-recovery-");
    expect(retryCall?.sessionNamespace).toBe("resume");
    expect(retryCall?.resumeFrom?.liveToolCalls).toEqual([]);
    expect(
      retryCall?.resumeFrom?.conversationHistory.length,
    ).toBeLessThanOrEqual(24);
    expect(
      retryCall?.resumeFrom?.conversationHistory.some(
        (msg: any) => msg.role === "tool",
      ),
    ).toBe(false);
    expect(deps.navigate).toHaveBeenCalledWith("/game");
  });

  it("retries resume after transient provider/network failure", async () => {
    runOutlineGenerationPhasedMock
      .mockRejectedValueOnce(new Error("429 rate limit exceeded"))
      .mockResolvedValueOnce(makeOutlineResult());

    const deps = createBaseDeps();
    deps.gameStateRef.current.outlineConversation = {
      ...deps.gameStateRef.current.outlineConversation,
      conversationHistory: [
        {
          role: "user",
          content: [{ type: "text", text: "[OUTLINE GENERATION TASK]" }],
        },
        {
          role: "assistant",
          content: [{ type: "text", text: "phase in progress" }],
        },
      ],
      liveToolCalls: [
        {
          name: "submit_outline_phase_4",
          input: { demo: true },
          output: null,
          timestamp: Date.now(),
        },
      ],
    } as any;

    const actions = createLifecycleActions(deps as any);
    await actions.resumeOutlineGeneration();

    expect(runOutlineGenerationPhasedMock).toHaveBeenCalledTimes(2);
    const retryCall = runOutlineGenerationPhasedMock.mock.calls[1]?.[0] as any;
    expect(retryCall?.sessionTag).toBeUndefined();
    expect(retryCall?.sessionNamespace).toBe("resume");
    expect(retryCall?.resumeFrom?.conversationHistory).toEqual(
      deps.gameStateRef.current.outlineConversation.conversationHistory,
    );
    expect(retryCall?.resumeFrom?.liveToolCalls).toEqual([]);
    expect(deps.navigate).toHaveBeenCalledWith("/game");
  });

  it("reuses outline-new session namespace when retrying saved progress after non-context failure", async () => {
    const deps = createBaseDeps();
    const confirmSpy = vi.fn().mockReturnValueOnce(true);
    const savedConversation = {
      theme: "fantasy",
      language: "en",
      customContext: "ctx",
      currentPhaseId: "world_foundation",
      conversationHistory: [
        {
          role: "user",
          content: [{ type: "text", text: "[OUTLINE GENERATION TASK]" }],
        },
      ],
      partial: {},
      modelId: "model-a",
      providerId: "provider-a",
      liveToolCalls: [],
    };

    runOutlineGenerationPhasedMock
      .mockImplementationOnce(async (params: any) => {
        params.setGameState((prev: any) => ({
          ...prev,
          outlineConversation: savedConversation,
        }));
        throw new Error("network timeout");
      })
      .mockResolvedValueOnce(makeOutlineResult());

    const actions = createLifecycleActions({
      ...deps,
      confirm: confirmSpy,
    } as any);
    await actions.startNewGame("fantasy", "ctx");

    expect(runOutlineGenerationPhasedMock).toHaveBeenCalledTimes(2);
    const retryCall = runOutlineGenerationPhasedMock.mock.calls[1]?.[0] as any;
    expect(retryCall?.resumeFrom).toEqual(savedConversation);
    expect(retryCall?.sessionNamespace).toBe("new");
    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "initializing.errors.retryWithProgressReuseSession",
      ),
    );
  });

  it("switches to resume namespace when retrying saved progress after context overflow", async () => {
    const deps = createBaseDeps();
    const confirmSpy = vi.fn().mockReturnValueOnce(true);
    const savedConversation = {
      theme: "fantasy",
      language: "en",
      customContext: "ctx",
      currentPhaseId: "world_foundation",
      conversationHistory: [
        {
          role: "user",
          content: [{ type: "text", text: "[OUTLINE GENERATION TASK]" }],
        },
      ],
      partial: {},
      modelId: "model-a",
      providerId: "provider-a",
      liveToolCalls: [],
    };

    runOutlineGenerationPhasedMock
      .mockImplementationOnce(async (params: any) => {
        params.setGameState((prev: any) => ({
          ...prev,
          outlineConversation: savedConversation,
        }));
        throw new Error("context_length_exceeded: too many tokens");
      })
      .mockResolvedValueOnce(makeOutlineResult());

    const actions = createLifecycleActions({
      ...deps,
      confirm: confirmSpy,
    } as any);
    await actions.startNewGame("fantasy", "ctx");

    expect(runOutlineGenerationPhasedMock).toHaveBeenCalledTimes(2);
    const retryCall = runOutlineGenerationPhasedMock.mock.calls[1]?.[0] as any;
    expect(retryCall?.resumeFrom).toEqual(savedConversation);
    expect(retryCall?.sessionNamespace).toBe("resume");
    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "initializing.errors.retryWithProgressContextOverflow",
      ),
    );
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

    const actions = createLifecycleActions({
      ...deps,
      confirm: confirmSpy,
    } as any);
    await actions.startNewGame("fantasy", "ctx");

    expect(runOutlineGenerationPhasedMock).toHaveBeenCalledTimes(2);
    expect(confirmSpy).toHaveBeenCalledTimes(2);
    expect(deps.deleteSlot).toHaveBeenCalledTimes(1);
    expect(deps.navigate).toHaveBeenLastCalledWith("/");
  });

  it("does not reuse stale outline progress from previous save on retry", async () => {
    const deps = createBaseDeps();
    deps.gameStateRef.current.outlineConversation = {
      theme: "fantasy",
      language: "en",
      customContext: "ctx",
      currentPhaseId: "player_actor",
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

    const actions = createLifecycleActions({
      ...deps,
      confirm: confirmSpy,
    } as any);
    await actions.startNewGame("fantasy", "ctx");

    expect(runOutlineGenerationPhasedMock).toHaveBeenCalledTimes(2);
    const retryCallArgs = runOutlineGenerationPhasedMock.mock.calls[1]?.[0];
    expect(retryCallArgs?.resumeFrom).toBeUndefined();
  });
});
