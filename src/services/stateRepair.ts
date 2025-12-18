import { GameState } from "../types";
import { generateEntityId, EntityType } from "./tools";

/**
 * Repair state integrity on load:
 * 1. Syncs nextIds counters to be higher than any existing entity ID.
 * 2. Detects and fixes duplicate IDs (by assigning new ones).
 *
 * Safe to call on any loaded state before using it.
 */
export const repairGameState = (state: GameState): GameState => {
  // Ensure we are working with a deep copy if we want purity,
  // but for performance we usually modify in-place if pre-clone.
  // Assuming caller handles cloning if necessary.

  const types: Array<{
    type: EntityType;
    list: any[];
    idKey?: string; // default "id"
  }> = [
    { type: "inventory", list: state.inventory || [] },
    { type: "npc", list: state.relationships || [] },
    { type: "location", list: state.locations || [] },
    { type: "quest", list: state.quests || [] },
    { type: "knowledge", list: state.knowledge || [] },
    { type: "faction", list: state.factions || [] },
    { type: "timeline", list: state.timeline || [] },
    { type: "causalChain", list: state.causalChains || [], idKey: "chainId" },
    { type: "skill", list: state.character?.skills || [] },
    { type: "condition", list: state.character?.conditions || [] },
    { type: "hiddenTrait", list: state.character?.hiddenTraits || [] },
  ];

  // Initialize/Ensures nextIds object exists
  if (!state.nextIds) {
    state.nextIds = {
      item: 1,
      npc: 1,
      location: 1,
      knowledge: 1,
      quest: 1,
      faction: 1,
      timeline: 1,
      causalChain: 1,
      skill: 1,
      condition: 1,
      hiddenTrait: 1,
    };
  }

  // Pass 1: Find Max IDs to sync counters
  types.forEach(({ type, list, idKey }) => {
    const keyMap: Record<EntityType, keyof typeof state.nextIds> = {
      inventory: "item",
      npc: "npc",
      location: "location",
      quest: "quest",
      knowledge: "knowledge",
      faction: "faction",
      timeline: "timeline",
      causalChain: "causalChain",
      skill: "skill",
      condition: "condition",
      hiddenTrait: "hiddenTrait",
    };
    const counterKey = keyMap[type];
    let maxNum = state.nextIds[counterKey] || 1;

    for (const item of list) {
      if (!item) continue;
      const id = item[idKey || "id"];
      if (typeof id === "string") {
        // Parse "prefix:number"
        const match = id.match(/:(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num >= maxNum) {
            maxNum = num + 1;
          }
        }
      }
    }
    state.nextIds[counterKey] = maxNum;
  });

  // Pass 2: Fix Duplicates
  // We need a local generateId helper since we are static
  const generateId = (type: EntityType): string => {
    const keyMap: Record<EntityType, keyof typeof state.nextIds> = {
      inventory: "item",
      npc: "npc",
      location: "location",
      quest: "quest",
      knowledge: "knowledge",
      faction: "faction",
      timeline: "timeline",
      causalChain: "causalChain",
      skill: "skill",
      condition: "condition",
      hiddenTrait: "hiddenTrait",
    };
    const key = keyMap[type];
    const nextNum = state.nextIds[key] || 1;
    state.nextIds[key] = nextNum + 1;
    return generateEntityId(type, nextNum);
  };

  types.forEach(({ type, list, idKey }) => {
    const seen = new Set<string>();
    for (const item of list) {
      if (!item) continue;
      const key = idKey || "id";
      const id = item[key];
      if (!id || seen.has(id)) {
        // Duplicate or missing ID!
        const newId = generateId(type);
        item[key] = newId;
        seen.add(newId);
        // console.warn(`Fixed duplicate/missing ID for ${type}: ${id} -> ${newId}`);
      } else {
        seen.add(id);
      }
    }
  });

  return state;
};

/**
 * Ensure the nextId counter is ahead of the provided manual ID.
 * Call this when a tool manually provides an ID (e.g. AI setting specific ID).
 */
export const syncIdCounter = (
  state: GameState,
  type: EntityType,
  manualId: string,
): void => {
  const match = manualId.match(/:(\d+)$/);
  if (match) {
    const num = parseInt(match[1], 10);
    const keyMap: Record<EntityType, keyof typeof state.nextIds> = {
      inventory: "item",
      npc: "npc",
      location: "location",
      quest: "quest",
      knowledge: "knowledge",
      faction: "faction",
      timeline: "timeline",
      causalChain: "causalChain",
      skill: "skill",
      condition: "condition",
      hiddenTrait: "hiddenTrait",
    };
    const key = keyMap[type];
    // Ensure key exists
    if (state.nextIds[key] === undefined) state.nextIds[key] = 1;

    if (state.nextIds[key] <= num) {
      state.nextIds[key] = num + 1;
    }
  }
};
