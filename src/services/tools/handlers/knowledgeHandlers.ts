/**
 * Knowledge Tool Handlers
 */

import {
  ADD_KNOWLEDGE_TOOL,
  UPDATE_KNOWLEDGE_TOOL,
  REMOVE_KNOWLEDGE_TOOL,
  QUERY_KNOWLEDGE_TOOL,
  getTypedArgs,
} from "../../tools";
import {
  registerToolHandler,
  trackChangedEntity,
} from "../toolHandlerRegistry";
import type { GameResponse, KnowledgeEntry } from "../../../types";
import { createSuccess, createError } from "../../gameDatabase";

// Add Knowledge
registerToolHandler(ADD_KNOWLEDGE_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("add_knowledge", args);

  if (!typedArgs.title) {
    return createError("Knowledge title is required", "INVALID_DATA");
  }
  if (!typedArgs.id) {
    return createError(
      "ID is required for new knowledge entries",
      "INVALID_DATA",
    );
  }

  if (db.getKnowledgeById(typedArgs.id)) {
    return createError(`ID "${typedArgs.id}" already exists`, "ALREADY_EXISTS");
  }

  // Check title conflict (match original modifyKnowledge logic)
  const existingByTitle = db
    .getKnowledgeList()
    .find((k) => k.title.toLowerCase() === typedArgs.title.toLowerCase());
  if (existingByTitle) {
    return createError(
      `Knowledge "${typedArgs.title}" already exists with ID "${existingByTitle.id}". Use action 'update' if you want to modify it.`,
      "ALREADY_EXISTS",
    );
  }

  const newEntry: KnowledgeEntry = {
    id: typedArgs.id,
    title: typedArgs.title,
    category: typedArgs.category || "other",
    visible: {
      description: typedArgs.visible?.description || "A piece of knowledge.",
      details: typedArgs.visible?.details,
    },
    hidden: {
      fullTruth: typedArgs.hidden?.fullTruth || "The full truth is unknown.",
      misconceptions: typedArgs.hidden?.misconceptions,
      toBeRevealed: typedArgs.hidden?.toBeRevealed,
    },
    discoveredAt: typedArgs.discoveredAt,
    relatedTo: typedArgs.relatedTo,
    createdAt: Date.now(),
    modifiedAt: db.createCurrentTimestamp(),
    lastModified: Date.now(),
    notes: typedArgs.notes,
    icon: typedArgs.icon,
    unlocked: false,
    highlight: true,
  };

  db.addKnowledge(newEntry);

  if (ctx.accumulatedResponse) {
    ctx.accumulatedResponse.knowledgeActions ??= [];
    ctx.accumulatedResponse.knowledgeActions.push({
      action: "add",
      id: typedArgs.id,
      title: typedArgs.title,
      category: typedArgs.category,
      visible: typedArgs.visible,
      hidden: typedArgs.hidden,
    } as GameResponse["knowledgeActions"][number]);
  }

  trackChangedEntity(
    ctx.changedEntities,
    { success: true, data: newEntry },
    "knowledge",
  );
  return createSuccess(
    { id: newEntry.id, title: newEntry.title },
    `Added knowledge: ${newEntry.title}`,
  );
});

// Update Knowledge
registerToolHandler(UPDATE_KNOWLEDGE_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("update_knowledge", args);

  const entry = db.getKnowledgeById(typedArgs.id);
  if (!entry) {
    const suggestion = db.getSuggestSimilar(
      typedArgs.id,
      db.getKnowledgeList(),
    );
    return createError(
      `Knowledge "${typedArgs.id}" not found.${suggestion}`,
      "NOT_FOUND",
    );
  }

  db.updateKnowledge(entry.id, {
    title: typedArgs.title,
    visible: typedArgs.visible,
    hidden: typedArgs.hidden,
    category: typedArgs.category,
    notes: typedArgs.notes,
    icon: typedArgs.icon,
  });

  if (ctx.accumulatedResponse) {
    ctx.accumulatedResponse.knowledgeActions ??= [];
    ctx.accumulatedResponse.knowledgeActions.push({
      action: "update",
      id: entry.id,
      title: typedArgs.title || entry.title,
      visible: typedArgs.visible,
      hidden: typedArgs.hidden,
    } as GameResponse["knowledgeActions"][number]);
  }

  trackChangedEntity(
    ctx.changedEntities,
    { success: true, data: entry },
    "knowledge",
  );
  return createSuccess(entry, `Updated knowledge: ${entry.title}`);
});

// Remove Knowledge
registerToolHandler(REMOVE_KNOWLEDGE_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("remove_knowledge", args);

  if (!typedArgs.id) {
    return createError("ID is required", "INVALID_DATA");
  }

  const success = db.removeKnowledge(typedArgs.id);
  if (!success) {
    return createError(`Knowledge "${typedArgs.id}" not found`, "NOT_FOUND");
  }

  return createSuccess(
    { removed: typedArgs.id },
    `Removed knowledge: ${typedArgs.id}`,
  );
});

// Query Knowledge
registerToolHandler(QUERY_KNOWLEDGE_TOOL, (args, ctx) => {
  return ctx.db.query("knowledge", args.query as string, undefined, {
    page: args.page as number,
    limit: args.limit as number,
  });
});
