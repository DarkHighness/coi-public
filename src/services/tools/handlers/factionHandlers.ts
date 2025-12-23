/**
 * Faction Tool Handlers
 */

import {
  ADD_FACTION_TOOL,
  UPDATE_FACTION_TOOL,
  REMOVE_FACTION_TOOL,
  QUERY_FACTIONS_TOOL,
  getTypedArgs,
} from "../../tools";
import {
  registerToolHandler,
  trackChangedEntity,
} from "../toolHandlerRegistry";
import type { GameResponse, Faction } from "../../../types";
import { createSuccess, createError } from "../../gameDatabase";

// Add Faction
registerToolHandler(ADD_FACTION_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("add_faction", args);

  if (!typedArgs.name) {
    return createError("Faction name is required", "INVALID_DATA");
  }
  if (!typedArgs.id) {
    return createError("ID is required for new factions", "INVALID_DATA");
  }

  if (db.getFactionById(typedArgs.id)) {
    return createError(`ID "${typedArgs.id}" already exists`, "ALREADY_EXISTS");
  }
  if (db.getFactionByName(typedArgs.name)) {
    return createError(
      `Faction "${typedArgs.name}" already exists`,
      "ALREADY_EXISTS",
    );
  }

  const newFaction: Faction = {
    id: typedArgs.id,
    name: typedArgs.name,
    visible: {
      agenda: typedArgs.visible?.agenda || "Unknown agenda.",
      members: typedArgs.visible?.members,
      influence: typedArgs.visible?.influence,
      relations: typedArgs.visible?.relations,
    },
    hidden: {
      agenda: typedArgs.hidden?.agenda || "Secret agenda unknown.",
      members: typedArgs.hidden?.members,
      influence: typedArgs.hidden?.influence,
      relations: typedArgs.hidden?.relations,
      // Note: internalConflict is on the Faction entity, not the tool args
    },
    notes: typedArgs.notes,
    icon: typedArgs.icon,
    unlocked: false,
    highlight: true,
  };

  db.addFaction(newFaction);

  if (ctx.accumulatedResponse) {
    ctx.accumulatedResponse.factionActions ??= [];
    ctx.accumulatedResponse.factionActions.push({
      action: "add",
      id: typedArgs.id,
      name: typedArgs.name,
      visible: typedArgs.visible,
      hidden: typedArgs.hidden,
    } as GameResponse["factionActions"][number]);
  }

  trackChangedEntity(
    ctx.changedEntities,
    { success: true, data: newFaction },
    "faction",
  );
  return createSuccess(
    { id: newFaction.id, name: newFaction.name },
    `Added faction: ${newFaction.name}`,
  );
});

// Update Faction
registerToolHandler(UPDATE_FACTION_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("update_faction", args);

  const faction =
    db.getFactionById(typedArgs.id) || db.getFactionByName(typedArgs.id);
  if (!faction) {
    const suggestion = db.getSuggestSimilar(typedArgs.id, db.getFactionList());
    return createError(
      `Faction "${typedArgs.id}" not found.${suggestion}`,
      "NOT_FOUND",
    );
  }

  db.updateFaction(faction.id, {
    name: typedArgs.name,
    visible: typedArgs.visible,
    hidden: typedArgs.hidden,
    notes: typedArgs.notes,
    icon: typedArgs.icon,
  });

  if (ctx.accumulatedResponse) {
    ctx.accumulatedResponse.factionActions ??= [];
    ctx.accumulatedResponse.factionActions.push({
      action: "update",
      id: faction.id,
      name: typedArgs.name || faction.name,
      visible: typedArgs.visible,
      hidden: typedArgs.hidden,
    } as GameResponse["factionActions"][number]);
  }

  trackChangedEntity(
    ctx.changedEntities,
    { success: true, data: faction },
    "faction",
  );
  return createSuccess(faction, `Updated faction: ${faction.name}`);
});

// Remove Faction
registerToolHandler(REMOVE_FACTION_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("remove_faction", args);

  const faction = db.getFactionById(typedArgs.id);
  if (!faction) {
    const suggestion = db.getSuggestSimilar(typedArgs.id, db.getFactionList());
    return createError(
      `Faction "${typedArgs.id}" not found.${suggestion}`,
      "NOT_FOUND",
    );
  }

  const removed = db.removeFaction(faction.id);
  if (!removed) {
    return createError(`Failed to remove faction`, "UNKNOWN");
  }

  if (ctx.accumulatedResponse) {
    ctx.accumulatedResponse.factionActions ??= [];
    ctx.accumulatedResponse.factionActions.push({
      action: "remove",
      id: removed.id,
      name: removed.name,
    } as GameResponse["factionActions"][number]);
  }

  return createSuccess(
    { removed: removed.id },
    `Removed faction: ${removed.name}`,
  );
});

// Query Factions
registerToolHandler(QUERY_FACTIONS_TOOL, (args, ctx) => {
  return ctx.db.query("faction", args.query as string, undefined, {
    page: args.page as number,
    limit: args.limit as number,
  });
});
