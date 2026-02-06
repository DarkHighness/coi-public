import { describe, expect, it, vi } from "vitest";
import { createLifecycleActions } from "./lifecycleOrchestration";
import { HistoryCorruptedError } from "../../services/ai/contextCompressor";

const runOutlineGenerationPhasedMock = vi.hoisted(() => vi.fn());

vi.mock("./outlineGeneration", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./outlineGeneration")>();
  return {
    ...actual,
    runOutlineGenerationPhased: runOutlineGenerationPhasedMock,
  };
});

function createBaseDeps() {
  const baseState = {
    nodes: {},
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

describe("createLifecycleActions", () => {
  it("restarts via startNewGame when model mismatch and confirm restart", async () => {
    runOutlineGenerationPhasedMock.mockReset();

    const deps = createBaseDeps();
    deps.aiSettings.lore = { modelId: "model-b", providerId: "provider-b" };

    const confirmSpy = vi
      .fn()
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    runOutlineGenerationPhasedMock.mockRejectedValueOnce(
      new Error("stop early"),
    );

    const actions = createLifecycleActions({ ...(deps as any), confirm: confirmSpy });
    await actions.resumeOutlineGeneration();

    expect(confirmSpy).toHaveBeenCalled();
    expect(deps.showToast).toHaveBeenCalledWith(
      "outline.restartingWithNewModel",
      "info",
    );
    expect(runOutlineGenerationPhasedMock).toHaveBeenCalled();
  });

  it("clears outlineConversation on history-corrupted resume failure", async () => {
    runOutlineGenerationPhasedMock.mockReset();

    const deps = createBaseDeps();

    runOutlineGenerationPhasedMock.mockRejectedValueOnce(
      new HistoryCorruptedError(new Error("bad history")),
    );

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
    runOutlineGenerationPhasedMock.mockReset();

    const deps = createBaseDeps();
    deps.gameStateRef.current.outlineConversation = undefined;

    const confirmSpy = vi
      .fn()
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    runOutlineGenerationPhasedMock
      .mockRejectedValueOnce(new Error("first attempt failed"))
      .mockRejectedValueOnce(new Error("second attempt failed"));

    const actions = createLifecycleActions({ ...(deps as any), confirm: confirmSpy });
    await actions.startNewGame("fantasy", "ctx");

    expect(runOutlineGenerationPhasedMock).toHaveBeenCalledTimes(2);
    expect(confirmSpy).toHaveBeenCalledTimes(2);
    expect(deps.deleteSlot).toHaveBeenCalledTimes(1);
    expect(deps.navigate).toHaveBeenLastCalledWith("/");
  });

  it("switches to resume flow when startNewGame has saved progress", async () => {
    runOutlineGenerationPhasedMock.mockReset();

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

    const actions = createLifecycleActions({ ...(deps as any), confirm: confirmSpy });
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
