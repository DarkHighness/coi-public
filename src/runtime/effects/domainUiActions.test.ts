import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDomainUiActions } from "./domainUiActions";

const createHarness = (initialState: any) => {
  let state = structuredClone(initialState);
  const gameStateRef = { current: state } as any;

  const setGameState = vi.fn((updater: any) => {
    state = typeof updater === "function" ? updater(state) : updater;
    gameStateRef.current = state;
  });

  const triggerSave = vi.fn();
  const vfsSession = {
    readFile: vi.fn(() => ({ ok: true })),
    mergeJson: vi.fn(),
  } as any;

  const actions = createDomainUiActions({
    gameStateRef,
    setGameState,
    triggerSave,
    vfsSession,
  });

  return {
    actions,
    getState: () => state,
    setGameState,
    triggerSave,
    vfsSession,
  };
};

describe("createDomainUiActions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("updates node audio key", () => {
    const harness = createHarness({
      nodes: {
        n1: { id: "n1", audioKey: "old" },
      },
    });

    harness.actions.updateNodeAudio("n1", "new-audio");

    expect(harness.getState().nodes.n1.audioKey).toBe("new-audio");
    expect(harness.setGameState).toHaveBeenCalledTimes(1);
  });

  it("clears inventory highlight in state and VFS", () => {
    const harness = createHarness({
      playerActorId: "char:hero",
      inventory: [
        { id: "item:1", highlight: true },
        { id: "item:2", highlight: true },
      ],
    });

    harness.actions.clearHighlight({ kind: "inventory", id: "item:1" });

    expect(harness.vfsSession.readFile).toHaveBeenCalledWith(
      "world/characters/char:hero/inventory/item:1.json",
    );
    expect(harness.vfsSession.mergeJson).toHaveBeenCalledWith(
      "world/characters/char:hero/inventory/item:1.json",
      { highlight: false },
    );
    expect(harness.getState().inventory).toEqual([
      { id: "item:1", highlight: false },
      { id: "item:2", highlight: true },
    ]);
    expect(harness.triggerSave).toHaveBeenCalledTimes(1);
  });

  it("skips VFS merge when target file does not exist", () => {
    const harness = createHarness({
      playerActorId: "char:hero",
      knowledge: [{ id: "know:1", highlight: true }],
    });

    harness.vfsSession.readFile.mockReturnValueOnce(null);
    harness.actions.clearHighlight({ kind: "knowledge", id: "know:1" });

    expect(harness.vfsSession.readFile).toHaveBeenCalledWith(
      "world/characters/char:hero/views/knowledge/know:1.json",
    );
    expect(harness.vfsSession.mergeJson).not.toHaveBeenCalled();
    expect(harness.getState().knowledge[0].highlight).toBe(false);
    expect(harness.triggerSave).toHaveBeenCalledTimes(1);
  });

  it("clears character skill highlight by id", () => {
    const harness = createHarness({
      playerActorId: "char:hero",
      character: {
        skills: [
          { id: "skill:stealth", name: "Stealth", highlight: true },
          { id: "skill:sword", name: "Sword", highlight: true },
        ],
      },
    });

    harness.actions.clearHighlight({
      kind: "characterSkills",
      id: "skill:stealth",
    });

    expect(harness.vfsSession.readFile).toHaveBeenCalledWith(
      "world/characters/char:hero/skills/skill:stealth.json",
    );
    expect(harness.vfsSession.mergeJson).toHaveBeenCalledWith(
      "world/characters/char:hero/skills/skill:stealth.json",
      { highlight: false },
    );
    expect(harness.getState().character.skills[0].highlight).toBe(false);
    expect(harness.getState().character.skills[1].highlight).toBe(true);
    expect(harness.triggerSave).toHaveBeenCalledTimes(1);
  });

  it("matches character trait by name and updates state even without id", () => {
    const harness = createHarness({
      playerActorId: "char:hero",
      character: {
        hiddenTraits: [
          { name: "Destined", highlight: true },
          { id: "trait:shadow", name: "Shadow", highlight: true },
        ],
      },
    });

    harness.actions.clearHighlight({
      kind: "characterTraits",
      name: "Destined",
    });

    expect(harness.vfsSession.mergeJson).not.toHaveBeenCalled();
    expect(harness.getState().character.hiddenTraits[0].highlight).toBe(false);
    expect(harness.getState().character.hiddenTraits[1].highlight).toBe(true);
    expect(harness.triggerSave).toHaveBeenCalledTimes(1);
  });

  it("gracefully handles missing character section for condition clearing", () => {
    const harness = createHarness({
      playerActorId: "char:hero",
      character: null,
    });

    harness.actions.clearHighlight({
      kind: "characterConditions",
      id: "condition:poison",
    });

    expect(harness.vfsSession.readFile).not.toHaveBeenCalled();
    expect(harness.vfsSession.mergeJson).not.toHaveBeenCalled();
    expect(harness.triggerSave).toHaveBeenCalledTimes(1);
  });
});
