import { describe, it, expect } from "vitest";
import { VfsSession } from "../vfsSession";
import {
  seedVfsSessionFromDefaults,
  seedVfsSessionFromGameState,
  seedVfsSessionFromOutline,
} from "../seed";

describe("seedVfsSessionFromDefaults", () => {
  it("seeds world + conversation index/turn 0", () => {
    const session = new VfsSession();
    seedVfsSessionFromDefaults(session);

    expect(session.readFile("world/global.json")).toBeTruthy();
    expect(session.readFile("world/notes.md")).toBeTruthy();
    expect(session.readFile("world/soul.md")).toBeTruthy();
    expect(session.readFile("world/global/soul.md")).toBeTruthy();
    expect(session.readFile("conversation/index.json")).toBeTruthy();
    expect(
      session.readFile("conversation/turns/fork-0/turn-0.json"),
    ).toBeTruthy();

    const notes = session.readFile("world/notes.md")?.content ?? "";
    const currentSoul = session.readFile("world/soul.md")?.content ?? "";
    const globalSoul = session.readFile("world/global/soul.md")?.content ?? "";
    const playerProfile = JSON.parse(
      session.readFile("world/characters/char:player/profile.json")?.content ??
        "{}",
    ) as {
      visible?: {
        age?: string;
        profession?: string;
        background?: string;
        race?: string;
      };
    };
    expect(notes).toContain("Story Teller AI");
    expect(currentSoul).toContain("Story Teller AI");
    expect(globalSoul).toContain("Story Teller AI");
    expect(playerProfile.visible?.age).toBe("Unspecified");
    expect(playerProfile.visible?.profession).toBe("Unspecified");
    expect(playerProfile.visible?.background).toBe("Unspecified");
    expect(playerProfile.visible?.race).toBe("Unspecified");
  });

  it("keeps scaffold folders and README markers on repeated seed", () => {
    const session = new VfsSession();

    seedVfsSessionFromDefaults(session);
    const firstCount = Object.keys(session.snapshot()).length;
    seedVfsSessionFromDefaults(session);
    const secondCount = Object.keys(session.snapshot()).length;

    expect(session.readFile("world/characters/README.md")).toBeTruthy();
    expect(session.readFile("world/locations/README.md")).toBeTruthy();
    expect(session.readFile("world/causal_chains/README.md")).toBeTruthy();
    expect(session.readFile("custom_rules/README.md")).toBeTruthy();
    expect(
      session.readFile("custom_rules/00-system-core/README.md"),
    ).toBeTruthy();
    expect(session.readFile("custom_rules/12-custom/README.md")).toBeTruthy();
    expect(session.readFile("custom_rules/00-system-core/RULES.md")).toBeNull();
    expect(secondCount).toBe(firstCount);
  });

  it("strips view/UI fields from canonical world files when seeding from game state", () => {
    const session = new VfsSession();

    seedVfsSessionFromGameState(session, {
      forkId: 0,
      turnNumber: 1,
      theme: "fantasy",
      time: "Day 1, 08:00",
      currentLocation: "loc:town",
      atmosphere: { envTheme: "fantasy", ambience: "quiet" },
      language: "zh",
      summaries: [],
      lastSummarizedIndex: 0,
      actors: [],
      playerActorId: "char:player",
      worldInfo: {
        title: "Demo",
        premise: "Test",
        worldSetting: {
          visible: { description: "Visible", rules: "Rules" },
          hidden: { hiddenRules: "Hidden", secrets: ["s"] },
          history: "History",
        },
        mainGoal: {
          visible: { description: "Goal", conditions: "cond" },
          hidden: { trueDescription: "True goal", trueConditions: "true cond" },
        },
        worldSettingUnlocked: true,
        worldSettingUnlockReason: "view-only",
        mainGoalUnlocked: true,
        mainGoalUnlockReason: "view-only",
        highlight: true,
        lastAccess: { forkId: 0, turnNumber: 1, timestamp: 1 },
      },
      quests: [
        {
          id: "quest:1",
          knownBy: ["char:player"],
          title: "Quest",
          type: "main",
          visible: { description: "q", objectives: ["o"] },
          hidden: {
            trueDescription: "hq",
            trueObjectives: ["ho"],
            secretOutcome: "secret",
            twist: "twist",
          },
          unlocked: true,
          unlockReason: "view",
          status: "active",
          highlight: true,
          lastAccess: { forkId: 0, turnNumber: 1, timestamp: 2 },
        },
      ],
      locations: [
        {
          id: "loc:town",
          knownBy: ["char:player"],
          name: "Town",
          visible: { description: "Town", knownFeatures: ["Gate"] },
          hidden: { fullDescription: "Hidden town" },
          unlocked: true,
          unlockReason: "view",
          isVisited: true,
          visitedCount: 2,
          discoveredAt: "Day 1",
          highlight: true,
          lastAccess: { forkId: 0, turnNumber: 1, timestamp: 3 },
        },
      ],
      knowledge: [],
      factions: [],
      timeline: [],
      placeholders: [
        {
          id: "ph:clockmaker",
          label: "[Clockmaker]",
          knownBy: ["char:player"],
          visible: { description: "An unnamed artisan in the market." },
          unlocked: true,
          unlockReason: "ui-only",
          highlight: true,
          lastAccess: { forkId: 0, turnNumber: 1, timestamp: 4 },
        },
      ],
      locationItemsByLocationId: {},
      causalChains: [],
      nodes: {},
      activeNodeId: null,
      rootNodeId: null,
      currentFork: [],
      inventory: [],
      npcs: [],
      character: {} as any,
      uiState: {
        inventory: { pinnedIds: [], customOrder: [] },
        locations: { pinnedIds: [], customOrder: [] },
        npcs: { pinnedIds: [], customOrder: [] },
        knowledge: { pinnedIds: [], customOrder: [] },
        quests: { pinnedIds: [], customOrder: [] },
      },
      outline: null,
      isProcessing: false,
      isImageGenerating: false,
      generatingNodeId: null,
      error: null,
      tokenUsage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
      logs: [],
      timelineEvents: [],
      forkTree: { nodes: {}, nextForkId: 1 },
      customRules: [],
    } as any);

    const worldInfo = JSON.parse(
      session.readFile("world/world_info.json")?.content ?? "{}",
    ) as Record<string, unknown>;
    expect(worldInfo.worldSettingUnlocked).toBeUndefined();
    expect(worldInfo.worldSettingUnlockReason).toBeUndefined();
    expect(worldInfo.mainGoalUnlocked).toBeUndefined();
    expect(worldInfo.mainGoalUnlockReason).toBeUndefined();
    expect(worldInfo.highlight).toBeUndefined();
    expect(worldInfo.lastAccess).toBeUndefined();

    const location = JSON.parse(
      session.readFile("world/locations/loc:town.json")?.content ?? "{}",
    ) as Record<string, unknown>;
    expect(location.unlocked).toBeUndefined();
    expect(location.unlockReason).toBeUndefined();
    expect(location.isVisited).toBeUndefined();
    expect(location.visitedCount).toBeUndefined();
    expect(location.highlight).toBeUndefined();
    expect(location.lastAccess).toBeUndefined();

    const locationView = JSON.parse(
      session.readFile(
        "world/characters/char:player/views/locations/loc:town.json",
      )?.content ?? "{}",
    ) as Record<string, unknown>;
    expect(locationView.unlocked).toBe(true);
    expect(locationView.isVisited).toBe(true);
    expect(locationView.highlight).toBeUndefined();

    expect(
      session.readFile("world/placeholders/ph:clockmaker.json"),
    ).toBeNull();

    const placeholderDraft =
      session.readFile("world/placeholders/ph:clockmaker.md")?.content ?? "";
    expect(placeholderDraft).toContain("# Placeholder Draft");
    expect(placeholderDraft).toContain("- id: ph:clockmaker");
  });

  it("strips view/UI fields from canonical outline world collections when seeding from outline", () => {
    const session = new VfsSession();

    seedVfsSessionFromOutline(
      session,
      {
        title: "Outline",
        initialTime: "Day 1",
        premise: "Premise",
        worldSetting: {
          visible: { description: "Visible" },
          hidden: { truth: "Hidden" },
        },
        mainGoal: {
          visible: { objective: "Goal", stakes: "Stakes", urgency: "Urgent" },
          hidden: { trueObjective: "True goal" },
        },
        player: {
          profile: {
            id: "char:player",
            kind: "player",
            visible: { name: "Hero" },
            relations: [],
            currentLocation: "loc:town",
          },
          skills: [],
          conditions: [],
          traits: [],
          inventory: [],
        },
        npcs: [],
        placeholders: [
          {
            path: "world/placeholders/ph:buried_archive.md",
            markdown: [
              "# Placeholder Draft",
              "",
              "- id: ph:buried_archive",
              "- label: [Buried Archive]",
              "- knownBy: char:player",
              "",
              "## Notes",
              "A rumor about hidden records.",
            ].join("\n"),
          },
        ],
        locations: [
          {
            id: "loc:town",
            knownBy: ["char:player"],
            name: "Town",
            visible: { description: "Town", knownFeatures: [] },
            hidden: { fullDescription: "Hidden town" },
            unlocked: true,
            unlockReason: "view",
            isVisited: true,
            visitedCount: 2,
            highlight: true,
            lastAccess: { forkId: 0, turnNumber: 0, timestamp: 1 },
          } as any,
        ],
        factions: [],
        quests: [],
        knowledge: [],
        timeline: [],
        openingNarrative: {
          narrative: "Start",
          choices: [{ text: "Go" }],
        },
      } as any,
      {
        theme: "fantasy",
        time: "Day 1, 08:00",
        currentLocation: "loc:town",
        atmosphere: { envTheme: "fantasy", ambience: "quiet" },
      },
    );

    const location = JSON.parse(
      session.readFile("world/locations/loc:town.json")?.content ?? "{}",
    ) as Record<string, unknown>;
    expect(location.unlocked).toBeUndefined();
    expect(location.unlockReason).toBeUndefined();
    expect(location.isVisited).toBeUndefined();
    expect(location.visitedCount).toBeUndefined();
    expect(location.highlight).toBeUndefined();
    expect(location.lastAccess).toBeUndefined();

    expect(
      session.readFile("world/placeholders/ph:buried_archive.json"),
    ).toBeNull();

    const placeholderDraft =
      session.readFile("world/placeholders/ph:buried_archive.md")?.content ??
      "";
    expect(placeholderDraft).toContain("# Placeholder Draft");
    expect(placeholderDraft).toContain("- id: ph:buried_archive");
  });
});
