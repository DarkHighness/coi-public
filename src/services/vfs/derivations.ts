import type {
  ActorBundle,
  AtmosphereObject,
  CausalChain,
  CharacterStatus,
  Faction,
  GameState,
  InventoryItem,
  KnowledgeEntry,
  Location,
  NPC,
  Placeholder,
  Quest,
  TimelineEvent,
} from "@/types";
import { DEFAULT_CHARACTER } from "@/utils/constants";
import { deriveHistory } from "@/utils/storyUtils";
import type { StorySegment } from "@/types";
import type { VfsFile, VfsFileMap } from "./types";
import { normalizeVfsPath } from "./utils";
import { readConversationIndex, readTurnFile } from "./conversation";
import { readOutlineFile, readOutlineProgress } from "./outline";

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

const createBaseGameState = (): GameState => ({
  nodes: {},
  activeNodeId: null,
  rootNodeId: null,
  currentFork: [],
  actors: [],
  playerActorId: "char:player",
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
  tokenUsage: {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    cacheRead: 0,
    cacheWrite: 0,
  },
  logs: [],
  timeline: [],
  causalChains: [],
  turnNumber: 0,
  forkId: 0,
  forkTree: DEFAULT_FORK_TREE,
  customRules: [],
});

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

const stripCurrentPrefix = (path: string): string =>
  path.startsWith("current/") ? path.slice("current/".length) : path;

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
      choices: turn.assistant.choices || [],
      imagePrompt: "",
      role: "model",
      timestamp: turn.createdAt,
      segmentIdx,
      atmosphere: turn.assistant.atmosphere as any,
      narrativeTone: turn.assistant.narrativeTone,
      ending: (turn.assistant.ending as any) || "continue",
      forceEnd: turn.assistant.forceEnd,
    };
    segmentIdx += 1;
  }

  const activeNodeId = index.activeTurnId
    ? `model-${index.activeTurnId}`
    : null;
  const rootTurnId = index.rootTurnIdByFork?.[String(activeForkId)] || null;
  const rootNodeId = rootTurnId ? `model-${rootTurnId}` : null;
  const currentFork = activeNodeId
    ? deriveHistory(nodes, activeNodeId)
    : [];
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

  for (const file of entries) {
    const normalizedPath = normalizeVfsPath(file.path);
    const pathWithoutCurrent = stripCurrentPrefix(normalizedPath);
    const data = parseJsonFile(file);
    if (data === null) {
      continue;
    }

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
        seedImageId?: string;
        narrativeScale?: GameState["narrativeScale"];
      };
      if (typeof globalData.time === "string" && globalData.time.trim() !== "") {
        state.time = globalData.time.trim();
      }
      if (typeof globalData.theme === "string" && globalData.theme.trim() !== "") {
        state.theme = globalData.theme.trim();
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
      if (typeof globalData.seedImageId === "string") {
        state.seedImageId = globalData.seedImageId;
      }
      if (typeof globalData.narrativeScale === "string") {
        state.narrativeScale = globalData.narrativeScale;
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

    // No compatibility: reject legacy layouts immediately.
    if (
      pathWithoutCurrent === "world/character.json" ||
      pathWithoutCurrent.startsWith("world/character/") ||
      pathWithoutCurrent.startsWith("world/inventory/") ||
      pathWithoutCurrent.startsWith("world/npcs/")
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

    if (pathWithoutCurrent === "world/player_profile.json") {
      const profile = (data as { profile?: unknown })?.profile;
      if (typeof profile === "string") {
        state.playerProfile = profile;
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
      state.quests.push(data as Quest);
      continue;
    }

    if (pathWithoutCurrent.startsWith("world/locations/")) {
      state.locations.push(data as Location);
      continue;
    }

    if (pathWithoutCurrent.startsWith("world/knowledge/")) {
      state.knowledge.push(data as KnowledgeEntry);
      continue;
    }

    if (pathWithoutCurrent.startsWith("world/factions/")) {
      state.factions.push(data as Faction);
      continue;
    }

    if (pathWithoutCurrent.startsWith("world/timeline/")) {
      state.timeline.push(data as TimelineEvent);
      continue;
    }

    if (pathWithoutCurrent.startsWith("world/causal_chains/")) {
      state.causalChains.push(data as CausalChain);
    }
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
    bundles.find((b) => (b?.profile as any)?.id === state.playerActorId) ?? null;
  if (playerBundle) {
    state.inventory = Array.isArray(playerBundle.inventory)
      ? (playerBundle.inventory as InventoryItem[])
      : [];

    // Backfill CharacterStatus for legacy UI panels (CharacterPanel).
    const visible = (playerBundle.profile as any)?.visible ?? {};
    const base = (state.character ?? DEFAULT_CHARACTER) as any;
    state.character = {
      ...base,
      name: visible.name ?? base.name,
      title: visible.title ?? base.title,
      status: visible.status ?? base.status,
      appearance: visible.appearance ?? base.appearance,
      attributes: Array.isArray(visible.attributes) ? visible.attributes : [],
      skills: Array.isArray(playerBundle.skills) ? playerBundle.skills : [],
      conditions: Array.isArray(playerBundle.conditions)
        ? playerBundle.conditions
        : [],
      hiddenTraits: Array.isArray(playerBundle.traits) ? playerBundle.traits : [],
      currentLocation:
        (playerBundle.profile as any)?.currentLocation ?? state.currentLocation,
      age: visible.age ?? "Unknown",
      profession: visible.profession ?? "Unknown",
      background: visible.background ?? "",
      race: visible.race ?? "Unknown",
    } as any;
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
