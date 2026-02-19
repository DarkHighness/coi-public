import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { StorySegment } from "../../types";

const createStateSnapshotMock = vi.hoisted(() => vi.fn(() => ({ snap: true })));
const normalizeAtmosphereMock = vi.hoisted(() =>
  vi.fn((value: any) => value ?? { envTheme: "fantasy", ambience: "quiet" }),
);
const getThemeNameMock = vi.hoisted(() => vi.fn(() => "Fantasy Name"));

vi.mock("../../utils/snapshotManager", () => ({
  createStateSnapshot: createStateSnapshotMock,
}));

vi.mock("../../utils/constants/atmosphere", () => ({
  normalizeAtmosphere: normalizeAtmosphereMock,
}));

vi.mock("../../utils/themeLabels", () => ({
  getThemeName: getThemeNameMock,
}));

import {
  applyOpeningNarrativeState,
  buildOpeningNarrativeSegment,
  buildOutlineHydratedState,
  calculateAccumulatedTokens,
} from "./outlineHydration";

describe("outlineHydration builders", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-02T03:04:05.000Z"));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("accumulates token usage from logs with partial usage payloads", () => {
    const totals = calculateAccumulatedTokens([
      {
        usage: {
          promptTokens: 12,
          completionTokens: 8,
          totalTokens: 20,
          cacheRead: 2,
          cacheWrite: 1,
        },
      },
      {
        usage: {
          promptTokens: 3,
          totalTokens: 3,
        },
      },
      {},
    ]);

    expect(totals).toEqual({
      promptTokens: 15,
      completionTokens: 8,
      totalTokens: 23,
      cacheRead: 2,
      cacheWrite: 1,
    });
  });

  it("hydrates game state from outline and applies optional overrides", () => {
    const baseState = {
      character: {
        name: "Base Name",
        title: "Base Title",
        status: "Base Status",
        appearance: "Base Appearance",
        age: "19",
        profession: "Scribe",
        background: "Village",
        race: "Human",
      },
      currentLocation: "loc:base",
      logs: [{ id: "old-log" }],
      tokenUsage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
        cacheRead: 1,
        cacheWrite: 2,
      },
      uiState: { panel: "left" },
      liveToolCalls: [{ name: "stale-call" }],
    } as any;

    const outline = {
      title: "Outline Title",
      premise: "Premise",
      narrativeScale: "regional",
      worldSetting: "World",
      mainGoal: "Goal",
      initialAtmosphere: { envTheme: "rainy", ambience: "storm" },
      initialTime: "Night 1",
      player: {
        profile: {
          id: "char:hero",
          visible: {
            name: "Hero",
            title: "Champion",
            status: "Ready",
            attributes: ["brave"],
            appearance: "Armored",
            age: "24",
            profession: "Knight",
            background: "Castle",
            race: "Elf",
          },
          currentLocation: "loc:start",
        },
        inventory: [{ id: "item-1", name: "Sword" }],
        skills: [{ id: "skill-1", name: "Slash" }],
        conditions: [{ id: "cond-1", name: "Focused" }],
        traits: [{ id: "trait-1", name: "Cautious" }],
      },
      npcs: [{ profile: { id: "npc-1", name: "Guide" } }],
      placeholders: [
        {
          path: "world/placeholders/ph-1.md",
          markdown: [
            "# Placeholder Draft",
            "",
            "- id: ph-1",
            "- label: [Mysterious Stranger]",
            "- knownBy: char:player",
            "",
            "## Notes",
            "Only seen in silhouette near the gate.",
          ].join("\n"),
        },
      ],
      quests: [{ id: "quest-1", title: "Find relic" }],
      locations: [
        { id: "loc:start", name: "Town" },
        { id: "loc:2", name: "Forest" },
      ],
      knowledge: [{ id: "know-1", text: "Lore" }],
      factions: [{ id: "fac-1", name: "Guild" }],
      timeline: [{ id: "event-1", title: "Arrival" }],
    } as any;

    const logs = [
      {
        id: "new-log",
        usage: {
          promptTokens: 5,
          completionTokens: 6,
          totalTokens: 11,
          cacheRead: 3,
          cacheWrite: 4,
        },
      },
    ];

    const nextState = buildOutlineHydratedState({
      baseState,
      outline,
      logs,
      themeConfig: { id: "cfg-1" } as any,
      language: "en",
      customContext: "custom",
      clearLiveToolCalls: true,
      themeOverride: "noir",
      seedImageId: "seed-9",
    });

    expect(normalizeAtmosphereMock).toHaveBeenCalledWith(
      outline.initialAtmosphere,
    );
    expect(nextState.worldInfo.title).toBe("Outline Title");
    expect(nextState.actors).toHaveLength(2);
    expect(nextState.playerActorId).toBe("char:hero");
    expect(nextState.character.name).toBe("Hero");
    expect(nextState.currentLocation).toBe("loc:start");
    expect(nextState.inventory[0]).toMatchObject({
      id: "item-1",
      createdAt: Date.now(),
      lastModified: Date.now(),
    });
    expect(nextState.quests[0]).toMatchObject({
      id: "quest-1",
      status: "active",
      createdAt: Date.now(),
      lastModified: Date.now(),
    });
    expect(nextState.locations[0].isVisited).toBe(true);
    expect(nextState.locations[1].isVisited).toBe(false);
    expect(nextState.placeholders[0]).toMatchObject({
      id: "ph-1",
      label: "[Mysterious Stranger]",
      knownBy: ["char:player"],
    });
    expect(nextState.logs.map((log: any) => log.id)).toEqual([
      "new-log",
      "old-log",
    ]);
    expect(nextState.tokenUsage).toEqual({
      promptTokens: 15,
      completionTokens: 26,
      totalTokens: 41,
      cacheRead: 4,
      cacheWrite: 6,
    });
    expect(nextState.theme).toBe("noir");
    expect(nextState.seedImageId).toBe("seed-9");
    expect(nextState.liveToolCalls).toEqual([]);
    expect(nextState.customContext).toBe("custom");
  });

  it("builds opening segment and fallback prompt with optional custom context", () => {
    const baseState = {
      currentLocation: "loc:base",
      uiState: { mapOpen: true },
      character: { name: "Base" },
    } as any;

    const outline = {
      initialAtmosphere: { envTheme: "mist", ambience: "calm" },
      initialTime: "Day 1",
      openingNarrative: {
        narrative: "The gate opens.",
        atmosphere: { envTheme: "mist", ambience: "calm" },
        choices: [{ text: "Enter" }, { text: "Wait", consequence: "observe" }],
      },
    } as any;

    const t = vi.fn((key: string, vars?: Record<string, unknown>) => {
      if (key === "initialPrompt.begin") {
        return `BEGIN:${String(vars?.theme)}`;
      }
      if (key === "initialPrompt.context") {
        return "CONTEXT";
      }
      return key;
    });

    const result = buildOpeningNarrativeSegment({
      outline,
      baseState,
      theme: "fantasy",
      t: t as any,
      customContext: "fog and silence",
      includeCustomContextInPrompt: true,
      seedImageId: "seed-opening",
    });

    expect(getThemeNameMock).toHaveBeenCalledWith("fantasy", t);
    expect(createStateSnapshotMock).toHaveBeenCalledWith(
      baseState,
      expect.objectContaining({
        currentLocation: "loc:base",
        time: "Day 1",
        uiState: baseState.uiState,
      }),
    );
    expect(result.firstNode).toMatchObject({
      id: "model-fork-0/turn-0",
      text: "The gate opens.",
      imageId: "seed-opening",
      role: "model",
    });
    expect(result.firstNode.choices).toEqual([
      { text: "Enter", consequence: undefined },
      { text: "Wait", consequence: "observe" },
    ]);
    expect(result.fallbackPrompt).toBe(
      "BEGIN:Fantasy Name CONTEXT: fog and silence",
    );
  });

  it("applies opening segment as root node and resets transient state", () => {
    const baseState = {
      nodes: { old: { id: "old" } },
      activeNodeId: "old",
      rootNodeId: "old",
      currentFork: [{ id: "old" }],
      liveToolCalls: [{ name: "old-call" }],
      isProcessing: true,
      initialPrompt: "old",
      turnNumber: 9,
      atmosphere: { envTheme: "old", ambience: "old" },
    } as any;

    const firstNode = {
      id: "model-fork-0/turn-0",
      text: "Opening",
    } as StorySegment;

    const nextState = applyOpeningNarrativeState(
      baseState,
      firstNode,
      { envTheme: "new", ambience: "calm" } as any,
      "new prompt",
    );

    expect(nextState.nodes).toEqual({ [firstNode.id]: firstNode });
    expect(nextState.activeNodeId).toBe(firstNode.id);
    expect(nextState.rootNodeId).toBe(firstNode.id);
    expect(nextState.currentFork).toEqual([firstNode]);
    expect(nextState.liveToolCalls).toEqual([]);
    expect(nextState.isProcessing).toBe(false);
    expect(nextState.turnNumber).toBe(0);
    expect(nextState.initialPrompt).toBe("new prompt");
    expect(nextState.atmosphere).toEqual({ envTheme: "new", ambience: "calm" });
  });
});
