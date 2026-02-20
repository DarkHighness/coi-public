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
export const VFS_FINISH_OUTLINE_IMAGE_SEED_TOOL = getTool(
  "vfs_finish_outline_image_seed",
);
export const VFS_FINISH_OUTLINE_MASTER_PLAN_TOOL = getTool(
  "vfs_finish_outline_master_plan",
);
export const VFS_FINISH_OUTLINE_PLACEHOLDER_REGISTRY_TOOL = getTool(
  "vfs_finish_outline_placeholder_registry",
);
export const VFS_FINISH_OUTLINE_WORLD_FOUNDATION_TOOL = getTool(
  "vfs_finish_outline_world_foundation",
);
export const VFS_FINISH_OUTLINE_PLAYER_ACTOR_TOOL = getTool(
  "vfs_finish_outline_player_actor",
);
export const VFS_FINISH_OUTLINE_LOCATIONS_TOOL = getTool(
  "vfs_finish_outline_locations",
);
export const VFS_FINISH_OUTLINE_FACTIONS_TOOL = getTool(
  "vfs_finish_outline_factions",
);
export const VFS_FINISH_OUTLINE_NPCS_RELATIONSHIPS_TOOL = getTool(
  "vfs_finish_outline_npcs_relationships",
);
export const VFS_FINISH_OUTLINE_QUESTS_TOOL = getTool(
  "vfs_finish_outline_quests",
);
export const VFS_FINISH_OUTLINE_KNOWLEDGE_TOOL = getTool(
  "vfs_finish_outline_knowledge",
);
export const VFS_FINISH_OUTLINE_TIMELINE_TOOL = getTool(
  "vfs_finish_outline_timeline",
);
export const VFS_FINISH_OUTLINE_ATMOSPHERE_TOOL = getTool(
  "vfs_finish_outline_atmosphere",
);
export const VFS_FINISH_OUTLINE_OPENING_NARRATIVE_TOOL = getTool(
  "vfs_finish_outline_opening_narrative",
);

export const VFS_TOOLS = vfsToolRegistry.getDefinitions();
