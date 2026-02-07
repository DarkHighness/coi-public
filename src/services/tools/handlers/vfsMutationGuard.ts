import { z } from "zod";
import { getSchemaForPath } from "../../vfs/schemas";
import { toCurrentPath } from "../../vfs/currentAlias";
import { normalizeVfsPath } from "../../vfs/utils";
import { vfsPathRegistry } from "../../vfs/core/pathRegistry";
import type { VfsContentType, VfsFile } from "../../vfs/types";
import type { VfsSession } from "../../vfs/vfsSession";
import { createError, type ToolCallError } from "../toolResult";

export type MutationOperation =
  | "overwrite"
  | "append"
  | "text_edit"
  | "text_patch"
  | "edit"
  | "merge"
  | "delete";

const isReadOnlyToolPath = (path: string): boolean => {
  const normalized = normalizeVfsPath(path);
  return vfsPathRegistry.isImmutableReadonly(normalized);
};

const hasUnknownKeys = (input: unknown, parsed: unknown): boolean => {
  if (input === null || typeof input !== "object") {
    return false;
  }

  if (Array.isArray(input)) {
    if (!Array.isArray(parsed)) {
      return true;
    }
    return input.some((item, index) => hasUnknownKeys(item, parsed[index]));
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return true;
  }

  for (const key of Object.keys(input as Record<string, unknown>)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      return true;
    }

    if (!Object.prototype.hasOwnProperty.call(parsed, key)) {
      return true;
    }

    if (
      hasUnknownKeys(
        (input as Record<string, unknown>)[key],
        (parsed as Record<string, unknown>)[key],
      )
    ) {
      return true;
    }
  }

  return false;
};

const isTextType = (contentType: VfsContentType): boolean =>
  contentType === "text/plain" || contentType === "text/markdown";

export const requireReadBeforeMutateForExistingFile = (
  session: VfsSession,
  path: string,
  operation: MutationOperation,
): ToolCallError | null => {
  const normalized = normalizeVfsPath(path);
  if (isReadOnlyToolPath(normalized)) {
    return null;
  }

  const existing = session.readFile(normalized);
  if (!existing) {
    return null;
  }

  if (session.hasToolSeenInCurrentEpoch(normalized)) {
    return null;
  }

  return createError(
    `Blocked: must read file before ${operation} in this session: ${toCurrentPath(normalized)} (use vfs_read first).`,
    "INVALID_ACTION",
  );
};

export const validateExpectedHash = (
  existing: VfsFile | null,
  expectedHash: string | null | undefined,
  path: string,
): ToolCallError | null => {
  if (!existing || !expectedHash) {
    return null;
  }

  if (existing.hash === expectedHash) {
    return null;
  }

  return createError(
    `Hash mismatch for ${path} (expected ${expectedHash}, got ${existing.hash}). Re-read the file and retry.`,
    "INVALID_ACTION",
  );
};

export const ensureTextFile = (
  existing: VfsFile | null,
  path: string,
): ToolCallError | null => {
  if (!existing) {
    return null;
  }
  if (isTextType(existing.contentType)) {
    return null;
  }
  return createError(`File is not a text file: ${path}`, "INVALID_DATA");
};

export const resolveTextContentType = (
  normalizedPath: string,
  existing: VfsFile | null,
): VfsContentType => {
  if (existing && isTextType(existing.contentType)) {
    return existing.contentType;
  }
  return normalizedPath.endsWith(".md") ? "text/markdown" : "text/plain";
};

export const validateWritePayload = (
  normalizedPath: string,
  content: string,
  contentType: VfsContentType,
):
  | { ok: true; normalizedContent: string; contentType: VfsContentType }
  | { ok: false; error: ToolCallError } => {
  const isJsonPath = normalizedPath.endsWith(".json");

  if (isJsonPath && contentType !== "application/json") {
    return {
      ok: false,
      error: createError(
        `JSON path requires application/json contentType: ${toCurrentPath(normalizedPath)}`,
        "INVALID_DATA",
      ),
    };
  }

  if (!isJsonPath && contentType === "application/json") {
    return {
      ok: false,
      error: createError(
        `application/json contentType is only allowed for *.json paths: ${toCurrentPath(normalizedPath)}`,
        "INVALID_DATA",
      ),
    };
  }

  if (!isJsonPath) {
    return { ok: true, normalizedContent: content, contentType };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: createError(
        `Invalid JSON content for ${toCurrentPath(normalizedPath)}: ${message}`,
        "INVALID_DATA",
      ),
    };
  }

  let schema;
  try {
    schema = getSchemaForPath(normalizedPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: createError(message, "INVALID_DATA"),
    };
  }

  let validated: unknown;
  try {
    const strictSchema = schema instanceof z.ZodObject ? schema.strict() : schema;
    validated = strictSchema.parse(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: createError(
        `Schema validation failed for ${toCurrentPath(normalizedPath)}: ${message}`,
        "INVALID_DATA",
      ),
    };
  }

  if (hasUnknownKeys(parsed, validated)) {
    return {
      ok: false,
      error: createError(
        `Unknown keys found after validation: ${toCurrentPath(normalizedPath)}`,
        "INVALID_DATA",
      ),
    };
  }

  return {
    ok: true,
    normalizedContent: JSON.stringify(validated),
    contentType: "application/json",
  };
};
