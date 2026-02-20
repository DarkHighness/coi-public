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
import {
  handleFinishOutlineAtmosphere,
  handleFinishOutlineFactions,
  handleFinishOutlineImageSeed,
  handleFinishOutlineKnowledge,
  handleFinishOutlineLocations,
  handleFinishOutlineMasterPlan,
  handleFinishOutlineNpcsRelationships,
  handleFinishOutlineOpeningNarrative,
  handleFinishOutlinePlaceholderRegistry,
  handleFinishOutlinePlayerActor,
  handleFinishOutlineQuests,
  handleFinishOutlineTimeline,
  handleFinishOutlineWorldFoundation,
} from "./handlers/finishOutlineHandlers";
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
  finish_outline_image_seed: handleFinishOutlineImageSeed,
  finish_outline_master_plan: handleFinishOutlineMasterPlan,
  finish_outline_placeholder_registry: handleFinishOutlinePlaceholderRegistry,
  finish_outline_world_foundation: handleFinishOutlineWorldFoundation,
  finish_outline_player_actor: handleFinishOutlinePlayerActor,
  finish_outline_locations: handleFinishOutlineLocations,
  finish_outline_factions: handleFinishOutlineFactions,
  finish_outline_npcs_relationships: handleFinishOutlineNpcsRelationships,
  finish_outline_quests: handleFinishOutlineQuests,
  finish_outline_knowledge: handleFinishOutlineKnowledge,
  finish_outline_timeline: handleFinishOutlineTimeline,
  finish_outline_atmosphere: handleFinishOutlineAtmosphere,
  finish_outline_opening_narrative: handleFinishOutlineOpeningNarrative,
};

const MAX_VALIDATION_ISSUES = 8;

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

const normalizeArgsForValidation = (
  _name: VfsToolName,
  args: JsonObject,
): JsonObject => args;

type RuntimeArgsInjector = (
  parsed: JsonObject,
  context: ToolContext,
) => JsonObject;

const injectFinishSummaryRuntimeArgs: RuntimeArgsInjector = (
  parsed,
  context,
) => {
  const nodeRange = context.vfsSummaryNodeRange;
  if (
    !nodeRange ||
    typeof nodeRange.fromIndex !== "number" ||
    !Number.isFinite(nodeRange.fromIndex) ||
    typeof nodeRange.toIndex !== "number" ||
    !Number.isFinite(nodeRange.toIndex)
  ) {
    return parsed;
  }

  const fromIndex = Math.floor(nodeRange.fromIndex);
  const toIndex = Math.floor(nodeRange.toIndex);

  return {
    ...parsed,
    nodeRange: {
      fromIndex,
      toIndex,
    },
    lastSummarizedIndex: toIndex + 1,
  };
};

const RUNTIME_ARGS_INJECTORS: Partial<
  Record<VfsToolName, RuntimeArgsInjector>
> = {
  vfs_finish_summary: injectFinishSummaryRuntimeArgs,
};

const applyRuntimeArgsAfterValidation = (
  name: VfsToolName,
  parsed: JsonObject,
  context: ToolContext,
): JsonObject => {
  const injector = RUNTIME_ARGS_INJECTORS[name];
  return injector ? injector(parsed, context) : parsed;
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

    const dispatchArgs = applyRuntimeArgsAfterValidation(
      name,
      validation.parsed,
      context,
    );
    const entry = vfsToolRegistry.getCatalogEntry(name);
    const handler = HANDLERS[entry.handlerKey];
    return handler(dispatchArgs, context);
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
