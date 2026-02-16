import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDomainUiActions } from "./domainUiActions";

const createDefaultUiState = () => ({
  inventory: { pinnedIds: [], customOrder: [] },
  locations: { pinnedIds: [], customOrder: [] },
  npcs: { pinnedIds: [], customOrder: [] },
  knowledge: { pinnedIds: [], customOrder: [] },
  quests: { pinnedIds: [], customOrder: [] },
  entityPresentation: {},
});

const createHarness = (initialState: any) => {
  const mergedUiState = {
    ...createDefaultUiState(),
    ...(initialState?.uiState ?? {}),
  };
  let state = structuredClone({
    ...initialState,
    uiState: mergedUiState,
  });

  const setGameState = vi.fn((updater: any) => {
    state = typeof updater === "function" ? updater(state) : updater;
  });

  const triggerSave = vi.fn();

  const actions = createDomainUiActions({
    setGameState,
    triggerSave,
  });

  return {
    actions,
    getState: () => state,
    setGameState,
    triggerSave,
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

  it("clears inventory highlight in state and UI presentation metadata", () => {
    const harness = createHarness({
      playerActorId: "char:hero",
      inventory: [
        { id: "item:1", highlight: true },
        { id: "item:2", highlight: true },
      ],
      uiState: {
        entityPresentation: {
          "inventory:item:1": { highlight: true },
          "inventory:item:2": { highlight: true },
        },
      },
    });

    harness.actions.clearHighlight({ kind: "inventory", id: "item:1" });

    expect(harness.getState().inventory).toEqual([
      { id: "item:1", highlight: false },
      { id: "item:2", highlight: true },
    ]);
    const item1Presentation =
      harness.getState().uiState.entityPresentation?.["inventory:item:1"] ?? {};
    expect(item1Presentation.highlight).toBe(false);
    expect(item1Presentation.lastAccess).toMatchObject({
      forkId: 0,
      turnNumber: 0,
      timestamp: expect.any(Number),
    });
    expect(harness.getState().uiState.entityPresentation).toMatchObject({
      "inventory:item:2": { highlight: true },
    });
    expect(harness.triggerSave).toHaveBeenCalledTimes(1);
  });

  it("records clear intent in uiState for list entities", () => {
    const harness = createHarness({
      playerActorId: "char:hero",
      knowledge: [{ id: "know:1", highlight: true }],
    });

    harness.actions.clearHighlight({ kind: "knowledge", id: "know:1" });

    expect(harness.getState().knowledge[0].highlight).toBe(false);
    expect(harness.getState().uiState.entityPresentation).toMatchObject({
      "knowledge:know:1": {
        highlight: false,
        lastAccess: {
          forkId: 0,
          turnNumber: 0,
          timestamp: expect.any(Number),
        },
      },
    });
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

    expect(harness.getState().character.skills[0].highlight).toBe(false);
    expect(harness.getState().character.skills[1].highlight).toBe(true);
    expect(
      harness.getState().uiState.entityPresentation?.[
        "characterSkills:skill:stealth"
      ],
    ).toMatchObject({
      highlight: false,
      lastAccess: {
        forkId: 0,
        turnNumber: 0,
        timestamp: expect.any(Number),
      },
    });
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
      uiState: {
        entityPresentation: {
          "characterTraits:trait:shadow": { highlight: true },
        },
      },
    });

    harness.actions.clearHighlight({
      kind: "characterTraits",
      name: "Destined",
    });

    expect(harness.getState().character.hiddenTraits[0].highlight).toBe(false);
    expect(harness.getState().character.hiddenTraits[1].highlight).toBe(true);
    expect(harness.getState().uiState.entityPresentation).toMatchObject({
      "characterTraits:trait:shadow": { highlight: true },
    });
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

    expect(harness.triggerSave).toHaveBeenCalledTimes(1);
  });
});
