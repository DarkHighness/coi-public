import React, { useState, useEffect, useRef, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAmbience } from "../../hooks/useAmbience";
import { FeedLayout, ListState, UIState, ActionResult } from "../../types";
import { MobileNav, MobileTab } from "../MobileNav";
import {
  AISettings,
  GameState,
  StorySegment,
  SaveSlot,
  LanguageCode,
} from "../../types";
import { useWakeLock } from "../../hooks/useWakeLock";
import { GenerationTimer } from "../common/GenerationTimer";
import { useToastManager, ToastContainer } from "../Toast";

// Lazy Load Components
const MagicMirror = React.lazy(() =>
  import("../MagicMirror").then((module) => ({
    default: module.MagicMirror,
  })),
);
const VeoScriptModal = React.lazy(() =>
  import("../VeoScriptModal").then((module) => ({
    default: module.VeoScriptModal,
  })),
);
const DestinyMap = React.lazy(() =>
  import("../DestinyMap").then((module) => ({
    default: module.DestinyMap,
  })),
);
const LogPanel = React.lazy(() =>
  import("../sidebar/LogPanel").then((module) => ({
    default: module.LogPanel,
  })),
);
const StateEditor = React.lazy(() =>
  import("../StateEditor").then((module) => ({
    default: module.StateEditor,
  })),
);
const MobileGameLayout = React.lazy(() =>
  import("../layout/MobileGameLayout").then((module) => ({
    default: module.MobileGameLayout,
  })),
);
const DesktopGameLayout = React.lazy(() =>
  import("../layout/DesktopGameLayout").then((module) => ({
    default: module.DesktopGameLayout,
  })),
);
const RAGDebugger = React.lazy(() =>
  import("../RAGDebugger").then((module) => ({
    default: module.RAGDebugger,
  })),
);

interface GamePageProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  currentHistory: StorySegment[];
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  isTranslating: boolean;
  handleAction: (action: string) => Promise<ActionResult | null>;
  aiSettings: AISettings;
  handleSaveSettings: (settings: AISettings) => void;
  navigateToNode: (nodeId: string, isFork?: boolean) => void;
  generateImageForNode: (nodeId: string) => Promise<void>;
  showToast: (msg: string, type?: "info" | "error") => void;
  onOpenSettings: () => void;
  onOpenSaves: () => void;
  themeFont: string;
  saveSlots: SaveSlot[];
  switchSlot: (id: string) => Promise<void>;
  deleteSlot: (id: string) => void;
  currentSlotId: string | null;
  onViewedSegmentChange: (segment: StorySegment) => void;
}

export const GamePage: React.FC<GamePageProps> = ({
  gameState,
  setGameState,
  currentHistory,
  language,
  setLanguage,
  isTranslating,
  handleAction,
  aiSettings,
  handleSaveSettings,
  navigateToNode,
  generateImageForNode,
  showToast,
  onOpenSettings,
  onOpenSaves,
  themeFont,
  saveSlots,
  switchSlot,
  deleteSlot,
  currentSlotId,
  onViewedSegmentChange,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Toast Manager for multiple toast notifications
  const { toasts, pushToast, removeToast, pushStateChangeToasts } =
    useToastManager();

  // Local State
  const [feedLayout, setFeedLayout] = useState<FeedLayout>("scroll");
  const [isDestinyMapOpen, setIsDestinyMapOpen] = useState(false);
  const [isLogPanelOpen, setIsLogPanelOpen] = useState(false);
  const [isMagicMirrorOpen, setIsMagicMirrorOpen] = useState(false);
  const [magicMirrorImage, setMagicMirrorImage] = useState<string | null>(null);
  const [isVeoScriptOpen, setIsVeoScriptOpen] = useState(false);
  const [isStateEditorOpen, setIsStateEditorOpen] = useState(false);
  const [isRAGDebuggerOpen, setIsRAGDebuggerOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("story");
  const [isTyping, setIsTyping] = useState(false);
  const [currentAmbience, setCurrentAmbience] = useState<string | undefined>(
    undefined,
  );

  // Ref to track last played environment for notifications
  const lastPlayedEnvRef = useRef<string | undefined>(undefined);

  // Reset typing state when a new model segment appears
  useEffect(() => {
    const last = currentHistory[currentHistory.length - 1];
    if (last?.role === "model") {
      setIsTyping(true);
    } else {
      setIsTyping(false);
    }
  }, [currentHistory]);

  // Wake Lock
  useWakeLock(isTyping || gameState.isProcessing);

  // Audio Ambience Logic
  const isAnyMenuOpen =
    isDestinyMapOpen ||
    isLogPanelOpen ||
    isMagicMirrorOpen ||
    isVeoScriptOpen ||
    isStateEditorOpen ||
    isRAGDebuggerOpen;

  // Play ambience when story is visible and no menus are blocking
  // FIXED: Don't tie ambience to isTyping - ambience should continue playing
  const shouldPlayAmbience = !isAnyMenuOpen && mobileTab === "story";

  const currentSegment = currentHistory[currentHistory.length - 1];

  // Get atmosphere from most recent segment (unified system)
  const activeAtmosphere = currentHistory
    .slice()
    .reverse()
    .find((seg) => seg.atmosphere)?.atmosphere;

  useAmbience(
    shouldPlayAmbience ? activeAtmosphere : undefined,
    aiSettings.audioVolume?.bgmVolume ?? 0.5,
    aiSettings.audioVolume?.bgmMuted ?? false,
    (env) => {
      setCurrentAmbience(env);
      if (env !== lastPlayedEnvRef.current) {
        const envNameKey = "environmentNames." + env;
        showToast(`${t("audioSettings.environment")}: ${t(envNameKey)}`);
        lastPlayedEnvRef.current = env;
      }
    },
  );

  useEffect(() => {
    const savedLayout = localStorage.getItem("chronicles_feedlayout");
    if (savedLayout === "scroll" || savedLayout === "stack") {
      setFeedLayout(savedLayout as FeedLayout);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("chronicles_feedlayout", feedLayout);
  }, [feedLayout]);

  // Navigate back to / if there is no outline
  useEffect(() => {
    if (!gameState.outline) {
      console.error("Illegal gameState detected, redirecting to /", gameState);
      navigate("/");
    }
  }, [gameState.outline]);

  const handleFork = (nodeId: string) => {
    if (window.confirm(t("tree.forkConfirm"))) {
      navigateToNode(nodeId, true); // Pass isFork=true to create a new timeline branch
      setMobileTab("story"); // Switch back to story on fork
    }
  };

  const handleUpdateUIState = <K extends keyof UIState>(
    section: K,
    newState: UIState[K],
  ) => {
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
    const result = await handleAction(action);
    if (result) {
      if (result.success === false) {
        // Error case - show error toast
        pushToast(result.error, "error");
      } else if (result.success === true) {
        // Success case - show multiple toasts for state changes
        pushStateChangeToasts(result.stateChanges, t);
      }
    }
  };

  const handleNewGameClick = () => {
    navigate("/");
  };

  const defaultContinuePrompt =
    gameState.initialPrompt || `Continue the ${gameState.theme} story`;

  return (
    <div className="flex flex-1 h-full overflow-hidden relative z-10">
      <Suspense
        fallback={
          <div className="fixed inset-0 flex items-center justify-center z-[100] bg-black/50 backdrop-blur pointer-events-none">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-theme-primary border-t-transparent rounded-full animate-spin"></div>
              <GenerationTimer isActive={true} className="text-theme-primary" />
            </div>
          </div>
        }
      >
        <MobileGameLayout
          gameState={gameState}
          setGameState={setGameState}
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
          onRetry={() => {
            const lastUserAction = [...currentHistory]
              .reverse()
              .find((seg) => seg.role === "user");
            handleAction(lastUserAction?.text || defaultContinuePrompt);
          }}
          onFork={handleFork}
          onAction={handlePlayerAction}
          onNewGame={handleNewGameClick}
          onMagicMirror={() => setIsMagicMirrorOpen(true)}
          onSettings={onOpenSettings}
          onOpenSaves={onOpenSaves}
          onOpenMap={() => setIsDestinyMapOpen(true)}
          onOpenLogs={() => setIsLogPanelOpen(true)}
          aiSettings={aiSettings}
          onTypingComplete={() => setIsTyping(false)}
          currentAmbience={currentAmbience}
          onUpdateUIState={handleUpdateUIState}
          onToggleMute={handleToggleMute}
          onVeoScript={() => setIsVeoScriptOpen(true)}
          onViewedSegmentChange={onViewedSegmentChange}
          onShowToast={(msg, type) => pushToast(msg, type)}
          onOpenStateEditor={() => setIsStateEditorOpen(true)}
          onOpenRAG={() => setIsRAGDebuggerOpen(true)}
        />

        <DesktopGameLayout
          gameState={gameState}
          setGameState={setGameState}
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
          onRetry={() => {
            const lastUserAction = [...currentHistory]
              .reverse()
              .find((seg) => seg.role === "user");
            handleAction(lastUserAction?.text || defaultContinuePrompt);
          }}
          onFork={handleFork}
          onAction={handlePlayerAction}
          onNewGame={handleNewGameClick}
          onMagicMirror={() => setIsMagicMirrorOpen(true)}
          onSettings={onOpenSettings}
          onOpenSaves={onOpenSaves}
          onOpenMap={() => setIsDestinyMapOpen(true)}
          onOpenLogs={() => setIsLogPanelOpen(true)}
          aiSettings={aiSettings}
          onTypingComplete={() => setIsTyping(false)}
          currentAmbience={currentAmbience}
          onUpdateUIState={handleUpdateUIState}
          onToggleMute={handleToggleMute}
          onVeoScript={() => setIsVeoScriptOpen(true)}
          onViewedSegmentChange={onViewedSegmentChange}
          onShowToast={(msg, type) => pushToast(msg, type)}
          onOpenStateEditor={() => setIsStateEditorOpen(true)}
          onOpenRAG={() => setIsRAGDebuggerOpen(true)}
        />

        {/* Mobile Bottom Navigation */}
        <MobileNav currentTab={mobileTab} setTab={setMobileTab} />

        {/* Modals */}
        <MagicMirror
          isOpen={isMagicMirrorOpen}
          onClose={() => setIsMagicMirrorOpen(false)}
          initialImage={magicMirrorImage}
          themeFont={themeFont}
        />

        <VeoScriptModal
          isOpen={isVeoScriptOpen}
          onClose={() => setIsVeoScriptOpen(false)}
          gameState={gameState}
          currentHistory={currentHistory}
          themeFont={themeFont}
          onScriptGenerated={(script) => {
            setGameState((prev) => ({
              ...prev,
              veoScript: script,
            }));
          }}
        />

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

        {isStateEditorOpen && (
          <StateEditor
            isOpen={isStateEditorOpen}
            onClose={() => setIsStateEditorOpen(false)}
            gameState={gameState}
            setGameState={setGameState}
            onShowToast={(msg, type) => pushToast(msg, type)}
          />
        )}

        {isRAGDebuggerOpen && (
          <RAGDebugger
            isOpen={isRAGDebuggerOpen}
            onClose={() => setIsRAGDebuggerOpen(false)}
            themeFont={themeFont}
            gameState={gameState}
          />
        )}
      </Suspense>

      {/* Toast Container for multiple notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};
