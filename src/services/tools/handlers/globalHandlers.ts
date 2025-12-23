/**
 * Global/World State Tool Handlers
 */

import {
  QUERY_GLOBAL_TOOL,
  UPDATE_GLOBAL_TOOL,
  UPDATE_WORLD_INFO_TOOL,
  QUERY_ATMOSPHERE_ENUMS_TOOL,
  QUERY_ATMOSPHERE_ENUM_DESCRIPTION_TOOL,
  getTypedArgs,
} from "../../tools";
import { registerToolHandler } from "../toolHandlerRegistry";
import { createSuccess, createError } from "../../gameDatabase";
import { ENV_THEME_KEYS, AMBIENCES } from "../../../utils/constants/atmosphere";
import { weatherEffectSchema } from "../../zodSchemas";

// Weather values from the schema
const WEATHER_VALUES = weatherEffectSchema.options;

// Query Global State
registerToolHandler(QUERY_GLOBAL_TOOL, (args, ctx) => {
  return ctx.db.query("global");
});

// Update Global State
registerToolHandler(UPDATE_GLOBAL_TOOL, (args, ctx) => {
  const typedArgs = getTypedArgs("update_global", args);

  const updated: string[] = [];

  // Only update if we have actual values
  if (typedArgs.time) {
    ctx.db.updateGlobalState({ time: typedArgs.time });
    updated.push("time");
  }
  if (typedArgs.atmosphere) {
    // Normalize partial atmosphere to full AtmosphereObject
    const normalized = {
      envTheme: typedArgs.atmosphere.envTheme || "fantasy",
      ambience: typedArgs.atmosphere.ambience || "quiet",
      weather: typedArgs.atmosphere.weather,
    } as const;
    ctx.db.updateGlobalState({ atmosphere: normalized });
    updated.push("atmosphere");
  }

  // Match original modifyGlobal logic: error if no valid updates
  if (updated.length === 0) {
    return createError("No valid global updates provided", "INVALID_DATA");
  }

  return createSuccess(
    { updated },
    `Global state updated: ${updated.join(", ")}`,
  );
});

// Update World Info (unlock world setting / main goal)
registerToolHandler(UPDATE_WORLD_INFO_TOOL, (args, ctx) => {
  return ctx.db.modify("world_info", "update", args);
});

// Query Atmosphere Enums
registerToolHandler(QUERY_ATMOSPHERE_ENUMS_TOOL, (args, ctx) => {
  const categories = args.categories as string[] | undefined;
  const result: Record<string, readonly string[]> = {};

  if (!categories || categories.includes("envTheme")) {
    result.envTheme = ENV_THEME_KEYS;
  }
  if (!categories || categories.includes("ambience")) {
    result.ambience = AMBIENCES;
  }
  if (!categories || categories.includes("weather")) {
    result.weather = WEATHER_VALUES;
  }

  return createSuccess(result, "Atmosphere enums retrieved");
});

// Query Atmosphere Enum Descriptions
registerToolHandler(QUERY_ATMOSPHERE_ENUM_DESCRIPTION_TOOL, (args, ctx) => {
  const items = args.items as Array<{ category: string; value: string }>;
  const results: Array<{
    category: string;
    value: string;
    description: string;
  }> = [];

  for (const item of items) {
    // For now, just return the value as description (can be enhanced with actual descriptions)
    results.push({
      category: item.category,
      value: item.value,
      description: `${item.category}: ${item.value}`,
    });
  }

  return createSuccess(results, "Atmosphere descriptions retrieved");
});
