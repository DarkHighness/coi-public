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
import { handleEndTurn } from "./handlers/finishEndTurn";
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
import { createVmHandler } from "./handlers/vm";

const handleVm = createVmHandler((name, args, context) =>
  vfsToolDispatcher.dispatchAsync(name, args, context),
);

const HANDLERS: Record<
  VfsToolHandlerKey,
  (args: JsonObject, ctx: ToolContext) => unknown | Promise<unknown>
> = {
  inspect_ls: handleInspectLs,
  inspect_schema: handleInspectSchema,
  read_chars: handleReadChars,
  read_lines: handleReadLines,
  read_json: handleReadJson,
  read_markdown: handleReadMarkdown,
  inspect_search: handleInspectSearch,
  vm: handleVm,
  write_file: handleWriteFile,
  append_text: handleAppendText,
  edit_lines: handleEditLines,
  write_markdown: handleWriteMarkdown,
  patch_json: handlePatchJson,
  merge_json: handleMergeJson,
  move: handleMove,
  delete: handleDelete,
  finish_turn: handleFinishTurn,
  end_turn: handleEndTurn,
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

const isRecordObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const formatValidationIssues = (
  issues: Array<{ path: Array<string | number>; message: string }>,
): string => {
  const lines = issues.slice(0, MAX_VALIDATION_ISSUES).map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    return `- ${path}: ${issue.message}`;
  });
  if (issues.length > MAX_VALIDATION_ISSUES) {
    lines.push(
      `- ...and ${issues.length - MAX_VALIDATION_ISSUES} more issue(s)`,
    );
  }
  return lines.join("\n");
};

const extraValidation = (
  name: VfsToolName,
  parsed: JsonObject,
): null | ReturnType<typeof createError> => {
  void name;
  void parsed;
  return null;
};

const normalizeFinishTurnArgsForValidation = (args: JsonObject): JsonObject => {
  const normalized: JsonObject = { ...args };

  if ("userAction" in normalized) {
    delete normalized.userAction;
  }

  if (isRecordObject(normalized.retconAck)) {
    const nextRetconAck: JsonObject = { ...normalized.retconAck };
    if ("hash" in nextRetconAck) {
      delete nextRetconAck.hash;
    }
    if (Object.keys(nextRetconAck).length === 0) {
      delete normalized.retconAck;
    } else {
      normalized.retconAck = nextRetconAck;
    }
  }

  return normalized;
};

const normalizeArgsForValidation = (
  name: VfsToolName,
  args: JsonObject,
): JsonObject => {
  if (name === "vfs_finish_turn") {
    return normalizeFinishTurnArgsForValidation(args);
  }
  return args;
};

const validateArgs = (name: VfsToolName, args: JsonObject) => {
  const tool = vfsToolRegistry.getDefinition(name);
  const normalizedArgs = normalizeArgsForValidation(name, args);
  const strictSchema =
    tool.parameters instanceof z.ZodObject
      ? tool.parameters.strict()
      : tool.parameters;
  const result = strictSchema.safeParse(normalizedArgs);

  if (result.success) {
    const parsed = result.data as JsonObject;
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
    args: JsonObject,
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
    args: JsonObject,
    context: ToolContext,
  ): Promise<unknown> {
    const output = this.dispatch(name, args, context);
    return output instanceof Promise ? await output : output;
  }
}

export const vfsToolDispatcher = new VfsToolDispatcher();
