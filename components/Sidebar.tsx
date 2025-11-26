import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { GameState, UIState, ListState, LanguageCode } from "../types";
import { LanguageSelector } from "./LanguageSelector";
import { ENV_THEMES, THEMES } from "../utils/constants";
import { CharacterPanel } from "./sidebar/CharacterPanel";
import { QuestPanel } from "./sidebar/QuestPanel";
import { InventoryPanel } from "./sidebar/InventoryPanel";
import { RelationshipPanel } from "./sidebar/RelationshipPanel";
import { LocationPanel } from "./sidebar/LocationPanel";
import { KnowledgePanel } from "./sidebar/KnowledgePanel";
import { SystemFooter } from "./sidebar/SystemFooter";
import { WorldInfoPanel } from "./sidebar/WorldInfoPanel";
import { TimelineEventsPanel } from "./sidebar/TimelineEventsPanel";

interface SidebarProps {
  gameState: GameState;
  isTranslating: boolean;
  onCloseMobile: () => void;
  onMagicMirror: () => void;
  onNewGame: () => void;
  onSettings: () => void;
  onOpenSaves: () => void;
  onOpenMap: () => void;
  onOpenLogs: () => void;
  currentAmbience?: string;
  onUpdateUIState: <K extends keyof UIState>(
    section: K,
    newState: UIState[K],
  ) => void;
  onVeoScript: () => void;
  setLanguage?: (lang: LanguageCode) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  gameState,
  isTranslating,
  onCloseMobile,
  onMagicMirror,
  onNewGame,
  onSettings,
  onOpenSaves,
  onOpenMap,
  onOpenLogs,
  currentAmbience,
  onUpdateUIState,
  onVeoScript,
  setLanguage,
}) => {
  const { t } = useTranslation();
  const currentStoryTheme = THEMES[gameState.theme] || THEMES.fantasy;
  const currentEnvThemeKey = currentStoryTheme.envTheme;
  const currentThemeConfig =
    ENV_THEMES[currentEnvThemeKey] || ENV_THEMES.fantasy;
  const { character } = gameState;
  // Default to true if undefined
  const showSystemFooter = gameState.uiState?.showSystemFooter !== false;

  const activeQuest = gameState.quests?.find((q) => q.status === "active");
  const itemContext = `Theme: ${gameState.theme}. Quest: ${activeQuest?.title || "None"}. Location: ${gameState.currentLocation}.`;

  return (
    <div className="flex flex-col h-full relative">
      <div className="p-6 border-b border-theme-border bg-theme-surface/20 backdrop-blur-sm flex items-center justify-center relative shrink-0 min-h-[88px]">
        <h1
          className={`text-2xl text-theme-primary ${currentThemeConfig.fontClass} tracking-wider drop-shadow-sm text-center`}
        >
          {t("titlePart1")}
          <div className="text-[10px] text-theme-muted/50 font-mono text-center mt-2">
            {t("sidebar.tokens") || "Tokens:"}{" "}
            {gameState.totalTokens.toLocaleString()}
          </div>
        </h1>

        <div className="absolute right-6 top-6 hidden md:block">
          <LanguageSelector
            disabled={isTranslating || gameState.isProcessing}
            onChange={setLanguage}
          />
        </div>
        <div className="absolute right-6 top-6 md:hidden flex items-center gap-2">
          <button
            className="text-theme-primary text-xs uppercase font-bold border border-theme-primary px-2 py-1 rounded"
            onClick={onNewGame}
          >
            {t("mainMenu")}
          </button>
          <button className="text-theme-text" onClick={onCloseMobile}>
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

      <div className="flex-1 overflow-y-auto p-4 pb-32 md:pb-6 space-y-3 scroll-smooth">
        {/* Time Display */}
        <div className="flex justify-center mb-2">
          <div className="bg-theme-surface-highlight/30 border border-theme-border px-4 py-1.5 rounded-full text-xs font-mono text-theme-text-secondary shadow-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-theme-primary animate-pulse"></span>
            {gameState.time}
          </div>
        </div>

        {character && (
          <div className="bg-theme-surface/20 border border-theme-border/40 rounded-lg p-2 shadow-sm">
            <CharacterPanel
              character={character}
              themeFont={currentThemeConfig.fontClass}
            />
          </div>
        )}

        {/* Timeline Events Panel (New) */}
        <div className="bg-theme-surface/20 border border-theme-border/40 rounded-lg p-2 shadow-sm">
          <TimelineEventsPanel
            events={gameState.timeline}
            themeFont={currentThemeConfig.fontClass}
          />
        </div>

        <div className="bg-theme-surface/20 border border-theme-border/40 rounded-lg p-2 shadow-sm">
          <LocationPanel
            currentLocation={gameState.currentLocation}
            locations={gameState.locations || []}
            themeFont={currentThemeConfig.fontClass}
            itemContext={itemContext}
            listState={gameState.uiState?.locations}
            onUpdateList={(newState) => onUpdateUIState("locations", newState)}
          />
        </div>
        <div className="bg-theme-surface/20 border border-theme-border/40 rounded-lg p-2 shadow-sm">
          <QuestPanel
            quests={gameState.quests || []}
            themeFont={currentThemeConfig.fontClass}
          />
        </div>
        <div className="bg-theme-surface/20 border border-theme-border/40 rounded-lg p-2 shadow-sm">
          <RelationshipPanel
            relationships={gameState.relationships || []}
            locations={gameState.locations || []}
            themeFont={currentThemeConfig.fontClass}
            listState={gameState.uiState?.relationships}
            onUpdateList={(newState) =>
              onUpdateUIState("relationships", newState)
            }
          />
        </div>
        <div className="bg-theme-surface/20 border border-theme-border/40 rounded-lg p-2 shadow-sm">
          <InventoryPanel
            inventory={gameState.inventory || []}
            themeFont={currentThemeConfig.fontClass}
            itemContext={itemContext}
            listState={gameState.uiState?.inventory}
            onUpdateList={(newState) => onUpdateUIState("inventory", newState)}
          />
        </div>
        <div className="bg-theme-surface/20 border border-theme-border/40 rounded-lg p-2 shadow-sm">
          <KnowledgePanel
            knowledge={gameState.knowledge || []}
            themeFont={currentThemeConfig.fontClass}
          />
        </div>

        {/* World Info Panel (New) */}
        <div className="bg-theme-surface/20 border border-theme-border/40 rounded-lg p-2 shadow-sm">
          <WorldInfoPanel
            history={gameState.outline?.worldSetting?.history}
            factions={gameState.factions}
            worldSetting={gameState.outline?.worldSetting}
            themeFont={currentThemeConfig.fontClass}
            outline={gameState.outline}
            unlockMode={gameState.unlockMode}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-gray/5 text-[10px] text-theme-muted py-1 px-6 flex justify-between items-center border-t border-theme-border/50 font-mono">
        <span>Tokens: {gameState.totalTokens.toLocaleString()}</span>
        <div className="flex gap-4">
          <button
            onClick={() =>
              onUpdateUIState("showSystemFooter", !showSystemFooter)
            }
            className="hover:text-theme-primary underline"
          >
            {showSystemFooter ? t("hideSystem") : t("showSystem")}
          </button>
          <button
            onClick={onOpenLogs}
            className="hover:text-theme-primary underline"
          >
            {t("viewLogs")}
          </button>
        </div>
      </div>

      <div className="shrink-0 p-6 border-t border-theme-border bg-theme-surface/30 space-y-4 hidden md:block">
        <button
          onClick={onOpenMap}
          className="w-full py-2 text-sm bg-theme-surface-highlight/50 border border-theme-border hover:border-theme-primary text-theme-text rounded transition-colors flex items-center justify-center gap-2"
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
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 7m0 13V7"
            ></path>
          </svg>
          {t("tree.viewMap")}
        </button>

        {showSystemFooter && (
          <div>
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
        )}
      </div>
    </div>
  );
};
