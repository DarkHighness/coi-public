/**
 * Tool Call Processor
 *
 * Handles processing of tool calls in the agentic loop.
 */

import {
  dispatchToolCall,
  hasHandler,
  ToolContext,
} from "../../../tools/handlers";
import { createError } from "../../../tools/toolResult";
import type { LoopState } from "./loopInitializer";
import type { GameState, AISettings } from "../../../../types";

export interface ToolCallContext {
  loopState: LoopState;
  gameState: GameState;
  settings: AISettings;
  currentUserAction?: string;
}

export function executeGenericTool(
  name: string,
  args: JsonObject,
  ctx: ToolCallContext,
): unknown {
  const { loopState, gameState, settings, currentUserAction } = ctx;

  if (!hasHandler(name)) {
    return createError(`Unknown tool: ${name}`, "UNKNOWN");
  }

  const toolContext: ToolContext = {
    accumulatedResponse: loopState.accumulatedResponse,
    changedEntities: loopState.changedEntities,
    gameState,
    settings,
    embeddingEnabled: Boolean(settings?.embedding?.enabled),
    vfsSession: loopState.vfsSession,
    requiredCommandSkillPaths: loopState.requiredCommandSkillPaths,
    requiredPresetSkillPaths: loopState.requiredPresetSkillPaths,
    allowedToolNames: Array.isArray(loopState.activeTools)
      ? loopState.activeTools.map((tool) => tool.name)
      : [],
    vfsActor: "ai",
    vfsMode: loopState.vfsMode,
    vfsElevationToken: loopState.vfsElevationToken ?? null,
    vfsElevationIntent: loopState.vfsElevationIntent,
    vfsElevationScopeTemplateIds: loopState.vfsElevationScopeTemplateIds,
    vfsTurnUserAction:
      typeof currentUserAction === "string" && currentUserAction.length > 0
        ? currentUserAction
        : typeof args.userAction === "string" && args.userAction.length > 0
          ? args.userAction
          : undefined,
  };

  return dispatchToolCall(name, args, toolContext);
}
