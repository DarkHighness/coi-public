import {
  GameState,
  InventoryItem,
  Relationship,
  Location,
  KnowledgeEntry,
  Quest,
} from "../types";

export const getEntityById = <T extends { id: number }>(
  entities: T[],
  id: number,
): T | undefined => {
  return entities.find((e) => e.id === id);
};

export const getEntityByName = <T extends { name: string }>(
  entities: T[],
  name: string,
): T | undefined => {
  return entities.find((e) => e.name.toLowerCase() === name.toLowerCase());
};

export const findInventoryItem = (
  gameState: GameState,
  idOrName: number | string,
): InventoryItem | undefined => {
  if (typeof idOrName === "number") {
    return getEntityById(gameState.inventory, idOrName);
  }
  return getEntityByName(gameState.inventory, idOrName);
};

export const findRelationship = (
  gameState: GameState,
  idOrName: number | string,
): Relationship | undefined => {
  if (typeof idOrName === "number") {
    return getEntityById(gameState.relationships, idOrName);
  }
  return getEntityByName(gameState.relationships, idOrName);
};

export const findLocation = (
  gameState: GameState,
  idOrName: number | string,
): Location | undefined => {
  if (typeof idOrName === "number") {
    return getEntityById(gameState.locations, idOrName);
  }
  return getEntityByName(gameState.locations, idOrName);
};
