/**
 * Outline Tool Handler
 *
 * Handles override_outline tool for SUDO mode.
 */

import { OVERRIDE_OUTLINE_TOOL, getTypedArgs } from "../../tools";
import { registerToolHandler } from "../toolHandlerRegistry";

// ============================================================================
// Override Outline Handler (SUDO MODE ONLY)
// ============================================================================

registerToolHandler(OVERRIDE_OUTLINE_TOOL, (args, ctx) => {
  const { gameState } = ctx;

  if (!gameState || !gameState.outline) {
    return {
      success: false,
      error: "Cannot override outline: game state or outline not available.",
      code: "NO_OUTLINE",
    };
  }

  const typedArgs = getTypedArgs("override_outline", args);

  // Deep merge worldSetting changes
  if (typedArgs.worldSetting) {
    if (!gameState.outline.worldSetting) {
      gameState.outline.worldSetting = {
        visible: { description: "", rules: "" },
        hidden: { hiddenRules: "", secrets: [] },
        history: "",
      };
    }

    if (typedArgs.worldSetting.visible) {
      gameState.outline.worldSetting.visible = {
        ...gameState.outline.worldSetting.visible,
        ...typedArgs.worldSetting.visible,
      };
    }
    if (typedArgs.worldSetting.hidden) {
      gameState.outline.worldSetting.hidden = {
        ...gameState.outline.worldSetting.hidden,
        ...typedArgs.worldSetting.hidden,
      };
    }
    if (typedArgs.worldSetting.history !== undefined) {
      gameState.outline.worldSetting.history = typedArgs.worldSetting.history;
    }
  }

  // Set narrativeStyle
  if (typedArgs.narrativeStyle !== undefined) {
    (gameState.outline as Record<string, unknown>).narrativeStyle =
      typedArgs.narrativeStyle;
  }

  return {
    success: true,
    message: "Outline fields updated successfully.",
  };
});
