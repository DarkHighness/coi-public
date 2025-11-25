import { useState } from "react";
import {
  GameState,
  StoryOutline,
  CharacterStatus,
  AliveEntities,
} from "../types";
import { DEFAULT_CHARACTER } from "../utils/constants";

// Default empty alive entities
const EMPTY_ALIVE_ENTITIES: AliveEntities = {
  inventory: [],
  relationships: [],
  locations: [],
  quests: [],
  knowledge: [],
  timeline: [],
  skills: [],
  conditions: [],
  hiddenTraits: [],
  causalChains: [],
};

const INITIAL_STATE: GameState = {
  nodes: {},
  activeNodeId: null,
  rootNodeId: null,
  inventory: [],
  relationships: [],
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
    relationships: { pinnedIds: [], customOrder: [] },
    knowledge: { pinnedIds: [], customOrder: [] },
    sidebarCollapsed: false,
    timelineCollapsed: false,
  },

  outline: null,
  summaries: [],
  lastSummarizedIndex: 0,
  isProcessing: false,
  isImageGenerating: false,
  error: null,
  theme: "fantasy",
  atmosphere: "quiet", // Unified atmosphere
  generatingNodeId: null,
  totalTokens: 0,
  logs: [],
  time: "Day 1, 08:00",

  // New World System Fields
  nextIds: {
    item: 1,
    npc: 1,
    location: 1,
    knowledge: 1000,
    quest: 1000,
    faction: 1000,
    timeline: 1,
    causalChain: 1,
    skill: 1,
    condition: 1,
    hiddenTrait: 1,
  },
  timeline: [],
  causalChains: [],

  // Context Priority System
  aliveEntities: EMPTY_ALIVE_ENTITIES,
  turnNumber: 0,
};

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);

  const resetState = (theme: string) => {
    setGameState({
      ...INITIAL_STATE,
      theme: theme,
      atmosphere: "quiet", // Default atmosphere
      // Ensure explicit reset of all accumulation fields
      summaries: [],
      nodes: {},
      rootNodeId: null,
      activeNodeId: null,
      outline: null,
      totalTokens: 0,
      logs: [],
      // Reset context priority system
      aliveEntities: EMPTY_ALIVE_ENTITIES,
      turnNumber: 0,
    });
  };

  const updateCharacter = (char: CharacterStatus) => {
    setGameState((prev) => ({ ...prev, character: char }));
  };

  return {
    gameState,
    setGameState,
    resetState,
    updateCharacter,
  };
};
