import React, { useRef } from "react";
import { FeedLayout, UIState, StorySegment } from "../../types";
import { StoryFeed, StoryFeedRef } from "../StoryFeed";
import { StoryTimeline } from "../StoryTimeline";
import { ActionPanel } from "../ActionPanel";
import { Sidebar } from "../Sidebar";
import { MobileNav, MobileTab } from "../MobileNav";
import { THEMES, ENV_THEMES, BUILD_INFO } from "../../utils/constants";
import { getThemeKeyForAtmosphere } from "../../utils/constants/atmosphere";
import { useTranslation } from "react-i18next";
import { useRuntimeContext } from "../../runtime/context";

interface MobileGameLayoutProps {
  // Local UI state (managed by GamePage)
  mobileTab: MobileTab;
  setMobileTab: (tab: MobileTab) => void;
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
}

export const MobileGameLayout: React.FC<MobileGameLayoutProps> = ({
  mobileTab,
  setMobileTab,
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
}) => {
  const { t } = useTranslation();

  // Get state and actions from context
  const { state, actions } = useRuntimeContext();
  const { gameState, aiSettings } = state;
  const { generateImageForNode, triggerSave, cleanupEntities } = actions;

  // Ref for StoryFeed to enable navigation
  const storyFeedRef = useRef<StoryFeedRef>(null);

  // Compute current theme configuration
  // - If lockEnvTheme is enabled:
  //   - If fixedEnvTheme is set, use that specific theme
  //   - Otherwise, use the story's default envTheme
  // - Otherwise, derive from atmosphere dynamically
  const currentStoryTheme = THEMES[gameState.theme] || THEMES.fantasy;
  let currentEnvThemeKey: string;
  if (aiSettings.lockEnvTheme) {
    // Locked: use fixedEnvTheme if set, otherwise story's default envTheme
    currentEnvThemeKey = aiSettings.fixedEnvTheme || currentStoryTheme.envTheme;
  } else {
    const currentAtmosphere =
      gameState.atmosphere || currentStoryTheme.defaultAtmosphere;
    currentEnvThemeKey = getThemeKeyForAtmosphere(currentAtmosphere);
  }
  const currentThemeConfig =
    ENV_THEMES[currentEnvThemeKey] || ENV_THEMES.fantasy;

  const handleGenerateImage = (nodeId: string) => {
    generateImageForNode(nodeId, undefined, true);
  };

  // Handle navigation from timeline to story segment
  const handleNavigateToSegment = (segmentId: string) => {
    storyFeedRef.current?.scrollToSegment(segmentId);
    // Switch to story tab on mobile after navigation
    setMobileTab("story");
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

    if (storyFeedRef.current) {
      storyFeedRef.current.scrollToSegment(segmentId);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative md:hidden">
      {/* 1. Story Feed View */}
      <div
        className={`flex flex-col w-full absolute inset-0 overflow-hidden transition-opacity duration-300 ${mobileTab === "story" ? "z-10 opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      >
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
        />

        {/* Action Panel fixed at bottom of feed */}
        <div className="flex-none z-30 pb-[calc(4rem+env(safe-area-inset-bottom))]">
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

      {/* 2. Timeline View */}
      <div
        className={`flex-1 flex flex-col h-full w-full absolute inset-0 bg-theme-bg/90 backdrop-blur-md z-20 transition-transform duration-300 ${mobileTab === "timeline" ? "translate-x-0" : "translate-x-full"}`}
      >
        <StoryTimeline
          onNavigateToSegment={handleNavigateToSegment}
          onFork={onFork}
        />
        <div className="h-16 flex-none"></div> {/* Spacer for Mobile Nav */}
        <div className="h-[env(safe-area-inset-bottom)] flex-none"></div>
      </div>

      {/* 3. Status/Sidebar View */}
      <div
        className={`flex-1 flex flex-col h-full w-full absolute inset-0 bg-theme-bg/90 backdrop-blur-md z-20 transition-transform duration-300 ${mobileTab === "status" ? "translate-x-0" : "translate-x-full"}`}
      >
        <Sidebar
          onCloseMobile={() => setMobileTab("story")}
          onMagicMirror={onMagicMirror}
          onNewGame={onNewGame}
          onSettings={onSettings}
          onOpenSaves={onOpenSaves}
          onOpenMap={onOpenMap}
          onOpenLogs={onOpenLogs}
          onOpenViewer={onOpenViewer}
          onUpdateUIState={onUpdateUIState}
          onVeoScript={onVeoScript}
        />
        <div className="h-16 flex-none"></div> {/* Spacer for Mobile Nav */}
        <div className="flex-none"></div>
      </div>

      {/* 4. Menu Grid View */}
      <div
        className={`flex-1 flex flex-col h-full w-full absolute inset-0 bg-theme-bg/90 backdrop-blur-md z-20 transition-transform duration-300 overflow-y-auto ${mobileTab === "menu" ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="p-6 pb-24">
          <div className="flex items-center justify-between gap-3 mb-6">
            <h2
              className={`text-2xl text-theme-primary ${currentThemeConfig.fontClass}`}
            >
              {t("menu")}
            </h2>
            <button
              onClick={onOpenLogs}
              className="h-10 px-3 border border-theme-divider/60 rounded-md text-xs font-bold uppercase tracking-wide text-theme-text-secondary hover:text-theme-primary hover:border-theme-primary/40 transition-colors"
            >
              {t("viewLogs")}
            </button>
          </div>

          <div className="space-y-5">
            <section>
              <h3 className="text-[11px] uppercase tracking-[0.16em] text-theme-text-secondary mb-2">
                {t("menu")}
              </h3>
              <div className="border-y border-theme-divider/60 divide-y divide-theme-divider/60">
                <button
                  onClick={onNewGame}
                  className="w-full py-3 px-2 flex items-center justify-between gap-3 hover:bg-theme-surface-highlight/15 transition-colors"
                >
                  <span className="flex items-center gap-2.5 text-theme-text">
                    <svg
                      className="w-5 h-5 text-theme-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                      />
                    </svg>
                    <span className="text-base">{t("mainMenu")}</span>
                  </span>
                  <svg
                    className="w-4 h-4 text-theme-text-secondary"
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

                <button
                  onClick={onOpenSaves}
                  className="w-full py-3 px-2 flex items-center justify-between gap-3 hover:bg-theme-surface-highlight/15 transition-colors"
                >
                  <span className="flex items-center gap-2.5 text-theme-text">
                    <svg
                      className="w-5 h-5 text-theme-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                      />
                    </svg>
                    <span className="text-base">{t("saveGame")}</span>
                  </span>
                  <svg
                    className="w-4 h-4 text-theme-text-secondary"
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

                <button
                  onClick={onSettings}
                  className="w-full py-3 px-2 flex items-center justify-between gap-3 hover:bg-theme-surface-highlight/15 transition-colors"
                >
                  <span className="flex items-center gap-2.5 text-theme-text">
                    <svg
                      className="w-5 h-5 text-theme-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span className="text-base">{t("settings.title")}</span>
                  </span>
                  <svg
                    className="w-4 h-4 text-theme-text-secondary"
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
            </section>

            <section>
              <h3 className="text-[11px] uppercase tracking-[0.16em] text-theme-text-secondary mb-2">
                {t("status")}
              </h3>
              <div className="border-y border-theme-divider/60 divide-y divide-theme-divider/60">
                <button
                  onClick={onOpenMap}
                  className="w-full py-3 px-2 flex items-center justify-between gap-3 hover:bg-theme-surface-highlight/15 transition-colors"
                >
                  <span className="flex items-center gap-2.5 text-theme-text">
                    <svg
                      className="w-5 h-5 text-theme-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 7m0 13V7"
                      ></path>
                    </svg>
                    <span className="text-base">{t("tree.viewMap")}</span>
                  </span>
                  <svg
                    className="w-4 h-4 text-theme-text-secondary"
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

                {onOpenViewer && (
                  <button
                    onClick={onOpenViewer}
                    className="w-full py-3 px-2 flex items-center justify-between gap-3 hover:bg-theme-surface-highlight/15 transition-colors"
                  >
                    <span className="flex items-center gap-2.5 text-theme-text">
                      <svg
                        className="w-5 h-5 text-theme-primary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        ></path>
                      </svg>
                      <span className="text-base">{t("gameViewer.title") || "State"}</span>
                    </span>
                    <svg
                      className="w-4 h-4 text-theme-text-secondary"
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
                )}

                {onOpenGallery && (
                  <button
                    onClick={onOpenGallery}
                    className="w-full py-3 px-2 flex items-center justify-between gap-3 hover:bg-theme-surface-highlight/15 transition-colors"
                  >
                    <span className="flex items-center gap-2.5 text-theme-text">
                      <svg
                        className="w-5 h-5 text-theme-primary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="text-base">{t("gallery.title")}</span>
                    </span>
                    <svg
                      className="w-4 h-4 text-theme-text-secondary"
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
                )}
              </div>
            </section>

            <section>
              <h3 className="text-[11px] uppercase tracking-[0.16em] text-theme-text-secondary mb-2">
                {t("system")}
              </h3>
              <div className="border-y border-theme-divider/60 divide-y divide-theme-divider/60">
                <button
                  onClick={onMagicMirror}
                  className="w-full py-3 px-2 flex items-center justify-between gap-3 hover:bg-theme-surface-highlight/15 transition-colors"
                >
                  <span className="flex items-center gap-2.5 text-theme-text">
                    <svg
                      className="w-5 h-5 text-theme-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      ></path>
                    </svg>
                    <span className="text-base">{t("magicMirror.title")}</span>
                  </span>
                  <svg
                    className="w-4 h-4 text-theme-text-secondary"
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

                <button
                  onClick={onVeoScript}
                  className="w-full py-3 px-2 flex items-center justify-between gap-3 hover:bg-theme-surface-highlight/15 transition-colors"
                >
                  <span className="flex items-center gap-2.5 text-theme-text">
                    <svg
                      className="w-5 h-5 text-theme-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                      ></path>
                    </svg>
                    <span className="text-base">{t("veoScript.title")}</span>
                  </span>
                  <svg
                    className="w-4 h-4 text-theme-text-secondary"
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
            </section>
          </div>

          <div className="mt-8 text-center border-t border-theme-divider/60 pt-4">
            <div className="text-xs text-theme-muted">{t("builtWith")}</div>
            <div className="text-[10px] text-theme-muted/50 mt-1">
              {BUILD_INFO.gitHash} ({BUILD_INFO.buildTime})
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav currentTab={mobileTab} setTab={setMobileTab} />
    </div>
  );
};
