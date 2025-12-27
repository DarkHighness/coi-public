/**
 * Finish Turn Handler
 *
 * Handles finish_turn and complete_force_update tool calls.
 */

import type { AISettings } from "../../../../types";
import type { LoopState } from "./loopInitializer";
import { processFinishTurnData } from "./resultAccumulator";
import { ALL_DEFINED_TOOLS } from "../../../tools";
import { getToolInfo } from "../../../providers/utils";

// ============================================================================
// Types
// ============================================================================

export interface FinishTurnParams {
  toolName: string;
  args: Record<string, unknown>;
  loopState: LoopState;
  hasErrors: boolean;
  failedTools: string[];
  settings?: AISettings;
}

export interface FinishTurnResult {
  output: unknown;
  turnFinished: boolean;
}

// ============================================================================
// Handler
// ============================================================================

export function handleFinishTurn(params: FinishTurnParams): FinishTurnResult {
  const { toolName, args, loopState, hasErrors, failedTools, settings } =
    params;

  // Block if there were errors
  if (hasErrors) {
    return {
      output: {
        success: false,
        error: `[ERROR: TOOL_FAILURES] Cannot finish turn. The following tools failed in this turn:\n- ${failedTools.join("\n- ")}\n\nYou MUST fix these errors before calling ${toolName}. Review the error messages and call the failed tools again with corrected parameters.`,
        code: "BLOCKED_BY_ERRORS",
        failedTools,
      },
      turnFinished: false,
    };
  }

  // Validate arguments with Zod schema
  const finishToolDef = ALL_DEFINED_TOOLS.find((t) => t.name === toolName);
  if (finishToolDef) {
    // Use strict validation to reject extra fields
    const strictSchema = finishToolDef.parameters.strict();
    const validationResult = strictSchema.safeParse(args);

    if (!validationResult.success) {
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

      let errorMsg = `[VALIDATION_ERROR] Invalid parameters for "${toolName}".\n\n`;
      if (missingFields.length > 0) {
        errorMsg += `Missing required fields:\n${missingFields.map((f) => `- ${f}`).join("\n")}\n\n`;
      }
      if (extraFields.length > 0) {
        errorMsg += `Unexpected extra fields (not in schema):\n${extraFields.map((f: string) => `- ${f}`).join("\n")}\n\n`;
      }
      if (otherErrors.length > 0) {
        errorMsg += `Other validation errors:\n${otherErrors.map((e) => `- ${e.path.join(".") || "(root)"}: ${e.message}`).join("\n")}\n\n`;
      }
      errorMsg += `Please refer to the schema:\n${getToolInfo(finishToolDef as any)}`;

      return {
        output: {
          success: false,
          error: errorMsg,
          code: "INVALID_PARAMS",
        },
        turnFinished: false,
      };
    }
  }

  // Process the finish turn data
  try {
    processFinishTurnData(args, loopState.accumulatedResponse, loopState.db);
    const message =
      toolName === "complete_force_update"
        ? "Force update completed. State captured."
        : "Turn finished. State captured.";
    return {
      output: { success: true, message },
      turnFinished: true,
    };
  } catch (err: any) {
    return {
      output: {
        success: false,
        error: `Error finishing turn: ${err.message}`,
        code: "EXECUTION_ERROR",
      },
      turnFinished: false,
    };
  }
}
