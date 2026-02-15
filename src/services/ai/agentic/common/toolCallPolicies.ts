import type { ToolCallResult } from "../../../providers/types";
import { normalizeVfsPath } from "../../../vfs/utils";

export const READ_ONLY_INSPECTION_TOOL_NAMES = new Set([
  "vfs_ls",
  "vfs_schema",
  "vfs_read",
  "vfs_search",
]);

export const WRITE_MUTATION_TOOL_NAMES = new Set([
  "vfs_write",
  "vfs_move",
  "vfs_delete",
]);

export const UNRECOVERABLE_WRITE_ERROR_CODES = new Set([
  "IMMUTABLE_READONLY",
  "FINISH_GUARD_REQUIRED",
  "ELEVATION_REQUIRED",
  "EDITOR_CONFIRM_REQUIRED",
]);

export const UNKNOWN_WRITE_TARGET = "(unknown-write-target)";

export const isWriteMutationToolName = (toolName: string): boolean =>
  WRITE_MUTATION_TOOL_NAMES.has(toolName);

export const isReadOnlyInspectionToolName = (toolName: string): boolean =>
  READ_ONLY_INSPECTION_TOOL_NAMES.has(toolName);

export const normalizeWriteTargetPath = (rawPath: string): string => {
  const trimmed = rawPath.trim();
  if (!trimmed) return "";
  const normalized = normalizeVfsPath(trimmed);
  if (!normalized) return "";

  if (
    normalized.startsWith("current/") ||
    normalized.startsWith("shared/") ||
    normalized.startsWith("forks/")
  ) {
    return normalized;
  }
  return `current/${normalized}`;
};

export const collectWriteTargetsFromToolCall = (
  call: ToolCallResult,
): string[] => {
  const args = (call.args || {}) as Record<string, unknown>;
  const targets = new Set<string>();

  const pushTarget = (candidate: unknown): void => {
    if (typeof candidate !== "string") return;
    const normalized = normalizeWriteTargetPath(candidate);
    if (normalized) targets.add(normalized);
  };

  if (call.name === "vfs_write") {
    const ops = (args as any)?.ops;
    if (Array.isArray(ops)) {
      for (const op of ops) {
        pushTarget((op as any)?.path);
      }
    }

    return Array.from(targets.values());
  }

  if (call.name === "vfs_move") {
    const moves = (args as any)?.moves;
    if (Array.isArray(moves)) {
      for (const move of moves) {
        pushTarget((move as any)?.from);
        pushTarget((move as any)?.to);
      }
    }
    return Array.from(targets.values());
  }

  if (call.name === "vfs_delete") {
    const paths = (args as any)?.paths;
    if (Array.isArray(paths)) {
      for (const path of paths) {
        pushTarget(path);
      }
    }
    return Array.from(targets.values());
  }

  return [];
};

export const getToolErrorCode = (output: unknown): string | null => {
  if (!output || typeof output !== "object") return null;
  const rawCode = (output as Record<string, unknown>).code;
  return typeof rawCode === "string" ? rawCode : null;
};

export const formatPendingWriteFailurePaths = (
  pending: Set<string>,
  maxItems: number = 8,
): string => {
  const items = Array.from(pending.values());
  if (items.length === 0) return "";
  return items.slice(0, maxItems).join(", ");
};

export const isLikelyNoOpReadBeforeFinishBatch = (
  functionCalls: ToolCallResult[],
  finishToolName: string,
): boolean => {
  const finishIndex = functionCalls.findIndex(
    (call) => call.name === finishToolName,
  );
  if (finishIndex <= 0) return false;

  const beforeFinish = functionCalls.slice(0, finishIndex);
  if (beforeFinish.length === 0) return false;

  const hasWriteBeforeFinish = beforeFinish.some((call) =>
    isWriteMutationToolName(call.name),
  );
  if (hasWriteBeforeFinish) return false;

  return beforeFinish.every((call) => isReadOnlyInspectionToolName(call.name));
};
