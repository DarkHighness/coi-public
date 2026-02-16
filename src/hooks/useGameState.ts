import { useState } from "react";
import { GameState, StoryOutline, CharacterStatus, ForkTree } from "../types";
import { DEFAULT_CHARACTER } from "../utils/constants";
import { DEFAULT_SAVE_PRESET_PROFILE } from "../services/ai/utils";

// Default fork tree (original timeline)
const INITIAL_FORK_TREE: ForkTree = {
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

const INITIAL_STATE: GameState = {
  nodes: {},
  activeNodeId: null,
  rootNodeId: null,
  currentFork: [],
  actors: [],
  playerActorId: "char:player",
  worldInfo: null,
  placeholders: [],
  locationItemsByLocationId: {},
  inventory: [],
  npcs: [],
  quests: [],
  factions: [], // Added factions
  character: DEFAULT_CHARACTER,
  knowledge: [], // Player's accumulated knowledge

  // Location System
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
    feedLayout: "scroll", // Default layout mode
    viewedSegmentId: undefined, // No segment viewed initially
  },

  outline: null,
  summaries: [],
  lastSummarizedIndex: 0,
  isProcessing: false,
  isImageGenerating: false,
  error: null,
  theme: "fantasy",
  atmosphere: { envTheme: "fantasy", ambience: "quiet" }, // Unified atmosphere
  generatingNodeId: null,

  // Game Context
  language: "zh", // Default language
  customContext: undefined, // No custom context by default
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
  time: "Day 1, 08:00",

  timeline: [],
  causalChains: [],

  turnNumber: 0,

  // Fork System
  forkId: 0,
  forkTree: INITIAL_FORK_TREE,

  // Custom Rules
  customRules: [],
};

export const createResetGameState = (theme: string): GameState => ({
  ...INITIAL_STATE,
  theme: theme,
  atmosphere: { envTheme: "fantasy", ambience: "quiet" }, // Default atmosphere
  // Ensure explicit reset of all accumulation fields
  summaries: [],
  nodes: {},
  rootNodeId: null,
  activeNodeId: null,
  outline: null,
  logs: [],
  liveToolCalls: [],
  turnNumber: 0,
  // Reset fork system
  forkId: 0,
  forkTree: INITIAL_FORK_TREE,
  // Reset outline conversation state (important for new game isolation)
  outlineConversation: undefined,
  // God mode and unlocked mode
  godMode: false,
  unlockMode: false,
  // Custom rules (preserve from previous or start empty)
  customRules: [],
  presetProfile: DEFAULT_SAVE_PRESET_PROFILE,
});

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);

  const resetState = (theme: string) => {
    setGameState(createResetGameState(theme));
  };

  const updateCharacter = (char: CharacterStatus) => {
    setGameState((prev) => {
      const newState = { ...prev, character: char };
      // Sync global location if character location changed
      if (
        char.currentLocation &&
        char.currentLocation !== prev.currentLocation
      ) {
        newState.currentLocation = char.currentLocation;
      }
      return newState;
    });
  };

  return {
    gameState,
    setGameState,
    resetState,
    updateCharacter,
  };
};
