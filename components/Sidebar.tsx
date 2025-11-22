import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { GameState, UIState, ListState } from "../types";
import { LanguageSelector } from "./LanguageSelector";
import { ENV_THEMES, THEMES } from "../utils/constants";
import { CharacterPanel } from "./sidebar/CharacterPanel";
import { QuestPanel } from "./sidebar/QuestPanel";
import { InventoryPanel } from "./sidebar/InventoryPanel";
import { RelationshipPanel } from "./sidebar/RelationshipPanel";
import { LocationPanel } from "./sidebar/LocationPanel";
import { KnowledgePanel } from "./sidebar/KnowledgePanel";
import { SystemFooter } from "./sidebar/SystemFooter";

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
  onUpdateUIState: (section: keyof UIState, newState: ListState) => void;
  onVeoScript: () => void;
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
}) => {
  const { t } = useTranslation();
  const currentStoryTheme = THEMES[gameState.theme] || THEMES.fantasy;
  const currentEnvThemeKey =
    gameState.envTheme || currentStoryTheme.defaultEnvTheme;
  const currentThemeConfig =
    ENV_THEMES[currentEnvThemeKey] || ENV_THEMES.fantasy;
  const { character } = gameState;
  const [showSystemFooter, setShowSystemFooter] = useState(true);

  const activeQuest = gameState.quests?.find((q) => q.status === "active");
  const itemContext = `Theme: ${gameState.theme}. Quest: ${activeQuest?.title || "None"}. Location: ${gameState.currentLocation}.`;

  return (
    <div className="flex flex-col h-full relative">
      <div className="p-6 border-b border-theme-border bg-theme-surface/50 flex justify-between items-start shrink-0">
        <h1
          className={`text-2xl text-theme-primary ${currentThemeConfig.fontClass} tracking-wider drop-shadow-sm`}
        >
          {t("titlePart1")}
          <span className="block text-sm text-theme-muted font-sans tracking-normal mt-1">
            {t("titlePart2")}
          </span>
        </h1>
        <div className="hidden md:block">
          <LanguageSelector
            disabled={isTranslating || gameState.isProcessing}
          />
        </div>
        <div className="md:hidden flex items-center gap-2">
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

      <div className="flex-1 overflow-y-auto p-6 pb-32 md:pb-6 space-y-8 scroll-smooth">
        {/* Time Display */}
        <div className="flex justify-center mb-4">
          <div className="bg-theme-surface-highlight/30 border border-theme-border px-4 py-1.5 rounded-full text-xs font-mono text-theme-text-secondary shadow-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-theme-primary animate-pulse"></span>
            {gameState.time || "unknown"}
          </div>
        </div>

        {character && (
          <CharacterPanel
            character={character}
            themeFont={currentThemeConfig.fontClass}
          />
        )}
        <LocationPanel
          currentLocation={gameState.currentLocation}
          knownLocations={gameState.knownLocations}
          locations={gameState.locations || []}
          themeFont={currentThemeConfig.fontClass}
          itemContext={itemContext}
          listState={gameState.uiState?.locations}
          onUpdateList={(newState) => onUpdateUIState("locations", newState)}
        />
        <QuestPanel
          quests={gameState.quests || []}
          themeFont={currentThemeConfig.fontClass}
        />
        <RelationshipPanel
          relationships={gameState.relationships || []}
          themeFont={currentThemeConfig.fontClass}
          listState={gameState.uiState?.relationships}
          onUpdateList={(newState) =>
            onUpdateUIState("relationships", newState)
          }
        />
        <InventoryPanel
          inventory={gameState.inventory || []}
          themeFont={currentThemeConfig.fontClass}
          itemContext={itemContext}
          listState={gameState.uiState?.inventory}
          onUpdateList={(newState) => onUpdateUIState("inventory", newState)}
        />
        <KnowledgePanel
          knowledge={gameState.knowledge || []}
          themeFont={currentThemeConfig.fontClass}
        />
      </div>

      {/* Status Bar */}
      <div className="bg-gray/5 text-[10px] text-theme-muted py-1 px-6 flex justify-between items-center border-t border-theme-border/50 font-mono">
        <span>Tokens: {gameState.totalTokens.toLocaleString()}</span>
        <div className="flex gap-4">
          <button
            onClick={() => setShowSystemFooter(!showSystemFooter)}
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
