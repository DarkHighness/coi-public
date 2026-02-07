/**
 * Tool Call Processor
 *
 * Handles processing of tool calls in the agentic loop.
 */

import { ALL_DEFINED_TOOLS } from "../../../tools";
import { getToolInfo } from "../../../providers/utils";
import {
  dispatchToolCall,
  hasHandler,
  ToolContext,
} from "../../../tools/handlers";
import type { LoopState } from "./loopInitializer";

// ============================================================================
// Types
// ============================================================================

export interface ToolCallContext {
  loopState: LoopState;
  gameState: any;
  settings: any;
}

// ============================================================================
// Generic Tool Execution
// ============================================================================

/**
 * Validate tool arguments against Zod schema
 */
export function validateToolArgs(
  name: string,
  args: Record<string, unknown>,
): { valid: true } | { valid: false; error: unknown } {
  const toolDef = ALL_DEFINED_TOOLS.find((t) => t.name === name);
  if (!toolDef) {
    // No schema to validate against, allow execution
    return { valid: true };
  }

  // Use strict validation to reject extra fields
  const strictSchema = toolDef.parameters.strict();
  const validationResult = strictSchema.safeParse(args);

  if (validationResult.success) {
    return { valid: true };
  }

  // Categorize errors as missing vs extra fields
  const errors = validationResult.error.errors;
  const missingFields = errors
    .filter((e) => e.code === "invalid_type" && e.received === "undefined")
    .map((e) => e.path.join(".") || "(root)");
  const extraFields = errors
    .filter((e) => e.code === "unrecognized_keys")
    .flatMap((e: any) => e.keys || []);
  const otherErrors = errors.filter(
    (e) => e.code !== "invalid_type" && e.code !== "unrecognized_keys",
  );

  let errorMsg = `[VALIDATION_ERROR] Invalid parameters for "${name}".\n\n`;
  if (missingFields.length > 0) {
    errorMsg += `Missing required fields:\n${missingFields.map((f) => `- ${f}`).join("\n")}\n\n`;
  }
  if (extraFields.length > 0) {
    errorMsg += `Unexpected extra fields (not in schema):\n${extraFields.map((f: string) => `- ${f}`).join("\n")}\n\n`;
  }
  if (otherErrors.length > 0) {
    errorMsg += `Other validation errors:\n${otherErrors.map((e) => `- ${e.path.join(".") || "(root)"}: ${e.message}`).join("\n")}\n\n`;
  }
  errorMsg += `Please refer to the schema:\n${getToolInfo(toolDef as any)}`;

  return {
    valid: false,
    error: {
      success: false,
      error: errorMsg,
      code: "INVALID_PARAMS",
    },
  };
}

export function executeGenericTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolCallContext,
): unknown {
  const { loopState, gameState, settings } = ctx;

  // Validate arguments before execution
  const validation = validateToolArgs(name, args);
  if (!validation.valid) {
    return (validation as { valid: false; error: unknown }).error;
  }

  if (hasHandler(name)) {
    const toolContext: ToolContext = {
      accumulatedResponse: loopState.accumulatedResponse,
      changedEntities: loopState.changedEntities,
      gameState,
      settings,
      vfsSession: loopState.vfsSession,
      requiredCommandSkillPaths: loopState.requiredCommandSkillPaths,
    };
    return dispatchToolCall(name, args, toolContext);
  }

  return { success: false, error: `Unknown tool: ${name}` };
}
