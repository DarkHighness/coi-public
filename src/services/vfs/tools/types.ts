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
  | "vfs_read"
  | "vfs_search"
  | "vfs_mutate"
  | "vfs_finish_turn"
  | "vfs_finish_soul"
  | "vfs_finish_summary"
  | "vfs_finish_outline";

export type VfsToolHandlerKey =
  | "inspect_ls"
  | "inspect_schema"
  | "inspect_read"
  | "inspect_search"
  | "mutate"
  | "finish_turn"
  | "finish_soul"
  | "finish_summary"
  | "finish_outline";

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
