import { describe, it, expect } from "vitest";
import type { VfsFileMap } from "../types";
import { hashContent } from "../utils";
import { deriveGameStateFromVfs } from "../derivations";

const makeJsonFile = (path: string, data: unknown) => {
  const content = JSON.stringify(data);
  return {
    path,
    content,
    contentType: "application/json" as const,
    hash: hashContent(content),
    size: content.length,
    updatedAt: 0,
  };
};

describe("deriveGameStateFromVfs", () => {
  it("derives global, actors, and player inventory state", () => {
    const files: VfsFileMap = {
      "world/global.json": makeJsonFile("world/global.json", {
        time: "Day 2, 10:00",
        theme: "wuxia",
        currentLocation: "loc:inn",
        atmosphere: { envTheme: "wuxia", ambience: "rainy" },
        turnNumber: 3,
        forkId: 1,
      }),
      "world/characters/char:player/profile.json": makeJsonFile(
        "world/characters/char:player/profile.json",
        {
          id: "char:player",
          kind: "player",
          currentLocation: "loc:inn",
          knownBy: ["char:player"],
          visible: {
            name: "Arin",
            title: "Wanderer",
            status: "Healthy",
            attributes: [],
            appearance: "Travel-worn",
            age: "21",
            profession: "Scout",
            background: "Raised on the frontier.",
            race: "Human Male",
          },
          relations: [],
        },
      ),
      "world/characters/char:player/inventory/inv_key.json": makeJsonFile(
        "world/characters/char:player/inventory/inv_key.json",
        {
          id: "inv_key",
          knownBy: ["char:player"],
          name: "Rusty Key",
          visible: {
            description: "A rusted iron key.",
          },
        },
      ),
    };

    const state = deriveGameStateFromVfs(files);

    expect(state.time).toBe("Day 2, 10:00");
    expect(state.theme).toBe("wuxia");
    expect(state.currentLocation).toBe("loc:inn");
    expect(state.atmosphere).toEqual({ envTheme: "wuxia", ambience: "rainy" });
    expect(state.turnNumber).toBe(3);
    expect(state.forkId).toBe(1);
    expect(state.character.name).toBe("Arin");
    expect(state.character.skills).toEqual([]);
    expect(state.character.conditions).toEqual([]);
    expect(state.inventory).toHaveLength(1);
    expect(state.inventory[0]?.id).toBe("inv_key");
    expect(state.actors).toHaveLength(1);
  });

  it("throws on legacy world/character.json saves", () => {
    const files: VfsFileMap = {
      "world/character.json": makeJsonFile("world/character.json", {
        name: "Legacy Hero",
      }),
    };

    expect(() => deriveGameStateFromVfs(files)).toThrow(/SAVE_INCOMPATIBLE_LAYOUT/);
  });

  it("derives summary state and restores summary markers", () => {
    const summary = {
      id: 0,
      displayText: "Summary",
      visible: {
        narrative: "Visible summary",
        majorEvents: [],
        characterDevelopment: "Growth",
        worldState: "World",
      },
      hidden: {
        truthNarrative: "Truth",
        hiddenPlots: [],
        npcActions: [],
        worldTruth: "Truth world",
        unrevealed: [],
      },
      timeRange: { from: "t1", to: "t2" },
      nodeRange: { fromIndex: 0, toIndex: 2 },
    };

    const files: VfsFileMap = {
      "summary/state.json": makeJsonFile("summary/state.json", {
        summaries: [summary],
        lastSummarizedIndex: 3,
      }),
      "current/conversation/index.json": makeJsonFile(
        "current/conversation/index.json",
        {
          activeForkId: 0,
          activeTurnId: "fork-0/turn-1",
          rootTurnIdByFork: { "0": "fork-0/turn-0" },
          latestTurnNumberByFork: { "0": 1 },
          turnOrderByFork: { "0": ["fork-0/turn-0", "fork-0/turn-1"] },
        },
      ),
      "current/conversation/turns/fork-0/turn-0.json": makeJsonFile(
        "current/conversation/turns/fork-0/turn-0.json",
        {
          turnId: "fork-0/turn-0",
          forkId: 0,
          turnNumber: 0,
          parentTurnId: null,
          createdAt: 1,
          userAction: "start",
          assistant: { narrative: "hello", choices: [] },
        },
      ),
      "current/conversation/turns/fork-0/turn-1.json": makeJsonFile(
        "current/conversation/turns/fork-0/turn-1.json",
        {
          turnId: "fork-0/turn-1",
          forkId: 0,
          turnNumber: 1,
          parentTurnId: "fork-0/turn-0",
          createdAt: 2,
          userAction: "go",
          assistant: { narrative: "ok", choices: [] },
        },
      ),
    };

    const state = deriveGameStateFromVfs(files);

    expect(state.summaries).toHaveLength(1);
    expect(state.lastSummarizedIndex).toBe(3);

    // Summary toIndex=2 => marker prefers segmentIdx=3 (the model node for turn-1).
    expect(state.nodes["model-fork-0/turn-1"]?.summarySnapshot?.displayText).toBe(
      "Summary",
    );
  });

  it("derives conversation nodes from turn files", () => {
    const files: VfsFileMap = {
      "current/conversation/index.json": makeJsonFile(
        "current/conversation/index.json",
        {
          activeForkId: 0,
          activeTurnId: "fork-0/turn-1",
          rootTurnIdByFork: { "0": "fork-0/turn-0" },
          latestTurnNumberByFork: { "0": 1 },
          turnOrderByFork: { "0": ["fork-0/turn-0", "fork-0/turn-1"] },
        },
      ),
      "current/conversation/turns/fork-0/turn-0.json": makeJsonFile(
        "current/conversation/turns/fork-0/turn-0.json",
        {
          turnId: "fork-0/turn-0",
          forkId: 0,
          turnNumber: 0,
          parentTurnId: null,
          createdAt: 1,
          userAction: "start",
          assistant: { narrative: "hello", choices: [] },
        },
      ),
      "current/conversation/turns/fork-0/turn-1.json": makeJsonFile(
        "current/conversation/turns/fork-0/turn-1.json",
        {
          turnId: "fork-0/turn-1",
          forkId: 0,
          turnNumber: 1,
          parentTurnId: "fork-0/turn-0",
          createdAt: 2,
          userAction: "go",
          assistant: { narrative: "ok", choices: [] },
        },
      ),
    };

    const state = deriveGameStateFromVfs(files);

    expect(state.activeNodeId).toContain("fork-0/turn-1");
    expect(state.currentFork.length).toBeGreaterThan(0);
  });

  it("derives outline progress and outline data", () => {
    const files: VfsFileMap = {
      "current/outline/progress.json": makeJsonFile(
        "current/outline/progress.json",
        {
          conversation: {
            theme: "fantasy",
            language: "en",
            customContext: "test",
            conversationHistory: [],
            partial: {},
            currentPhase: 3,
          },
          savedAt: 10,
        },
      ),
      "current/outline/outline.json": makeJsonFile(
        "current/outline/outline.json",
        {
          title: "Outline Title",
          premise: "Outline premise.",
        },
      ),
    };

    const state = deriveGameStateFromVfs(files);

    expect(state.outlineConversation?.currentPhase).toBe(3);
    expect(state.outline?.title).toBe("Outline Title");
    expect(state.language).toBe("en");
    expect(state.customContext).toBe("test");
  });

  it("omits empty user nodes for root turns", () => {
    const files: VfsFileMap = {
      "current/conversation/index.json": makeJsonFile(
        "current/conversation/index.json",
        {
          activeForkId: 0,
          activeTurnId: "fork-0/turn-0",
          rootTurnIdByFork: { "0": "fork-0/turn-0" },
          latestTurnNumberByFork: { "0": 0 },
          turnOrderByFork: { "0": ["fork-0/turn-0"] },
        },
      ),
      "current/conversation/turns/fork-0/turn-0.json": makeJsonFile(
        "current/conversation/turns/fork-0/turn-0.json",
        {
          turnId: "fork-0/turn-0",
          forkId: 0,
          turnNumber: 0,
          parentTurnId: null,
          createdAt: 1,
          userAction: "",
          assistant: { narrative: "hello", choices: [] },
        },
      ),
    };

    const state = deriveGameStateFromVfs(files);

    const hasEmptyUser = Object.values(state.nodes).some(
      (node) => node.role === "user" && node.text.trim() === "",
    );
    expect(hasEmptyUser).toBe(false);
    expect(state.nodes["model-fork-0/turn-0"]).toBeTruthy();
  });
});
