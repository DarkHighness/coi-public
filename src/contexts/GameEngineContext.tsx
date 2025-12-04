/**
 * GameEngineContext.tsx
 *
 * Global context provider for game engine state and actions.
 * This replaces the prop-drilling pattern by providing game engine access
 * to any component in the tree.
 *
 * Usage:
 *   import { useGameEngineContext } from '../contexts/GameEngineContext';
 *   const { gameState, handleAction, aiSettings } = useGameEngineContext();
 */

import React, { createContext, useContext, ReactNode, useMemo } from "react";
import { useGameEngine } from "../hooks/useGameEngine";
import { THEMES, ENV_THEMES } from "../utils/constants";
import { getThemeKeyForAtmosphere } from "../utils/constants/atmosphere";
import type {
  AISettings,
  StorySegment,
  LanguageCode,
  GameState,
  SaveSlot,
  ActionResult,
  ThemeConfig,
} from "../types";
import type { OutlinePhaseProgress } from "../services/aiService";

// ============================================================================
// Types
// ============================================================================

/** Theme mode options */
export type ThemeMode = "day" | "night" | "system";

/** Environment theme configuration (re-export from types) */
export type { ThemeConfig as EnvThemeConfig } from "../types";

/**
 * Game Engine State - read-only values
 */
export interface GameEngineState {
  /** Current language setting */
  language: LanguageCode;
  /** Whether translation is in progress */
  isTranslating: boolean;
  /** Main game state object */
  gameState: GameState;
  /** Whether auto-save is in progress */
  isAutoSaving: boolean;
  /** Current AI settings */
  aiSettings: AISettings;
  /** Derived history from current active node */
  currentHistory: StorySegment[];
  /** All save slots */
  saveSlots: SaveSlot[];
  /** Currently active save slot ID */
  currentSlotId: string | null;
  /** Current theme mode (day/night/system) */
  themeMode: ThemeMode;
  /** Persistence error if any */
  persistenceError: string | null;
  /** Set of node IDs with failed image generation */
  failedImageNodes: Set<string>;
  /** Magic Mirror modal state */
  isMagicMirrorOpen: boolean;
  /** Magic Mirror image URL */
  magicMirrorImage: string | null;
  /** VeoScript modal state */
  isVeoScriptOpen: boolean;
  /** Settings modal state */
  isSettingsOpen: boolean;
  /** Current environment theme configuration (computed) */
  currentThemeConfig: ThemeConfig;
  /** Current theme font class (shortcut) */
  themeFont: string;
}

/**
 * Game Engine Actions - functions to modify state
 */
export interface GameEngineActions {
  /** Set language */
  setLanguage: (lang: LanguageCode) => void;
  /** Set game state directly */
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  /** Handle player action */
  handleAction: (
    action: string,
    isInit?: boolean,
    forceTheme?: string,
    fromNodeId?: string,
    preventFork?: boolean,
  ) => Promise<ActionResult | null>;
  /** Start a new game */
  startNewGame: (
    theme: string,
    customContext?: string,
    onStream?: (text: string) => void,
    onPhaseProgress?: (progress: OutlinePhaseProgress) => void,
  ) => Promise<void>;
  /** Resume outline generation from saved state */
  resumeOutlineGeneration: (
    onStream?: (text: string) => void,
    onPhaseProgress?: (progress: OutlinePhaseProgress) => void,
  ) => Promise<void>;
  /** Save AI settings */
  handleSaveSettings: (settings: AISettings) => void;
  /** Load a save slot */
  loadSlot: (id: string) => Promise<{
    success: boolean;
    hasOutline?: boolean;
    hasOutlineConversation?: boolean;
  }>;
  /** Delete a save slot */
  deleteSlot: (id: string) => void;
  /** Refresh save slots list (after import) */
  refreshSlots: () => Promise<SaveSlot[]>;
  /** Toggle theme mode */
  toggleThemeMode: () => void;
  /** Set theme mode */
  setThemeMode: (mode: ThemeMode) => void;
  /** Reset settings to default */
  resetSettings: () => void;
  /** Clear all saves - returns true if successful */
  clearAllSaves: () => Promise<boolean>;
  /** Hard reset (factory reset) */
  hardReset: () => void;
  /** Navigate to a specific node in story tree */
  navigateToNode: (nodeId: string, isFork?: boolean) => void;
  /** Generate image for a specific node */
  generateImageForNode: (
    nodeId: string,
    nodeOverride?: StorySegment,
    isManualClick?: boolean,
  ) => Promise<void>;
  /** Update audio for a node */
  updateNodeAudio: (nodeId: string, audioUrl: string | null) => void;
  /** Trigger manual save */
  triggerSave: () => void;
  /** Force update game state with AI */
  handleForceUpdate: (prompt: string) => void;
  /** Set Magic Mirror modal state */
  setIsMagicMirrorOpen: (open: boolean) => void;
  /** Set Magic Mirror image */
  setMagicMirrorImage: (image: string | null) => void;
  /** Set VeoScript modal state */
  setIsVeoScriptOpen: (open: boolean) => void;
  /** Set Settings modal state */
  setIsSettingsOpen: (open: boolean) => void;
}

/**
 * Combined context value
 */
export interface GameEngineContextValue {
  state: GameEngineState;
  actions: GameEngineActions;
}

// ============================================================================
// Context
// ============================================================================

const GameEngineContext = createContext<GameEngineContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface GameEngineProviderProps {
  children: ReactNode;
}

export function GameEngineProvider({ children }: GameEngineProviderProps) {
  const engine = useGameEngine();

  // Compute current theme configuration
  // - If lockEnvTheme is enabled, use the story's fixed envTheme
  // - Otherwise, derive from atmosphere dynamically
  const currentThemeConfig = useMemo(() => {
    const currentStoryTheme = THEMES[engine.gameState.theme] || THEMES.fantasy;

    let currentEnvThemeKey: string;
    if (engine.aiSettings.lockEnvTheme) {
      // Locked: use story's fixed envTheme
      currentEnvThemeKey = currentStoryTheme.envTheme;
    } else {
      // Dynamic: derive from current atmosphere
      const currentAtmosphere =
        engine.gameState.atmosphere || currentStoryTheme.defaultAtmosphere;
      currentEnvThemeKey = getThemeKeyForAtmosphere(currentAtmosphere);
    }

    return ENV_THEMES[currentEnvThemeKey] || ENV_THEMES.fantasy;
  }, [
    engine.gameState.theme,
    engine.gameState.atmosphere,
    engine.aiSettings.lockEnvTheme,
  ]);

  // Organize into state and actions
  const value: GameEngineContextValue = useMemo(
    () => ({
      state: {
        language: engine.language,
        isTranslating: engine.isTranslating,
        gameState: engine.gameState,
        isAutoSaving: engine.isAutoSaving,
        aiSettings: engine.aiSettings,
        currentHistory: engine.currentHistory,
        saveSlots: engine.saveSlots,
        currentSlotId: engine.currentSlotId,
        themeMode: engine.themeMode,
        persistenceError: engine.persistenceError,
        failedImageNodes: engine.failedImageNodes,
        isMagicMirrorOpen: engine.isMagicMirrorOpen,
        magicMirrorImage: engine.magicMirrorImage,
        isVeoScriptOpen: engine.isVeoScriptOpen,
        isSettingsOpen: engine.isSettingsOpen,
        currentThemeConfig,
        themeFont: currentThemeConfig.fontClass,
      },
      actions: {
        setLanguage: engine.setLanguage,
        setGameState: engine.setGameState,
        handleAction: engine.handleAction,
        startNewGame: engine.startNewGame,
        resumeOutlineGeneration: engine.resumeOutlineGeneration,
        handleSaveSettings: engine.handleSaveSettings,
        loadSlot: engine.loadSlot,
        deleteSlot: engine.deleteSlot,
        refreshSlots: engine.refreshSlots,
        toggleThemeMode: engine.toggleThemeMode,
        setThemeMode: engine.setThemeMode,
        resetSettings: engine.resetSettings,
        clearAllSaves: engine.clearAllSaves,
        hardReset: engine.hardReset,
        navigateToNode: engine.navigateToNode,
        generateImageForNode: engine.generateImageForNode,
        updateNodeAudio: engine.updateNodeAudio,
        triggerSave: engine.triggerSave,
        handleForceUpdate: engine.handleForceUpdate,
        setIsMagicMirrorOpen: engine.setIsMagicMirrorOpen,
        setMagicMirrorImage: engine.setMagicMirrorImage,
        setIsVeoScriptOpen: engine.setIsVeoScriptOpen,
        setIsSettingsOpen: engine.setIsSettingsOpen,
      },
    }),
    [engine, currentThemeConfig],
  );

  return (
    <GameEngineContext.Provider value={value}>
      {children}
    </GameEngineContext.Provider>
  );
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Use game engine context (throws if not within provider)
 */
export function useGameEngineContext(): GameEngineContextValue {
  const context = useContext(GameEngineContext);
  if (!context) {
    throw new Error(
      "useGameEngineContext must be used within a GameEngineProvider",
    );
  }
  return context;
}

/**
 * Optional game engine context (returns null if not within provider)
 * Useful for components that may be rendered outside the game context
 */
export function useOptionalGameEngineContext(): GameEngineContextValue | null {
  return useContext(GameEngineContext);
}

/**
 * Convenience hook to get only state
 */
export function useGameEngineState(): GameEngineState {
  const { state } = useGameEngineContext();
  return state;
}

/**
 * Convenience hook to get only actions
 */
export function useGameEngineActions(): GameEngineActions {
  const { actions } = useGameEngineContext();
  return actions;
}
