import Fuse from "fuse.js";
import {
  createError,
  inferErrorCategoryFromCode,
  mergeToolErrorDetails,
  type ToolCallError,
  type ToolCallResult,
  type ToolErrorBatch,
  type ToolErrorDetails,
} from "../../../tools/toolResult";
import { type VfsContentType, type VfsFileMap } from "../../types";
import { normalizeVfsPath } from "../../utils";
import { VfsSession, VfsWriteAccessError } from "../../vfsSession";
import { stripCurrentPath, toCurrentPath } from "../../currentAlias";
import {
  buildTurnId,
  readConversationIndex,
  readTurnFile,
  writeConversationIndex,
  writeTurnFile,
  type ConversationIndex,
} from "../../conversation";
import { getRAGService } from "../../../rag";
import { requireReadBeforeMutateForExistingFile } from "../../../tools/handlers/vfsMutationGuard";
import { vfsPathRegistry } from "../../core/pathRegistry";
import { type ToolContext } from "../../../tools/toolHandlerRegistry";
import type { VfsWriteContext } from "../../core/types";
import {
  outlinePhase0Schema,
  outlinePhase1Schema,
  outlinePhase2Schema,
  outlinePhase3Schema,
  outlinePhase4Schema,
  outlinePhase5Schema,
  outlinePhase6Schema,
  outlinePhase7Schema,
  outlinePhase8Schema,
  outlinePhase9Schema,
} from "../../../schemas";

export interface VfsMatch {
  path: string;
  line: number;
  text: string;
}

interface FuseMatch extends VfsMatch {
  scopePath: string;
}

type JsonPointerResolveResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

export type VfsToolHandler = (
  args: Record<string, unknown>,
  ctx: ToolContext,
) => unknown | Promise<unknown>;

const TOOL_DOCS_README_REF = "current/refs/tools/README.md";
const TOOL_SCHEMA_DOCS_README_REF = "current/refs/tool-schemas/README.md";
const TOOL_SCHEMA_DOCS_INDEX_REF = "current/refs/tool-schemas/index.json";
const TURN_ID_PATTERN = /^conversation\/turns\/fork-(\d+)\/turn-(\d+)\.json$/;

export const VFS_READ_HARD_TOKEN_BUDGET = 320;

export const OUTLINE_PHASE_SCHEMAS = [
  outlinePhase0Schema,
  outlinePhase1Schema,
  outlinePhase2Schema,
  outlinePhase3Schema,
  outlinePhase4Schema,
  outlinePhase5Schema,
  outlinePhase6Schema,
  outlinePhase7Schema,
  outlinePhase8Schema,
  outlinePhase9Schema,
] as const;

export const normalizeToolDocName = (toolName: string): string =>
  toolName.includes("(") ? toolName.slice(0, toolName.indexOf("(")) : toolName;

export const getToolDocRef = (toolName: string): string =>
  `current/refs/tools/${normalizeToolDocName(toolName)}/README.md`;

export const getToolExamplesRef = (toolName: string): string =>
  `current/refs/tools/${normalizeToolDocName(toolName)}/EXAMPLES.md`;

export const getToolSchemaRef = (toolName: string): string =>
  `current/refs/tool-schemas/${normalizeToolDocName(toolName)}/README.md`;

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

const buildToolDocRecoveryReadCall = (toolDocRef: string): string =>
  `vfs_read_chars({ path: "${toolDocRef}" })`;

const SOUL_TOOL_LEARNING_RECOVERY =
  'After recovery succeeds, append one concise "[code] cause -> fix" bullet under `## Tool Usage Hints` in `current/world/soul.md` (AI self-note) via one writable tool (`vfs_write_file`/`vfs_append_text`/`vfs_edit_lines`/`vfs_write_markdown`/`vfs_patch_json`/`vfs_merge_json`) or `vfs_finish_soul` in `[Player Rate]`.';

const withSoulToolLearningRecovery = (steps: string[]): string[] => {
  const exists = steps.includes(SOUL_TOOL_LEARNING_RECOVERY);
  return exists ? steps : [...steps, SOUL_TOOL_LEARNING_RECOVERY];
};

const defaultRecoveryByCode = (
  code: ToolCallError["code"],
  toolName: string,
): string[] => {
  const toolDocRef = getToolDocRef(toolName);
  const toolExamplesRef = getToolExamplesRef(toolName);
  const toolSchemaRef = getToolSchemaRef(toolName);

  if (code === "INVALID_DATA" || code === "INVALID_PARAMS") {
    return withSoulToolLearningRecovery([
      `Use ${buildToolDocRecoveryReadCall(toolDocRef)} for tool overview, ${buildToolDocRecoveryReadCall(toolExamplesRef)} for examples, and ${buildToolDocRecoveryReadCall(toolSchemaRef)} for schema summary. Then retry with schema-valid arguments.`,
      `If schema summary points to PART files, read only the needed part from current/refs/tool-schemas/{toolName}/PART-xx.md.`,
      "If you're writing/merging JSON, use vfs_schema on the target path(s) to confirm allowed fields/types before retrying.",
      "If you're modifying an existing file, read it first (read-before-mutate), then retry.",
    ]);
  }
  if (code === "INVALID_ACTION") {
    return withSoulToolLearningRecovery([
      `Use ${buildToolDocRecoveryReadCall(toolDocRef)} to confirm tool preconditions, then retry.`,
      "If the error mentions read-before-mutate, read the target file in this epoch and retry the same operation.",
      "If the error mentions finish ordering, ensure the commit tool is the last call and there is only one finish.",
    ]);
  }
  if (code === "IMMUTABLE_READONLY") {
    return withSoulToolLearningRecovery([
      "Target path is immutable read-only (common: skills/refs or unregistered paths). Choose a writable path and retry.",
      `Use ${buildToolDocRecoveryReadCall(toolDocRef)} for constraints/examples.`,
    ]);
  }
  if (code === "ELEVATION_REQUIRED") {
    return withSoulToolLearningRecovery([
      "Write requires elevation. Do not brute-force retries; use the designated elevation flow or report the blocker.",
      `Use ${buildToolDocRecoveryReadCall(toolDocRef)} for constraints/examples.`,
    ]);
  }
  if (code === "FINISH_GUARD_REQUIRED") {
    return withSoulToolLearningRecovery([
      "Conversation/summary paths are finish-guarded: use vfs_finish_turn or vfs_finish_summary (not generic write tools).",
      `Use ${buildToolDocRecoveryReadCall(toolDocRef)} for the correct commit schema/examples.`,
    ]);
  }
  if (code === "EDITOR_CONFIRM_REQUIRED") {
    return withSoulToolLearningRecovery([
      "Write requires editor confirmation. Stop and report blocker instead of retrying.",
    ]);
  }
  if (code === "NOT_FOUND") {
    return withSoulToolLearningRecovery([
      "Confirm the parent directory with vfs_ls (or use vfs_search with fuzzy=true if unsure), then retry with the corrected path.",
      "If the missing path is a JSON resource, vfs_schema can still describe expected fields/template even before the file exists.",
    ]);
  }
  if (code === "RAG_DISABLED") {
    return withSoulToolLearningRecovery([
      "Retry with semantic=false (or omit semantic), or enable the embedding runtime before retrying.",
    ]);
  }
  return withSoulToolLearningRecovery([
    `Use ${buildToolDocRecoveryReadCall(toolDocRef)}, then retry.`,
  ]);
};

const qualifyPathForRecovery = (
  inputPath: string,
): { qualifiedPath: string; parentDir: string; fileName: string } => {
  const normalizedInput = normalizeVfsPath(inputPath);
  const qualifiedPath =
    normalizedInput === "" ||
    normalizedInput === "current" ||
    normalizedInput.startsWith("current/") ||
    normalizedInput.startsWith("shared/") ||
    normalizedInput.startsWith("forks/")
      ? normalizedInput || "current"
      : `current/${normalizedInput}`;
  const qualifiedWithoutTrailingSlash = qualifiedPath.replace(/\/$/, "");
  const lastSlash = qualifiedWithoutTrailingSlash.lastIndexOf("/");
  const parentDir =
    lastSlash > 0
      ? qualifiedWithoutTrailingSlash.slice(0, lastSlash)
      : "current";
  const fileName =
    lastSlash >= 0
      ? qualifiedWithoutTrailingSlash.slice(lastSlash + 1)
      : qualifiedWithoutTrailingSlash;

  return { qualifiedPath, parentDir, fileName };
};

export const buildNotFoundRecovery = (inputPath: string): string[] => {
  const { qualifiedPath, parentDir, fileName } =
    qualifyPathForRecovery(inputPath);
  return withSoulToolLearningRecovery([
    `Try: vfs_ls({ path: "${parentDir}" })`,
    `Then: vfs_search({ path: "${parentDir}", query: "${fileName}", fuzzy: true })`,
    `If you need expected JSON fields: vfs_schema({ paths: ["${qualifiedPath}"] })`,
  ]);
};

export const buildReadLinesRecovery = (inputPath: string): string[] => {
  const { qualifiedPath } = qualifyPathForRecovery(inputPath);
  return withSoulToolLearningRecovery([
    `Try: vfs_read_lines({ path: "${qualifiedPath}", startLine: 1, lineCount: 200 })`,
    "Then adjust line numbers/ranges and retry.",
  ]);
};

const buildSchemaAndReadRecovery = (inputPath: string): string[] => {
  const { qualifiedPath } = qualifyPathForRecovery(inputPath);
  return withSoulToolLearningRecovery([
    `Try: vfs_schema({ paths: ["${qualifiedPath}"] })`,
    `Then: vfs_read_chars({ path: "${qualifiedPath}", start: 0, offset: 2000 }) to inspect current content before retrying.`,
  ]);
};

const rewriteResolvedPathInMessage = (
  message: string,
  resolvedPath: string,
): string => {
  const aliasPath = toCurrentPath(resolvedPath);
  return message.split(resolvedPath).join(aliasPath);
};

export const classifyJsonMutationError = (params: {
  error: unknown;
  opPath: string;
  resolvedPath: string;
}): {
  code: "NOT_FOUND" | "INVALID_DATA";
  message: string;
  recovery: string[];
} => {
  const rawMessage =
    params.error instanceof Error ? params.error.message : String(params.error);
  const isNotFound = rawMessage.startsWith("File not found:");
  const isSchemaValidationError = rawMessage.startsWith(
    "Schema validation failed for",
  );
  const message = rewriteResolvedPathInMessage(rawMessage, params.resolvedPath);

  if (isNotFound) {
    return {
      code: "NOT_FOUND",
      message,
      recovery: buildNotFoundRecovery(params.opPath),
    };
  }

  return {
    code: "INVALID_DATA",
    message,
    recovery: isSchemaValidationError
      ? buildSchemaAndReadRecovery(params.opPath)
      : buildReadLinesRecovery(params.opPath),
  };
};

export const asRecord = (value: unknown): Record<string, unknown> =>
  (value && typeof value === "object" ? value : {}) as Record<string, unknown>;

export const isToolCallErrorResult = (value: unknown): value is ToolCallError => {
  const record = asRecord(value);
  return (
    record.success === false &&
    typeof record.error === "string" &&
    typeof record.code === "string"
  );
};

export const withToolErrorDetails = (
  error: ToolCallError,
  toolName: string,
  details?: ToolErrorDetails,
): ToolCallError => {
  const normalizedTool = normalizeToolDocName(toolName);
  const refs = uniqueStrings([
    ...(details?.refs ?? []),
    getToolDocRef(normalizedTool),
    TOOL_DOCS_README_REF,
  ]);

  const hasExistingRecovery =
    Array.isArray(error.details?.recovery) && error.details.recovery.length > 0;
  const effectiveRecovery =
    details?.recovery ??
    (hasExistingRecovery
      ? undefined
      : defaultRecoveryByCode(error.code, normalizedTool));

  return mergeToolErrorDetails(error, {
    category: details?.category ?? inferErrorCategoryFromCode(error.code),
    tool: details?.tool ?? normalizedTool,
    issues: details?.issues,
    recovery: effectiveRecovery,
    refs,
    batch: details?.batch,
  });
};

export const runWithStructuredErrors = (
  toolName: string,
  args: Record<string, unknown>,
  runner: () => unknown | Promise<unknown>,
  options?: {
    batchFromArgs?: (
      args: Record<string, unknown>,
    ) => ToolErrorBatch | undefined;
  },
): unknown | Promise<unknown> => {
  const finalize = (result: unknown): unknown => {
    if (!isToolCallErrorResult(result)) {
      return result;
    }
    const fallbackBatch =
      options?.batchFromArgs && !result.details?.batch
        ? options.batchFromArgs(args)
        : undefined;
    return withToolErrorDetails(result, toolName, {
      ...(fallbackBatch ? { batch: fallbackBatch } : {}),
    });
  };

  const toUnknownError = (error: unknown): ToolCallError => {
    const message = error instanceof Error ? error.message : String(error);
    const fallbackBatch = options?.batchFromArgs?.(args);
    return withToolErrorDetails(
      createError(message, "UNKNOWN"),
      toolName,
      fallbackBatch ? { batch: fallbackBatch } : undefined,
    );
  };

  try {
    const output = runner();
    if (output instanceof Promise) {
      return output.then((value) => finalize(value)).catch(toUnknownError);
    }
    return finalize(output);
  } catch (error) {
    return toUnknownError(error);
  }
};

const cloneSession = (session: VfsSession): VfsSession => {
  const clone = new VfsSession();
  clone.restore(session.snapshot());
  clone.restoreReadFenceState(session.snapshotReadFenceState());
  return clone;
};

const commitSession = (target: VfsSession, source: VfsSession): void => {
  target.restore(source.snapshot());
  target.restoreReadFenceState(source.snapshotReadFenceState());
};

export const getSession = (ctx: ToolContext): VfsSession => ctx.vfsSession;

export const resolveAiWriteContext = (
  ctx: ToolContext,
  overrides: Partial<VfsWriteContext> = {},
): VfsWriteContext => ({
  actor: ctx.vfsActor ?? "ai",
  mode: ctx.vfsMode ?? "normal",
  elevationToken: ctx.vfsElevationToken ?? null,
  elevationIntent: ctx.vfsElevationIntent,
  elevationScopeTemplateIds: ctx.vfsElevationScopeTemplateIds,
  allowFinishGuardedWrite: false,
  activeForkId:
    typeof ctx.gameState?.forkId === "number"
      ? ctx.gameState.forkId
      : ctx.vfsSession.getActiveForkId(),
  ...overrides,
});

export const requireToolSeenForExistingFile = (
  session: VfsSession,
  path: string,
  operation: "overwrite" | "append" | "text_edit" | "edit" | "merge" | "delete",
): ToolCallError | null => {
  return requireReadBeforeMutateForExistingFile(session, path, operation);
};

export const ensureNotFinishGuardedMutation = (
  path: string,
  toolName: string,
): ToolCallError | null => {
  const normalized = normalizeVfsPath(path);
  const classification = vfsPathRegistry.classify(normalized);
  if (classification.permissionClass !== "finish_guarded") {
    return null;
  }

  return withToolErrorDetails(
    createError(
      `${toolName}: ${toCurrentPath(normalized)} is finish-guarded. Use commit tools to mutate conversation/summary state.`,
      "FINISH_GUARD_REQUIRED",
      {
        category: "permission",
        issues: [
          {
            path: toCurrentPath(normalized),
            code: "FINISH_GUARDED",
            message:
              "Target path can only be mutated through finish/commit tools.",
          },
        ],
      },
    ),
    normalizeToolDocName(toolName),
    {
      recovery: [
        "Use vfs_finish_turn or vfs_finish_summary for finish-guarded conversation/summary files.",
      ],
    },
  );
};

export const createReadLimitError = (
  mode: "chars" | "lines" | "json" | "markdown",
  details: string,
  inputPath?: string,
  limits?: {
    tokenBudget?: number;
    estimatedTokens?: number;
    suggestedChunkChars?: number;
  },
  toolName?:
    | "vfs_read_chars"
    | "vfs_read_lines"
    | "vfs_read_json"
    | "vfs_read_markdown",
): ToolCallResult<never> =>
  (() => {
    const resolvedToolName =
      toolName ??
      (mode === "json"
        ? "vfs_read_json"
        : mode === "lines"
          ? "vfs_read_lines"
          : mode === "markdown"
            ? "vfs_read_markdown"
            : "vfs_read_chars");
    const normalizedTokenBudget = Number.isFinite(limits?.tokenBudget)
      ? Math.max(1, Math.floor(limits?.tokenBudget ?? 0))
      : VFS_READ_HARD_TOKEN_BUDGET;
    const normalizedEstimatedTokens = Number.isFinite(limits?.estimatedTokens)
      ? Math.max(0, Math.floor(limits?.estimatedTokens ?? 0))
      : null;
    const suggestedChunkChars = Number.isFinite(limits?.suggestedChunkChars)
      ? Math.max(1, Math.floor(limits?.suggestedChunkChars ?? 1))
      : Math.min(2000, normalizedTokenBudget * 2);
    const qualifiedPath =
      typeof inputPath === "string" && inputPath.trim().length > 0
        ? qualifyPathForRecovery(inputPath).qualifiedPath
        : "current";
    const linesWindowCall = `vfs_read_lines({ path: "${qualifiedPath}", startLine: 1, lineCount: 200 })`;
    const charsWindowCall = `vfs_read_chars({ path: "${qualifiedPath}", start: 0, offset: ${suggestedChunkChars} })`;
    const recovery = [
      "Read payload exceeded budget. Use details.hint.nextCalls for bounded retry.",
    ];
    const nextCalls = [linesWindowCall, charsWindowCall];
    if (mode === "json") {
      nextCalls.push(
        `vfs_read_json({ path: "${qualifiedPath}", pointers: ["/..."], maxChars: ${suggestedChunkChars} })`,
      );
    } else if (mode === "markdown") {
      nextCalls.unshift(
        `vfs_read_markdown({ path: "${qualifiedPath}", indices: ["1"] })`,
      );
    }

    const budgetText =
      normalizedEstimatedTokens !== null
        ? `Token budget is ${normalizedTokenBudget} (estimated payload ${normalizedEstimatedTokens}).`
        : `Token budget is ${normalizedTokenBudget}.`;

    const followupGuidance =
      mode === "json"
        ? "Use bounded line/char windows or narrower JSON pointers."
        : mode === "markdown"
          ? "Use markdown section selectors (`indices`/`headings`) or narrower windows."
          : "Use bounded line/char windows.";

    return createError(
      `${resolvedToolName}: ${details}. ${budgetText} ${followupGuidance}`,
      "INVALID_DATA",
      {
        category: "validation",
        tool: resolvedToolName,
        issues: [
          {
            path: mode,
            code: "READ_LIMIT_EXCEEDED",
            message: details,
            expected: `<= ${normalizedTokenBudget} tokens`,
            ...(normalizedEstimatedTokens !== null
              ? { received: `${normalizedEstimatedTokens} tokens (estimated)` }
              : {}),
          },
        ],
        recovery,
        hint: {
          code: "READ_LIMIT_HINT",
          summary:
            mode === "markdown"
              ? "Do not retry broad markdown reads. Switch to section selectors (`indices`/`headings`) or bounded lines/chars windows."
              : "Do not retry path-only broad reads. Switch to bounded lines/chars windows (or narrowed JSON pointers).",
          avoid: `${resolvedToolName}({ path: "${qualifiedPath}" })`,
          nextCalls,
          metadata: {
            mode,
            path: qualifiedPath,
            tokenBudget: normalizedTokenBudget,
            ...(normalizedEstimatedTokens !== null
              ? { estimatedTokens: normalizedEstimatedTokens }
              : {}),
            suggestedChunkChars,
          },
        },
        refs: [
          getToolDocRef(resolvedToolName),
          getToolSchemaRef(resolvedToolName),
          TOOL_DOCS_README_REF,
          TOOL_SCHEMA_DOCS_README_REF,
          TOOL_SCHEMA_DOCS_INDEX_REF,
        ],
      },
    );
  })();

const decodeJsonPointerToken = (token: string): string =>
  token.replace(/~1/g, "/").replace(/~0/g, "~");

export const resolveJsonPointer = (
  document: unknown,
  pointer: string,
): JsonPointerResolveResult => {
  if (pointer === "" || pointer === "/") {
    return { ok: true, value: document };
  }
  if (!pointer.startsWith("/")) {
    return {
      ok: false,
      error: `Invalid JSON Pointer (must start with "/" or be empty): ${pointer}`,
    };
  }

  let current: unknown = document;
  const tokens = pointer.split("/").slice(1).map(decodeJsonPointerToken);

  for (const token of tokens) {
    if (Array.isArray(current)) {
      if (!/^(0|[1-9]\d*)$/.test(token)) {
        return {
          ok: false,
          error: `Pointer token "${token}" is not a valid array index`,
        };
      }
      const index = Number(token);
      if (
        !Number.isSafeInteger(index) ||
        index < 0 ||
        index >= current.length
      ) {
        return { ok: false, error: `Array index out of bounds: ${token}` };
      }
      current = current[index];
      continue;
    }

    if (current && typeof current === "object") {
      const record = current as Record<string, unknown>;
      if (!(token in record)) {
        return { ok: false, error: `Missing key "${token}"` };
      }
      current = record[token];
      continue;
    }

    return {
      ok: false,
      error: `Cannot resolve "${token}" on a non-container value`,
    };
  }

  return { ok: true, value: current };
};

export const isJsonPointerResolveError = (
  result: JsonPointerResolveResult,
): result is { ok: false; error: string } => !result.ok;

export const describeJsonValueType = (value: unknown): string => {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
};

const escapeRegExpChar = (char: string): string => {
  return char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const globToRegExp = (
  pattern: string,
  options?: { ignoreCase?: boolean },
): RegExp => {
  let regex = "^";

  for (let i = 0; i < pattern.length; i += 1) {
    const char = pattern[i] ?? "";

    if (char === "*") {
      const next = pattern[i + 1];
      if (next === "*") {
        const after = pattern[i + 2];
        if (after === "/") {
          regex += "(?:.*\\/)?";
          i += 2;
          continue;
        }
        regex += ".*";
        i += 1;
        continue;
      }
      regex += "[^/]*";
      continue;
    }

    if (char === "?") {
      regex += "[^/]";
      continue;
    }

    regex += escapeRegExpChar(char);
  }

  regex += "$";
  return new RegExp(regex, options?.ignoreCase ? "i" : undefined);
};

export const resolveCurrentPath = (
  ctx: ToolContext,
  path?: string,
): { ok: true; path: string } | { ok: false; error: ToolCallError } => {
  try {
    const { activeForkId } = resolveAiWriteContext(ctx);
    return {
      ok: true,
      path: stripCurrentPath(path ?? "current", { activeForkId }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: createError(message, "INVALID_DATA") };
  }
};

export const resolveCurrentPathLoose = (
  ctx: ToolContext,
  path?: string,
): { ok: true; path: string } | { ok: false; error: ToolCallError } => {
  if (!path) {
    return resolveCurrentPath(ctx, path);
  }
  const normalized = normalizeVfsPath(path);
  const qualified =
    normalized === "current" || normalized.startsWith("current/")
      ? normalized
      : `current/${normalized}`;
  return resolveCurrentPath(ctx, qualified);
};

export const withAtomicSession = <T>(
  ctx: ToolContext,
  action: (draft: VfsSession) => ToolCallResult<T>,
  options?: { writeContext?: VfsWriteContext },
): ToolCallResult<T> => {
  const session = getSession(ctx);
  const draft = cloneSession(session);
  const writeContext = options?.writeContext ?? resolveAiWriteContext(ctx);

  try {
    const result = draft.withWriteContext(writeContext, () => action(draft));
    if (!result.success) {
      return result;
    }
    commitSession(session, draft);
    return result;
  } catch (error) {
    if (error instanceof VfsWriteAccessError) {
      return createError(error.message, error.code);
    }

    const message = error instanceof Error ? error.message : String(error);
    return createError(message, "UNKNOWN");
  }
};

export const isPathResolveError = (
  result: { ok: true; path: string } | { ok: false; error: ToolCallError },
): result is { ok: false; error: ToolCallError } => !result.ok;

export const safeParseJson = (input: string): unknown | null => {
  try {
    return JSON.parse(input) as unknown;
  } catch {
    return null;
  }
};

const FALLBACK_TEMPLATE_IDS = new Set([
  "template.fallback.shared",
  "template.fallback.fork",
]);

const PLAIN_OR_MARKDOWN_CONTENT_TYPES = new Set([
  "text/plain",
  "text/markdown",
]);

export const countLines = (content: string): number => {
  if (!content) return 0;
  return content.split(/\r?\n/).length;
};

export const mapCategory = (canonicalPath: string): string => {
  const normalized = normalizeVfsPath(canonicalPath);
  if (
    normalized.startsWith("shared/system/skills/") ||
    normalized === "shared/system/skills"
  ) {
    return "skill";
  }
  if (
    normalized.startsWith("shared/system/refs/") ||
    normalized === "shared/system/refs"
  ) {
    return "reference";
  }

  const classification = vfsPathRegistry.classify(normalized);
  if (classification.templateId === "template.system.skills") return "skill";
  if (classification.templateId === "template.system.refs") return "reference";

  return "unknown";
};

export const inferContentTypeFromPath = (path: string): string | null => {
  const normalized = normalizeVfsPath(path).toLowerCase();
  if (normalized.endsWith(".jsonl")) return "application/jsonl";
  if (normalized.endsWith(".json")) return "application/json";
  if (normalized.endsWith(".md")) return "text/markdown";
  if (
    normalized.endsWith(".txt") ||
    normalized.endsWith(".log") ||
    normalized.endsWith(".text")
  ) {
    return "text/plain";
  }
  return null;
};

export const isPlainOrMarkdownContentType = (contentType: string): boolean =>
  PLAIN_OR_MARKDOWN_CONTENT_TYPES.has(contentType);

export const hasSpecificTemplateDefinition = (templateId: string): boolean =>
  !FALLBACK_TEMPLATE_IDS.has(templateId);

export const formatTemplateDefinitionHint = (input: {
  templateId: string;
  description: string;
  shape: string;
  scope: string;
  domain: string;
  permissionClass: string;
  contentTypes: string[];
  resolvedContentType?: string | null;
}): string => {
  const contentTypesText =
    input.contentTypes.length > 0
      ? input.contentTypes.join(" | ")
      : "unspecified";
  const resolvedTypeText = input.resolvedContentType ?? "unknown";

  return [
    "No strict Zod field schema is registered for this path.",
    `Template: ${input.templateId}`,
    `Description: ${input.description}`,
    `Shape: ${input.shape}`,
    `Scope: ${input.scope}`,
    `Domain: ${input.domain}`,
    `Permission: ${input.permissionClass}`,
    `Expected content types: ${contentTypesText}`,
    `Resolved content type: ${resolvedTypeText}`,
  ].join("\n");
};

const getMimeType = (contentType: VfsContentType): string => contentType;

export const toLsStatEntryForFile = (file: {
  path: string;
  contentType: VfsContentType;
  content: string;
  size: number;
  updatedAt: number;
}) => ({
  kind: "file" as const,
  path: toCurrentPath(file.path),
  chars: file.content.length,
  size: file.size,
  lines: countLines(file.content),
  mimeType: getMimeType(file.contentType),
  category: mapCategory(file.path),
  updatedAt: file.updatedAt,
});

export const toLsStatEntryForDir = (
  path: string,
  snapshotPaths: string[],
): {
  kind: "dir";
  path: string;
  chars: null;
  size: number;
  lines: null;
  mimeType: null;
  category: string;
  updatedAt: null;
  fileCount: number;
} => {
  const prefix = normalizeVfsPath(path).replace(/\/$/, "");
  const fileCount =
    prefix === ""
      ? snapshotPaths.length
      : snapshotPaths.filter((p) => p.startsWith(`${prefix}/`)).length;

  return {
    kind: "dir",
    path: toCurrentPath(prefix),
    chars: null,
    size: 0,
    lines: null,
    mimeType: null,
    category: mapCategory(prefix),
    updatedAt: null,
    fileCount,
  };
};

export const normalizeGlobInput = (pattern: string, basePath?: string): string => {
  const normalized = normalizeVfsPath(pattern);
  if (
    normalized.startsWith("current/") ||
    normalized.startsWith("shared/") ||
    normalized.startsWith("forks/")
  ) {
    return normalized;
  }

  if (basePath && basePath.trim().length > 0) {
    return normalizeVfsPath(`${basePath}/${normalized}`);
  }

  return normalized;
};

export const isInScope = (filePath: string, rootPath?: string): boolean => {
  if (!rootPath) {
    return true;
  }
  const normalized = normalizeVfsPath(rootPath);
  if (!normalized) {
    return true;
  }
  return filePath === normalized || filePath.startsWith(`${normalized}/`);
};

export const makeRegexMatcher = (regex: RegExp) => {
  return (line: string): boolean => {
    const matches = regex.test(line);
    if (regex.global || regex.sticky) {
      regex.lastIndex = 0;
    }
    return matches;
  };
};

export const collectMatches = (
  files: VfsFileMap,
  rootPath: string | undefined,
  matcher: (line: string) => boolean,
  limit: number,
): VfsMatch[] => {
  const matches: VfsMatch[] = [];

  for (const file of Object.values(files)) {
    if (!isInScope(file.path, rootPath)) {
      continue;
    }

    const lines = file.content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (matcher(line)) {
        matches.push({ path: file.path, line: i + 1, text: line });
        if (matches.length >= limit) {
          return matches;
        }
      }
    }
  }

  return matches;
};

export const collectFuzzyMatches = (
  files: VfsFileMap,
  rootPath: string | undefined,
  query: string,
  limit: number,
): VfsMatch[] => {
  if (limit <= 0) {
    return [];
  }

  const candidates: FuseMatch[] = [];

  for (const file of Object.values(files)) {
    if (!isInScope(file.path, rootPath)) {
      continue;
    }

    const lines = file.content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const text = lines[i];
      candidates.push({
        path: file.path,
        line: i + 1,
        text,
        scopePath: file.path,
      });
    }
  }

  const fuse = new Fuse(candidates, {
    includeScore: true,
    shouldSort: true,
    ignoreLocation: true,
    threshold: 0.4,
    minMatchCharLength: Math.min(2, query.length),
    keys: [
      { name: "text", weight: 0.8 },
      { name: "scopePath", weight: 0.2 },
    ],
  });

  return fuse.search(query, { limit }).map((result) => ({
    path: result.item.path,
    line: result.item.line,
    text: result.item.text,
  }));
};

const formatRagPreview = (content: unknown): string => {
  if (typeof content !== "string") {
    return "";
  }
  const firstLine = content
    .split(/\r?\n/)
    .find((line) => line.trim().length > 0);
  const preview = (firstLine ?? content).trim();
  if (preview.length <= 240) {
    return preview;
  }
  return `${preview.slice(0, 240)}…`;
};

export const searchSemanticWithRag = async (
  session: VfsSession,
  query: string,
  options: {
    rootPath?: string;
    limit: number;
    forkId?: number;
    beforeTurn?: number;
  },
): Promise<VfsMatch[]> => {
  const ragService = getRAGService();
  if (!ragService || !ragService.initialized) {
    return [];
  }

  const { rootPath, limit, forkId, beforeTurn } = options;
  const requestedTopK = Math.min(Math.max(limit * 4, limit), 50);

  try {
    const results = await ragService.search(query, {
      topK: requestedTopK,
      threshold: 0.2,
      forkId,
      beforeTurn,
      currentForkOnly: true,
      pathPrefixes: rootPath ? [rootPath] : undefined,
    });

    const mapped: VfsMatch[] = [];

    for (const result of results) {
      const sourcePath = normalizeVfsPath(result.document.sourcePath);
      if (!sourcePath) {
        continue;
      }
      if (rootPath && !isInScope(sourcePath, rootPath)) {
        continue;
      }

      const sourceFile = session.readFile(sourcePath);
      const canonicalFile = session.readFile(result.document.canonicalPath);
      const existingFile = sourceFile || canonicalFile;
      if (!existingFile) {
        continue;
      }

      mapped.push({
        path: existingFile.path,
        line: 1,
        text: formatRagPreview(result.document.content),
      });

      if (mapped.length >= limit) {
        break;
      }
    }

    return mapped;
  } catch (error) {
    console.warn(
      "[VFS] Semantic search via RAG failed, falling back to text.",
      error,
    );
    return [];
  }
};

const deriveConversationIndexFromSnapshot = (
  snapshot: VfsFileMap,
): { index: ConversationIndex } => {
  const turnsByFork = new Map<number, number[]>();

  for (const file of Object.values(snapshot)) {
    const match = TURN_ID_PATTERN.exec(normalizeVfsPath(file.path));
    if (!match) {
      continue;
    }
    const forkId = Number(match[1]);
    const turnNumber = Number(match[2]);
    if (!Number.isFinite(forkId) || !Number.isFinite(turnNumber)) {
      continue;
    }
    const turns = turnsByFork.get(forkId) ?? [];
    turns.push(turnNumber);
    turnsByFork.set(forkId, turns);
  }

  if (turnsByFork.size === 0) {
    return {
      index: {
        activeForkId: 0,
        activeTurnId: "fork-0/turn-0",
        rootTurnIdByFork: { "0": "fork-0/turn-0" },
        latestTurnNumberByFork: { "0": 0 },
        turnOrderByFork: { "0": ["fork-0/turn-0"] },
      },
    };
  }

  const forkIds = Array.from(turnsByFork.keys()).sort((a, b) => a - b);
  const activeForkId = forkIds[0];

  const rootTurnIdByFork: Record<string, string> = {};
  const latestTurnNumberByFork: Record<string, number> = {};
  const turnOrderByFork: Record<string, string[]> = {};

  for (const forkId of forkIds) {
    const turns = turnsByFork.get(forkId) ?? [];
    turns.sort((a, b) => a - b);
    const forkKey = String(forkId);
    const order = turns.map((turn) => buildTurnId(forkId, turn));
    turnOrderByFork[forkKey] = order;
    rootTurnIdByFork[forkKey] = order[0];
    latestTurnNumberByFork[forkKey] = turns[turns.length - 1];
  }

  const activeForkKey = String(activeForkId);
  const activeOrder = turnOrderByFork[activeForkKey] ?? [];
  const activeTurnId =
    activeOrder.length > 0
      ? activeOrder[activeOrder.length - 1]
      : "fork-0/turn-0";

  return {
    index: {
      activeForkId,
      activeTurnId,
      rootTurnIdByFork,
      latestTurnNumberByFork,
      turnOrderByFork,
    },
  };
};

export const ensureConversationIndex = (
  draft: VfsSession,
  options?: { operation?: "finish_commit" | "history_rewrite" },
): ConversationIndex => {
  const snapshot = draft.snapshot();
  const existing = readConversationIndex(snapshot);
  if (existing) {
    return existing;
  }

  const { index } = deriveConversationIndexFromSnapshot(snapshot);
  writeConversationIndex(
    draft,
    index,
    options?.operation ? { operation: options.operation } : undefined,
  );

  const match = /fork-(\d+)\/turn-(\d+)/.exec(index.activeTurnId);
  if (match) {
    const forkId = Number(match[1]);
    const turnNumber = Number(match[2]);
    const existingTurn = readTurnFile(snapshot, forkId, turnNumber);
    if (!existingTurn) {
      writeTurnFile(
        draft,
        forkId,
        turnNumber,
        {
          turnId: index.activeTurnId,
          forkId,
          turnNumber,
          parentTurnId: null,
          createdAt: Date.now(),
          userAction: "",
          assistant: { narrative: "", choices: [] },
        },
        options?.operation ? { operation: options.operation } : undefined,
      );
    }
  }

  return index;
};

export const ensureSeparatorNewline = (left: string, right: string): string => {
  if (!left) return "";
  if (left.endsWith("\n")) return "";
  if (right.startsWith("\n")) return "";
  return "\n";
};

export const formatOutlineCommitValidationError = (error: unknown): string => {
  const errRecord =
    error && typeof error === "object"
      ? (error as Record<string, unknown>)
      : null;
  const issues = errRecord?.issues;
  if (!Array.isArray(issues)) {
    return String(errRecord?.message ?? error);
  }
  return issues
    .slice(0, 12)
    .map((issue) => {
      const issueRecord =
        issue && typeof issue === "object"
          ? (issue as Record<string, unknown>)
          : null;
      const path = Array.isArray(issueRecord?.path)
        ? issueRecord.path
            .map((part: unknown) =>
              typeof part === "number" ? `[${part}]` : String(part),
            )
            .join(".")
            .replace(/\.\[/g, "[")
        : "";
      const message =
        typeof issueRecord?.message === "string" ? issueRecord.message : "Invalid";
      return path ? `${path}: ${message}` : message;
    })
    .join("; ");
};
