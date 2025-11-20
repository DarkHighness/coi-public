
import { useState } from 'react';
import { GameState, StoryOutline, CharacterStatus } from '../types';
import { DEFAULT_CHARACTER } from '../utils/constants';

const INITIAL_STATE: GameState = {
  nodes: {},
  activeNodeId: null,
  rootNodeId: null,
  inventory: [],
  relationships: [],
  currentQuest: "Initializing...",
  character: DEFAULT_CHARACTER,
  
  // Location System
  currentLocation: "Unknown",
  knownLocations: [],

  outline: null,
  accumulatedSummary: "",
  isProcessing: false,
  isImageGenerating: false,
  error: null,
  theme: 'fantasy',
  totalTokens: 0,
  logs: []
};

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);

  const resetState = (theme: string) => {
    setGameState({
      ...INITIAL_STATE,
      theme: theme,
      currentQuest: "Initializing...",
      // Ensure explicit reset of all accumulation fields
      accumulatedSummary: "",
      nodes: {},
      rootNodeId: null,
      activeNodeId: null,
      outline: null,
      totalTokens: 0,
      logs: []
    });
  };

  const updateCharacter = (char: CharacterStatus) => {
      setGameState(prev => ({ ...prev, character: char }));
  };

  return {
    gameState,
    setGameState,
    resetState,
    updateCharacter
  };
};