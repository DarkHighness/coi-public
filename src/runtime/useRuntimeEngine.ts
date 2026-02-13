import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { StorySegment } from "../types";
import { useGameState } from "../hooks/useGameState";
import { useVfsPersistence } from "../hooks/useVfsPersistence";
import { useSettings } from "../hooks/useSettings";
import { THEMES, ENV_THEMES } from "../utils/constants";
import { deriveThemeVars } from "../utils/theme/deriveThemeVars";
import { getThemeKeyForAtmosphere } from "../utils/constants/atmosphere";
import { deriveHistory } from "../utils/storyUtils";
import { useGameAction } from "../hooks/useGameAction";

import { useToast } from "../contexts/ToastContext";
import { createDomainMutationActions } from "./effects/domainMutations";
import { createCommandActions } from "./effects/commandActions";
import { useImageGenerationQueue } from "./effects/imageGeneration";
import { createDomainUiActions } from "./effects/domainUiActions";
import { createLifecycleActions } from "./effects/lifecycleOrchestration";

export const useRuntimeEngine = () => {
  const { gameState, setGameState, resetState } = useGameState();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { showToast } = useToast();

  // Derive view from path
  const view = useMemo(() => {
    if (location.pathname === "/initializing") return "initializing";
    if (location.pathname === "/game") return "game";
    return "start";
  }, [location.pathname]);

  const {
    saveSlots,
    currentSlotId,
    setCurrentSlotId,
    createSaveSlot,
    renameSlot,
    loadSlot,
    deleteSlot,
    clearAllSaves,
    isAutoSaving,
    persistenceError,
    hardReset,
    saveToSlot,
    setSkipNextSave,
    triggerSave,
    refreshSlots,
    vfsSession,
    seedFromDefaults,
    restoreVfsToTurn,
  } = useVfsPersistence(gameState, setGameState, view);

  // Ref to access latest state in async callbacks/closures
  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const [isTranslating, setIsTranslating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Use settings hook for all settings management
  const {
    settings: aiSettings,
    updateSettings: handleSaveSettings,
    resetSettings,
    language,
    setLanguage,
    themeMode,
    setThemeMode: setThemeModeValue,
    toggleThemeMode,
  } = useSettings();

  const [isMagicMirrorOpen, setIsMagicMirrorOpen] = useState(false);
  const [isVeoScriptOpen, setIsVeoScriptOpen] = useState(false);
  const [magicMirrorImage, setMagicMirrorImage] = useState<string | null>(null);

  const currentHistory = useMemo(
    () => deriveHistory(gameState.nodes, gameState.activeNodeId),
    [gameState.nodes, gameState.activeNodeId],
  );

  // Theme Application
  useEffect(() => {
    const root = document.documentElement;
    const storyTheme = THEMES[gameState.theme] || THEMES.fantasy;

    // Determine the envTheme key based on lockEnvTheme setting
    let envThemeKey: string;
    if (aiSettings.lockEnvTheme) {
      // Locked: use fixedEnvTheme if set, otherwise story's default envTheme
      envThemeKey = aiSettings.fixedEnvTheme || storyTheme.envTheme;
    } else {
      // Dynamic: derive from current atmosphere
      envThemeKey = getThemeKeyForAtmosphere(gameState.atmosphere);
    }

    const themeConfig = ENV_THEMES[envThemeKey] || ENV_THEMES.fantasy;

    // Determine active mode
    let activeMode = themeMode;
    if (themeMode === "system") {
      activeMode = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "night"
        : "day";
    }

    // Select variables based on mode
    // Default to 'vars' (Night) if dayVars is missing or mode is night
    const targetVars =
      activeMode === "day" && themeConfig.dayVars
        ? themeConfig.dayVars
        : themeConfig.vars;

    const derivedVars = deriveThemeVars(targetVars);

    // Apply Colors
    Object.entries(derivedVars).forEach(([key, value]) => {
      // Set the raw color value (for standard CSS usage)
      root.style.setProperty(key, value);

      // Convert Hex to RGB channels for Tailwind opacity support
      if (value.startsWith("#")) {
        const hex = value.replace("#", "");
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        // Set a separate variable with -rgb suffix
        root.style.setProperty(`${key}-rgb`, `${r} ${g} ${b}`);
      }
    });

    // Clean up alpha override (we don't use it anymore since we have proper palettes)
    root.style.removeProperty("--theme-alpha-override");
  }, [
    gameState.theme,
    gameState.atmosphere,
    themeMode,
    aiSettings.lockEnvTheme,
    aiSettings.fixedEnvTheme,
  ]);

  // Dynamic Title Update
  useEffect(() => {
    if (view === "start" || view === "initializing") {
      document.title = t("title");
    } else if (view === "game" && gameState.activeNodeId) {
      const activeNode = gameState.nodes[gameState.activeNodeId];
      if (activeNode && activeNode.text) {
        // Truncate text to ~60 chars
        const text = activeNode.text.replace(/\s+/g, " ").trim();
        const truncated =
          text.length > 60 ? text.substring(0, 60) + "..." : text;
        document.title = `${truncated} - ${t("title")}`;
      }
    }
  }, [view, gameState.activeNodeId, gameState.nodes]);

  // --- Core Game Loop ---
  // Note: generateImageForNode is defined later but we can reference it here
  // because hooks are called in order and we'll pass the actual function
  const { handleAction, handleRebuildContext, handleInvalidateSession } =
    useGameAction({
      gameState,
      setGameState,
      aiSettings,
      handleSaveSettings,
      language,
      isTranslating,
      currentSlotId,
      generateImageForNode: async (
        nodeId: string,
        nodeOverride?: StorySegment,
      ) => {
        // Forward to the actual implementation defined below
        await generateImageForNode(nodeId, nodeOverride);
      },
      triggerSave,
      vfsSession,
      onLiveToolCallsUpdate: (toolCalls) => {
        setGameState((prev) => ({
          ...prev,
          liveToolCalls: toolCalls,
        }));
      },
    });

  const lifecycleActions = useMemo(
    () =>
      createLifecycleActions({
        aiSettings,
        language,
        t,
        showToast,
        navigate,
        confirm: (message?: string) => window.confirm(message),
        vfsSession,
        gameStateRef,
        setGameState,
        createSaveSlot,
        setCurrentSlotId,
        currentSlotId,
        saveToSlot,
        deleteSlot,
        resetState,
      }),
    [
      aiSettings,
      language,
      t,
      showToast,
      navigate,
      vfsSession,
      setGameState,
      createSaveSlot,
      setCurrentSlotId,
      currentSlotId,
      saveToSlot,
      deleteSlot,
      resetState,
    ],
  );

  const startNewGame = lifecycleActions.startNewGame;
  const resumeOutlineGeneration = lifecycleActions.resumeOutlineGeneration;

  const commandActions = useMemo(
    () =>
      createCommandActions({
        aiSettings,
        language,
        currentSlotId,
        gameStateRef,
        setGameState,
        showToast,
        t,
        vfsSession,
        restoreVfsToTurn,
        saveToSlot,
        triggerSave,
      }),
    [
      aiSettings,
      language,
      currentSlotId,
      setGameState,
      showToast,
      t,
      vfsSession,
      restoreVfsToTurn,
      saveToSlot,
      triggerSave,
    ],
  );

  /**
   * Navigate to a node, optionally creating a fork (new timeline branch)
   * @param nodeId - The node to navigate to
   * @param isFork - If true, creates a new fork branch from this node
   */
  const navigateToNode = useCallback(
    async (nodeId: string, isFork: boolean = false): Promise<void> => {
      await commandActions.navigateToNode(nodeId, isFork);
    },
    [commandActions],
  );

  const { failedImageNodes, generateImageForNode } = useImageGenerationQueue({
    aiSettings,
    currentSlotId,
    gameStateRef,
    setGameState,
    triggerSave,
  });

  const domainUiActions = useMemo(
    () =>
      createDomainUiActions({
        gameStateRef,
        setGameState,
        triggerSave,
        vfsSession,
      }),
    [setGameState, triggerSave, vfsSession],
  );

  const updateNodeAudio = useCallback(
    (nodeId: string, audioKey: string) => {
      domainUiActions.updateNodeAudio(nodeId, audioKey);
    },
    [domainUiActions],
  );

  const clearHighlight = useCallback(
    (target: Parameters<typeof domainUiActions.clearHighlight>[0]) => {
      domainUiActions.clearHighlight(target);
    },
    [domainUiActions],
  );

  const handleForceUpdate = useCallback(
    async (prompt: string) => commandActions.handleForceUpdate(prompt),
    [commandActions],
  );

  const handleCleanupEntities = useCallback(
    async () => commandActions.handleCleanupEntities(),
    [commandActions],
  );

  const domainMutations = useMemo(
    () =>
      createDomainMutationActions({
        setGameState,
        triggerSave,
      }),
    [setGameState, triggerSave],
  );

  return {
    language,
    setLanguage,
    isTranslating,
    gameState,
    handleAction,
    startNewGame,
    resumeOutlineGeneration,
    rebuildContext: handleRebuildContext,
    invalidateSession: handleInvalidateSession,
    isAutoSaving,
    isMagicMirrorOpen,
    setIsMagicMirrorOpen,
    magicMirrorImage,
    setMagicMirrorImage,
    handleForceUpdate,
    cleanupEntities: handleCleanupEntities,
    isVeoScriptOpen,
    setIsVeoScriptOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    aiSettings,
    handleSaveSettings,
    currentHistory,
    saveSlots,
    renameSlot,
    loadSlot,
    deleteSlot,
    currentSlotId,
    themeMode,
    toggleThemeMode,
    setThemeMode: setThemeModeValue,
    resetSettings,
    clearAllSaves,
    persistenceError,
    hardReset,
    navigateToNode,
    generateImageForNode,
    updateNodeAudio,
    triggerSave,
    failedImageNodes,
    refreshSlots,
    vfsSession,
    clearHighlight,
    updateUiState: domainMutations.updateUiState,
    setViewedSegmentId: domainMutations.setViewedSegmentId,
    updateNodeMeta: domainMutations.updateNodeMeta,
    setVeoScript: domainMutations.setVeoScript,
    toggleGodMode: domainMutations.toggleGodMode,
    setUnlockMode: domainMutations.setUnlockMode,
    applyVfsMutation: domainMutations.applyVfsMutation,
    applyVfsDerivedState: domainMutations.applyVfsDerivedState,
  };
};
