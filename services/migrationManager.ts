/**
 * Save Version Migration System
 * Handles migration of save data between versions
 */

import type {
  GameState,
  SaveVersionInfo,
  VersionedGameState,
  AliveEntities,
} from "../types";
import { CURRENT_SAVE_VERSION } from "../types";

// ============================================================================
// Migration Types
// ============================================================================

export interface MigrationContext {
  fromVersion: number;
  toVersion: number;
  logs: string[];
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

  // Future migrations will be added here:
  // {
  //   version: 2,
  //   description: "Added new field XYZ",
  //   migrate: async (state: any, context: MigrationContext) => {
  //     state.newField = defaultValue;
  //     context.logs.push("Applied v2 migration: Added newField");
  //     return state;
  //   },
  // },
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
  async migrate(state: any): Promise<VersionedGameState> {
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
   */
  validateState(state: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!state.nodes || typeof state.nodes !== "object") {
      errors.push("Missing or invalid 'nodes' field");
    }
    if (!Array.isArray(state.inventory)) {
      errors.push("Missing or invalid 'inventory' array");
    }
    if (!Array.isArray(state.relationships)) {
      errors.push("Missing or invalid 'relationships' array");
    }
    if (!Array.isArray(state.quests)) {
      errors.push("Missing or invalid 'quests' array");
    }
    if (!Array.isArray(state.locations)) {
      errors.push("Missing or invalid 'locations' array");
    }
    if (!state.character || typeof state.character !== "object") {
      errors.push("Missing or invalid 'character' object");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
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
