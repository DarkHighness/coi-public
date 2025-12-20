import React, { useState, useEffect, useRef, Suspense } from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import { StartScreen } from "./components/StartScreen";
// Note: Old embedding manager has been replaced with the new RAG service
// See contexts/RAGContext.tsx for the new integration
import { THEMES, ENV_THEMES } from "./utils/constants";
import { getThemeKeyForAtmosphere } from "./utils/constants/atmosphere";
import { getEnvApiKey } from "./utils/env";
import {
  validateConnection,
  type OutlinePhaseProgress,
} from "./services/aiService";
import { importSave } from "./services/saveExportService";
import { InitializingPage } from "./components/pages/InitializingPage";
import { GamePage } from "./components/pages/GamePage";
import { GlobalStyles } from "./components/GlobalStyles";
import {
  ErrorBoundary,
  SectionErrorBoundary,
} from "./components/common/ErrorBoundary";
import { RAGProvider, useRAGContext } from "./contexts/RAGContext";
import {
  GameEngineProvider,
  useGameEngineContext,
} from "./contexts/GameEngineContext";
import {
  ConnectedToastContainer,
  ToastProvider,
  useToast,
} from "./components/Toast";
import { TutorialProvider } from "./contexts/TutorialContext";
import { TutorialSpotlight } from "./components/tutorial";

// Lazy Load Heavy Components for Code Splitting
const SettingsModal = React.lazy(() =>
  import("./components/SettingsModal").then((module) => ({
    default: module.SettingsModal,
  })),
);
const SaveManager = React.lazy(() =>
  import("./components/SaveManager").then((module) => ({
    default: module.SaveManager,
  })),
);
const EnvironmentalEffects = React.lazy(() =>
  import("./components/EnvironmentalEffects").then((module) => ({
    default: module.EnvironmentalEffects,
  })),
);

// Main App wrapper that provides all global contexts
// Order: ToastProvider > RAGProvider > GameEngineProvider > TutorialProvider
export default function App() {
  return (
    <ToastProvider>
      <RAGProvider>
        <GameEngineProvider>
          <TutorialProvider>
            <AppContent />
            <TutorialSpotlight />
          </TutorialProvider>
        </GameEngineProvider>
      </RAGProvider>
    </ToastProvider>
  );
}

// Inner component that uses all contexts
function AppContent() {
  // Use GameEngine Context
  const { state: engineState, actions: engineActions } = useGameEngineContext();
  const {
    language,
    isTranslating,
    gameState,
    aiSettings,
    currentHistory,
    saveSlots,
    currentSlotId,
    themeMode,
    persistenceError,
    failedImageNodes,
    isSettingsOpen,
  } = engineState;
  const {
    setLanguage,
    setGameState,
    handleAction,
    startNewGame,
    resumeOutlineGeneration,
    handleSaveSettings,
    loadSlot,
    deleteSlot,
    refreshSlots,
    setThemeMode,
    resetSettings,
    clearAllSaves,
    hardReset,
    navigateToNode,
    generateImageForNode,
    triggerSave,
    handleForceUpdate,
    setIsSettingsOpen,
  } = engineActions;

  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  // Use RAG Context instead of useRAG hook
  const ragContext = useRAGContext();

  const [isSaveManagerOpen, setIsSaveManagerOpen] = useState(false);
  // File to import when SaveManager opens
  const [importFile, setImportFile] = useState<File | null>(null);

  // Use Toast Context
  const { showToast } = useToast();

  // Track currently viewed segment for dynamic theme/background
  const [viewedSegment, setViewedSegmentLocal] = useState<any | null>(null);

  // Wrapper to also persist viewedSegmentId to UIState
  const setViewedSegment = React.useCallback(
    (segment: any | null) => {
      setViewedSegmentLocal(segment);
      if (segment?.id) {
        setGameState((prev) => ({
          ...prev,
          uiState: {
            ...prev.uiState,
            viewedSegmentId: segment.id,
          },
        }));
      }
    },
    [setGameState],
  );

  // Track preview theme from StartScreen
  const [previewTheme, setPreviewTheme] = useState<string | null>(null);

  // Streaming text for initialization
  const [streamedText, setStreamedText] = useState("");

  // Outline generation phase progress
  const [phaseProgress, setPhaseProgress] =
    useState<OutlinePhaseProgress | null>(null);

  // Global Error Handling (PWA/Chunk/Network errors)
  const [appError, setAppError] = useState<string | null>(null);

  // React component error tracking (caught by ErrorBoundary)
  const [componentError, setComponentError] = useState<string | null>(null);

  const handleComponentError = (error: Error) => {
    console.error("Component error caught by ErrorBoundary:", error);
    setComponentError(error.message);
  };

  // Initialize RAG service when embedding is enabled and settings are available
  // Also re-initialize if configuration changes
  const lastInitializedConfigRef = useRef<string>("");

  useEffect(() => {
    const initRAG = async () => {
      const currentConfigKey = `${aiSettings.embedding?.providerId}:${aiSettings.embedding?.modelId}:${aiSettings.embedding?.dimensions}`;

      const shouldInit =
        aiSettings.embedding?.enabled &&
        (!ragContext.isInitialized ||
          lastInitializedConfigRef.current !== currentConfigKey) &&
        !ragContext.isLoading;

      if (shouldInit) {
        console.log(
          "[App] Initializing RAG service (Config changed or first init)...",
        );
        const success = await ragContext.actions.initialize(aiSettings);
        if (success) {
          console.log("[App] RAG service initialized successfully");
          lastInitializedConfigRef.current = currentConfigKey;
        } else {
          console.warn("[App] RAG service initialization failed");
        }
      } else if (!aiSettings.embedding?.enabled && ragContext.isInitialized) {
        console.log("[App] Embedding disabled, terminating RAG service...");
        ragContext.actions.terminate();
        lastInitializedConfigRef.current = "";
      }
    };

    initRAG();
  }, [
    aiSettings.embedding?.enabled,
    aiSettings.embedding?.providerId,
    aiSettings.embedding?.modelId,
    aiSettings.embedding?.dimensions,
    ragContext.isInitialized,
    ragContext.isLoading,
  ]);

  // Track previous embedding enabled state to detect when it becomes enabled
  const prevEmbeddingEnabledRef = useRef<boolean | undefined>(undefined);

  // Prompt user to index existing game data when embedding is newly enabled
  useEffect(() => {
    const wasDisabled = prevEmbeddingEnabledRef.current === false;
    const nowEnabled = aiSettings.embedding?.enabled === true;

    // Update ref for next comparison
    prevEmbeddingEnabledRef.current = aiSettings.embedding?.enabled;

    // Only prompt when transitioning from disabled to enabled
    if (!wasDisabled || !nowEnabled) return;

    // Check if there's existing game data that could benefit from indexing
    const hasExistingGame =
      gameState.outline !== null && currentSlotId !== null;
    const hasStoryContent = Object.keys(gameState.nodes).length > 0;

    if (!hasExistingGame && !hasStoryContent) return;

    // Wait for RAG service to be initialized
    if (!ragContext.isInitialized) return;

    console.log("[App] Embedding newly enabled with existing game data");

    // Prompt user to index existing content
    const shouldIndex = window.confirm(
      t("rag.newlyEnabled") ||
        "Embedding has been enabled! Would you like to index your existing game content for semantic search? This may take a moment.",
    );

    if (shouldIndex && currentSlotId) {
      // First switch to the current save context, then index
      const indexExistingContent = async () => {
        try {
          // Switch to current save context first
          await ragContext.actions.switchSave(
            currentSlotId,
            gameState.forkId || 0,
            gameState.forkTree,
          );

          // Then index the content
          await ragContext.actions.indexInitialEntities(
            gameState,
            currentSlotId,
          );

          // Also index story nodes (last 50)
          const storyNodeIds = Object.keys(gameState.nodes)
            .slice(-50)
            .map((id) => `story:${id}`);

          if (storyNodeIds.length > 0) {
            await ragContext.actions.updateDocuments(gameState, storyNodeIds);
          }

          console.log("[App] Indexed existing content successfully");
          showToast(
            t("rag.indexComplete") || "Indexed existing documents",
            "info",
          );
        } catch (error) {
          console.error("[App] Failed to index existing content:", error);
          showToast(
            t("rag.indexFailed") || "Failed to index existing content",
            "error",
          );
        }
      };

      indexExistingContent();
    }
  }, [
    aiSettings.embedding?.enabled,
    ragContext.isInitialized,
    gameState,
    currentSlotId,
    t,
  ]);

  // Handle RAG model mismatch
  useEffect(() => {
    if (ragContext.modelMismatch) {
      const message = t("rag.modelMismatchRebuild", {
        storedModel: ragContext.modelMismatch.storedModel,
        currentModel: ragContext.modelMismatch.currentModel,
      });

      if (window.confirm(message)) {
        ragContext.actions.handleModelMismatch("rebuild");
      } else {
        const disableRAG = window.confirm(t("rag.disableForSession"));
        if (disableRAG) {
          ragContext.actions.handleModelMismatch("disable");
          handleSaveSettings({
            ...aiSettings,
            embedding: { ...aiSettings.embedding, enabled: false },
          });
        } else {
          ragContext.actions.handleModelMismatch("continue");
        }
      }
    }
  }, [ragContext.modelMismatch]);

  // Handle RAG storage overflow
  useEffect(() => {
    if (ragContext.storageOverflow) {
      const message = t("rag.storageOverflow", {
        current: ragContext.storageOverflow.currentTotal,
        limit: ragContext.storageOverflow.maxTotal,
      });

      if (window.confirm(message)) {
        ragContext.actions.handleStorageOverflow(
          ragContext.storageOverflow.suggestedDeletions,
        );
      }
    }
  }, [ragContext.storageOverflow]);

  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      console.error("Global error caught:", event.error);
      if (
        event.message?.includes("ChunkLoadError") ||
        event.message?.includes("Importing a module script failed") ||
        event.message?.includes("Failed to fetch")
      ) {
        setAppError(event.message);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled rejection caught:", event.reason);
      const reason = event.reason?.toString() || "";
      if (
        reason.includes("ChunkLoadError") ||
        reason.includes("Importing a module script failed") ||
        reason.includes("Failed to fetch") ||
        reason.includes("QuotaExceededError")
      ) {
        setAppError(reason);
      }
    };

    window.addEventListener("error", handleGlobalError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleGlobalError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
    };
  }, []);

  // Update Document Title based on Language
  useEffect(() => {
    document.title = t("title");
  }, [t, language]);

  const currentStoryTheme = THEMES[gameState.theme] || THEMES.fantasy;

  // Use viewed segment's atmosphere if available, otherwise fall back to current game state
  // Priority: Preview Theme (StartScreen) > Viewed Segment (History Scroll) > Current Game State
  const targetSegment =
    viewedSegment || currentHistory[currentHistory.length - 1];

  // Get current atmosphere - unified system
  let currentAtmosphere =
    targetSegment?.atmosphere ||
    gameState.atmosphere ||
    currentStoryTheme.defaultAtmosphere;

  // For visual theme:
  // - If lockEnvTheme is enabled:
  //   - If fixedEnvTheme is set, use that specific theme
  //   - Otherwise, use the story's default envTheme
  // - Otherwise, derive from atmosphere using the mapping
  let currentEnvThemeKey: string;
  if (aiSettings.lockEnvTheme) {
    // Use fixed theme if specified, otherwise use story's default
    currentEnvThemeKey = aiSettings.fixedEnvTheme || currentStoryTheme.envTheme;
  } else {
    currentEnvThemeKey = getThemeKeyForAtmosphere(currentAtmosphere);
  }

  // Debug state for theme overrides
  const [debugState, setDebugState] = useState<{
    lockedTheme: string | null;
    lockedMode: "light" | "dark" | null;
    showSlideshow: boolean;
  }>({ lockedTheme: null, lockedMode: null, showSlideshow: false });

  // Expose debug tools to window
  useEffect(() => {
    const w = window as any;

    // Unified debug toggle
    w.toggleThemeDebugger = () => {
      setDebugState((prev) => {
        const willShow = !prev.showSlideshow;
        return {
          ...prev,
          showSlideshow: willShow,
          // Reset locks when closing
          lockedTheme: !willShow ? null : prev.lockedTheme,
          lockedMode: !willShow ? null : prev.lockedMode,
        };
      });
      console.log("[Debug] Toggled Theme Slideshow Debugger");
    };

    console.log(
      "[Debug] Call `window.toggleThemeDebugger()` to open/close the theme slideshow.",
    );
  }, []);

  if (previewTheme) {
    const previewStoryTheme = THEMES[previewTheme] || THEMES.fantasy;
    currentAtmosphere = previewStoryTheme.defaultAtmosphere;
    // For preview, always use the theme's envTheme
    currentEnvThemeKey = previewStoryTheme.envTheme;
  }

  // Apply debug overrides (Moved up to ensure consistent state usage)
  if (debugState.lockedTheme) {
    currentEnvThemeKey = debugState.lockedTheme;
  }

  // Theme Slideshow Logic
  const allThemeKeys = React.useMemo(() => Object.keys(ENV_THEMES), []);

  const handleNextTheme = React.useCallback(() => {
    setDebugState((prev) => {
      const currentIndex = prev.lockedTheme
        ? allThemeKeys.indexOf(prev.lockedTheme)
        : allThemeKeys.indexOf(currentEnvThemeKey);

      const nextIndex = (currentIndex + 1) % allThemeKeys.length;
      return { ...prev, lockedTheme: allThemeKeys[nextIndex] };
    });
  }, [allThemeKeys, currentEnvThemeKey]);

  const handlePrevTheme = React.useCallback(() => {
    setDebugState((prev) => {
      const currentIndex = prev.lockedTheme
        ? allThemeKeys.indexOf(prev.lockedTheme)
        : allThemeKeys.indexOf(currentEnvThemeKey);

      const nextIndex =
        (currentIndex - 1 + allThemeKeys.length) % allThemeKeys.length;
      return { ...prev, lockedTheme: allThemeKeys[nextIndex] };
    });
  }, [allThemeKeys, currentEnvThemeKey]);

  const handleToggleMode = React.useCallback(() => {
    setDebugState((prev) => {
      const currentForToggle = prev.lockedMode || themeMode;
      return {
        ...prev,
        lockedMode: currentForToggle === "light" ? "dark" : "light",
      };
    });
  }, [themeMode]);

  const rawThemeConfig = ENV_THEMES[currentEnvThemeKey] || ENV_THEMES.fantasy;

  // Determine effective mode (debug override > state)
  const effectiveMode = debugState.lockedMode || themeMode;

  // Select appropriate vars based on mode
  const activeVars =
    effectiveMode === "light" && rawThemeConfig.dayVars
      ? rawThemeConfig.dayVars
      : rawThemeConfig.vars;

  // Construct final config for GlobalStyles
  const currentThemeConfig = {
    ...rawThemeConfig,
    vars: activeVars,
  };

  // Determine current context for effects
  const isStartScreen = location.pathname === "/";
  const currentSegment = currentHistory[currentHistory.length - 1];

  // Reset effects on Start Screen
  const effectText =
    !isStartScreen && currentSegment ? currentSegment.text : "";
  const effectPrompt =
    !isStartScreen && currentSegment ? currentSegment.imagePrompt : "";

  // Calculate Sticky Background
  const stickyBackground = React.useMemo(() => {
    if (isStartScreen) return undefined;

    const startSegment =
      viewedSegment || currentHistory[currentHistory.length - 1];
    if (!startSegment) return undefined;

    const startIndex = currentHistory.findIndex(
      (s) => s.id === startSegment.id,
    );
    // If index not found (shouldn't happen) or list empty, default to current segment's image
    if (startIndex === -1) return startSegment.imageUrl;

    // Search backwards for the "Active Scene Image"
    for (let i = startIndex; i >= 0; i--) {
      const seg = currentHistory[i];
      // If we find an image, that's our background
      if (seg.imageUrl) return seg.imageUrl;
    }
    // If we reach the start without finding anything, return undefined (Fallback)
    return undefined;
  }, [viewedSegment, currentHistory, isStartScreen]);

  // Helper: Get provider instance by ID
  const getProviderInstance = (providerId: string) => {
    return aiSettings.providers.instances.find((p) => p.id === providerId);
  };

  // Helper: Check if a provider has API key configured
  const hasApiKey = (providerId: string) => {
    const instance = getProviderInstance(providerId);
    if (!instance) return false;
    // For Gemini, also check environment variable
    if (instance.protocol === "gemini") {
      return !!(instance.apiKey || getEnvApiKey());
    }
    return !!(instance.apiKey && instance.apiKey.trim() !== "");
  };

  // Helper: Check if a provider is available (enabled + has API key)
  const isProviderAvailable = (providerId: string) => {
    const instance = getProviderInstance(providerId);
    if (!instance) return false;
    return instance.enabled && hasApiKey(providerId);
  };

  const performValidation = async (): Promise<boolean> => {
    // Check required providers have API keys
    if (!isProviderAvailable(aiSettings.story.providerId)) {
      showToast(t("missingApiKey"), "error");
      setIsSettingsOpen(true);
      return false;
    }
    if (!isProviderAvailable(aiSettings.lore.providerId)) {
      showToast(t("missingApiKey"), "error");
      setIsSettingsOpen(true);
      return false;
    }

    // Check enabled optional features have API keys
    const enabledFeatures = [
      {
        name: "image",
        providerId: aiSettings.image.providerId,
        enabled: aiSettings.image.enabled,
      },
      {
        name: "audio",
        providerId: aiSettings.audio.providerId,
        enabled: aiSettings.audio.enabled,
      },
      {
        name: "video",
        providerId: aiSettings.video.providerId,
        enabled: aiSettings.video.enabled,
      },
      {
        name: "embedding",
        providerId: aiSettings.embedding.providerId,
        enabled: aiSettings.embedding.enabled,
      },
      {
        name: "translation",
        providerId: aiSettings.translation.providerId,
        enabled: aiSettings.translation.enabled,
      },
      {
        name: "script",
        providerId: aiSettings.script.providerId,
        enabled: aiSettings.script.enabled,
      },
    ];

    for (const feature of enabledFeatures) {
      if (feature.enabled && !isProviderAvailable(feature.providerId)) {
        showToast(t("missingApiKey"), "error");
        setIsSettingsOpen(true);
        return false;
      }
    }

    showToast(t("validate-connection"), "info");

    // Story provider is REQUIRED - block if it fails
    const storyProviderId = aiSettings.story.providerId;
    const storyInstance = getProviderInstance(storyProviderId);
    const storyProviderName = storyInstance?.name || storyProviderId;

    const {
      isValid: storyValid,
      error: storyError,
      localError: storyLocalError,
    } = await validateConnection(aiSettings, storyProviderId);
    if (!storyValid && !storyLocalError) {
      showToast(
        `${storyProviderName}: ${storyError || "Connection Failed"} - Story generation is required`,
        "error",
      );
      setIsSettingsOpen(true);
      return false;
    }

    // Lore provider is REQUIRED - block if it fails
    const loreProviderId = aiSettings.lore.providerId;
    const loreInstance = getProviderInstance(loreProviderId);
    const loreProviderName = loreInstance?.name || loreProviderId;

    const {
      isValid: loreValid,
      error: loreError,
      localError: loreLocalError,
    } = await validateConnection(aiSettings, loreProviderId);
    if (!loreValid && !loreLocalError) {
      showToast(
        `${loreProviderName}: ${loreError || "Connection Failed"} - Lore generation is required`,
        "error",
      );
      setIsSettingsOpen(true);
      return false;
    }

    // Optional providers (image, audio, video) - just warn, don't block
    const optionalProviders: Array<{
      name: string;
      providerId: string;
      enabled: boolean;
    }> = [
      {
        name: "Image",
        providerId: aiSettings.image.providerId,
        enabled: aiSettings.image.enabled !== false,
      },
      {
        name: "Audio",
        providerId: aiSettings.audio.providerId,
        enabled: aiSettings.audio.enabled !== false,
      },
      {
        name: "Video",
        providerId: aiSettings.video.providerId,
        enabled: aiSettings.video.enabled !== false,
      },
      {
        name: "Translation",
        providerId: aiSettings.translation.providerId,
        enabled: aiSettings.translation.enabled !== false,
      },
      {
        name: "Script",
        providerId: aiSettings.script.providerId,
        enabled: aiSettings.script.enabled !== false,
      },
    ];

    for (const { name, providerId, enabled } of optionalProviders) {
      if (enabled && providerId !== storyProviderId) {
        // Skip if same as story provider (already checked)
        const instance = getProviderInstance(providerId);
        const providerName = instance?.name || providerId;
        const { isValid, error, localError } = await validateConnection(
          aiSettings,
          providerId,
        );
        if (!isValid && !localError) {
          console.warn(`${name} provider validation failed:`, error);
          showToast(
            `Warning: ${name} (${providerName}) unavailable - ${error || "Connection failed"}. Story will continue without ${name.toLowerCase()}.`,
            "error",
          );
        }
      }
    }

    return true;
  };

  const handleStartGame = async (theme: string, customContext?: string) => {
    if (await performValidation()) {
      setStreamedText("");
      setPhaseProgress(null);
      startNewGame(
        theme,
        customContext,
        (text) => setStreamedText((prev) => prev + text),
        (progress) => setPhaseProgress(progress),
      );
    }
  };

  const handleContinueGame = async () => {
    // Skip connection validation when continuing - only check if providers are available
    const enabledFeatures = [
      { providerId: aiSettings.story.providerId, enabled: true },
      { providerId: aiSettings.lore.providerId, enabled: true },
    ];

    for (const feature of enabledFeatures) {
      if (feature.enabled && !isProviderAvailable(feature.providerId)) {
        showToast(t("missingApiKey"), "error");
        setIsSettingsOpen(true);
        return;
      }
    }

    console.log("continue game, currentSlotId:", currentSlotId);

    // Helper to handle continuation based on game state
    const handleContinuation = async () => {
      if (gameState.outline) {
        // Switch RAG context if enabled
        if (
          aiSettings.embedding?.enabled &&
          ragContext.isInitialized &&
          currentSlotId
        ) {
          console.log("[ContinueGame] Switching RAG context...");
          try {
            await ragContext.actions.switchSave(
              currentSlotId,
              gameState.forkId || 0,
              gameState.forkTree,
            );
            console.log("[ContinueGame] RAG context switched successfully");
          } catch (error) {
            console.error(
              "[ContinueGame] Failed to switch RAG context:",
              error,
            );
          }
        }
        // Outline complete, go directly to game
        navigate("/game");
      } else if (gameState.outlineConversation) {
        // Has partial outline progress, resume generation
        console.log(
          "[ContinueGame] Resuming outline generation from saved state",
        );
        setStreamedText("");
        setPhaseProgress(null);
        await resumeOutlineGeneration(
          (text) => setStreamedText((prev) => prev + text),
          (progress) => setPhaseProgress(progress),
        );
      } else if (gameState.theme) {
        // Fresh save (has theme but no outline/conversation) - start from beginning
        console.log(
          "[ContinueGame] Fresh save detected, starting outline generation",
        );
        setStreamedText("");
        setPhaseProgress(null);
        await startNewGame(
          gameState.theme,
          gameState.customContext,
          (text) => setStreamedText((prev) => prev + text),
          (progress) => setPhaseProgress(progress),
        );
      } else {
        // No valid state to continue from - this shouldn't happen
        console.warn("[ContinueGame] No valid state to continue from");
        navigate("/");
      }
    };

    if (currentSlotId) {
      await handleContinuation();
    } else if (saveSlots.length > 0) {
      const sorted = [...saveSlots].sort((a, b) => b.timestamp - a.timestamp);
      const mostRecent = sorted[0];
      const result = await loadSlot(mostRecent.id);
      if (result.success) {
        // Switch RAG context to the loaded save if RAG is enabled
        if (
          aiSettings.embedding?.enabled &&
          ragContext.isInitialized &&
          result.hasOutline
        ) {
          console.log("[ContinueGame] Switching RAG context to loaded save...");
          try {
            await ragContext.actions.switchSave(
              mostRecent.id,
              gameState.forkId || 0,
              gameState.forkTree,
            );
            console.log("[ContinueGame] RAG context switched successfully");
          } catch (error) {
            console.error(
              "[ContinueGame] Failed to switch RAG context:",
              error,
            );
          }
        }

        // After loading, check the game state and handle appropriately
        // Note: gameState may not be updated yet due to React's async state updates
        // So we navigate to /game and let GamePage handle the routing
        navigate("/game");
      }
    }
  };

  /**
   * Handle loading a slot from SaveManager.
   * This properly handles partial outline states by checking the loaded state
   * and either navigating to game or resuming outline generation.
   * Also handles embedding index restoration.
   */
  const handleLoadSlot = async (id: string) => {
    if (!(await performValidation())) return;

    const result = await loadSlot(id);
    if (!result.success) {
      showToast(t("saves.loadFailed") || "Failed to load save", "error");
      return;
    }

    // Switch RAG context to the loaded save if RAG is enabled
    if (
      aiSettings.embedding?.enabled &&
      ragContext.isInitialized &&
      result.hasOutline
    ) {
      console.log("[LoadSlot] Switching RAG context to loaded save...");
      try {
        await ragContext.actions.switchSave(
          id,
          gameState.forkId || 0,
          gameState.forkTree,
        );
        console.log("[LoadSlot] RAG context switched successfully");
      } catch (error) {
        console.error("[LoadSlot] Failed to switch RAG context:", error);
        // Continue without RAG - not critical
      }
    }

    // Close the save manager
    setIsSaveManagerOpen(false);

    // Check loaded state and handle appropriately
    if (result.hasOutline) {
      // Complete outline, go to game
      navigate("/game");
    } else if (result.hasOutlineConversation) {
      // Partial outline, resume generation
      console.log("[LoadSlot] Resuming outline generation from loaded save");
      setStreamedText("");
      setPhaseProgress(null);
      await resumeOutlineGeneration(
        (text) => setStreamedText((prev) => prev + text),
        (progress) => setPhaseProgress(progress),
      );
    } else {
      // No valid state - shouldn't happen for valid saves
      console.warn(
        "[LoadSlot] Loaded save has no outline or conversation state",
      );
      showToast(
        t("saves.invalidState") || "Save appears to be corrupted",
        "error",
      );
    }
  };

  const LoadingFallback = () => (
    <div className="fixed inset-0 flex items-center justify-center z-[100] bg-black/50 backdrop-blur pointer-events-none">
      <div className="w-10 h-10 border-4 border-theme-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="h-[100dvh] w-full flex flex-col overflow-hidden bg-theme-bg text-theme-text font-sans transition-colors duration-1000 relative">
      <GlobalStyles themeConfig={currentThemeConfig} />

      {/* Toast Container - Auto-connected to ToastContext */}
      <ConnectedToastContainer />

      {/* Environmental Overlay */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <Suspense
          fallback={
            <div className="w-full h-full bg-theme-bg transition-colors duration-1000"></div>
          }
        >
          <EnvironmentalEffects
            currentText={effectText}
            imagePrompt={effectPrompt}
            atmosphere={currentAtmosphere}
            backgroundImage={stickyBackground}
            fallbackEnabled={aiSettings.enableFallbackBackground}
          />
        </Suspense>
      </div>

      <ErrorBoundary
        name="Routes"
        onError={handleComponentError}
        showRetry={true}
      >
        <Routes>
          <Route
            path="/"
            element={
              <SectionErrorBoundary name="StartScreen">
                <StartScreen
                  onStart={handleStartGame}
                  onContinue={handleContinueGame}
                  onLoad={(file) => {
                    // Open SaveManager with the file pre-selected in ImportSaveModal
                    setImportFile(file);
                    setIsSaveManagerOpen(true);
                  }}
                  onOpenSaves={() => setIsSaveManagerOpen(true)}
                  onSettings={() => setIsSettingsOpen(true)}
                  latestSave={
                    saveSlots.length > 0
                      ? [...saveSlots].sort(
                          (a, b) => b.timestamp - a.timestamp,
                        )[0]
                      : undefined
                  }
                  onThemePreview={setPreviewTheme}
                  setLanguage={setLanguage}
                  saveSlots={saveSlots}
                  onSwitchSlot={handleLoadSlot}
                  onDeleteSlot={deleteSlot}
                  onRefreshSlots={refreshSlots}
                />
              </SectionErrorBoundary>
            }
          />

          <Route
            path="/initializing"
            element={
              <SectionErrorBoundary name="InitializingPage">
                <InitializingPage
                  themeFont={currentThemeConfig.fontClass}
                  isProcessing={gameState.isProcessing}
                  streamedText={streamedText}
                  phaseProgress={phaseProgress}
                />
              </SectionErrorBoundary>
            }
          />

          <Route
            path="/game"
            element={
              <SectionErrorBoundary name="GamePage">
                <GamePage
                  onOpenSettings={() => setIsSettingsOpen(true)}
                  onOpenSaves={() => setIsSaveManagerOpen(true)}
                  onViewedSegmentChange={setViewedSegment}
                  overrideThemeConfig={currentThemeConfig}
                />
              </SectionErrorBoundary>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>

      <Suspense fallback={<LoadingFallback />}>
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          themeFont={currentThemeConfig.fontClass}
          onClearAllSaves={clearAllSaves}
          saveCount={saveSlots.length}
        />
        {isSaveManagerOpen && (
          <SaveManager
            slots={saveSlots}
            currentSlotId={null}
            onSwitch={handleLoadSlot}
            onDelete={deleteSlot}
            onClose={() => {
              setIsSaveManagerOpen(false);
              setImportFile(null);
            }}
            onImportComplete={async (result) => {
              if (result.success) {
                await refreshSlots();
              }
            }}
            initialImportFile={importFile || undefined}
          />
        )}
      </Suspense>

      {/* Critical Error Modal - covers persistence, app, and component errors */}
      {(persistenceError || appError || componentError) && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6 max-w-md w-full text-center space-y-4">
            {/* Error Modal Content (unchanged) */}
            <div className="text-4xl">⚠️</div>
            <h2 className="text-xl font-bold text-red-500">
              {t("app.errors.critical") || "Critical Error Detected"}
            </h2>
            <p className="text-sm text-theme-muted">
              {componentError
                ? t("app.errors.componentDescription") ||
                  "A component encountered an error. You may try to dismiss this and continue, or reset if the issue persists."
                : t("app.errors.description") ||
                  "The game encountered a critical error. This is likely due to data corruption, a PWA update issue, or network failure."}
            </p>
            <div className="bg-black/30 p-3 rounded text-left overflow-auto max-h-32">
              <p className="text-xs text-red-400 font-mono">
                {t("app.errors.label") || "Error:"}{" "}
                {persistenceError || appError || componentError}
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => {
                  setAppError(null);
                  setComponentError(null);
                  window.location.reload();
                }}
                className="px-4 py-2 bg-theme-surface border border-theme-border hover:bg-theme-surface-highlight rounded-lg transition-colors text-sm"
              >
                {t("app.errors.reload") || "Reload App"}
              </button>
              <button
                onClick={hardReset}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-bold"
              >
                {t("app.errors.reset") || "Factory Reset"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debug Slideshow Overlay */}
      {debugState.showSlideshow && (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
          {/* Top Control Bar */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-4 pointer-events-auto bg-black/50 backdrop-blur px-6 py-3 rounded-full border border-white/10 shadow-xl">
            <button
              onClick={handleToggleMode}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              title={`Current Mode: ${effectiveMode}`}
            >
              {effectiveMode === "light" ? "☀️" : "🌙"}
            </button>
            <div className="text-lg font-bold font-mono text-white">
              Theme:{" "}
              <span className="text-theme-primary">{currentEnvThemeKey}</span>
            </div>
            <button
              onClick={() =>
                setDebugState((prev) => ({ ...prev, showSlideshow: false }))
              }
              className="text-white/50 hover:text-white px-2"
              title="Close Debugger (Esc)"
            >
              ✕
            </button>
          </div>

          {/* Navigation Buttons */}
          <button
            onClick={handlePrevTheme}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-4 rounded-full bg-black/30 hover:bg-black/60 backdrop-blur border border-white/10 text-white transition-all pointer-events-auto hover:scale-110 active:scale-95"
          >
            ◀
          </button>

          <button
            onClick={handleNextTheme}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-4 rounded-full bg-black/30 hover:bg-black/60 backdrop-blur border border-white/10 text-white transition-all pointer-events-auto hover:scale-110 active:scale-95"
          >
            ▶
          </button>
        </div>
      )}
    </div>
  );
}
