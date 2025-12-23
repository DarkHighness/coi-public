/**
 * Save Version Migration System
 * Handles migration of save data between versions
 */

import type {
  GameState,
  SaveVersionInfo,
  VersionedGameState,
  StorySegment,
} from "../types";
import { CURRENT_SAVE_VERSION } from "../types";
import { saveImage } from "../utils/imageStorage";
import { createThemeConfig } from "./ai/utils";

// ============================================================================
// Migration Types
// ============================================================================

export interface MigrationContext {
  fromVersion: number;
  toVersion: number;
  logs: string[];
  saveId?: string;
}

export type MigrationFunction = (
  state: any,
  context: MigrationContext,
) => Promise<any>;

export interface Migration {
  version: number;
  description: string;
  migrate: MigrationFunction;
}

// ============================================================================
// Migration Registry
// ============================================================================

/**
 * Registry of all migrations
 * Migrations are applied in order from lowest to highest version
 */
const migrations: Migration[] = [
  // Version 1: Initial versioned format
  // No migration needed - this is the baseline
  {
    version: 1,
    description: "Initial save version with version tracking",
    migrate: async (state: any, context: MigrationContext) => {
      context.logs.push("Applied v1 migration: Added version tracking");
      return state;
    },
  },

  // Version 2: Relationship -> NPC terminology rename + Consolidate ad-hoc migrations
  {
    version: 2,
    description:
      "Renamed relationships to npcs and consolidated legacy migrations",
    migrate: async (state: any, context: MigrationContext) => {
      context.logs.push(
        "Applied v2 migration: Terminology rename and state cleanup",
      );

      // 1. Terminology Rename: relationship -> npc
      if (state.relationships && !state.npcs) {
        state.npcs = state.relationships;
        delete state.relationships;
        context.logs.push("Migrated 'relationships' to 'npcs'");
      }
      if (state.uiState?.relationships && !state.uiState.npcs) {
        state.uiState.npcs = state.uiState.relationships;
        delete state.uiState.relationships;
        context.logs.push("Migrated 'uiState.relationships' to 'uiState.npcs'");
      }
      if (state.aliveEntities?.relationships && !state.aliveEntities.npcs) {
        state.aliveEntities.npcs = state.aliveEntities.relationships;
        delete state.aliveEntities.relationships;
        context.logs.push(
          "Migrated 'aliveEntities.relationships' to 'aliveEntities.npcs'",
        );
      }

      // (a) Base64 images to IndexedDB
      const nodes = state.nodes || {};
      const saveId = state._saveId || context.saveId; // We might need the saveId
      if (saveId) {
        let migrationCount = 0;
        const migrationPromises = Object.values(nodes).map(
          async (node: any) => {
            if (
              node.imageUrl &&
              node.imageUrl.startsWith("data:image") &&
              !node.imageId
            ) {
              try {
                const response = await fetch(node.imageUrl);
                const blob = await response.blob();
                const imageId = await saveImage(blob, {
                  saveId,
                  forkId: state.forkId || 0,
                  turnIdx: node.segmentIdx || 0,
                  imagePrompt: node.imagePrompt || "",
                });
                node.imageId = imageId;
                delete node.imageUrl;
                migrationCount++;
              } catch (err) {
                context.logs.push(
                  `Failed to migrate image for node ${node.id}: ${err}`,
                );
              }
            }
          },
        );
        await Promise.all(migrationPromises);
        if (migrationCount > 0) {
          context.logs.push(
            `Migrated ${migrationCount} legacy images to IndexedDB`,
          );
        }
      }

      // (b) themeConfig initialization - handled in repairState if missing
      if (!state.themeConfig && state.theme) {
        // We'll leave the actual themeConfig creation to the repairState or a utility
        // because we don't have 't' (translation) here easily.
        // Actually, we can just ensure it exists in repairState.
      }

      // (c) tokenUsage normalization
      if (state.tokenUsage && typeof state.tokenUsage === "object") {
        if (state.tokenUsage.cacheRead === undefined)
          state.tokenUsage.cacheRead = 0;
        if (state.tokenUsage.cacheWrite === undefined)
          state.tokenUsage.cacheWrite = 0;
      }

      // (d) atmosphere and time defaults
      if (!state.atmosphere) {
        state.atmosphere = { envTheme: "fantasy", ambience: "quiet" };
      }
      if (!state.time) {
        state.time = "Day 1";
      }

      return state;
    },
  },
];

// ============================================================================
// Migration Manager
// ============================================================================

export class MigrationManager {
  private migrations: Map<number, Migration> = new Map();

  constructor() {
    // Register all migrations
    for (const migration of migrations) {
      this.migrations.set(migration.version, migration);
    }
  }

  /**
   * Get the current save version
   */
  getCurrentVersion(): number {
    return CURRENT_SAVE_VERSION;
  }

  /**
   * Check if a save needs migration
   */
  needsMigration(state: any): boolean {
    const version = this.getSaveVersion(state);
    return version < CURRENT_SAVE_VERSION;
  }

  /**
   * Get the version of a save state
   */
  getSaveVersion(state: any): number {
    // Check for new versioned format
    if (state._saveVersion?.version !== undefined) {
      return state._saveVersion.version;
    }

    // Check for legacy format indicators
    // Version 0: Pre-versioning saves
    return 0;
  }

  /**
   * Migrate a save state to the current version
   */
  async migrate(state: any, saveId?: string): Promise<VersionedGameState> {
    const fromVersion = this.getSaveVersion(state);
    const toVersion = CURRENT_SAVE_VERSION;

    if (fromVersion >= toVersion) {
      // No migration needed, just ensure version info exists
      return this.ensureVersionInfo(state, fromVersion);
    }

    console.log(
      `[Migration] Migrating save from v${fromVersion} to v${toVersion}`,
    );

    const context: MigrationContext = {
      fromVersion,
      toVersion,
      logs: [],
      saveId,
    };

    let migratedState = { ...state };

    // Apply migrations in order
    for (let version = fromVersion + 1; version <= toVersion; version++) {
      const migration = this.migrations.get(version);
      if (migration) {
        console.log(
          `[Migration] Applying v${version}: ${migration.description}`,
        );
        migratedState = await migration.migrate(migratedState, context);
      }
    }

    // Add version info
    const versionInfo: SaveVersionInfo = {
      version: toVersion,
      createdAt: migratedState._saveVersion?.createdAt || Date.now(),
      migratedFrom: fromVersion > 0 ? fromVersion : undefined,
      migrationLog: context.logs.length > 0 ? context.logs : undefined,
    };

    migratedState._saveVersion = versionInfo;

    console.log(`[Migration] Migration complete. Logs:`, context.logs);

    return migratedState as VersionedGameState;
  }

  /**
   * Ensure version info exists on a save state
   */
  private ensureVersionInfo(state: any, version: number): VersionedGameState {
    if (!state._saveVersion) {
      state._saveVersion = {
        version,
        createdAt: Date.now(),
      };
    }
    return state as VersionedGameState;
  }

  /**
   * Register a custom migration (for extensibility)
   */
  registerMigration(migration: Migration): void {
    if (this.migrations.has(migration.version)) {
      console.warn(
        `[Migration] Overwriting existing migration for v${migration.version}`,
      );
    }
    this.migrations.set(migration.version, migration);
  }

  /**
   * Get all registered migrations
   */
  getMigrations(): Migration[] {
    return Array.from(this.migrations.values()).sort(
      (a, b) => a.version - b.version,
    );
  }

  /**
   * Validate a save state structure
   * Returns errors for critical issues and suggestions for repairable issues
   */
  validateState(state: any): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Critical required fields
    if (!state.nodes || typeof state.nodes !== "object") {
      errors.push("Missing or invalid 'nodes' field");
    }
    if (!Array.isArray(state.inventory)) {
      warnings.push("Missing 'inventory' array - will be initialized as empty");
    }
    if (!Array.isArray(state.npcs) && !Array.isArray(state.relationships)) {
      warnings.push("Missing 'npcs' array - will be initialized as empty");
    }
    if (!Array.isArray(state.quests)) {
      warnings.push("Missing 'quests' array - will be initialized as empty");
    }
    if (!Array.isArray(state.locations)) {
      warnings.push("Missing 'locations' array - will be initialized as empty");
    }
    if (!state.character || typeof state.character !== "object") {
      warnings.push(
        "Missing 'character' object - will be initialized with defaults",
      );
    }

    // Optional but expected fields
    if (!state.theme || typeof state.theme !== "string") {
      warnings.push("Missing 'theme' field");
    }
    if (!Array.isArray(state.knowledge)) {
      warnings.push("Missing 'knowledge' array - will be initialized as empty");
    }
    if (!Array.isArray(state.factions)) {
      warnings.push("Missing 'factions' array - will be initialized as empty");
    }
    if (!state.forkTree || typeof state.forkTree !== "object") {
      warnings.push("Missing 'forkTree' - will be initialized with defaults");
    }
    if (typeof state.forkId !== "number") {
      warnings.push("Missing 'forkId' - will be initialized to 0");
    }
    if (typeof state.turnNumber !== "number") {
      warnings.push("Missing 'turnNumber' - will be computed from nodes");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Repair a save state by filling in missing required fields
   * This is called during import to ensure the save is usable
   */
  repairState(state: any): any {
    const repairedState = { ...state };

    // Initialize missing arrays
    if (!Array.isArray(repairedState.inventory)) {
      repairedState.inventory = [];
    }
    // Handle both legacy and new field name
    if (!Array.isArray(repairedState.npcs)) {
      repairedState.npcs = repairedState.relationships || [];
    }
    delete repairedState.relationships;

    if (!Array.isArray(repairedState.quests)) {
      repairedState.quests = [];
    }
    if (!Array.isArray(repairedState.locations)) {
      repairedState.locations = [];
    }
    if (!Array.isArray(repairedState.knowledge)) {
      repairedState.knowledge = [];
    }
    if (!Array.isArray(repairedState.factions)) {
      repairedState.factions = [];
    }
    if (!Array.isArray(repairedState.timeline)) {
      repairedState.timeline = [];
    }
    if (!Array.isArray(repairedState.causalChains)) {
      repairedState.causalChains = [];
    }
    if (!Array.isArray(repairedState.summaries)) {
      repairedState.summaries = [];
    }
    if (!Array.isArray(repairedState.logs)) {
      repairedState.logs = [];
    }
    if (!Array.isArray(repairedState.currentFork)) {
      repairedState.currentFork = [];
    }

    // Initialize missing objects
    if (
      !repairedState.character ||
      typeof repairedState.character !== "object"
    ) {
      repairedState.character = {
        name: "Unknown",
        health: 100,
        maxHealth: 100,
        skills: [],
        conditions: [],
        hiddenTraits: [],
      };
    }

    if (!repairedState.nodes || typeof repairedState.nodes !== "object") {
      repairedState.nodes = {};
    }

    if (!repairedState.forkTree || typeof repairedState.forkTree !== "object") {
      repairedState.forkTree = {
        nodes: {
          0: {
            id: 0,
            parentId: null,
            createdAt: Date.now(),
            createdAtTurn: 0,
            sourceNodeId: "",
          },
        },
        nextForkId: 1,
      };
    }

    if (!repairedState.uiState || typeof repairedState.uiState !== "object") {
      repairedState.uiState = {
        inventory: { pinnedIds: [], customOrder: [] },
        locations: { pinnedIds: [], customOrder: [] },
        npcs: { pinnedIds: [], customOrder: [] },
        knowledge: { pinnedIds: [], customOrder: [] },
      };
    } else {
      // Repair sub-fields of uiState
      if (!repairedState.uiState.npcs) {
        repairedState.uiState.npcs = repairedState.uiState.relationships || {
          pinnedIds: [],
          customOrder: [],
        };
      }
      delete repairedState.uiState.relationships;
    }

    if (
      !repairedState.tokenUsage ||
      typeof repairedState.tokenUsage !== "object"
    ) {
      repairedState.tokenUsage = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        cacheRead: 0,
        cacheWrite: 0,
      };
    }

    if (
      !repairedState.aliveEntities ||
      typeof repairedState.aliveEntities !== "object"
    ) {
      repairedState.aliveEntities = {
        inventory: [],
        npcs: [],
        locations: [],
        quests: [],
        knowledge: [],
        timeline: [],
        skills: [],
        conditions: [],
        hiddenTraits: [],
        causalChains: [],
      };
    } else {
      // Repair sub-fields of aliveEntities
      if (!repairedState.aliveEntities.npcs) {
        repairedState.aliveEntities.npcs =
          repairedState.aliveEntities.relationships || [];
      }
      delete repairedState.aliveEntities.relationships;
    }

    if (
      !repairedState.atmosphere ||
      typeof repairedState.atmosphere !== "object"
    ) {
      repairedState.atmosphere = {
        envTheme: "mystical",
        ambience: "quiet",
      };
    }

    // Initialize missing primitive fields
    if (typeof repairedState.forkId !== "number") {
      repairedState.forkId = 0;
    }
    if (typeof repairedState.turnNumber !== "number") {
      // Compute from nodes
      const nodeCount = Object.keys(repairedState.nodes).length;
      repairedState.turnNumber = Math.floor(nodeCount / 2);
    }
    if (typeof repairedState.lastSummarizedIndex !== "number") {
      repairedState.lastSummarizedIndex = -1;
    }
    if (!repairedState.time) {
      repairedState.time = "Day 1, Morning";
    }
    if (!repairedState.currentLocation) {
      repairedState.currentLocation = "Unknown";
    }
    if (!repairedState.language) {
      repairedState.language = "zh";
    }

    // Repair segmentIdx if missing
    Object.values(repairedState.nodes).forEach((node: any) => {
      if (typeof node.segmentIdx !== "number") {
        node.segmentIdx = 0;
      }
    });

    // Reconstruct currentFork if empty but we have an active node
    if (
      (!repairedState.currentFork || repairedState.currentFork.length === 0) &&
      repairedState.activeNodeId
    ) {
      const history: any[] = [];
      let curr = repairedState.activeNodeId;
      while (curr && repairedState.nodes[curr]) {
        history.unshift(repairedState.nodes[curr]);
        curr = repairedState.nodes[curr].parentId;
      }
      // Fix segmentIdx in the chain
      history.forEach((node, idx) => {
        node.segmentIdx = idx;
      });
      repairedState.currentFork = history;
    }

    // Reset transient state
    repairedState.isProcessing = false;
    repairedState.isImageGenerating = false;
    repairedState.generatingNodeId = null;
    repairedState.error = null;

    // Repair themeConfig if missing
    if (!repairedState.themeConfig && repairedState.theme) {
      // Use a basic themeConfig if we don't have a translator
      // In useGamePersistence, we can call it again with 't' if needed
      repairedState.themeConfig = createThemeConfig(
        repairedState.theme,
        (key: string, options?: any) => options?.defaultValue || key,
      );
    }

    return repairedState;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let migrationManagerInstance: MigrationManager | null = null;

export function getMigrationManager(): MigrationManager {
  if (!migrationManagerInstance) {
    migrationManagerInstance = new MigrationManager();
  }
  return migrationManagerInstance;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a new versioned game state with default values
 */
export function createVersionedGameState(
  baseState: GameState,
): VersionedGameState {
  return {
    ...baseState,
    _saveVersion: {
      version: CURRENT_SAVE_VERSION,
      createdAt: Date.now(),
    },
  };
}

/**
 * Get version display string
 */
export function getVersionDisplayString(state: any): string {
  const version = getMigrationManager().getSaveVersion(state);
  if (version === 0) {
    return "Legacy";
  }
  return `v${version}`;
}

/**
 * Check if a state has embedding index
 */
export function hasEmbeddingIndex(state: VersionedGameState): boolean {
  return !!state._embeddingIndex && state._embeddingIndex.documents.length > 0;
}
