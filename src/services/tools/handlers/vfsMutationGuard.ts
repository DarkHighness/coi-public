import { z } from "zod";
import { getSchemaForPath } from "../../vfs/schemas";
import { toCurrentPath } from "../../vfs/currentAlias";
import { normalizeVfsPath } from "../../vfs/utils";
import { vfsPathRegistry } from "../../vfs/core/pathRegistry";
import type { VfsContentType, VfsFile } from "../../vfs/types";
import type { VfsSession } from "../../vfs/vfsSession";
import {
  createError,
  type ToolCallError,
  type ToolErrorDetails,
  inferErrorCategoryFromCode,
} from "../toolResult";

export type MutationOperation =
  | "overwrite"
  | "append"
  | "text_edit"
  | "text_patch"
  | "edit"
  | "merge"
  | "delete";

const VFS_WRITE_DOC_REFS = [
  "current/refs/tools/vfs_write.md",
  "current/refs/tools/README.md",
];

const uniqueStrings = (items: Array<string | undefined>): string[] => {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const item of items) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    next.push(trimmed);
  }
  return next;
};

const createVfsWriteGuardError = (
  error: string,
  code: ToolCallError["code"],
  details?: ToolErrorDetails,
): ToolCallError => {
  const refs = uniqueStrings([...(details?.refs ?? []), ...VFS_WRITE_DOC_REFS]);
  return createError(error, code, {
    category: details?.category ?? inferErrorCategoryFromCode(code),
    tool: details?.tool ?? "vfs_write",
    issues: details?.issues,
    recovery: details?.recovery,
    refs,
    batch: details?.batch,
  });
};

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

  return createVfsWriteGuardError(
    `Blocked: must read file before ${operation} in this session: ${toCurrentPath(normalized)} (use vfs_read first).`,
    "INVALID_ACTION",
    {
      category: "policy",
      issues: [
        {
          path: toCurrentPath(normalized),
          code: "READ_REQUIRED",
          message: `File must be read before ${operation}.`,
        },
      ],
      recovery: [
        `Call vfs_read on ${toCurrentPath(normalized)} before retrying ${operation}.`,
      ],
    },
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

  return createVfsWriteGuardError(
    `Hash mismatch for ${path} (expected ${expectedHash}, got ${existing.hash}). Re-read the file and retry.`,
    "INVALID_ACTION",
    {
      category: "conflict",
      issues: [
        {
          path,
          code: "HASH_MISMATCH",
          message: "Optimistic concurrency guard failed.",
          expected: expectedHash,
          received: existing.hash,
        },
      ],
      recovery: [`Re-read ${path} and retry with the latest hash.`],
    },
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
  return createVfsWriteGuardError(
    `File is not a text file: ${path}`,
    "INVALID_DATA",
    {
      category: "validation",
      issues: [
        {
          path,
          code: "INVALID_CONTENT_TYPE",
          message: `Expected text/plain or text/markdown, got ${existing.contentType}.`,
        },
      ],
      recovery: [
        "Use JSON operations for JSON files or target a text/markdown file for text edits.",
      ],
    },
  );
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
  const isJsonlPath = normalizedPath.endsWith(".jsonl");

  if (isJsonPath && contentType !== "application/json") {
    return {
      ok: false,
      error: createVfsWriteGuardError(
        `JSON path requires application/json contentType: ${toCurrentPath(normalizedPath)}`,
        "INVALID_DATA",
        {
          issues: [
            {
              path: toCurrentPath(normalizedPath),
              code: "CONTENT_TYPE_MISMATCH",
              message:
                "JSON file writes must use application/json contentType.",
              expected: "application/json",
              received: contentType,
            },
          ],
          recovery: ["Set contentType to application/json for *.json targets."],
        },
      ),
    };
  }

  if (isJsonlPath && contentType !== "application/jsonl") {
    return {
      ok: false,
      error: createVfsWriteGuardError(
        `JSONL path requires application/jsonl contentType: ${toCurrentPath(normalizedPath)}`,
        "INVALID_DATA",
        {
          issues: [
            {
              path: toCurrentPath(normalizedPath),
              code: "CONTENT_TYPE_MISMATCH",
              message:
                "JSONL file writes must use application/jsonl contentType.",
              expected: "application/jsonl",
              received: contentType,
            },
          ],
          recovery: [
            "Set contentType to application/jsonl for *.jsonl targets.",
          ],
        },
      ),
    };
  }

  if (
    !isJsonPath &&
    !isJsonlPath &&
    (contentType === "application/json" || contentType === "application/jsonl")
  ) {
    return {
      ok: false,
      error: createVfsWriteGuardError(
        `${contentType} contentType is only allowed for matching *.json or *.jsonl paths: ${toCurrentPath(normalizedPath)}`,
        "INVALID_DATA",
        {
          issues: [
            {
              path: toCurrentPath(normalizedPath),
              code: "CONTENT_TYPE_MISMATCH",
              message:
                "Only *.json can use application/json and only *.jsonl can use application/jsonl.",
              received: contentType,
            },
          ],
          recovery: [
            "Use text/plain or text/markdown for non-JSON/non-JSONL paths.",
          ],
        },
      ),
    };
  }

  if (isJsonlPath) {
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i] ?? "";
      const trimmed = raw.trim();
      if (!trimmed) {
        continue;
      }
      try {
        JSON.parse(trimmed);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          ok: false,
          error: createVfsWriteGuardError(
            `Invalid JSONL content for ${toCurrentPath(normalizedPath)} at line ${i + 1}: ${message}`,
            "INVALID_DATA",
            {
              issues: [
                {
                  path: `${toCurrentPath(normalizedPath)}:${i + 1}`,
                  code: "INVALID_JSONL_LINE",
                  message,
                },
              ],
              recovery: [
                "Ensure each non-empty line is a valid standalone JSON value.",
              ],
            },
          ),
        };
      }
    }

    return { ok: true, normalizedContent: content, contentType };
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
      error: createVfsWriteGuardError(
        `Invalid JSON content for ${toCurrentPath(normalizedPath)}: ${message}`,
        "INVALID_DATA",
        {
          issues: [
            {
              path: toCurrentPath(normalizedPath),
              code: "INVALID_JSON",
              message,
            },
          ],
          recovery: [
            "Fix JSON syntax and retry. Use vfs_schema or refs/tools docs for expected structure.",
          ],
        },
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
      error: createVfsWriteGuardError(message, "INVALID_DATA", {
        issues: [
          {
            path: toCurrentPath(normalizedPath),
            code: "SCHEMA_LOOKUP_FAILED",
            message,
          },
        ],
        recovery: [
          `Inspect path template and schema via vfs_schema({ paths: ["${toCurrentPath(normalizedPath)}"] }).`,
        ],
      }),
    };
  }

  let validated: unknown;
  try {
    const strictSchema =
      schema instanceof z.ZodObject ? schema.strict() : schema;
    validated = strictSchema.parse(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: createVfsWriteGuardError(
        `Schema validation failed for ${toCurrentPath(normalizedPath)}: ${message}`,
        "INVALID_DATA",
        {
          issues: [
            {
              path: toCurrentPath(normalizedPath),
              code: "SCHEMA_VALIDATION_FAILED",
              message,
            },
          ],
          recovery: [
            "Align payload fields/types with schema constraints and retry.",
            `Reference current/refs/tools/vfs_write.md for write patterns.`,
          ],
        },
      ),
    };
  }

  if (hasUnknownKeys(parsed, validated)) {
    return {
      ok: false,
      error: createVfsWriteGuardError(
        `Unknown keys found after validation: ${toCurrentPath(normalizedPath)}`,
        "INVALID_DATA",
        {
          issues: [
            {
              path: toCurrentPath(normalizedPath),
              code: "UNKNOWN_KEYS",
              message: "Payload includes keys outside strict schema.",
            },
          ],
          recovery: [
            "Remove unknown keys and retry with schema-approved fields only.",
          ],
        },
      ),
    };
  }

  return {
    ok: true,
    normalizedContent: JSON.stringify(validated),
    contentType: "application/json",
  };
};
