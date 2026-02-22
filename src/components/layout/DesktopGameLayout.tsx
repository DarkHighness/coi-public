import React, { Suspense, useRef, useCallback } from "react";
import {
  FeedLayout,
  UIState,
  StorySegment,
  PlayerRateInput,
} from "../../types";
import { StoryFeed, StoryFeedRef } from "../StoryFeed";
import { ActionPanel } from "../ActionPanel";
import { Sidebar } from "../Sidebar";
import { StoryTimeline } from "../StoryTimeline";
import { useRuntimeContext } from "../../runtime/context";

const PANEL_CONTENT_MOUNT_DELAY_MS = 140;
const EDGE_TOGGLE_HOTZONE_WIDTH_PX = 18;

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
  onOpenViewer?: () => void;
  onOpenGallery?: () => void;
  onForceUpdate?: (prompt: string) => void;
  onImageUpload?: (id: string, imageId: string) => void;
  onImageDelete?: (id: string) => void;
  onRate?: (id: string, rate: PlayerRateInput) => void;
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
  onOpenViewer,
  onOpenGallery,
  onForceUpdate,
  onImageUpload,
  onImageDelete,
  onRate,
}) => {
  // Get state and actions from context
  const { state, actions } = useRuntimeContext();
  const { gameState, aiSettings } = state;
  const { generateImageForNode, triggerSave, cleanupEntities } = actions;

  // Ref for StoryFeed to enable navigation
  const storyFeedRef = useRef<StoryFeedRef>(null);

  const sidebarCollapsed = gameState.uiState.sidebarCollapsed ?? false;
  const timelineCollapsed = gameState.uiState.timelineCollapsed ?? false;

  // Mount heavy panel content after expand animation starts to keep transition smooth.
  const [sidebarContentMounted, setSidebarContentMounted] =
    React.useState(!sidebarCollapsed);
  const [timelineContentMounted, setTimelineContentMounted] =
    React.useState(!timelineCollapsed);

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

  React.useEffect(() => {
    if (sidebarCollapsed) {
      setSidebarContentMounted(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      setSidebarContentMounted(true);
    }, PANEL_CONTENT_MOUNT_DELAY_MS);

    return () => clearTimeout(timeoutId);
  }, [sidebarCollapsed]);

  React.useEffect(() => {
    if (timelineCollapsed) {
      setTimelineContentMounted(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      setTimelineContentMounted(true);
    }, PANEL_CONTENT_MOUNT_DELAY_MS);

    return () => clearTimeout(timeoutId);
  }, [timelineCollapsed]);

  // Global resize handlers
  React.useEffect(() => {
    if (!isResizing) return;
    let rafId: number | null = null;
    let pendingClientX: number | null = null;

    const applyResize = (clientX: number) => {
      if (isResizing === "sidebar") {
        // Clamp width: Min 250px, Max 800px
        const newWidth = Math.max(250, Math.min(clientX, 800));
        sidebarWidthRef.current = newWidth;
        setSidebarWidth((prev) => (prev === newWidth ? prev : newWidth));
      } else {
        // Timeline resizes from right
        const newWidth = Math.max(
          250,
          Math.min(window.innerWidth - clientX, 800),
        );
        timelineWidthRef.current = newWidth;
        setTimelineWidth((prev) => (prev === newWidth ? prev : newWidth));
      }
    };

    const flushPendingResize = () => {
      if (pendingClientX === null) return;
      applyResize(pendingClientX);
      pendingClientX = null;
    };

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      pendingClientX = e.clientX;
      if (rafId === null) {
        rafId = window.requestAnimationFrame(() => {
          rafId = null;
          flushPendingResize();
        });
      }
    };

    const handleMouseUp = () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      flushPendingResize();

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
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
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

  const handleGenerateImage = useCallback(
    (nodeId: string, nodeOverride?: StorySegment) => {
      generateImageForNode(nodeId, nodeOverride, true);
    },
    [generateImageForNode],
  );

  // Handle navigation from timeline to story segment
  const handleNavigateToSegment = useCallback((segmentId: string) => {
    storyFeedRef.current?.scrollToSegment(segmentId);
  }, []);

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
        className={`border-r border-theme-border bg-theme-surface/70 backdrop-blur-md shrink-0 relative z-20 ${
          isResizing === "sidebar"
            ? ""
            : "transition-[width] duration-300 ease-out motion-reduce:transition-none"
        }`}
        style={{
          width: sidebarCollapsed ? 0 : sidebarWidth,
          willChange: "width",
        }}
      >
        <div className="h-full w-full overflow-hidden">
          {/* Sidebar Content - delay mount on expand to reduce animation stutter */}
          {sidebarContentMounted && (
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
              onUpdateUIState={onUpdateUIState}
              onVeoScript={onVeoScript}
            />
          )}
        </div>

        {/* Resize Handle */}
        {!sidebarCollapsed && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-theme-primary/50 transition-colors z-30"
            onMouseDown={startResizing("sidebar")}
          />
        )}
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
            onRate={onRate}
            sidebarCollapsed={sidebarCollapsed}
            timelineCollapsed={timelineCollapsed}
          />

          {/* Action Panel */}
          <div className="flex-none z-30" data-tutorial-id="action-input-area">
            <ActionPanel
              onAction={onAction}
              onShowToast={onShowToast}
              onOpenStateEditor={onOpenStateEditor}
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
        className={`hidden xl:flex shrink-0 z-10 border-l border-theme-border bg-theme-surface/60 backdrop-blur-md relative ${
          isResizing === "timeline"
            ? ""
            : "transition-[width] duration-300 ease-out motion-reduce:transition-none"
        }`}
        style={{
          width: timelineCollapsed ? 0 : timelineWidth,
          willChange: "width",
        }}
      >
        {/* Resize Handle */}
        {!timelineCollapsed && (
          <div
            className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-theme-primary/50 transition-colors z-30"
            onMouseDown={startResizing("timeline")}
          />
        )}

        <div className="w-full h-full overflow-hidden">
          {/* Timeline Content - delay mount on expand to reduce animation stutter */}
          {timelineContentMounted && (
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
          )}
        </div>
      </div>

      {/* Global Sidebar Toggle - rendered outside panel to avoid clipping/overlap */}
      <div
        className="group/left-toggle absolute top-1/2 -translate-y-1/2 z-[70] h-20"
        style={{
          left: `${sidebarCollapsed ? 0 : Math.max(0, sidebarWidth - EDGE_TOGGLE_HOTZONE_WIDTH_PX / 2)}px`,
          width: `${EDGE_TOGGLE_HOTZONE_WIDTH_PX}px`,
        }}
      >
        <button
          onClick={() => onUpdateUIState("sidebarCollapsed", !sidebarCollapsed)}
          className="absolute left-1/2 top-1/2 h-16 w-5 -translate-y-1/2 -translate-x-full pointer-events-none opacity-0 bg-theme-surface backdrop-blur border border-theme-border rounded-none flex items-center justify-center hover:bg-theme-surface-highlight/60 hover:border-theme-primary/30 transition-all duration-200 shadow-lg group-hover/left-toggle:pointer-events-auto group-hover/left-toggle:opacity-100 group-hover/left-toggle:-translate-x-1/2 group-focus-within/left-toggle:pointer-events-auto group-focus-within/left-toggle:opacity-100 group-focus-within/left-toggle:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-theme-bg"
          title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          aria-label={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
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

      {/* Global Timeline Toggle - rendered outside panel to avoid clipping/overlap */}
      <div
        className="group/right-toggle hidden xl:block absolute top-1/2 -translate-y-1/2 z-[70] h-20"
        style={{
          right: `${timelineCollapsed ? 0 : Math.max(0, timelineWidth - EDGE_TOGGLE_HOTZONE_WIDTH_PX / 2)}px`,
          width: `${EDGE_TOGGLE_HOTZONE_WIDTH_PX}px`,
        }}
      >
        <button
          onClick={() =>
            onUpdateUIState("timelineCollapsed", !timelineCollapsed)
          }
          className="absolute left-1/2 top-1/2 h-16 w-5 -translate-y-1/2 translate-x-0 pointer-events-none opacity-0 bg-theme-surface backdrop-blur border border-theme-border rounded-none flex items-center justify-center hover:bg-theme-surface-highlight/60 hover:border-theme-primary/30 transition-all duration-200 shadow-lg group-hover/right-toggle:pointer-events-auto group-hover/right-toggle:opacity-100 group-hover/right-toggle:-translate-x-1/2 group-focus-within/right-toggle:pointer-events-auto group-focus-within/right-toggle:opacity-100 group-focus-within/right-toggle:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-theme-bg"
          title={timelineCollapsed ? "Expand Timeline" : "Collapse Timeline"}
          aria-label={
            timelineCollapsed ? "Expand Timeline" : "Collapse Timeline"
          }
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
