/**
 * Shared types for GameStateViewer components
 */

import { GameState } from "../../types";

// Tabs for different views
export type ViewTab =
  | "overview"
  | "world"
  | "character"
  | "relationships"
  | "quests"
  | "lore"
  | "embedding";

export interface TabConfig {
  icon: string;
  labelKey: string;
}

export const TAB_CONFIGS: Record<ViewTab, TabConfig> = {
  overview: { icon: "📖", labelKey: "gameViewer.overview" },
  world: { icon: "🌍", labelKey: "gameViewer.world" },
  character: { icon: "👤", labelKey: "gameViewer.character" },
  relationships: { icon: "👥", labelKey: "gameViewer.relationships" },
  quests: { icon: "📜", labelKey: "gameViewer.quests" },
  lore: { icon: "📚", labelKey: "gameViewer.lore" },
  embedding: { icon: "🧠", labelKey: "gameViewer.embedding" },
};

// Common props for tab components
export interface TabProps {
  gameState: GameState;
  expandedSections: Set<string>;
  toggleSection: (section: string) => void;
  t: (key: string) => string;
}
