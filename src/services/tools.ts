/**
 * Thin compatibility facade over the V2 VFS tool registry.
 *
 * New code should import from `src/services/vfs/tools` directly.
 */

import { z, type ZodTypeAny } from "zod";
import type { TypedToolDefinition, ZodToolDefinition } from "./providers/types";
import { vfsToolRegistry, type VfsToolName } from "./vfs/tools";

const getTool = (
  name: VfsToolName,
  options?: { ragEnabled?: boolean },
): ZodToolDefinition => vfsToolRegistry.getDefinition(name, options);

export function defineTool<TParams extends ZodTypeAny>(
  definition: TypedToolDefinition<TParams>,
): TypedToolDefinition<TParams> {
  return definition;
}

export function validateToolArgs<TParams extends ZodTypeAny>(
  tool: TypedToolDefinition<TParams>,
  args: JsonObject,
): z.infer<TParams> {
  const result = tool.parameters.safeParse(args);
  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    throw new Error(`Invalid arguments for tool "${tool.name}": ${errors}`);
  }
  return result.data;
}

export const VFS_LS_TOOL = getTool("vfs_ls");
export const VFS_READ_CHARS_TOOL = getTool("vfs_read_chars");
export const VFS_READ_LINES_TOOL = getTool("vfs_read_lines");
export const VFS_READ_JSON_TOOL = getTool("vfs_read_json");
export const VFS_READ_MARKDOWN_TOOL = getTool("vfs_read_markdown");
export const VFS_SCHEMA_TOOL = getTool("vfs_schema");
export const VFS_SEARCH_TOOL = getTool("vfs_search");
export const VFS_SEARCH_TOOL_NO_SEMANTIC = getTool("vfs_search", {
  ragEnabled: false,
});
export const VFS_VM_TOOL = getTool("vfs_vm");
export const VFS_WRITE_FILE_TOOL = getTool("vfs_write_file");
export const VFS_APPEND_TEXT_TOOL = getTool("vfs_append_text");
export const VFS_EDIT_LINES_TOOL = getTool("vfs_edit_lines");
export const VFS_WRITE_MARKDOWN_TOOL = getTool("vfs_write_markdown");
export const VFS_PATCH_JSON_TOOL = getTool("vfs_patch_json");
export const VFS_MERGE_JSON_TOOL = getTool("vfs_merge_json");
export const VFS_MOVE_TOOL = getTool("vfs_move");
export const VFS_DELETE_TOOL = getTool("vfs_delete");
export const VFS_FINISH_TURN_TOOL = getTool("vfs_finish_turn");
export const VFS_END_TURN_TOOL = getTool("vfs_end_turn");
export const VFS_FINISH_SUMMARY_TOOL = getTool("vfs_finish_summary");
export const VFS_FINISH_OUTLINE_PHASE_0_TOOL = getTool(
  "vfs_finish_outline_phase_0",
);
export const VFS_FINISH_OUTLINE_PHASE_1_TOOL = getTool(
  "vfs_finish_outline_phase_1",
);
export const VFS_FINISH_OUTLINE_PHASE_2_TOOL = getTool(
  "vfs_finish_outline_phase_2",
);
export const VFS_FINISH_OUTLINE_PHASE_3_TOOL = getTool(
  "vfs_finish_outline_phase_3",
);
export const VFS_FINISH_OUTLINE_PHASE_4_TOOL = getTool(
  "vfs_finish_outline_phase_4",
);
export const VFS_FINISH_OUTLINE_PHASE_5_TOOL = getTool(
  "vfs_finish_outline_phase_5",
);
export const VFS_FINISH_OUTLINE_PHASE_6_TOOL = getTool(
  "vfs_finish_outline_phase_6",
);
export const VFS_FINISH_OUTLINE_PHASE_7_TOOL = getTool(
  "vfs_finish_outline_phase_7",
);
export const VFS_FINISH_OUTLINE_PHASE_8_TOOL = getTool(
  "vfs_finish_outline_phase_8",
);
export const VFS_FINISH_OUTLINE_PHASE_9_TOOL = getTool(
  "vfs_finish_outline_phase_9",
);

export const VFS_TOOLS = vfsToolRegistry.getDefinitions();
