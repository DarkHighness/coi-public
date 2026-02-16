import { z } from "zod";
import type { ToolContext } from "../../tools/toolHandlerRegistry";
import { createError } from "../../tools/toolResult";
import { vfsToolRegistry } from "./registry";
import type { VfsToolHandlerKey, VfsToolName } from "./types";
import {
  handleInspectLs,
  handleInspectSchema,
  handleInspectSearch,
} from "./handlers/inspect";
import { handleFinishTurn } from "./handlers/finishTurn";
import { handleFinishSoul } from "./handlers/finishSoul";
import { handleFinishSummary } from "./handlers/finishSummary";
import { handleReadChars } from "./handlers/readChars";
import { handleReadLines } from "./handlers/readLines";
import { handleReadJson } from "./handlers/readJson";
import { handleReadMarkdown } from "./handlers/readMarkdown";
import { handleWriteFile } from "./handlers/writeFile";
import { handleAppendText } from "./handlers/appendText";
import { handleEditLines } from "./handlers/editLines";
import { handleWriteMarkdown } from "./handlers/writeMarkdown";
import { handlePatchJson } from "./handlers/patchJson";
import { handleMergeJson } from "./handlers/mergeJson";
import { handleMove } from "./handlers/move";
import { handleDelete } from "./handlers/delete";
import { handleFinishOutlinePhase0 } from "./handlers/finishOutlinePhase0";
import { handleFinishOutlinePhase1 } from "./handlers/finishOutlinePhase1";
import { handleFinishOutlinePhase2 } from "./handlers/finishOutlinePhase2";
import { handleFinishOutlinePhase3 } from "./handlers/finishOutlinePhase3";
import { handleFinishOutlinePhase4 } from "./handlers/finishOutlinePhase4";
import { handleFinishOutlinePhase5 } from "./handlers/finishOutlinePhase5";
import { handleFinishOutlinePhase6 } from "./handlers/finishOutlinePhase6";
import { handleFinishOutlinePhase7 } from "./handlers/finishOutlinePhase7";
import { handleFinishOutlinePhase8 } from "./handlers/finishOutlinePhase8";
import { handleFinishOutlinePhase9 } from "./handlers/finishOutlinePhase9";

const HANDLERS: Record<VfsToolHandlerKey, (args: Record<string, unknown>, ctx: ToolContext) => unknown | Promise<unknown>> = {
  inspect_ls: handleInspectLs,
  inspect_schema: handleInspectSchema,
  read_chars: handleReadChars,
  read_lines: handleReadLines,
  read_json: handleReadJson,
  read_markdown: handleReadMarkdown,
  inspect_search: handleInspectSearch,
  write_file: handleWriteFile,
  append_text: handleAppendText,
  edit_lines: handleEditLines,
  write_markdown: handleWriteMarkdown,
  patch_json: handlePatchJson,
  merge_json: handleMergeJson,
  move: handleMove,
  delete: handleDelete,
  finish_turn: handleFinishTurn,
  finish_soul: handleFinishSoul,
  finish_summary: handleFinishSummary,
  finish_outline_phase_0: handleFinishOutlinePhase0,
  finish_outline_phase_1: handleFinishOutlinePhase1,
  finish_outline_phase_2: handleFinishOutlinePhase2,
  finish_outline_phase_3: handleFinishOutlinePhase3,
  finish_outline_phase_4: handleFinishOutlinePhase4,
  finish_outline_phase_5: handleFinishOutlinePhase5,
  finish_outline_phase_6: handleFinishOutlinePhase6,
  finish_outline_phase_7: handleFinishOutlinePhase7,
  finish_outline_phase_8: handleFinishOutlinePhase8,
  finish_outline_phase_9: handleFinishOutlinePhase9,
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
