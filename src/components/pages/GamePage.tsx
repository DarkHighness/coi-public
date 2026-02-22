import React, {
  useState,
  useEffect,
  useRef,
  Suspense,
  useCallback,
  useMemo,
} from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAmbience } from "../../hooks/useAmbience";
import { useIsMobile } from "../../hooks/useMediaQuery";
import { FeedLayout, ListState, UIState, ActionResult } from "../../types";
import { MobileNav, MobileTab } from "../MobileNav";
import {
  AISettings,
  GameState,
  StorySegment,
  SaveSlot,
  LanguageCode,
  PlayerRateInput,
  ThemeConfig,
} from "../../types";
import { useWakeLock } from "../../hooks/useWakeLock";
import { GenerationTimer } from "../common/GenerationTimer";
import { useToast } from "../Toast";
import { useRuntimeContext } from "../../runtime/context";
import { useSettings } from "../../hooks/useSettings";
import { useTutorialContextOptional } from "../../contexts/TutorialContext";
import { createGamePageTutorialFlow } from "../tutorial/tutorialFlows";
import { vfsElevationTokenManager } from "../../services/vfs/core/elevation";
import { patchTurnMediaForNode } from "../../services/vfs/turnMedia";

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
const GameStateViewer = React.lazy(() =>
  import("../GameStateViewer").then((module) => ({
    default: module.GameStateViewer,
  })),
);
const PhotoGalleryModal = React.lazy(() =>
  import("../PhotoGalleryModal").then((module) => ({
    default: module.PhotoGalleryModal,
  })),
);

interface GamePageProps {
  /** Callback when viewed segment changes (for parent theme/background updates) */
  onViewedSegmentChange: (segment: StorySegment) => void;
  /** Callback to open settings modal */
  onOpenSettings: () => void;
  /** Callback to open saves modal */
  onOpenSaves: () => void;
  /** Optional theme override from App (for debug/preview) */
  overrideThemeConfig?: Partial<ThemeConfig>;
}

export const GamePage: React.FC<GamePageProps> = ({
  onViewedSegmentChange,
  onOpenSettings,
  onOpenSaves,
  overrideThemeConfig,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { state: engineState, actions: engineActions } = useRuntimeContext();
  const {
    gameState,
    currentHistory,
    language,
    aiSettings,
    saveSlots,
    currentSlotId,
    failedImageNodes,
    themeFont: engineThemeFont,
    vfsSession,
  } = engineState;

  // Use override font if provided (debug), otherwise usage engine state
  const themeFont = overrideThemeConfig?.fontClass || engineThemeFont;
  const {
    setLanguage,
    handleAction,
    handleSaveSettings,
    navigateToNode,
    generateImageForNode,
    loadSlot,
    deleteSlot,
    triggerSave,
    handleForceUpdate,
    handlePlayerRate,
    rebuildContext,
    invalidateSession,
    updateUiState,
    updateNodeMeta,
    setVeoScript,
  } = engineActions;

  // Toast Context for toast notifications
  const { showToast, pushStateChangeToasts } = useToast();

  // Local State - feedLayout now initialized from UIState
  const [feedLayout, setFeedLayoutLocal] = useState<FeedLayout>(
    gameState.uiState.feedLayout ?? "scroll",
  );
  const [isDestinyMapOpen, setIsDestinyMapOpen] = useState(false);
  const [isLogPanelOpen, setIsLogPanelOpen] = useState(false);
  const [isMagicMirrorOpen, setIsMagicMirrorOpen] = useState(false);
  const [magicMirrorImage, setMagicMirrorImage] = useState<string | null>(null);
  const [isVeoScriptOpen, setIsVeoScriptOpen] = useState(false);
  const [isStateEditorOpen, setIsStateEditorOpen] = useState(false);
  const [stateEditorSessionToken, setStateEditorSessionToken] = useState<
    string | null
  >(null);
  const [isGameStateViewerOpen, setIsGameStateViewerOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("story");
  const [isTyping, setIsTyping] = useState(false);
  const [currentAmbience, setCurrentAmbience] = useState<string | undefined>(
    undefined,
  );

  // Tutorial state - use TutorialContext
  const { settings, updateSettings } = useSettings();
  const tutorial = useTutorialContextOptional();

  // Start tutorial after first turn is generated or when continuing a saved game
  useEffect(() => {
    // Only start tutorial if:
    // 1. Tutorial context exists and is not active
    // 2. Tutorial not already completed
    // 3. There is at least one message (first turn generated or continuing a game)
    const hasContent = currentHistory && currentHistory.length > 0;

    if (
      tutorial &&
      !tutorial.isActive &&
      settings.extra?.tutorialGamePageCompleted !== true &&
      hasContent
    ) {
      const flow = createGamePageTutorialFlow(t);
      tutorial.startTutorial(flow);
    }
  }, [tutorial, settings.extra?.tutorialGamePageCompleted, t, currentHistory]);

  // Conditional layout rendering
  const isMobile = useIsMobile();

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
    isGameStateViewerOpen ||
    isGalleryOpen;

  // Play ambience when no menus are blocking
  const shouldPlayAmbience = !isAnyMenuOpen;

  const currentSegment = currentHistory[currentHistory.length - 1];

  // Get atmosphere from most recent segment (unified system)
  const activeAtmosphere = useMemo(() => {
    for (let i = currentHistory.length - 1; i >= 0; i -= 1) {
      const atmosphere = currentHistory[i]?.atmosphere;
      if (atmosphere) return atmosphere;
    }
    return undefined;
  }, [currentHistory]);

  const { resumeAudio } = useAmbience(
    shouldPlayAmbience ? activeAtmosphere : undefined,
    aiSettings.audioVolume?.bgmVolume ?? 0.5,
    aiSettings.audioVolume?.bgmMuted ?? false,
    (env) => {
      setCurrentAmbience(env);
      if (env !== lastPlayedEnvRef.current) {
        const envNameKey = "ambienceNames." + env;
        showToast(
          t("audioSettings.environmentChanged", { env: t(envNameKey) }),
          "info",
        );
        lastPlayedEnvRef.current = env;
      }
    },
  );

  // Persist feedLayout to UIState (replaces localStorage)
  const setFeedLayout = useCallback(
    (newLayout: FeedLayout) => {
      setFeedLayoutLocal(newLayout);
      updateUiState("feedLayout", newLayout, {
        reason: "gamePage.feedLayout",
        persist: false,
      });
    },
    [updateUiState],
  );

  // Initialize feedLayout from UIState on mount
  useEffect(() => {
    const storedLayout = gameState.uiState.feedLayout;
    if (storedLayout && storedLayout !== feedLayout) {
      setFeedLayoutLocal(storedLayout);
    }
  }, []);

  // Navigate back to / if there is no outline
  // But if there's a saved conversation state, navigate to / so user can click Continue to resume
  useEffect(() => {
    if (!gameState.outline) {
      if (gameState.outlineConversation) {
        // Has partial progress - navigate to home so user can click "Continue" to resume
        console.log(
          "[GamePage] Outline incomplete but has conversation state, redirecting to / for resume",
        );
      } else {
        console.error(
          "Illegal gameState detected, redirecting to /",
          gameState,
        );
      }
      navigate("/");
    }
  }, [gameState.outline, gameState.outlineConversation]);

  const handleFork = (nodeId: string) => {
    // Only allow forking from model nodes (AI responses)
    const targetNode = gameState.nodes[nodeId];
    if (!targetNode) {
      console.warn(`[Fork] Node ${nodeId} not found`);
      return;
    }

    if (targetNode.role !== "model") {
      // Find the parent model node if this is a user node
      let parentModelNode: string | null = null;
      if (targetNode.parentId) {
        const parent = gameState.nodes[targetNode.parentId];
        if (parent?.role === "model") {
          parentModelNode = parent.id;
        }
      }

      if (parentModelNode) {
        showToast(
          t("tree.forkFromModelOnly") ||
            "Forking from the previous AI response instead",
          "info",
        );
        if (window.confirm(t("tree.forkConfirm"))) {
          navigateToNode(parentModelNode, true);
          setMobileTab("story");
        }
      } else {
        showToast(
          t("tree.cannotForkFromUser") ||
            "Cannot fork from this node - please select an AI response",
          "error",
        );
      }
      return;
    }

    if (window.confirm(t("tree.forkConfirm"))) {
      navigateToNode(nodeId, true); // Pass isFork=true to create a new timeline branch
      setMobileTab("story"); // Switch back to story on fork
    }
  };

  const handleUpdateUIState = <K extends keyof UIState>(
    section: K,
    newState: UIState[K],
  ) => {
    updateUiState(section, newState, {
      reason: `gamePage.uiState.${String(section)}`,
      persist: false,
    });
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

    // On mobile, we need to trigger audio play within the user gesture
    // Resume audio immediately when unmuting (this is called from click handler)
    if (!newMuted) {
      // Use resumeAudio which handles WebAudio context unlocking
      resumeAudio();
    }

    showToast(
      newMuted
        ? t("audioSettings.muted") || "Muted"
        : t("audioSettings.unmuted") || "Unmuted",
      "info",
    );
  };

  const handlePlayerAction = async (action: string) => {
    const result = await handleAction(action);
    if (result === null) {
      console.warn("[GamePage] Player action returned null (ignored)", {
        turnNumber: gameState.turnNumber,
        isProcessing: gameState.isProcessing,
        actionPreview:
          typeof action === "string"
            ? action.slice(0, 120)
            : String(action).slice(0, 120),
      });
      return;
    }
    if (result) {
      if (result.success === false) {
        // Error case - show error toast
        showToast(result.error, "error");
      } else if (result.success === true) {
        // Success case - show multiple toasts for state changes
        pushStateChangeToasts(result.stateChanges, t);
      }
    }
  };

  const handleNewGameClick = () => {
    navigate("/");
  };

  const handleRetry = async () => {
    const themeName = t(`${gameState.theme}.name`, { ns: "themes" });
    const prompt = t("initialPrompt.begin", { theme: themeName });
    const defaultInitialPrompt = gameState.initialPrompt || prompt;

    console.log("[GamePage] handleRetry called", {
      currentHistoryLength: currentHistory.length,
    });

    // If the length of currentHistory is 1 or 2, we are retrying to regenerate the first turn
    // We need to remove the first segment from currentHistory
    if (
      (currentHistory.length === 1 && currentHistory[0].role === "model") ||
      (currentHistory.length === 2 &&
        currentHistory[0].role === "user" &&
        currentHistory[1].role === "model")
    ) {
      // First turn retry - no parent yet, so preventFork is irrelevant but good practice
      // We use isInit=true to force a new root node creation
      handleAction(defaultInitialPrompt, true, undefined, undefined, true);
      return;
    }

    // Find the last user segment to retry from
    const lastSegment = [...currentHistory]
      .reverse()
      .find((seg) => seg.role === "user" || seg.role === "command");

    console.log("[GamePage] Retry lastSegment:", lastSegment);

    if (lastSegment && lastSegment.role === "user") {
      // Retry using the SAME parent ID as the original user segment
      handleAction(
        lastSegment.text,
        false,
        undefined,
        lastSegment.parentId || undefined,
        true, // preventFork is explicitly true here
      );
    } else if (lastSegment && lastSegment.role === "command") {
      // We must encoutnered a command segment
      // Currently, only /sudo command has `command` role
      handleForceUpdate(lastSegment.text);
    } else {
      // The last segment is not a user segment, so we retry from the initial prompt
      // This implies we are restarting or lost context
      handleAction(defaultInitialPrompt, false, undefined, undefined, true);
    }
  };

  const handleImageUpload = (nodeId: string, imageId: string) => {
    const patched = patchTurnMediaForNode(vfsSession, nodeId, {
      imageId,
      imageUrl: null,
    });
    if (!patched) {
      console.warn("[GamePage] Failed to persist uploaded image to VFS", {
        nodeId,
        imageId,
      });
    }

    updateNodeMeta(
      nodeId,
      { imageId, imageUrl: undefined },
      {
        reason: "gamePage.imageUpload",
        persist: true,
      },
    );
    showToast(t("imageUploaded", "Image uploaded successfully"), "info");
  };

  const handleImageDelete = (nodeId: string) => {
    const patched = patchTurnMediaForNode(vfsSession, nodeId, {
      imageId: null,
      imageUrl: null,
    });
    if (!patched) {
      console.warn("[GamePage] Failed to persist image deletion to VFS", {
        nodeId,
      });
    }

    updateNodeMeta(
      nodeId,
      { imageId: undefined, imageUrl: undefined },
      {
        reason: "gamePage.imageDelete",
        persist: true,
      },
    );
    showToast(t("imageDeleted", "Image deleted successfully"), "info");
  };

  const handleSegmentRate = useCallback(
    async (segmentId: string, rate: PlayerRateInput) => {
      const result = await handlePlayerRate(segmentId, rate);
      if (!result.success && result.error) {
        showToast(result.error, "error");
      }
    },
    [handlePlayerRate, showToast],
  );

  const handleOpenStateEditor = () => {
    const confirmed =
      typeof window !== "undefined"
        ? window.confirm(
            t("stateEditor.openConfirm") ||
              "State Editor can modify game state. Continue to open this editor session?",
          )
        : false;

    if (!confirmed) {
      return;
    }

    const token = vfsElevationTokenManager.issueEditorSessionToken();
    setStateEditorSessionToken(token);
    setIsStateEditorOpen(true);
  };

  const handleCloseStateEditor = () => {
    if (stateEditorSessionToken) {
      vfsElevationTokenManager.revokeEditorSessionToken(
        stateEditorSessionToken,
      );
    }
    setStateEditorSessionToken(null);
    setIsStateEditorOpen(false);
  };

  useEffect(() => {
    return () => {
      if (stateEditorSessionToken) {
        vfsElevationTokenManager.revokeEditorSessionToken(
          stateEditorSessionToken,
        );
      }
    };
  }, [stateEditorSessionToken]);

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
        {isMobile ? (
          <MobileGameLayout
            mobileTab={mobileTab}
            setMobileTab={setMobileTab}
            feedLayout={feedLayout}
            setFeedLayout={setFeedLayout}
            onAnimate={(url) => {
              setMagicMirrorImage(url);
              setIsMagicMirrorOpen(true);
            }}
            onRetry={handleRetry}
            onRebuildContext={rebuildContext}
            onFork={handleFork}
            onAction={handlePlayerAction}
            onNewGame={handleNewGameClick}
            onMagicMirror={() => setIsMagicMirrorOpen(true)}
            onSettings={onOpenSettings}
            onOpenSaves={onOpenSaves}
            onOpenMap={() => setIsDestinyMapOpen(true)}
            onOpenLogs={() => setIsLogPanelOpen(true)}
            onTypingComplete={() => setIsTyping(false)}
            currentAmbience={currentAmbience}
            onUpdateUIState={handleUpdateUIState}
            onToggleMute={handleToggleMute}
            onVeoScript={() => setIsVeoScriptOpen(true)}
            onViewedSegmentChange={onViewedSegmentChange}
            onShowToast={(msg, type) => showToast(msg, type)}
            onOpenStateEditor={handleOpenStateEditor}
            onOpenViewer={() => setIsGameStateViewerOpen(true)}
            onOpenGallery={() => setIsGalleryOpen(true)}
            onForceUpdate={handleForceUpdate}
            onImageUpload={handleImageUpload}
            onImageDelete={handleImageDelete}
            onRate={handleSegmentRate}
          />
        ) : (
          <DesktopGameLayout
            feedLayout={feedLayout}
            setFeedLayout={setFeedLayout}
            onAnimate={(url) => {
              setMagicMirrorImage(url);
              setIsMagicMirrorOpen(true);
            }}
            onRetry={handleRetry}
            onRebuildContext={rebuildContext}
            onFork={handleFork}
            onAction={handlePlayerAction}
            onNewGame={handleNewGameClick}
            onMagicMirror={() => setIsMagicMirrorOpen(true)}
            onSettings={onOpenSettings}
            onOpenSaves={onOpenSaves}
            onOpenMap={() => setIsDestinyMapOpen(true)}
            onOpenLogs={() => setIsLogPanelOpen(true)}
            onTypingComplete={() => setIsTyping(false)}
            currentAmbience={currentAmbience}
            onUpdateUIState={handleUpdateUIState}
            onToggleMute={handleToggleMute}
            onVeoScript={() => setIsVeoScriptOpen(true)}
            onViewedSegmentChange={onViewedSegmentChange}
            onShowToast={(msg, type) => showToast(msg, type)}
            onOpenStateEditor={handleOpenStateEditor}
            onOpenViewer={() => setIsGameStateViewerOpen(true)}
            onOpenGallery={() => setIsGalleryOpen(true)}
            onForceUpdate={handleForceUpdate}
            onImageUpload={handleImageUpload}
            onImageDelete={handleImageDelete}
            onRate={handleSegmentRate}
          />
        )}

        {/* Mobile Bottom Navigation */}
        {isMobile && <MobileNav currentTab={mobileTab} setTab={setMobileTab} />}

        {/* Modals */}
        <MagicMirror
          isOpen={isMagicMirrorOpen}
          onClose={() => setIsMagicMirrorOpen(false)}
          settings={aiSettings}
          initialImage={magicMirrorImage}
          themeFont={themeFont}
        />

        <VeoScriptModal
          isOpen={isVeoScriptOpen}
          onClose={() => setIsVeoScriptOpen(false)}
          gameState={gameState}
          currentHistory={currentHistory}
          settings={aiSettings}
          themeFont={themeFont}
          onScriptGenerated={(script) => {
            setVeoScript(script, {
              reason: "gamePage.veoScript",
              persist: false,
            });
          }}
        />

        {isDestinyMapOpen && (
          <DestinyMap
            gameState={gameState}
            onNavigate={(nodeId) => {
              navigateToNode(nodeId);
              setMobileTab("story");
            }}
            onFork={handleFork}
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
            onClose={handleCloseStateEditor}
            gameState={gameState}
            vfsSession={vfsSession}
            editorSessionToken={stateEditorSessionToken}
            applyVfsMutation={engineActions.applyVfsMutation}
            onShowToast={(msg, type) => showToast(msg, type)}
          />
        )}

        {isGameStateViewerOpen && (
          <GameStateViewer
            isOpen={isGameStateViewerOpen}
            onClose={() => setIsGameStateViewerOpen(false)}
            gameState={gameState}
          />
        )}

        {isGalleryOpen && (
          <PhotoGalleryModal
            isOpen={isGalleryOpen}
            onClose={() => setIsGalleryOpen(false)}
            currentSaveId={currentSlotId || undefined}
            currentSaveTitle={gameState.outline?.title}
          />
        )}
      </Suspense>
      {/* Tutorial is now handled by TutorialContext and TutorialSpotlight in App.tsx */}
    </div>
  );
};
