import React, { useState, useRef, useEffect, Suspense } from "react";
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
import { FeedLayout, UIState, ListState } from "./types";
import { MobileNav, MobileTab } from "./components/MobileNav";
import { getEnvApiKey } from "./utils/env";
import { validateConnection } from "./services/aiService";
import { useAmbience } from "./hooks/useAmbience";

// Load storage utilities in development
if (import.meta.env.DEV) {
  import("./utils/storageUtils");
}

// Lazy Load Heavy Components for Code Splitting
const MagicMirror = React.lazy(() =>
  import("./components/MagicMirror").then((module) => ({
    default: module.MagicMirror,
  })),
);
const SettingsModal = React.lazy(() =>
  import("./components/SettingsModal").then((module) => ({
    default: module.SettingsModal,
  })),
);
const VeoScriptModal = React.lazy(() =>
  import("./components/VeoScriptModal").then((module) => ({
    default: module.VeoScriptModal,
  })),
);
const SaveManager = React.lazy(() =>
  import("./components/SaveManager").then((module) => ({
    default: module.SaveManager,
  })),
);
const DestinyMap = React.lazy(() =>
  import("./components/DestinyMap").then((module) => ({
    default: module.DestinyMap,
  })),
);
const EnvironmentalEffects = React.lazy(() =>
  import("./components/EnvironmentalEffects").then((module) => ({
    default: module.EnvironmentalEffects,
  })),
);
const LogPanel = React.lazy(() =>
  import("./components/sidebar/LogPanel").then((module) => ({
    default: module.LogPanel,
  })),
);
const MobileGameLayout = React.lazy(() =>
  import("./components/layout/MobileGameLayout").then((module) => ({
    default: module.MobileGameLayout,
  })),
);
const DesktopGameLayout = React.lazy(() =>
  import("./components/layout/DesktopGameLayout").then((module) => ({
    default: module.DesktopGameLayout,
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
    isMagicMirrorOpen,
    setIsMagicMirrorOpen,
    magicMirrorImage,
    setMagicMirrorImage,
    isVeoScriptOpen,
    setIsVeoScriptOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    aiSettings,
    handleSaveSettings,
    currentHistory,
    saveSlots,
    switchSlot,
    deleteSlot,
    currentSlotId,
    navigateToNode,
    generateImageForNode,
    themeMode,
    toggleThemeMode,
    setThemeMode,
  } = useGameEngine();

  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const [feedLayout, setFeedLayout] = useState<FeedLayout>("scroll");
  const [isSaveManagerOpen, setIsSaveManagerOpen] = useState(false);
  const [isDestinyMapOpen, setIsDestinyMapOpen] = useState(false);
  const [isLogPanelOpen, setIsLogPanelOpen] = useState(false);
  const [notification, setNotification] = useState<{
    show: boolean;
    msg: string;
    type: "info" | "error";
  }>({ show: false, msg: "", type: "info" });

  // Mobile Nav State
  const [mobileTab, setMobileTab] = useState<MobileTab>("story");

  // Typing State for Audio Control
  const [isTyping, setIsTyping] = useState(false);

  // Ambient Audio State
  const [currentAmbience, setCurrentAmbience] = useState<string | undefined>(
    undefined,
  );

  // Track currently viewed segment for dynamic theme/background
  const [viewedSegment, setViewedSegment] = useState<any | null>(null);

  // Track preview theme from StartScreen
  const [previewTheme, setPreviewTheme] = useState<string | null>(null);

  // Reset viewed segment to latest when history updates (new turn)
  useEffect(() => {
    if (currentHistory.length > 0) {
      setViewedSegment(currentHistory[currentHistory.length - 1]);
    }
  }, [currentHistory.length]);

  // Ref to track last played environment for notifications
  const lastPlayedEnvRef = useRef<string | undefined>(undefined);

  const currentStoryTheme = THEMES[gameState.theme] || THEMES.fantasy;

  // Use viewed segment's envTheme if available, otherwise fall back to current game state
  // Priority: Preview Theme (StartScreen) > Viewed Segment (History Scroll) > Current Game State
  const targetSegment = viewedSegment || currentHistory[currentHistory.length - 1];

  let currentEnvThemeKey = gameState.envTheme || currentStoryTheme.defaultEnvTheme;

  if (previewTheme) {
    const previewStoryTheme = THEMES[previewTheme] || THEMES.fantasy;
    currentEnvThemeKey = previewStoryTheme.defaultEnvTheme;
  } else if (targetSegment?.envTheme) {
    currentEnvThemeKey = targetSegment.envTheme;
  }

  const currentThemeConfig = ENV_THEMES[currentEnvThemeKey] || ENV_THEMES.fantasy;

  // Determine current context for effects
  const currentSegment = currentHistory[currentHistory.length - 1];

  // Reset typing state when a new model segment appears
  useEffect(() => {
    const last = currentHistory[currentHistory.length - 1];
    if (last?.role === "model") {
      setIsTyping(true);
    } else {
      setIsTyping(false);
    }
  }, [currentHistory]);

  // Audio Ambience Logic
  const isAnyMenuOpen =
    isSettingsOpen ||
    isSaveManagerOpen ||
    isDestinyMapOpen ||
    isLogPanelOpen ||
    isMagicMirrorOpen;
  const shouldPlayAmbience =
    location.pathname === "/game" &&
    isTyping &&
    !isAnyMenuOpen &&
    mobileTab === "story";

  useAmbience(
    shouldPlayAmbience ? currentSegment?.environment : undefined,
    aiSettings.audioVolume?.bgmVolume ?? 0.5,
    aiSettings.audioVolume?.bgmMuted ?? false,
    (env) => {
      setCurrentAmbience(env);
      if (env !== lastPlayedEnvRef.current) {
        const envNameKey = "ambienceNames." + env;
        showToast(`${t("audioSettings.environment")}: ${t(envNameKey)}`);
        lastPlayedEnvRef.current = env;
      }
    },
  );

  const effectText = currentSegment ? currentSegment.text : "";
  const effectPrompt = currentSegment ? currentSegment.imagePrompt : "";

  useEffect(() => {
    const savedLayout = localStorage.getItem("chronicles_feedlayout");
    if (savedLayout === "scroll" || savedLayout === "stack") {
      setFeedLayout(savedLayout as FeedLayout);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("chronicles_feedlayout", feedLayout);
  }, [feedLayout]);

  const showToast = (msg: string, type: "info" | "error" = "info") => {
    setNotification({ show: true, msg, type });
    setTimeout(
      () => setNotification({ show: false, msg: "", type: "info" }),
      3000,
    );
  };

  const handleFork = (nodeId: string) => {
    if (window.confirm(t("tree.forkConfirm"))) {
      navigateToNode(nodeId);
      setMobileTab("story"); // Switch back to story on fork
    }
  };

  const handleUpdateUIState = (section: keyof UIState, newState: ListState) => {
    setGameState((prev) => ({
      ...prev,
      uiState: {
        ...prev.uiState,
        [section]: newState,
      },
    }));
  };

  const handleToggleMute = () => {
    const newMuted = !aiSettings.audioVolume?.bgmMuted;
    const newSettings = {
      ...aiSettings,
      audioVolume: {
        ...aiSettings.audioVolume,
        bgmMuted: newMuted,
      },
    };
    handleSaveSettings(newSettings);

    showToast(
      newMuted
        ? t("audioSettings.muted") || "Muted"
        : t("audioSettings.unmuted") || "Unmuted",
      "info",
    );
  };

  const handlePlayerAction = async (action: string) => {
    const toastMsg = await handleAction(action);
    if (toastMsg) {
      if (toastMsg.startsWith("Error:")) {
        showToast(toastMsg.replace("Error: ", ""), "error");
      } else {
        showToast(toastMsg);
      }
    }
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
      startNewGame(theme, customContext);
    }
  };

  const handleContinueGame = async () => {
    if (await performValidation()) {
      if (currentSlotId) {
        navigate("/game");
      } else if (saveSlots.length > 0) {
        const sorted = [...saveSlots].sort((a, b) => b.timestamp - a.timestamp);
        const mostRecent = sorted[0];
        await switchSlot(mostRecent.id);
      }
    }
  };

  const handleNewGameClick = () => {
    // Navigate to start screen for new game selection
    navigate("/");
  };

  const LoadingFallback = () => (
    <div className="fixed inset-0 flex items-center justify-center z-[100] bg-black/50 backdrop-blur pointer-events-none">
      <div className="w-10 h-10 border-4 border-theme-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="h-[100dvh] w-full flex flex-col overflow-hidden bg-theme-bg text-theme-text font-sans transition-colors duration-1000 relative">
      {/* Global Styles based on theme */}
      <style>{`
        :root {
          --theme-bg: ${currentThemeConfig.vars["--theme-bg"]};
          --theme-surface: ${currentThemeConfig.vars["--theme-surface"]};
          --theme-surface-highlight: ${currentThemeConfig.vars["--theme-surface-highlight"]};
          --theme-border: ${currentThemeConfig.vars["--theme-border"]};
          --theme-primary: ${currentThemeConfig.vars["--theme-primary"]};
          --theme-primary-hover: ${currentThemeConfig.vars["--theme-primary-hover"]};
          --theme-text: ${currentThemeConfig.vars["--theme-text"]};
          --theme-muted: ${currentThemeConfig.vars["--theme-muted"]};
        }
      `}</style>

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
            theme={gameState.theme}
            backgroundImage={targetSegment?.imageUrl}
          />
        </Suspense>
      </div>

      <Routes>
        <Route
          path="/"
          element={
            <>
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
              />
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
                />
                {isSaveManagerOpen && (
                  <SaveManager
                    slots={saveSlots}
                    currentSlotId={null}
                    onSwitch={switchSlot}
                    onDelete={deleteSlot}
                    onClose={() => setIsSaveManagerOpen(false)}
                  />
                )}
              </Suspense>
            </>
          }
        />

        <Route
          path="/initializing"
          element={
            <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-theme-bg text-theme-primary relative overflow-hidden">
              {/* Cinematic Background */}
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 animate-pulse z-0"></div>
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40 z-0"></div>

              {/* Central Loader */}
              <div className="relative z-10 flex flex-col items-center gap-12 animate-fade-in">
                <div className="relative group">
                  {/* Outer Ring */}
                  <div className="w-32 h-32 border-[1px] border-theme-primary/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
                  {/* Middle Ring */}
                  <div className="absolute inset-2 border-[2px] border-t-theme-primary border-r-transparent border-b-theme-primary/50 border-l-transparent rounded-full animate-[spin_3s_linear_infinite]"></div>
                  {/* Inner Ring */}
                  <div className="absolute inset-6 border-[1px] border-theme-primary/80 rounded-full animate-pulse shadow-[0_0_30px_rgba(var(--theme-primary),0.5)]"></div>

                  {/* Center Core */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 bg-theme-primary rounded-full animate-ping"></div>
                  </div>
                </div>

                {/* Text Content */}
                <div className="text-center space-y-4">
                  <h2
                    className={`text-4xl md:text-6xl ${currentThemeConfig.fontClass} tracking-[0.2em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-theme-muted via-theme-primary to-theme-muted animate-shimmer bg-[length:200%_auto] font-bold`}
                  >
                    {t("outline.generating")}
                  </h2>
                  <div className="flex items-center justify-center gap-2 text-theme-muted/80 text-xs md:text-sm uppercase tracking-[0.3em]">
                    <span className="w-8 h-[1px] bg-theme-primary/50"></span>
                    <span>{t("loading")}</span>
                    <span className="w-8 h-[1px] bg-theme-primary/50"></span>
                  </div>
                </div>
              </div>
            </div>
          }
        />

        <Route
          path="/game"
          element={
            !gameState.outline ? (
              <Navigate to="/" replace />
            ) : (
              <div className="flex flex-1 h-full overflow-hidden relative z-10">
                <Suspense fallback={<LoadingFallback />}>
                  <MobileGameLayout
                    gameState={gameState}
                    currentHistory={currentHistory}
                    language={language}
                    setLanguage={setLanguage}
                    isTranslating={isTranslating}
                    mobileTab={mobileTab}
                    setMobileTab={setMobileTab}
                    feedLayout={feedLayout}
                    setFeedLayout={setFeedLayout}
                    onAnimate={(url) => {
                      setMagicMirrorImage(url);
                      setIsMagicMirrorOpen(true);
                    }}
                    onGenerateImage={generateImageForNode}
                    onRetry={() =>
                      handleAction(
                        currentHistory[currentHistory.length - 1]?.text ||
                          "Retry",
                      )
                    }
                    onFork={handleFork}
                    onAction={handlePlayerAction}
                    onNewGame={handleNewGameClick}
                    onMagicMirror={() => setIsMagicMirrorOpen(true)}
                    onSettings={() => setIsSettingsOpen(true)}
                    onOpenSaves={() => setIsSaveManagerOpen(true)}
                    onOpenMap={() => setIsDestinyMapOpen(true)}
                    onOpenLogs={() => setIsLogPanelOpen(true)}
                    aiSettings={aiSettings}
                    onTypingComplete={() => setIsTyping(false)}
                    currentAmbience={currentAmbience}
                    onUpdateUIState={handleUpdateUIState}
                    onToggleMute={handleToggleMute}
                    onVeoScript={() => setIsVeoScriptOpen(true)}
                  />

                  <DesktopGameLayout
                    gameState={gameState}
                    currentHistory={currentHistory}
                    language={language}
                    setLanguage={setLanguage}
                    isTranslating={isTranslating}
                    feedLayout={feedLayout}
                    setFeedLayout={setFeedLayout}
                    onAnimate={(url) => {
                      setMagicMirrorImage(url);
                      setIsMagicMirrorOpen(true);
                    }}
                    onGenerateImage={generateImageForNode}
                    onRetry={() =>
                      handleAction(
                        currentHistory[currentHistory.length - 1]?.text ||
                          "Retry",
                      )
                    }
                    onFork={handleFork}
                    onAction={handlePlayerAction}
                    onNewGame={handleNewGameClick}
                    onMagicMirror={() => setIsMagicMirrorOpen(true)}
                    onSettings={() => setIsSettingsOpen(true)}
                    onOpenSaves={() => setIsSaveManagerOpen(true)}
                    onOpenMap={() => setIsDestinyMapOpen(true)}
                    onOpenLogs={() => setIsLogPanelOpen(true)}
                    aiSettings={aiSettings}
                    onTypingComplete={() => setIsTyping(false)}
                    currentAmbience={currentAmbience}
                    onUpdateUIState={handleUpdateUIState}
                    onToggleMute={handleToggleMute}
                    onVeoScript={() => setIsVeoScriptOpen(true)}
                  />

                  {/* Mobile Bottom Navigation */}
                  <MobileNav currentTab={mobileTab} setTab={setMobileTab} />

                  {/* Modals */}
                  <MagicMirror
                    isOpen={isMagicMirrorOpen}
                    onClose={() => setIsMagicMirrorOpen(false)}
                    initialImage={magicMirrorImage}
                    themeFont={currentThemeConfig.fontClass}
                  />

                  <VeoScriptModal
                    isOpen={isVeoScriptOpen}
                    onClose={() => setIsVeoScriptOpen(false)}
                    gameState={gameState}
                    currentHistory={currentHistory}
                    themeFont={currentThemeConfig.fontClass}
                  />

                  <SettingsModal
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    currentSettings={aiSettings}
                    onSave={handleSaveSettings}
                    themeFont={currentThemeConfig.fontClass}
                    showToast={showToast}
                    themeMode={themeMode}
                    onSetThemeMode={setThemeMode}
                  />

                  {isSaveManagerOpen && (
                    <SaveManager
                      slots={saveSlots}
                      currentSlotId={currentSlotId}
                      onSwitch={switchSlot}
                      onDelete={deleteSlot}
                      onClose={() => setIsSaveManagerOpen(false)}
                    />
                  )}

                  {isDestinyMapOpen && (
                    <DestinyMap
                      gameState={gameState}
                      onNavigate={(nodeId) => {
                        navigateToNode(nodeId);
                        setMobileTab("story");
                      }}
                      onClose={() => setIsDestinyMapOpen(false)}
                    />
                  )}

                  {isLogPanelOpen && (
                    <LogPanel
                      logs={gameState.logs}
                      onClose={() => setIsLogPanelOpen(false)}
                    />
                  )}
                </Suspense>
              </div>
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toast
        show={isAutoSaving || notification.show}
        message={notification.show ? notification.msg : t("autoSaving")}
        type={notification.type}
      />
    </div>
  );
}
