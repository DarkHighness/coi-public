export type VfsActor = "ai" | "user_editor" | "system";

export type VfsMode = "normal" | "god" | "sudo";

export type VfsPermissionClass =
  | "immutable_readonly"
  | "default_editable"
  | "elevated_editable"
  | "finish_guarded";

export type VfsScope = "shared" | "fork";

export type VfsDomain =
  | "system"
  | "config"
  | "narrative"
  | "story"
  | "ops"
  | "runtime";

export type VfsResourceShape =
  | "singleton_json"
  | "json_collection"
  | "append_log"
  | "turn_store"
  | "markdown_doc"
  | "text_blob";

export type VfsResourceCriticality = "core" | "secondary" | "ephemeral";

export type VfsResourceRetention = "session" | "save" | "archival";

export type VfsWriteOperation =
  | "write"
  | "json_patch"
  | "json_merge"
  | "move"
  | "delete"
  | "finish_commit"
  | "finish_summary"
  | "history_rewrite";

export type VfsMountKind = "canonical" | "alias_current";

export interface VfsResolvedPath {
  inputPath: string;
  normalizedInputPath: string;
  canonicalPath: string;
  logicalPath: string;
  displayPath: string;
  mountKind: VfsMountKind;
  activeForkId: number;
}

export interface VfsPathClassification {
  path: string;
  normalizedPath: string;
  canonicalPath: string;
  displayPath: string;
  permissionClass: VfsPermissionClass;
  scope: VfsScope;
  ruleId: string;
  templateId: string;
  description: string;
  domain: VfsDomain;
  resourceShape: VfsResourceShape;
  criticality: VfsResourceCriticality;
  retention: VfsResourceRetention;
  allowedWriteOps: VfsWriteOperation[];
  mountKind: VfsMountKind;
}

export interface VfsWriteContext {
  actor: VfsActor;
  mode: VfsMode;
  elevationToken?: string | null;
  elevationGranted?: boolean;
  editorSessionToken?: string | null;
  allowFinishGuardedWrite?: boolean;
  activeForkId?: number;
  operation?: VfsWriteOperation;
}

export interface VfsWritePolicyDecision {
  allowed: boolean;
  code:
    | "OK"
    | "IMMUTABLE_READONLY"
    | "ELEVATION_REQUIRED"
    | "FINISH_GUARD_REQUIRED"
    | "EDITOR_CONFIRM_REQUIRED";
  reason: string;
  classification: VfsPathClassification;
}

export interface VfsReadPolicyDecision {
  allowed: boolean;
  code: "OK";
  reason: string;
  classification: VfsPathClassification;
}

export interface VfsResourceTemplate {
  id: string;
  description: string;
  patterns: string[];
  domain: VfsDomain;
  shape: VfsResourceShape;
  criticality: VfsResourceCriticality;
  retention: VfsResourceRetention;
  permissionClass: VfsPermissionClass;
  allowedWriteOps: VfsWriteOperation[];
  scope: VfsScope;
  contentTypes?: string[];
  mountAliases?: string[];
}

export interface VfsResourceDescriptor {
  id: string;
  resourceType: string;
  description: string;
  patterns: string[];
  criticality?: VfsResourceCriticality;
  retention?: VfsResourceRetention;
  permissionClass?: VfsPermissionClass;
  allowedWriteOps?: VfsWriteOperation[];
  scope?: VfsScope;
  contentTypes?: string[];
}

export interface VfsResourceMatch {
  descriptor: VfsResourceDescriptor;
  template: VfsResourceTemplate;
  path: string;
  normalizedPath: string;
  canonicalPath: string;
  permissionClass: VfsPermissionClass;
  scope: VfsScope;
  domain: VfsDomain;
  shape: VfsResourceShape;
  criticality: VfsResourceCriticality;
  retention: VfsResourceRetention;
  allowedWriteOps: VfsWriteOperation[];
}

export interface VfsToolCapability {
  toolName: string;
  summary: string;
  readOnly: boolean;
  mayWriteClasses: VfsPermissionClass[];
  needsElevationFor: VfsPermissionClass[];
  immutableZones: string[];
  toolsets: Array<"turn" | "cleanup" | "summary">;
  isFinishTool?: boolean;
}

export interface VfsMount {
  id: string;
  kind: VfsMountKind;
  prefix: string;
  description: string;
}
