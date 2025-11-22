import React from "react";
import {
  GameState,
  LanguageCode,
  FeedLayout,
  UIState,
  ListState,
} from "../../types";
import { StoryFeed } from "../StoryFeed";
import { ActionPanel } from "../ActionPanel";
import { Sidebar } from "../Sidebar";
import { MobileNav, MobileTab } from "../MobileNav";
import { THEMES, ENV_THEMES } from "../../utils/constants";
import { useTranslation } from "react-i18next";

interface MobileGameLayoutProps {
  gameState: GameState;
  currentHistory: any[];
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  isTranslating: boolean;
  mobileTab: MobileTab;
  setMobileTab: (tab: MobileTab) => void;
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
  onUpdateUIState: (section: keyof UIState, newState: ListState) => void;
  onToggleMute?: () => void;
  onViewedSegmentChange?: (segment: any) => void;
  onAudioGenerated?: (id: string, key: string) => void;
  onVeoScript: () => void;
}

export const MobileGameLayout: React.FC<MobileGameLayoutProps> = ({
  gameState,
  currentHistory,
  language,
  setLanguage,
  isTranslating,
  mobileTab,
  setMobileTab,
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
}) => {
  const { t } = useTranslation();
  const currentStoryTheme = THEMES[gameState.theme] || THEMES.fantasy;
  const currentEnvThemeKey =
    gameState.envTheme || currentStoryTheme.defaultEnvTheme;
  const currentThemeConfig =
    ENV_THEMES[currentEnvThemeKey] || ENV_THEMES.fantasy;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative md:hidden">
      {/* 1. Story Feed View */}
      <div
        className={`flex-1 flex flex-col h-full w-full absolute inset-0 transition-opacity duration-300 ${mobileTab === "story" ? "z-10 opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      >
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
        />

        {/* Action Panel fixed at bottom of feed */}
        <div className="flex-none z-30 pb-[calc(4rem+env(safe-area-inset-bottom))]">
          <ActionPanel
            gameState={gameState}
            currentHistory={currentHistory}
            isTranslating={isTranslating}
            onAction={onAction}
          />
        </div>
      </div>

      {/* 2. Status/Sidebar View */}
      <div
        className={`flex-1 flex flex-col h-full w-full absolute inset-0 bg-theme-bg z-20 transition-transform duration-300 ${mobileTab === "status" ? "translate-x-0" : "translate-x-full"}`}
      >
        <Sidebar
          gameState={gameState}
          isTranslating={isTranslating}
          onCloseMobile={() => setMobileTab("story")}
          onMagicMirror={onMagicMirror}
          onNewGame={onNewGame}
          onSettings={onSettings}
          onOpenSaves={onOpenSaves}
          onOpenMap={onOpenMap}
          onOpenLogs={onOpenLogs}
          currentAmbience={currentAmbience}
          onUpdateUIState={onUpdateUIState}
          onVeoScript={onVeoScript}
        />
        <div className="h-16 flex-none"></div> {/* Spacer for Mobile Nav */}
        <div className="h-[env(safe-area-inset-bottom)] flex-none"></div>
      </div>

      {/* 3. Menu Grid View */}
      <div
        className={`flex-1 flex flex-col h-full w-full absolute inset-0 bg-theme-bg z-20 transition-transform duration-300 overflow-y-auto ${mobileTab === "menu" ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="p-6 pb-24">
          <h2
            className={`text-2xl text-theme-primary ${currentThemeConfig.fontClass} mb-8`}
          >
            {t("menu")}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={onOpenMap}
              className="p-4 bg-theme-surface border border-theme-border rounded flex flex-col items-center gap-2 aspect-square justify-center hover:border-theme-primary transition-colors"
            >
              <svg
                className="w-8 h-8 text-theme-primary"
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
              <span className="text-sm font-bold uppercase">
                {t("tree.map")}
              </span>
            </button>
            <button
              onClick={onOpenSaves}
              className="p-4 bg-theme-surface border border-theme-border rounded flex flex-col items-center gap-2 aspect-square justify-center hover:border-theme-primary transition-colors"
            >
              <svg
                className="w-8 h-8 text-theme-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                ></path>
              </svg>
              <span className="text-sm font-bold uppercase">
                {t("saves.title")}
              </span>
            </button>
            <button
              onClick={onSettings}
              className="p-4 bg-theme-surface border border-theme-border rounded flex flex-col items-center gap-2 aspect-square justify-center hover:border-theme-primary transition-colors"
            >
              <svg
                className="w-8 h-8 text-theme-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                ></path>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                ></path>
              </svg>
              <span className="text-sm font-bold uppercase">
                {t("settings")}
              </span>
            </button>
            <button
              onClick={onOpenLogs}
              className="p-4 bg-theme-surface border border-theme-border rounded flex flex-col items-center gap-2 aspect-square justify-center hover:border-theme-primary transition-colors"
            >
              <svg
                className="w-8 h-8 text-theme-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                ></path>
              </svg>
              <span className="text-sm font-bold uppercase">{t("logs")}</span>
            </button>
            <button
              onClick={onMagicMirror}
              className="p-4 bg-theme-surface border border-theme-border rounded flex flex-col items-center gap-2 aspect-square justify-center hover:border-theme-primary transition-colors"
            >
              <svg
                className="w-8 h-8 text-theme-primary"
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
              <span className="text-sm font-bold uppercase">
                {t("magicMirror")}
              </span>
            </button>
            <button
              onClick={onVeoScript}
              className="p-4 bg-theme-surface border border-theme-border rounded flex flex-col items-center gap-2 aspect-square justify-center hover:border-theme-primary transition-colors"
            >
              <svg
                className="w-8 h-8 text-theme-primary"
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
              <span className="text-sm font-bold uppercase">
                {t("veoScript.title")}
              </span>
            </button>
            <button
              onClick={() => {
                if (window.confirm(t("confirmNewGame"))) onNewGame();
              }}
              className="col-span-2 p-4 bg-red-900 border border-red-700 rounded flex flex-row items-center gap-2 justify-center hover:bg-red-800 transition-colors mt-4"
            >
              <svg
                className="w-5 h-5 text-red-100"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                ></path>
              </svg>
              <span className="text-sm font-bold uppercase text-red-100">
                {t("newGame")}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav currentTab={mobileTab} setTab={setMobileTab} />
    </div>
  );
};
