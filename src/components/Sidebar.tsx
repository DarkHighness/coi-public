import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { UIState, ListState, LanguageCode } from "../types";
import { LanguageSelector } from "./LanguageSelector";
import { CharacterPanel } from "./sidebar/CharacterPanel";
import { QuestPanel } from "./sidebar/QuestPanel";
import { InventoryPanel } from "./sidebar/InventoryPanel";
import { NPCPanel } from "./sidebar/NPCPanel";
import { LocationPanel } from "./sidebar/LocationPanel";
import { KnowledgePanel } from "./sidebar/KnowledgePanel";
import { SystemFooter } from "./sidebar/SystemFooter";
import { WorldInfoPanel } from "./sidebar/WorldInfoPanel";
import { TimelineEventsPanel } from "./sidebar/TimelineEventsPanel";
import { RAGPanel } from "./sidebar/RAGPanel";
import { useEmbeddingStatus } from "../hooks/useEmbeddingStatus";
import { useGameEngineContext } from "../contexts/GameEngineContext";

interface SidebarProps {
  // Callbacks only - state comes from context
  onCloseMobile: () => void;
  onMagicMirror: () => void;
  onNewGame: () => void;
  onSettings: () => void;
  onOpenSaves: () => void;
  onOpenMap: () => void;
  onOpenLogs: () => void;
  onOpenViewer?: () => void;
  onOpenGallery?: () => void;
  currentAmbience?: string;
  onUpdateUIState: <K extends keyof UIState>(
    section: K,
    newState: UIState[K],
  ) => void;
  onVeoScript: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onCloseMobile,
  onMagicMirror,
  onNewGame,
  onSettings,
  onOpenSaves,
  onOpenMap,
  onOpenLogs,
  onOpenViewer,
  onOpenGallery,
  currentAmbience,
  onUpdateUIState,
  onVeoScript,
}) => {
  const { t } = useTranslation();

  // Get state from context
  const { state, actions } = useGameEngineContext();
  const { gameState, isTranslating, currentThemeConfig } = state;
  const { setLanguage } = actions;

  const { character } = gameState;
  // Default to true if undefined
  const showSystemFooter = gameState.uiState?.showSystemFooter !== false;

  const activeQuest = gameState.quests?.find((q) => q.status === "active");
  const itemContext = `Theme: ${gameState.theme}. Quest: ${activeQuest?.title || "None"}. Location: ${gameState.currentLocation}.`;

  const embeddingProgress = useEmbeddingStatus();

  return (
    <div className="flex flex-col h-full relative">
      <div className="px-4 py-3 md:px-5 md:py-4 border-b border-theme-border/50 bg-theme-surface/5 flex items-center justify-center relative shrink-0 min-h-[76px]">
        <h1
          className={`text-xl md:text-2xl text-theme-primary ${currentThemeConfig.fontClass} tracking-wider text-center leading-none`}
        >
          {t("titleShort")}
          <div className="text-[11px] md:text-xs text-theme-muted/80 font-mono text-center mt-2 flex flex-col gap-0.5 max-w-[28ch] md:max-w-[36ch] mx-auto leading-snug">
            {/* Mobile View (Stacked) */}
            <div className="md:hidden flex flex-col gap-0.5">
              <div className="truncate">{gameState.outline?.title}</div>
            </div>

            {/* Desktop View (Single Line) */}
            <div className="hidden md:block">
              <div className="truncate">{gameState.outline?.title}</div>
            </div>
          </div>
          <div className="mt-3 h-px w-16 mx-auto bg-theme-border/35"></div>
        </h1>

        <div className="absolute right-4 top-3 hidden md:block">
          <LanguageSelector
            disabled={isTranslating || gameState.isProcessing}
            onChange={setLanguage}
          />
        </div>
        <div className="absolute right-3 top-3 md:hidden flex items-center gap-1">
          <button
            className="h-9 px-2.5 text-[10px] uppercase tracking-wider font-bold text-theme-primary hover:bg-theme-surface-highlight/15 transition-colors flex items-center gap-1"
            onClick={onNewGame}
            title={t("mainMenu")}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
            {t("mainMenu")}
          </button>
          <button
            className="h-9 w-9 grid place-items-center text-theme-muted hover:text-theme-primary hover:bg-theme-surface-highlight/15 transition-colors"
            onClick={onCloseMobile}
            title={t("close") || "Close"}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-32 md:pb-6 scroll-smooth custom-scrollbar">
        <div className="px-4 pt-4 divide-y divide-theme-border/30">
          {/* Time Display */}
          <div className="pb-3">
            <div className="border-l-2 border-theme-border/50 border-b border-theme-border/25 pb-2">
              <div className="py-2 pl-2 pr-1 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-theme-muted">
                    {t("gameViewer.time") || "Time"}
                  </div>
                  <div className="text-xs font-mono text-theme-text-secondary truncate flex items-center gap-1.5">
                    <svg
                      className="w-3.5 h-3.5 text-theme-primary shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="truncate">{gameState.time}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[10px] uppercase tracking-wider text-theme-muted">
                    {t("turn")}
                  </div>
                  <div className="text-xs font-mono text-theme-text">
                    {gameState.turnNumber ?? 0}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {character && (
            <section className="py-3">
              <CharacterPanel
                character={character}
                themeFont={currentThemeConfig.fontClass}
              />
            </section>
          )}

          <section className="py-3">
            <TimelineEventsPanel
              events={gameState.timeline}
              themeFont={currentThemeConfig.fontClass}
            />
          </section>

          <section className="py-3">
            <LocationPanel
              currentLocation={gameState.currentLocation}
              locations={gameState.locations || []}
              locationItemsByLocationId={gameState.locationItemsByLocationId}
              themeFont={currentThemeConfig.fontClass}
              itemContext={itemContext}
              listState={gameState.uiState?.locations}
              onUpdateList={(newState) => onUpdateUIState("locations", newState)}
            />
          </section>
          <section className="py-3">
            <QuestPanel
              quests={gameState.quests || []}
              themeFont={currentThemeConfig.fontClass}
              listState={gameState.uiState?.quests}
              onUpdateList={(newState) => onUpdateUIState("quests", newState)}
            />
          </section>
          <section className="py-3">
            <NPCPanel
              npcs={gameState.npcs || []}
              actors={gameState.actors || []}
              playerActorId={gameState.playerActorId}
              locations={gameState.locations || []}
              themeFont={currentThemeConfig.fontClass}
              listState={gameState.uiState?.npcs}
              onUpdateList={(newState) => onUpdateUIState("npcs", newState)}
              unlockMode={gameState.unlockMode}
            />
          </section>
          <section className="py-3">
            <InventoryPanel
              inventory={gameState.inventory || []}
              themeFont={currentThemeConfig.fontClass}
              itemContext={itemContext}
              listState={gameState.uiState?.inventory}
              onUpdateList={(newState) => onUpdateUIState("inventory", newState)}
            />
          </section>
          <section className="py-3">
            <KnowledgePanel
              knowledge={gameState.knowledge || []}
              themeFont={currentThemeConfig.fontClass}
              listState={gameState.uiState?.knowledge}
              onUpdateList={(newState) => onUpdateUIState("knowledge", newState)}
            />
          </section>

          <section className="py-3">
            <WorldInfoPanel
              history={gameState.outline?.worldSetting?.history}
              factions={gameState.factions}
              worldSetting={gameState.outline?.worldSetting}
              themeFont={currentThemeConfig.fontClass}
              outline={gameState.outline}
              unlockMode={gameState.unlockMode}
            />
          </section>

          <section className="py-3">
            <RAGPanel
              progress={embeddingProgress}
              themeFont={currentThemeConfig.fontClass}
            />
          </section>

        {/* Token Usage Panel - Mobile Only */}
          <section className="py-3 md:hidden">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-widest text-theme-muted">
                {t("sidebar.tokens")}
              </span>
              <span className="text-xs font-mono text-theme-text">
                {(gameState.tokenUsage?.totalTokens || 0).toLocaleString()}
                {gameState.tokenUsage && (
                  <span className="opacity-70 ml-1">
                    ({gameState.tokenUsage.promptTokens.toLocaleString()} +{" "}
                    {gameState.tokenUsage.completionTokens.toLocaleString()})
                  </span>
                )}
              </span>
            </div>
          </section>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-theme-surface/10 text-[10px] text-theme-muted py-2 px-3 flex justify-between items-center border-t border-theme-border/50 font-mono">
        <span>
          {t("sidebar.tokens")}{" "}
          {(gameState.tokenUsage?.totalTokens || 0).toLocaleString()}
          {gameState.tokenUsage && (
            <span className="hidden md:inline opacity-70 ml-1">
              ({gameState.tokenUsage.promptTokens.toLocaleString()} +{" "}
              {gameState.tokenUsage.completionTokens.toLocaleString()})
            </span>
          )}
        </span>
        <div className="flex items-center divide-x divide-theme-border/25">
          <button
            onClick={() =>
              onUpdateUIState("showSystemFooter", !showSystemFooter)
            }
            className="px-3 py-2 text-[10px] uppercase tracking-wider font-bold hover:text-theme-primary hover:bg-theme-surface-highlight/15 transition-colors"
          >
            {showSystemFooter ? t("hideSystem") : t("showSystem")}
          </button>
          <button
            onClick={onOpenLogs}
            className="px-3 py-2 text-[10px] uppercase tracking-wider font-bold hover:text-theme-primary hover:bg-theme-surface-highlight/15 transition-colors"
          >
            {t("viewLogs")}
          </button>
        </div>
      </div>

      <div className="shrink-0 px-6 pt-3 pb-3 border-t border-theme-border/50 bg-theme-surface/10 hidden md:block">
        <div className="border-t border-theme-border/25 divide-y divide-theme-border/20 mb-3">
          <button
            onClick={onOpenMap}
            data-tutorial-id="game-menu-button"
            className="w-full py-2.5 pl-2 pr-1 flex items-center justify-between gap-3 hover:bg-theme-surface-highlight/20 transition-colors text-theme-text"
            title={t("tree.viewMap")}
          >
            <span className="flex items-center gap-2 min-w-0">
              <svg
                className="w-4 h-4 text-theme-primary shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 7m0 13V7"
                ></path>
              </svg>
              <span className="text-sm truncate">{t("tree.viewMap")}</span>
            </span>
            <svg
              className="w-4 h-4 text-theme-muted shrink-0"
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
              className="w-full py-2.5 pl-2 pr-1 flex items-center justify-between gap-3 hover:bg-theme-surface-highlight/20 transition-colors text-theme-text"
              title={t("gameViewer.title") || "Game State"}
            >
              <span className="flex items-center gap-2 min-w-0">
                <svg
                  className="w-4 h-4 text-theme-primary shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  ></path>
                </svg>
                <span className="text-sm truncate">
                  {t("gameViewer.title") || "State"}
                </span>
              </span>
              <svg
                className="w-4 h-4 text-theme-muted shrink-0"
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
              className="w-full py-2.5 pl-2 pr-1 flex items-center justify-between gap-3 hover:bg-theme-surface-highlight/20 transition-colors text-theme-text"
              title={t("gallery.title")}
            >
              <span className="flex items-center gap-2 min-w-0">
                <svg
                  className="w-4 h-4 text-theme-primary shrink-0"
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
                <span className="text-sm truncate">{t("gallery.title")}</span>
              </span>
              <svg
                className="w-4 h-4 text-theme-muted shrink-0"
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

        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
            showSystemFooter
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <SystemFooter
              themeFont={currentThemeConfig.fontClass}
              onMagicMirror={onMagicMirror}
              onNewGame={onNewGame}
              onSave={onOpenSaves}
              onSettings={onSettings}
              onCloseMobile={onCloseMobile}
              currentAmbience={currentAmbience}
              onVeoScript={onVeoScript}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
