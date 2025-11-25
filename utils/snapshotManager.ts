import type {
  GameState,
  StorySummary,
  StorySegment,
  GameStateSnapshot,
} from "../types";

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
  gameState: GameState,
  metadata: SnapshotMetadata,
): GameStateSnapshot {
  return {
    // Entity State (Dual-layer)
    inventory: gameState.inventory,
    relationships: gameState.relationships,
    quests: gameState.quests,
    character: gameState.character,
    knowledge: gameState.knowledge,
    locations: gameState.locations,
    currentLocation: gameState.currentLocation || metadata.currentLocation,
    factions: gameState.factions,

    // ID Counters (Critical for forks)
    nextIds: gameState.nextIds,

    // World State
    time: metadata.time,
    timeline: gameState.timeline,
    causalChains: gameState.causalChains,

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
