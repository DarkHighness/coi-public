/**
 * Tool Call Processor
 *
 * Handles processing of tool calls in the agentic loop.
 */

import { ALL_DEFINED_TOOLS } from "../../../tools";
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

const MAX_VALIDATION_ISSUES = 6;

const summarizeValidationIssues = (
  issues: Array<{ path: Array<string | number>; message: string }>,
  maxIssues: number = MAX_VALIDATION_ISSUES,
): string[] => {
  const lines = issues.slice(0, maxIssues).map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    return `- ${path}: ${issue.message}`;
  });
  if (issues.length > maxIssues) {
    lines.push(`- ...and ${issues.length - maxIssues} more issue(s)`);
  }
  return lines;
};

const toolDocRef = (name: string): string => `current/refs/tools/${name}.md`;

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
    if (name === "vfs_commit_soul") {
      const parsed = validationResult.data as {
        currentSoul?: unknown;
        globalSoul?: unknown;
      };
      const hasCurrentSoul =
        typeof parsed.currentSoul === "string" &&
        parsed.currentSoul.trim().length > 0;
      const hasGlobalSoul =
        typeof parsed.globalSoul === "string" &&
        parsed.globalSoul.trim().length > 0;
      if (!hasCurrentSoul && !hasGlobalSoul) {
        return {
          valid: false,
          error: createError(
            `[VALIDATION_ERROR] Invalid parameters for "vfs_commit_soul".\n` +
              `Top issue:\n- (root): at least one of currentSoul/globalSoul must be a non-empty string.\n` +
              `Docs: \`${toolDocRef("vfs_commit_soul")}\`\n` +
              "Docs index: `current/refs/tools/README.md`",
            "INVALID_PARAMS",
            {
              category: "validation",
              tool: name,
              issues: [
                {
                  path: "(root)",
                  code: "MISSING_ONE_OF",
                  message:
                    "At least one of currentSoul/globalSoul must be a non-empty string.",
                },
              ],
              recovery: [
                'Call "vfs_commit_soul" with currentSoul and/or globalSoul.',
                "Open `current/refs/tools/vfs_commit_soul.md` for examples.",
              ],
              refs: [
                "current/refs/tools/vfs_commit_soul.md",
                "current/refs/tools/README.md",
              ],
            },
          ),
        };
      }
    }
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

  const issueLines: string[] = [];
  if (missingFields.length > 0) {
    issueLines.push(
      ...missingFields.slice(0, MAX_VALIDATION_ISSUES).map((f) => `- ${f}: Required`),
    );
  }
  if (extraFields.length > 0) {
    issueLines.push(
      ...extraFields
        .slice(0, MAX_VALIDATION_ISSUES)
        .map((f: string) => `- ${f}: Unrecognized key`),
    );
  }
  if (otherErrors.length > 0) {
    issueLines.push(
      ...summarizeValidationIssues(
        otherErrors.map((e) => ({ path: e.path, message: e.message })),
      ),
    );
  }
  if (issueLines.length === 0) {
    issueLines.push("- (root): Invalid parameters");
  }
  const trimmedIssueLines = issueLines.slice(0, MAX_VALIDATION_ISSUES);
  if (issueLines.length > MAX_VALIDATION_ISSUES) {
    trimmedIssueLines.push(
      `- ...and ${issueLines.length - MAX_VALIDATION_ISSUES} more issue(s)`,
    );
  }

  const errorMsg =
    `[VALIDATION_ERROR] Invalid parameters for "${name}".\n` +
    `Top issues:\n${trimmedIssueLines.join("\n")}\n` +
    `Docs: \`${toolDocRef(name)}\`\n` +
    "Docs index: `current/refs/tools/README.md`";

  return {
    valid: false,
    error: createError(errorMsg, "INVALID_PARAMS", {
      category: "validation",
      tool: name,
      issues: errors.slice(0, 10).map((issue) => {
        const issueRecord = issue as unknown as Record<string, unknown>;
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
        `Open \`${toolDocRef(name)}\` for examples and parameter guidance.`,
      ],
      refs: [toolDocRef(name), "current/refs/tools/README.md"],
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
