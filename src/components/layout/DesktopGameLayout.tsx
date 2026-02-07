import React, { Suspense, useRef } from "react";
import { FeedLayout, UIState, StorySegment } from "../../types";
import { StoryFeed, StoryFeedRef } from "../StoryFeed";
import { ActionPanel } from "../ActionPanel";
import { Sidebar } from "../Sidebar";
import { StoryTimeline } from "../StoryTimeline";
import { useRuntimeContext } from "../../runtime/context";

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
  onOpenGallery,
  onForceUpdate,
  onImageUpload,
  onImageDelete,
}) => {
  // Get state and actions from context
  const { state, actions } = useRuntimeContext();
  const { gameState, aiSettings } = state;
  const { generateImageForNode, triggerSave, cleanupEntities } = actions;

  // Ref for StoryFeed to enable navigation
  const storyFeedRef = useRef<StoryFeedRef>(null);

  const sidebarCollapsed = gameState.uiState.sidebarCollapsed ?? false;
  const timelineCollapsed = gameState.uiState.timelineCollapsed ?? false;

  // State for widths - initialize from persisted state or defaults
  const [sidebarWidth, setSidebarWidth] = React.useState(
    gameState.uiState.sidebarWidth || 320,
  );
  const [timelineWidth, setTimelineWidth] = React.useState(
    gameState.uiState.timelineWidth || 300,
  );

  // Track active resize operation
  const [isResizing, setIsResizing] = React.useState<
    "sidebar" | "timeline" | null
  >(null);

  // Refs for current values (to access in event listeners without checking stale state)
  const sidebarWidthRef = useRef(sidebarWidth);
  const timelineWidthRef = useRef(timelineWidth);

  // Sync refs with state
  React.useEffect(() => {
    sidebarWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  React.useEffect(() => {
    timelineWidthRef.current = timelineWidth;
  }, [timelineWidth]);

  // Global resize handlers
  React.useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();

      if (isResizing === "sidebar") {
        // Clamp width: Min 250px, Max 800px
        const newWidth = Math.max(250, Math.min(e.clientX, 800));
        setSidebarWidth(newWidth);
      } else {
        // Timeline resizes from right
        const newWidth = Math.max(
          250,
          Math.min(window.innerWidth - e.clientX, 800),
        );
        setTimelineWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      if (isResizing === "sidebar") {
        onUpdateUIState("sidebarWidth", sidebarWidthRef.current);
      } else {
        onUpdateUIState("timelineWidth", timelineWidthRef.current);
      }
      setIsResizing(null);
      document.body.style.cursor = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
    };
  }, [isResizing, onUpdateUIState]);

  const startResizing =
    (panel: "sidebar" | "timeline") => (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(panel);
    };

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
        data-tutorial-id="left-sidebar"
        className={`border-r border-theme-border bg-theme-surface/70 backdrop-blur-md shrink-0 relative z-20 transition-all duration-300 ease-in-out`}
        style={{
          width: sidebarCollapsed ? 0 : sidebarWidth,
        }}
      >
        {/* Sidebar Content - hidden when collapsed */}
        <div
          className={`h-full w-full ${sidebarCollapsed ? "hidden" : "block"}`}
        >
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

        {/* Resize Handle */}
        {!sidebarCollapsed && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-theme-primary/50 transition-colors z-30"
            onMouseDown={startResizing("sidebar")}
          />
        )}

        {/* Toggle Button */}
        <button
          onClick={() => onUpdateUIState("sidebarCollapsed", !sidebarCollapsed)}
          className="absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2 w-8 h-16 bg-theme-surface backdrop-blur border border-theme-border rounded-full flex items-center justify-center hover:bg-theme-surface-highlight/60 hover:border-theme-primary/30 transition-colors z-40 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-theme-bg"
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
      <div
        className={`flex-1 flex flex-col relative h-full min-w-0`}
        data-tutorial-id="story-feed-area"
      >
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
          <div className="flex-none z-30" data-tutorial-id="action-input-area">
            <ActionPanel
              onAction={onAction}
              onShowToast={onShowToast}
              onOpenStateEditor={onOpenStateEditor}
              onOpenRAG={onOpenRAG}
              onOpenViewer={onOpenViewer}
              onTriggerSave={triggerSave}
              onRetry={onRetry}
              onRebuildContext={onRebuildContext}
              onCleanupEntities={cleanupEntities}
              onForceUpdate={onForceUpdate}
              onJumpToSegment={handleJumpToSegment}
            />
          </div>
        </div>
      </div>

      {/* Desktop Timeline */}
      <div
        data-tutorial-id="right-timeline"
        className={`hidden xl:flex shrink-0 z-10 border-l border-theme-border bg-theme-surface/60 backdrop-blur-md relative transition-all duration-300 ease-in-out`}
        style={{
          width: timelineCollapsed ? 0 : timelineWidth,
        }}
      >
        {/* Resize Handle */}
        {!timelineCollapsed && (
          <div
            className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-theme-primary/50 transition-colors z-30"
            onMouseDown={startResizing("timeline")}
          />
        )}

        {/* Timeline Content - hidden when collapsed */}
        <div
          className={`w-full h-full ${timelineCollapsed ? "hidden" : "block"}`}
        >
          <Suspense
            fallback={
              <div className="w-full h-full bg-theme-surface/30 animate-pulse"></div>
            }
          >
            <StoryTimeline
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
          className="absolute top-1/2 -translate-y-1/2 left-0 -translate-x-1/2 w-8 h-16 bg-theme-surface backdrop-blur border border-theme-border rounded-full flex items-center justify-center hover:bg-theme-surface-highlight/60 hover:border-theme-primary/30 transition-colors z-40 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-theme-bg"
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
