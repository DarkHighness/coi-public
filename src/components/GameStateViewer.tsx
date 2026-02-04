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
      case "npcs":
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
    <div className="fixed inset-0 z-[80] ui-overlay backdrop-blur-sm flex items-stretch sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="vn-scroll-surface vn-scroll-edge border border-theme-divider/60 rounded-none sm:rounded-lg shadow-none w-full max-w-5xl h-full sm:h-[90vh] flex flex-col overflow-hidden bg-theme-bg">
        {/* Header */}
        <div className="flex-none px-4 py-3 sm:p-5 border-b border-theme-divider/60 flex items-center justify-between bg-transparent">
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="text-2xl sm:text-3xl" aria-hidden="true">
              📖
            </span>
            <div>
              <h2 className="text-base sm:text-2xl font-[var(--font-fantasy)] text-theme-primary uppercase tracking-[0.22em]">
                {t("gameViewer.title") || "Chronicle"}
              </h2>
              <p className="text-[11px] sm:text-xs text-theme-text-secondary uppercase tracking-[0.18em] font-bold">
                {t("gameViewer.subtitle") || "Your story at a glance"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 -m-1 text-theme-text-secondary hover:text-theme-primary hover:bg-theme-bg/15 rounded-md transition-colors"
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
        <div className="flex-none border-b border-theme-divider/60 bg-transparent overflow-x-auto scrollbar-hide">
          <div className="flex px-2 min-w-full">
            {(Object.keys(TAB_CONFIGS) as ViewTab[]).map((tab) => {
              const config = TAB_CONFIGS[tab];
              const isActive = tab === activeTab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-none px-3 sm:px-6 py-3 sm:py-4 flex items-center gap-2 transition-colors whitespace-nowrap border-b-2 ${
                    isActive
                      ? "border-theme-primary text-theme-primary"
                      : "border-transparent text-theme-text-secondary hover:text-theme-text hover:bg-theme-bg/10"
                  }`}
                >
                  <span className="text-base sm:text-lg">
                    {getValidIcon(config.icon, "📖")}
                  </span>
                  <span className="text-[11px] sm:text-sm font-bold uppercase tracking-[0.18em]">
                    {t(config.labelKey) || tab}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-transparent">
          {renderTabContent()}
        </div>

        {/* Footer */}
        <div className="flex-none px-4 py-3 sm:p-4 border-t border-theme-divider/60 bg-transparent flex items-center justify-between pb-[calc(12px+env(safe-area-inset-bottom))]">
          <div className="text-xs text-theme-text-secondary font-mono">
            {t("gameViewer.turnInfo", { turn: gameState.turnNumber }) ||
              `Turn ${gameState.turnNumber}`}
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-theme-text-secondary hover:text-theme-text hover:bg-theme-bg/15 rounded-md transition-colors border border-theme-divider/60 hover:border-theme-muted uppercase text-xs font-bold tracking-[0.18em]"
          >
            {t("close") || "Close"}
          </button>
        </div>
      </div>
    </div>
  );
};

export const GameStateViewer = React.memo(GameStateViewerComponent);
