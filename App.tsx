import React, { useState, useEffect, useRef, Suspense } from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useGameEngine } from "./hooks/useGameEngine";
import { StartScreen } from "./components/StartScreen";
// Note: Old embedding manager has been replaced with the new RAG service
// See hooks/useRAG.ts for the new integration
import { THEMES, ENV_THEMES } from "./utils/constants";
import { getThemeKeyForAtmosphere } from "./utils/constants/atmosphere";
import { getEnvApiKey } from "./utils/env";
import {
  validateConnection,
  type OutlinePhaseProgress,
} from "./services/aiService";
import { InitializingPage } from "./components/pages/InitializingPage";
import { GamePage } from "./components/pages/GamePage";
import { GlobalStyles } from "./components/GlobalStyles";
import {
  ErrorBoundary,
  SectionErrorBoundary,
} from "./components/common/ErrorBoundary";
import { useRAG } from "./hooks/useRAG";
import { ToastContainer, useToastManager } from "./components/Toast";

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

export default function App() {
  const {
    language,
    setLanguage,
    isTranslating,
    gameState,
    setGameState,
    handleAction,
    startNewGame,
    resumeOutlineGeneration,
    isAutoSaving,
    isSettingsOpen,
    setIsSettingsOpen,
    aiSettings,
    handleSaveSettings,
    currentHistory,
    saveSlots,
    loadSlot,
    deleteSlot,
    currentSlotId,
    themeMode,
    setThemeMode,
    resetSettings,
    clearAllSaves,
    persistenceError,
    hardReset,
    navigateToNode,
    generateImageForNode,
    triggerSave,
    handleForceUpdate,
  } = useGameEngine();

  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  // Initialize RAG service
  const [ragState, ragActions] = useRAG(aiSettings.embedding?.enabled);

  const [isSaveManagerOpen, setIsSaveManagerOpen] = useState(false);

  // Use Toast Manager
  const { toasts, pushToast, removeToast } = useToastManager();

  // Track currently viewed segment for dynamic theme/background
  const [viewedSegment, setViewedSegment] = useState<any | null>(null);

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
        (!ragState.isInitialized || lastInitializedConfigRef.current !== currentConfigKey) &&
        !ragState.isLoading;

      if (shouldInit) {
        console.log("[App] Initializing RAG service (Config changed or first init)...");
        const success = await ragActions.initialize(aiSettings);
        if (success) {
          console.log("[App] RAG service initialized successfully");
          lastInitializedConfigRef.current = currentConfigKey;
        } else {
          console.warn("[App] RAG service initialization failed");
        }
      } else if (!aiSettings.embedding?.enabled && ragState.isInitialized) {
        console.log("[App] Embedding disabled, terminating RAG service...");
        ragActions.terminate();
        lastInitializedConfigRef.current = "";
      }
    };

    initRAG();
  }, [
    aiSettings.embedding?.enabled,
    aiSettings.embedding?.providerId,
    aiSettings.embedding?.modelId,
    aiSettings.embedding?.dimensions,
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
    if (!ragState.isInitialized) return;

    console.log("[App] Embedding newly enabled with existing game data");

    // Prompt user to index existing content
    const shouldIndex = window.confirm(
      t("rag.newlyEnabled") ||
        "Embedding has been enabled! Would you like to index your existing game content for semantic search? This may take a moment.",
    );

    if (shouldIndex) {
      // Trigger a full index of current game state
      const indexExistingContent = async () => {
        try {
          const { extractDocumentsFromState } = await import("./hooks/useRAG");
          const ragService = (await import("./services/rag")).getRAGService();

          if (!ragService) {
            console.warn("[App] RAG service not available for indexing");
            return;
          }

          const entityIds: string[] = [];

          // Add outline documents
          if (gameState.outline) {
            entityIds.push(
              "outline:full",
              "outline:world",
              "outline:goal",
              "outline:premise",
              "outline:character",
            );
          }

          // Add all entities
          gameState.inventory?.forEach((item) => entityIds.push(item.id));
          gameState.relationships?.forEach((npc) => entityIds.push(npc.id));
          gameState.locations?.forEach((loc) => entityIds.push(loc.id));
          gameState.quests?.forEach((quest) => entityIds.push(quest.id));
          gameState.knowledge?.forEach((know) => entityIds.push(know.id));
          gameState.timeline?.forEach((event) => entityIds.push(event.id));

          // Extract story nodes (last 50 to avoid overload)
          const storyNodeIds = Object.keys(gameState.nodes)
            .slice(-50)
            .map((id) => `story:${id}`);
          entityIds.push(...storyNodeIds);

          const documents = extractDocumentsFromState(gameState, entityIds);

          if (documents.length > 0) {
            await ragService.addDocuments(
              documents.map((doc) => ({
                ...doc,
                saveId: currentSlotId || "unknown",
                forkId: gameState.forkId || 0,
                turnNumber: gameState.turnNumber || 0,
              })),
            );
            console.log(`[App] Indexed ${documents.length} existing documents`);
            showToast(
              t("rag.indexComplete") || `Indexed ${documents.length} documents`,
              "info",
            );
          }
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
    ragState.isInitialized,
    gameState,
    currentSlotId,
    t,
  ]);

  // Handle RAG model mismatch
  useEffect(() => {
    if (ragState.modelMismatch) {
      const message = `Embedding model mismatch detected!\n\nStored: ${ragState.modelMismatch.storedModel}\nCurrent: ${ragState.modelMismatch.currentModel}\n\nWould you like to rebuild the index? This will clear existing embeddings.`;

      if (window.confirm(message)) {
        ragActions.handleModelMismatch("rebuild");
      } else {
        const disableRAG = window.confirm("Disable RAG for this session?");
        if (disableRAG) {
          ragActions.handleModelMismatch("disable");
          handleSaveSettings({
            ...aiSettings,
            embedding: { ...aiSettings.embedding, enabled: false },
          });
        } else {
          ragActions.handleModelMismatch("continue");
        }
      }
    }
  }, [ragState.modelMismatch]);

  // Handle RAG storage overflow
  useEffect(() => {
    if (ragState.storageOverflow) {
      const message = `Storage limit reached!\n\nCurrent: ${ragState.storageOverflow.currentTotal} documents\nLimit: ${ragState.storageOverflow.maxTotal} documents\n\nOldest saves will be removed to free up space.`;

      if (window.confirm(message)) {
        ragActions.handleStorageOverflow(
          ragState.storageOverflow.suggestedDeletions,
        );
      }
    }
  }, [ragState.storageOverflow]);

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
  // - If lockEnvTheme is enabled, use the story's fixed envTheme
  // - Otherwise, derive from atmosphere using the mapping
  let currentEnvThemeKey: string;
  if (aiSettings.lockEnvTheme) {
    currentEnvThemeKey = currentStoryTheme.envTheme;
  } else {
    currentEnvThemeKey = getThemeKeyForAtmosphere(currentAtmosphere);
  }

  if (previewTheme) {
    const previewStoryTheme = THEMES[previewTheme] || THEMES.fantasy;
    currentAtmosphere = previewStoryTheme.defaultAtmosphere;
    // For preview, always use the theme's envTheme
    currentEnvThemeKey = previewStoryTheme.envTheme;
  }

  const currentThemeConfig =
    ENV_THEMES[currentEnvThemeKey] || ENV_THEMES.fantasy;

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

  const showToast = (msg: string, type: "info" | "error" | "success" = "info") => {
    pushToast(msg, type);
  };

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

    const { isValid: storyValid, error: storyError } = await validateConnection(
      aiSettings,
      storyProviderId,
    );
    if (!storyValid) {
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

    const { isValid: loreValid, error: loreError } = await validateConnection(
      aiSettings,
      loreProviderId,
    );
    if (!loreValid) {
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
        const { isValid, error } = await validateConnection(
          aiSettings,
          providerId,
        );
        if (!isValid) {
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
    if (await performValidation()) {
      console.log("continue game, currentSlotId:", currentSlotId);

      // Helper to handle continuation based on game state
      const handleContinuation = async () => {
        if (gameState.outline) {
          // Switch RAG context if enabled
          if (
            aiSettings.embedding?.enabled &&
            ragState.isInitialized &&
            currentSlotId
          ) {
            console.log("[ContinueGame] Switching RAG context...");
            try {
              await ragActions.switchSave(
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
            ragState.isInitialized &&
            result.hasOutline
          ) {
            console.log(
              "[ContinueGame] Switching RAG context to loaded save...",
            );
            try {
              await ragActions.switchSave(
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
      ragState.isInitialized &&
      result.hasOutline
    ) {
      console.log("[LoadSlot] Switching RAG context to loaded save...");
      try {
        await ragActions.switchSave(
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

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

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
                  onLoad={(file) => setIsSaveManagerOpen(true)}
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
                  onSwitchSlot={loadSlot}
                  onDeleteSlot={deleteSlot}
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
                  gameState={gameState}
                  setGameState={setGameState}
                  currentHistory={currentHistory}
                  language={language}
                  setLanguage={setLanguage}
                  isTranslating={isTranslating}
                  handleAction={handleAction}
                  aiSettings={aiSettings}
                  handleSaveSettings={handleSaveSettings}
                  navigateToNode={navigateToNode}
                  generateImageForNode={generateImageForNode}
                  showToast={showToast}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                  onOpenSaves={() => setIsSaveManagerOpen(true)}
                  themeFont={currentThemeConfig.fontClass}
                  saveSlots={saveSlots}
                  switchSlot={async (id) => {
                    await loadSlot(id);
                  }}
                  deleteSlot={deleteSlot}
                  currentSlotId={currentSlotId}
                  onViewedSegmentChange={setViewedSegment}
                  triggerSave={triggerSave}
                  handleForceUpdate={handleForceUpdate}
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
          showToast={showToast}
          onClearAllSaves={clearAllSaves}
          saveCount={saveSlots.length}
        />
        {isSaveManagerOpen && (
          <SaveManager
            slots={saveSlots}
            currentSlotId={null}
            onSwitch={handleLoadSlot}
            onDelete={deleteSlot}
            onClose={() => setIsSaveManagerOpen(false)}
          />
        )}
      </Suspense>

      {/* Critical Error Modal - covers persistence, app, and component errors */}
      {(persistenceError || appError || componentError) && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6 max-w-md w-full text-center space-y-4">
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
    </div>
  );
}
