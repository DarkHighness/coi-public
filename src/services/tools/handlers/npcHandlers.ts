/**
 * NPC Tool Handlers
 */

import {
  ADD_NPC_TOOL,
  UPDATE_NPC_TOOL,
  REMOVE_NPC_TOOL,
  QUERY_NPCS_TOOL,
  getTypedArgs,
} from "../../tools";
import {
  registerToolHandler,
  trackChangedEntity,
} from "../toolHandlerRegistry";
import type { GameResponse, NPC } from "../../../types";
import { createSuccess, createError } from "../../gameDatabase";

// Add NPC
registerToolHandler(ADD_NPC_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("add_npc", args);

  const name = typedArgs.visible?.name || typedArgs.name;
  if (!name) {
    return createError("NPC name is required", "INVALID_DATA");
  }
  if (!typedArgs.id) {
    return createError("ID is required for new NPCs", "INVALID_DATA");
  }

  if (db.getNpcById(typedArgs.id)) {
    return createError(`ID "${typedArgs.id}" already exists`, "ALREADY_EXISTS");
  }
  if (db.getNpcByName(name)) {
    return createError(`NPC "${name}" already exists`, "ALREADY_EXISTS");
  }

  const newNpc: NPC = {
    id: typedArgs.id,
    currentLocation: typedArgs.currentLocation || "Unknown",
    visible: {
      name: name,
      npcType: typedArgs.visible?.npcType || "Stranger",
      affinity: typedArgs.visible?.affinity ?? 50,
      affinityKnown: typedArgs.visible?.affinityKnown ?? false,
      description: typedArgs.visible?.description || "A stranger.",
      appearance: typedArgs.visible?.appearance,
      personality: typedArgs.visible?.personality,
      impression: typedArgs.visible?.impression,
      status: typedArgs.visible?.status,
    },
    hidden: {
      trueName: typedArgs.hidden?.trueName,
      npcType: typedArgs.hidden?.npcType || "Stranger",
      realPersonality: typedArgs.hidden?.realPersonality || "Unknown",
      realMotives: typedArgs.hidden?.realMotives || "Unknown",
      status: typedArgs.hidden?.status || "Unknown",
      secrets: typedArgs.hidden?.secrets || [],
      trueAffinity: typedArgs.hidden?.trueAffinity ?? 50,
      impression: typedArgs.hidden?.impression,
    },
    known: typedArgs.known ?? true,
    createdAt: Date.now(),
    modifiedAt: db.createCurrentTimestamp(),
    lastModified: Date.now(),
    notes: typedArgs.notes,
    icon: typedArgs.icon,
    unlocked: false,
    highlight: true,
  };

  db.addNpc(newNpc);

  if (ctx.accumulatedResponse) {
    ctx.accumulatedResponse.npcActions ??= [];
    ctx.accumulatedResponse.npcActions.push({
      action: "add",
      id: typedArgs.id,
      known: typedArgs.known,
      visible: typedArgs.visible,
      hidden: typedArgs.hidden,
      notes: typedArgs.notes,
    } as GameResponse["npcActions"][number]);
  }

  trackChangedEntity(
    ctx.changedEntities,
    { success: true, data: newNpc },
    "npc",
  );
  return createSuccess(newNpc, `Added NPC: ${newNpc.visible.name}`);
});

// Update NPC
registerToolHandler(UPDATE_NPC_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("update_npc", args);

  const npc = db.getNpcById(typedArgs.id) || db.getNpcByName(typedArgs.id);
  if (!npc) {
    const suggestion = db.getSuggestSimilar(typedArgs.id, db.getNpcList());
    return createError(
      `NPC "${typedArgs.id}" not found.${suggestion}`,
      "NOT_FOUND",
    );
  }

  db.updateNpc(npc.id, {
    visible: typedArgs.visible,
    hidden: typedArgs.hidden,
    currentLocation: typedArgs.currentLocation,
    known: typedArgs.known,
    notes: typedArgs.notes,
  });

  if (ctx.accumulatedResponse) {
    ctx.accumulatedResponse.npcActions ??= [];
    ctx.accumulatedResponse.npcActions.push({
      action: "update",
      id: npc.id,
      visible: typedArgs.visible,
      hidden: typedArgs.hidden,
      notes: typedArgs.notes,
    } as GameResponse["npcActions"][number]);
  }

  trackChangedEntity(ctx.changedEntities, { success: true, data: npc }, "npc");
  return createSuccess(npc, `Updated NPC: ${npc.visible.name}`);
});

// Remove NPC
registerToolHandler(REMOVE_NPC_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("remove_npc", args);

  const npc = db.getNpcById(typedArgs.id);
  if (!npc) {
    const suggestion = db.getSuggestSimilar(typedArgs.id, db.getNpcList());
    return createError(
      `NPC "${typedArgs.id}" not found.${suggestion}`,
      "NOT_FOUND",
    );
  }

  const removed = db.removeNpc(npc.id);
  if (!removed) {
    return createError(`Failed to remove NPC`, "UNKNOWN");
  }

  if (ctx.accumulatedResponse) {
    ctx.accumulatedResponse.npcActions ??= [];
    ctx.accumulatedResponse.npcActions.push({
      action: "remove",
      id: removed.id,
    } as GameResponse["npcActions"][number]);
  }

  return createSuccess(
    { removed: removed.id },
    `Removed NPC: ${removed.visible.name}`,
  );
});

// Query NPCs
registerToolHandler(QUERY_NPCS_TOOL, (args, ctx) => {
  return ctx.db.query("npc", args.query as string, undefined, {
    page: args.page as number,
    limit: args.limit as number,
  });
});
