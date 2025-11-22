import React, { useState, useEffect, useRef, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAmbience } from "../../hooks/useAmbience";
import { FeedLayout, ListState, UIState } from "../../types";
import { MobileNav, MobileTab } from "../MobileNav";
import {
  AISettings,
  GameState,
  StorySegment,
  SaveSlot,
  LanguageCode,
} from "../../types";

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

interface GamePageProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  currentHistory: StorySegment[];
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  isTranslating: boolean;
  handleAction: (action: string) => Promise<string | null>;
  aiSettings: AISettings;
  handleSaveSettings: (settings: AISettings) => void;
  navigateToNode: (nodeId: string) => void;
  generateImageForNode: (nodeId: string) => Promise<void>;
  showToast: (msg: string, type?: "info" | "error") => void;
  onOpenSettings: () => void;
  onOpenSaves: () => void;
  themeFont: string;
  saveSlots: SaveSlot[];
  switchSlot: (id: string) => Promise<void>;
  deleteSlot: (id: string) => void;
  currentSlotId: string | null;
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
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Local State
  const [feedLayout, setFeedLayout] = useState<FeedLayout>("scroll");
  const [isDestinyMapOpen, setIsDestinyMapOpen] = useState(false);
  const [isLogPanelOpen, setIsLogPanelOpen] = useState(false);
  const [isMagicMirrorOpen, setIsMagicMirrorOpen] = useState(false);
  const [magicMirrorImage, setMagicMirrorImage] = useState<string | null>(null);
  const [isVeoScriptOpen, setIsVeoScriptOpen] = useState(false);
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

  // Audio Ambience Logic
  const isAnyMenuOpen =
    isDestinyMapOpen || isLogPanelOpen || isMagicMirrorOpen || isVeoScriptOpen;

  const shouldPlayAmbience =
    isTyping && !isAnyMenuOpen && mobileTab === "story";

  const currentSegment = currentHistory[currentHistory.length - 1];

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

  useEffect(() => {
    const savedLayout = localStorage.getItem("chronicles_feedlayout");
    if (savedLayout === "scroll" || savedLayout === "stack") {
      setFeedLayout(savedLayout as FeedLayout);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("chronicles_feedlayout", feedLayout);
  }, [feedLayout]);

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

  const handleNewGameClick = () => {
    navigate("/");
  };

  return (
    <div className="flex flex-1 h-full overflow-hidden relative z-10">
      <Suspense
        fallback={
          <div className="fixed inset-0 flex items-center justify-center z-[100] bg-black/50 backdrop-blur pointer-events-none">
            <div className="w-10 h-10 border-4 border-theme-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        }
      >
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
          onRetry={() => {
            const lastUserAction = [...currentHistory]
              .reverse()
              .find((seg) => seg.role === "user");
            handleAction(lastUserAction?.text || "Continue the story");
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
          onRetry={() => {
            const lastUserAction = [...currentHistory]
              .reverse()
              .find((seg) => seg.role === "user");
            handleAction(lastUserAction?.text || "Continue the story");
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
      </Suspense>
    </div>
  );
};
