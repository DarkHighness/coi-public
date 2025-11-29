import React, { Suspense } from "react";
import {
  GameState,
  LanguageCode,
  FeedLayout,
  UIState,
  ListState,
  StorySegment,
} from "../../types";
import { StoryFeed } from "../StoryFeed";
import { ActionPanel } from "../ActionPanel";
import { Sidebar } from "../Sidebar";
import { StoryTimeline } from "../StoryTimeline";

interface DesktopGameLayoutProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  currentHistory: StorySegment[];
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  isTranslating: boolean;
  feedLayout: FeedLayout;
  setFeedLayout: (layout: FeedLayout) => void;
  onAnimate: (url: string) => void;
  onGenerateImage: (nodeId: string) => void;
  onRetry: () => void;
  onFork: (nodeId: string) => void;
  onAction: (action: string) => Promise<void>;
  onNewGame: () => void;
  onMagicMirror: () => void;
  onSettings: () => void;
  onOpenSaves: () => void;
  onOpenMap: () => void;
  onOpenLogs: () => void;
  aiSettings: any;
  onTypingComplete?: () => void;
  currentAmbience?: string;
  onUpdateUIState: <K extends keyof UIState>(
    section: K,
    newState: UIState[K],
  ) => void;
  onToggleMute?: () => void;
  onViewedSegmentChange?: (segment: StorySegment) => void;
  onAudioGenerated?: (id: string, key: string) => void;
  onVeoScript: () => void;
  onShowToast?: (message: string, type: "success" | "error" | "info") => void;
  onOpenStateEditor?: () => void;
  onOpenRAG?: () => void;
  onOpenViewer?: () => void;
  onTriggerSave?: () => void;
  onForceUpdate?: (prompt: string) => void;
}

export const DesktopGameLayout: React.FC<DesktopGameLayoutProps> = ({
  gameState,
  setGameState,
  currentHistory,
  language,
  setLanguage,
  isTranslating,
  feedLayout,
  setFeedLayout,
  onAnimate,
  onGenerateImage,
  onRetry,
  onFork,
  onAction,
  onNewGame,
  onMagicMirror,
  onSettings,
  onOpenSaves,
  onOpenMap,
  onOpenLogs,
  aiSettings,
  onTypingComplete,
  currentAmbience,
  onUpdateUIState,
  onToggleMute,
  onViewedSegmentChange,
  onAudioGenerated,
  onVeoScript,
  onShowToast,
  onOpenStateEditor,
  onOpenRAG,
  onOpenViewer,
  onTriggerSave,
  onForceUpdate,
}) => {
  const sidebarCollapsed = gameState.uiState.sidebarCollapsed ?? false;
  const timelineCollapsed = gameState.uiState.timelineCollapsed ?? false;

  return (
    <div className="hidden md:flex flex-1 h-full overflow-hidden relative z-10">
      {/* Desktop Sidebar */}
      <div
        className={`border-r border-theme-border bg-theme-surface/70 backdrop-blur-md shrink-0 relative z-20 transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? "w-0" : "w-80"
        }`}
      >
        {/* Sidebar Content - hidden when collapsed */}
        <div className={`h-full ${sidebarCollapsed ? "hidden" : "block"}`}>
          <Sidebar
            gameState={gameState}
            isTranslating={isTranslating}
            onCloseMobile={() => {}}
            onMagicMirror={onMagicMirror}
            onNewGame={onNewGame}
            onSettings={onSettings}
            onOpenSaves={onOpenSaves}
            onOpenMap={onOpenMap}
            onOpenLogs={onOpenLogs}
            onOpenViewer={onOpenViewer}
            currentAmbience={currentAmbience}
            onUpdateUIState={onUpdateUIState}
            onVeoScript={onVeoScript}
            setLanguage={setLanguage}
          />
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => onUpdateUIState("sidebarCollapsed", !sidebarCollapsed)}
          className="absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2 w-8 h-16 bg-theme-surface border border-theme-border rounded-full flex items-center justify-center hover:bg-theme-surface hover:text-theme-muted hover:border-theme-surface transition-colors z-30 shadow-lg opacity-0 hover:opacity-100 cursor-pointer"
          title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <svg
            className={`w-4 h-4 text-theme-text transition-transform ${
              sidebarCollapsed ? "rotate-0" : "rotate-180"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative h-full min-w-0">
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          <StoryFeed
            gameState={gameState}
            currentHistory={currentHistory}
            layout={feedLayout}
            setLayout={setFeedLayout}
            onAnimate={onAnimate}
            onGenerateImage={onGenerateImage}
            onRetry={onRetry}
            disableImages={aiSettings.image.enabled === false}
            onFork={onFork}
            aiSettings={aiSettings}
            onTypingComplete={onTypingComplete}
            currentAmbience={currentAmbience}
            onToggleMute={onToggleMute}
            onViewedSegmentChange={onViewedSegmentChange}
            onAudioGenerated={onAudioGenerated}
            sidebarCollapsed={sidebarCollapsed}
            timelineCollapsed={timelineCollapsed}
          />

          {/* Action Panel */}
          <div className="flex-none z-30">
            <ActionPanel
              gameState={gameState}
              currentHistory={currentHistory}
              isTranslating={isTranslating}
              onAction={onAction}
              setGameState={setGameState}
              onShowToast={onShowToast}
              onOpenStateEditor={onOpenStateEditor}
              onOpenRAG={onOpenRAG}
              onOpenViewer={onOpenViewer}
              onTriggerSave={onTriggerSave}
              onRetry={onRetry}
              onForceUpdate={onForceUpdate}
            />
          </div>
        </div>
      </div>

      {/* Desktop Timeline */}
      <div
        className={`hidden xl:flex shrink-0 z-10 border-l border-theme-border bg-theme-surface/60 backdrop-blur-md relative transition-all duration-300 ease-in-out ${
          timelineCollapsed ? "w-0" : "w-72"
        }`}
      >
        {/* Timeline Content - hidden when collapsed */}
        <div
          className={`w-full h-full ${timelineCollapsed ? "hidden" : "block"}`}
        >
          <Suspense
            fallback={
              <div className="w-72 bg-theme-surface/30 animate-pulse"></div>
            }
          >
            <StoryTimeline
              segments={currentHistory}
              theme={gameState.theme}
              title={gameState.outline?.title}
              subtitle={gameState.outline?.premise}
            />
          </Suspense>
        </div>

        {/* Toggle Button */}
        <button
          onClick={() =>
            onUpdateUIState("timelineCollapsed", !timelineCollapsed)
          }
          className="absolute top-1/2 -translate-y-1/2 left-0 -translate-x-1/2 w-8 h-16 bg-theme-surface border border-theme-border rounded-full flex items-center justify-center hover:bg-theme-surface hover:text-theme-text hover:border-theme-surface transition-all z-30 shadow-lg opacity-0 hover:opacity-100 cursor-pointer"
          title={timelineCollapsed ? "Expand Timeline" : "Collapse Timeline"}
        >
          <svg
            className={`w-4 h-4 text-theme-text transition-transform ${
              timelineCollapsed ? "rotate-180" : "rotate-0"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};
