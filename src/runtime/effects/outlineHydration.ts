import type { TFunction } from "i18next";
import { createStateSnapshot } from "../../utils/snapshotManager";
import { normalizeAtmosphere } from "../../utils/constants/atmosphere";
import { getThemeName } from "../../services/ai/utils";
import type { GameState, ResolvedThemeConfig, StorySegment } from "../../types";
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
  outline: any;
  logs: any[];
  themeConfig: ResolvedThemeConfig;
  language: string;
  customContext?: string;
  themeOverride?: string;
  seedImageId?: string;
  clearLiveToolCalls?: boolean;
}

interface BuildOpeningNodeOptions {
  outline: any;
  baseState: GameState;
  theme: string;
  t: TFunction;
  customContext?: string;
  includeCustomContextInPrompt?: boolean;
  seedImageId?: string;
}

interface PersistOutlineCheckpointOptions {
  outline: any;
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

function parseOutlinePlaceholderDraft(draft: unknown): any | null {
  if (!draft || typeof draft !== "object") {
    return null;
  }

  const path =
    typeof (draft as any).path === "string" ? (draft as any).path.trim() : "";
  const markdown =
    typeof (draft as any).markdown === "string"
      ? (draft as any).markdown
      : "";

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

export function calculateAccumulatedTokens(logs: any[]): TokenUsageAccumulator {
  return logs.reduce(
    (acc, log) => ({
      promptTokens: acc.promptTokens + (log.usage?.promptTokens || 0),
      completionTokens:
        acc.completionTokens + (log.usage?.completionTokens || 0),
      totalTokens: acc.totalTokens + (log.usage?.totalTokens || 0),
      cacheRead: acc.cacheRead + (log.usage?.cacheRead || 0),
      cacheWrite: acc.cacheWrite + (log.usage?.cacheWrite || 0),
    }),
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
  const player = (outline as any).player;
  const npcBundles: any[] = Array.isArray((outline as any).npcs)
    ? ((outline as any).npcs as any[])
    : [];
  const placeholders = Array.isArray((outline as any).placeholders)
    ? ((outline as any).placeholders as any[])
        .map((draft) => parseOutlinePlaceholderDraft(draft))
        .filter(Boolean)
    : [];
  const visible = (player?.profile as any)?.visible ?? {};

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
    actors: [player, ...npcBundles].filter(Boolean),
    playerActorId: (player?.profile as any)?.id ?? "char:player",
    placeholders,
    locationItemsByLocationId: {},
    character: {
      ...baseState.character,
      name: visible.name ?? baseState.character.name,
      title: visible.title ?? baseState.character.title,
      status: visible.status ?? baseState.character.status,
      attributes: Array.isArray(visible.attributes) ? visible.attributes : [],
      appearance: visible.appearance ?? baseState.character.appearance,
      age: visible.age ?? baseState.character.age ?? "Unknown",
      profession:
        visible.profession ?? baseState.character.profession ?? "Unknown",
      background: visible.background ?? baseState.character.background ?? "",
      race: visible.race ?? baseState.character.race ?? "Unknown",
      currentLocation:
        (player?.profile as any)?.currentLocation ?? baseState.currentLocation,
      skills: Array.isArray(player?.skills) ? player.skills : [],
      conditions: Array.isArray(player?.conditions) ? player.conditions : [],
      hiddenTraits: Array.isArray(player?.traits) ? player.traits : [],
    },
    inventory: Array.isArray(player?.inventory)
      ? player.inventory.map((item: any) => ({
          ...item,
          createdAt: item.createdAt ?? now,
          lastModified: item.lastModified ?? now,
        }))
      : [],
    npcs: npcBundles.map((bundle) => bundle?.profile).filter(Boolean),
    quests: (outline.quests || []).map((quest: any) => ({
      ...quest,
      status: "active",
      createdAt: quest.createdAt ?? now,
      lastModified: quest.lastModified ?? now,
    })),
    currentLocation:
      (player?.profile as any)?.currentLocation ||
      outline.locations?.[0]?.id ||
      "Unknown",
    locations: (outline.locations || []).map((loc: any, index: number) => ({
      ...loc,
      isVisited: index === 0,
      createdAt: loc.createdAt ?? now,
    })),
    knowledge: (outline.knowledge || []).map((entry: any) => ({
      ...entry,
      createdAt: entry.createdAt ?? now,
      lastModified: entry.lastModified ?? now,
    })),
    factions: (outline.factions || []).map((faction: any) => ({
      ...faction,
    })),
    timeline: (outline.timeline || []).map((event: any) => ({
      ...event,
      category: event.category || "world_event",
    })),
    isProcessing: true,
    logs: [...logs, ...(baseState.logs || [])],
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
    choices: (openingNarrative.choices || []).map((choice: any) => ({
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
