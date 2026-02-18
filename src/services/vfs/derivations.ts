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

  const source = usage as JsonObject;
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

  const source = rate as JsonObject;
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

const isRecord = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toStringOrUndefined = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const toBooleanOrUndefined = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined;

const toNumberOrUndefined = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const toStringArrayOrUndefined = (value: unknown): string[] | undefined =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string")
    ? value
    : undefined;

const normalizeAtmosphere = (value: unknown): AtmosphereObject | undefined => {
  if (!isRecord(value)) return undefined;
  if (typeof value.envTheme !== "string") return undefined;
  if (typeof value.ambience !== "string") return undefined;
  return {
    envTheme: value.envTheme as AtmosphereObject["envTheme"],
    ambience: value.ambience as AtmosphereObject["ambience"],
  };
};

const STORY_ENDING_VALUES = new Set<StorySegment["ending"]>([
  "continue",
  "death",
  "victory",
  "true_ending",
  "bad_ending",
  "neutral_ending",
]);

const normalizeEnding = (value: unknown): StorySegment["ending"] =>
  typeof value === "string" &&
  STORY_ENDING_VALUES.has(value as StorySegment["ending"])
    ? (value as StorySegment["ending"])
    : "continue";

const normalizeChoices = (value: unknown): Array<string | Choice> => {
  if (!Array.isArray(value)) return [];
  const choices: Array<string | Choice> = [];

  for (const entry of value) {
    if (typeof entry === "string") {
      choices.push(entry);
      continue;
    }

    if (!isRecord(entry) || typeof entry.text !== "string") {
      continue;
    }

    choices.push({
      text: entry.text,
      consequence: toStringOrUndefined(entry.consequence),
    });
  }

  return choices;
};

type ActorProfileData = ActorBundle["profile"];

const isActorProfileData = (value: unknown): value is ActorProfileData => {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string") return false;
  if (value.kind !== "player" && value.kind !== "npc") return false;
  if (typeof value.currentLocation !== "string") return false;
  if (
    !Array.isArray(value.knownBy) ||
    value.knownBy.some((entry) => typeof entry !== "string")
  ) {
    return false;
  }
  if (!isRecord(value.visible) || typeof value.visible.name !== "string") {
    return false;
  }
  return true;
};

const isActorSkillData = (
  value: unknown,
): value is ActorBundle["skills"][number] => isRecord(value);

const isActorConditionData = (
  value: unknown,
): value is ActorBundle["conditions"][number] => isRecord(value);

const isActorTraitData = (
  value: unknown,
): value is ActorBundle["traits"][number] => isRecord(value);

const isActorInventoryItemData = (value: unknown): value is InventoryItem => {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && typeof value.name === "string";
};

type QuestViewData = {
  status?: Quest["status"];
  unlocked?: boolean;
  unlockReason?: string;
};

type KnowledgeViewData = {
  discoveredAtGameTime?: string;
  unlocked?: boolean;
  unlockReason?: string;
};

type TimelineViewData = {
  unlocked?: boolean;
  unlockReason?: string;
};

type LocationViewData = {
  isVisited?: boolean;
  unlocked?: boolean;
  unlockReason?: string;
  discoveredAtGameTime?: string;
};

type FactionViewData = {
  unlocked?: boolean;
  unlockReason?: string;
  standing?: number;
  standingTag?: string;
};

type CausalChainViewData = {
  unlocked?: boolean;
  unlockReason?: string;
  investigationNotes?: string;
  linkedEventIds?: string[];
};

type WorldInfoViewData = {
  worldSettingUnlocked?: boolean;
  worldSettingUnlockReason?: string;
  mainGoalUnlocked?: boolean;
  mainGoalUnlockReason?: string;
};

type ViewObserverMap = Map<string, Set<string>>;

type ViewCategory =
  | "quests"
  | "knowledge"
  | "timeline"
  | "locations"
  | "factions"
  | "causal_chains";

type ActorDataPath =
  | { kind: "profile"; actorId: string }
  | { kind: "viewWorldInfo"; actorId: string }
  | {
      kind: "viewEntity";
      actorId: string;
      category: ViewCategory;
      entityId: string;
    }
  | { kind: "skills"; actorId: string }
  | { kind: "conditions"; actorId: string }
  | { kind: "traits"; actorId: string }
  | { kind: "inventory"; actorId: string };

const parseActorDataPath = (
  pathWithoutCurrent: string,
): ActorDataPath | null => {
  if (!pathWithoutCurrent.startsWith("world/characters/")) {
    return null;
  }

  const parts = pathWithoutCurrent.split("/");
  const actorId = parts[2];
  if (!actorId) return null;

  if (parts.length === 4 && parts[3] === "profile.json") {
    return { kind: "profile", actorId };
  }

  const section = parts[3];
  if (section === "views") {
    if (parts.length === 5 && parts[4] === "world_info.json") {
      return { kind: "viewWorldInfo", actorId };
    }

    const category = parts[4];
    const filename = parts[5];
    if (!category || !filename || !filename.endsWith(".json")) {
      return null;
    }

    const entityId = filename.slice(0, -".json".length);
    if (!entityId) return null;
    if (
      category !== "quests" &&
      category !== "knowledge" &&
      category !== "timeline" &&
      category !== "locations" &&
      category !== "factions" &&
      category !== "causal_chains"
    ) {
      return null;
    }

    return {
      kind: "viewEntity",
      actorId,
      category,
      entityId,
    };
  }

  if (section === "skills") return { kind: "skills", actorId };
  if (section === "conditions") return { kind: "conditions", actorId };
  if (section === "traits") return { kind: "traits", actorId };
  if (section === "inventory") return { kind: "inventory", actorId };
  return null;
};

const parseQuestViewData = (value: unknown): QuestViewData | null => {
  if (!isRecord(value)) return null;
  const status =
    value.status === "active" ||
    value.status === "completed" ||
    value.status === "failed"
      ? value.status
      : undefined;
  return {
    status,
    unlocked: toBooleanOrUndefined(value.unlocked),
    unlockReason: toStringOrUndefined(value.unlockReason),
  };
};

const parseKnowledgeViewData = (value: unknown): KnowledgeViewData | null => {
  if (!isRecord(value)) return null;
  return {
    discoveredAtGameTime: toStringOrUndefined(value.discoveredAtGameTime),
    unlocked: toBooleanOrUndefined(value.unlocked),
    unlockReason: toStringOrUndefined(value.unlockReason),
  };
};

const parseTimelineViewData = (value: unknown): TimelineViewData | null => {
  if (!isRecord(value)) return null;
  return {
    unlocked: toBooleanOrUndefined(value.unlocked),
    unlockReason: toStringOrUndefined(value.unlockReason),
  };
};

const parseLocationViewData = (value: unknown): LocationViewData | null => {
  if (!isRecord(value)) return null;
  return {
    isVisited: toBooleanOrUndefined(value.isVisited),
    unlocked: toBooleanOrUndefined(value.unlocked),
    unlockReason: toStringOrUndefined(value.unlockReason),
    discoveredAtGameTime: toStringOrUndefined(value.discoveredAtGameTime),
  };
};

const parseFactionViewData = (value: unknown): FactionViewData | null => {
  if (!isRecord(value)) return null;
  return {
    unlocked: toBooleanOrUndefined(value.unlocked),
    unlockReason: toStringOrUndefined(value.unlockReason),
    standing: toNumberOrUndefined(value.standing),
    standingTag: toStringOrUndefined(value.standingTag),
  };
};

const parseCausalChainViewData = (
  value: unknown,
): CausalChainViewData | null => {
  if (!isRecord(value)) return null;
  return {
    unlocked: toBooleanOrUndefined(value.unlocked),
    unlockReason: toStringOrUndefined(value.unlockReason),
    investigationNotes: toStringOrUndefined(value.investigationNotes),
    linkedEventIds: toStringArrayOrUndefined(value.linkedEventIds),
  };
};

const parseWorldInfoViewData = (value: unknown): WorldInfoViewData | null => {
  if (!isRecord(value)) return null;
  return {
    worldSettingUnlocked: toBooleanOrUndefined(value.worldSettingUnlocked),
    worldSettingUnlockReason: toStringOrUndefined(
      value.worldSettingUnlockReason,
    ),
    mainGoalUnlocked: toBooleanOrUndefined(value.mainGoalUnlocked),
    mainGoalUnlockReason: toStringOrUndefined(value.mainGoalUnlockReason),
  };
};

const actorKnows = (knownBy: unknown, actorId: string): boolean =>
  Array.isArray(knownBy) && knownBy.some((entry) => entry === actorId);

const registerViewObserver = (
  map: ViewObserverMap,
  entityId: string,
  actorId: string,
): void => {
  const existing = map.get(entityId);
  if (existing) {
    existing.add(actorId);
    return;
  }
  map.set(entityId, new Set([actorId]));
};

const withKnownByObservers = <T extends { knownBy?: string[] }>(
  entity: T,
  observerIds: Iterable<string> | undefined,
): T => {
  if (!observerIds) return entity;
  const toAdd = Array.from(observerIds).filter(
    (id): id is string => typeof id === "string" && id.trim().length > 0,
  );
  if (toAdd.length === 0) return entity;

  const baseKnownBy = Array.isArray(entity.knownBy)
    ? entity.knownBy.filter(
        (entry): entry is string => typeof entry === "string",
      )
    : [];

  let changed = false;
  const merged = [...baseKnownBy];
  for (const observerId of toAdd) {
    if (merged.includes(observerId)) continue;
    merged.push(observerId);
    changed = true;
  }

  return changed ? ({ ...entity, knownBy: merged } as T) : entity;
};

const missingKnownByActors = (
  entity: { knownBy?: string[] },
  observerIds: Iterable<string> | undefined,
): string[] => {
  if (!observerIds) return [];
  const knownBy = Array.isArray(entity.knownBy)
    ? entity.knownBy.filter(
        (entry): entry is string => typeof entry === "string",
      )
    : [];
  const knownBySet = new Set(knownBy);
  return Array.from(observerIds).filter((actorId) => !knownBySet.has(actorId));
};

const ensureUnlockedEntityKnownByObserver = <T extends JsonObject>(
  entity: T,
  observerActorId: string,
  context: string,
): T => {
  if (entity.unlocked !== true || actorKnows(entity.knownBy, observerActorId)) {
    return entity;
  }

  const knownBy = Array.isArray(entity.knownBy)
    ? entity.knownBy.filter(
        (entry): entry is string => typeof entry === "string",
      )
    : [];
  console.warn(
    `[VFS] Auto-repaired unlock invariant: unlocked=true but knownBy missing observer ${observerActorId} at ${context}`,
  );
  return {
    ...entity,
    knownBy: [...knownBy, observerActorId],
  } as T;
};

const normalizeActorProfileUnlockInvariants = (
  profile: ActorProfileData,
  actorIdFromPath: string,
): ActorProfileData => {
  const observerActorId =
    typeof actorIdFromPath === "string" && actorIdFromPath.trim().length > 0
      ? actorIdFromPath
      : profile.id;

  let normalizedProfile = ensureUnlockedEntityKnownByObserver(
    profile,
    observerActorId,
    `world/characters/${actorIdFromPath}/profile.json`,
  ) as ActorProfileData;

  const relations = Array.isArray(normalizedProfile.relations)
    ? normalizedProfile.relations
    : [];
  let relationsChanged = false;
  const normalizedRelations = relations.map((relation, index) => {
    if (!isRecord(relation)) {
      return relation;
    }
    const relationId =
      typeof relation.id === "string" && relation.id.trim().length > 0
        ? relation.id
        : `#${index}`;
    const normalizedRelation = ensureUnlockedEntityKnownByObserver(
      relation,
      observerActorId,
      `world/characters/${actorIdFromPath}/profile.json#relation:${relationId}`,
    ) as typeof relation;
    if (normalizedRelation !== relation) {
      relationsChanged = true;
    }
    return normalizedRelation;
  });

  if (relationsChanged) {
    normalizedProfile = {
      ...normalizedProfile,
      relations: normalizedRelations,
    };
  }

  return normalizedProfile;
};

const projectUnlockedForObserver = <T extends JsonObject>(
  entity: T,
  observerActorId: string,
): T => {
  if (entity.unlocked !== true || actorKnows(entity.knownBy, observerActorId)) {
    return entity;
  }
  const projected: JsonObject = { ...entity, unlocked: false };
  delete projected.unlockReason;
  return projected as T;
};

const projectNpcForObserver = (
  profile: ActorProfileData,
  observerActorId: string,
): NPC => {
  const projectedProfile = projectUnlockedForObserver(
    profile,
    observerActorId,
  ) as ActorProfileData;
  const relations = Array.isArray(projectedProfile.relations)
    ? projectedProfile.relations
    : [];

  let relationsChanged = false;
  const projectedRelations = relations.map((relation) => {
    if (!isRecord(relation)) {
      return relation;
    }
    const projectedRelation = projectUnlockedForObserver(
      relation,
      observerActorId,
    ) as typeof relation;
    if (projectedRelation !== relation) {
      relationsChanged = true;
    }
    return projectedRelation;
  });

  if (projectedProfile !== profile || relationsChanged) {
    return {
      ...projectedProfile,
      relations: projectedRelations,
    } as NPC;
  }
  return projectedProfile as NPC;
};

const isForkTree = (value: unknown): value is GameState["forkTree"] => {
  if (!isRecord(value)) return false;
  if (
    typeof value.nextForkId !== "number" ||
    !Number.isFinite(value.nextForkId)
  ) {
    return false;
  }
  if (!isRecord(value.nodes)) return false;

  for (const node of Object.values(value.nodes)) {
    if (!isRecord(node)) return false;
    if (typeof node.id !== "number" || !Number.isFinite(node.id)) return false;
    if (
      node.parentId !== null &&
      (typeof node.parentId !== "number" || !Number.isFinite(node.parentId))
    ) {
      return false;
    }
    if (
      typeof node.createdAt !== "number" ||
      !Number.isFinite(node.createdAt) ||
      typeof node.createdAtTurn !== "number" ||
      !Number.isFinite(node.createdAtTurn) ||
      typeof node.sourceNodeId !== "string"
    ) {
      return false;
    }
  }
  return true;
};

type OpeningNarrativeData = {
  narrative: string;
  choices: Array<string | Choice>;
  imagePrompt?: string;
  atmosphere?: AtmosphereObject;
  narrativeTone?: string;
  ending: StorySegment["ending"];
  forceEnd?: boolean;
};

const parseOpeningNarrative = (value: unknown): OpeningNarrativeData | null => {
  if (!isRecord(value) || typeof value.narrative !== "string") return null;
  return {
    narrative: value.narrative,
    choices: normalizeChoices(value.choices),
    imagePrompt: toStringOrUndefined(value.imagePrompt),
    atmosphere: normalizeAtmosphere(value.atmosphere),
    narrativeTone: toStringOrUndefined(value.narrativeTone),
    ending: normalizeEnding(value.ending),
    forceEnd: toBooleanOrUndefined(value.forceEnd),
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

const LEGACY_MALE_GENDER_TERMS = [
  "male",
  "man",
  "boy",
  "mr",
  "男性",
  "男人",
  "男生",
  "男孩",
  "男",
];

const LEGACY_FEMALE_GENDER_TERMS = [
  "female",
  "woman",
  "girl",
  "mrs",
  "ms",
  "miss",
  "女性",
  "女人",
  "女生",
  "女孩",
  "女",
];

const LEGACY_GENDER_STRIP_TERMS = [
  "male",
  "female",
  "man",
  "woman",
  "boy",
  "girl",
  "男性",
  "女性",
  "男人",
  "女人",
  "男生",
  "女生",
  "男孩",
  "女孩",
].sort((a, b) => b.length - a.length);

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isAsciiWord = (value: string): boolean => /^[a-z][a-z- ]*$/i.test(value);

const containsGenderTerm = (text: string, term: string): boolean => {
  const normalizedText = text.toLowerCase();
  const normalizedTerm = term.toLowerCase();
  if (isAsciiWord(normalizedTerm)) {
    return new RegExp(`\\b${escapeRegex(normalizedTerm)}\\b`, "i").test(
      normalizedText,
    );
  }
  return normalizedText.includes(normalizedTerm);
};

const detectLegacyGenderToken = (value: unknown): string | undefined => {
  const normalized = normalizeCharacterText(value)?.toLowerCase();
  if (!normalized) {
    return undefined;
  }
  const hasMale = LEGACY_MALE_GENDER_TERMS.some((term) =>
    containsGenderTerm(normalized, term),
  );
  const hasFemale = LEGACY_FEMALE_GENDER_TERMS.some((term) =>
    containsGenderTerm(normalized, term),
  );
  if (hasMale === hasFemale) {
    return undefined;
  }
  const hasCjk = /[\u3040-\u30ff\u3400-\u9fff]/u.test(normalized);
  return hasMale ? (hasCjk ? "男性" : "Male") : hasCjk ? "女性" : "Female";
};

const inferLegacyGenderFromRace = (
  ...values: unknown[]
): string | undefined => {
  for (const value of values) {
    const inferred = detectLegacyGenderToken(value);
    if (inferred) {
      return inferred;
    }
  }
  return undefined;
};

const toRaceOnlyCharacterText = (value: unknown): string | undefined => {
  const normalized = normalizeCharacterText(value);
  if (!normalized) {
    return undefined;
  }

  let stripped = normalized;
  for (const term of LEGACY_GENDER_STRIP_TERMS) {
    if (isAsciiWord(term)) {
      stripped = stripped.replace(
        new RegExp(`\\b${escapeRegex(term)}\\b`, "gi"),
        " ",
      );
    } else {
      stripped = stripped.split(term).join(" ");
    }
  }

  stripped = stripped
    .replace(/(^|[\s/|,，、()（）\-])(男|女)(?=$|[\s/|,，、()（）\-])/gu, "$1")
    .replace(/^(男|女)/u, "")
    .replace(/(男|女)$/u, "")
    .replace(/[()（）【】\[\]/|,，、\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return stripped.length > 0 ? stripped : normalized;
};

const warnMissingPlayerRequiredField = (
  field: "age" | "race" | "gender",
  value: unknown,
  details: JsonObject,
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

const parsePlaceholderDraftMarkdown = (
  pathWithoutCurrent: string,
  content: string,
): Placeholder | null => {
  if (!pathWithoutCurrent.startsWith("world/placeholders/")) {
    return null;
  }
  if (!pathWithoutCurrent.endsWith(".md")) {
    return null;
  }
  if (pathWithoutCurrent.endsWith("/README.md")) {
    return null;
  }

  const filename = pathWithoutCurrent.split("/").pop() ?? "";
  const idFromPath = filename.endsWith(".md")
    ? filename.slice(0, -".md".length).trim()
    : "";

  const lines = content.split(/\r?\n/);
  let id = idFromPath;
  let label = "";
  let knownBy: string[] = [];
  let inNotesSection = false;
  const notesLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      if (inNotesSection) {
        notesLines.push("");
      }
      continue;
    }

    if (/^##\s+/i.test(trimmed)) {
      inNotesSection = /^##\s+Notes$/i.test(trimmed);
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

    if (inNotesSection) {
      notesLines.push(trimmed);
    }
  }

  if (!id || id.length === 0) {
    return null;
  }

  const description =
    notesLines.join(" ").replace(/\s+/g, " ").trim() ||
    "Pending concretization.";

  return {
    id,
    label: label || `[${id}]`,
    knownBy,
    visible: {
      description,
    },
  };
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
      choices: normalizeChoices(turn.assistant.choices),
      imagePrompt: "",
      role: "model",
      timestamp: turn.createdAt,
      segmentIdx,
      usage: normalizeTokenUsage(turn.assistant.usage),
      atmosphere: normalizeAtmosphere(turn.assistant.atmosphere),
      narrativeTone: turn.assistant.narrativeTone,
      ending: normalizeEnding(turn.assistant.ending),
      forceEnd: turn.assistant.forceEnd,
      playerRate: normalizePlayerRate(turn.meta?.playerRate),
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

  const actorProfiles = new Map<string, ActorProfileData>();
  const actorSkills = new Map<string, ActorBundle["skills"]>();
  const actorConditions = new Map<string, ActorBundle["conditions"]>();
  const actorTraits = new Map<string, ActorBundle["traits"]>();
  const actorInventory = new Map<string, InventoryItem[]>();
  const placeholders: Placeholder[] = [];
  const locationItemsByLocationId: Record<string, InventoryItem[]> = {};
  const questDefinitions: Quest[] = [];
  const locationDefinitions: Location[] = [];
  const knowledgeDefinitions: KnowledgeEntry[] = [];
  const factionDefinitions: Faction[] = [];
  const timelineDefinitions: TimelineEvent[] = [];
  const causalChainDefinitions: CausalChain[] = [];

  // Per-actor views: always collect observer ownership from VFS;
  // player view is additionally projected into UI convenience fields.
  const playerQuestViews = new Map<string, QuestViewData>();
  const playerKnowledgeViews = new Map<string, KnowledgeViewData>();
  const playerTimelineViews = new Map<string, TimelineViewData>();
  const playerLocationViews = new Map<string, LocationViewData>();
  const playerFactionViews = new Map<string, FactionViewData>();
  const playerCausalChainViews = new Map<string, CausalChainViewData>();
  const questViewObservers = new Map<string, Set<string>>();
  const knowledgeViewObservers = new Map<string, Set<string>>();
  const timelineViewObservers = new Map<string, Set<string>>();
  const locationViewObservers = new Map<string, Set<string>>();
  const factionViewObservers = new Map<string, Set<string>>();
  const causalChainViewObservers = new Map<string, Set<string>>();
  let playerWorldInfoView: WorldInfoViewData | null = null;
  let hasGlobalTheme = false;

  for (const file of entries) {
    const normalizedPath = normalizeVfsPath(file.path);
    const pathWithoutCurrent = stripCurrentPrefix(normalizedPath);

    if (
      pathWithoutCurrent.startsWith("world/placeholders/") &&
      (file.contentType === "text/markdown" ||
        file.contentType === "text/plain")
    ) {
      const parsedPlaceholder = parsePlaceholderDraftMarkdown(
        pathWithoutCurrent,
        file.content,
      );
      if (parsedPlaceholder) {
        placeholders.push(parsedPlaceholder);
      }
      continue;
    }

    const data = parseJsonFile(file);
    if (data === null) continue;

    if (pathWithoutCurrent === "world/global.json") {
      if (!isRecord(data)) {
        continue;
      }
      const globalData = data;
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
      const atmosphere = normalizeAtmosphere(globalData.atmosphere);
      if (atmosphere) {
        state.atmosphere = atmosphere;
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
        isRecord(globalData.presetProfile)
          ? (globalData.presetProfile as Partial<SavePresetProfile>)
          : undefined,
      );
      if (typeof globalData.seedImageId === "string") {
        state.seedImageId = globalData.seedImageId;
      }
      if (
        globalData.narrativeScale === "epic" ||
        globalData.narrativeScale === "intimate" ||
        globalData.narrativeScale === "balanced"
      ) {
        state.narrativeScale = globalData.narrativeScale;
      }
      if (typeof globalData.initialPrompt === "string") {
        state.initialPrompt = globalData.initialPrompt;
      }
      continue;
    }

    if (pathWithoutCurrent === "world/world_info.json") {
      const sanitized = sanitizeCanonicalWorldRecord(
        "world_info",
        data,
      ).sanitized;
      if (isRecord(sanitized)) {
        state.worldInfo = sanitized as GameState["worldInfo"];
      }
      continue;
    }

    if (pathWithoutCurrent === "world/theme_config.json") {
      if (isRecord(data)) {
        const {
          name,
          narrativeStyle,
          worldSetting,
          backgroundTemplate,
          example,
          isRestricted,
        } = data;
        if (
          typeof name === "string" &&
          typeof narrativeStyle === "string" &&
          typeof worldSetting === "string" &&
          typeof backgroundTemplate === "string" &&
          typeof example === "string" &&
          typeof isRestricted === "boolean"
        ) {
          state.themeConfig = {
            name,
            narrativeStyle,
            worldSetting,
            backgroundTemplate,
            example,
            isRestricted,
          };
        }
      }
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
      pathWithoutCurrent === "world/player_profile.json" ||
      pathWithoutCurrent.startsWith("world/placeholders/")
    ) {
      throw new Error(
        `SAVE_INCOMPATIBLE_LAYOUT: Found legacy path "${pathWithoutCurrent}". This build requires Actor-first VFS layout under world/characters/.`,
      );
    }

    // Actor-first layout: world/characters/<id>/(profile.json|skills/*|conditions/*|traits/*|inventory/*)
    const actorPath = parseActorDataPath(pathWithoutCurrent);
    if (actorPath) {
      const { actorId } = actorPath;

      if (actorPath.kind === "profile") {
        if (isActorProfileData(data)) {
          actorProfiles.set(
            actorId,
            normalizeActorProfileUnlockInvariants(data, actorId),
          );
        }
        continue;
      }

      if (actorPath.kind === "viewWorldInfo") {
        if (actorId === state.playerActorId) {
          const parsedView = parseWorldInfoViewData(data);
          if (parsedView) {
            playerWorldInfoView = parsedView;
          }
        }
        continue;
      }

      if (actorPath.kind === "viewEntity") {
        if (actorPath.category === "quests") {
          const view = parseQuestViewData(data);
          if (view) {
            registerViewObserver(
              questViewObservers,
              actorPath.entityId,
              actorId,
            );
            if (actorId === state.playerActorId) {
              playerQuestViews.set(actorPath.entityId, view);
            }
          }
          continue;
        }
        if (actorPath.category === "knowledge") {
          const view = parseKnowledgeViewData(data);
          if (view) {
            registerViewObserver(
              knowledgeViewObservers,
              actorPath.entityId,
              actorId,
            );
            if (actorId === state.playerActorId) {
              playerKnowledgeViews.set(actorPath.entityId, view);
            }
          }
          continue;
        }
        if (actorPath.category === "timeline") {
          const view = parseTimelineViewData(data);
          if (view) {
            registerViewObserver(
              timelineViewObservers,
              actorPath.entityId,
              actorId,
            );
            if (actorId === state.playerActorId) {
              playerTimelineViews.set(actorPath.entityId, view);
            }
          }
          continue;
        }
        if (actorPath.category === "locations") {
          const view = parseLocationViewData(data);
          if (view) {
            registerViewObserver(
              locationViewObservers,
              actorPath.entityId,
              actorId,
            );
            if (actorId === state.playerActorId) {
              playerLocationViews.set(actorPath.entityId, view);
            }
          }
          continue;
        }
        if (actorPath.category === "factions") {
          const view = parseFactionViewData(data);
          if (view) {
            registerViewObserver(
              factionViewObservers,
              actorPath.entityId,
              actorId,
            );
            if (actorId === state.playerActorId) {
              playerFactionViews.set(actorPath.entityId, view);
            }
          }
          continue;
        }
        if (actorPath.category === "causal_chains") {
          const view = parseCausalChainViewData(data);
          if (view) {
            registerViewObserver(
              causalChainViewObservers,
              actorPath.entityId,
              actorId,
            );
            if (actorId === state.playerActorId) {
              playerCausalChainViews.set(actorPath.entityId, view);
            }
          }
          continue;
        }
        continue;
      }

      if (actorPath.kind === "skills") {
        if (isActorSkillData(data)) {
          const normalized = ensureUnlockedEntityKnownByObserver(
            data,
            actorId,
            `world/characters/${actorId}/skills`,
          ) as ActorBundle["skills"][number];
          const list = actorSkills.get(actorId) ?? [];
          list.push(normalized);
          actorSkills.set(actorId, list);
        }
        continue;
      }
      if (actorPath.kind === "conditions") {
        if (isActorConditionData(data)) {
          const normalized = ensureUnlockedEntityKnownByObserver(
            data,
            actorId,
            `world/characters/${actorId}/conditions`,
          ) as ActorBundle["conditions"][number];
          const list = actorConditions.get(actorId) ?? [];
          list.push(normalized);
          actorConditions.set(actorId, list);
        }
        continue;
      }
      if (actorPath.kind === "traits") {
        if (isActorTraitData(data)) {
          const normalized = ensureUnlockedEntityKnownByObserver(
            data,
            actorId,
            `world/characters/${actorId}/traits`,
          ) as ActorBundle["traits"][number];
          const list = actorTraits.get(actorId) ?? [];
          list.push(normalized);
          actorTraits.set(actorId, list);
        }
        continue;
      }
      if (actorPath.kind === "inventory") {
        if (isActorInventoryItemData(data)) {
          const normalized = ensureUnlockedEntityKnownByObserver(
            data,
            actorId,
            `world/characters/${actorId}/inventory`,
          ) as InventoryItem;
          const list = actorInventory.get(actorId) ?? [];
          list.push(normalized);
          actorInventory.set(actorId, list);
        }
        continue;
      }
      continue;
    }

    if (pathWithoutCurrent === "conversation/fork_tree.json") {
      if (isForkTree(data)) {
        state.forkTree = data;
      }
      continue;
    }

    // Location dropped items: world/locations/<locId>/items/<itemId>.json
    if (pathWithoutCurrent.startsWith("world/locations/")) {
      const parts = pathWithoutCurrent.split("/");
      if (parts.length >= 5 && parts[3] === "items") {
        const locId = parts[2];
        if (isActorInventoryItemData(data)) {
          const list = locationItemsByLocationId[locId] ?? [];
          list.push(data);
          locationItemsByLocationId[locId] = list;
        }
        continue;
      }
    }

    if (pathWithoutCurrent.startsWith("world/quests/")) {
      const sanitized = sanitizeCanonicalWorldRecord("quests", data).sanitized;
      if (isRecord(sanitized)) {
        questDefinitions.push(sanitized as Quest);
      }
      continue;
    }

    if (pathWithoutCurrent.startsWith("world/locations/")) {
      const sanitized = sanitizeCanonicalWorldRecord(
        "locations",
        data,
      ).sanitized;
      if (isRecord(sanitized)) {
        locationDefinitions.push(sanitized as Location);
      }
      continue;
    }

    if (pathWithoutCurrent.startsWith("world/knowledge/")) {
      const sanitized = sanitizeCanonicalWorldRecord(
        "knowledge",
        data,
      ).sanitized;
      if (isRecord(sanitized)) {
        knowledgeDefinitions.push(sanitized as KnowledgeEntry);
      }
      continue;
    }

    if (pathWithoutCurrent.startsWith("world/factions/")) {
      const sanitized = sanitizeCanonicalWorldRecord(
        "factions",
        data,
      ).sanitized;
      if (isRecord(sanitized)) {
        factionDefinitions.push(sanitized as Faction);
      }
      continue;
    }

    if (pathWithoutCurrent.startsWith("world/timeline/")) {
      const sanitized = sanitizeCanonicalWorldRecord(
        "timeline",
        data,
      ).sanitized;
      if (isRecord(sanitized)) {
        timelineDefinitions.push(sanitized as TimelineEvent);
      }
      continue;
    }

    if (pathWithoutCurrent.startsWith("world/causal_chains/")) {
      const sanitized = sanitizeCanonicalWorldRecord(
        "causal_chains",
        data,
      ).sanitized;
      if (isRecord(sanitized)) {
        causalChainDefinitions.push(sanitized as CausalChain);
      }
    }
  }

  state.customRules = deriveCustomRulesFromVfs(files);

  // Merge canonical entities with player views into UI-friendly view models.

  const mergeQuest = (q: Quest): Quest => {
    const view = playerQuestViews.get(q.id);
    const observers = questViewObservers.get(q.id);
    const qWithKnown = withKnownByObservers(q, observers);
    const missing = missingKnownByActors(q, observers);
    if (missing.length > 0) {
      console.warn(
        `[VFS] Quest view exists but canonical knownBy missing observer(s) ${missing.join(", ")}: ${q.id}`,
      );
    }
    const status = view?.status ?? q.status ?? "active";
    return {
      ...qWithKnown,
      status,
      unlocked: view?.unlocked ?? false,
      unlockReason: view?.unlockReason,
    };
  };

  const mergeKnowledge = (k: KnowledgeEntry): KnowledgeEntry => {
    const view = playerKnowledgeViews.get(k.id);
    const observers = knowledgeViewObservers.get(k.id);
    const kWithKnown = withKnownByObservers(k, observers);
    const missing = missingKnownByActors(k, observers);
    if (missing.length > 0) {
      console.warn(
        `[VFS] Knowledge view exists but canonical knownBy missing observer(s) ${missing.join(", ")}: ${k.id}`,
      );
    }
    return {
      ...kWithKnown,
      discoveredAt: view?.discoveredAtGameTime,
      unlocked: view?.unlocked ?? false,
      unlockReason: view?.unlockReason,
    };
  };

  const mergeTimeline = (e: TimelineEvent): TimelineEvent => {
    const view = playerTimelineViews.get(e.id);
    const observers = timelineViewObservers.get(e.id);
    const eWithKnown = withKnownByObservers(e, observers);
    const missing = missingKnownByActors(e, observers);
    if (missing.length > 0) {
      console.warn(
        `[VFS] Timeline view exists but canonical knownBy missing observer(s) ${missing.join(", ")}: ${e.id}`,
      );
    }
    return {
      ...eWithKnown,
      unlocked: view?.unlocked ?? false,
      unlockReason: view?.unlockReason,
    };
  };

  const mergeLocation = (loc: Location): Location => {
    const view = playerLocationViews.get(loc.id);
    const observers = locationViewObservers.get(loc.id);
    const locWithKnown = withKnownByObservers(loc, observers);
    const missing = missingKnownByActors(loc, observers);
    if (missing.length > 0) {
      console.warn(
        `[VFS] Location view exists but canonical knownBy missing observer(s) ${missing.join(", ")}: ${loc.id}`,
      );
    }
    return {
      ...locWithKnown,
      isVisited: view?.isVisited ?? false,
      unlocked: view?.unlocked ?? false,
      unlockReason: view?.unlockReason,
    };
  };

  type FactionWithView = Faction & {
    standing?: number;
    standingTag?: string;
  };

  const mergeFaction = (f: Faction): FactionWithView => {
    const view = playerFactionViews.get(f.id);
    const observers = factionViewObservers.get(f.id);
    const fWithKnown = withKnownByObservers(f, observers);
    const missing = missingKnownByActors(f, observers);
    if (missing.length > 0) {
      console.warn(
        `[VFS] Faction view exists but canonical knownBy missing observer(s) ${missing.join(", ")}: ${f.id}`,
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

  type CausalChainWithView = CausalChain & {
    unlocked?: boolean;
    unlockReason?: string;
    investigationNotes?: string;
    linkedEventIds?: string[];
  };

  const mergeCausalChain = (c: CausalChain): CausalChainWithView => {
    const view = playerCausalChainViews.get(c.chainId);
    const observers = causalChainViewObservers.get(c.chainId);
    const cWithKnown = withKnownByObservers(c, observers);
    const missing = missingKnownByActors(c, observers);
    if (missing.length > 0) {
      console.warn(
        `[VFS] Causal chain view exists but canonical knownBy missing observer(s) ${missing.join(", ")}: ${c.chainId}`,
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

  state.quests = questDefinitions.map(mergeQuest);
  state.locations = locationDefinitions.map(mergeLocation);
  state.knowledge = knowledgeDefinitions.map(mergeKnowledge);
  state.factions = factionDefinitions.map(mergeFaction);
  state.timeline = timelineDefinitions.map(mergeTimeline);
  state.causalChains = causalChainDefinitions.map(mergeCausalChain);

  // World info unlock flags (per-actor view)
  if (playerWorldInfoView && state.worldInfo) {
    state.worldInfo = {
      ...state.worldInfo,
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
      profile,
      skills: actorSkills.get(actorId) ?? [],
      conditions: actorConditions.get(actorId) ?? [],
      traits: actorTraits.get(actorId) ?? [],
      inventory: actorInventory.get(actorId) ?? [],
    });
  }
  state.actors = bundles;
  state.locationItemsByLocationId = locationItemsByLocationId;
  state.placeholders = placeholders;

  const playerBundle =
    bundles.find((bundle) => bundle.profile.id === state.playerActorId) ?? null;
  if (playerBundle) {
    state.inventory = Array.isArray(playerBundle.inventory)
      ? playerBundle.inventory.filter((item) => isActorInventoryItemData(item))
      : [];

    // Backfill CharacterStatus for legacy UI panels (CharacterPanel).
    const visible = playerBundle.profile.visible ?? {};
    const profile = playerBundle.profile;
    const profileLegacy = profile as JsonObject;
    const outlinePlayer = state.outline?.player?.profile;
    const outlineVisible = outlinePlayer?.visible ?? {};
    const outlineProfileLegacy: JsonObject | null = isRecord(outlinePlayer)
      ? outlinePlayer
      : null;
    const base: CharacterStatus = state.character ?? DEFAULT_CHARACTER;

    const title =
      pickMeaningfulCharacterText(
        visible.title,
        visible.roleTag,
        toStringOrUndefined(profileLegacy.title),
        toStringOrUndefined(profileLegacy.roleTag),
        outlineVisible.title,
        outlineVisible.roleTag,
        toStringOrUndefined(outlineProfileLegacy?.title),
        toStringOrUndefined(outlineProfileLegacy?.roleTag),
        base.title,
      ) ?? "";

    const age =
      pickMeaningfulCharacterText(
        visible.age,
        toStringOrUndefined(profileLegacy.age),
        outlineVisible.age,
        toStringOrUndefined(outlineProfileLegacy?.age),
        base.age,
      ) ?? "";

    const profession =
      pickMeaningfulCharacterText(
        visible.profession,
        visible.roleTag,
        toStringOrUndefined(profileLegacy.profession),
        toStringOrUndefined(profileLegacy.roleTag),
        outlineVisible.profession,
        outlineVisible.roleTag,
        toStringOrUndefined(outlineProfileLegacy?.profession),
        toStringOrUndefined(outlineProfileLegacy?.roleTag),
        base.profession,
      ) ?? "";

    const inferredGenderFromLegacyRace = inferLegacyGenderFromRace(
      visible.race,
      toStringOrUndefined(profileLegacy.race),
      outlineVisible.race,
      toStringOrUndefined(outlineProfileLegacy?.race),
      base.race,
    );

    const gender =
      pickMeaningfulCharacterText(
        visible.gender,
        toStringOrUndefined(profileLegacy.gender),
        outlineVisible.gender,
        toStringOrUndefined(outlineProfileLegacy?.gender),
        inferredGenderFromLegacyRace,
        base.gender,
      ) ?? "";

    const race =
      pickMeaningfulCharacterText(
        toRaceOnlyCharacterText(visible.race),
        toRaceOnlyCharacterText(toStringOrUndefined(profileLegacy.race)),
        toRaceOnlyCharacterText(outlineVisible.race),
        toRaceOnlyCharacterText(
          toStringOrUndefined(outlineProfileLegacy?.race),
        ),
        toRaceOnlyCharacterText(base.race),
      ) ?? "";

    const background =
      pickMeaningfulCharacterText(
        visible.background,
        toStringOrUndefined(profileLegacy.background),
        outlineVisible.background,
        toStringOrUndefined(outlineProfileLegacy?.background),
        base.background,
      ) ?? "";

    const status =
      pickMeaningfulCharacterText(
        visible.status,
        toStringOrUndefined(profileLegacy.status),
        outlineVisible.status,
        toStringOrUndefined(outlineProfileLegacy?.status),
        base.status,
      ) ?? "";

    const appearance =
      pickMeaningfulCharacterText(
        visible.appearance,
        visible.description,
        toStringOrUndefined(profileLegacy.appearance),
        toStringOrUndefined(profileLegacy.description),
        outlineVisible.appearance,
        outlineVisible.description,
        toStringOrUndefined(outlineProfileLegacy?.appearance),
        toStringOrUndefined(outlineProfileLegacy?.description),
        base.appearance,
      ) ??
      (base.appearance || "");

    const currentLocation =
      pickMeaningfulCharacterText(
        profile.currentLocation ?? undefined,
        outlinePlayer?.currentLocation,
        state.currentLocation,
        base.currentLocation,
      ) ?? "";

    state.character = {
      ...base,
      name:
        pickMeaningfulCharacterText(
          visible.name,
          toStringOrUndefined(profileLegacy.name),
          outlineVisible.name,
          toStringOrUndefined(outlineProfileLegacy?.name),
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
      gender,
      profession,
      background,
      race,
    };

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
      profileAge: toStringOrUndefined(profileLegacy.age),
      outlineAge: outlineVisible.age,
      outlineProfileAge: toStringOrUndefined(outlineProfileLegacy?.age),
    });
    warnMissingPlayerRequiredField("race", state.character.race, {
      source: "playerBundle",
      playerActorId: state.playerActorId,
      visibleRace: visible.race,
      profileRace: toStringOrUndefined(profileLegacy.race),
      outlineRace: outlineVisible.race,
      outlineProfileRace: toStringOrUndefined(outlineProfileLegacy?.race),
    });
    warnMissingPlayerRequiredField("gender", state.character.gender, {
      source: "playerBundle",
      playerActorId: state.playerActorId,
      visibleGender: visible.gender,
      profileGender: toStringOrUndefined(profileLegacy.gender),
      outlineGender: outlineVisible.gender,
      outlineProfileGender: toStringOrUndefined(outlineProfileLegacy?.gender),
      inferredGenderFromLegacyRace,
    });
  }

  // Derive NPC list for sidebar panels from actor bundles.
  state.npcs = bundles
    .filter((bundle) => bundle.profile.kind === "npc")
    .map((bundle) =>
      projectNpcForObserver(bundle.profile, state.playerActorId),
    );

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
    if (outline.narrativeScale) {
      state.narrativeScale = outline.narrativeScale;
    }

    const outlineVisible = outline.player?.profile?.visible ?? {};
    const outlineProfile = outline.player?.profile;
    const outlineProfileLegacy: JsonObject | null = isRecord(outlineProfile)
      ? outlineProfile
      : null;
    const currentCharacter: CharacterStatus =
      state.character ?? DEFAULT_CHARACTER;
    const inferredGenderFromOutlineRace = inferLegacyGenderFromRace(
      outlineVisible.race,
      toStringOrUndefined(outlineProfileLegacy?.race),
      currentCharacter.race,
    );

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
          toStringOrUndefined(outlineProfileLegacy?.age),
        ) ?? "",
      gender:
        pickMeaningfulCharacterText(
          currentCharacter.gender,
          outlineVisible.gender,
          toStringOrUndefined(outlineProfileLegacy?.gender),
          inferredGenderFromOutlineRace,
        ) ?? "",
      profession:
        pickMeaningfulCharacterText(
          currentCharacter.profession,
          outlineVisible.profession,
          outlineVisible.roleTag,
          toStringOrUndefined(outlineProfileLegacy?.profession),
          toStringOrUndefined(outlineProfileLegacy?.roleTag),
        ) ?? "",
      race:
        pickMeaningfulCharacterText(
          toRaceOnlyCharacterText(currentCharacter.race),
          toRaceOnlyCharacterText(outlineVisible.race),
          toRaceOnlyCharacterText(
            toStringOrUndefined(outlineProfileLegacy?.race),
          ),
        ) ?? "",
      background:
        pickMeaningfulCharacterText(
          currentCharacter.background,
          outlineVisible.background,
          toStringOrUndefined(outlineProfileLegacy?.background),
        ) ?? "",
      currentLocation:
        pickMeaningfulCharacterText(
          currentCharacter.currentLocation,
          outlineProfile?.currentLocation ?? undefined,
          state.currentLocation,
        ) ?? "",
    };

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
      outlineProfileAge: toStringOrUndefined(outlineProfileLegacy?.age),
    });
    warnMissingPlayerRequiredField("race", state.character.race, {
      source: "outlineFallback",
      playerActorId: state.playerActorId,
      outlineRace: outlineVisible.race,
      outlineProfileRace: toStringOrUndefined(outlineProfileLegacy?.race),
    });
    warnMissingPlayerRequiredField("gender", state.character.gender, {
      source: "outlineFallback",
      playerActorId: state.playerActorId,
      outlineGender: outlineVisible.gender,
      outlineProfileGender: toStringOrUndefined(outlineProfileLegacy?.gender),
      inferredGenderFromOutlineRace,
    });
  }

  // Fallback: if the save has an outline but no conversation index/turns,
  // synthesize the opening narrative as the first model segment so the UI
  // doesn't get stuck on "journey not started".
  if (state.outline) {
    const hasAnyNodes = state.nodes && Object.keys(state.nodes).length > 0;
    const opening = parseOpeningNarrative(state.outline.openingNarrative);
    const hasOpening = Boolean(opening);

    if (!hasAnyNodes && opening && hasOpening) {
      const firstNodeId = "model-fork-0/turn-0";
      const openingNode: StorySegment = {
        id: firstNodeId,
        parentId: null,
        text: opening.narrative,
        choices: opening.choices,
        imagePrompt: opening.imagePrompt || "",
        role: "model",
        timestamp: Date.now(),
        segmentIdx: 0,
        atmosphere: opening.atmosphere,
        narrativeTone: opening.narrativeTone,
        ending: opening.ending,
        forceEnd: opening.forceEnd,
      };
      state.nodes = {
        [firstNodeId]: openingNode,
      };
      state.activeNodeId = firstNodeId;
      state.rootNodeId = firstNodeId;
      state.currentFork = [openingNode];
      state.forkId = 0;
      state.turnNumber = 0;
    } else if (hasAnyNodes && !state.activeNodeId) {
      // If nodes exist but active pointer is missing, pick the latest model segment.
      const modelSegments = Object.values(state.nodes).filter(
        (seg): seg is StorySegment => Boolean(seg) && seg.role === "model",
      );
      if (modelSegments.length > 0) {
        modelSegments.sort((a, b) => (a.segmentIdx ?? 0) - (b.segmentIdx ?? 0));
        const last = modelSegments[modelSegments.length - 1];
        state.activeNodeId = last.id;
        state.rootNodeId = state.rootNodeId || modelSegments[0].id;
        state.currentFork = deriveHistory(state.nodes, last.id);
      }
    }
  }

  return state;
};
