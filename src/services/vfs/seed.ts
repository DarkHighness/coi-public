import type {
  AtmosphereObject,
  CausalChain,
  Faction,
  GameState,
  KnowledgeEntry,
  Location,
  Quest,
  SavePresetProfile,
  StoryOutline,
  TimelineEvent,
} from "@/types";
import { DEFAULT_CHARACTER } from "@/utils/constants";
import { VfsSession } from "./vfsSession";
import { writeConversationIndex, writeForkTree, writeTurnFile } from "./conversation";
import {
  buildCustomRulePackMarkdown,
  CUSTOM_RULES_README_CONTENT,
  CUSTOM_RULES_README_PATH,
  toCustomRulePackPath,
} from "./customRules";

const writeJson = (session: VfsSession, path: string, value: unknown) => {
  session.writeFile(path, JSON.stringify(value), "application/json");
};

const DEFAULT_SAVE_PRESET_PROFILE: SavePresetProfile = {
  narrativeStylePreset: "theme",
  worldDispositionPreset: "theme",
  playerMalicePreset: "theme",
  playerMaliceIntensity: "standard",
  locked: true,
};

const normalizePresetProfile = (
  profile: Partial<SavePresetProfile> | undefined | null,
): SavePresetProfile => ({
  narrativeStylePreset:
    profile?.narrativeStylePreset ??
    DEFAULT_SAVE_PRESET_PROFILE.narrativeStylePreset,
  worldDispositionPreset:
    profile?.worldDispositionPreset ??
    DEFAULT_SAVE_PRESET_PROFILE.worldDispositionPreset,
  playerMalicePreset:
    profile?.playerMalicePreset ??
    DEFAULT_SAVE_PRESET_PROFILE.playerMalicePreset,
  playerMaliceIntensity:
    profile?.playerMaliceIntensity ??
    DEFAULT_SAVE_PRESET_PROFILE.playerMaliceIntensity,
  locked: true,
});

const ensureGlobalNotes = (session: VfsSession): void => {
  // Notes are a flexible scratch pad (markdown).
  // Keep it empty by default; the AI may populate it when needed.
  if (!session.readFile("world/notes.md")) {
    session.writeFile("world/notes.md", "", "text/markdown");
  }
};

const ensureCustomRulesReadme = (session: VfsSession): void => {
  if (!session.readFile(CUSTOM_RULES_README_PATH)) {
    session.writeFile(
      CUSTOM_RULES_README_PATH,
      CUSTOM_RULES_README_CONTENT,
      "text/markdown",
    );
  }
};

const writeEntities = <T extends { id?: string }>(
  session: VfsSession,
  basePath: string,
  entities: T[] | undefined,
) => {
  if (!entities) {
    return;
  }
  for (const entity of entities) {
    if (!entity || !entity.id) {
      continue;
    }
    writeJson(session, `${basePath}/${entity.id}.json`, entity);
  }
};

const writeWorldInfoAndView = (
  session: VfsSession,
  worldInfo: any,
  playerActorId: string,
): void => {
  const {
    worldSettingUnlocked,
    worldSettingUnlockReason,
    mainGoalUnlocked,
    mainGoalUnlockReason,
    highlight,
    lastAccess,
    ...definition
  } = worldInfo as any;
  writeJson(session, "world/world_info.json", definition);
  writeJson(session, `world/characters/${playerActorId}/views/world_info.json`, {
    worldSettingUnlocked,
    worldSettingUnlockReason,
    mainGoalUnlocked,
    mainGoalUnlockReason,
    highlight,
    lastAccess,
  });
};

const writeQuestDefinitionAndView = (
  session: VfsSession,
  quest: any,
  playerActorId: string,
): void => {
  if (!quest?.id) return;
  const { status, unlocked, unlockReason, highlight, lastAccess, ...definition } =
    quest as any;
  writeJson(session, `world/quests/${quest.id}.json`, definition);

  const knownBy: string[] = Array.isArray(definition.knownBy) ? definition.knownBy : [];
  if (!knownBy.includes(playerActorId)) return;

  writeJson(
    session,
    `world/characters/${playerActorId}/views/quests/${quest.id}.json`,
    {
      entityId: quest.id,
      status: status ?? "active",
      unlocked,
      unlockReason,
      highlight,
      lastAccess,
      objectiveState: (quest as any).objectiveState,
      acceptedAtGameTime: (quest as any).acceptedAtGameTime,
      completedAtGameTime: (quest as any).completedAtGameTime,
    },
  );
};

const writeDefinitionAndView = (
  session: VfsSession,
  category:
    | "knowledge"
    | "timeline"
    | "locations"
    | "factions"
    | "causal_chains",
  entity: any,
  playerActorId: string,
  options?: { keyField?: string; viewExtra?: Record<string, unknown> },
): void => {
  const keyField = options?.keyField ?? "id";
  const id = entity?.[keyField];
  if (typeof id !== "string" || id.trim().length === 0) return;

  const { unlocked, unlockReason, highlight, lastAccess, ...definition } = entity as any;

  // Canonical write
  const basePath =
    category === "locations"
      ? "world/locations"
      : category === "factions"
        ? "world/factions"
        : category === "knowledge"
          ? "world/knowledge"
          : category === "timeline"
            ? "world/timeline"
            : "world/causal_chains";
  writeJson(session, `${basePath}/${id}.json`, definition);

  const knownBy: string[] = Array.isArray(definition.knownBy) ? definition.knownBy : [];
  if (!knownBy.includes(playerActorId)) return;

  // View write
  const viewBase = `world/characters/${playerActorId}/views/${category}/${id}.json`;
  const view: Record<string, unknown> = {
    entityId: id,
    unlocked,
    unlockReason,
    highlight,
    lastAccess,
    ...(options?.viewExtra ?? {}),
  };
  writeJson(session, viewBase, view);
};

const writeActorBundle = (session: VfsSession, bundle: any): void => {
  const profile = bundle?.profile;
  if (!profile || typeof profile !== "object") return;
  const actorId = (profile as any).id;
  if (typeof actorId !== "string" || actorId.trim().length === 0) return;

  const id = actorId.trim();
  writeJson(session, `world/characters/${id}/profile.json`, profile);

  const writeSub = (subPath: string, items: any[] | undefined) => {
    if (!Array.isArray(items)) return;
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const itemId = (item as any).id;
      if (typeof itemId !== "string" || itemId.trim().length === 0) continue;
      writeJson(
        session,
        `world/characters/${id}/${subPath}/${itemId.trim()}.json`,
        item,
      );
    }
  };

  writeSub("skills", bundle?.skills);
  writeSub("conditions", bundle?.conditions);
  writeSub("traits", bundle?.traits);
  writeSub("inventory", bundle?.inventory);
};

export const seedVfsSessionFromGameState = (
  session: VfsSession,
  state: GameState,
): void => {
  session.setActiveForkId(state.forkId ?? 0);
  ensureGlobalNotes(session);
  ensureCustomRulesReadme(session);

  writeJson(session, "world/global.json", {
    time: state.time,
    theme: state.theme,
    currentLocation: state.currentLocation,
    atmosphere: state.atmosphere,
    turnNumber: state.turnNumber,
    forkId: state.forkId,
    language: state.language,
    customContext: state.customContext,
    presetProfile: normalizePresetProfile(state.presetProfile),
    seedImageId: state.seedImageId,
    narrativeScale: state.narrativeScale,
    initialPrompt: state.initialPrompt,
  });

  writeJson(session, "summary/state.json", {
    summaries: state.summaries ?? [],
    lastSummarizedIndex: state.lastSummarizedIndex ?? 0,
  });

  if (state.themeConfig) {
    writeJson(session, "world/theme_config.json", state.themeConfig);
  }

  if (Array.isArray(state.customRules)) {
    for (const rule of state.customRules as any[]) {
      const id = (rule as any)?.id;
      const title = (rule as any)?.title;
      const content = (rule as any)?.content;
      const priority =
        typeof (rule as any)?.priority === "number" ? (rule as any).priority : 99;
      if (typeof id !== "string" || id.trim().length === 0) continue;

      const packPath = toCustomRulePackPath(priority, title || id);
      const markdown = buildCustomRulePackMarkdown({
        category: title || id,
        whenToApply: "Use when this category is relevant to the current scene.",
        rules:
          typeof content === "string" && content.trim().length > 0
            ? content
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter(Boolean)
            : [],
      });
      session.writeFile(packPath, markdown, "text/markdown");
    }
  }

  for (const actor of state.actors) {
    writeActorBundle(session, actor);
  }

  if (state.playerProfile) {
    writeJson(session, "world/player_profile.json", {
      profile: state.playerProfile,
    });
  }

  const playerActorId = state.playerActorId || "char:player";

  if (state.worldInfo) {
    writeWorldInfoAndView(session, state.worldInfo as any, playerActorId);
  }

  // Canonical + player views split
  for (const q of (state.quests as any[]) ?? []) {
    writeQuestDefinitionAndView(session, q, playerActorId);
  }
  for (const loc of (state.locations as any[]) ?? []) {
    writeDefinitionAndView(session, "locations", loc, playerActorId, {
      viewExtra: {
        isVisited: (loc as any).isVisited,
        visitedCount: (loc as any).visitedCount,
        discoveredAtGameTime: (loc as any).discoveredAt,
      },
    });
  }
  for (const k of (state.knowledge as any[]) ?? []) {
    writeDefinitionAndView(session, "knowledge", k, playerActorId, {
      viewExtra: {
        discoveredAtGameTime: (k as any).discoveredAt,
        beliefSummary: (k as any).beliefSummary,
      },
    });
  }
  for (const f of (state.factions as any[]) ?? []) {
    writeDefinitionAndView(session, "factions", f, playerActorId, {
      viewExtra: {
        standing: (f as any).standing,
        standingTag: (f as any).standingTag,
      },
    });
  }
  for (const e of (state.timeline as any[]) ?? []) {
    writeDefinitionAndView(session, "timeline", e, playerActorId, {
      viewExtra: {
        rememberedAs: (e as any).rememberedAs,
        suspicions: (e as any).suspicions,
      },
    });
  }

  for (const [locId, items] of Object.entries(state.locationItemsByLocationId)) {
    if (!Array.isArray(items)) continue;
    for (const item of items as any[]) {
      const id = (item as any)?.id;
      if (typeof id !== "string" || id.trim().length === 0) continue;
      writeJson(session, `world/locations/${locId}/items/${id}.json`, item);
    }
  }

  if (state.causalChains) {
    for (const chain of state.causalChains as CausalChain[]) {
      if (!chain || !chain.chainId) {
        continue;
      }
      writeDefinitionAndView(session, "causal_chains", chain, playerActorId, {
        keyField: "chainId",
        viewExtra: {
          investigationNotes: (chain as any).investigationNotes,
          linkedEventIds: (chain as any).linkedEventIds,
        },
      });
    }
  }
};

export const seedVfsSessionFromDefaults = (session: VfsSession): void => {
  ensureGlobalNotes(session);
  ensureCustomRulesReadme(session);

  writeJson(session, "world/global.json", {
    time: "Day 1, 08:00",
    theme: "fantasy",
    currentLocation: "Unknown",
    atmosphere: { envTheme: "fantasy", ambience: "quiet" },
    turnNumber: 0,
    forkId: 0,
    presetProfile: DEFAULT_SAVE_PRESET_PROFILE,
  });

  writeJson(session, "summary/state.json", {
    summaries: [],
    lastSummarizedIndex: 0,
  });

  writeActorBundle(session, {
    profile: {
      id: "char:player",
      kind: "player",
      currentLocation: "Unknown",
      knownBy: ["char:player"],
      visible: {
        name: DEFAULT_CHARACTER.name,
        title: DEFAULT_CHARACTER.title,
        status: DEFAULT_CHARACTER.status,
        appearance: DEFAULT_CHARACTER.appearance,
        attributes: DEFAULT_CHARACTER.attributes,
      },
      relations: [],
    },
    skills: [],
    conditions: [],
    traits: [],
    inventory: [],
  });

  writeConversationIndex(session, {
    activeForkId: 0,
    activeTurnId: "fork-0/turn-0",
    rootTurnIdByFork: { "0": "fork-0/turn-0" },
    latestTurnNumberByFork: { "0": 0 },
    turnOrderByFork: { "0": ["fork-0/turn-0"] },
  });

  writeForkTree(session, {
    nodes: {
      0: {
        id: 0,
        parentId: null,
        createdAt: 0,
        createdAtTurn: 0,
        sourceNodeId: "",
      },
    },
    nextForkId: 1,
  });

  writeTurnFile(session, 0, 0, {
    turnId: "fork-0/turn-0",
    forkId: 0,
    turnNumber: 0,
    parentTurnId: null,
    createdAt: Date.now(),
    userAction: "",
    assistant: { narrative: "", choices: [] },
  });
};

export const seedVfsSessionFromOutline = (
  session: VfsSession,
  outline: StoryOutline,
  options: {
    theme: string;
    time: string;
    currentLocation: string;
    atmosphere: AtmosphereObject;
    language?: string;
    customContext?: string;
    presetProfile?: SavePresetProfile;
    seedImageId?: string;
    narrativeScale?: GameState["narrativeScale"];
  },
): void => {
  ensureGlobalNotes(session);
  ensureCustomRulesReadme(session);

  writeJson(session, "world/global.json", {
    time: options.time,
    theme: options.theme,
    currentLocation: options.currentLocation,
    atmosphere: options.atmosphere,
    turnNumber: 0,
    forkId: 0,
    language: options.language,
    customContext: options.customContext,
    presetProfile: normalizePresetProfile(options.presetProfile),
    seedImageId: options.seedImageId,
    narrativeScale: options.narrativeScale,
  });

  writeJson(session, "summary/state.json", {
    summaries: [],
    lastSummarizedIndex: 0,
  });

  writeForkTree(session, {
    nodes: {
      0: {
        id: 0,
        parentId: null,
        createdAt: 0,
        createdAtTurn: 0,
        sourceNodeId: "",
      },
    },
    nextForkId: 1,
  });

  // Canonical world info + per-actor unlock state
  writeJson(session, "world/world_info.json", {
    title: outline.title,
    premise: outline.premise,
    narrativeScale: (outline as any).narrativeScale,
    worldSetting: outline.worldSetting,
    mainGoal: outline.mainGoal,
  });
  writeJson(session, `world/characters/char:player/views/world_info.json`, {
    worldSettingUnlocked: false,
    mainGoalUnlocked: false,
  });

  // Actor-first outline seeding
  if ((outline as any).player) {
    writeActorBundle(session, (outline as any).player);
  }
  if (Array.isArray((outline as any).npcs)) {
    for (const npc of (outline as any).npcs as any[]) {
      writeActorBundle(session, npc);
    }
  }
  if (Array.isArray((outline as any).placeholders)) {
    for (const placeholder of (outline as any).placeholders as any[]) {
      if (!placeholder || typeof placeholder !== "object") continue;
      const id = (placeholder as any).id;
      if (typeof id !== "string" || id.trim().length === 0) continue;
      writeJson(session, `world/placeholders/${id.trim()}.json`, placeholder);
    }
  }
  // Canonical entities (no per-actor fields)
  writeEntities(session, "world/quests", outline.quests as Quest[]);
  writeEntities(session, "world/locations", outline.locations as Location[]);
  writeEntities(session, "world/knowledge", outline.knowledge as KnowledgeEntry[]);
  writeEntities(session, "world/factions", outline.factions as Faction[]);
  writeEntities(session, "world/timeline", outline.timeline as TimelineEvent[]);

  // Initial player views for all entities already known to the player.
  const playerActorId = "char:player";
  const gameTime = options.time;
  const currentLocId = options.currentLocation;

  for (const q of (outline.quests as any[]) ?? []) {
    const knownBy: string[] = Array.isArray((q as any)?.knownBy) ? (q as any).knownBy : [];
    if (!knownBy.includes(playerActorId)) continue;
    writeJson(session, `world/characters/${playerActorId}/views/quests/${q.id}.json`, {
      entityId: q.id,
      status: "active",
    });
  }
  for (const k of (outline.knowledge as any[]) ?? []) {
    const knownBy: string[] = Array.isArray((k as any)?.knownBy) ? (k as any).knownBy : [];
    if (!knownBy.includes(playerActorId)) continue;
    writeJson(session, `world/characters/${playerActorId}/views/knowledge/${k.id}.json`, {
      entityId: k.id,
      discoveredAtGameTime: gameTime,
    });
  }
  for (const e of (outline.timeline as any[]) ?? []) {
    const knownBy: string[] = Array.isArray((e as any)?.knownBy) ? (e as any).knownBy : [];
    if (!knownBy.includes(playerActorId)) continue;
    writeJson(session, `world/characters/${playerActorId}/views/timeline/${e.id}.json`, {
      entityId: e.id,
    });
  }
  for (const f of (outline.factions as any[]) ?? []) {
    const knownBy: string[] = Array.isArray((f as any)?.knownBy) ? (f as any).knownBy : [];
    if (!knownBy.includes(playerActorId)) continue;
    writeJson(session, `world/characters/${playerActorId}/views/factions/${f.id}.json`, {
      entityId: f.id,
    });
  }
  for (const loc of (outline.locations as any[]) ?? []) {
    const knownBy: string[] = Array.isArray((loc as any)?.knownBy)
      ? (loc as any).knownBy
      : [];
    if (!knownBy.includes(playerActorId)) continue;
    writeJson(
      session,
      `world/characters/${playerActorId}/views/locations/${loc.id}.json`,
      {
        entityId: loc.id,
        discoveredAtGameTime: gameTime,
        isVisited: loc.id === currentLocId,
        visitedCount: loc.id === currentLocId ? 1 : 0,
      },
    );
  }
};
