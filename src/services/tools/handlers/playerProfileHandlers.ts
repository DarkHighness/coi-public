/**
 * Player Profile Tool Handlers
 *
 * Handles cross-save + per-save player psychology profiling.
 * Cross-save profile is stored in AISettings, per-save in GameState.
 */

import {
  QUERY_PLAYER_PROFILE_TOOL,
  UPDATE_PLAYER_PROFILE_TOOL,
  getTypedArgs,
} from "../../tools";
import { registerToolHandler } from "../toolHandlerRegistry";
import { createSuccess, createError } from "../../gameDatabase";

// Query Player Profile - returns both cross-save and per-save profiles
registerToolHandler(QUERY_PLAYER_PROFILE_TOOL, (_args, ctx) => {
  const { settings, db } = ctx;

  // Check if profiling is disabled
  if (settings?.extra?.disablePlayerProfiling) {
    return createSuccess(
      {
        disabled: true,
        message: "Player profiling is disabled by user preference.",
      },
      "Player profiling is disabled",
    );
  }

  const crossSaveProfile = settings?.playerProfile || null;
  const perSaveProfile = db.getState().playerProfile || null;

  return createSuccess(
    {
      crossSave: crossSaveProfile,
      perSave: perSaveProfile,
    },
    "Retrieved player profiles",
  );
});

// Update Player Profile - updates cross-save and/or per-save profile
registerToolHandler(UPDATE_PLAYER_PROFILE_TOOL, (args, ctx) => {
  const { settings, db } = ctx;
  const typedArgs = getTypedArgs("update_player_profile", args);

  // Check if profiling is disabled
  if (settings?.extra?.disablePlayerProfiling) {
    return createError(
      "Player profiling is disabled by user preference. Cannot update.",
      "INVALID_ACTION",
    );
  }

  const updates: string[] = [];

  // Update cross-save profile (stored in settings)
  // Note: This requires the caller to persist settings changes
  if (typedArgs.crossSave !== undefined) {
    // We store the update intent - the agentic loop must handle persisting settings
    // For now, we'll store it in a special place in the accumulated response
    (ctx as any)._pendingSettingsUpdate = {
      ...(ctx as any)._pendingSettingsUpdate,
      playerProfile: typedArgs.crossSave,
    };
    updates.push("cross-save");
  }

  // Update per-save profile (stored in GameState)
  if (typedArgs.perSave !== undefined) {
    db.updatePlayerProfile(typedArgs.perSave);
    updates.push("per-save");
  }

  if (updates.length === 0) {
    return createError(
      "No profile updates provided. Specify crossSave and/or perSave.",
      "INVALID_DATA",
    );
  }

  return createSuccess(
    {
      updated: updates,
      crossSave: typedArgs.crossSave,
      perSave: typedArgs.perSave,
    },
    `Updated player profile: ${updates.join(", ")}`,
  );
});
