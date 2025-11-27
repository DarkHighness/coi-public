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
import { Toast } from "./components/Toast";
import { THEMES, ENV_THEMES } from "./utils/constants";
import { getThemeKeyForAtmosphere } from "./utils/constants/atmosphere";
import { getEnvApiKey } from "./utils/env";
import { validateConnection } from "./services/aiService";
import { InitializingPage } from "./components/pages/InitializingPage";
import { GamePage } from "./components/pages/GamePage";
import { GlobalStyles } from "./components/GlobalStyles";
import {
  ErrorBoundary,
  SectionErrorBoundary,
} from "./components/common/ErrorBoundary";

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
  } = useGameEngine();

  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const [isSaveManagerOpen, setIsSaveManagerOpen] = useState(false);
  const [notification, setNotification] = useState<{
    show: boolean;
    msg: string;
    type: "info" | "error";
  }>({ show: false, msg: "", type: "info" });

  // Track currently viewed segment for dynamic theme/background
  const [viewedSegment, setViewedSegment] = useState<any | null>(null);

  // Track preview theme from StartScreen
  const [previewTheme, setPreviewTheme] = useState<string | null>(null);

  // Streaming text for initialization
  const [streamedText, setStreamedText] = useState("");

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
      // If we find a prompt (intention) but no image, it means we are in a scene
      // that *should* have an image but doesn't (generating or failed).
      // In this case, we return undefined to trigger the Fallback (Environment Image).
      if (seg.imagePrompt) return undefined;
    }
    // If we reach the start without finding anything, return undefined (Fallback)
    return undefined;
  }, [viewedSegment, currentHistory, isStartScreen]);

  const showToast = (msg: string, type: "info" | "error" = "info") => {
    setNotification({ show: true, msg, type });
    setTimeout(
      () => setNotification({ show: false, msg: "", type: "info" }),
      3000,
    );
  };

  const validateConfig = () => {
    const hasApiKey = (provider: string) => {
      if (provider === "gemini")
        return !!(aiSettings.gemini.apiKey || getEnvApiKey());
      if (provider === "openai") return !!aiSettings.openai.apiKey;
      if (provider === "openrouter") return !!aiSettings.openrouter?.apiKey;
      return false;
    };

    // Story is always enabled
    if (!hasApiKey(aiSettings.story.provider)) return false;

    // Check other enabled features
    if (aiSettings.image.enabled && !hasApiKey(aiSettings.image.provider))
      return false;
    if (aiSettings.audio.enabled && !hasApiKey(aiSettings.audio.provider))
      return false;
    if (aiSettings.video.enabled && !hasApiKey(aiSettings.video.provider))
      return false;

    return true;
  };

  const performValidation = async (): Promise<boolean> => {
    if (!validateConfig()) {
      showToast(t("missingApiKey"), "error");
      setIsSettingsOpen(true);
      return false;
    }

    showToast(t("validate-connection"), "info");

    // Story provider is REQUIRED - block if it fails
    const storyProvider = aiSettings.story.provider;
    const { isValid: storyValid, error: storyError } = await validateConnection(
      storyProvider as any,
    );
    if (!storyValid) {
      showToast(
        `${storyProvider}: ${storyError || "Connection Failed"} - Story generation is required`,
        "error",
      );
      setIsSettingsOpen(true);
      return false;
    }

    // Optional providers (image, audio, video) - just warn, don't block
    const optionalProviders: Array<{
      name: string;
      provider: string;
      enabled: boolean;
    }> = [
      {
        name: "Image",
        provider: aiSettings.image.provider,
        enabled: aiSettings.image.enabled !== false,
      },
      {
        name: "Audio",
        provider: aiSettings.audio.provider,
        enabled: aiSettings.audio.enabled !== false,
      },
      {
        name: "Video",
        provider: aiSettings.video.provider,
        enabled: aiSettings.video.enabled !== false,
      },
    ];

    for (const { name, provider, enabled } of optionalProviders) {
      if (enabled && provider !== storyProvider) {
        // Skip if same as story provider (already checked)
        const { isValid, error } = await validateConnection(provider as any);
        if (!isValid) {
          console.warn(`${name} provider validation failed:`, error);
          showToast(
            `Warning: ${name} (${provider}) unavailable - ${error || "Connection failed"}. Story will continue without ${name.toLowerCase()}.`,
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
      startNewGame(theme, customContext, (text) =>
        setStreamedText((prev) => prev + text),
      );
    }
  };

  const handleContinueGame = async () => {
    if (await performValidation()) {
      console.log("continue game, currentSlotId:", currentSlotId);
      if (currentSlotId) {
        navigate("/game");
      } else if (saveSlots.length > 0) {
        const sorted = [...saveSlots].sort((a, b) => b.timestamp - a.timestamp);
        const mostRecent = sorted[0];
        await loadSlot(mostRecent.id);
        navigate("/game");
      }
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
          currentSettings={aiSettings}
          onSave={handleSaveSettings}
          themeFont={currentThemeConfig.fontClass}
          showToast={showToast}
          themeMode={themeMode}
          onSetThemeMode={setThemeMode}
          onResetSettings={resetSettings}
          onClearAllSaves={clearAllSaves}
          saveCount={saveSlots.length}
        />
        {isSaveManagerOpen && (
          <SaveManager
            slots={saveSlots}
            currentSlotId={null}
            onSwitch={loadSlot}
            onDelete={deleteSlot}
            onClose={() => setIsSaveManagerOpen(false)}
          />
        )}
      </Suspense>

      <Toast
        show={isAutoSaving || notification.show}
        message={notification.show ? notification.msg : t("autoSaving")}
        type={notification.type}
      />

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
            {componentError && !persistenceError && !appError ? (
              <>
                <p className="text-xs text-theme-muted/80">
                  {t("app.errors.tryDismiss") ||
                    "You can try dismissing this error and continue. If the problem persists, reset the game data."}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setComponentError(null)}
                    className="flex-1 py-2 bg-theme-primary/20 hover:bg-theme-primary/30 text-theme-primary border border-theme-primary/30 rounded font-bold transition-colors text-xs"
                  >
                    {t("app.errors.dismissButton") || "Dismiss & Continue"}
                  </button>
                  <button
                    onClick={hardReset}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold transition-colors text-xs"
                  >
                    {t("app.errors.resetButton") || "Reset Game"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-theme-muted/80">
                  {t("app.errors.resetDescription") ||
                    "To fix this, you need to reset the game data. This will clear all saves and settings."}
                </p>
                <button
                  onClick={hardReset}
                  className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold transition-colors uppercase tracking-wider text-xs"
                >
                  {t("app.errors.resetButton") || "Clear Data & Reset Game"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
