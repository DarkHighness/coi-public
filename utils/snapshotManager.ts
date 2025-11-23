import { GameStateSnapshot, GameState, StorySummary } from "../types";
import type { ProcessedState } from "../hooks/stateProcessors/processAllActions";

export interface SnapshotMetadata {
  summaries: StorySummary[];
  lastSummarizedIndex: number;
  currentLocation: string;
  time: string;
  envTheme: string;
  veoScript?: string;
  uiState: GameState['uiState'];
}

/**
 * Create a comprehensive state snapshot for fork-safe persistence
 */
export function createStateSnapshot(
  processedState: ProcessedState,
  metadata: SnapshotMetadata,
  gameState: GameState
): GameStateSnapshot {
  return {
    // Entity State (Dual-layer)
    inventory: processedState.inventory,
    relationships: processedState.relationships,
    quests: processedState.quests,
    character: processedState.character,
    knowledge: processedState.knowledge,
    locations: processedState.locations,
    currentLocation: processedState.currentLocation || metadata.currentLocation,

    // ID Counters (Critical for forks)
    nextIds: processedState.nextIds,

    // World State
    worldTime: gameState.worldTime,
    timeline: processedState.timeline,
    causalChains: gameState.causalChains,

    // Summaries (Dual-layer)
    summaries: metadata.summaries,
    lastSummarizedIndex: metadata.lastSummarizedIndex,

    // UI & Meta
    uiState: metadata.uiState,
    envTheme: metadata.envTheme,
    veoScript: metadata.veoScript,
    time: metadata.time,
  };
}
