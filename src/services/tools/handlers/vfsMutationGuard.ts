import { z } from "zod";
import { getSchemaForPath } from "../../vfs/schemas";
import { toCurrentPath } from "../../vfs/currentAlias";
import { normalizeVfsPath } from "../../vfs/utils";
import { canonicalToLogicalVfsPath } from "../../vfs/core/pathResolver";
import { vfsPathRegistry } from "../../vfs/core/pathRegistry";
import { vfsResourceRegistry } from "../../vfs/core/resourceRegistry";
import {
  formatJsonValidationSummary,
  summarizeJsonValidationError,
} from "../../vfs/jsonValidationSummary";
import type { VfsContentType, VfsFile } from "../../vfs/types";
import type { VfsSession } from "../../vfs/vfsSession";
import type { Operation } from "../../vfs/jsonPatchTypes";
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
  "current/refs/tools/vfs_mutate.md",
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
    tool: details?.tool ?? "vfs_mutate",
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

const SUPPORTED_CONTENT_TYPES: readonly VfsContentType[] = [
  "application/json",
  "application/jsonl",
  "text/plain",
  "text/markdown",
];

const CANONICAL_UNLOCK_POINTERS = new Set(["/unlocked", "/unlockReason"]);

const CANONICAL_WORLD_ENTITY_PATTERNS: RegExp[] = [
  /^world\/world_info\.json$/,
  /^world\/quests\/[^/]+\.json$/,
  /^world\/knowledge\/[^/]+\.json$/,
  /^world\/timeline\/[^/]+\.json$/,
  /^world\/locations\/[^/]+\.json$/,
  /^world\/factions\/[^/]+\.json$/,
  /^world\/causal_chains\/[^/]+\.json$/,
];

const VIEW_ENTITY_ID_PATH_PATTERN =
  /^world\/characters\/[^/]+\/views\/(quests|knowledge|timeline|locations|factions|causal_chains)\/([^/]+)\.json$/;

const inferContentTypeFromExtension = (
  normalizedPath: string,
): VfsContentType | null => {
  const lowered = normalizeVfsPath(normalizedPath).toLowerCase();
  if (lowered.endsWith(".jsonl")) return "application/jsonl";
  if (lowered.endsWith(".json")) return "application/json";
  if (lowered.endsWith(".md")) return "text/markdown";
  if (
    lowered.endsWith(".txt") ||
    lowered.endsWith(".log") ||
    lowered.endsWith(".text")
  ) {
    return "text/plain";
  }
  return null;
};

const isSupportedVfsContentType = (
  value: string,
): value is VfsContentType =>
  (SUPPORTED_CONTENT_TYPES as readonly string[]).includes(value);

const canonicalUnlockWarning = (
  normalizedPath: string,
  keys: string[],
): string =>
  `Ignored canonical unlock field(s) ${keys.join(", ")} at ${toCurrentPath(normalizedPath)}. Use actor views for world-entity unlock state.`;

const toPlainRecord = (
  value: unknown,
): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const extractViewEntityIdFromPath = (normalizedPath: string): string | null => {
  const normalized = normalizeVfsPath(normalizedPath);
  const logical = normalizeVfsPath(
    canonicalToLogicalVfsPath(normalized, { looseFork: true }) || normalized,
  );
  const match = VIEW_ENTITY_ID_PATH_PATTERN.exec(logical);
  if (!match) return null;
  return match[2] ?? null;
};

const toPatchPointer = (pointer: unknown): string | null => {
  if (typeof pointer !== "string") return null;
  const trimmed = pointer.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const pointsToCanonicalUnlockField = (pointer: string | null): boolean => {
  if (!pointer) return false;
  return CANONICAL_UNLOCK_POINTERS.has(pointer);
};

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

export const isCanonicalWorldEntityPath = (path: string): boolean => {
  const normalized = normalizeVfsPath(path);
  const logical = normalizeVfsPath(
    canonicalToLogicalVfsPath(normalized, { looseFork: true }) || normalized,
  );
  return CANONICAL_WORLD_ENTITY_PATTERNS.some((pattern) =>
    pattern.test(logical),
  );
};

export const stripCanonicalWorldEntityUnlockFields = (
  normalizedPath: string,
  value: unknown,
): {
  sanitized: unknown;
  strippedKeys: string[];
  warnings: string[];
} => {
  if (!isCanonicalWorldEntityPath(normalizedPath)) {
    return { sanitized: value, strippedKeys: [], warnings: [] };
  }

  const record = toPlainRecord(value);
  if (!record) {
    return { sanitized: value, strippedKeys: [], warnings: [] };
  }

  const strippedKeys = ["unlocked", "unlockReason"].filter((key) =>
    Object.prototype.hasOwnProperty.call(record, key),
  );
  if (strippedKeys.length === 0) {
    return { sanitized: value, strippedKeys: [], warnings: [] };
  }

  const sanitizedRecord: Record<string, unknown> = { ...record };
  delete sanitizedRecord.unlocked;
  delete sanitizedRecord.unlockReason;

  return {
    sanitized: sanitizedRecord,
    strippedKeys,
    warnings: [canonicalUnlockWarning(normalizedPath, strippedKeys)],
  };
};

export const filterCanonicalWorldEntityUnlockPatchOps = (
  normalizedPath: string,
  patchOps: Operation[],
): {
  patch: Operation[];
  warnings: string[];
} => {
  if (!isCanonicalWorldEntityPath(normalizedPath) || patchOps.length === 0) {
    return { patch: patchOps, warnings: [] };
  }

  const kept: Operation[] = [];
  let strippedCount = 0;

  for (const op of patchOps) {
    const opRecord = op as unknown as Record<string, unknown>;
    const pathPointer = toPatchPointer(opRecord.path);
    const fromPointer = toPatchPointer(opRecord.from);
    if (
      pointsToCanonicalUnlockField(pathPointer) ||
      pointsToCanonicalUnlockField(fromPointer)
    ) {
      strippedCount += 1;
      continue;
    }
    kept.push(op);
  }

  if (strippedCount === 0) {
    return { patch: patchOps, warnings: [] };
  }

  return {
    patch: kept,
    warnings: [
      `Ignored ${strippedCount} patch operation(s) targeting canonical /unlocked or /unlockReason at ${toCurrentPath(normalizedPath)}. Use actor views for world-entity unlock state.`,
    ],
  };
};

export const injectActorViewEntityIdIfMissing = (
  normalizedPath: string,
  value: unknown,
): {
  sanitized: unknown;
  injected: boolean;
} => {
  const entityId = extractViewEntityIdFromPath(normalizedPath);
  if (!entityId) {
    return { sanitized: value, injected: false };
  }

  const record = toPlainRecord(value);
  if (!record) {
    return { sanitized: value, injected: false };
  }

  if (Object.prototype.hasOwnProperty.call(record, "entityId")) {
    return { sanitized: value, injected: false };
  }

  return {
    sanitized: { ...record, entityId },
    injected: true,
  };
};

export const resolveWriteContentType = (
  session: VfsSession,
  normalizedPath: string,
  explicitContentType: VfsContentType | null | undefined,
):
  | { ok: true; contentType: VfsContentType }
  | { ok: false; error: ToolCallError } => {
  if (explicitContentType) {
    return { ok: true, contentType: explicitContentType };
  }

  const existing = session.readFile(normalizedPath);
  if (existing) {
    return { ok: true, contentType: existing.contentType };
  }

  const inferredByPath = inferContentTypeFromExtension(normalizedPath);
  if (inferredByPath) {
    return { ok: true, contentType: inferredByPath };
  }

  const templateMatch = vfsResourceRegistry.match(normalizedPath);
  const templateContentTypes = templateMatch.template.contentTypes ?? [];
  if (templateContentTypes.length === 1) {
    const [onlyType] = templateContentTypes;
    if (isSupportedVfsContentType(onlyType)) {
      return { ok: true, contentType: onlyType };
    }
  }

  return {
    ok: false,
    error: createVfsWriteGuardError(
      `Unable to infer contentType for ${toCurrentPath(normalizedPath)}. Please provide write_file.contentType explicitly.`,
      "INVALID_DATA",
      {
        issues: [
          {
            path: toCurrentPath(normalizedPath),
            code: "CONTENT_TYPE_REQUIRED",
            message:
              "Could not infer content type from existing file, extension, or unique template contentTypes.",
          },
        ],
        recovery: [
          "Set write_file.contentType explicitly when path extension/template cannot determine it.",
        ],
      },
    ),
  };
};

export const validateWritePayload = (
  normalizedPath: string,
  content: string,
  contentType: VfsContentType,
):
  | {
      ok: true;
      normalizedContent: string;
      contentType: VfsContentType;
      warnings: string[];
    }
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

    return { ok: true, normalizedContent: content, contentType, warnings: [] };
  }

  if (!isJsonPath) {
    return { ok: true, normalizedContent: content, contentType, warnings: [] };
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
  const warnings: string[] = [];
  let canonicalUnlockedSanitized = parsed;
  const canonicalUnlockStrip = stripCanonicalWorldEntityUnlockFields(
    normalizedPath,
    parsed,
  );
  if (canonicalUnlockStrip.strippedKeys.length > 0) {
    canonicalUnlockedSanitized = canonicalUnlockStrip.sanitized;
    warnings.push(...canonicalUnlockStrip.warnings);
  }

  const withInjectedEntityId = injectActorViewEntityIdIfMissing(
    normalizedPath,
    canonicalUnlockedSanitized,
  );
  const normalizedForSchema = withInjectedEntityId.sanitized;

  try {
    const strictSchema =
      schema instanceof z.ZodObject ? schema.strict() : schema;
    validated = strictSchema.parse(normalizedForSchema);
  } catch (error) {
    const compactIssues = summarizeJsonValidationError(
      error,
      normalizedForSchema,
    );
    const message =
      compactIssues && compactIssues.length > 0
        ? formatJsonValidationSummary(compactIssues)
        : error instanceof Error
          ? error.message
          : String(error);
    return {
      ok: false,
      error: createVfsWriteGuardError(
        `Schema validation failed for ${toCurrentPath(normalizedPath)}: ${message}`,
        "INVALID_DATA",
        {
          issues:
            compactIssues && compactIssues.length > 0
              ? compactIssues.map((issue) => ({
                  path:
                    issue.pointer === "/"
                      ? toCurrentPath(normalizedPath)
                      : `${toCurrentPath(normalizedPath)}${issue.pointer}`,
                  code: "SCHEMA_VALIDATION_FAILED",
                  message:
                    issue.directSubfields.length > 0
                      ? `${issue.message}; directSubfields=[${issue.directSubfields.join(", ")}]`
                      : issue.message,
                }))
              : [
                  {
                    path: toCurrentPath(normalizedPath),
                    code: "SCHEMA_VALIDATION_FAILED",
                    message,
                  },
                ],
          recovery: [
            "Align payload fields/types with schema constraints and retry.",
            `Reference current/refs/tools/vfs_mutate.md for write patterns.`,
          ],
        },
      ),
    };
  }

  if (hasUnknownKeys(normalizedForSchema, validated)) {
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
    warnings,
  };
};
