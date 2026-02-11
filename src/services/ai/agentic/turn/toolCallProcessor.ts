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
import { createError } from "../../../tools/toolResult";
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
  errorMsg += `\n\nTool docs:\n- current/refs/tools/${name}.md\n- current/refs/tools/README.md`;

  return {
    valid: false,
    error: createError(errorMsg, "INVALID_PARAMS", {
      category: "validation",
      tool: name,
      issues: errors.map((issue) => {
        const issueRecord = issue as Record<string, unknown>;
        return {
          path: issue.path.join(".") || "(root)",
          code: issue.code,
          message: issue.message,
          ...(Object.prototype.hasOwnProperty.call(issueRecord, "expected")
            ? { expected: issueRecord.expected }
            : {}),
          ...(Object.prototype.hasOwnProperty.call(issueRecord, "received")
            ? { received: issueRecord.received }
            : {}),
        };
      }),
      recovery: [
        `Call "${name}" again with only schema-defined fields.`,
        "If mutating files, re-read targets first when required by the tool contract.",
        `Open current/refs/tools/${name}.md for examples and parameter guidance.`,
      ],
      refs: [
        `current/refs/tools/${name}.md`,
        "current/refs/tools/README.md",
      ],
    }),
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
      embeddingEnabled: Boolean(settings?.embedding?.enabled),
      vfsSession: loopState.vfsSession,
      requiredCommandSkillPaths: loopState.requiredCommandSkillPaths,
      requiredPresetSkillPaths: loopState.requiredPresetSkillPaths,
      vfsActor: "ai",
      vfsMode: loopState.vfsMode,
      vfsElevationToken: loopState.vfsElevationToken ?? null,
      vfsElevationIntent: loopState.vfsElevationIntent,
      vfsElevationScopeTemplateIds: loopState.vfsElevationScopeTemplateIds,
    };
    return dispatchToolCall(name, args, toolContext);
  }

  return { success: false, error: `Unknown tool: ${name}` };
}
