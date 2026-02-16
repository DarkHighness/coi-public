import type {
  ActorBundle,
  AtmosphereObject,
  CausalChain,
  CharacterStatus,
  Choice,
  CustomRule,
  Faction,
  GameState,
  InventoryItem,
  KnowledgeEntry,
  Location,
  NPC,
  PlayerRate,
  Placeholder,
  Quest,
  SavePresetProfile,
  TimelineEvent,
  TokenUsage,
} from "@/types";
import { DEFAULT_CHARACTER } from "@/utils/constants";
import { deriveHistory } from "@/utils/storyUtils";
import type { StorySegment } from "@/types";
import type { VfsFile, VfsFileMap } from "./types";
import { normalizeVfsPath } from "./utils";
import { canonicalToLogicalVfsPath } from "./core/pathResolver";
import { readConversationIndex, readTurnFile } from "./conversation";
import { readOutlineFile, readOutlineProgress } from "./outline";
import { deriveCustomRulesFromVfs } from "./customRules";
import { normalizeSoulMarkdown } from "./soulTemplates";
import { sanitizeCanonicalWorldRecord } from "./stateLayering";

const DEFAULT_FORK_TREE = {
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
};

const DEFAULT_ATMOSPHERE: AtmosphereObject = {
  envTheme: "fantasy",
  ambience: "quiet",
};

const DEFAULT_SAVE_PRESET_PROFILE: SavePresetProfile = {
  narrativeStylePreset: "theme",
  worldDispositionPreset: "theme",
  playerMalicePreset: "theme",
  playerMaliceIntensity: "standard",
  locked: true,
};

const normalizeSavePresetProfile = (
  profile: Partial<SavePresetProfile> | undefined,
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

const normalizeTokenUsage = (usage: unknown): TokenUsage | undefined => {
  if (!usage || typeof usage !== "object") {
    return undefined;
  }

  const source = usage as Record<string, unknown>;
  const normalizeNumber = (value: unknown): number => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return 0;
    }
    return Math.max(0, Math.floor(value));
  };

  const cacheRead =
    typeof source.cacheRead === "number" && Number.isFinite(source.cacheRead)
      ? Math.max(0, Math.floor(source.cacheRead))
      : undefined;
  const cacheWrite =
    typeof source.cacheWrite === "number" && Number.isFinite(source.cacheWrite)
      ? Math.max(0, Math.floor(source.cacheWrite))
      : undefined;

  return {
    promptTokens: normalizeNumber(source.promptTokens),
    completionTokens: normalizeNumber(source.completionTokens),
    totalTokens: normalizeNumber(source.totalTokens),
    ...(typeof cacheRead === "number" ? { cacheRead } : {}),
    ...(typeof cacheWrite === "number" ? { cacheWrite } : {}),
    ...(typeof source.reported === "boolean"
      ? { reported: source.reported }
      : {}),
  };
};

const normalizePlayerRate = (rate: unknown): PlayerRate | undefined => {
  if (!rate || typeof rate !== "object") {
    return undefined;
  }

  const source = rate as Record<string, unknown>;
  const vote = source.vote;
  if (vote !== "up" && vote !== "down") {
    return undefined;
  }

  const createdAt =
    typeof source.createdAt === "number" && Number.isFinite(source.createdAt)
      ? Math.floor(source.createdAt)
      : undefined;

  if (typeof createdAt !== "number" || createdAt <= 0) {
    return undefined;
  }

  const preset =
    typeof source.preset === "string" && source.preset.trim().length > 0
      ? source.preset.trim()
      : undefined;

  const comment =
    typeof source.comment === "string" && source.comment.trim().length > 0
      ? source.comment.trim()
      : undefined;

  const processedAt =
    typeof source.processedAt === "number" &&
    Number.isFinite(source.processedAt) &&
    source.processedAt > 0
      ? Math.floor(source.processedAt)
      : undefined;

  return {
    vote,
    createdAt,
    preset,
    comment,
    ...(typeof processedAt === "number" ? { processedAt } : {}),
  };
};

const createBaseGameState = (): GameState => ({
  nodes: {},
  activeNodeId: null,
  rootNodeId: null,
  currentFork: [],
  actors: [],
  playerActorId: "char:player",
  worldInfo: null,
  locationItemsByLocationId: {},
  inventory: [],
  npcs: [],
  quests: [],
  character: DEFAULT_CHARACTER,
  knowledge: [],
  factions: [],
  currentLocation: "Unknown",
  locations: [],
  uiState: {
    inventory: { pinnedIds: [], customOrder: [] },
    locations: { pinnedIds: [], customOrder: [] },
    npcs: { pinnedIds: [], customOrder: [] },
    knowledge: { pinnedIds: [], customOrder: [] },
    quests: { pinnedIds: [], customOrder: [] },
    entityPresentation: {},
    sidebarCollapsed: false,
    timelineCollapsed: false,
    feedLayout: "scroll",
    viewedSegmentId: undefined,
  },
  outline: null,
  summaries: [],
  lastSummarizedIndex: 0,
  isProcessing: false,
  isImageGenerating: false,
  generatingNodeId: null,
  error: null,
  atmosphere: DEFAULT_ATMOSPHERE,
  theme: "fantasy",
  time: "Day 1, 08:00",
  language: "zh",
  presetProfile: DEFAULT_SAVE_PRESET_PROFILE,
  tokenUsage: {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    cacheRead: 0,
    cacheWrite: 0,
  },
  logs: [],
  liveToolCalls: [],
  timeline: [],
  causalChains: [],
  turnNumber: 0,
  forkId: 0,
  forkTree: DEFAULT_FORK_TREE,
  customRules: [],
});

const PLACEHOLDER_CHARACTER_VALUES = new Set([
  "",
  "loading...",
  "initializing...",
  "pending",
  "unknown",
  "加载中",
  "初始化中",
  "未知",
  "待定",
]);

const normalizeCharacterText = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
};

const isPlaceholderCharacterText = (value: unknown): boolean => {
  const normalized = normalizeCharacterText(value);
  if (!normalized) {
    return true;
  }
  return PLACEHOLDER_CHARACTER_VALUES.has(normalized.toLowerCase());
};

const pickMeaningfulCharacterText = (
  ...values: unknown[]
): string | undefined => {
  for (const value of values) {
    const normalized = normalizeCharacterText(value);
    if (!normalized) {
      continue;
    }
    if (isPlaceholderCharacterText(normalized)) {
      continue;
    }
    return normalized;
  }
  return undefined;
};

const warnMissingPlayerRequiredField = (
  field: "age" | "race",
  value: unknown,
  details: Record<string, unknown>,
): void => {
  if (!isPlaceholderCharacterText(value)) {
    return;
  }
  console.warn(`[VFS] Player required field missing: ${field}`, {
    field,
    value,
    ...details,
  });
};

const parseJsonFile = (file: VfsFile): unknown | null => {
  if (file.contentType !== "application/json") {
    return null;
  }
  try {
    return JSON.parse(file.content) as unknown;
  } catch (error) {
    console.warn(`[VFS] Failed to parse JSON for ${file.path}`, error);
    return null;
  }
};

const stripCurrentPrefix = (path: string): string => {
  const normalized = normalizeVfsPath(path);
  if (normalized.startsWith("current/")) {
    return normalized.slice("current/".length);
  }
  return canonicalToLogicalVfsPath(normalized, {
    looseFork: true,
  });
};

const parseTurnId = (
  turnId: string,
): { forkId: number; turnNumber: number } | null => {
  const match = /fork-(\d+)\/turn-(\d+)/.exec(turnId);
  if (!match) return null;
  return {
    forkId: Number(match[1]),
    turnNumber: Number(match[2]),
  };
};

const deriveConversationNodes = (
  files: VfsFileMap,
): {
  nodes: Record<string, StorySegment>;
  activeNodeId: string | null;
  rootNodeId: string | null;
  currentFork: StorySegment[];
  activeForkId: number | null;
  latestTurnNumber: number | null;
} => {
  const index = readConversationIndex(files);
  if (!index) {
    return {
      nodes: {},
      activeNodeId: null,
      rootNodeId: null,
      currentFork: [],
      activeForkId: null,
      latestTurnNumber: null,
    };
  }

  const activeForkId = index.activeForkId;
  const order = index.turnOrderByFork?.[String(activeForkId)] || [];
  const nodes: Record<string, StorySegment> = {};
  let segmentIdx = 0;

  for (const turnId of order) {
    const parsed = parseTurnId(turnId);
    if (!parsed) continue;
    const turn = readTurnFile(files, parsed.forkId, parsed.turnNumber);
    if (!turn) continue;

    const userId = `user-${turn.turnId}`;
    const modelId = `model-${turn.turnId}`;
    const parentModelId = turn.parentTurnId
      ? `model-${turn.parentTurnId}`
      : null;

    const hasUserAction =
      typeof turn.userAction === "string" && turn.userAction.trim().length > 0;

    let modelParentId = parentModelId;

    if (hasUserAction) {
      nodes[userId] = {
        id: userId,
        parentId: parentModelId,
        text: turn.userAction,
        choices: [],
        imagePrompt: "",
        role: "user",
        timestamp: turn.createdAt,
        segmentIdx,
        ending: "continue",
      };
      segmentIdx += 1;
      modelParentId = userId;
    }

    nodes[modelId] = {
      id: modelId,
      parentId: modelParentId,
      text: turn.assistant.narrative || "",
      choices: (turn.assistant.choices || []) as Array<string | Choice>,
      imagePrompt: "",
      role: "model",
      timestamp: turn.createdAt,
      segmentIdx,
      usage: normalizeTokenUsage((turn.assistant as any).usage),
      atmosphere: turn.assistant.atmosphere as any,
      narrativeTone: turn.assistant.narrativeTone,
      ending: (turn.assistant.ending as any) || "continue",
      forceEnd: turn.assistant.forceEnd,
      playerRate: normalizePlayerRate((turn.meta as any)?.playerRate),
    };
    segmentIdx += 1;
  }

  const activeNodeId = index.activeTurnId
    ? `model-${index.activeTurnId}`
    : null;
  const rootTurnId = index.rootTurnIdByFork?.[String(activeForkId)] || null;
  const rootNodeId = rootTurnId ? `model-${rootTurnId}` : null;
  const currentFork = activeNodeId ? deriveHistory(nodes, activeNodeId) : [];
  const latestTurnNumber =
    index.latestTurnNumberByFork?.[String(activeForkId)] ?? null;

  return {
    nodes,
    activeNodeId,
    rootNodeId,
    currentFork,
    activeForkId,
    latestTurnNumber,
  };
};

export const deriveGameStateFromVfs = (files: VfsFileMap): GameState => {
  const state = createBaseGameState();
  const entries = Object.values(files).sort((a, b) =>
    a.path.localeCompare(b.path),
  );

  const actorProfiles = new Map<string, Record<string, unknown>>();
  const actorSkills = new Map<string, unknown[]>();
  const actorConditions = new Map<string, unknown[]>();
  const actorTraits = new Map<string, unknown[]>();
  const actorInventory = new Map<string, unknown[]>();
  const placeholders: Placeholder[] = [];
  const locationItemsByLocationId: Record<string, InventoryItem[]> = {};
  const questDefinitions: Quest[] = [];
  const locationDefinitions: Location[] = [];
  const knowledgeDefinitions: KnowledgeEntry[] = [];
  const factionDefinitions: Faction[] = [];
  const timelineDefinitions: TimelineEvent[] = [];
  const causalChainDefinitions: CausalChain[] = [];

  // Per-actor views (player only for UI derivation)
  const playerQuestViews = new Map<string, any>();
  const playerKnowledgeViews = new Map<string, any>();
  const playerTimelineViews = new Map<string, any>();
  const playerLocationViews = new Map<string, any>();
  const playerFactionViews = new Map<string, any>();
  const playerCausalChainViews = new Map<string, any>();
  let playerWorldInfoView: any | null = null;
  let hasGlobalTheme = false;
  let currentSoulMarkdown: string | null = null;
  let globalSoulMarkdown: string | null = null;

  for (const file of entries) {
    const normalizedPath = normalizeVfsPath(file.path);
    const pathWithoutCurrent = stripCurrentPrefix(normalizedPath);

    if (pathWithoutCurrent === "world/soul.md") {
      if (
        file.contentType === "text/markdown" ||
        file.contentType === "text/plain"
      ) {
        currentSoulMarkdown = normalizeSoulMarkdown("current", file.content);
      }
      continue;
    }

    if (pathWithoutCurrent === "world/global/soul.md") {
      if (
        file.contentType === "text/markdown" ||
        file.contentType === "text/plain"
      ) {
        globalSoulMarkdown = normalizeSoulMarkdown("global", file.content);
      }
      continue;
    }

    const data = parseJsonFile(file);
    if (data === null) continue;

    if (pathWithoutCurrent === "world/global.json") {
      const globalData = data as {
        time?: string;
        theme?: string;
        currentLocation?: string;
        atmosphere?: AtmosphereObject;
        turnNumber?: number;
        forkId?: number;
        language?: string;
        customContext?: string;
        presetProfile?: Partial<SavePresetProfile>;
        seedImageId?: string;
        narrativeScale?: GameState["narrativeScale"];
        initialPrompt?: string;
      };
      if (
        typeof globalData.time === "string" &&
        globalData.time.trim() !== ""
      ) {
        state.time = globalData.time.trim();
      }
      if (
        typeof globalData.theme === "string" &&
        globalData.theme.trim() !== ""
      ) {
        state.theme = globalData.theme.trim();
        hasGlobalTheme = true;
      }
      if (
        typeof globalData.currentLocation === "string" &&
        globalData.currentLocation.trim() !== ""
      ) {
        state.currentLocation = globalData.currentLocation.trim();
      }
      if (globalData.atmosphere) {
        state.atmosphere = globalData.atmosphere;
      }
      if (typeof globalData.turnNumber === "number") {
        state.turnNumber = globalData.turnNumber;
      }
      if (typeof globalData.forkId === "number") {
        state.forkId = globalData.forkId;
      }
      if (
        typeof globalData.language === "string" &&
        globalData.language.trim() !== ""
      ) {
        state.language = globalData.language.trim();
      }
      if (typeof globalData.customContext === "string") {
        state.customContext = globalData.customContext;
      }
      state.presetProfile = normalizeSavePresetProfile(
        globalData.presetProfile,
      );
      if (typeof globalData.seedImageId === "string") {
        state.seedImageId = globalData.seedImageId;
      }
      if (typeof globalData.narrativeScale === "string") {
        state.narrativeScale = globalData.narrativeScale;
      }
      if (typeof globalData.initialPrompt === "string") {
        state.initialPrompt = globalData.initialPrompt;
      }
      continue;
    }

    if (pathWithoutCurrent === "world/world_info.json") {
      state.worldInfo = sanitizeCanonicalWorldRecord(
        "world_info",
        data,
      ).sanitized as any;
      continue;
    }

    if (pathWithoutCurrent === "world/theme_config.json") {
      state.themeConfig = data as any;
      continue;
    }

    if (pathWithoutCurrent === "summary/state.json") {
      const summaryData = data as {
        summaries?: GameState["summaries"];
        lastSummarizedIndex?: number;
      };
      if (Array.isArray(summaryData.summaries)) {
        state.summaries = summaryData.summaries;
      }
      if (typeof summaryData.lastSummarizedIndex === "number") {
        state.lastSummarizedIndex = summaryData.lastSummarizedIndex;
      }
      continue;
    }

    if (
      pathWithoutCurrent.startsWith("world/custom_rules/") ||
      pathWithoutCurrent.startsWith("custom_rules/")
    ) {
      continue;
    }

    // No compatibility: reject legacy layouts immediately.
    if (
      pathWithoutCurrent === "world/character.json" ||
      pathWithoutCurrent.startsWith("world/character/") ||
      pathWithoutCurrent.startsWith("world/inventory/") ||
      pathWithoutCurrent.startsWith("world/npcs/") ||
      pathWithoutCurrent === "world/player_profile.json"
    ) {
      throw new Error(
        `SAVE_INCOMPATIBLE_LAYOUT: Found legacy path "${pathWithoutCurrent}". This build requires Actor-first VFS layout under world/characters/.`,
      );
    }

    // Placeholders
    if (pathWithoutCurrent.startsWith("world/placeholders/")) {
      placeholders.push(data as Placeholder);
      continue;
    }

    // Actor-first layout: world/characters/<id>/(profile.json|skills/*|conditions/*|traits/*|inventory/*)
    if (pathWithoutCurrent.startsWith("world/characters/")) {
      const parts = pathWithoutCurrent.split("/");
      const actorId = parts[2];
      if (!actorId) continue;

      // profile.json
      if (parts.length === 4 && parts[3] === "profile.json") {
        actorProfiles.set(actorId, data as Record<string, unknown>);
        continue;
      }

      // subfolders
      const sub = parts[3];
      if (sub === "views") {
        // views/world_info.json
        if (parts.length === 5 && parts[4] === "world_info.json") {
          if (actorId === state.playerActorId) {
            playerWorldInfoView = data as any;
          }
          continue;
        }

        // views/<category>/<entityId>.json
        const category = parts[4];
        const filename = parts[5];
        if (!category || !filename || !filename.endsWith(".json")) continue;
        const entityId = filename.slice(0, -".json".length);
        if (actorId !== state.playerActorId) {
          continue;
        }

        if (category === "quests") {
          playerQuestViews.set(entityId, data as any);
          continue;
        }
        if (category === "knowledge") {
          playerKnowledgeViews.set(entityId, data as any);
          continue;
        }
        if (category === "timeline") {
          playerTimelineViews.set(entityId, data as any);
          continue;
        }
        if (category === "locations") {
          playerLocationViews.set(entityId, data as any);
          continue;
        }
        if (category === "factions") {
          playerFactionViews.set(entityId, data as any);
          continue;
        }
        if (category === "causal_chains") {
          playerCausalChainViews.set(entityId, data as any);
          continue;
        }
        continue;
      }
      if (sub === "skills") {
        const list = actorSkills.get(actorId) ?? [];
        list.push(data);
        actorSkills.set(actorId, list);
        continue;
      }
      if (sub === "conditions") {
        const list = actorConditions.get(actorId) ?? [];
        list.push(data);
        actorConditions.set(actorId, list);
        continue;
      }
      if (sub === "traits") {
        const list = actorTraits.get(actorId) ?? [];
        list.push(data);
        actorTraits.set(actorId, list);
        continue;
      }
      if (sub === "inventory") {
        const list = actorInventory.get(actorId) ?? [];
        list.push(data);
        actorInventory.set(actorId, list);
        continue;
      }
      continue;
    }

    if (pathWithoutCurrent === "conversation/fork_tree.json") {
      const tree = data as any;
      if (
        tree &&
        typeof tree === "object" &&
        typeof tree.nextForkId === "number" &&
        tree.nodes &&
        typeof tree.nodes === "object"
      ) {
        state.forkTree = tree;
      }
      continue;
    }

    // Location dropped items: world/locations/<locId>/items/<itemId>.json
    if (pathWithoutCurrent.startsWith("world/locations/")) {
      const parts = pathWithoutCurrent.split("/");
      if (parts.length >= 5 && parts[3] === "items") {
        const locId = parts[2];
        const list = locationItemsByLocationId[locId] ?? [];
        list.push(data as InventoryItem);
        locationItemsByLocationId[locId] = list;
        continue;
      }
    }

    if (pathWithoutCurrent.startsWith("world/quests/")) {
      questDefinitions.push(
        sanitizeCanonicalWorldRecord("quests", data).sanitized as Quest,
      );
      continue;
    }

    if (pathWithoutCurrent.startsWith("world/locations/")) {
      locationDefinitions.push(
        sanitizeCanonicalWorldRecord("locations", data).sanitized as Location,
      );
      continue;
    }

    if (pathWithoutCurrent.startsWith("world/knowledge/")) {
      knowledgeDefinitions.push(
        sanitizeCanonicalWorldRecord("knowledge", data)
          .sanitized as KnowledgeEntry,
      );
      continue;
    }

    if (pathWithoutCurrent.startsWith("world/factions/")) {
      factionDefinitions.push(
        sanitizeCanonicalWorldRecord("factions", data).sanitized as Faction,
      );
      continue;
    }

    if (pathWithoutCurrent.startsWith("world/timeline/")) {
      timelineDefinitions.push(
        sanitizeCanonicalWorldRecord("timeline", data)
          .sanitized as TimelineEvent,
      );
      continue;
    }

    if (pathWithoutCurrent.startsWith("world/causal_chains/")) {
      causalChainDefinitions.push(
        sanitizeCanonicalWorldRecord("causal_chains", data)
          .sanitized as CausalChain,
      );
    }
  }

  state.customRules = deriveCustomRulesFromVfs(files);

  if (currentSoulMarkdown) {
    state.playerProfile = currentSoulMarkdown;
  } else if (globalSoulMarkdown) {
    state.playerProfile = normalizeSoulMarkdown("current", globalSoulMarkdown);
  }

  // Merge canonical entities with player views into UI-friendly view models.
  const playerId = state.playerActorId;
  const hasKnownByPlayer = (entity: any): boolean =>
    Array.isArray(entity?.knownBy) && entity.knownBy.includes(playerId);
  const withDerivedKnownByPlayer = (entity: any, hasView: boolean): any => {
    if (!hasView) return entity;
    if (!Array.isArray(entity?.knownBy)) {
      return { ...entity, knownBy: [playerId] };
    }
    if (entity.knownBy.includes(playerId)) return entity;
    return { ...entity, knownBy: [...entity.knownBy, playerId] };
  };

  const mergeQuest = (q: any): any => {
    const view = playerQuestViews.get(q.id);
    const qWithKnown = withDerivedKnownByPlayer(q, Boolean(view));
    if (view && !hasKnownByPlayer(q)) {
      console.warn(
        `[VFS] Quest view exists but canonical knownBy missing ${playerId}: ${q.id}`,
      );
    }
    const status = view?.status ?? "active";
    return {
      ...qWithKnown,
      status,
      unlocked: view?.unlocked ?? false,
      unlockReason: view?.unlockReason,
    };
  };

  const mergeKnowledge = (k: any): any => {
    const view = playerKnowledgeViews.get(k.id);
    const kWithKnown = withDerivedKnownByPlayer(k, Boolean(view));
    if (view && !hasKnownByPlayer(k)) {
      console.warn(
        `[VFS] Knowledge view exists but canonical knownBy missing ${playerId}: ${k.id}`,
      );
    }
    return {
      ...kWithKnown,
      discoveredAt: view?.discoveredAtGameTime,
      unlocked: view?.unlocked ?? false,
      unlockReason: view?.unlockReason,
    };
  };

  const mergeTimeline = (e: any): any => {
    const view = playerTimelineViews.get(e.id);
    const eWithKnown = withDerivedKnownByPlayer(e, Boolean(view));
    if (view && !hasKnownByPlayer(e)) {
      console.warn(
        `[VFS] Timeline view exists but canonical knownBy missing ${playerId}: ${e.id}`,
      );
    }
    return {
      ...eWithKnown,
      unlocked: view?.unlocked ?? false,
      unlockReason: view?.unlockReason,
    };
  };

  const mergeLocation = (loc: any): any => {
    const view = playerLocationViews.get(loc.id);
    const locWithKnown = withDerivedKnownByPlayer(loc, Boolean(view));
    if (view && !hasKnownByPlayer(loc)) {
      console.warn(
        `[VFS] Location view exists but canonical knownBy missing ${playerId}: ${loc.id}`,
      );
    }
    return {
      ...locWithKnown,
      isVisited: view?.isVisited ?? false,
      unlocked: view?.unlocked ?? false,
      unlockReason: view?.unlockReason,
      discoveredAt: view?.discoveredAtGameTime,
    };
  };

  const mergeFaction = (f: any): any => {
    const view = playerFactionViews.get(f.id);
    const fWithKnown = withDerivedKnownByPlayer(f, Boolean(view));
    if (view && !hasKnownByPlayer(f)) {
      console.warn(
        `[VFS] Faction view exists but canonical knownBy missing ${playerId}: ${f.id}`,
      );
    }
    return {
      ...fWithKnown,
      unlocked: view?.unlocked ?? false,
      unlockReason: view?.unlockReason,
      standing: view?.standing,
      standingTag: view?.standingTag,
    };
  };

  const mergeCausalChain = (c: any): any => {
    const view = playerCausalChainViews.get(c.chainId);
    const cWithKnown = withDerivedKnownByPlayer(c, Boolean(view));
    if (view && !hasKnownByPlayer(c)) {
      console.warn(
        `[VFS] Causal chain view exists but canonical knownBy missing ${playerId}: ${c.chainId}`,
      );
    }
    return {
      ...cWithKnown,
      unlocked: view?.unlocked ?? false,
      unlockReason: view?.unlockReason,
      investigationNotes: view?.investigationNotes,
      linkedEventIds: view?.linkedEventIds,
    };
  };

  state.quests = questDefinitions.map(mergeQuest) as any;
  state.locations = locationDefinitions.map(mergeLocation) as any;
  state.knowledge = knowledgeDefinitions.map(mergeKnowledge) as any;
  state.factions = factionDefinitions.map(mergeFaction) as any;
  state.timeline = timelineDefinitions.map(mergeTimeline) as any;
  state.causalChains = causalChainDefinitions.map(mergeCausalChain) as any;

  // World info unlock flags (per-actor view)
  if (playerWorldInfoView) {
    (state.worldInfo as any) = {
      ...(state.worldInfo as any),
      worldSettingUnlocked: playerWorldInfoView.worldSettingUnlocked ?? false,
      worldSettingUnlockReason: playerWorldInfoView.worldSettingUnlockReason,
      mainGoalUnlocked: playerWorldInfoView.mainGoalUnlocked ?? false,
      mainGoalUnlockReason: playerWorldInfoView.mainGoalUnlockReason,
    };
  }

  // Assemble actor bundles
  const bundles: ActorBundle[] = [];
  for (const [actorId, profile] of actorProfiles.entries()) {
    bundles.push({
      profile: profile as any,
      skills: (actorSkills.get(actorId) ?? []) as any,
      conditions: (actorConditions.get(actorId) ?? []) as any,
      traits: (actorTraits.get(actorId) ?? []) as any,
      inventory: (actorInventory.get(actorId) ?? []) as any,
    } as any);
  }
  state.actors = bundles as any;
  state.locationItemsByLocationId = locationItemsByLocationId;
  state.placeholders = placeholders;

  const playerBundle =
    bundles.find((b) => (b?.profile as any)?.id === state.playerActorId) ??
    null;
  if (playerBundle) {
    state.inventory = Array.isArray(playerBundle.inventory)
      ? (playerBundle.inventory as InventoryItem[])
      : [];

    // Backfill CharacterStatus for legacy UI panels (CharacterPanel).
    const visible = (playerBundle.profile as any)?.visible ?? {};
    const profile = (playerBundle.profile as any) ?? {};
    const outlinePlayer = (state.outline as any)?.player?.profile ?? {};
    const outlineVisible = outlinePlayer?.visible ?? {};
    const base = (state.character ?? DEFAULT_CHARACTER) as any;

    const title =
      pickMeaningfulCharacterText(
        visible.title,
        visible.roleTag,
        profile.title,
        profile.roleTag,
        outlineVisible.title,
        outlineVisible.roleTag,
        outlinePlayer.title,
        outlinePlayer.roleTag,
        base.title,
      ) ?? "";

    const age =
      pickMeaningfulCharacterText(
        visible.age,
        profile.age,
        outlineVisible.age,
        outlinePlayer.age,
        base.age,
      ) ?? "";

    const profession =
      pickMeaningfulCharacterText(
        visible.profession,
        visible.roleTag,
        profile.profession,
        profile.roleTag,
        outlineVisible.profession,
        outlineVisible.roleTag,
        outlinePlayer.profession,
        outlinePlayer.roleTag,
        base.profession,
      ) ?? "";

    const race =
      pickMeaningfulCharacterText(
        visible.race,
        profile.race,
        outlineVisible.race,
        outlinePlayer.race,
        base.race,
      ) ?? "";

    const background =
      pickMeaningfulCharacterText(
        visible.background,
        profile.background,
        outlineVisible.background,
        outlinePlayer.background,
        base.background,
      ) ?? "";

    const status =
      pickMeaningfulCharacterText(
        visible.status,
        profile.status,
        outlineVisible.status,
        outlinePlayer.status,
        base.status,
      ) ?? "";

    const appearance =
      pickMeaningfulCharacterText(
        visible.appearance,
        visible.description,
        profile.appearance,
        profile.description,
        outlineVisible.appearance,
        outlineVisible.description,
        outlinePlayer.appearance,
        outlinePlayer.description,
        base.appearance,
      ) ??
      (base.appearance || "");

    const currentLocation =
      pickMeaningfulCharacterText(
        profile.currentLocation,
        outlinePlayer.currentLocation,
        state.currentLocation,
        base.currentLocation,
      ) ?? "";

    state.character = {
      ...base,
      name:
        pickMeaningfulCharacterText(
          visible.name,
          profile.name,
          outlineVisible.name,
          outlinePlayer.name,
          base.name,
        ) ?? base.name,
      title,
      status,
      appearance,
      attributes: Array.isArray(visible.attributes) ? visible.attributes : [],
      skills: Array.isArray(playerBundle.skills) ? playerBundle.skills : [],
      conditions: Array.isArray(playerBundle.conditions)
        ? playerBundle.conditions
        : [],
      hiddenTraits: Array.isArray(playerBundle.traits)
        ? playerBundle.traits
        : [],
      currentLocation,
      age,
      profession,
      background,
      race,
    } as any;

    if (
      isPlaceholderCharacterText(state.currentLocation) &&
      !isPlaceholderCharacterText(currentLocation)
    ) {
      state.currentLocation = currentLocation;
    }

    warnMissingPlayerRequiredField("age", state.character.age, {
      source: "playerBundle",
      playerActorId: state.playerActorId,
      visibleAge: visible.age,
      profileAge: profile.age,
      outlineAge: outlineVisible.age,
      outlineProfileAge: outlinePlayer.age,
    });
    warnMissingPlayerRequiredField("race", state.character.race, {
      source: "playerBundle",
      playerActorId: state.playerActorId,
      visibleRace: visible.race,
      profileRace: profile.race,
      outlineRace: outlineVisible.race,
      outlineProfileRace: outlinePlayer.race,
    });
  }

  // Derive NPC list for sidebar panels from actor bundles.
  state.npcs = bundles
    .filter((b) => (b?.profile as any)?.kind === "npc")
    .map((b) => b.profile) as any;

  const conversation = deriveConversationNodes(files);
  state.nodes = conversation.nodes;
  state.activeNodeId = conversation.activeNodeId;
  state.rootNodeId = conversation.rootNodeId;
  state.currentFork = conversation.currentFork;
  if (conversation.activeForkId !== null) {
    state.forkId = conversation.activeForkId;
  }
  if (conversation.latestTurnNumber !== null) {
    state.turnNumber = conversation.latestTurnNumber;
  }

  // Restore summary snapshot markers for UI (divider + card) based on persisted ranges.
  if (state.summaries.length > 0 && Object.keys(state.nodes).length > 0) {
    const nodeIdBySegmentIdx = new Map<number, string>();
    const modelNodeIdBySegmentIdx = new Map<number, string>();

    for (const node of Object.values(state.nodes)) {
      if (typeof node.segmentIdx !== "number") continue;
      nodeIdBySegmentIdx.set(node.segmentIdx, node.id);
      if (node.role === "model" || node.role === "system") {
        modelNodeIdBySegmentIdx.set(node.segmentIdx, node.id);
      }
    }

    for (const summary of state.summaries) {
      const nodeRange = summary.nodeRange;
      if (!nodeRange || typeof nodeRange.toIndex !== "number") {
        continue;
      }
      const preferredIdx = nodeRange.toIndex + 1;
      const fallbackIdx = nodeRange.toIndex;

      const targetId =
        modelNodeIdBySegmentIdx.get(preferredIdx) ??
        nodeIdBySegmentIdx.get(preferredIdx) ??
        modelNodeIdBySegmentIdx.get(fallbackIdx) ??
        nodeIdBySegmentIdx.get(fallbackIdx);

      if (!targetId) continue;
      const existing = state.nodes[targetId];
      if (!existing) continue;
      state.nodes[targetId] = { ...existing, summarySnapshot: summary };
    }
  }

  // Keep derived history in sync if we updated node markers above.
  if (state.activeNodeId) {
    state.currentFork = deriveHistory(state.nodes, state.activeNodeId);
  }

  const outlineProgress = readOutlineProgress(files);
  if (outlineProgress) {
    state.outlineConversation = outlineProgress;
    if (
      !hasGlobalTheme &&
      typeof outlineProgress.theme === "string" &&
      outlineProgress.theme.trim() !== ""
    ) {
      state.theme = outlineProgress.theme.trim();
    }
    if (outlineProgress.language) {
      state.language = outlineProgress.language;
    }
    if (outlineProgress.customContext) {
      state.customContext = outlineProgress.customContext;
    }
  }

  const outline = readOutlineFile(files);
  if (outline) {
    state.outline = outline;
    if ((outline as any).narrativeScale) {
      state.narrativeScale = (outline as any).narrativeScale;
    }

    const outlineVisible = (outline as any)?.player?.profile?.visible ?? {};
    const outlineProfile = (outline as any)?.player?.profile ?? {};
    const currentCharacter = (state.character ?? DEFAULT_CHARACTER) as any;

    state.character = {
      ...currentCharacter,
      title:
        pickMeaningfulCharacterText(
          currentCharacter.title,
          outlineVisible.title,
          outlineVisible.roleTag,
        ) ?? "",
      age:
        pickMeaningfulCharacterText(
          currentCharacter.age,
          outlineVisible.age,
          outlineProfile.age,
        ) ?? "",
      profession:
        pickMeaningfulCharacterText(
          currentCharacter.profession,
          outlineVisible.profession,
          outlineVisible.roleTag,
          outlineProfile.profession,
          outlineProfile.roleTag,
        ) ?? "",
      race:
        pickMeaningfulCharacterText(
          currentCharacter.race,
          outlineVisible.race,
          outlineProfile.race,
        ) ?? "",
      background:
        pickMeaningfulCharacterText(
          currentCharacter.background,
          outlineVisible.background,
          outlineProfile.background,
        ) ?? "",
      currentLocation:
        pickMeaningfulCharacterText(
          currentCharacter.currentLocation,
          outlineProfile.currentLocation,
          state.currentLocation,
        ) ?? "",
    } as any;

    if (
      isPlaceholderCharacterText(state.currentLocation) &&
      !isPlaceholderCharacterText(state.character.currentLocation)
    ) {
      state.currentLocation = state.character.currentLocation;
    }

    warnMissingPlayerRequiredField("age", state.character.age, {
      source: "outlineFallback",
      playerActorId: state.playerActorId,
      outlineAge: outlineVisible.age,
      outlineProfileAge: outlineProfile.age,
    });
    warnMissingPlayerRequiredField("race", state.character.race, {
      source: "outlineFallback",
      playerActorId: state.playerActorId,
      outlineRace: outlineVisible.race,
      outlineProfileRace: outlineProfile.race,
    });
  }

  // Fallback: if the save has an outline but no conversation index/turns,
  // synthesize the opening narrative as the first model segment so the UI
  // doesn't get stuck on "journey not started".
  if (state.outline) {
    const hasAnyNodes = state.nodes && Object.keys(state.nodes).length > 0;
    const opening = (state.outline as any).openingNarrative;
    const hasOpening = opening && typeof opening.narrative === "string";

    if (!hasAnyNodes && hasOpening) {
      const firstNodeId = "model-fork-0/turn-0";
      state.nodes = {
        [firstNodeId]: {
          id: firstNodeId,
          parentId: null,
          text: opening.narrative,
          choices: Array.isArray(opening.choices)
            ? opening.choices.map((c: any) =>
                typeof c === "string"
                  ? c
                  : {
                      text: c?.text ?? "",
                      consequence: c?.consequence,
                    },
              )
            : [],
          imagePrompt: opening.imagePrompt || "",
          role: "model",
          timestamp: Date.now(),
          segmentIdx: 0,
          atmosphere: opening.atmosphere,
          narrativeTone: opening.narrativeTone,
          ending: opening.ending || "continue",
          forceEnd: opening.forceEnd,
        },
      } as any;
      state.activeNodeId = firstNodeId;
      state.rootNodeId = firstNodeId;
      state.currentFork = [state.nodes[firstNodeId]] as any;
      state.forkId = 0;
      state.turnNumber = 0;
    } else if (hasAnyNodes && !state.activeNodeId) {
      // If nodes exist but active pointer is missing, pick the latest model segment.
      const modelSegments = Object.values(state.nodes).filter(
        (seg: any) => seg && seg.role === "model",
      ) as any[];
      if (modelSegments.length > 0) {
        modelSegments.sort((a, b) => (a.segmentIdx ?? 0) - (b.segmentIdx ?? 0));
        const last = modelSegments[modelSegments.length - 1];
        state.activeNodeId = last.id;
        state.rootNodeId = state.rootNodeId || modelSegments[0].id;
        state.currentFork = deriveHistory(state.nodes as any, last.id) as any;
      }
    }
  }

  return state;
};
