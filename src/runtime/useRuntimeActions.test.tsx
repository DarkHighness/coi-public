// @vitest-environment jsdom

import React from "react";
import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ensureRagSaveContextMock = vi.hoisted(() => vi.fn());
const validateProvidersForModeMock = vi.hoisted(() => vi.fn());
const runContinueGameMock = vi.hoisted(() => vi.fn());
const runLoadSlotForPlayMock = vi.hoisted(() => vi.fn());

vi.mock("./effects/rag", () => ({
  ensureRagSaveContext: ensureRagSaveContextMock,
}));

vi.mock("./effects/providerValidation", () => ({
  validateProvidersForMode: validateProvidersForModeMock,
}));

vi.mock("./effects/continuation", () => ({
  runContinueGame: runContinueGameMock,
  runLoadSlotForPlay: runLoadSlotForPlayMock,
}));

import { useRuntimeActions } from "./useRuntimeActions";

const createParams = () => {
  const engineActions = {
    updateUiState: vi.fn(),
    setViewedSegmentId: vi.fn(),
    updateNodeMeta: vi.fn(),
    setVeoScript: vi.fn(),
    toggleGodMode: vi.fn(),
    setUnlockMode: vi.fn(),
    applyVfsMutation: vi.fn(),
    applyVfsDerivedState: vi.fn(),
    loadSlot: vi.fn(),
    resumeOutlineGeneration: vi.fn(),
    startNewGame: vi.fn(),
  };

  const ragActions = {
    switchSave: vi.fn(),
  };

  return {
    engineActions,
    engineState: {
      aiSettings: {
        embedding: { enabled: true },
      },
      gameState: {
        forkTree: {
          nodes: { 0: { id: 0, parentId: null } },
        },
      },
      currentSlotId: "slot-1",
      saveSlots: [],
    },
    ragRuntime: {
      isInitialized: true,
      actions: ragActions,
    },
    markMutation: vi.fn(),
  } as any;
};

const mount = (params: any) => {
  let current: any = null;

  const Probe = () => {
    current = useRuntimeActions(params);
    return React.createElement("div");
  };

  render(React.createElement(Probe));
  if (!current) {
    throw new Error("Runtime actions not mounted");
  }
  return current;
};

describe("useRuntimeActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("wraps domain/ui actions and emits mutation reasons", () => {
    const params = createParams();
    const actions = mount(params);

    const nextState = { key: "vfs-state" } as any;
    const derivedState = { key: "derived" } as any;

    actions.updateUiState("feedLayout", "cards");
    actions.setViewedSegmentId("seg-1");
    actions.updateNodeMeta("node-1", { text: "new" });
    actions.setVeoScript("script");
    actions.toggleGodMode(true);
    actions.setUnlockMode(true);
    actions.applyVfsMutation(nextState);
    actions.applyVfsDerivedState(derivedState);

    expect(params.engineActions.updateUiState).toHaveBeenCalledWith(
      "feedLayout",
      "cards",
      undefined,
    );
    expect(params.engineActions.setViewedSegmentId).toHaveBeenCalledWith(
      "seg-1",
      undefined,
    );
    expect(params.engineActions.updateNodeMeta).toHaveBeenCalledWith(
      "node-1",
      { text: "new" },
      undefined,
    );
    expect(params.engineActions.setVeoScript).toHaveBeenCalledWith(
      "script",
      undefined,
    );
    expect(params.engineActions.toggleGodMode).toHaveBeenCalledWith(true, undefined);
    expect(params.engineActions.setUnlockMode).toHaveBeenCalledWith(true, undefined);
    expect(params.engineActions.applyVfsMutation).toHaveBeenCalledWith(
      nextState,
      undefined,
    );
    expect(params.engineActions.applyVfsDerivedState).toHaveBeenCalledWith(
      derivedState,
      undefined,
    );

    expect(params.markMutation).toHaveBeenCalledWith("ui", "ui.feedLayout");
    expect(params.markMutation).toHaveBeenCalledWith("ui", "ui.viewedSegmentId");
    expect(params.markMutation).toHaveBeenCalledWith("domain", "node.node-1");
    expect(params.markMutation).toHaveBeenCalledWith("domain", "veoScript");
    expect(params.markMutation).toHaveBeenCalledWith("domain", "godMode");
    expect(params.markMutation).toHaveBeenCalledWith("domain", "unlockMode");
    expect(params.markMutation).toHaveBeenCalledWith("domain", "applyVfsMutation");
    expect(params.markMutation).toHaveBeenCalledWith(
      "domain",
      "applyVfsDerivedState",
    );
    expect(actions.rag).toBe(params.ragRuntime.actions);
  });

  it("syncs RAG save context with fallback fork tree and marks rag mutation on success", async () => {
    const params = createParams();
    ensureRagSaveContextMock.mockResolvedValue(true);
    const actions = mount(params);

    await act(async () => {
      await actions.syncRagSaveContext("save-2", 4, undefined);
    });

    expect(ensureRagSaveContextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        embeddingEnabled: true,
        ragInitialized: true,
        saveId: "save-2",
        forkId: 4,
        forkTree: params.engineState.gameState.forkTree,
        switchSave: params.ragRuntime.actions.switchSave,
      }),
    );
    expect(params.markMutation).toHaveBeenCalledWith("rag", "rag.switchSave:save-2");
  });

  it("does not mark rag mutation when sync reports no change", async () => {
    const params = createParams();
    ensureRagSaveContextMock.mockResolvedValue(false);
    const actions = mount(params);

    await act(async () => {
      const changed = await actions.syncRagSaveContext("save-2", 4, {
        nodes: { 1: { id: 1, parentId: null } },
      });
      expect(changed).toBe(false);
    });

    expect(params.markMutation).not.toHaveBeenCalled();
  });

  it("delegates continue/load/validation helpers", async () => {
    const params = createParams();
    runContinueGameMock.mockResolvedValue("navigated-game");
    runLoadSlotForPlayMock.mockResolvedValue("resumed-outline");
    validateProvidersForModeMock.mockResolvedValue({
      ok: true,
      issues: [],
    });

    const actions = mount(params);

    await act(async () => {
      const cont = await actions.continueGame({ onStream: vi.fn() });
      expect(cont).toBe("navigated-game");
    });

    await act(async () => {
      const loaded = await actions.loadSlotForPlay("slot-2");
      expect(loaded).toBe("resumed-outline");
    });

    await act(async () => {
      const result = await actions.validateProviders("start");
      expect(result).toEqual({ ok: true, issues: [] });
    });

    expect(runContinueGameMock).toHaveBeenCalledWith(
      expect.objectContaining({
        gameState: params.engineState.gameState,
        currentSlotId: params.engineState.currentSlotId,
        saveSlots: params.engineState.saveSlots,
        loadSlot: params.engineActions.loadSlot,
      }),
      expect.anything(),
    );
    expect(runLoadSlotForPlayMock).toHaveBeenCalledWith(
      expect.objectContaining({
        gameState: params.engineState.gameState,
        loadSlot: params.engineActions.loadSlot,
      }),
      "slot-2",
      undefined,
    );
    expect(validateProvidersForModeMock).toHaveBeenCalledWith(
      params.engineState.aiSettings,
      "start",
    );
  });
});
