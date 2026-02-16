import { z } from "zod";
import type { ToolContext } from "../../tools/toolHandlerRegistry";
import { createError } from "../../tools/toolResult";
import { vfsToolRegistry } from "./registry";
import type { VfsToolHandlerKey, VfsToolName } from "./types";
import {
  handleInspectLs,
  handleInspectRead,
  handleInspectSchema,
  handleInspectSearch,
} from "./handlers/inspect";
import { handleMutate } from "./handlers/mutate";
import { handleFinishTurn } from "./handlers/finishTurn";
import { handleFinishSoul } from "./handlers/finishSoul";
import { handleFinishSummary } from "./handlers/finishSummary";
import { handleFinishOutline } from "./handlers/finishOutline";

const HANDLERS: Record<VfsToolHandlerKey, (args: Record<string, unknown>, ctx: ToolContext) => unknown | Promise<unknown>> = {
  inspect_ls: handleInspectLs,
  inspect_schema: handleInspectSchema,
  inspect_read: handleInspectRead,
  inspect_search: handleInspectSearch,
  mutate: handleMutate,
  finish_turn: handleFinishTurn,
  finish_soul: handleFinishSoul,
  finish_summary: handleFinishSummary,
  finish_outline: handleFinishOutline,
};

const MAX_VALIDATION_ISSUES = 8;

const formatValidationIssues = (issues: Array<{ path: Array<string | number>; message: string }>): string => {
  const lines = issues.slice(0, MAX_VALIDATION_ISSUES).map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    return `- ${path}: ${issue.message}`;
  });
  if (issues.length > MAX_VALIDATION_ISSUES) {
    lines.push(`- ...and ${issues.length - MAX_VALIDATION_ISSUES} more issue(s)`);
  }
  return lines.join("\n");
};

const extraValidation = (
  name: VfsToolName,
  parsed: Record<string, unknown>,
): null | ReturnType<typeof createError> => {
  if (name === "vfs_finish_soul") {
    const currentSoul = parsed.currentSoul;
    const globalSoul = parsed.globalSoul;
    const hasCurrent =
      typeof currentSoul === "string" && currentSoul.trim().length > 0;
    const hasGlobal =
      typeof globalSoul === "string" && globalSoul.trim().length > 0;
    if (!hasCurrent && !hasGlobal) {
      return createError(
        '[VALIDATION_ERROR] vfs_finish_soul: at least one of currentSoul/globalSoul must be a non-empty string.',
        "INVALID_PARAMS",
      );
    }
  }

  return null;
};

const validateArgs = (name: VfsToolName, args: Record<string, unknown>) => {
  const tool = vfsToolRegistry.getDefinition(name);
  const strictSchema =
    tool.parameters instanceof z.ZodObject
      ? tool.parameters.strict()
      : tool.parameters;
  const result = strictSchema.safeParse(args);

  if (result.success) {
    const parsed = result.data as Record<string, unknown>;
    const extraError = extraValidation(name, parsed);
    if (extraError) {
      return { valid: false as const, error: extraError };
    }
    return { valid: true as const, parsed };
  }

  return {
    valid: false as const,
    error: createError(
      `[VALIDATION_ERROR] Invalid parameters for \"${name}\".\n${formatValidationIssues(result.error.errors.map((issue) => ({ path: issue.path, message: issue.message })))}`,
      "INVALID_PARAMS",
    ),
  };
};

export class VfsToolDispatcher {
  public has(name: string): name is VfsToolName {
    return vfsToolRegistry.has(name);
  }

  public dispatch(
    name: string,
    args: Record<string, unknown>,
    context: ToolContext,
  ): unknown | Promise<unknown> {
    if (!this.has(name)) {
      return createError(`Unknown tool: ${name}`, "UNKNOWN");
    }

    const validation = validateArgs(name, args);
    if (!validation.valid) {
      return validation.error;
    }

    const entry = vfsToolRegistry.getCatalogEntry(name);
    const handler = HANDLERS[entry.handlerKey];
    return handler(validation.parsed, context);
  }

  public async dispatchAsync(
    name: string,
    args: Record<string, unknown>,
    context: ToolContext,
  ): Promise<unknown> {
    const output = this.dispatch(name, args, context);
    return output instanceof Promise ? await output : output;
  }
}

export const vfsToolDispatcher = new VfsToolDispatcher();
