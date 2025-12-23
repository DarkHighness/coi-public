/**
 * Inventory Tool Handlers
 */

import {
  ADD_INVENTORY_TOOL,
  UPDATE_INVENTORY_TOOL,
  REMOVE_INVENTORY_TOOL,
  QUERY_INVENTORY_TOOL,
  getTypedArgs,
} from "../../tools";
import {
  registerToolHandler,
  trackChangedEntity,
} from "../toolHandlerRegistry";
import type { GameResponse, InventoryItem } from "../../../types";
import { createSuccess, createError } from "../../gameDatabase";

// Add Inventory
registerToolHandler(ADD_INVENTORY_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("add_inventory", args);

  if (!typedArgs.name) {
    return createError("Item name is required", "INVALID_DATA");
  }
  if (!typedArgs.id) {
    return createError("ID is required for new items", "INVALID_DATA");
  }

  if (db.getInventoryById(typedArgs.id)) {
    return createError(`ID "${typedArgs.id}" already exists`, "ALREADY_EXISTS");
  }
  const existingByName = db.getInventoryByName(typedArgs.name);
  if (existingByName) {
    return createError(
      `Item "${typedArgs.name}" already exists with ID "${existingByName.id}"`,
      "ALREADY_EXISTS",
    );
  }

  const newItem: InventoryItem = {
    id: typedArgs.id,
    name: typedArgs.name,
    visible: {
      description: typedArgs.visible?.description || "A mysterious item.",
      observation: typedArgs.visible?.observation,
      usage: typedArgs.visible?.usage,
      sensory: typedArgs.visible?.sensory,
      condition: typedArgs.visible?.condition,
    },
    hidden: {
      truth: typedArgs.hidden?.truth || "The truth is hidden.",
      secrets: typedArgs.hidden?.secrets,
    },
    createdAt: Date.now(),
    modifiedAt: db.createCurrentTimestamp(),
    lastModified: Date.now(),
    lore: typedArgs.lore,
    notes: typedArgs.notes,
    icon: typedArgs.icon,
    unlocked: false,
    highlight: true,
  };

  db.addInventoryItem(newItem);

  if (ctx.accumulatedResponse) {
    ctx.accumulatedResponse.inventoryActions ??= [];
    ctx.accumulatedResponse.inventoryActions.push({
      action: "add",
      id: typedArgs.id,
      name: typedArgs.name,
      visible: typedArgs.visible,
      hidden: typedArgs.hidden,
      lore: typedArgs.lore,
    } as GameResponse["inventoryActions"][number]);
  }

  trackChangedEntity(
    ctx.changedEntities,
    { success: true, data: newItem },
    "item",
  );
  return createSuccess(
    { id: newItem.id, name: newItem.name },
    `Added item: ${newItem.name}`,
  );
});

// Update Inventory
registerToolHandler(UPDATE_INVENTORY_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("update_inventory", args);

  const item =
    db.getInventoryById(typedArgs.id) || db.getInventoryByName(typedArgs.id);
  if (!item) {
    const suggestion = db.getSuggestSimilar(
      typedArgs.id,
      db.getInventoryList(),
    );
    return createError(
      `Item "${typedArgs.id}" not found.${suggestion}`,
      "NOT_FOUND",
    );
  }

  db.updateInventoryItem(item.id, {
    name: typedArgs.name,
    visible: typedArgs.visible,
    hidden: typedArgs.hidden,
    lore: typedArgs.lore,
  });

  if (ctx.accumulatedResponse) {
    ctx.accumulatedResponse.inventoryActions ??= [];
    ctx.accumulatedResponse.inventoryActions.push({
      action: "update",
      id: item.id,
      name: typedArgs.name || item.name,
      visible: typedArgs.visible,
      hidden: typedArgs.hidden,
      lore: typedArgs.lore,
    } as GameResponse["inventoryActions"][number]);
  }

  trackChangedEntity(
    ctx.changedEntities,
    { success: true, data: item },
    "item",
  );
  return createSuccess(item, `Updated item: ${item.name}`);
});

// Remove Inventory
registerToolHandler(REMOVE_INVENTORY_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("remove_inventory", args);

  const item = db.getInventoryById(typedArgs.id);
  if (!item) {
    const suggestion = db.getSuggestSimilar(
      typedArgs.id,
      db.getInventoryList(),
    );
    return createError(
      `Item "${typedArgs.id}" not found.${suggestion}`,
      "NOT_FOUND",
    );
  }

  const removed = db.removeInventoryItem(item.id);
  if (!removed) {
    return createError(`Failed to remove item`, "UNKNOWN");
  }

  if (ctx.accumulatedResponse) {
    ctx.accumulatedResponse.inventoryActions ??= [];
    ctx.accumulatedResponse.inventoryActions.push({
      action: "remove",
      id: removed.id,
      name: removed.name,
    } as GameResponse["inventoryActions"][number]);
  }

  return createSuccess(
    { removed: removed.id },
    `Removed item: ${removed.name}`,
  );
});

// Query Inventory
registerToolHandler(QUERY_INVENTORY_TOOL, (args, ctx) => {
  return ctx.db.query("inventory", args.query as string, undefined, {
    page: args.page as number,
    limit: args.limit as number,
  });
});
