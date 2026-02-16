import type { ZodTypeAny } from "zod";
import type {
  TypedToolDefinition,
  ZodToolDefinition,
} from "../../providers/types";
import type { VfsPermissionClass } from "../core/types";

export type VfsToolsetId =
  | "turn"
  | "playerRate"
  | "cleanup"
  | "summary"
  | "outline";

export type VfsToolName =
  | "vfs_ls"
  | "vfs_schema"
  | "vfs_read_chars"
  | "vfs_read_lines"
  | "vfs_read_json"
  | "vfs_search"
  | "vfs_write_file"
  | "vfs_append_text"
  | "vfs_edit_lines"
  | "vfs_patch_json"
  | "vfs_merge_json"
  | "vfs_move"
  | "vfs_delete"
  | "vfs_finish_turn"
  | "vfs_finish_soul"
  | "vfs_finish_summary"
  | "vfs_finish_outline_phase_0"
  | "vfs_finish_outline_phase_1"
  | "vfs_finish_outline_phase_2"
  | "vfs_finish_outline_phase_3"
  | "vfs_finish_outline_phase_4"
  | "vfs_finish_outline_phase_5"
  | "vfs_finish_outline_phase_6"
  | "vfs_finish_outline_phase_7"
  | "vfs_finish_outline_phase_8"
  | "vfs_finish_outline_phase_9";

export type VfsToolHandlerKey =
  | "inspect_ls"
  | "inspect_schema"
  | "read_chars"
  | "read_lines"
  | "read_json"
  | "inspect_search"
  | "write_file"
  | "append_text"
  | "edit_lines"
  | "patch_json"
  | "merge_json"
  | "move"
  | "delete"
  | "finish_turn"
  | "finish_soul"
  | "finish_summary"
  | "finish_outline_phase_0"
  | "finish_outline_phase_1"
  | "finish_outline_phase_2"
  | "finish_outline_phase_3"
  | "finish_outline_phase_4"
  | "finish_outline_phase_5"
  | "finish_outline_phase_6"
  | "finish_outline_phase_7"
  | "finish_outline_phase_8"
  | "finish_outline_phase_9";

export interface VfsToolCapabilityV2 {
  summary: string;
  readOnly: boolean;
  mayWriteClasses: VfsPermissionClass[];
  needsElevationFor: VfsPermissionClass[];
  immutableZones: string[];
  toolsets: VfsToolsetId[];
  isFinishTool?: boolean;
}

export interface VfsToolCatalogEntry<
  TParams extends ZodTypeAny = ZodTypeAny,
> {
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

export type VfsTypedToolDefinition<T extends ZodTypeAny> = TypedToolDefinition<T>;

export type AnyVfsToolDefinition = TypedToolDefinition<ZodTypeAny>;

export type AnyVfsCatalogEntry = VfsToolCatalogEntry<ZodTypeAny>;

export type VfsRuntimeToolDefinition = ZodToolDefinition;
