import type {
  GameState,
  StorySummary,
  StorySegment,
  GameStateSnapshot,
  ForkTree,
} from "../types";
import type { AtmosphereObject } from "./constants/atmosphere";

export interface SnapshotMetadata {
  summaries: StorySummary[];
  lastSummarizedIndex: number;
  currentLocation: string;
  time: string;
  atmosphere: AtmosphereObject;
  veoScript?: string;
  uiState: GameState["uiState"];
  turnNumber?: number;
  forkId?: number;
  forkTree?: ForkTree;
}

// Default empty fork tree
const EMPTY_FORK_TREE: ForkTree = {
  nodes: {
    0: {
      id: 0,
      parentId: null,
      createdAt: 0,
      createdAtTurn: 0,
      sourceNodeId: "",
    },
  },
  nextForkId: 1,
};

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

    // World State
    time: metadata.time,
    timeline: gameState.timeline,
    causalChains: gameState.causalChains,

    // Summaries (Dual-layer)
    summaries: metadata.summaries,
    lastSummarizedIndex: metadata.lastSummarizedIndex,

    // UI & Meta
    uiState: metadata.uiState,
    atmosphere: metadata.atmosphere,
    veoScript: metadata.veoScript,

    turnNumber: metadata.turnNumber ?? gameState.turnNumber ?? 0,

    // Fork System
    forkId: metadata.forkId ?? gameState.forkId ?? 0,
    forkTree: metadata.forkTree || gameState.forkTree || EMPTY_FORK_TREE,
  };
}

/**
 * Restore game state from a snapshot
 * NOTE: When restoring, we DON'T restore forkId/forkTree - these are managed
 * by the fork logic in useGameEngine which will increment forkId when forking
 */
export function restoreStateFromSnapshot(
  currentState: GameState,
  snapshot: GameStateSnapshot,
): GameState {
  const atmosphere = snapshot.atmosphere || currentState.atmosphere;

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
    time: snapshot.time,
    timeline: snapshot.timeline,
    causalChains: snapshot.causalChains,
    summaries: snapshot.summaries,
    lastSummarizedIndex: snapshot.lastSummarizedIndex,
    uiState: snapshot.uiState,
    atmosphere,
    veoScript: snapshot.veoScript,
    turnNumber: snapshot.turnNumber,
    // Note: forkId and forkTree are NOT restored here - they're managed by fork logic
    // When navigating to a node (forking), the caller should increment forkId and update forkTree
  };
}

/**
 * Create a new fork from the current state
 * Returns the new forkId and updated forkTree
 */
export function createFork(
  currentForkId: number,
  currentForkTree: ForkTree,
  sourceNodeId: string,
  currentTurn: number,
): { newForkId: number; newForkTree: ForkTree } {
  const newForkId = currentForkTree.nextForkId;

  const newForkNode = {
    id: newForkId,
    parentId: currentForkId,
    createdAt: Date.now(),
    createdAtTurn: currentTurn,
    sourceNodeId,
  };

  return {
    newForkId,
    newForkTree: {
      nodes: {
        ...currentForkTree.nodes,
        [newForkId]: newForkNode,
      },
      nextForkId: newForkId + 1,
    },
  };
}

/**
 * Get all ancestor fork IDs for a given fork (including itself)
 * Used to filter RAG results to only include current fork and its ancestors
 */
export function getAncestorForkIds(
  forkId: number,
  forkTree: ForkTree,
): number[] {
  const ancestors: number[] = [forkId];
  let currentId: number | null = forkId;

  while (currentId !== null) {
    const node = forkTree.nodes[currentId];
    if (!node || node.parentId === null) break;
    ancestors.push(node.parentId);
    currentId = node.parentId;
  }

  return ancestors;
}
