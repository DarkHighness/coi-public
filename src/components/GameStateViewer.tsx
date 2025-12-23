/**
 * GameStateViewer - A user-friendly modal for viewing game state
 * Provides a readable, organized view of all game entities
 *
 * This is the main composition component that orchestrates the tab-based UI.
 * Individual tab content is rendered by components in ./gameViewer/
 */

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { GameState } from "../types";
import { useEmbeddingStatus } from "../hooks/useEmbeddingStatus";
import { getValidIcon } from "../utils/emojiValidator";

// Import tab components from the gameViewer module
import {
  ViewTab,
  TAB_CONFIGS,
  OverviewTab,
  WorldTab,
  CharacterTab,
  NPCsTab,
  QuestsTab,
  LoreTab,
  EmbeddingTab,
} from "./gameViewer";

interface GameStateViewerProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
}

export const GameStateViewerComponent: React.FC<GameStateViewerProps> = ({
  isOpen,
  onClose,
  gameState,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ViewTab>("overview");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["basics"]),
  );
  const embeddingProgress = useEmbeddingStatus();

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // Render active tab content using extracted components
  const renderTabContent = () => {
    const commonProps = {
      gameState,
      expandedSections,
      toggleSection,
      t,
    };

    switch (activeTab) {
      case "overview":
        return <OverviewTab {...commonProps} />;
      case "world":
        return <WorldTab {...commonProps} />;
      case "character":
        return <CharacterTab {...commonProps} />;
      case "relationships":
        return <NPCsTab {...commonProps} />;
      case "quests":
        return <QuestsTab {...commonProps} />;
      case "lore":
        return <LoreTab {...commonProps} />;
      case "embedding":
        return (
          <EmbeddingTab
            embeddingProgress={embeddingProgress}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
            t={t}
          />
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-theme-surface border border-theme-border rounded-none sm:rounded-xl shadow-2xl w-full max-w-5xl h-full sm:h-[90vh] flex flex-col overflow-hidden ring-1 ring-theme-border/50">
        {/* Header */}
        <div className="flex-none p-3 sm:p-5 border-b border-theme-border flex items-center justify-between bg-theme-surface-highlight/10">
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="text-2xl sm:text-3xl" aria-hidden="true">
              📖
            </span>
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-theme-primary uppercase tracking-widest">
                {t("gameViewer.title") || "Chronicle"}
              </h2>
              <p className="text-xs text-theme-muted uppercase tracking-wider font-bold">
                {t("gameViewer.subtitle") || "Your story at a glance"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-theme-muted hover:text-theme-primary hover:bg-theme-surface rounded-lg transition-colors"
          >
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex-none border-b border-theme-border bg-theme-bg/30 overflow-x-auto scrollbar-hide">
          <div className="flex px-2 min-w-full">
            {(Object.keys(TAB_CONFIGS) as ViewTab[]).map((tab) => {
              const config = TAB_CONFIGS[tab];
              const isActive = tab === activeTab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-none px-3 sm:px-6 py-3 sm:py-4 flex items-center gap-2 transition-all whitespace-nowrap border-b-2 ${
                    isActive
                      ? "border-theme-primary text-theme-primary bg-theme-primary/5"
                      : "border-transparent text-theme-muted hover:text-theme-text hover:bg-theme-surface/50"
                  }`}
                >
                  <span className="text-base sm:text-lg">
                    {getValidIcon(config.icon, "📖")}
                  </span>
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">
                    {t(config.labelKey) || tab}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-theme-bg/20">
          {renderTabContent()}
        </div>

        {/* Footer */}
        <div className="flex-none p-3 sm:p-4 border-t border-theme-border bg-theme-surface-highlight/10 flex items-center justify-between">
          <div className="text-xs text-theme-muted font-mono">
            {t("gameViewer.turnInfo", { turn: gameState.turnNumber }) ||
              `Turn ${gameState.turnNumber}`}
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 text-theme-muted hover:text-theme-text hover:bg-theme-surface rounded-lg transition-colors border border-transparent hover:border-theme-border uppercase text-xs font-bold tracking-wider"
          >
            {t("close") || "Close"}
          </button>
        </div>
      </div>
    </div>
  );
};

export const GameStateViewer = React.memo(GameStateViewerComponent);
