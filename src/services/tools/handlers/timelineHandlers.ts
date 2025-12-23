/**
 * Timeline Tool Handlers
 */

import {
  ADD_TIMELINE_TOOL,
  UPDATE_TIMELINE_TOOL,
  REMOVE_TIMELINE_TOOL,
  QUERY_TIMELINE_TOOL,
  getTypedArgs,
} from "../../tools";
import {
  registerToolHandler,
  trackChangedEntity,
} from "../toolHandlerRegistry";
import type { TimelineEvent } from "../../../types";
import { createSuccess, createError } from "../../gameDatabase";

// Add Timeline Event
registerToolHandler(ADD_TIMELINE_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("add_timeline", args);

  if (!typedArgs.id) {
    return createError("ID is required for timeline events", "INVALID_DATA");
  }

  if (db.getTimelineEventById(typedArgs.id)) {
    return createError(`ID "${typedArgs.id}" already exists`, "ALREADY_EXISTS");
  }

  const newEvent: TimelineEvent = {
    id: typedArgs.id,
    gameTime: typedArgs.gameTime || db.getState().time || "Unknown", // Match original: use current state time
    category: typedArgs.category || "world_event",
    visible: {
      description: typedArgs.visible?.description || "An event occurred.",
      causedBy: typedArgs.visible?.causedBy,
    },
    hidden: typedArgs.hidden || {
      trueDescription: "The truth is unknown.",
    },
    involvedEntities: typedArgs.involvedEntities,
    chainId: typedArgs.chainId,
    unlocked: false, // Match original modifyTimeline
    known: typedArgs.known ?? true,
    highlight: true,
  };

  db.addTimelineEvent(newEvent);
  trackChangedEntity(
    ctx.changedEntities,
    { success: true, data: newEvent },
    "event",
  );
  return createSuccess(newEvent, `Added timeline event: ${typedArgs.id}`);
});

// Update Timeline Event
registerToolHandler(UPDATE_TIMELINE_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("update_timeline", args);

  if (!typedArgs.id) {
    return createError("Timeline event ID is required", "INVALID_DATA");
  }

  const event = db.getTimelineEventById(typedArgs.id);
  if (!event) {
    return createError(
      `Timeline event "${typedArgs.id}" not found`,
      "NOT_FOUND",
    );
  }

  db.updateTimelineEvent(typedArgs.id, {
    visible: typedArgs.visible,
    hidden: typedArgs.hidden,
    category: typedArgs.category,
    known: typedArgs.known,
  });

  trackChangedEntity(
    ctx.changedEntities,
    { success: true, data: event },
    "event",
  );
  return createSuccess(event, `Updated timeline event: ${typedArgs.id}`);
});

// Remove Timeline Event
registerToolHandler(REMOVE_TIMELINE_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("remove_timeline", args);

  if (!typedArgs.id) {
    return createError("ID is required", "INVALID_DATA");
  }

  const success = db.removeTimelineEvent(typedArgs.id);
  if (!success) {
    return createError(
      `Timeline event "${typedArgs.id}" not found`,
      "NOT_FOUND",
    );
  }

  return createSuccess(
    { removed: typedArgs.id },
    `Removed timeline event: ${typedArgs.id}`,
  );
});

// Query Timeline
registerToolHandler(QUERY_TIMELINE_TOOL, (args, ctx) => {
  return ctx.db.query("timeline", args.query as string, undefined, {
    page: args.page as number,
    limit: args.limit as number,
  });
});
