import React, { Suspense, useRef } from "react";
import { FeedLayout, UIState, StorySegment } from "../../types";
import { StoryFeed, StoryFeedRef } from "../StoryFeed";
import { ActionPanel } from "../ActionPanel";
import { Sidebar } from "../Sidebar";
import { StoryTimeline } from "../StoryTimeline";
import { useGameEngineContext } from "../../contexts/GameEngineContext";

interface DesktopGameLayoutProps {
  // Local UI state (managed by GamePage)
  feedLayout: FeedLayout;
  setFeedLayout: (layout: FeedLayout) => void;
  currentAmbience?: string;
  // Callbacks
  onAnimate: (url: string) => void;
  onRetry: () => void;
  onRebuildContext?: () => void;
  onFork: (nodeId: string) => void;
  onAction: (action: string) => Promise<void>;
  onNewGame: () => void;
  onMagicMirror: () => void;
  onSettings: () => void;
  onOpenSaves: () => void;
  onOpenMap: () => void;
  onOpenLogs: () => void;
  onTypingComplete?: () => void;
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
  onOpenRules?: () => void;
  onOpenGallery?: () => void;
  onForceUpdate?: (prompt: string) => void;
  onImageUpload?: (id: string, imageId: string) => void;
  onImageDelete?: (id: string) => void;
}

export const DesktopGameLayout: React.FC<DesktopGameLayoutProps> = ({
  feedLayout,
  setFeedLayout,
  currentAmbience,
  onAnimate,
  onRetry,
  onRebuildContext,
  onFork,
  onAction,
  onNewGame,
  onMagicMirror,
  onSettings,
  onOpenSaves,
  onOpenMap,
  onOpenLogs,
  onTypingComplete,
  onUpdateUIState,
  onToggleMute,
  onViewedSegmentChange,
  onAudioGenerated,
  onVeoScript,
  onShowToast,
  onOpenStateEditor,
  onOpenRAG,
  onOpenViewer,
  onOpenRules,
  onOpenGallery,
  onForceUpdate,
  onImageUpload,
  onImageDelete,
}) => {
  // Get state and actions from context
  const { state, actions } = useGameEngineContext();
  const { gameState, aiSettings } = state;
  const { generateImageForNode, triggerSave } = actions;

  // Ref for StoryFeed to enable navigation
  const storyFeedRef = useRef<StoryFeedRef>(null);

  const sidebarCollapsed = gameState.uiState.sidebarCollapsed ?? false;
  const timelineCollapsed = gameState.uiState.timelineCollapsed ?? false;

  const handleGenerateImage = (nodeId: string) => {
    generateImageForNode(nodeId, undefined, true);
  };

  // Handle navigation from timeline to story segment
  const handleNavigateToSegment = (segmentId: string) => {
    storyFeedRef.current?.scrollToSegment(segmentId);
  };

  const handleJumpToSegment = (input: string) => {
    // Determine if input is index or ID
    // If input is purely numeric, treat as 1-based index (minus 1)
    // Otherwise treat as ID
    let segmentId = input;

    if (input === "start") {
      if (state.currentHistory.length > 0) {
        segmentId = state.currentHistory[0].id;
      }
    } else if (input === "end") {
      if (state.currentHistory.length > 0) {
        segmentId = state.currentHistory[state.currentHistory.length - 1].id;
      }
    } else if (/^\d+$/.test(input)) {
      const index = parseInt(input);
      // Find segment by index (adjusting for 1-based user input)
      const targetIndex = index - 1;
      if (targetIndex >= 0 && targetIndex < state.currentHistory.length) {
        segmentId = state.currentHistory[targetIndex].id;
      }
    }

    storyFeedRef.current?.scrollToSegment(segmentId);
  };

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
            onCloseMobile={() => {}}
            onMagicMirror={onMagicMirror}
            onNewGame={onNewGame}
            onSettings={onSettings}
            onOpenSaves={onOpenSaves}
            onOpenMap={onOpenMap}
            onOpenLogs={onOpenLogs}
            onOpenViewer={onOpenViewer}
            onOpenGallery={onOpenGallery}
            currentAmbience={currentAmbience}
            onUpdateUIState={onUpdateUIState}
            onVeoScript={onVeoScript}
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
            ref={storyFeedRef}
            layout={feedLayout}
            setLayout={setFeedLayout}
            onAnimate={onAnimate}
            onGenerateImage={handleGenerateImage}
            onRetry={onRetry}
            disableImages={aiSettings.image.enabled === false}
            onFork={onFork}
            onTypingComplete={onTypingComplete}
            currentAmbience={currentAmbience}
            onToggleMute={onToggleMute}
            onViewedSegmentChange={onViewedSegmentChange}
            onAudioGenerated={onAudioGenerated}
            onImageUpload={onImageUpload}
            onImageDelete={onImageDelete}
            sidebarCollapsed={sidebarCollapsed}
            timelineCollapsed={timelineCollapsed}
          />

          {/* Action Panel */}
          <div className="flex-none z-30">
            <ActionPanel
              onAction={onAction}
              onShowToast={onShowToast}
              onOpenStateEditor={onOpenStateEditor}
              onOpenRAG={onOpenRAG}
              onOpenViewer={onOpenViewer}
              onOpenRules={onOpenRules}
              onTriggerSave={triggerSave}
              onRetry={onRetry}
              onRebuildContext={onRebuildContext}
              onForceUpdate={onForceUpdate}
              onJumpToSegment={handleJumpToSegment}
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
              title={gameState.outline?.title}
              subtitle={gameState.outline?.premise}
              onNavigateToSegment={handleNavigateToSegment}
              onFork={onFork}
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
