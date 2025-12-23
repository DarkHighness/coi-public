/**
 * Location Tool Handlers
 */

import {
  ADD_LOCATION_TOOL,
  UPDATE_LOCATION_TOOL,
  REMOVE_LOCATION_TOOL,
  QUERY_LOCATIONS_TOOL,
  getTypedArgs,
} from "../../tools";
import {
  registerToolHandler,
  trackChangedEntity,
} from "../toolHandlerRegistry";
import type { GameResponse, Location } from "../../../types";
import { createSuccess, createError } from "../../gameDatabase";

// Add Location
registerToolHandler(ADD_LOCATION_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("add_location", args);

  if (!typedArgs.name) {
    return createError("Location name is required", "INVALID_DATA");
  }
  if (!typedArgs.id) {
    return createError("ID is required for new locations", "INVALID_DATA");
  }

  if (db.getLocationById(typedArgs.id)) {
    return createError(`ID "${typedArgs.id}" already exists`, "ALREADY_EXISTS");
  }
  if (db.getLocationByName(typedArgs.name)) {
    return createError(
      `Location "${typedArgs.name}" already exists`,
      "ALREADY_EXISTS",
    );
  }

  const newLocation: Location = {
    id: typedArgs.id,
    name: typedArgs.name,
    visible: {
      description: typedArgs.visible?.description || "A new place.",
      knownFeatures: typedArgs.visible?.knownFeatures || [],
      environment: typedArgs.visible?.environment,
      ambience: typedArgs.visible?.ambience,
      weather: typedArgs.visible?.weather,
    },
    hidden: {
      fullDescription: typedArgs.hidden?.fullDescription || "",
      hiddenFeatures: typedArgs.hidden?.hiddenFeatures || [],
      secrets: typedArgs.hidden?.secrets || [],
    },
    isVisited: typedArgs.isVisited ?? true,
    createdAt: Date.now(),
    notes: typedArgs.notes,
    icon: typedArgs.icon,
    unlocked: false,
    highlight: true,
  };

  db.addLocation(newLocation);
  db.setCurrentLocation(typedArgs.name);

  if (ctx.accumulatedResponse) {
    ctx.accumulatedResponse.locationActions ??= [];
    ctx.accumulatedResponse.locationActions.push({
      type: "known",
      action: "add",
      id: typedArgs.id,
      name: typedArgs.name,
      visible: typedArgs.visible,
      hidden: typedArgs.hidden,
    } as GameResponse["locationActions"][number]);
  }

  trackChangedEntity(
    ctx.changedEntities,
    { success: true, data: newLocation },
    "location",
  );
  return createSuccess(
    { id: newLocation.id, name: newLocation.name },
    `Added location: ${newLocation.name}`,
  );
});

// Update Location
registerToolHandler(UPDATE_LOCATION_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("update_location", args);

  const loc =
    db.getLocationById(typedArgs.id) || db.getLocationByName(typedArgs.id);
  if (!loc) {
    const suggestion = db.getSuggestSimilar(typedArgs.id, db.getLocationList());
    return createError(
      `Location "${typedArgs.id}" not found.${suggestion}`,
      "NOT_FOUND",
    );
  }

  db.updateLocation(loc.id, {
    name: typedArgs.name,
    visible: typedArgs.visible,
    hidden: typedArgs.hidden,
    isVisited: typedArgs.isVisited,
    notes: typedArgs.notes,
    icon: typedArgs.icon,
  });

  if (ctx.accumulatedResponse) {
    ctx.accumulatedResponse.locationActions ??= [];
    ctx.accumulatedResponse.locationActions.push({
      type: "known",
      action: "update",
      id: loc.id,
      name: typedArgs.name || loc.name,
      visible: typedArgs.visible,
      hidden: typedArgs.hidden,
    } as GameResponse["locationActions"][number]);
  }

  trackChangedEntity(
    ctx.changedEntities,
    { success: true, data: loc },
    "location",
  );
  return createSuccess(loc, `Updated location: ${loc.name}`);
});

// Remove Location
registerToolHandler(REMOVE_LOCATION_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("remove_location", args);

  const loc = db.getLocationById(typedArgs.id);
  if (!loc) {
    const suggestion = db.getSuggestSimilar(typedArgs.id, db.getLocationList());
    return createError(
      `Location "${typedArgs.id}" not found.${suggestion}`,
      "NOT_FOUND",
    );
  }

  // Prevent removing the current location (match original modifyLocation logic)
  const currentLocation = db.getState().currentLocation;
  if (
    currentLocation?.toLowerCase() === loc.name.toLowerCase() ||
    currentLocation?.toLowerCase() === loc.id.toLowerCase()
  ) {
    return createError(
      `Cannot remove current location "${loc.name}"`,
      "INVALID_ACTION",
    );
  }

  const removed = db.removeLocation(loc.id);
  if (!removed) {
    return createError(`Failed to remove location`, "UNKNOWN");
  }

  if (ctx.accumulatedResponse) {
    ctx.accumulatedResponse.locationActions ??= [];
    ctx.accumulatedResponse.locationActions.push({
      type: "known",
      action: "remove",
      id: removed.id,
      name: removed.name,
    } as GameResponse["locationActions"][number]);
  }

  return createSuccess(
    { removed: removed.id },
    `Removed location: ${removed.name}`,
  );
});

// Query Locations
registerToolHandler(QUERY_LOCATIONS_TOOL, (args, ctx) => {
  return ctx.db.query("location", args.query as string, undefined, {
    page: args.page as number,
    limit: args.limit as number,
  });
});
