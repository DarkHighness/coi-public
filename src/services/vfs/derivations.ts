import type {
  AtmosphereObject,
  CausalChain,
  CharacterStatus,
  Faction,
  GameState,
  InventoryItem,
  KnowledgeEntry,
  Location,
  NPC,
  Quest,
  TimelineEvent,
} from "@/types";
import { DEFAULT_CHARACTER } from "@/utils/constants";
import type { VfsFile, VfsFileMap } from "./types";
import { normalizeVfsPath } from "./utils";

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

export const deriveGameStateFromVfs = (files: VfsFileMap): GameState => {
  const state = createBaseGameState();
  const entries = Object.values(files).sort((a, b) =>
    a.path.localeCompare(b.path),
  );

  for (const file of entries) {
    const normalizedPath = normalizeVfsPath(file.path);
    const data = parseJsonFile(file);
    if (data === null) {
      continue;
    }

    if (normalizedPath === "world/global.json") {
      const globalData = data as {
        time?: string;
        theme?: string;
        currentLocation?: string;
        atmosphere?: AtmosphereObject;
        turnNumber?: number;
        forkId?: number;
      };
      if (typeof globalData.time === "string") {
        state.time = globalData.time;
      }
      if (typeof globalData.theme === "string") {
        state.theme = globalData.theme;
      }
      if (typeof globalData.currentLocation === "string") {
        state.currentLocation = globalData.currentLocation;
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
      continue;
    }

    if (normalizedPath === "world/character.json") {
      state.character = data as CharacterStatus;
      continue;
    }

    if (normalizedPath.startsWith("world/inventory/")) {
      state.inventory.push(data as InventoryItem);
      continue;
    }

    if (normalizedPath.startsWith("world/npcs/")) {
      state.npcs.push(data as NPC);
      continue;
    }

    if (normalizedPath.startsWith("world/quests/")) {
      state.quests.push(data as Quest);
      continue;
    }

    if (normalizedPath.startsWith("world/locations/")) {
      state.locations.push(data as Location);
      continue;
    }

    if (normalizedPath.startsWith("world/knowledge/")) {
      state.knowledge.push(data as KnowledgeEntry);
      continue;
    }

    if (normalizedPath.startsWith("world/factions/")) {
      state.factions.push(data as Faction);
      continue;
    }

    if (normalizedPath.startsWith("world/timeline/")) {
      state.timeline.push(data as TimelineEvent);
      continue;
    }

    if (normalizedPath.startsWith("world/causal_chains/")) {
      state.causalChains.push(data as CausalChain);
    }
  }

  return state;
};
