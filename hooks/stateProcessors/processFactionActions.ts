import { GameState, Faction } from "../../types";

export const processFactionActions = (
  currentFactions: Faction[],
  actions: any[],
): Faction[] => {
  if (!actions || !Array.isArray(actions)) return currentFactions;

  let newFactions = [...currentFactions];

  actions.forEach((action) => {
    if (action.action === "update") {
      const factionIndex = newFactions.findIndex((f) => f.id === action.id);

      if (factionIndex !== -1) {
        newFactions[factionIndex] = {
          ...newFactions[factionIndex],
          visible: action.visible || newFactions[factionIndex].visible,
          hidden: action.hidden || newFactions[factionIndex].hidden,
        };
      }
    }
  });

  return newFactions;
};
