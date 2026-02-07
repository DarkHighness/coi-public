import { describe, expect, it, vi } from "vitest";
import { runContinueGame, runLoadSlotForPlay } from "./continuation";

function createGameState(overrides: Record<string, unknown> = {}) {
  return {
    forkId: 7,
    forkTree: { nodeIdToTimelineId: {}, timelines: {} },
    theme: "fantasy",
    customContext: "ctx",
    outline: undefined,
    outlineConversation: undefined,
    ...overrides,
  } as any;
}

function createContinueDeps(overrides: Record<string, unknown> = {}) {
  return {
    gameState: createGameState(),
    currentSlotId: "slot-current",
    saveSlots: [{ id: "slot-old", timestamp: 1 }],
    loadSlot: vi.fn(async () => ({ success: true })),
    resumeOutlineGeneration: vi.fn(async () => undefined),
    startNewGame: vi.fn(async () => undefined),
    syncRagSaveContext: vi.fn(async () => true),
    ...overrides,
  };
}

function createLoadDeps(overrides: Record<string, unknown> = {}) {
  return {
    gameState: createGameState(),
    loadSlot: vi.fn(async () => ({ success: true })),
    resumeOutlineGeneration: vi.fn(async () => undefined),
    syncRagSaveContext: vi.fn(async () => true),
    ...overrides,
  };
}

describe("runContinueGame", () => {
  it("returns navigated-game when current slot already has outline", async () => {
    const deps = createContinueDeps({
      gameState: createGameState({ outline: { id: "outline-1" } }),
    });

    const result = await runContinueGame(deps as any);

    expect(result).toBe("navigated-game");
    expect(deps.syncRagSaveContext).toHaveBeenCalledWith({
      saveId: "slot-current",
      forkId: 7,
      forkTree: deps.gameState.forkTree,
      reason: "runtime.continue.current",
    });
    expect(deps.resumeOutlineGeneration).not.toHaveBeenCalled();
    expect(deps.startNewGame).not.toHaveBeenCalled();
  });

  it("returns resumed-outline when current slot has outlineConversation", async () => {
    const stream = vi.fn();
    const phase = vi.fn();
    const deps = createContinueDeps({
      gameState: createGameState({ outlineConversation: { phase: 2 } }),
    });

    const result = await runContinueGame(deps as any, {
      onStream: stream,
      onPhaseProgress: phase,
    });

    expect(result).toBe("resumed-outline");
    expect(deps.resumeOutlineGeneration).toHaveBeenCalledWith(stream, phase);
    expect(deps.syncRagSaveContext).not.toHaveBeenCalled();
  });

  it("returns started-outline when current slot has theme but no outline", async () => {
    const stream = vi.fn();
    const phase = vi.fn();
    const deps = createContinueDeps({
      gameState: createGameState({
        outline: undefined,
        outlineConversation: undefined,
        theme: "cyberpunk",
        customContext: "custom",
      }),
    });

    const result = await runContinueGame(deps as any, {
      onStream: stream,
      onPhaseProgress: phase,
    });

    expect(result).toBe("started-outline");
    expect(deps.startNewGame).toHaveBeenCalledWith(
      "cyberpunk",
      "custom",
      stream,
      phase,
      "slot-current",
    );
  });

  it("returns no-save when there is no current slot and no saves", async () => {
    const deps = createContinueDeps({ currentSlotId: null, saveSlots: [] });

    const result = await runContinueGame(deps as any);

    expect(result).toBe("no-save");
    expect(deps.loadSlot).not.toHaveBeenCalled();
  });

  it("loads most recent save and returns load-failed when loading fails", async () => {
    const deps = createContinueDeps({
      currentSlotId: null,
      saveSlots: [
        { id: "slot-old", timestamp: 1 },
        { id: "slot-latest", timestamp: 10 },
      ],
      loadSlot: vi.fn(async () => ({ success: false })),
    });

    const result = await runContinueGame(deps as any);

    expect(result).toBe("load-failed");
    expect(deps.loadSlot).toHaveBeenCalledWith("slot-latest");
  });

  it("uses loaded save state and returns navigated-game when outline exists", async () => {
    const deps = createContinueDeps({
      currentSlotId: null,
      saveSlots: [{ id: "slot-1", timestamp: 100 }],
      loadSlot: vi.fn(async () => ({
        success: true,
        hasOutline: true,
        forkId: 3,
      })),
    });

    const result = await runContinueGame(deps as any);

    expect(result).toBe("navigated-game");
    expect(deps.syncRagSaveContext).toHaveBeenCalledWith({
      saveId: "slot-1",
      forkId: 3,
      forkTree: deps.gameState.forkTree,
      reason: "runtime.continue.loaded",
    });
  });

  it("returns invalid-state when loaded save has no usable continuation fields", async () => {
    const deps = createContinueDeps({
      currentSlotId: null,
      saveSlots: [{ id: "slot-1", timestamp: 100 }],
      loadSlot: vi.fn(async () => ({ success: true })),
    });

    const result = await runContinueGame(deps as any);

    expect(result).toBe("invalid-state");
  });
});

describe("runLoadSlotForPlay", () => {
  it("returns load-failed when slot loading fails", async () => {
    const deps = createLoadDeps({
      loadSlot: vi.fn(async () => ({ success: false })),
    });

    const result = await runLoadSlotForPlay(deps as any, "slot-1");

    expect(result).toBe("load-failed");
  });

  it("returns resumed-outline when loaded save has outlineConversation", async () => {
    const stream = vi.fn();
    const phase = vi.fn();
    const deps = createLoadDeps({
      loadSlot: vi.fn(async () => ({
        success: true,
        hasOutlineConversation: true,
      })),
    });

    const result = await runLoadSlotForPlay(deps as any, "slot-2", {
      onStream: stream,
      onPhaseProgress: phase,
    });

    expect(result).toBe("resumed-outline");
    expect(deps.resumeOutlineGeneration).toHaveBeenCalledWith(stream, phase);
  });

  it("returns navigated-game and syncs rag when loaded save has outline", async () => {
    const deps = createLoadDeps({
      loadSlot: vi.fn(async () => ({
        success: true,
        hasOutline: true,
        forkId: 9,
        forkTree: { nodeIdToTimelineId: { a: "t1" }, timelines: {} },
      })),
    });

    const result = await runLoadSlotForPlay(deps as any, "slot-3");

    expect(result).toBe("navigated-game");
    expect(deps.syncRagSaveContext).toHaveBeenCalledWith({
      saveId: "slot-3",
      forkId: 9,
      forkTree: { nodeIdToTimelineId: { a: "t1" }, timelines: {} },
      reason: "runtime.loadSlot",
    });
  });

  it("returns invalid-state when load succeeds but has neither outline nor outlineConversation", async () => {
    const deps = createLoadDeps({
      loadSlot: vi.fn(async () => ({ success: true })),
    });

    const result = await runLoadSlotForPlay(deps as any, "slot-4");

    expect(result).toBe("invalid-state");
  });
});
