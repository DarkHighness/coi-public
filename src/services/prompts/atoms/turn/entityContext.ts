/**
 * ============================================================================
 * Turn Atom: Entity Context
 * ============================================================================
 *
 * Lists all current entities in the game world by type using TOON format.
 * Injected as the first user message to provide AI with entity reference.
 */

import type { Atom } from "../types";
import { toToon } from "../../toon";

// ============================================================================
// Entity Entry Types
// ============================================================================

/** Standard entity entry with single name */
export interface EntityEntry {
  id: string;
  name: string;
}

/**
 * NPC entity entry with dual-name support
 * - name: visible.name (what player knows)
 * - trueName: hidden.trueName (GM knowledge, may differ)
 */
export interface NpcEntry {
  id: string;
  name: string;
  trueName?: string; // hidden.trueName if different from visible.name
}

export interface EntityContextInput {
  npcs?: NpcEntry[];
  items?: EntityEntry[];
  locations?: EntityEntry[];
  quests?: EntityEntry[];
  knowledge?: EntityEntry[];
  factions?: EntityEntry[];
  timeline?: EntityEntry[];
  conditions?: EntityEntry[];
}

// ============================================================================
// TOON Rendering
// ============================================================================

/**
 * Entity Context Atom
 *
 * Generates a structured list of all current entities for AI reference.
 * Uses TOON format for compact, readable output.
 *
 * NPC entries include both visible name and true name (if different).
 */
export const entityContext: Atom<EntityContextInput> = (input) => {
  const entityData: Record<string, unknown> = {};

  // NPCs with dual-name support
  if (input.npcs && input.npcs.length > 0) {
    entityData.npcs = input.npcs.map((n) =>
      n.trueName && n.trueName !== n.name
        ? { id: n.id, name: n.name, trueName: n.trueName }
        : { id: n.id, name: n.name },
    );
  }

  // Standard entities
  if (input.items && input.items.length > 0) {
    entityData.items = input.items.map((e) => ({ id: e.id, name: e.name }));
  }

  if (input.locations && input.locations.length > 0) {
    entityData.locations = input.locations.map((e) => ({
      id: e.id,
      name: e.name,
    }));
  }

  if (input.quests && input.quests.length > 0) {
    entityData.quests = input.quests.map((e) => ({ id: e.id, name: e.name }));
  }

  if (input.knowledge && input.knowledge.length > 0) {
    entityData.knowledge = input.knowledge.map((e) => ({
      id: e.id,
      name: e.name,
    }));
  }

  if (input.factions && input.factions.length > 0) {
    entityData.factions = input.factions.map((e) => ({
      id: e.id,
      name: e.name,
    }));
  }

  if (input.timeline && input.timeline.length > 0) {
    entityData.timeline = input.timeline.map((e) => ({
      id: e.id,
      name: e.name,
    }));
  }

  if (input.conditions && input.conditions.length > 0) {
    entityData.conditions = input.conditions.map((e) => ({
      id: e.id,
      name: e.name,
    }));
  }

  return `<current_entities>
This section lists all currently tracked entities in the game world.
Use these IDs when referencing entities in tool calls (e.g., update_npc, update_inventory).
If you need to create a new entity, generate a new unique ID.

For NPCs: "name" is what player knows, "trueName" is the hidden true name (GM only).

${toToon(entityData)}
</current_entities>`;
};

/**
 * Compact version for lite mode - just entity counts
 */
export const entityContextLite: Atom<EntityContextInput> = (input) => {
  const counts = [
    input.npcs?.length ? `NPCs: ${input.npcs.length}` : null,
    input.items?.length ? `Items: ${input.items.length}` : null,
    input.locations?.length ? `Locations: ${input.locations.length}` : null,
    input.quests?.length ? `Quests: ${input.quests.length}` : null,
    input.knowledge?.length ? `Knowledge: ${input.knowledge.length}` : null,
    input.factions?.length ? `Factions: ${input.factions.length}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return `<entity_summary>${counts || "No entities"}</entity_summary>`;
};

export default entityContext;
