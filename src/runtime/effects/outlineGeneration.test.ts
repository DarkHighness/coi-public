import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const generateStoryOutlinePhasedMock = vi.hoisted(() => vi.fn());
const writeOutlineProgressMock = vi.hoisted(() => vi.fn());

vi.mock("../../services/aiService", () => ({
  generateStoryOutlinePhased: generateStoryOutlinePhasedMock,
}));

vi.mock("../../services/vfs/outline", () => ({
  writeOutlineProgress: writeOutlineProgressMock,
}));

import {
  blobToDataUrl,
  runOutlineGenerationPhased,
} from "./outlineGeneration";

describe("outlineGeneration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("forwards progress callbacks and persists checkpoint state", async () => {
    const gameStateRef = {
      current: {
        id: "state-0",
        liveToolCalls: [],
      },
    } as any;

    const setGameState = vi.fn((next: any) => {
      if (typeof next === "function") {
        gameStateRef.current = next(gameStateRef.current);
      } else {
        gameStateRef.current = next;
      }
    });

    const saveToSlot = vi.fn(async () => true);
    const onPhaseProgress = vi.fn();
    const t = vi.fn((key: string) => key);
    const vfsSession = { id: "vfs" } as any;

    const checkpoint = {
      currentPhase: 3,
      liveToolCalls: [{ name: "submit_outline_phase_3" }],
      conversationHistory: [],
    } as any;

    generateStoryOutlinePhasedMock.mockImplementation(
      async (
        _theme: string,
        _language: string,
        _customContext: string | undefined,
        _t: unknown,
        callbacks: any,
      ) => {
        callbacks.onToolCallsUpdate([{ name: "tool-a" }]);
        await callbacks.onSaveCheckpoint(checkpoint);
        callbacks.onPhaseProgress?.({ phase: 3 });
        return { outline: { title: "World" } };
      },
    );

    const result = await runOutlineGenerationPhased({
      theme: "fantasy",
      language: "en",
      customContext: "ctx",
      t: t as any,
      aiSettings: { lore: { modelId: "m", providerId: "p" } } as any,
      slotId: "slot-1",
      vfsSession,
      setGameState,
      gameStateRef,
      saveToSlot,
      onPhaseProgress,
      resumeFrom: { currentPhase: 2 } as any,
      seedImageBase64: "seed",
      protagonistFeature: "scar",
      presetProfile: { id: "preset" } as any,
      sessionTag: "resume-1",
      logPrefix: "TestOutline",
    });

    expect(result).toEqual({ outline: { title: "World" } });
    expect(generateStoryOutlinePhasedMock).toHaveBeenCalledWith(
      "fantasy",
      "en",
      "ctx",
      t,
      expect.objectContaining({
        settings: expect.any(Object),
        slotId: "slot-1",
        vfsSession,
        resumeFrom: { currentPhase: 2 },
        seedImageBase64: "seed",
        protagonistFeature: "scar",
        presetProfile: { id: "preset" },
        sessionTag: "resume-1",
      }),
    );

    expect(setGameState).toHaveBeenCalled();
    expect(gameStateRef.current.outlineConversation).toEqual(checkpoint);
    expect(gameStateRef.current.liveToolCalls).toEqual(
      checkpoint.liveToolCalls,
    );
    expect(writeOutlineProgressMock).toHaveBeenCalledWith(vfsSession, checkpoint);
    expect(saveToSlot).toHaveBeenCalledWith("slot-1", gameStateRef.current);
    expect(onPhaseProgress).toHaveBeenCalledWith({ phase: 3 });
  });

  it("converts blob to data URL via FileReader", async () => {
    class SuccessFileReader {
      result = "data:text/plain;base64,QQ==";
      onload: (() => void) | null = null;
      onerror: ((error: unknown) => void) | null = null;

      readAsDataURL(_blob: Blob) {
        this.onload?.();
      }
    }

    vi.stubGlobal("FileReader", SuccessFileReader as any);

    const result = await blobToDataUrl(new Blob(["A"], { type: "text/plain" }));
    expect(result).toBe("data:text/plain;base64,QQ==");
  });

  it("rejects when FileReader errors", async () => {
    class ErrorFileReader {
      result: string | null = null;
      onload: (() => void) | null = null;
      onerror: ((error: unknown) => void) | null = null;

      readAsDataURL(_blob: Blob) {
        this.onerror?.(new Error("read failed"));
      }
    }

    vi.stubGlobal("FileReader", ErrorFileReader as any);

    await expect(
      blobToDataUrl(new Blob(["A"], { type: "text/plain" })),
    ).rejects.toThrow("read failed");
  });
});
