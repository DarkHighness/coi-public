import { describe, expect, it, vi } from "vitest";
import { createDomainMutationActions } from "./domainMutations";

const createBaseState = () =>
  ({
    uiState: {
      feedLayout: "scroll",
      viewedSegmentId: undefined,
    },
    nodes: {
      "node-1": { id: "node-1", text: "old" },
    },
    veoScript: "",
    godMode: false,
    unlockMode: false,
  }) as any;

const createHarness = () => {
  let state = createBaseState();
  const triggerSave = vi.fn();
  const setGameState = vi.fn((next: any) => {
    if (typeof next === "function") {
      state = next(state);
    } else {
      state = next;
    }
  });

  const actions = createDomainMutationActions({
    setGameState: setGameState as any,
    triggerSave,
  });

  return {
    actions,
    triggerSave,
    setGameState,
    getState: () => state,
  };
};

describe("domainMutations", () => {
  it("updates UI state and only persists when requested", () => {
    const harness = createHarness();

    harness.actions.updateUiState("feedLayout" as any, "grid" as any);
    expect(harness.getState().uiState.feedLayout).toBe("grid");
    expect(harness.triggerSave).not.toHaveBeenCalled();

    harness.actions.setViewedSegmentId("seg-1", { persist: true });
    expect(harness.getState().uiState.viewedSegmentId).toBe("seg-1");
    expect(harness.triggerSave).toHaveBeenCalledTimes(1);
  });

  it("updates node meta and ignores unknown node ids", () => {
    const harness = createHarness();

    harness.actions.updateNodeMeta("node-1", { text: "new" }, { persist: true });
    expect(harness.getState().nodes["node-1"].text).toBe("new");
    expect(harness.triggerSave).toHaveBeenCalledTimes(1);

    const before = harness.getState();
    harness.actions.updateNodeMeta("missing", { text: "x" });
    expect(harness.getState()).toBe(before);
  });

  it("updates script, god mode, unlock mode, and persist defaults", () => {
    const harness = createHarness();

    harness.actions.setVeoScript("scene A");
    expect(harness.getState().veoScript).toBe("scene A");
    expect(harness.triggerSave).not.toHaveBeenCalled();

    harness.actions.toggleGodMode(true);
    harness.actions.setUnlockMode(true);
    expect(harness.getState().godMode).toBe(true);
    expect(harness.getState().unlockMode).toBe(true);
    expect(harness.triggerSave).toHaveBeenCalledTimes(2);

    harness.actions.toggleGodMode(false, { persist: false });
    harness.actions.setUnlockMode(false, { persist: false });
    expect(harness.getState().godMode).toBe(false);
    expect(harness.getState().unlockMode).toBe(false);
    expect(harness.triggerSave).toHaveBeenCalledTimes(2);
  });

  it("applies VFS mutation with default persist and derived state without persist", () => {
    const harness = createHarness();

    const nextState = {
      ...harness.getState(),
      uiState: { ...harness.getState().uiState, feedLayout: "cards" },
    };
    harness.actions.applyVfsMutation(nextState);

    expect(harness.getState()).toBe(nextState);
    expect(harness.triggerSave).toHaveBeenCalledTimes(1);

    const derived = {
      ...nextState,
      uiState: { ...nextState.uiState, feedLayout: "derived" },
    };
    harness.actions.applyVfsDerivedState(derived, "hydrate");

    expect(harness.getState()).toBe(derived);
    expect(harness.triggerSave).toHaveBeenCalledTimes(1);
  });
});
