import { GameState } from "../types";

/**
 * Deduplication and ID assignment utilities for AI-generated IDs
 * No more nextIds counters - AI generates all IDs
 */

type EntityType =
  | "inventory"
  | "npc"
  | "location"
  | "quest"
  | "knowledge"
  | "faction"
  | "timeline"
  | "causalChain"
  | "skill"
  | "condition"
  | "hiddenTrait";

/**
 * Deduplicate IDs within a list by appending suffixes
 * Returns warning messages for duplicate IDs found
 */
const deduplicateIds = (list: any[], idKey: string = "id"): string[] => {
  const warnings: string[] = [];
  const seen = new Map<string, number>(); // ID -> occurrence count

  for (const item of list) {
    if (!item) continue;

    let id = item[idKey];

    // If ID is missing, generate a temporary one
    if (!id) {
      const tempId = `temp_${Math.random().toString(36).substring(7)}`;
      item[idKey] = tempId;
      warnings.push(`Missing ID auto-filled with temporary ID: ${tempId}`);
      seen.set(tempId, 1);
      continue;
    }

    // Check for duplicates
    if (seen.has(id)) {
      const count = seen.get(id)! + 1;
      seen.set(id, count);
      const newId = `${id}_${count}`;
      item[idKey] = newId;
      warnings.push(
        `Duplicate ID detected: "${id}" renamed to "${newId}". AI should generate unique IDs.`,
      );
      seen.set(newId, 1);
    } else {
      seen.set(id, 1);
    }
  }

  return warnings;
};

/**
 * Assign missing IDs for entities loaded from legacy saves
 * Uses simple sequential numbering for migrated data
 */
const assignMissingIds = (
  list: any[],
  typePrefix: string,
  idKey: string = "id",
): { warnings: string[]; nextIndex: number } => {
  const warnings: string[] = [];
  let nextIndex = 1;

  // Find highest existing numeric ID
  for (const item of list) {
    if (!item) continue;
    const id = item[idKey];
    if (typeof id === "string") {
      // Try to extract number from various formats
      const match = id.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num >= nextIndex) {
          nextIndex = num + 1;
        }
      }
    }
  }

  // Assign IDs to entities without them
  for (const item of list) {
    if (!item) continue;
    if (!item[idKey]) {
      const newId = `${typePrefix}_${nextIndex}`;
      item[idKey] = newId;
      nextIndex++;
      warnings.push(`Auto-assigned ID "${newId}" during migration.`);
    }
  }

  return { warnings, nextIndex };
};

/**
 * Repair state integrity on load:
 * 1. Assigns IDs to any entities missing them (legacy migration)
 * 2. Deduplicates any duplicate IDs
 */
export const repairGameState = (state: GameState): GameState => {
  const allWarnings: string[] = [];

  const types: Array<{
    type: EntityType;
    prefix: string;
    list: any[];
    idKey?: string;
  }> = [
    { type: "inventory", prefix: "inv", list: state.inventory || [] },
    { type: "npc", prefix: "npc", list: state.npcs || [] },
    { type: "location", prefix: "loc", list: state.locations || [] },
    { type: "quest", prefix: "quest", list: state.quests || [] },
    { type: "knowledge", prefix: "know", list: state.knowledge || [] },
    { type: "faction", prefix: "fac", list: state.factions || [] },
    { type: "timeline", prefix: "evt", list: state.timeline || [] },
    {
      type: "causalChain",
      prefix: "chain",
      list: state.causalChains || [],
      idKey: "chainId",
    },
    { type: "skill", prefix: "skill", list: state.character?.skills || [] },
    {
      type: "condition",
      prefix: "cond",
      list: state.character?.conditions || [],
    },
    {
      type: "hiddenTrait",
      prefix: "trait",
      list: state.character?.hiddenTraits || [],
    },
  ];

  // Pass 1: Assign missing IDs (for legacy saves)
  types.forEach(({ type, prefix, list, idKey }) => {
    const { warnings } = assignMissingIds(list, prefix, idKey || "id");
    allWarnings.push(...warnings);
  });

  // Pass 2: Deduplicate any duplicate IDs
  types.forEach(({ list, idKey }) => {
    const warnings = deduplicateIds(list, idKey || "id");
    allWarnings.push(...warnings);
  });

  // Log warnings if any
  if (allWarnings.length > 0) {
    console.warn("[State Repair] Issues found and fixed:", allWarnings);
  }

  return state;
};
