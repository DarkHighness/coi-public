/**
 * Quest Tool Handlers
 */

import {
  ADD_QUEST_TOOL,
  UPDATE_QUEST_TOOL,
  REMOVE_QUEST_TOOL,
  COMPLETE_QUEST_TOOL,
  FAIL_QUEST_TOOL,
  QUERY_QUESTS_TOOL,
  getTypedArgs,
} from "../../tools";
import {
  registerToolHandler,
  trackChangedEntity,
} from "../toolHandlerRegistry";
import type { GameResponse, Quest } from "../../../types";
import { createSuccess, createError } from "../../gameDatabase";

// Add Quest
registerToolHandler(ADD_QUEST_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("add_quest", args);

  if (!typedArgs.title) {
    return createError("Quest title is required", "INVALID_DATA");
  }
  if (!typedArgs.id) {
    return createError("ID is required for new quests", "INVALID_DATA");
  }

  if (db.getQuestById(typedArgs.id)) {
    return createError(`ID "${typedArgs.id}" already exists`, "ALREADY_EXISTS");
  }

  // Check title conflict (match original modifyQuest logic)
  const existingByTitle = db
    .getQuestList()
    .find((q) => q.title.toLowerCase() === typedArgs.title.toLowerCase());
  if (existingByTitle) {
    return createError(
      `Quest "${typedArgs.title}" already exists with ID "${existingByTitle.id}". Use action 'update' if you want to modify it.`,
      "ALREADY_EXISTS",
    );
  }

  const newQuest: Quest = {
    id: typedArgs.id,
    title: typedArgs.title,
    type: typedArgs.type || "side",
    status: "active",
    visible: {
      description: typedArgs.visible?.description || "A new quest.",
      objectives: typedArgs.visible?.objectives || [],
    },
    hidden: {
      trueDescription: typedArgs.hidden?.trueDescription,
      trueObjectives: typedArgs.hidden?.trueObjectives,
      secretOutcome: typedArgs.hidden?.secretOutcome,
      twist: typedArgs.hidden?.twist,
    },
    createdAt: Date.now(),
    modifiedAt: db.createCurrentTimestamp(),
    lastModified: Date.now(),
    notes: typedArgs.notes,
    icon: typedArgs.icon,
    unlocked: false,
    highlight: true,
  };

  db.addQuest(newQuest);

  if (ctx.accumulatedResponse) {
    ctx.accumulatedResponse.questActions ??= [];
    ctx.accumulatedResponse.questActions.push({
      action: "add",
      id: typedArgs.id,
      title: typedArgs.title,
      type: typedArgs.type,
      visible: typedArgs.visible,
      hidden: typedArgs.hidden,
    } as GameResponse["questActions"][number]);
  }

  trackChangedEntity(
    ctx.changedEntities,
    { success: true, data: newQuest },
    "quest",
  );
  return createSuccess(
    { id: newQuest.id, title: newQuest.title },
    `Added quest: ${newQuest.title}`,
  );
});

// Update Quest
registerToolHandler(UPDATE_QUEST_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("update_quest", args);

  const quest = db.getQuestById(typedArgs.id);
  if (!quest) {
    const suggestion = db.getSuggestSimilar(typedArgs.id, db.getQuestList());
    return createError(
      `Quest "${typedArgs.id}" not found.${suggestion}`,
      "NOT_FOUND",
    );
  }

  db.updateQuest(quest.id, {
    title: typedArgs.title,
    type: typedArgs.type,
    visible: typedArgs.visible,
    hidden: typedArgs.hidden,
    notes: typedArgs.notes,
    icon: typedArgs.icon,
  });

  if (ctx.accumulatedResponse) {
    ctx.accumulatedResponse.questActions ??= [];
    ctx.accumulatedResponse.questActions.push({
      action: "update",
      id: quest.id,
      title: typedArgs.title || quest.title,
      visible: typedArgs.visible,
      hidden: typedArgs.hidden,
    } as GameResponse["questActions"][number]);
  }

  trackChangedEntity(
    ctx.changedEntities,
    { success: true, data: quest },
    "quest",
  );
  return createSuccess(quest, `Updated quest: ${quest.title}`);
});

// Remove Quest
registerToolHandler(REMOVE_QUEST_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("remove_quest", args);

  const quest = db.getQuestById(typedArgs.id);
  if (!quest) {
    const suggestion = db.getSuggestSimilar(typedArgs.id, db.getQuestList());
    return createError(
      `Quest "${typedArgs.id}" not found.${suggestion}`,
      "NOT_FOUND",
    );
  }

  const removed = db.removeQuest(quest.id);
  if (!removed) {
    return createError(`Failed to remove quest`, "UNKNOWN");
  }

  if (ctx.accumulatedResponse) {
    ctx.accumulatedResponse.questActions ??= [];
    ctx.accumulatedResponse.questActions.push({
      action: "remove",
      id: removed.id,
      title: removed.title,
    } as GameResponse["questActions"][number]);
  }

  return createSuccess(
    { removed: removed.id },
    `Removed quest: ${removed.title}`,
  );
});

// Complete Quest
registerToolHandler(COMPLETE_QUEST_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("complete_quest", args);

  const quest = db.getQuestById(typedArgs.id);
  if (!quest) {
    return createError(`Quest "${typedArgs.id}" not found`, "NOT_FOUND");
  }

  db.updateQuest(quest.id, { status: "completed" });

  if (ctx.accumulatedResponse) {
    ctx.accumulatedResponse.questActions ??= [];
    ctx.accumulatedResponse.questActions.push({
      action: "complete",
      id: quest.id,
      title: quest.title,
    } as GameResponse["questActions"][number]);
  }

  return createSuccess(quest, `Completed quest: ${quest.title}`);
});

// Fail Quest
registerToolHandler(FAIL_QUEST_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("fail_quest", args);

  const quest = db.getQuestById(typedArgs.id);
  if (!quest) {
    return createError(`Quest "${typedArgs.id}" not found`, "NOT_FOUND");
  }

  db.updateQuest(quest.id, { status: "failed" });

  if (ctx.accumulatedResponse) {
    ctx.accumulatedResponse.questActions ??= [];
    ctx.accumulatedResponse.questActions.push({
      action: "fail",
      id: quest.id,
      title: quest.title,
    } as GameResponse["questActions"][number]);
  }

  return createSuccess(quest, `Failed quest: ${quest.title}`);
});

// Query Quests
registerToolHandler(QUERY_QUESTS_TOOL, (args, ctx) => {
  return ctx.db.query("quest", args.query as string, undefined, {
    page: args.page as number,
    limit: args.limit as number,
  });
});
