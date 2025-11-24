import { GameStateSnapshot, GameState, StorySummary } from "../types";
import type { ProcessedState } from "../hooks/stateProcessors/processAllActions";

export interface SnapshotMetadata {
  summaries: StorySummary[];
  lastSummarizedIndex: number;
  currentLocation: string;
  time: string;
  envTheme: string;
  veoScript?: string;
  uiState: GameState["uiState"];
}

/**
 * Create a comprehensive state snapshot for fork-safe persistence
 */
export function createStateSnapshot(
  processedState: ProcessedState,
  metadata: SnapshotMetadata,
  gameState: GameState,
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
    factions: processedState.factions,

    // ID Counters (Critical for forks)
    nextIds: processedState.nextIds,

    // World State
    time: metadata.time,
    timeline: processedState.timeline,
    causalChains: processedState.causalChains,

    // Summaries (Dual-layer)
    summaries: metadata.summaries,
    lastSummarizedIndex: metadata.lastSummarizedIndex,

    // UI & Meta
    uiState: metadata.uiState,
    envTheme: metadata.envTheme,
    veoScript: metadata.veoScript,
  };
}

/**
 * Restore game state from a snapshot
 */
export function restoreStateFromSnapshot(
  currentState: GameState,
  snapshot: GameStateSnapshot,
): GameState {
  return {
    ...currentState,
    inventory: snapshot.inventory,
    relationships: snapshot.relationships,
    quests: snapshot.quests,
    character: snapshot.character,
    knowledge: snapshot.knowledge,
    locations: snapshot.locations,
    currentLocation: snapshot.currentLocation,
    factions: snapshot.factions,
    nextIds: snapshot.nextIds,
    time: snapshot.time,
    timeline: snapshot.timeline,
    causalChains: snapshot.causalChains,
    summaries: snapshot.summaries,
    lastSummarizedIndex: snapshot.lastSummarizedIndex,
    uiState: snapshot.uiState,
    envTheme: snapshot.envTheme,
    veoScript: snapshot.veoScript,
  };
}
