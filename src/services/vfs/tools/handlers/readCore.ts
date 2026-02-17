import { createError, createSuccess } from "../../../tools/toolResult";
import {
  estimateTokensForMixedText,
  resolveVfsReadTokenBudget,
} from "../../../ai/contextUsage";
import { toCurrentPath } from "../../currentAlias";
import { normalizeVfsPath } from "../../utils";
import {
  buildNotFoundRecovery,
  createReadLimitError,
  describeJsonValueType,
  getSession,
  getToolDocRef,
  isJsonPointerResolveError,
  isPathResolveError,
  resolveCurrentPath,
  resolveJsonPointer,
  runWithStructuredErrors,
  type VfsToolHandler,
} from "./shared";

type ReadMode = "chars" | "lines" | "json";

const createReadHandler = (
  toolName: "vfs_read_chars" | "vfs_read_lines" | "vfs_read_json",
  mode: ReadMode,
): VfsToolHandler => {
  return (args, ctx) =>
    runWithStructuredErrors(toolName, args, () => {
      const session = getSession(ctx);
      const runtime = args as JsonObject;
      const inputPath = typeof runtime.path === "string" ? runtime.path : null;
      if (typeof inputPath !== "string" || inputPath.trim().length === 0) {
        return createError(
          `${toolName}: path must be a non-empty string`,
          "INVALID_DATA",
        );
      }

      const resolved = resolveCurrentPath(ctx, inputPath);
      if (isPathResolveError(resolved)) {
        return resolved.error;
      }

      const file = session.readFile(resolved.path);
      if (!file) {
        const normalizedInput = normalizeVfsPath(inputPath);
        const qualifiedPath =
          normalizedInput === "" ||
          normalizedInput === "current" ||
          normalizedInput.startsWith("current/") ||
          normalizedInput.startsWith("shared/") ||
          normalizedInput.startsWith("forks/")
            ? normalizedInput || "current"
            : `current/${normalizedInput}`;
        return createError(`File not found: ${inputPath}`, "NOT_FOUND", {
          tool: toolName,
          issues: [
            {
              path: qualifiedPath,
              code: "NOT_FOUND",
              message: "File does not exist in the VFS snapshot.",
            },
          ],
          recovery: buildNotFoundRecovery(inputPath),
          refs: [getToolDocRef(toolName)],
        });
      }
      session.noteToolSeen(resolved.path);
      session.noteToolAccessFile(resolved.path);

      const readBudgetResolution = resolveVfsReadTokenBudget(ctx.settings);
      const readTokenBudget = readBudgetResolution.tokenBudget;
      const readSafeCharsHint = readBudgetResolution.projectedSafeChars;
      const readCalibrationFactor = readBudgetResolution.calibrationFactor;
      const estimateReadTokens = (content: string): number =>
        estimateTokensForMixedText(content, {
          calibrationFactor: readCalibrationFactor,
        });

      if (mode === "json") {
        if (file.contentType !== "application/json") {
          return createError(`File is not JSON: ${inputPath}`, "INVALID_DATA");
        }

        let document: unknown;
        try {
          document = JSON.parse(file.content);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          return createError(`Invalid JSON: ${message}`, "INVALID_DATA");
        }

        const pointers = Array.isArray(runtime.pointers)
          ? runtime.pointers.filter(
              (pointer): pointer is string => typeof pointer === "string",
            )
          : [];
        if (pointers.length === 0) {
          return createError(
            `${toolName}: pointers must be provided`,
            "INVALID_DATA",
          );
        }

        const maxChars =
          typeof runtime.maxChars === "number" ? runtime.maxChars : null;
        const extracts: Array<{
          pointer: string;
          type: string;
          json: string;
          truncated: boolean;
          jsonChars: number;
        }> = [];
        const missing: Array<{ pointer: string; error: string }> = [];
        let totalJsonTokens = 0;

        for (const pointer of pointers) {
          const resolvedPointer = resolveJsonPointer(document, pointer);
          if (isJsonPointerResolveError(resolvedPointer)) {
            missing.push({ pointer, error: resolvedPointer.error });
            continue;
          }

          const valueType = describeJsonValueType(resolvedPointer.value);
          const jsonString = JSON.stringify(resolvedPointer.value);
          const fullJson = typeof jsonString === "string" ? jsonString : "null";
          const pointerTokens = estimateReadTokens(fullJson);
          if (typeof maxChars === "number" && fullJson.length > maxChars) {
            return createReadLimitError(
              mode,
              `pointer "${pointer}" yields ${fullJson.length} chars, exceeding maxChars=${maxChars}`,
              inputPath,
              {
                tokenBudget: readTokenBudget,
                estimatedTokens: pointerTokens,
                suggestedChunkChars: readSafeCharsHint,
              },
              toolName,
            );
          }
          if (pointerTokens > readTokenBudget) {
            return createReadLimitError(
              mode,
              `pointer "${pointer}" estimates ${pointerTokens} tokens, exceeding budget ${readTokenBudget}`,
              inputPath,
              {
                tokenBudget: readTokenBudget,
                estimatedTokens: pointerTokens,
                suggestedChunkChars: readSafeCharsHint,
              },
              toolName,
            );
          }
          totalJsonTokens += pointerTokens;
          if (totalJsonTokens > readTokenBudget) {
            return createReadLimitError(
              mode,
              `combined pointer payload estimates ${totalJsonTokens} tokens, exceeding budget ${readTokenBudget}`,
              inputPath,
              {
                tokenBudget: readTokenBudget,
                estimatedTokens: totalJsonTokens,
                suggestedChunkChars: readSafeCharsHint,
              },
              toolName,
            );
          }

          extracts.push({
            pointer,
            type: valueType,
            json: fullJson,
            truncated: false,
            jsonChars: fullJson.length,
          });
        }

        return createSuccess(
          {
            mode,
            path: toCurrentPath(file.path),
            contentType: file.contentType,
            extracts,
            missing,
            size: file.size,
            hash: file.hash,
            updatedAt: file.updatedAt,
          },
          "VFS JSON subpaths read",
        );
      }

      if (mode === "lines") {
        const lines = file.content.split(/\r?\n/);
        const totalLines = lines.length;
        const startLine =
          typeof runtime.startLine === "number" ? runtime.startLine : 1;

        if (startLine < 1 || startLine > Math.max(totalLines, 1)) {
          return createError(
            `${toolName}: startLine out of range (${startLine})`,
            "INVALID_DATA",
          );
        }

        let endLine: number;
        if (typeof runtime.endLine === "number") {
          endLine = runtime.endLine;
        } else if (typeof runtime.lineCount === "number") {
          endLine = startLine + runtime.lineCount - 1;
        } else {
          endLine = totalLines;
        }

        if (endLine < startLine) {
          return createError(
            `${toolName}: endLine must be >= startLine`,
            "INVALID_DATA",
          );
        }
        const requestedEndLine = endLine;
        const clampedEndLine = Math.min(endLine, totalLines);
        const warnings: string[] = [];
        if (requestedEndLine > totalLines) {
          warnings.push(
            `${toolName}: requested endLine=${requestedEndLine} exceeds max endLine=${totalLines}; clamped to ${clampedEndLine}.`,
          );
        }

        const startIndex = startLine - 1;
        const endIndexExclusive = clampedEndLine;
        const content = lines.slice(startIndex, endIndexExclusive).join("\n");
        const contentTokens = estimateReadTokens(content);
        if (contentTokens > readTokenBudget) {
          return createReadLimitError(
            mode,
            `requested line range estimates ${contentTokens} tokens, exceeding budget ${readTokenBudget}`,
            inputPath,
            {
              tokenBudget: readTokenBudget,
              estimatedTokens: contentTokens,
              suggestedChunkChars: readSafeCharsHint,
            },
            toolName,
          );
        }

        return createSuccess(
          {
            mode,
            path: toCurrentPath(file.path),
            contentType: file.contentType,
            content,
            lineStart: startLine,
            lineEnd: clampedEndLine,
            requestedLineEnd: requestedEndLine,
            totalLines,
            truncated: startLine !== 1 || clampedEndLine !== totalLines,
            ...(warnings.length > 0 ? { warnings } : {}),
            size: file.size,
            hash: file.hash,
            updatedAt: file.updatedAt,
          },
          "VFS file lines read",
        );
      }

      const startRaw = runtime.start;
      const offsetRaw = runtime.offset;
      const maxChars = runtime.maxChars;

      const start = typeof startRaw === "number" ? startRaw : 0;
      const hasOffset = typeof offsetRaw === "number";
      const hasMaxChars = typeof maxChars === "number";

      if (start > 0 && !hasOffset && !hasMaxChars) {
        return createError(
          `${toolName}: when providing start, also provide offset (preferred) or maxChars`,
          "INVALID_DATA",
        );
      }

      const length = hasOffset ? offsetRaw : hasMaxChars ? maxChars : undefined;
      const totalChars = file.content.length;
      const sliceStart = Math.min(Math.max(start, 0), totalChars);
      const requestedEndExclusive =
        typeof length === "number"
          ? sliceStart + Math.max(length, 0)
          : totalChars;
      const sliceEndExclusive =
        typeof length === "number"
          ? Math.min(requestedEndExclusive, totalChars)
          : totalChars;
      const warnings: string[] = [];
      if (requestedEndExclusive > totalChars) {
        warnings.push(
          `${toolName}: requested end=${requestedEndExclusive} exceeds max end=${totalChars}; clamped to ${sliceEndExclusive}.`,
        );
      }

      const content = file.content.slice(sliceStart, sliceEndExclusive);
      const contentTokens = estimateReadTokens(content);
      if (contentTokens > readTokenBudget) {
        return createReadLimitError(
          mode,
          `requested char range estimates ${contentTokens} tokens, exceeding budget ${readTokenBudget}`,
          inputPath,
          {
            tokenBudget: readTokenBudget,
            estimatedTokens: contentTokens,
            suggestedChunkChars: readSafeCharsHint,
          },
          toolName,
        );
      }
      const truncated = sliceStart !== 0 || sliceEndExclusive !== totalChars;

      return createSuccess(
        {
          mode,
          path: toCurrentPath(file.path),
          contentType: file.contentType,
          content,
          truncated,
          sliceStart,
          sliceEndExclusive,
          requestedEndExclusive,
          totalChars,
          ...(warnings.length > 0 ? { warnings } : {}),
          size: file.size,
          hash: file.hash,
          updatedAt: file.updatedAt,
        },
        "VFS file read",
      );
    });
};

export const handleReadChars = createReadHandler("vfs_read_chars", "chars");
export const handleReadLines = createReadHandler("vfs_read_lines", "lines");
export const handleReadJson = createReadHandler("vfs_read_json", "json");
