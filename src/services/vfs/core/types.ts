export type VfsActor = "ai" | "user_editor" | "system";

export type VfsMode = "normal" | "god" | "sudo";

export type VfsPermissionClass =
  | "immutable_readonly"
  | "default_editable"
  | "elevated_editable"
  | "finish_guarded";

export type VfsScope = "shared" | "fork";

export interface VfsPathClassification {
  path: string;
  normalizedPath: string;
  permissionClass: VfsPermissionClass;
  scope: VfsScope;
  ruleId: string;
  description: string;
}

export interface VfsWriteContext {
  actor: VfsActor;
  mode: VfsMode;
  elevationToken?: string | null;
  elevationGranted?: boolean;
  editorSessionToken?: string | null;
  allowFinishGuardedWrite?: boolean;
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

export interface VfsResourceDescriptor {
  id: string;
  resourceType: string;
  description: string;
  patterns: string[];
  permissionClass?: VfsPermissionClass;
  scope?: VfsScope;
  contentTypes?: string[];
}

export interface VfsResourceMatch {
  descriptor: VfsResourceDescriptor;
  path: string;
  normalizedPath: string;
  permissionClass: VfsPermissionClass;
  scope: VfsScope;
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
