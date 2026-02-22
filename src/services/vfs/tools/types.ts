import type { ZodTypeAny } from "zod";
import type {
  TypedToolDefinition,
  ZodToolDefinition,
} from "../../providers/types";
import type { VfsPermissionClass } from "../core/types";
import type { OutlinePhaseId } from "../../../types";

export type VfsToolsetId =
  | "turn"
  | "playerRate"
  | "cleanup"
  | "summary"
  | "outline";

export type OutlineFinishToolName = `vfs_finish_outline_${OutlinePhaseId}`;
export type OutlineFinishHandlerKey = `finish_outline_${OutlinePhaseId}`;

export type VfsToolName =
  | "vfs_ls"
  | "vfs_schema"
  | "vfs_read_chars"
  | "vfs_read_lines"
  | "vfs_read_json"
  | "vfs_read_markdown"
  | "vfs_search"
  | "vfs_vm"
  | "vfs_write_file"
  | "vfs_append_text"
  | "vfs_edit_lines"
  | "vfs_write_markdown"
  | "vfs_patch_json"
  | "vfs_merge_json"
  | "vfs_move"
  | "vfs_delete"
  | "vfs_finish_turn"
  | "vfs_end_turn"
  | "vfs_finish_summary"
  | OutlineFinishToolName;

export type VfsToolHandlerKey =
  | "inspect_ls"
  | "inspect_schema"
  | "read_chars"
  | "read_lines"
  | "read_json"
  | "read_markdown"
  | "inspect_search"
  | "vm"
  | "write_file"
  | "append_text"
  | "edit_lines"
  | "write_markdown"
  | "patch_json"
  | "merge_json"
  | "move"
  | "delete"
  | "finish_turn"
  | "end_turn"
  | "finish_summary"
  | OutlineFinishHandlerKey;

export interface VfsToolCapabilityV2 {
  summary: string;
  experimental?: boolean;
  readOnly: boolean;
  mayWriteClasses: VfsPermissionClass[];
  needsElevationFor: VfsPermissionClass[];
  immutableZones: string[];
  toolsets: VfsToolsetId[];
  isFinishTool?: boolean;
}

export interface VfsToolCatalogEntry<TParams extends ZodTypeAny = ZodTypeAny> {
  name: VfsToolName;
  description: string;
  parameters: TParams;
  handlerKey: VfsToolHandlerKey;
  capability: VfsToolCapabilityV2;
  toolsetOrder: Record<VfsToolsetId, number | null>;
}

export interface VfsToolset {
  tools: VfsToolName[];
  finishToolName: VfsToolName;
}

export type VfsTypedToolDefinition<T extends ZodTypeAny> =
  TypedToolDefinition<T>;

export type AnyVfsToolDefinition = TypedToolDefinition<ZodTypeAny>;

export type AnyVfsCatalogEntry = VfsToolCatalogEntry<ZodTypeAny>;

export type VfsRuntimeToolDefinition = ZodToolDefinition;
