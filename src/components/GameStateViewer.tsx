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
import { SIDEBAR_PANEL_TITLE_CLASS } from "./sidebar/sidebarTokens";

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
  MemoryTab,
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
  const [activeTab, setActiveTab] = useState<ViewTab>("story");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["basics"]),
  );
  const embeddingProgress = useEmbeddingStatus();
  const tabGroupStarts = new Set<ViewTab>([
    "worldInfo",
    "character",
    "quests",
    "knowledge",
    "memory",
  ]);
  const defaultSectionByTab: Partial<Record<ViewTab, string>> = {
    story: "basics",
    atmosphere: "atmosphere",
    worldInfo: "worldSetting",
    locations: "locations",
    factions: "factions",
    character: "charBasic",
    npcs: "npcs",
    quests: "activeQuests2",
    knowledge: "knowledge",
    timeline: "timeline",
    inventory: "inventory",
    embedding: "embeddingStats",
  };

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
  const handleTabSelect = (tab: ViewTab) => {
    setActiveTab(tab);
    const defaultSection = defaultSectionByTab[tab];
    if (!defaultSection) return;
    setExpandedSections((prev) => {
      if (prev.has(defaultSection)) return prev;
      const next = new Set(prev);
      next.add(defaultSection);
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
      case "story":
        return <OverviewTab {...commonProps} mode="story" />;
      case "atmosphere":
        return <OverviewTab {...commonProps} mode="atmosphere" />;
      case "worldInfo":
        return <WorldTab {...commonProps} mode="world" />;
      case "locations":
        return <WorldTab {...commonProps} mode="locations" />;
      case "factions":
        return <WorldTab {...commonProps} mode="factions" />;
      case "character":
        return <CharacterTab {...commonProps} />;
      case "npcs":
        return <NPCsTab {...commonProps} />;
      case "quests":
        return <QuestsTab {...commonProps} />;
      case "knowledge":
        return <LoreTab {...commonProps} mode="knowledge" />;
      case "timeline":
        return <LoreTab {...commonProps} mode="timeline" />;
      case "inventory":
        return <LoreTab {...commonProps} mode="inventory" />;
      case "memory":
        return <MemoryTab />;
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
      <div className="vn-scroll-edge border border-theme-divider/70 rounded-none w-full max-w-6xl h-full sm:h-[90vh] flex flex-col sm:flex-row overflow-hidden bg-theme-surface">
        <aside className="sm:w-64 shrink-0 border-b sm:border-b-0 sm:border-r border-theme-divider/60 bg-theme-bg/45">
          <div className="px-3 py-3 border-b border-theme-divider/60 flex items-center justify-between">
            <div className="min-w-0">
              <div
                className={`${SIDEBAR_PANEL_TITLE_CLASS} flex items-center gap-2`}
              >
                <span className="ui-emoji-slot">📖</span>
                <span className="truncate">
                  {t("gameViewer.title") || "Chronicle"}
                </span>
              </div>
              <div className="text-[10px] text-theme-text-secondary uppercase tracking-[0.12em] mt-1">
                {t("gameViewer.subtitle") || "State Viewer"}
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 grid place-items-center text-theme-text-secondary hover:text-theme-primary hover:bg-theme-surface-highlight/20 transition-colors"
              aria-label={t("close") || "Close"}
            >
              <svg
                className="w-5 h-5"
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

          <div className="overflow-x-auto sm:overflow-y-auto scrollbar-hide">
            <div className="sm:block flex sm:py-2 py-1 min-w-full divide-x sm:divide-x-0 divide-theme-divider/45">
              {(Object.keys(TAB_CONFIGS) as ViewTab[]).map((tab) => {
                const config = TAB_CONFIGS[tab];
                const isActive = tab === activeTab;
                const hasGroupSeparator = tabGroupStarts.has(tab);
                return (
                  <button
                    key={tab}
                    onClick={() => handleTabSelect(tab)}
                    className={`group shrink-0 sm:w-full sm:shrink sm:block px-3 py-2 text-left transition-colors border-b sm:border-b ${
                      hasGroupSeparator
                        ? "sm:border-t sm:border-theme-divider/70 sm:mt-2 sm:pt-3"
                        : ""
                    } ${
                      isActive
                        ? "bg-theme-surface-highlight/25 text-theme-primary border-theme-primary/45"
                        : "text-theme-text-secondary hover:bg-theme-surface-highlight/12 hover:text-theme-text border-theme-divider/20"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="ui-emoji-slot">
                        {getValidIcon(config.icon, "📖")}
                      </span>
                      <span className="text-[11px] uppercase tracking-[0.14em] font-semibold whitespace-nowrap">
                        {t(config.labelKey) || tab}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <section className="flex-1 min-w-0 flex flex-col bg-theme-bg/70">
          <div className="flex-1 overflow-y-auto p-3 sm:p-4">
            {renderTabContent()}
          </div>

          <div className="px-4 py-3 border-t border-theme-divider/60 pb-[calc(12px+env(safe-area-inset-bottom))]">
            <button
              onClick={onClose}
              className="h-8 px-3 text-[11px] uppercase tracking-[0.14em] text-theme-text-secondary hover:text-theme-primary border border-theme-divider/60 hover:border-theme-primary/60 transition-colors"
            >
              {t("close") || "Close"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export const GameStateViewer = React.memo(GameStateViewerComponent);
