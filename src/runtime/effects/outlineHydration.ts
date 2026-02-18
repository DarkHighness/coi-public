import type { TFunction } from "i18next";
import { createStateSnapshot } from "../../utils/snapshotManager";
import { normalizeAtmosphere } from "../../utils/constants/atmosphere";
import { getThemeName } from "../../services/ai/utils";
import type {
  ActorBundle,
  Faction,
  GameState,
  InventoryItem,
  KnowledgeEntry,
  Location,
  LogEntry,
  Placeholder,
  Quest,
  TokenUsage,
  TimelineEvent,
  VersionedTimestamp,
  ResolvedThemeConfig,
  StoryOutline,
  StorySegment,
} from "../../types";
import type { VfsSession } from "../../services/vfs/vfsSession";
import { seedVfsSessionFromOutline } from "../../services/vfs/seed";
import {
  clearOutlineProgress,
  writeOutlineFile,
} from "../../services/vfs/outline";
import {
  writeConversationIndex,
  writeTurnFile,
} from "../../services/vfs/conversation";

interface TokenUsageAccumulator {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cacheRead: number;
  cacheWrite: number;
}

interface BuildOutlineStateOptions {
  baseState: GameState;
  outline: StoryOutline;
  logs: readonly OutlineHydrationLog[];
  themeConfig: ResolvedThemeConfig;
  language: string;
  customContext?: string;
  themeOverride?: string;
  seedImageId?: string;
  clearLiveToolCalls?: boolean;
}

interface BuildOpeningNodeOptions {
  outline: StoryOutline;
  baseState: GameState;
  theme: string;
  t: TFunction;
  customContext?: string;
  includeCustomContextInPrompt?: boolean;
  seedImageId?: string;
}

interface PersistOutlineCheckpointOptions {
  outline: StoryOutline;
  themeConfig: ResolvedThemeConfig;
  theme: string;
  language: string;
  customContext?: string;
  saveId: string;
  nextState: GameState;
  vfsSession: VfsSession;
  saveToSlot: (slotId: string, state: GameState) => Promise<boolean>;
  seedImageId?: string;
}

type OutlineHydrationLog = Omit<Partial<LogEntry>, "usage"> & {
  usage?: Partial<TokenUsage>;
};

const isRecord = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isDefined = <T>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined;

const withCreatedAndModified = <T extends object>(
  entity: T,
  now: number,
): Omit<T, "modifiedAt"> & { createdAt: number; lastModified: number } => {
  const record = entity as JsonObject;
  const { modifiedAt: _ignored, ...rest } = entity as T & {
    modifiedAt?: unknown;
  };
  return {
    ...rest,
    createdAt: typeof record.createdAt === "number" ? record.createdAt : now,
    lastModified:
      typeof record.lastModified === "number" ? record.lastModified : now,
  };
};

const withCreatedAt = <T extends object>(
  entity: T,
  now: number,
): Omit<T, "modifiedAt"> & { createdAt: number } => {
  const record = entity as JsonObject;
  const { modifiedAt: _ignored, ...rest } = entity as T & {
    modifiedAt?: unknown;
  };
  return {
    ...rest,
    createdAt: typeof record.createdAt === "number" ? record.createdAt : now,
  };
};

const readUsageValue = (
  log: OutlineHydrationLog,
  key: keyof TokenUsageAccumulator,
): number => {
  if (!log.usage || !isRecord(log.usage)) {
    return 0;
  }
  const value = log.usage[key];
  return typeof value === "number" ? value : 0;
};

const getCharacterVisible = (
  player: StoryOutline["player"] | null | undefined,
): Partial<GameState["character"]> & { attributes?: unknown } => {
  if (!isRecord(player?.profile?.visible)) {
    return {};
  }
  return player.profile.visible as Partial<GameState["character"]> & {
    attributes?: unknown;
  };
};

const getPlayerCurrentLocation = (
  player: StoryOutline["player"] | null | undefined,
  fallback: string,
): string =>
  isNonEmptyString(player?.profile?.currentLocation)
    ? player.profile.currentLocation.trim()
    : fallback;

const toNpcProfiles = (bundles: ActorBundle[]): GameState["npcs"] =>
  bundles.map((bundle) => bundle.profile).filter(isDefined);

const toPlayerActorId = (
  player: StoryOutline["player"] | null | undefined,
): string =>
  isNonEmptyString(player?.profile?.id)
    ? player.profile.id.trim()
    : "char:player";

const toCharacterAttributes = (
  value: unknown,
): GameState["character"]["attributes"] =>
  Array.isArray(value) ? (value as GameState["character"]["attributes"]) : [];

const ensureEntityId = (
  value: unknown,
  prefix: string,
  index: number,
): string => (isNonEmptyString(value) ? value.trim() : `${prefix}:${index}`);

const hasTimestampVersion = (value: unknown): value is VersionedTimestamp =>
  isRecord(value) &&
  typeof value.forkId === "number" &&
  typeof value.turnNumber === "number" &&
  typeof value.timestamp === "number";

const toInventoryItem = (
  item: StoryOutline["player"]["inventory"][number],
  now: number,
  index: number,
): InventoryItem => {
  const normalized = withCreatedAndModified(item, now);
  return {
    ...normalized,
    id: ensureEntityId(item.id, "inv", index + 1),
    modifiedAt: hasTimestampVersion(item.modifiedAt)
      ? item.modifiedAt
      : undefined,
  };
};

const toQuest = (
  quest: StoryOutline["quests"][number],
  now: number,
  index: number,
): Quest => {
  const normalized = withCreatedAndModified(quest, now);
  return {
    ...normalized,
    id: ensureEntityId(quest.id, "quest", index + 1),
    modifiedAt: hasTimestampVersion(quest.modifiedAt)
      ? quest.modifiedAt
      : undefined,
    status: "active",
  };
};

const toKnowledgeEntry = (
  entry: StoryOutline["knowledge"][number],
  now: number,
  index: number,
): KnowledgeEntry => {
  const normalized = withCreatedAndModified(entry, now);
  return {
    ...normalized,
    id: ensureEntityId(entry.id, "know", index + 1),
    modifiedAt: hasTimestampVersion(entry.modifiedAt)
      ? entry.modifiedAt
      : undefined,
  };
};

const toLocation = (
  location: StoryOutline["locations"][number],
  now: number,
  index: number,
): Location => {
  const normalized = withCreatedAt(location, now);
  return {
    ...normalized,
    id: ensureEntityId(location.id, "loc", index + 1),
    isVisited: index === 0,
  };
};

const toFaction = (
  faction: StoryOutline["factions"][number],
  index: number,
): Faction => ({
  ...faction,
  id: ensureEntityId(faction.id, "fac", index + 1),
});

const toTimelineEvent = (
  event: StoryOutline["timeline"][number],
  index: number,
): TimelineEvent => ({
  ...event,
  id: ensureEntityId(event.id, "evt", index + 1),
  category: event.category || "world_event",
});

const normalizeUsage = (
  usage: OutlineHydrationLog["usage"],
): TokenUsage | undefined => {
  if (!usage) return undefined;
  return {
    promptTokens:
      typeof usage.promptTokens === "number" ? usage.promptTokens : 0,
    completionTokens:
      typeof usage.completionTokens === "number" ? usage.completionTokens : 0,
    totalTokens: typeof usage.totalTokens === "number" ? usage.totalTokens : 0,
    cacheRead: typeof usage.cacheRead === "number" ? usage.cacheRead : 0,
    cacheWrite: typeof usage.cacheWrite === "number" ? usage.cacheWrite : 0,
    reported: usage.reported,
  };
};

const toLogEntry = (log: OutlineHydrationLog, index: number): LogEntry => ({
  ...log,
  id: isNonEmptyString(log.id) ? log.id.trim() : `outline-log-${index + 1}`,
  timestamp: typeof log.timestamp === "number" ? log.timestamp : Date.now(),
  provider: isNonEmptyString(log.provider) ? log.provider.trim() : "outline",
  model: isNonEmptyString(log.model) ? log.model.trim() : "outline",
  endpoint: isNonEmptyString(log.endpoint)
    ? log.endpoint.trim()
    : "outline-hydration",
  usage: normalizeUsage(log.usage),
});

function parseOutlinePlaceholderDraft(draft: unknown): Placeholder | null {
  if (!isRecord(draft)) {
    return null;
  }

  const path = isNonEmptyString(draft.path) ? draft.path.trim() : "";
  const markdown = typeof draft.markdown === "string" ? draft.markdown : "";

  if (!/^world\/placeholders\/[^/]+\.md$/.test(path)) {
    return null;
  }

  const lines = markdown.split(/\r?\n/);
  const idFromPath = path.split("/").pop()?.replace(/\.md$/i, "") ?? "";
  let id = idFromPath;
  let label = "";
  let knownBy: string[] = [];
  let notes = "";
  let inNotes = false;
  const notesLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      if (inNotes) notesLines.push("");
      continue;
    }

    if (/^##\s+/i.test(trimmed)) {
      inNotes = /^##\s+Notes$/i.test(trimmed);
      continue;
    }

    const idMatch = /^-\s*id:\s*(.+)$/i.exec(trimmed);
    if (idMatch?.[1]) {
      id = idMatch[1].trim();
      continue;
    }

    const labelMatch = /^-\s*label:\s*(.+)$/i.exec(trimmed);
    if (labelMatch?.[1]) {
      label = labelMatch[1].trim();
      continue;
    }

    const knownByMatch = /^-\s*knownBy:\s*(.+)$/i.exec(trimmed);
    if (knownByMatch?.[1]) {
      knownBy = knownByMatch[1]
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
      continue;
    }

    if (inNotes) {
      notesLines.push(trimmed);
    }
  }

  notes = notesLines.join(" ").replace(/\s+/g, " ").trim();
  if (!id || id.length === 0) {
    return null;
  }

  return {
    id,
    label: label || `[${id}]`,
    knownBy,
    visible: {
      description: notes || "Pending concretization.",
    },
  };
}

export function calculateAccumulatedTokens(
  logs: readonly OutlineHydrationLog[],
): TokenUsageAccumulator {
  return logs.reduce<TokenUsageAccumulator>(
    (acc, log) => {
      return {
        promptTokens: acc.promptTokens + readUsageValue(log, "promptTokens"),
        completionTokens:
          acc.completionTokens + readUsageValue(log, "completionTokens"),
        totalTokens: acc.totalTokens + readUsageValue(log, "totalTokens"),
        cacheRead: acc.cacheRead + readUsageValue(log, "cacheRead"),
        cacheWrite: acc.cacheWrite + readUsageValue(log, "cacheWrite"),
      };
    },
    {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      cacheRead: 0,
      cacheWrite: 0,
    },
  );
}

export function buildOutlineHydratedState({
  baseState,
  outline,
  logs,
  themeConfig,
  language,
  customContext,
  themeOverride,
  seedImageId,
  clearLiveToolCalls = false,
}: BuildOutlineStateOptions): GameState {
  const accumulatedTokens = calculateAccumulatedTokens(logs);
  const now = Date.now();
  const player = outline.player;
  const npcBundles = Array.isArray(outline.npcs) ? outline.npcs : [];
  const placeholders = Array.isArray(outline.placeholders)
    ? outline.placeholders
        .map((draft) => parseOutlinePlaceholderDraft(draft))
        .filter(isDefined)
    : [];
  const normalizedLogs = logs.map((log, index) => toLogEntry(log, index));
  const visible = getCharacterVisible(player);
  const playerCurrentLocation = getPlayerCurrentLocation(
    player,
    baseState.currentLocation,
  );
  const inventory: GameState["inventory"] = Array.isArray(player.inventory)
    ? player.inventory.map((item, index) => toInventoryItem(item, now, index))
    : [];
  const quests: GameState["quests"] = outline.quests.map((quest, index) =>
    toQuest(quest, now, index),
  );
  const locations: GameState["locations"] = outline.locations.map(
    (loc, index) => toLocation(loc, now, index),
  );
  const knowledge: GameState["knowledge"] = outline.knowledge.map(
    (entry, index) => toKnowledgeEntry(entry, now, index),
  );
  const factions: GameState["factions"] = outline.factions.map(
    (faction, index) => toFaction(faction, index),
  );
  const timeline: GameState["timeline"] = outline.timeline.map((event, index) =>
    toTimelineEvent(event, index),
  );
  const actors: GameState["actors"] = [player, ...npcBundles].filter(isDefined);

  const nextState: GameState = {
    ...baseState,
    outline,
    worldInfo: {
      title: outline.title,
      premise: outline.premise,
      narrativeScale: outline.narrativeScale,
      worldSetting: outline.worldSetting,
      mainGoal: outline.mainGoal,
      worldSettingUnlocked: false,
      mainGoalUnlocked: false,
    },
    themeConfig,
    outlineConversation: undefined,
    actors,
    playerActorId: toPlayerActorId(player),
    placeholders,
    locationItemsByLocationId: {},
    character: {
      ...baseState.character,
      name: visible.name ?? baseState.character.name,
      title: visible.title ?? baseState.character.title,
      status: visible.status ?? baseState.character.status,
      attributes: toCharacterAttributes(visible.attributes),
      appearance: visible.appearance ?? baseState.character.appearance,
      age: visible.age ?? baseState.character.age ?? "Unknown",
      gender: visible.gender ?? baseState.character.gender ?? "Unspecified",
      profession:
        visible.profession ?? baseState.character.profession ?? "Unknown",
      background: visible.background ?? baseState.character.background ?? "",
      race: visible.race ?? baseState.character.race ?? "Unknown",
      currentLocation: playerCurrentLocation,
      skills: Array.isArray(player?.skills) ? player.skills : [],
      conditions: Array.isArray(player?.conditions) ? player.conditions : [],
      hiddenTraits: Array.isArray(player?.traits) ? player.traits : [],
    },
    inventory,
    npcs: toNpcProfiles(npcBundles),
    quests,
    currentLocation:
      playerCurrentLocation || outline.locations?.[0]?.id || "Unknown",
    locations,
    knowledge,
    factions,
    timeline,
    isProcessing: true,
    logs: [...normalizedLogs, ...(baseState.logs || [])],
    tokenUsage: {
      promptTokens:
        (baseState.tokenUsage?.promptTokens || 0) +
        accumulatedTokens.promptTokens,
      completionTokens:
        (baseState.tokenUsage?.completionTokens || 0) +
        accumulatedTokens.completionTokens,
      totalTokens:
        (baseState.tokenUsage?.totalTokens || 0) +
        accumulatedTokens.totalTokens,
      cacheRead:
        (baseState.tokenUsage?.cacheRead || 0) + accumulatedTokens.cacheRead,
      cacheWrite:
        (baseState.tokenUsage?.cacheWrite || 0) + accumulatedTokens.cacheWrite,
    },
    summaries: [],
    language,
    customContext,
    atmosphere: normalizeAtmosphere(outline.initialAtmosphere),
    time: outline.initialTime || "Day 1",
    narrativeScale: outline.narrativeScale,
  };

  if (clearLiveToolCalls) {
    nextState.liveToolCalls = [];
  }

  if (themeOverride !== undefined) {
    nextState.theme = themeOverride;
  }

  if (seedImageId !== undefined) {
    nextState.seedImageId = seedImageId;
  }

  return nextState;
}

export function buildOpeningNarrativeSegment({
  outline,
  baseState,
  theme,
  t,
  customContext,
  includeCustomContextInPrompt = false,
  seedImageId,
}: BuildOpeningNodeOptions): {
  firstNode: StorySegment;
  openingAtmosphere: ReturnType<typeof normalizeAtmosphere>;
  fallbackPrompt: string;
} {
  const openingNarrative = outline.openingNarrative;
  if (!openingNarrative) {
    throw new Error("Missing opening narrative from Phase 9");
  }

  const firstNodeId = "model-fork-0/turn-0";
  const openingAtmosphere = openingNarrative.atmosphere
    ? normalizeAtmosphere(openingNarrative.atmosphere)
    : normalizeAtmosphere(outline.initialAtmosphere);

  const stateSnapshot = createStateSnapshot(baseState, {
    summaries: [],
    lastSummarizedIndex: 0,
    currentLocation: baseState.currentLocation || "Unknown",
    time: outline.initialTime || "Day 1",
    atmosphere: openingAtmosphere,
    veoScript: undefined,
    uiState: baseState.uiState,
  });

  const firstNode: StorySegment = {
    id: firstNodeId,
    parentId: null,
    text: openingNarrative.narrative,
    choices: (openingNarrative.choices || []).map((choice) => ({
      text: choice.text,
      consequence: choice.consequence || undefined,
    })),
    imagePrompt: "",
    imageId: seedImageId || undefined,
    role: "model",
    timestamp: Date.now(),
    segmentIdx: 0,
    summaries: [],
    summarizedIndex: 0,
    atmosphere: openingAtmosphere,
    ending: "continue",
    stateSnapshot,
  };

  const themeName = getThemeName(theme, t);
  const fallbackPrompt =
    t("initialPrompt.begin", { theme: themeName }) +
    (includeCustomContextInPrompt && customContext
      ? ` ${t("initialPrompt.context")}: ${customContext}`
      : "");

  return {
    firstNode,
    openingAtmosphere,
    fallbackPrompt,
  };
}

export function applyOpeningNarrativeState(
  baseState: GameState,
  firstNode: StorySegment,
  openingAtmosphere: ReturnType<typeof normalizeAtmosphere>,
  fallbackPrompt: string,
): GameState {
  return {
    ...baseState,
    nodes: { [firstNode.id]: firstNode },
    activeNodeId: firstNode.id,
    rootNodeId: firstNode.id,
    currentFork: [firstNode],
    isProcessing: false,
    liveToolCalls: [],
    initialPrompt: fallbackPrompt,
    turnNumber: 0,
    atmosphere: openingAtmosphere,
  };
}

export async function persistOutlineCheckpoint({
  outline,
  themeConfig,
  theme,
  language,
  customContext,
  saveId,
  nextState,
  vfsSession,
  saveToSlot,
  seedImageId,
}: PersistOutlineCheckpointOptions): Promise<void> {
  seedVfsSessionFromOutline(vfsSession, outline, {
    theme,
    time: outline.initialTime || "Day 1",
    currentLocation: outline.locations?.[0]?.id || "Unknown",
    atmosphere: normalizeAtmosphere(outline.initialAtmosphere),
    language,
    customContext,
    seedImageId,
    narrativeScale: outline.narrativeScale,
  });

  vfsSession.writeFile(
    "world/theme_config.json",
    JSON.stringify(themeConfig),
    "application/json",
  );

  writeOutlineFile(vfsSession, outline);
  clearOutlineProgress(vfsSession);
  writeConversationIndex(vfsSession, {
    activeForkId: 0,
    activeTurnId: "fork-0/turn-0",
    rootTurnIdByFork: { "0": "fork-0/turn-0" },
    latestTurnNumberByFork: { "0": 0 },
    turnOrderByFork: { "0": ["fork-0/turn-0"] },
  });

  writeTurnFile(vfsSession, 0, 0, {
    turnId: "fork-0/turn-0",
    forkId: 0,
    turnNumber: 0,
    parentTurnId: null,
    createdAt: Date.now(),
    userAction: "",
    assistant: {
      narrative: outline.openingNarrative?.narrative || "",
      choices: outline.openingNarrative?.choices || [],
      atmosphere: outline.openingNarrative?.atmosphere,
    },
  });

  await saveToSlot(saveId, nextState);
}
