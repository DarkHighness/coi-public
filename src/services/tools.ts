/**
 * Thin compatibility facade over the V2 VFS tool registry.
 *
 * New code should import from `src/services/vfs/tools` directly.
 */

import { z, type ZodTypeAny } from "zod";
import type {
  TypedToolDefinition,
  ZodToolDefinition,
} from "./providers/types";
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
  args: Record<string, unknown>,
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
export const VFS_READ_TOOL = getTool("vfs_read");
export const VFS_SCHEMA_TOOL = getTool("vfs_schema");
export const VFS_SEARCH_TOOL = getTool("vfs_search");
export const VFS_SEARCH_TOOL_NO_SEMANTIC = getTool("vfs_search", {
  ragEnabled: false,
});
export const VFS_MUTATE_TOOL = getTool("vfs_mutate");
export const VFS_FINISH_TURN_TOOL = getTool("vfs_finish_turn");
export const VFS_FINISH_SOUL_TOOL = getTool("vfs_finish_soul");
export const VFS_FINISH_SUMMARY_TOOL = getTool("vfs_finish_summary");
export const VFS_FINISH_OUTLINE_TOOL = getTool("vfs_finish_outline");

export const VFS_TOOLS = vfsToolRegistry.getDefinitions();
