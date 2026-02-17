import type { EntityPresentationMap, GameState, StorySegment } from "../types";
import { deriveHistory } from "../utils/storyUtils";

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

const normalizeCharacterValue = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
};

const isPlaceholderCharacterValue = (value: unknown): boolean => {
  const normalized = normalizeCharacterValue(value);
  if (!normalized) {
    return true;
  }
  return PLACEHOLDER_CHARACTER_VALUES.has(normalized.toLowerCase());
};

const mergeCharacterWithFallback = (
  baseCharacter: GameState["character"],
  derivedCharacter: GameState["character"],
): GameState["character"] => {
  type CharacterFallbackField =
    | "title"
    | "profession"
    | "race"
    | "age"
    | "status"
    | "currentLocation";
  const nextCharacter: GameState["character"] = { ...derivedCharacter };

  const fallbackFields: CharacterFallbackField[] = [
    "title",
    "profession",
    "race",
    "age",
    "status",
    "currentLocation",
  ];

  for (const field of fallbackFields) {
    const derivedValue = derivedCharacter[field];
    const baseValue = baseCharacter[field];
    if (
      isPlaceholderCharacterValue(derivedValue) &&
      !isPlaceholderCharacterValue(baseValue)
    ) {
      nextCharacter[field] = baseValue;
    }
  }

  return nextCharacter;
};

const mergeNodeExtras = (
  base: StorySegment | undefined,
  derived: StorySegment,
): StorySegment => {
  if (!base) {
    return derived;
  }

  return {
    ...derived,
    imagePrompt: derived.imagePrompt || base.imagePrompt,
    imageUrl: derived.imageUrl || base.imageUrl,
    imageId: derived.imageId || base.imageId,
    veoScript: derived.veoScript || base.veoScript,
    audioKey: derived.audioKey || base.audioKey,
    summarySnapshot: derived.summarySnapshot ?? base.summarySnapshot,
    usage: derived.usage ?? base.usage,
    playerRate: derived.playerRate ?? base.playerRate,
    summaries: derived.summaries ?? base.summaries,
    summarizedIndex: derived.summarizedIndex ?? base.summarizedIndex,
    stateSnapshot: derived.stateSnapshot ?? base.stateSnapshot,
  };
};

const mergeNodes = (
  baseNodes: Record<string, StorySegment>,
  derivedNodes: Record<string, StorySegment>,
): Record<string, StorySegment> => {
  const merged: Record<string, StorySegment> = {};
  for (const [id, node] of Object.entries(derivedNodes)) {
    merged[id] = mergeNodeExtras(baseNodes[id], node);
  }
  return merged;
};

const getValidatedUiState = (uiState: GameState["uiState"]): GameState["uiState"] => {
  if (!uiState || typeof uiState !== "object") {
    throw new Error("mergeDerivedViewState requires a valid uiState");
  }
  return uiState;
};

type EntityPresentationKind =
  | "inventory"
  | "npcs"
  | "locations"
  | "knowledge"
  | "quests"
  | "factions"
  | "timeline"
  | "characterSkills"
  | "characterConditions"
  | "characterTraits";

const PRESENTATION_IGNORED_FIELDS = new Set(["highlight", "lastAccess"]);

const makeEntityPresentationKey = (
  kind: EntityPresentationKind,
  id: string,
): string => `${kind}:${id}`;

const normalizeEntityId = (entry: unknown): string | null => {
  const maybeId = (entry as { id?: unknown } | null | undefined)?.id;
  if (typeof maybeId !== "string") {
    return null;
  }
  const trimmed = maybeId.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stableSerializeWithoutPresentation = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerializeWithoutPresentation(entry)).join(",")}]`;
  }

  if (isRecord(value)) {
    const entries = Object.entries(value)
      .filter(([key]) => !PRESENTATION_IGNORED_FIELDS.has(key))
      .sort(([left], [right]) => left.localeCompare(right));

    const serializedEntries = entries.map(
      ([key, entryValue]) =>
        `${JSON.stringify(key)}:${stableSerializeWithoutPresentation(entryValue)}`,
    );
    return `{${serializedEntries.join(",")}}`;
  }

  if (value === undefined) {
    return "undefined";
  }

  const serialized = JSON.stringify(value);
  return typeof serialized === "string" ? serialized : String(value);
};

const applyEntityPresentationToList = <T>(
  kind: EntityPresentationKind,
  baseListInput: T[] | undefined,
  derivedListInput: T[] | undefined,
  nextPresentation: EntityPresentationMap,
  existingKeys: Set<string>,
  autoHighlight: boolean,
): T[] => {
  const baseList = Array.isArray(baseListInput) ? baseListInput : [];
  const derivedList = Array.isArray(derivedListInput) ? derivedListInput : [];
  if (derivedList.length === 0) {
    return derivedList;
  }

  const previousById = new Map<string, unknown>();
  for (const entry of baseList) {
    const id = normalizeEntityId(entry);
    if (id) {
      previousById.set(id, entry);
    }
  }

  return derivedList.map((entry) => {
    const id = normalizeEntityId(entry);
    if (!id) {
      return entry;
    }

    const key = makeEntityPresentationKey(kind, id);
    existingKeys.add(key);

    const previous = previousById.get(id);
    const changed =
      previous === undefined ||
      stableSerializeWithoutPresentation(previous) !==
        stableSerializeWithoutPresentation(entry);

    if (autoHighlight && changed) {
      const previousPresentation = nextPresentation[key] ?? {};
      const nextEntry = {
        ...previousPresentation,
        highlight: true,
      } as EntityPresentationMap[string];
      if ("lastAccess" in nextEntry) {
        delete nextEntry.lastAccess;
      }
      nextPresentation[key] = {
        ...nextEntry,
      };
    }

    const presentation = nextPresentation[key];
    const highlight = nextPresentation[key]?.highlight;
    if (isRecord(entry)) {
      const withPresentation = { ...(entry as Record<string, unknown>) };
      if (typeof highlight === "boolean") {
        withPresentation.highlight = highlight;
      }
      if (presentation?.lastAccess) {
        withPresentation.lastAccess = presentation.lastAccess;
      } else if ("lastAccess" in withPresentation) {
        delete withPresentation.lastAccess;
      }
      return withPresentation as T;
    }

    return entry;
  });
};

export const mergeDerivedViewState = (
  base: GameState,
  derived: GameState,
  options?: { resetRuntime?: boolean },
): GameState => {
  const mergedNodes = mergeNodes(base.nodes, derived.nodes);
  const activeNodeId = derived.activeNodeId;
  const resetRuntime = options?.resetRuntime === true;
  const baseUiState = getValidatedUiState(base.uiState);
  const autoHighlight = !resetRuntime;
  const nextPresentation: EntityPresentationMap = {
    ...(baseUiState.entityPresentation ?? {}),
  };
  const existingPresentationKeys = new Set<string>();

  const mergedCharacter = mergeCharacterWithFallback(
    base.character,
    derived.character,
  );

  const inventory = applyEntityPresentationToList(
    "inventory",
    base.inventory,
    derived.inventory,
    nextPresentation,
    existingPresentationKeys,
    autoHighlight,
  );
  const npcs = applyEntityPresentationToList(
    "npcs",
    base.npcs,
    derived.npcs,
    nextPresentation,
    existingPresentationKeys,
    autoHighlight,
  );
  const locations = applyEntityPresentationToList(
    "locations",
    base.locations,
    derived.locations,
    nextPresentation,
    existingPresentationKeys,
    autoHighlight,
  );
  const knowledge = applyEntityPresentationToList(
    "knowledge",
    base.knowledge,
    derived.knowledge,
    nextPresentation,
    existingPresentationKeys,
    autoHighlight,
  );
  const quests = applyEntityPresentationToList(
    "quests",
    base.quests,
    derived.quests,
    nextPresentation,
    existingPresentationKeys,
    autoHighlight,
  );
  const factions = applyEntityPresentationToList(
    "factions",
    base.factions,
    derived.factions,
    nextPresentation,
    existingPresentationKeys,
    autoHighlight,
  );
  const timeline = applyEntityPresentationToList(
    "timeline",
    base.timeline,
    derived.timeline,
    nextPresentation,
    existingPresentationKeys,
    autoHighlight,
  );

  const baseHiddenTraits = Array.isArray(base.character.hiddenTraits)
    ? base.character.hiddenTraits
    : undefined;
  const mergedHiddenTraits = Array.isArray(mergedCharacter.hiddenTraits)
    ? mergedCharacter.hiddenTraits
    : undefined;

  const nextCharacter: GameState["character"] = {
    ...mergedCharacter,
    skills: applyEntityPresentationToList(
      "characterSkills",
      base.character.skills,
      mergedCharacter.skills,
      nextPresentation,
      existingPresentationKeys,
      autoHighlight,
    ),
    conditions: applyEntityPresentationToList(
      "characterConditions",
      base.character.conditions,
      mergedCharacter.conditions,
      nextPresentation,
      existingPresentationKeys,
      autoHighlight,
    ),
    hiddenTraits: applyEntityPresentationToList(
      "characterTraits",
      baseHiddenTraits,
      mergedHiddenTraits,
      nextPresentation,
      existingPresentationKeys,
      autoHighlight,
    ),
  };

  for (const key of Object.keys(nextPresentation)) {
    if (!existingPresentationKeys.has(key)) {
      delete nextPresentation[key];
    }
  }

  return {
    ...derived,
    nodes: mergedNodes,
    currentFork: activeNodeId ? deriveHistory(mergedNodes, activeNodeId) : [],
    inventory,
    npcs,
    locations,
    knowledge,
    quests,
    factions,
    timeline,
    character: nextCharacter,
    uiState: {
      ...baseUiState,
      entityPresentation: nextPresentation,
    },
    summaries: derived.summaries,
    lastSummarizedIndex: derived.lastSummarizedIndex,
    outline: derived.outline ?? base.outline,
    outlineConversation:
      derived.outlineConversation ?? base.outlineConversation,
    themeConfig: derived.themeConfig ?? base.themeConfig,
    customContext: derived.customContext ?? base.customContext,
    language: derived.language || base.language,
    customRules: derived.customRules,
    playerProfile: derived.playerProfile ?? base.playerProfile,
    narrativeScale: derived.narrativeScale ?? base.narrativeScale,
    seedImageId: derived.seedImageId ?? base.seedImageId,
    initialPrompt: derived.initialPrompt ?? base.initialPrompt,
    veoScript: derived.veoScript ?? base.veoScript,
    tokenUsage: base.tokenUsage,
    logs: base.logs,
    isProcessing: resetRuntime ? false : base.isProcessing,
    isImageGenerating: resetRuntime ? false : base.isImageGenerating,
    generatingNodeId: resetRuntime ? null : base.generatingNodeId,
    error: resetRuntime ? null : base.error,
    godMode: base.godMode,
    unlockMode: base.unlockMode,
  };
};
