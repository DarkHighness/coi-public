import {
  createError,
  createSuccess,
  type ToolCallError,
} from "../../../tools/toolResult";
import type { Operation } from "../../jsonPatchTypes";
import type { VfsContentType } from "../../types";
import { normalizeVfsPath } from "../../utils";
import { toCurrentPath } from "../../currentAlias";
import { VfsWriteAccessError } from "../../vfsSession";
import {
  ensureTextFile,
  filterCanonicalWorldEntityUnlockPatchOps,
  resolveTextContentType,
  resolveWriteContentType,
  stripCanonicalWorldEntityUnlockFields,
  validateExpectedHash,
  validateWritePayload,
} from "../../../tools/handlers/vfsMutationGuard";
import {
  buildNotFoundRecovery,
  buildReadLinesRecovery,
  classifyJsonMutationError,
  enforceWorkspaceMemoryWritePolicy,
  ensureNotFinishGuardedMutation,
  ensureSeparatorNewline,
  isPathResolveError,
  requireToolSeenForExistingFile,
  resolveCurrentPath,
  runWithStructuredErrors,
  withAtomicSession,
  withToolErrorDetails,
} from "./shared";
import type { ToolContext } from "../../../tools/toolHandlerRegistry";

interface WriteFileOp {
  op: "write_file";
  path: string;
  content: string;
  contentType?: VfsContentType;
}

interface AppendTextOp {
  op: "append_text";
  path: string;
  content: string;
  expectedHash?: string;
  ensureNewline?: boolean;
  maxTotalChars?: number;
}

type LineEdit =
  | {
      kind: "insert_before";
      line: number;
      content: string;
    }
  | {
      kind: "insert_after";
      line: number;
      content: string;
    }
  | {
      kind: "replace_range";
      startLine: number;
      endLine: number;
      content: string;
    };

interface EditLinesOp {
  op: "edit_lines";
  path: string;
  edits: LineEdit[];
  createIfMissing?: boolean;
  expectedHash?: string;
  maxTotalChars?: number;
}

interface PatchJsonOp {
  op: "patch_json";
  path: string;
  patch: Operation[];
}

interface MergeJsonOp {
  op: "merge_json";
  path: string;
  content: JsonObject;
}

interface MoveOp {
  op: "move";
  from: string;
  to: string;
}

interface DeleteOp {
  op: "delete";
  path: string;
}

export type MutateOp =
  | WriteFileOp
  | AppendTextOp
  | EditLinesOp
  | PatchJsonOp
  | MergeJsonOp
  | MoveOp
  | DeleteOp;

export const executeMutateOps = (
  toolName: string,
  args: JsonObject,
  ops: MutateOp[],
  ctx: ToolContext,
) =>
  runWithStructuredErrors(
    toolName,
    args,
    () => {
      return withAtomicSession(ctx, (draft) => {
        const written: string[] = [];
        const moved: Array<{ from: string; to: string }> = [];
        const deleted: string[] = [];
        const appended: string[] = [];
        const edited: string[] = [];
        const patched: string[] = [];
        const merged: string[] = [];
        const warnings: string[] = [];
        const withBatchError = (
          error: ToolCallError,
          opIndex: number,
          operation: string,
          path?: string,
        ): ToolCallError =>
          withToolErrorDetails(error, toolName, {
            batch: {
              index: opIndex + 1,
              total: ops.length,
              operation,
              path,
            },
          });

        for (const [opIndex, op] of ops.entries()) {
          if (op.op === "write_file") {
            const resolved = resolveCurrentPath(ctx, op.path);
            if (isPathResolveError(resolved)) {
              return withBatchError(resolved.error, opIndex, op.op, op.path);
            }
            const finishGuardError = ensureNotFinishGuardedMutation(
              resolved.path,
              `${toolName}(write_file)`,
            );
            if (finishGuardError) {
              return withBatchError(finishGuardError, opIndex, op.op, op.path);
            }
            const memoryPolicyError = enforceWorkspaceMemoryWritePolicy(
              ctx,
              resolved.path,
              `${toolName}(write_file)`,
            );
            if (memoryPolicyError) {
              return withBatchError(memoryPolicyError, opIndex, op.op, op.path);
            }

            const seenError = requireToolSeenForExistingFile(
              draft,
              resolved.path,
              "overwrite",
            );
            if (seenError) {
              return withBatchError(seenError, opIndex, op.op, op.path);
            }

            const resolvedContentType = resolveWriteContentType(
              draft,
              resolved.path,
              op.contentType ?? null,
            );
            if (resolvedContentType.ok === false) {
              return withBatchError(
                resolvedContentType.error,
                opIndex,
                op.op,
                op.path,
              );
            }

            const validated = validateWritePayload(
              resolved.path,
              op.content,
              resolvedContentType.contentType,
            );
            if ("error" in validated) {
              return withBatchError(validated.error, opIndex, op.op, op.path);
            }
            warnings.push(...validated.warnings);

            draft.writeFile(
              resolved.path,
              validated.normalizedContent,
              validated.contentType,
            );
            draft.noteToolAccessFile(resolved.path);
            written.push(toCurrentPath(resolved.path));
            continue;
          }

          if (op.op === "append_text") {
            const resolved = resolveCurrentPath(ctx, op.path);
            if (isPathResolveError(resolved)) {
              return withBatchError(resolved.error, opIndex, op.op, op.path);
            }
            const finishGuardError = ensureNotFinishGuardedMutation(
              resolved.path,
              `${toolName}(append_text)`,
            );
            if (finishGuardError) {
              return withBatchError(finishGuardError, opIndex, op.op, op.path);
            }
            const memoryPolicyError = enforceWorkspaceMemoryWritePolicy(
              ctx,
              resolved.path,
              `${toolName}(append_text)`,
            );
            if (memoryPolicyError) {
              return withBatchError(memoryPolicyError, opIndex, op.op, op.path);
            }

            const existing = draft.readFile(resolved.path);
            const seenError = requireToolSeenForExistingFile(
              draft,
              resolved.path,
              "append",
            );
            if (seenError) {
              return withBatchError(seenError, opIndex, op.op, op.path);
            }

            const hashError = validateExpectedHash(
              existing,
              op.expectedHash,
              op.path,
            );
            if (hashError) {
              return withBatchError(hashError, opIndex, op.op, op.path);
            }

            const textTypeError = ensureTextFile(existing, op.path);
            if (textTypeError) {
              return withBatchError(textTypeError, opIndex, op.op, op.path);
            }

            const base = existing ? existing.content : "";
            const ensureNewline = op.ensureNewline ?? true;
            const sep =
              existing && ensureNewline
                ? ensureSeparatorNewline(base, op.content)
                : "";
            const next = `${base}${sep}${op.content}`;

            if (op.maxTotalChars && next.length > op.maxTotalChars) {
              return withBatchError(
                createError(
                  `Append would exceed maxTotalChars (${op.maxTotalChars}) for ${op.path}`,
                  "INVALID_DATA",
                ),
                opIndex,
                op.op,
                op.path,
              );
            }

            draft.writeFile(
              resolved.path,
              next,
              resolveTextContentType(resolved.path, existing),
            );
            draft.noteToolAccessFile(resolved.path);

            appended.push(toCurrentPath(resolved.path));
            continue;
          }

          if (op.op === "edit_lines") {
            const resolved = resolveCurrentPath(ctx, op.path);
            if (isPathResolveError(resolved)) {
              return withBatchError(resolved.error, opIndex, op.op, op.path);
            }
            const finishGuardError = ensureNotFinishGuardedMutation(
              resolved.path,
              `${toolName}(edit_lines)`,
            );
            if (finishGuardError) {
              return withBatchError(finishGuardError, opIndex, op.op, op.path);
            }
            const memoryPolicyError = enforceWorkspaceMemoryWritePolicy(
              ctx,
              resolved.path,
              `${toolName}(edit_lines)`,
            );
            if (memoryPolicyError) {
              return withBatchError(memoryPolicyError, opIndex, op.op, op.path);
            }

            const existing = draft.readFile(resolved.path);
            const createIfMissing = op.createIfMissing ?? true;
            if (!existing && !createIfMissing) {
              return withBatchError(
                createError(`File not found: ${op.path}`, "NOT_FOUND", {
                  recovery: buildNotFoundRecovery(op.path),
                }),
                opIndex,
                op.op,
                op.path,
              );
            }

            if (existing) {
              const seenError = requireToolSeenForExistingFile(
                draft,
                resolved.path,
                "text_edit",
              );
              if (seenError) {
                return withBatchError(seenError, opIndex, op.op, op.path);
              }
              const hashError = validateExpectedHash(
                existing,
                op.expectedHash,
                op.path,
              );
              if (hashError) {
                return withBatchError(hashError, opIndex, op.op, op.path);
              }
              const textTypeError = ensureTextFile(existing, op.path);
              if (textTypeError) {
                return withBatchError(textTypeError, opIndex, op.op, op.path);
              }
            }

            let content = existing ? existing.content : "";

            for (const edit of op.edits) {
              const lines = content.split("\n");
              if (edit.kind === "insert_before") {
                const insertIdx = edit.line - 1;
                if (insertIdx < 0 || insertIdx > lines.length) {
                  return withBatchError(
                    createError(
                      `Line out of range for insert_before: ${op.path}`,
                      "INVALID_DATA",
                      { recovery: buildReadLinesRecovery(op.path) },
                    ),
                    opIndex,
                    op.op,
                    op.path,
                  );
                }
                const insertLines = edit.content.split("\n");
                content = [
                  ...lines.slice(0, insertIdx),
                  ...insertLines,
                  ...lines.slice(insertIdx),
                ].join("\n");
                continue;
              }

              if (edit.kind === "insert_after") {
                const afterIdx = edit.line;
                if (afterIdx < 0 || afterIdx > lines.length) {
                  return withBatchError(
                    createError(
                      `Line out of range for insert_after: ${op.path}`,
                      "INVALID_DATA",
                      { recovery: buildReadLinesRecovery(op.path) },
                    ),
                    opIndex,
                    op.op,
                    op.path,
                  );
                }
                const insertLines = edit.content.split("\n");
                content = [
                  ...lines.slice(0, afterIdx),
                  ...insertLines,
                  ...lines.slice(afterIdx),
                ].join("\n");
                continue;
              }

              if (edit.kind === "replace_range") {
                if (edit.startLine > edit.endLine) {
                  return withBatchError(
                    createError(
                      `Invalid line range (startLine > endLine): ${op.path}`,
                      "INVALID_DATA",
                      { recovery: buildReadLinesRecovery(op.path) },
                    ),
                    opIndex,
                    op.op,
                    op.path,
                  );
                }
                if (edit.endLine > lines.length) {
                  return withBatchError(
                    createError(
                      `Line out of range for replace_range: ${op.path}`,
                      "INVALID_DATA",
                      { recovery: buildReadLinesRecovery(op.path) },
                    ),
                    opIndex,
                    op.op,
                    op.path,
                  );
                }
                const startIdx = edit.startLine - 1;
                const endIdxExclusive = edit.endLine;
                const replacement = edit.content.split("\n");
                content = [
                  ...lines.slice(0, startIdx),
                  ...replacement,
                  ...lines.slice(endIdxExclusive),
                ].join("\n");
              }
            }

            if (op.maxTotalChars && content.length > op.maxTotalChars) {
              return withBatchError(
                createError(
                  `Edits would exceed maxTotalChars (${op.maxTotalChars}) for ${op.path}`,
                  "INVALID_DATA",
                ),
                opIndex,
                op.op,
                op.path,
              );
            }

            draft.writeFile(
              resolved.path,
              content,
              resolveTextContentType(resolved.path, existing),
            );
            draft.noteToolAccessFile(resolved.path);
            edited.push(toCurrentPath(resolved.path));
            continue;
          }

          if (op.op === "patch_json") {
            const resolved = resolveCurrentPath(ctx, op.path);
            if (isPathResolveError(resolved)) {
              return withBatchError(resolved.error, opIndex, op.op, op.path);
            }
            const finishGuardError = ensureNotFinishGuardedMutation(
              resolved.path,
              `${toolName}(patch_json)`,
            );
            if (finishGuardError) {
              return withBatchError(finishGuardError, opIndex, op.op, op.path);
            }
            const memoryPolicyError = enforceWorkspaceMemoryWritePolicy(
              ctx,
              resolved.path,
              `${toolName}(patch_json)`,
            );
            if (memoryPolicyError) {
              return withBatchError(memoryPolicyError, opIndex, op.op, op.path);
            }

            const existing = draft.readFile(resolved.path);
            if (!existing) {
              return withBatchError(
                createError(`File not found: ${op.path}`, "NOT_FOUND", {
                  recovery: buildNotFoundRecovery(op.path),
                }),
                opIndex,
                op.op,
                op.path,
              );
            }
            const seenError = requireToolSeenForExistingFile(
              draft,
              resolved.path,
              "edit",
            );
            if (seenError) {
              return withBatchError(seenError, opIndex, op.op, op.path);
            }

            const filteredPatch = filterCanonicalWorldEntityUnlockPatchOps(
              resolved.path,
              op.patch,
            );
            warnings.push(...filteredPatch.warnings);
            if (filteredPatch.patch.length === 0) {
              continue;
            }

            try {
              draft.applyJsonPatch(resolved.path, filteredPatch.patch);
            } catch (error) {
              if (error instanceof VfsWriteAccessError) {
                return withBatchError(
                  createError(error.message, error.code),
                  opIndex,
                  op.op,
                  op.path,
                );
              }
              const normalized = classifyJsonMutationError({
                error,
                opPath: op.path,
                resolvedPath: resolved.path,
              });
              return withBatchError(
                createError(normalized.message, normalized.code, {
                  recovery: normalized.recovery,
                }),
                opIndex,
                op.op,
                op.path,
              );
            }
            draft.noteToolAccessFile(resolved.path);
            patched.push(toCurrentPath(resolved.path));
            continue;
          }

          if (op.op === "merge_json") {
            const resolved = resolveCurrentPath(ctx, op.path);
            if (isPathResolveError(resolved)) {
              return withBatchError(resolved.error, opIndex, op.op, op.path);
            }
            const finishGuardError = ensureNotFinishGuardedMutation(
              resolved.path,
              `${toolName}(merge_json)`,
            );
            if (finishGuardError) {
              return withBatchError(finishGuardError, opIndex, op.op, op.path);
            }
            const memoryPolicyError = enforceWorkspaceMemoryWritePolicy(
              ctx,
              resolved.path,
              `${toolName}(merge_json)`,
            );
            if (memoryPolicyError) {
              return withBatchError(memoryPolicyError, opIndex, op.op, op.path);
            }
            const seenError = requireToolSeenForExistingFile(
              draft,
              resolved.path,
              "merge",
            );
            if (seenError) {
              return withBatchError(seenError, opIndex, op.op, op.path);
            }

            const sanitizedMerge = stripCanonicalWorldEntityUnlockFields(
              resolved.path,
              op.content,
            );
            warnings.push(...sanitizedMerge.warnings);
            if (
              typeof sanitizedMerge.sanitized !== "object" ||
              sanitizedMerge.sanitized === null ||
              Array.isArray(sanitizedMerge.sanitized)
            ) {
              return withBatchError(
                createError(
                  "merge_json content must be a JSON object after sanitization.",
                  "INVALID_DATA",
                ),
                opIndex,
                op.op,
                op.path,
              );
            }
            const mergeContent = sanitizedMerge.sanitized as JsonObject;
            if (Object.keys(mergeContent).length === 0) {
              continue;
            }

            try {
              draft.mergeJson(resolved.path, mergeContent);
            } catch (error) {
              if (error instanceof VfsWriteAccessError) {
                return withBatchError(
                  createError(error.message, error.code),
                  opIndex,
                  op.op,
                  op.path,
                );
              }
              const normalized = classifyJsonMutationError({
                error,
                opPath: op.path,
                resolvedPath: resolved.path,
              });
              return withBatchError(
                createError(normalized.message, normalized.code, {
                  recovery: normalized.recovery,
                }),
                opIndex,
                op.op,
                op.path,
              );
            }
            draft.noteToolAccessFile(resolved.path);
            merged.push(toCurrentPath(resolved.path));
            continue;
          }

          if (op.op === "move") {
            const fromInput = op.from;
            const toInput = op.to;
            if (
              typeof fromInput !== "string" ||
              fromInput.trim() === "" ||
              typeof toInput !== "string" ||
              toInput.trim() === ""
            ) {
              return withBatchError(
                createError(
                  "Each move op must include non-empty from and to paths",
                  "INVALID_PARAMS",
                ),
                opIndex,
                op.op,
              );
            }

            const movePair = { from: fromInput, to: toInput };
            const resolvedFrom = resolveCurrentPath(ctx, movePair.from);
            if (isPathResolveError(resolvedFrom)) {
              return withBatchError(
                resolvedFrom.error,
                opIndex,
                op.op,
                movePair.from,
              );
            }
            const resolvedTo = resolveCurrentPath(ctx, movePair.to);
            if (isPathResolveError(resolvedTo)) {
              return withBatchError(
                resolvedTo.error,
                opIndex,
                op.op,
                movePair.to,
              );
            }

            const finishGuardFrom = ensureNotFinishGuardedMutation(
              resolvedFrom.path,
              `${toolName}(move)`,
            );
            if (finishGuardFrom) {
              return withBatchError(
                finishGuardFrom,
                opIndex,
                op.op,
                movePair.from,
              );
            }
            const finishGuardTo = ensureNotFinishGuardedMutation(
              resolvedTo.path,
              `${toolName}(move)`,
            );
            if (finishGuardTo) {
              return withBatchError(finishGuardTo, opIndex, op.op, movePair.to);
            }
            const memoryPolicyFrom = enforceWorkspaceMemoryWritePolicy(
              ctx,
              resolvedFrom.path,
              `${toolName}(move)`,
            );
            if (memoryPolicyFrom) {
              return withBatchError(
                memoryPolicyFrom,
                opIndex,
                op.op,
                movePair.from,
              );
            }
            const memoryPolicyTo = enforceWorkspaceMemoryWritePolicy(
              ctx,
              resolvedTo.path,
              `${toolName}(move)`,
            );
            if (memoryPolicyTo) {
              return withBatchError(memoryPolicyTo, opIndex, op.op, movePair.to);
            }

            const from = normalizeVfsPath(resolvedFrom.path);
            const to = normalizeVfsPath(resolvedTo.path);
            const seenError = requireToolSeenForExistingFile(
              draft,
              to,
              "overwrite",
            );
            if (seenError) {
              return withBatchError(seenError, opIndex, op.op, movePair.to);
            }

            try {
              draft.renameFile(from, to);
            } catch (error) {
              if (error instanceof VfsWriteAccessError) {
                return withBatchError(
                  createError(error.message, error.code),
                  opIndex,
                  op.op,
                  `${movePair.from} -> ${movePair.to}`,
                );
              }
              const message =
                error instanceof Error ? error.message : String(error);
              return withBatchError(
                createError(message, "NOT_FOUND", {
                  recovery: buildNotFoundRecovery(movePair.from),
                }),
                opIndex,
                op.op,
                `${movePair.from} -> ${movePair.to}`,
              );
            }

            draft.renameToolSeenPath(from, to);
            draft.noteToolAccessFile(from);
            draft.noteToolAccessFile(to);
            moved.push({ from: toCurrentPath(from), to: toCurrentPath(to) });
            continue;
          }

          if (op.op === "delete") {
            const targetPath = op.path;
            const resolved = resolveCurrentPath(ctx, targetPath);
            if (isPathResolveError(resolved)) {
              return withBatchError(resolved.error, opIndex, op.op, targetPath);
            }

            const finishGuard = ensureNotFinishGuardedMutation(
              resolved.path,
              `${toolName}(delete)`,
            );
            if (finishGuard) {
              return withBatchError(finishGuard, opIndex, op.op, targetPath);
            }
            const memoryPolicyError = enforceWorkspaceMemoryWritePolicy(
              ctx,
              resolved.path,
              `${toolName}(delete)`,
            );
            if (memoryPolicyError) {
              return withBatchError(
                memoryPolicyError,
                opIndex,
                op.op,
                targetPath,
              );
            }

            const normalized = normalizeVfsPath(resolved.path);
            const seenError = requireToolSeenForExistingFile(
              draft,
              normalized,
              "delete",
            );
            if (seenError) {
              return withBatchError(seenError, opIndex, op.op, targetPath);
            }

            try {
              draft.deleteFile(normalized);
            } catch (error) {
              if (error instanceof VfsWriteAccessError) {
                return withBatchError(
                  createError(error.message, error.code),
                  opIndex,
                  op.op,
                  targetPath,
                );
              }
              const message =
                error instanceof Error ? error.message : String(error);
              return withBatchError(
                createError(message, "NOT_FOUND", {
                  recovery: buildNotFoundRecovery(targetPath),
                }),
                opIndex,
                op.op,
                targetPath,
              );
            }

            draft.noteToolAccessFile(normalized);
            draft.forgetToolSeenPath(normalized);
            deleted.push(toCurrentPath(normalized));
            continue;
          }

          const unsupported: never = op;
          return withBatchError(
            createError(
              `Unsupported mutate operation: ${String((unsupported as { op?: unknown }).op ?? "unknown")}`,
              "INVALID_PARAMS",
            ),
            opIndex,
            String((unsupported as { op?: unknown }).op ?? "unknown"),
          );
        }

        const uniqueWarnings = Array.from(new Set(warnings));
        return createSuccess(
          {
            written,
            moved,
            deleted,
            appended,
            edited,
            patched,
            merged,
            ...(uniqueWarnings.length > 0 ? { warnings: uniqueWarnings } : {}),
          },
          "VFS mutations applied",
        );
      });
    },
    {
      batchFromArgs: () => (ops.length > 0 ? { total: ops.length } : undefined),
    },
  );
