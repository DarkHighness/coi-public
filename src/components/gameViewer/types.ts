/**
 * Shared types for GameStateViewer components
 */

import { GameState } from "../../types";

// Tabs for different views
export type ViewTab =
  | "story"
  | "atmosphere"
  | "worldInfo"
  | "locations"
  | "factions"
  | "character"
  | "npcs"
  | "quests"
  | "knowledge"
  | "timeline"
  | "inventory"
  | "memory"
  | "embedding";

export interface TabConfig {
  icon: string;
  labelKey: string;
}

export const TAB_CONFIGS: Record<ViewTab, TabConfig> = {
  story: { icon: "📖", labelKey: "gameViewer.storyBasics" },
  atmosphere: { icon: "🌤️", labelKey: "gameViewer.atmosphere" },
  worldInfo: { icon: "🌍", labelKey: "gameViewer.worldSetting" },
  locations: { icon: "📍", labelKey: "gameViewer.locations" },
  factions: { icon: "⚔️", labelKey: "gameViewer.factions" },
  character: { icon: "👤", labelKey: "gameViewer.character" },
  npcs: { icon: "👥", labelKey: "gameViewer.npcs" },
  quests: { icon: "📜", labelKey: "gameViewer.quests" },
  knowledge: { icon: "📚", labelKey: "gameViewer.knowledge" },
  timeline: { icon: "⏳", labelKey: "gameViewer.timeline" },
  inventory: { icon: "🎒", labelKey: "gameViewer.inventory" },
  memory: { icon: "🧾", labelKey: "gameViewer.memory" },
  embedding: { icon: "🧠", labelKey: "gameViewer.embedding" },
};

// Common props for tab components
export interface TabProps {
  gameState: GameState;
  expandedSections: Set<string>;
  toggleSection: (section: string) => void;
  t: (key: string) => string;
}
