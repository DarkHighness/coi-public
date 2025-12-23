/**
 * Notes Tool Handlers
 */

import {
  QUERY_NOTES_TOOL,
  LIST_NOTES_TOOL,
  UPDATE_NOTES_TOOL,
  REMOVE_NOTES_TOOL,
  getTypedArgs,
} from "../../tools";
import { registerToolHandler } from "../toolHandlerRegistry";
import { createSuccess, createError } from "../../gameDatabase";

// Query Notes
registerToolHandler(QUERY_NOTES_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("query_notes", args);

  const keys = typedArgs.keys || [];
  const limit = typedArgs.limit || 5;
  const page = typedArgs.page || 1;

  const results: Record<string, string> = {};
  const keysToQuery = keys.slice((page - 1) * limit, page * limit);

  for (const key of keysToQuery) {
    const value = db.getNote(key);
    if (value !== undefined) {
      results[key] = value;
    }
  }

  return createSuccess(
    results,
    `Retrieved ${Object.keys(results).length} notes`,
  );
});

// List Notes
registerToolHandler(LIST_NOTES_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("list_notes", args);

  let allKeys = db.getAllNoteKeys();

  // Apply search filter
  if (typedArgs.search) {
    try {
      const regex = new RegExp(typedArgs.search, "i");
      allKeys = allKeys.filter((key) => regex.test(key));
    } catch {
      allKeys = allKeys.filter((key) =>
        key.toLowerCase().includes(typedArgs.search!.toLowerCase()),
      );
    }
  }

  // Paginate
  const limit = typedArgs.limit || 20;
  const page = typedArgs.page || 1;
  const total = allKeys.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const keys = allKeys.slice(start, start + limit);

  return createSuccess(
    { keys, total, page, totalPages },
    `Listed ${keys.length} note keys (page ${page}/${totalPages})`,
  );
});

// Update Notes
registerToolHandler(UPDATE_NOTES_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("update_notes", args);

  if (!typedArgs.key) {
    return createError("Note key is required", "INVALID_DATA");
  }

  let value = typedArgs.value;

  // Handle diff mode
  if (typedArgs.diff) {
    const existing = db.getNote(typedArgs.key) || "";
    const lines = existing.split("\n");
    const diffLines = value.split("\n");

    for (const diffLine of diffLines) {
      if (diffLine.startsWith("+")) {
        lines.push(diffLine.slice(1));
      } else if (diffLine.startsWith("-")) {
        const toRemove = diffLine.slice(1);
        const index = lines.indexOf(toRemove);
        if (index !== -1) {
          lines.splice(index, 1);
        }
      }
    }

    value = lines.join("\n");
  }

  db.setNote(typedArgs.key, value);

  return createSuccess(
    { key: typedArgs.key },
    `Updated note: ${typedArgs.key}`,
  );
});

// Remove Notes
registerToolHandler(REMOVE_NOTES_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("remove_notes", args);

  const removed: string[] = [];
  const notFound: string[] = [];

  for (const key of typedArgs.keys) {
    if (db.removeNote(key)) {
      removed.push(key);
    } else {
      notFound.push(key);
    }
  }

  return createSuccess(
    { removed, notFound },
    `Removed ${removed.length} notes`,
  );
});
