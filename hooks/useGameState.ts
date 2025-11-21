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

  // Location System
  currentLocation: "Unknown",
  knownLocations: [],
  locations: [],

  outline: null,
  summaries: [],
  lastSummarizedIndex: 0,
  isProcessing: false,
  isImageGenerating: false,
  error: null,
  theme: "fantasy",
  totalTokens: 0,
  logs: [],
};

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);

  const resetState = (theme: string) => {
    setGameState({
      ...INITIAL_STATE,
      theme: theme,
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
