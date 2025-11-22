import { useState } from "react";
import { GameState, StoryOutline, CharacterStatus } from "../types";
import { DEFAULT_CHARACTER } from "../utils/constants";

const INITIAL_STATE: GameState = {
  nodes: {},
  activeNodeId: null,
  rootNodeId: null,
  inventory: [],
  relationships: [],
  quests: [],
  character: DEFAULT_CHARACTER,
  knowledge: [], // Player's accumulated knowledge

  // Location System
  currentLocation: "Unknown",
  knownLocations: [],
  locations: [],

  uiState: {
    inventory: { pinnedIds: [], customOrder: [] },
    locations: { pinnedIds: [], customOrder: [] },
    relationships: { pinnedIds: [], customOrder: [] },
    knowledge: { pinnedIds: [], customOrder: [] },
  },

  outline: null,
  summaries: [],
  lastSummarizedIndex: 0,
  isProcessing: false,
  isImageGenerating: false,
  error: null,
  theme: "fantasy",
  envTheme: "fantasy",
  generatingNodeId: null,
  totalTokens: 0,
  logs: [],
  time: "",
};

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);

  const resetState = (theme: string) => {
    setGameState({
      ...INITIAL_STATE,
      theme: theme,
      envTheme: theme,
      // Ensure explicit reset of all accumulation fields
      summaries: [],
      nodes: {},
      rootNodeId: null,
      activeNodeId: null,
      outline: null,
      totalTokens: 0,
      logs: [],
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
