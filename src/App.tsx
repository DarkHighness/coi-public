import React, { useState, useEffect, Suspense } from "react";
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
// RAG lifecycle is managed in runtime hooks + runtime effects
import { THEMES, ENV_THEMES } from "./utils/constants";
import { getThemeKeyForAtmosphere } from "./utils/constants/atmosphere";
import { isCriticalAppError } from "./utils/appErrorClassifier";
import { type OutlinePhaseProgress } from "./services/aiService";
import { importSave } from "./services/saveExportService";
import { InitializingPage } from "./components/pages/InitializingPage";
import { GamePage } from "./components/pages/GamePage";
import { GlobalStyles } from "./components/GlobalStyles";
import {
  ErrorBoundary,
  SectionErrorBoundary,
} from "./components/common/ErrorBoundary";
import { RuntimeProvider, useRuntimeContext } from "./runtime/context";
import type { RuntimeValidationMode } from "./runtime/state";
import type { SavePresetProfile } from "./types";
import { presentProviderValidationResult } from "./runtime/effects/providerValidationUi";
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
// Order: ToastProvider > RuntimeProvider > TutorialProvider
export default function App() {
  return (
    <ToastProvider>
      <RuntimeProvider>
        <TutorialProvider>
          <AppContent />
          <TutorialSpotlight />
        </TutorialProvider>
      </RuntimeProvider>
    </ToastProvider>
  );
}

// Inner component that uses all contexts
function AppContent() {
  const { state: engineState, actions: engineActions } = useRuntimeContext();
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
    handleAction,
    startNewGame,
    handleSaveSettings,
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
    setViewedSegmentId,
    continueGame,
    loadSlotForPlay,
    validateProviders,
  } = engineActions;

  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

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
      setViewedSegmentId(segment?.id, {
        reason: "app.viewedSegment",
        persist: false,
      });
    },
    [setViewedSegmentId],
  );

  // Track preview theme from StartScreen
  const [previewTheme, setPreviewTheme] = useState<string | null>(null);

  // Streaming text for initialization
  const [streamedText, setStreamedText] = useState("");

  // Outline generation phase progress
  const [phaseProgress, setPhaseProgress] =
    useState<OutlinePhaseProgress | null>(null);

  // Seed image URL for InitializingPage background (when starting from image)
  const [seedImageUrl, setSeedImageUrl] = useState<string | null>(null);

  // Global Error Handling (PWA/Chunk/Network errors)
  const [appError, setAppError] = useState<string | null>(null);

  // React component error tracking (caught by ErrorBoundary)
  const [componentError, setComponentError] = useState<string | null>(null);

  const handleComponentError = (error: Error) => {
    console.error("Component error caught by ErrorBoundary:", error);
    setComponentError(error.message);
  };

  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      console.error("Global error caught:", event.error);
      if (isCriticalAppError(event.message)) {
        setAppError(event.message);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled rejection caught:", event.reason);
      const reason = event.reason?.toString() || "";
      if (isCriticalAppError(reason)) {
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
  // Must resolve 'system' to actual light/dark mode
  let effectiveMode: "light" | "dark" =
    debugState.lockedMode ||
    (themeMode === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : themeMode === "day"
        ? "light"
        : "dark");

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

  const performValidation = async (
    mode: RuntimeValidationMode,
  ): Promise<boolean> => {
    if (mode === "start") {
      showToast(t("validate-connection"), "info");
    }

    const validation = await validateProviders(mode);

    return presentProviderValidationResult(validation, {
      t,
      showToast,
      onBlockingIssue: () => setIsSettingsOpen(true),
    });
  };

  const handleStartGame = async (
    theme: string,
    customContext?: string,
    seedImage?: Blob,
    protagonistFeature?: string,
    presetProfile?: SavePresetProfile,
  ) => {
    if (await performValidation("start")) {
      setStreamedText("");
      setPhaseProgress(null);

      // Create URL from seedImage blob if provided
      if (seedImage) {
        const url = URL.createObjectURL(seedImage);
        setSeedImageUrl(url);
      } else {
        setSeedImageUrl(null);
      }

      startNewGame(
        theme,
        customContext,
        (text) => setStreamedText((prev) => prev + text),
        (progress) => setPhaseProgress(progress),
        undefined, // existingSlotId - not resuming
        seedImage, // Pass seedImage blob for IndexedDB storage
        protagonistFeature,
        presetProfile,
      );
    }
  };

  const handleContinueGame = async () => {
    if (!(await performValidation("continue"))) {
      return;
    }

    console.log("continue game, currentSlotId:", currentSlotId);

    setStreamedText("");
    setPhaseProgress(null);

    const result = await continueGame({
      onStream: (text) => setStreamedText((prev) => prev + text),
      onPhaseProgress: (progress) => setPhaseProgress(progress),
    });

    if (result === "navigated-game") {
      navigate("/game");
      return;
    }

    if (result === "invalid-state") {
      showToast(t("saves.invalidState") || "Save appears to be corrupted", "error");
      navigate("/");
    }
  };

  /**
   * Handle loading a slot from SaveManager.
   * This properly handles partial outline states by checking the loaded state
   * and either navigating to game or resuming outline generation.
   * Also handles embedding index restoration.
   */
  const handleLoadSlot = async (id: string) => {
    if (!(await performValidation("start"))) return;

    setStreamedText("");
    setPhaseProgress(null);

    const result = await loadSlotForPlay(id, {
      onStream: (text) => setStreamedText((prev) => prev + text),
      onPhaseProgress: (progress) => setPhaseProgress(progress),
    });

    if (result === "load-failed") {
      showToast(t("saves.loadFailed") || "Failed to load save", "error");
      return;
    }

    // Close the save manager
    setIsSaveManagerOpen(false);

    if (result === "navigated-game") {
      navigate("/game");
      return;
    }

    if (result === "invalid-state") {
      showToast(t("saves.invalidState") || "Save appears to be corrupted", "error");
    }
  };

  const LoadingFallback = () => (
    <div className="fixed inset-0 flex items-center justify-center z-[100] ui-overlay backdrop-blur pointer-events-none">
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
                  onRenameSlot={engineActions.renameSlot}
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
                  seedImageUrl={seedImageUrl}
                  showToolCallCarousel={
                    aiSettings.extra?.toolCallCarousel ?? true
                  }
                  liveToolCalls={gameState.liveToolCalls || []}
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
            onRename={engineActions.renameSlot}
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
              {t("common.theme")}{" "}
              <span className="text-theme-primary">{currentEnvThemeKey}</span>
            </div>
            <button
              onClick={() =>
                setDebugState((prev) => ({ ...prev, showSlideshow: false }))
              }
              className="text-white/50 hover:text-white px-2"
              title={t("debug.close")}
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
