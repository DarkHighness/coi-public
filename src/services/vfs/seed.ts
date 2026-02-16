import type {
  AtmosphereObject,
  CausalChain,
  GameState,
  SavePresetProfile,
  StoryOutline,
} from "@/types";
import { DEFAULT_CHARACTER } from "@/utils/constants";
import { VfsSession } from "./vfsSession";
import {
  writeConversationIndex,
  writeForkTree,
  writeTurnFile,
} from "./conversation";
import {
  buildCustomRulePackMarkdown,
  CUSTOM_RULES_README_CONTENT,
  CUSTOM_RULES_README_PATH,
  toCustomRulePackPath,
} from "./customRules";
import { ensureDirectoryScaffolds } from "./directoryScaffolds";
import {
  CURRENT_SOUL_LOGICAL_PATH,
  GLOBAL_SOUL_LOGICAL_PATH,
  normalizeSoulMarkdown,
} from "./soulTemplates";
import { sanitizeCanonicalWorldRecord } from "./stateLayering";

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

const DEFAULT_REQUIRED_PLAYER_VISIBLE_FIELDS = {
  age: "Unspecified",
  profession: "Unspecified",
  background: "Unspecified",
  race: "Unspecified",
} as const;

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

const buildGlobalNotesMarkdown = (): string =>
  [
    "# World Notes (Story Teller AI)",
    "",
    "- Author: Story Teller AI (this AI instance writing to its future self)",
    "- Audience: Story Teller AI only (not player-facing raw content)",
    "- Purpose: Internal notes/prompts written by Story Teller AI for continuity and planning.",
    "- Visibility: Internal only. Do not surface raw notes content to player-facing narrative.",
    "",
    "## Index",
    "- Add concise bullets and link to topic notes when needed.",
    "",
  ].join("\n");

const ensureGlobalNotes = (session: VfsSession): void => {
  // Notes are Story Teller AI internal markdown self-notes.
  if (!session.readFile("world/notes.md")) {
    session.writeFile("world/notes.md", buildGlobalNotesMarkdown(), "text/markdown");
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

const writeSoulDocuments = (
  session: VfsSession,
  options?: {
    currentProfile?: string;
    globalProfile?: string;
  },
): void => {
  const currentSoul = normalizeSoulMarkdown("current", options?.currentProfile);
  const globalSoul = normalizeSoulMarkdown("global", options?.globalProfile);

  session.writeFile(CURRENT_SOUL_LOGICAL_PATH, currentSoul, "text/markdown");
  session.writeFile(GLOBAL_SOUL_LOGICAL_PATH, globalSoul, "text/markdown");
};

const ensureDirectoryStructure = (session: VfsSession): void => {
  ensureDirectoryScaffolds(session);
};

const omitUndefined = (value: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  );

const stripUiOnlyFields = <T extends Record<string, unknown>>(
  value: T,
): T => {
  const next = { ...value } as Record<string, unknown>;
  delete next.highlight;
  delete next.lastAccess;
  return next as T;
};

const writeWorldInfoAndView = (
  session: VfsSession,
  worldInfo: any,
  playerActorId: string,
): void => {
  const worldSettingUnlocked = (worldInfo as any)?.worldSettingUnlocked;
  const worldSettingUnlockReason = (worldInfo as any)?.worldSettingUnlockReason;
  const mainGoalUnlocked = (worldInfo as any)?.mainGoalUnlocked;
  const mainGoalUnlockReason = (worldInfo as any)?.mainGoalUnlockReason;
  const definition = sanitizeCanonicalWorldRecord(
    "world_info",
    worldInfo,
  ).sanitized;
  writeJson(session, "world/world_info.json", definition);
  writeJson(
    session,
    `world/characters/${playerActorId}/views/world_info.json`,
    omitUndefined({
      worldSettingUnlocked,
      worldSettingUnlockReason,
      mainGoalUnlocked,
      mainGoalUnlockReason,
    }),
  );
};

const writeQuestDefinitionAndView = (
  session: VfsSession,
  quest: any,
  playerActorId: string,
): void => {
  if (!quest?.id) return;
  const status = (quest as any).status;
  const unlocked = (quest as any).unlocked;
  const unlockReason = (quest as any).unlockReason;
  const definition = sanitizeCanonicalWorldRecord("quests", quest).sanitized;
  writeJson(session, `world/quests/${quest.id}.json`, definition);

  const knownBy: string[] = Array.isArray(definition.knownBy)
    ? definition.knownBy
    : [];
  if (!knownBy.includes(playerActorId)) return;

  writeJson(
    session,
    `world/characters/${playerActorId}/views/quests/${quest.id}.json`,
    omitUndefined({
      entityId: quest.id,
      status: status ?? "active",
      unlocked,
      unlockReason,
      objectiveState: (quest as any).objectiveState,
      acceptedAtGameTime: (quest as any).acceptedAtGameTime,
      completedAtGameTime: (quest as any).completedAtGameTime,
    }),
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

  const unlocked = (entity as any).unlocked;
  const unlockReason = (entity as any).unlockReason;
  const definition = sanitizeCanonicalWorldRecord(category, entity).sanitized;

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

  const knownBy: string[] = Array.isArray(definition.knownBy)
    ? definition.knownBy
    : [];
  if (!knownBy.includes(playerActorId)) return;

  // View write
  const viewBase = `world/characters/${playerActorId}/views/${category}/${id}.json`;
  const view: Record<string, unknown> = omitUndefined({
    entityId: id,
    unlocked,
    unlockReason,
    ...(options?.viewExtra ?? {}),
  });
  writeJson(session, viewBase, view);
};

const writeActorBundle = (session: VfsSession, bundle: any): void => {
  const profile = bundle?.profile;
  if (!profile || typeof profile !== "object") return;
  const actorId = (profile as any).id;
  if (typeof actorId !== "string" || actorId.trim().length === 0) return;

  const id = actorId.trim();
  writeJson(
    session,
    `world/characters/${id}/profile.json`,
    stripUiOnlyFields(profile as Record<string, unknown>),
  );

  const writeSub = (subPath: string, items: any[] | undefined) => {
    if (!Array.isArray(items)) return;
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const itemId = (item as any).id;
      if (typeof itemId !== "string" || itemId.trim().length === 0) continue;
      writeJson(
        session,
        `world/characters/${id}/${subPath}/${itemId.trim()}.json`,
        stripUiOnlyFields(item as Record<string, unknown>),
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
  ensureDirectoryStructure(session);
  ensureGlobalNotes(session);
  ensureCustomRulesReadme(session);
  writeSoulDocuments(session, {
    currentProfile: state.playerProfile,
    globalProfile: state.playerProfile,
  });

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
        typeof (rule as any)?.priority === "number"
          ? (rule as any).priority
          : 99;
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

  for (const [locId, items] of Object.entries(
    state.locationItemsByLocationId,
  )) {
    if (!Array.isArray(items)) continue;
    for (const item of items as any[]) {
      const id = (item as any)?.id;
      if (typeof id !== "string" || id.trim().length === 0) continue;
      writeJson(
        session,
        `world/locations/${locId}/items/${id}.json`,
        stripUiOnlyFields(item as Record<string, unknown>),
      );
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
  ensureDirectoryStructure(session);
  ensureGlobalNotes(session);
  ensureCustomRulesReadme(session);
  writeSoulDocuments(session);

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
        age: DEFAULT_REQUIRED_PLAYER_VISIBLE_FIELDS.age,
        profession: DEFAULT_REQUIRED_PLAYER_VISIBLE_FIELDS.profession,
        background: DEFAULT_REQUIRED_PLAYER_VISIBLE_FIELDS.background,
        race: DEFAULT_REQUIRED_PLAYER_VISIBLE_FIELDS.race,
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
  ensureDirectoryStructure(session);
  ensureGlobalNotes(session);
  ensureCustomRulesReadme(session);
  writeSoulDocuments(session);

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
  writeWorldInfoAndView(
    session,
    {
      title: outline.title,
      premise: outline.premise,
      narrativeScale: (outline as any).narrativeScale,
      worldSetting: outline.worldSetting,
      mainGoal: outline.mainGoal,
      worldSettingUnlocked: false,
      mainGoalUnlocked: false,
    },
    "char:player",
  );

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
      writeJson(
        session,
        `world/placeholders/${id.trim()}.json`,
        stripUiOnlyFields(placeholder as Record<string, unknown>),
      );
    }
  }

  // Canonical + per-actor views.
  const playerActorId = "char:player";
  const gameTime = options.time;
  const currentLocId = options.currentLocation;

  for (const q of (outline.quests as any[]) ?? []) {
    writeQuestDefinitionAndView(session, q, playerActorId);
  }
  for (const k of (outline.knowledge as any[]) ?? []) {
    writeDefinitionAndView(session, "knowledge", k, playerActorId, {
      viewExtra: { discoveredAtGameTime: gameTime },
    });
  }
  for (const e of (outline.timeline as any[]) ?? []) {
    writeDefinitionAndView(session, "timeline", e, playerActorId);
  }
  for (const f of (outline.factions as any[]) ?? []) {
    writeDefinitionAndView(session, "factions", f, playerActorId);
  }
  for (const loc of (outline.locations as any[]) ?? []) {
    writeDefinitionAndView(session, "locations", loc, playerActorId, {
      viewExtra: {
        discoveredAtGameTime: gameTime,
        isVisited: loc.id === currentLocId,
        visitedCount: loc.id === currentLocId ? 1 : 0,
      },
    });
  }
  for (const chain of ((outline as any).causalChains as any[]) ?? []) {
    writeDefinitionAndView(session, "causal_chains", chain, playerActorId, {
      keyField: "chainId",
      viewExtra: {
        linkedEventIds: (chain as any).linkedEventIds,
      },
    });
  }

  for (const item of (outline as any).locationItems ?? []) {
    if (!item || typeof item !== "object") continue;
    const locId = (item as any).locationId;
    const id = (item as any).id;
    if (typeof locId !== "string" || typeof id !== "string") continue;
    writeJson(
      session,
      `world/locations/${locId}/items/${id}.json`,
      stripUiOnlyFields(item as Record<string, unknown>),
    );
  }
};
