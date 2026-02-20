import { describe, it, expect, vi } from "vitest";
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

const makeMarkdownFile = (path: string, content: string) => ({
  path,
  content,
  contentType: "text/markdown" as const,
  hash: hashContent(content),
  size: content.length,
  updatedAt: 0,
});

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
        presetProfile: {
          narrativeStylePreset: "cinematic",
          worldDispositionPreset: "mixed",
          playerMalicePreset: "manipulation",
          playerMaliceIntensity: "heavy",
          locked: true,
        },
        initialPrompt: "Begin.",
      }),
      "world/theme_config.json": makeJsonFile("world/theme_config.json", {
        name: "Wuxia",
        narrativeStyle: "test style",
        worldSetting: "test world",
        backgroundTemplate: "test bg",
        example: "test example",
        isRestricted: false,
      }),
      "custom_rules/00-core/RULES.md": makeMarkdownFile(
        "custom_rules/00-core/RULES.md",
        [
          "## What This Category Is",
          "Core continuity constraints.",
          "",
          "## When This Category Applies",
          "Whenever continuity conflicts appear.",
          "",
          "## Specific Rules",
          "- Do X",
        ].join("\n"),
      ),
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
            gender: "Male",
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
    expect(state.initialPrompt).toBe("Begin.");
    expect(state.presetProfile).toEqual({
      narrativeStylePreset: "cinematic",
      worldDispositionPreset: "mixed",
      playerMalicePreset: "manipulation",
      playerMaliceIntensity: "heavy",
      locked: true,
    });
    expect(state.themeConfig?.name).toBe("Wuxia");
    expect(state.customRules).toHaveLength(1);
    expect(state.character.name).toBe("Arin");
    expect(state.character.age).toBe("21");
    expect(state.character.gender).toBe("Male");
    expect(state.character.race).toBe("Human");
    expect(state.character.age).not.toBe("Unknown");
    expect(state.character.race).not.toBe("Unknown");
    expect(state.character.skills).toEqual([]);
    expect(state.character.conditions).toEqual([]);
    expect(state.inventory).toHaveLength(1);
    expect(state.inventory[0]?.id).toBe("inv_key");
    expect(state.actors).toHaveLength(1);
  });

  it("does not synthesize 'Unknown' for missing player age/race/gender", () => {
    const files: VfsFileMap = {
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
            profession: "Scout",
            background: "Raised on the frontier.",
          },
          relations: [],
        },
      ),
    };

    const state = deriveGameStateFromVfs(files);

    expect(state.character.age).toBe("");
    expect(state.character.race).toBe("");
    expect(state.character.gender).toBe("");
    expect(state.character.age).not.toBe("Unknown");
    expect(state.character.race).not.toBe("Unknown");
    expect(state.character.gender).not.toBe("Unknown");
  });

  it("falls back to root-level player profile fields when visible fields are missing", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const files: VfsFileMap = {
        "world/characters/char:player/profile.json": makeJsonFile(
          "world/characters/char:player/profile.json",
          {
            id: "char:player",
            kind: "player",
            currentLocation: "loc:inn",
            knownBy: ["char:player"],
            age: "26",
            race: "Elf Female",
            profession: "Ranger",
            background: "Raised by forest wardens.",
            title: "Scout Captain",
            visible: {
              name: "Arin",
              status: "Healthy",
              attributes: [],
              appearance: "Travel-worn",
            },
            relations: [],
          },
        ),
      };

      const state = deriveGameStateFromVfs(files);

      expect(state.character.age).toBe("26");
      expect(state.character.race).toBe("Elf");
      expect(state.character.gender).toBe("Female");
      expect(state.character.profession).toBe("Ranger");
      expect(state.character.background).toBe("Raised by forest wardens.");
      expect(state.character.title).toBe("Scout Captain");
      expect(warnSpy).not.toHaveBeenCalledWith(
        "[VFS] Player required field missing: age",
        expect.anything(),
      );
      expect(warnSpy).not.toHaveBeenCalledWith(
        "[VFS] Player required field missing: race",
        expect.anything(),
      );
      expect(warnSpy).not.toHaveBeenCalledWith(
        "[VFS] Player required field missing: gender",
        expect.anything(),
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("infers gender from legacy combined chinese race strings without rewriting files", () => {
    const files: VfsFileMap = {
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
            age: "26",
            profession: "Scout",
            background: "Raised in borderlands.",
            race: "人类男性",
          },
          relations: [],
        },
      ),
    };

    const state = deriveGameStateFromVfs(files);

    expect(state.character.race).toBe("人类");
    expect(state.character.gender).toBe("男性");
  });

  it("throws on legacy world/character.json saves", () => {
    const files: VfsFileMap = {
      "world/character.json": makeJsonFile("world/character.json", {
        name: "Legacy Hero",
      }),
    };

    expect(() => deriveGameStateFromVfs(files)).toThrow(
      /SAVE_INCOMPATIBLE_LAYOUT/,
    );
  });

  it("throws on legacy world/placeholders saves", () => {
    const files: VfsFileMap = {
      "world/placeholders/ph:legacy.json": makeJsonFile(
        "world/placeholders/ph:legacy.json",
        {
          id: "ph:legacy",
          label: "Legacy Placeholder",
          knownBy: ["char:player"],
          visible: { description: "legacy" },
        },
      ),
    };

    expect(() => deriveGameStateFromVfs(files)).toThrow(
      /SAVE_INCOMPATIBLE_LAYOUT/,
    );
  });

  it("derives placeholder drafts from markdown files under world/placeholders", () => {
    const files: VfsFileMap = {
      "world/placeholders/ph:clockmaker.md": makeMarkdownFile(
        "world/placeholders/ph:clockmaker.md",
        [
          "# Placeholder Draft",
          "",
          "- id: ph:clockmaker",
          "- label: [Clockmaker]",
          "- knownBy: char:player, char:npc_guard",
          "",
          "## Notes",
          "An artisan rumored to keep illegal ledgers.",
          "",
        ].join("\n"),
      ),
      "world/placeholders/README.md": makeMarkdownFile(
        "world/placeholders/README.md",
        "# Placeholder Drafts",
      ),
    };

    const state = deriveGameStateFromVfs(files);

    expect(state.placeholders).toEqual([
      {
        id: "ph:clockmaker",
        label: "[Clockmaker]",
        knownBy: ["char:player", "char:npc_guard"],
        visible: {
          description: "An artisan rumored to keep illegal ledgers.",
        },
      },
    ]);
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
          assistant: {
            narrative: "ok",
            choices: [],
            usage: {
              promptTokens: 321,
              completionTokens: 123,
              totalTokens: 444,
              reported: true,
            },
          },
        },
      ),
    };

    const state = deriveGameStateFromVfs(files);

    expect(state.summaries).toHaveLength(1);
    expect(state.lastSummarizedIndex).toBe(3);

    // Summary toIndex=2 => marker prefers segmentIdx=3 (the model node for turn-1).
    expect(
      state.nodes["model-fork-0/turn-1"]?.summarySnapshot?.displayText,
    ).toBe("Summary");
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
          assistant: {
            narrative: "ok",
            choices: [],
            usage: {
              promptTokens: 321,
              completionTokens: 123,
              totalTokens: 444,
              reported: true,
            },
          },
        },
      ),
    };

    const state = deriveGameStateFromVfs(files);

    expect(state.activeNodeId).toContain("fork-0/turn-1");
    expect(state.currentFork.length).toBeGreaterThan(0);
    expect(state.nodes["model-fork-0/turn-1"]?.usage).toMatchObject({
      promptTokens: 321,
      completionTokens: 123,
      totalTokens: 444,
      reported: true,
    });
  });

  it("derives outline progress and outline data", () => {
    const files: VfsFileMap = {
      "current/outline/progress.json": makeJsonFile(
        "current/outline/progress.json",
        {
          conversation: {
            theme: "cyberpunk",
            language: "en",
            customContext: "test",
            conversationHistory: [],
            partial: {},
            currentPhaseId: "player_actor",
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

    expect(state.outlineConversation?.currentPhaseId).toBe("player_actor");
    expect(state.outline?.title).toBe("Outline Title");
    expect(state.theme).toBe("cyberpunk");
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

  it("does not map workspace memory docs onto legacy settings.playerProfile", () => {
    const files: VfsFileMap = {
      "workspace/SOUL.md": makeMarkdownFile(
        "workspace/SOUL.md",
        "# Player Soul (This Save)\n\n- Scope: This Save\n",
      ),
      "workspace/USER.md": makeMarkdownFile(
        "workspace/USER.md",
        "# Player Soul (Global)\n\n- Scope: Global\n",
      ),
    };

    const state = deriveGameStateFromVfs(files);
    expect((state as any).playerProfile).toBeUndefined();
  });

  it("throws on legacy world/player_profile.json saves", () => {
    const files: VfsFileMap = {
      "world/player_profile.json": makeJsonFile("world/player_profile.json", {
        profile: "Player prefers terse, low-AI-voice narration.",
      }),
    };

    expect(() => deriveGameStateFromVfs(files)).toThrow(
      /SAVE_INCOMPATIBLE_LAYOUT/,
    );
  });

  it("restores turn.meta.playerRate into model nodes", () => {
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
          userAction: "start",
          assistant: { narrative: "hello", choices: [] },
          meta: {
            playerRate: {
              vote: "down",
              preset: "Too much AI flavor",
              comment: "keep it tighter",
              createdAt: 123,
              processedAt: 456,
            },
          },
        },
      ),
    };

    const state = deriveGameStateFromVfs(files);
    expect(state.nodes["model-fork-0/turn-0"]?.playerRate).toEqual({
      vote: "down",
      preset: "Too much AI flavor",
      comment: "keep it tighter",
      createdAt: 123,
      processedAt: 456,
    });
  });

  it("derives knownBy observers from non-player world views while keeping unlock player-scoped", () => {
    const files: VfsFileMap = {
      "world/characters/char:player/profile.json": makeJsonFile(
        "world/characters/char:player/profile.json",
        {
          id: "char:player",
          kind: "player",
          currentLocation: "loc:inn",
          knownBy: ["char:player"],
          visible: { name: "Player", attributes: [] },
          relations: [],
        },
      ),
      "world/characters/char:npc_guard/profile.json": makeJsonFile(
        "world/characters/char:npc_guard/profile.json",
        {
          id: "char:npc_guard",
          kind: "npc",
          currentLocation: "loc:inn",
          knownBy: ["char:player", "char:npc_guard"],
          visible: { name: "Guard", attributes: [] },
          relations: [],
        },
      ),
      "world/knowledge/lore_blackmail.json": makeJsonFile(
        "world/knowledge/lore_blackmail.json",
        {
          id: "lore_blackmail",
          knownBy: ["char:player"],
          title: "Blackmail Ledger",
          visible: { summary: "A suspicious ledger exists." },
          hidden: { fullTruth: "It implicates the guard captain." },
        },
      ),
      "world/characters/char:npc_guard/views/knowledge/lore_blackmail.json":
        makeJsonFile(
          "world/characters/char:npc_guard/views/knowledge/lore_blackmail.json",
          {
            entityId: "lore_blackmail",
            unlocked: true,
            unlockReason: "Guard reviewed the ledger directly.",
          },
        ),
    };

    const state = deriveGameStateFromVfs(files);
    const lore = state.knowledge.find((entry) => entry.id === "lore_blackmail");
    expect(lore).toBeTruthy();
    expect(lore?.knownBy).toContain("char:npc_guard");
    expect(lore?.unlocked).toBe(false);
  });

  it("auto-repairs unlocked=>knownBy for actor-owned entities and prevents NPC-only unlock leakage in npcs view", () => {
    const files: VfsFileMap = {
      "world/characters/char:player/profile.json": makeJsonFile(
        "world/characters/char:player/profile.json",
        {
          id: "char:player",
          kind: "player",
          currentLocation: "loc:inn",
          knownBy: ["char:player"],
          visible: { name: "Player", attributes: [] },
          relations: [],
        },
      ),
      "world/characters/char:npc_1/profile.json": makeJsonFile(
        "world/characters/char:npc_1/profile.json",
        {
          id: "char:npc_1",
          kind: "npc",
          currentLocation: "loc:inn",
          knownBy: [],
          unlocked: true,
          unlockReason: "NPC-only knowledge",
          visible: { name: "Watcher", attributes: [] },
          relations: [
            {
              id: "rel:attitude-1",
              kind: "attitude",
              to: { kind: "character", id: "char:player" },
              knownBy: [],
              unlocked: true,
              unlockReason: "NPC-only relation unlock",
              visible: { signals: ["Cold smile"] },
              hidden: { affinity: 60 },
            },
          ],
        },
      ),
    };

    const state = deriveGameStateFromVfs(files);
    const npcBundle = state.actors.find(
      (bundle) => bundle.profile.id === "char:npc_1",
    );
    expect(npcBundle).toBeTruthy();
    expect(npcBundle?.profile.knownBy).toContain("char:npc_1");
    const repairedRelation = npcBundle?.profile.relations?.[0] as
      | { knownBy?: string[] }
      | undefined;
    expect(repairedRelation?.knownBy).toContain("char:npc_1");

    const projectedNpc = state.npcs.find((npc) => npc.id === "char:npc_1");
    expect(projectedNpc).toBeTruthy();
    expect(projectedNpc?.unlocked).toBe(false);
    const projectedRelation = projectedNpc?.relations?.[0] as
      | { unlocked?: boolean; unlockReason?: string }
      | undefined;
    expect(projectedRelation?.unlocked).toBe(false);
    expect(projectedRelation?.unlockReason).toBeUndefined();
  });
});
