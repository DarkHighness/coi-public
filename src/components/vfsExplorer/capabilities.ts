import type { VfsWriteContext } from "../../services/vfs/core/types";
import { vfsPolicyEngine } from "../../services/vfs/core/policyEngine";
import type { VfsFileMap } from "../../services/vfs/types";
import { normalizeVfsPath } from "../../services/vfs/utils";
import {
  isReadmePath,
  isScaffoldDirectoryPath,
} from "../../services/vfs/directoryScaffolds";

export interface PathCapabilities {
  canCreateChild: boolean;
  createChildReason: string | null;
  canEdit: boolean;
  editReason: string | null;
  canRenameMove: boolean;
  renameMoveReason: string | null;
  canDelete: boolean;
  deleteReason: string | null;
}

interface CapabilityContext {
  editorSessionToken: string | null;
  activeForkId?: number;
}

const canWriteOperation = (
  path: string,
  operation: VfsWriteContext["operation"],
  context: CapabilityContext,
): { allowed: boolean; reason: string | null } => {
  const decision = vfsPolicyEngine.canWrite(path, {
    actor: "user_editor",
    mode: "normal",
    editorSessionToken: context.editorSessionToken,
    allowFinishGuardedWrite: false,
    activeForkId: context.activeForkId,
    operation,
  });

  return {
    allowed: decision.allowed,
    reason: decision.allowed ? null : decision.reason,
  };
};

const withExplicitRule = (
  base: { allowed: boolean; reason: string | null },
  override: { allowed: boolean; reason: string },
): { allowed: boolean; reason: string | null } => {
  if (override.allowed) {
    return base;
  }
  return { allowed: false, reason: override.reason };
};

export const getFilePathCapabilities = (
  path: string,
  context: CapabilityContext,
): PathCapabilities => {
  const normalized = normalizeVfsPath(path);

  const edit = canWriteOperation(normalized, "write", context);
  const createChild = canWriteOperation(normalized, "write", context);
  let move = canWriteOperation(normalized, "move", context);
  let del = canWriteOperation(normalized, "delete", context);

  if (isReadmePath(normalized)) {
    move = withExplicitRule(move, {
      allowed: false,
      reason: "README files are locked and cannot be moved or renamed.",
    });
    del = withExplicitRule(del, {
      allowed: false,
      reason: "README files are locked and cannot be deleted.",
    });
  }

  return {
    canCreateChild: createChild.allowed,
    createChildReason: createChild.reason,
    canEdit: edit.allowed,
    editReason: edit.reason,
    canRenameMove: move.allowed,
    renameMoveReason: move.reason,
    canDelete: del.allowed,
    deleteReason: del.reason,
  };
};

export const getDirectoryPathCapabilities = (
  path: string,
  snapshot: VfsFileMap,
  context: CapabilityContext,
): PathCapabilities => {
  const normalized = normalizeVfsPath(path);

  const createChild = canWriteOperation(normalized, "write", context);
  let move = canWriteOperation(normalized, "move", context);
  let del = canWriteOperation(normalized, "delete", context);

  if (isScaffoldDirectoryPath(normalized)) {
    move = withExplicitRule(move, {
      allowed: false,
      reason: "Scaffold folders are locked and cannot be renamed.",
    });
    del = withExplicitRule(del, {
      allowed: false,
      reason: "Scaffold folders are locked and cannot be deleted.",
    });
  }

  const prefix = normalized ? `${normalized}/` : "";
  const affected = Object.keys(snapshot).filter((candidate) => {
    const normalizedCandidate = normalizeVfsPath(candidate);
    if (!prefix) {
      return true;
    }
    return normalizedCandidate.startsWith(prefix);
  });

  if (move.allowed) {
    for (const candidate of affected) {
      if (isReadmePath(candidate)) {
        continue;
      }
      const candidateCaps = getFilePathCapabilities(candidate, context);
      if (!candidateCaps.canRenameMove) {
        move = {
          allowed: false,
          reason:
            candidateCaps.renameMoveReason ??
            `Cannot rename folder because child path is locked: ${candidate}`,
        };
        break;
      }
    }
  }

  if (del.allowed) {
    for (const candidate of affected) {
      if (isReadmePath(candidate)) {
        continue;
      }
      const candidateCaps = getFilePathCapabilities(candidate, context);
      if (!candidateCaps.canDelete) {
        del = {
          allowed: false,
          reason:
            candidateCaps.deleteReason ??
            `Cannot delete folder because child path is locked: ${candidate}`,
        };
        break;
      }
    }
  }

  return {
    canCreateChild: createChild.allowed,
    createChildReason: createChild.reason,
    canEdit: false,
    editReason: "Directories are not directly editable.",
    canRenameMove: move.allowed,
    renameMoveReason: move.reason,
    canDelete: del.allowed,
    deleteReason: del.reason,
  };
};

