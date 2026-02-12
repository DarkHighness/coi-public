/**
 * VFS Tool Handlers
 */

import {
  VFS_LS_TOOL,
  VFS_READ_TOOL,
  VFS_SCHEMA_TOOL,
  VFS_SEARCH_TOOL,
  VFS_WRITE_TOOL,
  VFS_MOVE_TOOL,
  VFS_DELETE_TOOL,
  VFS_COMMIT_TURN_TOOL,
  VFS_COMMIT_SUMMARY_TOOL,
  VFS_COMMIT_OUTLINE_PHASE_TOOLS,
  getTypedArgs,
} from "../../tools";
import {
  createError,
  createSuccess,
  type ToolCallResult,
  type ToolCallError,
  type ToolErrorBatch,
  type ToolErrorDetails,
  inferErrorCategoryFromCode,
  mergeToolErrorDetails,
} from "../toolResult";
import type { ZodToolDefinition } from "../../providers/types";
import type { VfsFileMap, VfsContentType } from "../../vfs/types";
import { stripCurrentPath, toCurrentPath } from "../../vfs/currentAlias";
import { writeOutlineStoryPlan } from "../../vfs/outline";
import { normalizeVfsPath } from "../../vfs/utils";
import { VfsSession, VfsWriteAccessError } from "../../vfs/vfsSession";
import Fuse from "fuse.js";
import { getRAGService } from "../../rag";
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
} from "../../schemas";
import {
  buildTurnId,
  type ConversationIndex,
  readConversationIndex,
  readTurnFile,
  writeConversationIndex,
  writeTurnFile,
} from "../../vfs/conversation";
import { type ToolContext } from "../toolHandlerRegistry";
import { getVfsSchemaHint } from "../../providers/utils";
import {
  ensureTextFile,
  requireReadBeforeMutateForExistingFile,
  resolveTextContentType,
  validateExpectedHash,
  validateWritePayload,
} from "./vfsMutationGuard";
import type { Operation } from "fast-json-patch";
import { applyCustomRulesRetconAck } from "../../customRulesAckState";
import { vfsPathRegistry } from "../../vfs/core/pathRegistry";
import { vfsResourceRegistry } from "../../vfs/core/resourceRegistry";
import { vfsToolRouter } from "../../vfs/core/toolRouter";
import type { VfsWriteContext } from "../../vfs/core/types";
import { getSchemaForPath } from "../../vfs/schemas";
import { buildVfsLayoutReport } from "../../vfs/layoutReport";

interface VfsMatch {
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

const TOOL_DOCS_README_REF = "current/refs/tools/README.md";

const normalizeToolDocName = (toolName: string): string =>
  toolName.includes("(") ? toolName.slice(0, toolName.indexOf("(")) : toolName;

const getToolDocRef = (toolName: string): string =>
  `current/refs/tools/${normalizeToolDocName(toolName)}.md`;

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

const defaultRecoveryByCode = (
  code: ToolCallError["code"],
  toolName: string,
): string[] => {
  if (code === "INVALID_DATA" || code === "INVALID_PARAMS") {
    return [`Review ${getToolDocRef(toolName)} and retry with schema-valid arguments.`];
  }
  if (code === "INVALID_ACTION") {
    return [
      `Follow tool preconditions (read-before-write / finish ordering) in ${getToolDocRef(toolName)} and retry.`,
    ];
  }
  if (
    code === "IMMUTABLE_READONLY" ||
    code === "ELEVATION_REQUIRED" ||
    code === "FINISH_GUARD_REQUIRED" ||
    code === "EDITOR_CONFIRM_REQUIRED"
  ) {
    return [
      "Respect path permission boundaries and use the designated commit/elevation flow.",
    ];
  }
  if (code === "NOT_FOUND") {
    return ["Confirm path existence with vfs_ls/vfs_read before retrying."];
  }
  if (code === "RAG_DISABLED") {
    return ["Disable semantic search or enable embedding runtime before retrying."];
  }
  return [`Inspect ${getToolDocRef(toolName)} and retry.`];
};

const isToolCallErrorResult = (value: unknown): value is ToolCallError => {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    record.success === false &&
    typeof record.error === "string" &&
    typeof record.code === "string"
  );
};

const withToolErrorDetails = (
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

  return mergeToolErrorDetails(error, {
    category: details?.category ?? inferErrorCategoryFromCode(error.code),
    tool: details?.tool ?? normalizedTool,
    issues: details?.issues,
    recovery: details?.recovery ?? defaultRecoveryByCode(error.code, normalizedTool),
    refs,
    batch: details?.batch,
  });
};

const registerToolHandlerWithStructuredErrors = (
  tool: ZodToolDefinition,
  handler: (
    args: Record<string, unknown>,
    ctx: ToolContext,
  ) => unknown | Promise<unknown>,
  options?: {
    batchFromArgs?: (args: Record<string, unknown>) => ToolErrorBatch | undefined;
  },
): void => {
  const wrapped = (args: Record<string, unknown>, ctx: ToolContext) => {
    const finalize = (result: unknown): unknown => {
      if (!isToolCallErrorResult(result)) {
        return result;
      }
      const fallbackBatch =
        options?.batchFromArgs && !result.details?.batch
          ? options.batchFromArgs(args)
          : undefined;
      return withToolErrorDetails(result, tool.name, {
        ...(fallbackBatch ? { batch: fallbackBatch } : {}),
      });
    };

    const output = handler(args, ctx);
    if (output instanceof Promise) {
      return output.then((value) => finalize(value));
    }
    return finalize(output);
  };

  vfsToolRouter.register(tool, wrapped);
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

const getSession = (ctx: ToolContext): VfsSession => ctx.vfsSession;

const resolveAiWriteContext = (
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

const requireToolSeenForExistingFile = (
  session: VfsSession,
  path: string,
  operation: "overwrite" | "append" | "text_edit" | "edit" | "merge" | "delete",
): ToolCallResult<never> | null => {
  return requireReadBeforeMutateForExistingFile(session, path, operation);
};

const ensureNotFinishGuardedMutation = (
  path: string,
  toolName: string,
): ToolCallResult<never> | null => {
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
            message: "Target path can only be mutated through finish/commit tools.",
          },
        ],
      },
    ),
    normalizeToolDocName(toolName),
    {
      recovery: [
        "Use vfs_commit_turn or vfs_commit_summary for finish-guarded conversation/summary files.",
      ],
    },
  );
};

const VFS_READ_HARD_CHAR_CAP = 16_384;

const createReadLimitError = (
  mode: "chars" | "lines" | "json",
  details: string,
): ToolCallResult<never> =>
  createError(
    `vfs_read(${mode}): ${details}. Hard cap is ${VFS_READ_HARD_CHAR_CAP} chars. Use lines/chars(start+offset) or narrower JSON pointers.`,
    "INVALID_DATA",
    {
      category: "validation",
      tool: "vfs_read",
      issues: [
        {
          path: mode,
          code: "READ_LIMIT_EXCEEDED",
          message: details,
          expected: `<= ${VFS_READ_HARD_CHAR_CAP}`,
        },
      ],
      recovery: [
        "Reduce requested window size (chars/lines/json pointers).",
        "Use paged reads with start+offset for large files.",
      ],
      refs: [getToolDocRef("vfs_read"), TOOL_DOCS_README_REF],
    },
  );

const decodeJsonPointerToken = (token: string): string =>
  token.replace(/~1/g, "/").replace(/~0/g, "~");

const resolveJsonPointer = (
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
  const tokens = pointer
    .split("/")
    .slice(1)
    .map(decodeJsonPointerToken);

  for (const token of tokens) {
    if (Array.isArray(current)) {
      if (!/^(0|[1-9]\d*)$/.test(token)) {
        return {
          ok: false,
          error: `Pointer token "${token}" is not a valid array index`,
        };
      }
      const index = Number(token);
      if (!Number.isSafeInteger(index) || index < 0 || index >= current.length) {
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

const describeJsonValueType = (value: unknown): string => {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
};

const escapeRegExpChar = (char: string): string => {
  return char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const globToRegExp = (
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

const resolveCurrentPath = (
  path?: string,
): { ok: true; path: string } | { ok: false; error: ToolCallError } => {
  try {
    return { ok: true, path: stripCurrentPath(path ?? "current") };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: createError(message, "INVALID_DATA") };
  }
};

const resolveCurrentPathLoose = (
  path?: string,
): { ok: true; path: string } | { ok: false; error: ToolCallError } => {
  if (!path) {
    return resolveCurrentPath(path);
  }
  const normalized = normalizeVfsPath(path);
  const qualified =
    normalized === "current" || normalized.startsWith("current/")
      ? normalized
      : `current/${normalized}`;
  return resolveCurrentPath(qualified);
};

const withAtomicSession = <T>(
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

const isPathResolveError = (
  result: { ok: true; path: string } | { ok: false; error: ToolCallError },
): result is { ok: false; error: ToolCallError } => !result.ok;

const isJsonPointerResolveError = (
  result: JsonPointerResolveResult,
): result is { ok: false; error: string } => !result.ok;

const safeParseJson = (input: string): unknown | null => {
  try {
    return JSON.parse(input) as unknown;
  } catch {
    return null;
  }
};

const countLines = (content: string): number => {
  if (!content) return 0;
  return content.split(/\r?\n/).length;
};

const mapCategory = (canonicalPath: string): string => {
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

const FALLBACK_TEMPLATE_IDS = new Set([
  "template.fallback.shared",
  "template.fallback.fork",
]);

const PLAIN_OR_MARKDOWN_CONTENT_TYPES = new Set(["text/plain", "text/markdown"]);

const inferContentTypeFromPath = (path: string): string | null => {
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

const isPlainOrMarkdownContentType = (contentType: string): boolean =>
  PLAIN_OR_MARKDOWN_CONTENT_TYPES.has(contentType);

const hasSpecificTemplateDefinition = (templateId: string): boolean =>
  !FALLBACK_TEMPLATE_IDS.has(templateId);

const formatTemplateDefinitionHint = (input: {
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
    input.contentTypes.length > 0 ? input.contentTypes.join(" | ") : "unspecified";
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

const toLsStatEntryForFile = (file: {
  path: string;
  contentType: VfsContentType;
  content: string;
  size: number;
  updatedAt: number;
}) => ({
  kind: "file" as const,
  path: toCurrentPath(file.path),
  size: file.size,
  lines: countLines(file.content),
  mimeType: getMimeType(file.contentType),
  category: mapCategory(file.path),
  updatedAt: file.updatedAt,
});

const toLsStatEntryForDir = (
  path: string,
  snapshotPaths: string[],
): {
  kind: "dir";
  path: string;
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
    size: 0,
    lines: null,
    mimeType: null,
    category: mapCategory(prefix),
    updatedAt: null,
    fileCount,
  };
};

const normalizeGlobInput = (pattern: string, basePath?: string): string => {
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

const isInScope = (filePath: string, rootPath?: string): boolean => {
  if (!rootPath) {
    return true;
  }
  const normalized = normalizeVfsPath(rootPath);
  if (!normalized) {
    return true;
  }
  return filePath === normalized || filePath.startsWith(`${normalized}/`);
};

const makeRegexMatcher = (regex: RegExp) => {
  return (line: string): boolean => {
    const matches = regex.test(line);
    if (regex.global || regex.sticky) {
      regex.lastIndex = 0;
    }
    return matches;
  };
};

const collectMatches = (
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

const collectFuzzyMatches = (
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
  const firstLine = content.split(/\r?\n/).find((line) => line.trim().length > 0);
  const preview = (firstLine ?? content).trim();
  if (preview.length <= 240) {
    return preview;
  }
  return `${preview.slice(0, 240)}…`;
};

const searchSemanticWithRag = async (
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
    console.warn("[VFS] Semantic search via RAG failed, falling back to text.", error);
    return [];
  }
};

const TURN_ID_PATTERN = /^conversation\/turns\/fork-(\d+)\/turn-(\d+)\.json$/;

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
    activeOrder.length > 0 ? activeOrder[activeOrder.length - 1] : "fork-0/turn-0";

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

const ensureConversationIndex = (
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

registerToolHandlerWithStructuredErrors(VFS_LS_TOOL, (args, ctx) => {
  const session = getSession(ctx);
  const typedArgs = getTypedArgs("vfs_ls", args);
  const baseResolved = resolveCurrentPathLoose(typedArgs.path);
  if (isPathResolveError(baseResolved)) {
    return baseResolved.error;
  }
  session.noteToolAccessScope(baseResolved.path ?? "");

  const patterns = typedArgs.patterns ?? null;
  const stat = Boolean(typedArgs.stat);
  const limit = typedArgs.limit ?? 200;
  const ignoreCase = Boolean(typedArgs.ignoreCase);
  const includeExpected = Boolean(typedArgs.includeExpected);
  const includeAccess = Boolean(typedArgs.includeAccess);
  const activeForkId =
    typeof ctx.gameState?.forkId === "number"
      ? ctx.gameState.forkId
      : session.getActiveForkId();

  const buildLayoutPayload = (
    rootPath: string | undefined,
  ): {
    layout: ReturnType<typeof buildVfsLayoutReport>;
    layoutTotal: number;
    layoutTruncated: boolean;
  } => {
    const fullLayout = buildVfsLayoutReport(session, {
      rootPath: rootPath || undefined,
      includeExpected,
      activeForkId,
      includeDirectories: true,
    });
    const layoutTruncated = fullLayout.length > limit;
    const layout = layoutTruncated ? fullLayout.slice(0, limit) : fullLayout;
    return {
      layout,
      layoutTotal: fullLayout.length,
      layoutTruncated,
    };
  };

  const toReadabilityLabel = (
    permissionClass:
      | "immutable_readonly"
      | "default_editable"
      | "elevated_editable"
      | "finish_guarded",
  ): "read_only" | "read_write" | "finish_guarded" => {
    if (permissionClass === "immutable_readonly") {
      return "read_only";
    }
    if (permissionClass === "finish_guarded") {
      return "finish_guarded";
    }
    return "read_write";
  };

  const toUpdateTriggers = (
    allowedWriteOps: Array<
      | "write"
      | "json_patch"
      | "json_merge"
      | "move"
      | "delete"
      | "finish_commit"
      | "finish_summary"
      | "history_rewrite"
    >,
    permissionClass:
      | "immutable_readonly"
      | "default_editable"
      | "elevated_editable"
      | "finish_guarded",
  ): string[] => {
    const triggers: string[] = [];
    if (allowedWriteOps.includes("finish_commit")) triggers.push("turn_commit");
    if (allowedWriteOps.includes("finish_summary")) triggers.push("summary_commit");
    if (allowedWriteOps.includes("history_rewrite")) triggers.push("history_rewrite");
    if (
      allowedWriteOps.some((op) =>
        ["write", "json_patch", "json_merge", "move", "delete"].includes(op),
      )
    ) {
      triggers.push("direct_write");
    }
    if (permissionClass === "elevated_editable") {
      triggers.push("elevated_write");
    }
    return triggers;
  };

  const toAccessMeta = (path: string) => {
    const classification = vfsPathRegistry.classify(normalizeVfsPath(path), {
      activeForkId,
    });
    return {
      path: toCurrentPath(path),
      canonicalPath: classification.canonicalPath,
      templateId: classification.templateId,
      permissionClass: classification.permissionClass,
      scope: classification.scope,
      domain: classification.domain,
      allowedWriteOps: [...classification.allowedWriteOps],
      readability: toReadabilityLabel(classification.permissionClass),
      updateTriggers: toUpdateTriggers(
        classification.allowedWriteOps,
        classification.permissionClass,
      ),
    };
  };

  if (!patterns || patterns.length === 0) {
    const entries = session.list(baseResolved.path);
    if (!stat && !includeExpected && !includeAccess) {
      return createSuccess({ entries }, "VFS entries listed");
    }

    const payload: Record<string, unknown> = { entries };
    if (stat) {
      const snapshot = session.snapshotAll();
      const snapshotPaths = Object.keys(snapshot);
      const meta = entries.map((entryPath) => {
        const normalized = normalizeVfsPath(entryPath);
        const file = session.readFile(normalized);
        if (file) {
          return toLsStatEntryForFile(file);
        }
        return toLsStatEntryForDir(normalized, snapshotPaths);
      });
      payload.stats = meta;
    }

    if (includeExpected || includeAccess) {
      const layoutPayload = buildLayoutPayload(baseResolved.path);
      payload.layout = includeAccess
        ? layoutPayload.layout
        : layoutPayload.layout.map((entry) => ({
            path: entry.path,
            canonicalPath: entry.canonicalPath,
            kind: entry.kind,
            exists: entry.exists,
            expected: entry.expected,
            sources: entry.sources,
          }));
      payload.layoutTotal = layoutPayload.layoutTotal;
      payload.layoutTruncated = layoutPayload.layoutTruncated;
    }

    return createSuccess(
      payload,
      stat ? "VFS entries listed with metadata" : "VFS entries listed",
    );
  }

  if (includeExpected) {
    return createError(
      "vfs_ls: includeExpected is only supported when patterns are omitted.",
      "INVALID_DATA",
    );
  }

  const regexes: RegExp[] = [];
  for (const raw of patterns) {
    const resolvedPattern = normalizeGlobInput(raw, baseResolved.path);
    try {
      regexes.push(globToRegExp(resolvedPattern, { ignoreCase }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return createError(`Invalid glob: ${message}`, "INVALID_DATA");
    }
  }

  const excludeRegexes: RegExp[] = [];
  if (typedArgs.excludePatterns) {
    for (const raw of typedArgs.excludePatterns) {
      const resolvedPattern = normalizeGlobInput(raw, baseResolved.path);
      try {
        excludeRegexes.push(globToRegExp(resolvedPattern, { ignoreCase }));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return createError(`Invalid exclude glob: ${message}`, "INVALID_DATA");
      }
    }
  }

  const snapshot = session.snapshotAll();
  const snapshotPaths = Object.keys(snapshot);
  const matched = new Set<string>();

  for (const path of snapshotPaths) {
    if (excludeRegexes.some((re) => re.test(path))) {
      continue;
    }
    if (!isInScope(path, baseResolved.path)) {
      continue;
    }
    for (const regex of regexes) {
      if (regex.test(path)) {
        matched.add(path);
        break;
      }
    }
  }

  const allMatches = Array.from(matched).sort();
  const truncated = allMatches.length > limit;
  const selectedMatches = truncated ? allMatches.slice(0, limit) : allMatches;
  for (const path of selectedMatches) {
    session.noteToolAccessFile(path);
  }
  const matches = selectedMatches.map((p) => toCurrentPath(p));

  if (!stat) {
    const payload: Record<string, unknown> = {
      entries: matches,
      truncated,
      totalMatches: allMatches.length,
    };
    if (includeAccess) {
      payload.access = selectedMatches.map(toAccessMeta);
    }
    return createSuccess(payload, "VFS glob listing complete");
  }

  const stats = selectedMatches.flatMap((path) => {
    const file = session.readFile(path);
    if (!file) return [];
    return [toLsStatEntryForFile(file)];
  });

  const payload: Record<string, unknown> = {
    entries: matches,
    stats,
    truncated,
    totalMatches: allMatches.length,
  };
  if (includeAccess) {
    payload.access = selectedMatches.map(toAccessMeta);
  }

  return createSuccess(
    payload,
    "VFS glob listing complete",
  );
});

registerToolHandlerWithStructuredErrors(VFS_READ_TOOL, (args, ctx) => {
  const session = getSession(ctx);
  const typedArgs = getTypedArgs("vfs_read", args);
  const resolved = resolveCurrentPath(typedArgs.path);
  if (isPathResolveError(resolved)) {
    return resolved.error;
  }

  const file = session.readFile(resolved.path);
  if (!file) {
    return createError(`File not found: ${typedArgs.path}`, "NOT_FOUND");
  }
  session.noteToolSeen(resolved.path);
  session.noteToolAccessFile(resolved.path);

  const mode =
    typedArgs.mode ??
    (typedArgs.pointers && typedArgs.pointers.length > 0
      ? "json"
      : typedArgs.startLine || typedArgs.endLine || typedArgs.lineCount
        ? "lines"
        : "chars");

  if (mode === "json") {
    if (file.contentType !== "application/json") {
      return createError(`File is not JSON: ${typedArgs.path}`, "INVALID_DATA");
    }

    let document: unknown;
    try {
      document = JSON.parse(file.content);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return createError(`Invalid JSON: ${message}`, "INVALID_DATA");
    }

    const pointers = typedArgs.pointers ?? [];
    if (pointers.length === 0) {
      return createError(
        "vfs_read(json): pointers must be provided",
        "INVALID_DATA",
      );
    }

    if (
      typeof typedArgs.maxChars === "number" &&
      typedArgs.maxChars > VFS_READ_HARD_CHAR_CAP
    ) {
      return createReadLimitError(
        "json",
        `maxChars=${typedArgs.maxChars} exceeds allowed per-pointer read size`,
      );
    }
    const maxChars = typedArgs.maxChars ?? VFS_READ_HARD_CHAR_CAP;
    const extracts: Array<{
      pointer: string;
      type: string;
      json: string;
      truncated: boolean;
      jsonChars: number;
    }> = [];
    const missing: Array<{ pointer: string; error: string }> = [];
    let totalJsonChars = 0;

    for (const pointer of pointers) {
      const resolvedPointer = resolveJsonPointer(document, pointer);
      if (isJsonPointerResolveError(resolvedPointer)) {
        missing.push({ pointer, error: resolvedPointer.error });
        continue;
      }

      const valueType = describeJsonValueType(resolvedPointer.value);
      const jsonString = JSON.stringify(resolvedPointer.value);
      const fullJson = typeof jsonString === "string" ? jsonString : "null";
      if (fullJson.length > maxChars) {
        return createReadLimitError(
          "json",
          `pointer "${pointer}" yields ${fullJson.length} chars, exceeding limit ${maxChars}`,
        );
      }
      totalJsonChars += fullJson.length;
      if (totalJsonChars > VFS_READ_HARD_CHAR_CAP) {
        return createReadLimitError(
          "json",
          `combined pointer payload exceeds ${VFS_READ_HARD_CHAR_CAP} chars`,
        );
      }
      const json = fullJson;

      extracts.push({
        pointer,
        type: valueType,
        json,
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
    const startLine = typedArgs.startLine ?? 1;

    if (startLine < 1 || startLine > Math.max(totalLines, 1)) {
      return createError(
        `vfs_read(lines): startLine out of range (${startLine})`,
        "INVALID_DATA",
      );
    }

    let endLine: number;
    if (typeof typedArgs.endLine === "number") {
      endLine = typedArgs.endLine;
    } else if (typeof typedArgs.lineCount === "number") {
      endLine = startLine + typedArgs.lineCount - 1;
    } else {
      endLine = totalLines;
    }

    if (endLine < startLine) {
      return createError(
        "vfs_read(lines): endLine must be >= startLine",
        "INVALID_DATA",
      );
    }

    if (endLine > totalLines) {
      return createError(
        `vfs_read(lines): endLine out of range (${endLine})`,
        "INVALID_DATA",
      );
    }

    const startIndex = startLine - 1;
    const endIndexExclusive = endLine;
    const content = lines.slice(startIndex, endIndexExclusive).join("\n");
    if (content.length > VFS_READ_HARD_CHAR_CAP) {
      return createReadLimitError(
        "lines",
        `requested line range returns ${content.length} chars`,
      );
    }

    return createSuccess(
      {
        mode,
        path: toCurrentPath(file.path),
        contentType: file.contentType,
        content,
        lineStart: startLine,
        lineEnd: endLine,
        totalLines,
        truncated: startLine !== 1 || endLine !== totalLines,
        size: file.size,
        hash: file.hash,
        updatedAt: file.updatedAt,
      },
      "VFS file lines read",
    );
  }

  const startRaw = typedArgs.start;
  const offsetRaw = typedArgs.offset;
  const maxChars = typedArgs.maxChars;

  const start = typeof startRaw === "number" ? startRaw : 0;
  const hasOffset = typeof offsetRaw === "number";
  const hasMaxChars = typeof maxChars === "number";

  if (start > 0 && !hasOffset && !hasMaxChars) {
    return createError(
      "vfs_read(chars): when providing start, also provide offset (preferred) or maxChars",
      "INVALID_DATA",
    );
  }

  if (hasOffset && offsetRaw > VFS_READ_HARD_CHAR_CAP) {
    return createReadLimitError(
      "chars",
      `offset=${offsetRaw} exceeds allowed chunk size`,
    );
  }
  if (hasMaxChars && maxChars > VFS_READ_HARD_CHAR_CAP) {
    return createReadLimitError(
      "chars",
      `maxChars=${maxChars} exceeds allowed chunk size`,
    );
  }

  const length = hasOffset ? offsetRaw : hasMaxChars ? maxChars : undefined;
  const totalChars = file.content.length;
  const sliceStart = Math.min(Math.max(start, 0), totalChars);
  const sliceEndExclusive =
    typeof length === "number"
      ? Math.min(sliceStart + Math.max(length, 0), totalChars)
      : totalChars;

  const content = file.content.slice(sliceStart, sliceEndExclusive);
  if (content.length > VFS_READ_HARD_CHAR_CAP) {
    return createReadLimitError(
      "chars",
      `requested char range returns ${content.length} chars`,
    );
  }
  const truncated = sliceStart !== 0 || sliceEndExclusive !== totalChars;

  return createSuccess(
    {
      mode: "chars",
      path: toCurrentPath(file.path),
      contentType: file.contentType,
      content,
      truncated,
      sliceStart,
      sliceEndExclusive,
      totalChars,
      size: file.size,
      hash: file.hash,
      updatedAt: file.updatedAt,
    },
    "VFS file read",
  );
});

registerToolHandlerWithStructuredErrors(VFS_SCHEMA_TOOL, (args, ctx) => {
  const session = getSession(ctx);
  const typedArgs = getTypedArgs("vfs_schema", args);

  const schemas: Array<{
    path: string;
    hint: string;
    classification: {
      canonicalPath: string;
      templateId: string;
      permissionClass: string;
      scope: string;
      domain: string;
      resourceShape: string;
      criticality: string;
      retention: string;
      allowedWriteOps: string[];
    };
  }> = [];
  const missing: Array<{ path: string; error: string }> = [];

  for (const inputPath of typedArgs.paths) {
    const resolved = resolveCurrentPathLoose(inputPath);
    if (isPathResolveError(resolved)) {
      return resolved.error;
    }

    const activeForkId =
      typeof ctx.gameState?.forkId === "number"
        ? ctx.gameState.forkId
        : session.getActiveForkId();
    const classification = vfsPathRegistry.classify(resolved.path, {
      activeForkId,
    });
    const resourceMatch = vfsResourceRegistry.match(resolved.path, {
      activeForkId,
    });
    const existingFile = session.readFile(resolved.path);

    try {
      const schema = getSchemaForPath(resolved.path);
      schemas.push({
        path: toCurrentPath(resolved.path),
        hint: getVfsSchemaHint(schema),
        classification: {
          canonicalPath: classification.canonicalPath,
          templateId: classification.templateId,
          permissionClass: classification.permissionClass,
          scope: classification.scope,
          domain: classification.domain,
          resourceShape: classification.resourceShape,
          criticality: classification.criticality,
          retention: classification.retention,
          allowedWriteOps: [...classification.allowedWriteOps],
        },
      });
    } catch (schemaError) {
      if (!hasSpecificTemplateDefinition(classification.templateId)) {
        const message =
          schemaError instanceof Error ? schemaError.message : String(schemaError);
        missing.push({ path: inputPath, error: message });
        continue;
      }

      const templateContentTypes = resourceMatch.descriptor.contentTypes ?? [];
      const inferredContentType =
        existingFile?.contentType ??
        inferContentTypeFromPath(resolved.path) ??
        (templateContentTypes.length === 1 ? templateContentTypes[0] : null);
      const looksLikePlainOrMarkdown =
        inferredContentType !== null
          ? isPlainOrMarkdownContentType(inferredContentType)
          : templateContentTypes.length > 0 &&
            templateContentTypes.every(isPlainOrMarkdownContentType);

      if (!existingFile && looksLikePlainOrMarkdown) {
        missing.push({
          path: inputPath,
          error: `File not found for plain/markdown path: ${toCurrentPath(resolved.path)}`,
        });
        continue;
      }

      schemas.push({
        path: toCurrentPath(resolved.path),
        hint: formatTemplateDefinitionHint({
          templateId: classification.templateId,
          description: classification.description,
          shape: classification.resourceShape,
          scope: classification.scope,
          domain: classification.domain,
          permissionClass: classification.permissionClass,
          contentTypes: templateContentTypes,
          resolvedContentType: inferredContentType,
        }),
        classification: {
          canonicalPath: classification.canonicalPath,
          templateId: classification.templateId,
          permissionClass: classification.permissionClass,
          scope: classification.scope,
          domain: classification.domain,
          resourceShape: classification.resourceShape,
          criticality: classification.criticality,
          retention: classification.retention,
          allowedWriteOps: [...classification.allowedWriteOps],
        },
      });
    }
  }

  return createSuccess({ schemas, missing }, "VFS schema described");
});

registerToolHandlerWithStructuredErrors(VFS_SEARCH_TOOL, async (args, ctx) => {
  const session = getSession(ctx);
  const typedArgs = getTypedArgs("vfs_search", args);
  const limit = typedArgs.limit ?? 20;
  if (limit <= 0) {
    return createSuccess({ results: [] }, "VFS search complete");
  }

  const resolvedPath = typedArgs.path ? resolveCurrentPath(typedArgs.path) : null;
  if (resolvedPath && isPathResolveError(resolvedPath)) {
    return resolvedPath.error;
  }
  const rootPath = resolvedPath?.ok ? resolvedPath.path : undefined;
  const files = session.snapshotAll();
  const regex = Boolean(typedArgs.regex);
  const fuzzy = Boolean(typedArgs.fuzzy);
  const semantic = Boolean(typedArgs.semantic);

  if (regex) {
    let regexObj: RegExp;
    try {
      regexObj = new RegExp(typedArgs.query);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return createError(`Invalid regex: ${message}`, "INVALID_DATA");
    }

    const rawResults = collectMatches(files, rootPath, makeRegexMatcher(regexObj), limit);
    const results = rawResults.map((match) => ({
      ...match,
      path: toCurrentPath(match.path),
    }));
    return createSuccess({ results }, "VFS search complete");
  }

  if (semantic) {
    if (!ctx.embeddingEnabled) {
      return createError(
        "Semantic search is disabled because RAG/embedding is currently off.",
        "RAG_DISABLED",
      );
    }

    const forkId =
      typeof ctx.gameState?.forkId === "number" ? ctx.gameState.forkId : undefined;
    const beforeTurn =
      typeof ctx.gameState?.turnNumber === "number"
        ? ctx.gameState.turnNumber
        : undefined;

    const ragMatches = await searchSemanticWithRag(session, typedArgs.query, {
      rootPath,
      limit,
      forkId,
      beforeTurn,
    });

    if (ragMatches.length > 0) {
      const results = ragMatches.map((match) => ({
        ...match,
        path: toCurrentPath(match.path),
      }));
      return createSuccess({ results }, "VFS search complete");
    }

    const semanticMatches = session.searchSemantic(typedArgs.query, {
      path: rootPath,
      limit,
    });
    if (semanticMatches.length > 0) {
      const results = semanticMatches
        .slice(0, limit)
        .map((match) => ({ ...match, path: toCurrentPath(match.path) }));
      return createSuccess({ results }, "VFS search complete");
    }
  }

  const rawResults = fuzzy
    ? collectFuzzyMatches(files, rootPath, typedArgs.query, limit)
    : collectMatches(files, rootPath, (line) => line.includes(typedArgs.query), limit);

  const results = rawResults.map((match) => ({
    ...match,
    path: toCurrentPath(match.path),
  }));

  return createSuccess({ results }, "VFS search complete");
});

const ensureSeparatorNewline = (left: string, right: string): string => {
  if (!left) return "";
  if (left.endsWith("\n")) return "";
  if (right.startsWith("\n")) return "";
  return "\n";
};

registerToolHandlerWithStructuredErrors(VFS_WRITE_TOOL, (args, ctx) => {
  const typedArgs = getTypedArgs("vfs_write", args);

  return withAtomicSession(ctx, (draft) => {
    const written: string[] = [];
    const appended: string[] = [];
    const edited: string[] = [];
    const patched: string[] = [];
    const merged: string[] = [];
    const withBatchError = (
      error: ToolCallError,
      opIndex: number,
      operation: string,
      path?: string,
    ): ToolCallError =>
      withToolErrorDetails(error, "vfs_write", {
        batch: {
          index: opIndex + 1,
          total: typedArgs.ops.length,
          operation,
          path,
        },
      });

    for (const [opIndex, op] of typedArgs.ops.entries()) {
      if (op.op === "write_file") {
        const resolved = resolveCurrentPath(op.path);
        if (isPathResolveError(resolved)) {
          return withBatchError(resolved.error, opIndex, op.op, op.path);
        }
        const finishGuardError = ensureNotFinishGuardedMutation(
          resolved.path,
          "vfs_write(write_file)",
        );
        if (finishGuardError) {
          return withBatchError(finishGuardError, opIndex, op.op, op.path);
        }

        const seenError = requireToolSeenForExistingFile(draft, resolved.path, "overwrite");
        if (seenError) {
          return withBatchError(seenError, opIndex, op.op, op.path);
        }

        const validated = validateWritePayload(
          resolved.path,
          op.content,
          op.contentType,
        );
        if ("error" in validated) {
          return withBatchError(validated.error, opIndex, op.op, op.path);
        }

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
        const resolved = resolveCurrentPath(op.path);
        if (isPathResolveError(resolved)) {
          return withBatchError(resolved.error, opIndex, op.op, op.path);
        }
        const finishGuardError = ensureNotFinishGuardedMutation(
          resolved.path,
          "vfs_write(append_text)",
        );
        if (finishGuardError) {
          return withBatchError(finishGuardError, opIndex, op.op, op.path);
        }

        const existing = draft.readFile(resolved.path);
        const seenError = requireToolSeenForExistingFile(draft, resolved.path, "append");
        if (seenError) {
          return withBatchError(seenError, opIndex, op.op, op.path);
        }

        const hashError = validateExpectedHash(existing, op.expectedHash, op.path);
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
          existing && ensureNewline ? ensureSeparatorNewline(base, op.content) : "";
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
        const resolved = resolveCurrentPath(op.path);
        if (isPathResolveError(resolved)) {
          return withBatchError(resolved.error, opIndex, op.op, op.path);
        }
        const finishGuardError = ensureNotFinishGuardedMutation(
          resolved.path,
          "vfs_write(edit_lines)",
        );
        if (finishGuardError) {
          return withBatchError(finishGuardError, opIndex, op.op, op.path);
        }

        const existing = draft.readFile(resolved.path);
        const createIfMissing = op.createIfMissing ?? true;
        if (!existing && !createIfMissing) {
          return withBatchError(
            createError(`File not found: ${op.path}`, "NOT_FOUND"),
            opIndex,
            op.op,
            op.path,
          );
        }

        if (existing) {
          const seenError = requireToolSeenForExistingFile(draft, resolved.path, "text_edit");
          if (seenError) {
            return withBatchError(seenError, opIndex, op.op, op.path);
          }
          const hashError = validateExpectedHash(existing, op.expectedHash, op.path);
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
        const resolved = resolveCurrentPath(op.path);
        if (isPathResolveError(resolved)) {
          return withBatchError(resolved.error, opIndex, op.op, op.path);
        }
        const finishGuardError = ensureNotFinishGuardedMutation(
          resolved.path,
          "vfs_write(patch_json)",
        );
        if (finishGuardError) {
          return withBatchError(finishGuardError, opIndex, op.op, op.path);
        }

        const existing = draft.readFile(resolved.path);
        if (!existing) {
          return withBatchError(
            createError(`File not found: ${op.path}`, "NOT_FOUND"),
            opIndex,
            op.op,
            op.path,
          );
        }
        const seenError = requireToolSeenForExistingFile(draft, resolved.path, "edit");
        if (seenError) {
          return withBatchError(seenError, opIndex, op.op, op.path);
        }

        draft.applyJsonPatch(resolved.path, op.patch as Operation[]);
        draft.noteToolAccessFile(resolved.path);
        patched.push(toCurrentPath(resolved.path));
        continue;
      }

      if (op.op === "merge_json") {
        const resolved = resolveCurrentPath(op.path);
        if (isPathResolveError(resolved)) {
          return withBatchError(resolved.error, opIndex, op.op, op.path);
        }
        const finishGuardError = ensureNotFinishGuardedMutation(
          resolved.path,
          "vfs_write(merge_json)",
        );
        if (finishGuardError) {
          return withBatchError(finishGuardError, opIndex, op.op, op.path);
        }
        const seenError = requireToolSeenForExistingFile(draft, resolved.path, "merge");
        if (seenError) {
          return withBatchError(seenError, opIndex, op.op, op.path);
        }

        draft.mergeJson(resolved.path, op.content);
        draft.noteToolAccessFile(resolved.path);
        merged.push(toCurrentPath(resolved.path));
      }
    }

    return createSuccess(
      { written, appended, edited, patched, merged },
      "VFS write operations applied",
    );
  });
}, {
  batchFromArgs: (rawArgs) => {
    const typed = getTypedArgs("vfs_write", rawArgs);
    return { total: typed.ops.length };
  },
});

registerToolHandlerWithStructuredErrors(VFS_MOVE_TOOL, (args, ctx) => {
  const typedArgs = getTypedArgs("vfs_move", args);

  return withAtomicSession(ctx, (draft) => {
    const moved: Array<{ from: string; to: string }> = [];
    const withMoveBatchError = (
      error: ToolCallError,
      moveIndex: number,
      move: { from: string; to: string },
    ): ToolCallError =>
      withToolErrorDetails(error, "vfs_move", {
        batch: {
          index: moveIndex + 1,
          total: typedArgs.moves.length,
          operation: "move",
          path: `${move.from} -> ${move.to}`,
        },
      });

    for (const [moveIndex, move] of typedArgs.moves.entries()) {
      const resolvedFrom = resolveCurrentPath(move.from);
      if (isPathResolveError(resolvedFrom)) {
        return withMoveBatchError(resolvedFrom.error, moveIndex, move);
      }
      const resolvedTo = resolveCurrentPath(move.to);
      if (isPathResolveError(resolvedTo)) {
        return withMoveBatchError(resolvedTo.error, moveIndex, move);
      }

      const finishGuardFrom = ensureNotFinishGuardedMutation(
        resolvedFrom.path,
        "vfs_move",
      );
      if (finishGuardFrom) {
        return withMoveBatchError(finishGuardFrom, moveIndex, move);
      }
      const finishGuardTo = ensureNotFinishGuardedMutation(
        resolvedTo.path,
        "vfs_move",
      );
      if (finishGuardTo) {
        return withMoveBatchError(finishGuardTo, moveIndex, move);
      }

      const from = normalizeVfsPath(resolvedFrom.path);
      const to = normalizeVfsPath(resolvedTo.path);
      try {
        draft.renameFile(from, to);
      } catch (error) {
        if (error instanceof VfsWriteAccessError) {
          return withMoveBatchError(
            createError(error.message, error.code),
            moveIndex,
            move,
          );
        }
        const message = error instanceof Error ? error.message : String(error);
        return withMoveBatchError(
          createError(message, "NOT_FOUND"),
          moveIndex,
          move,
        );
      }

      draft.renameToolSeenPath(from, to);
      draft.noteToolAccessFile(from);
      draft.noteToolAccessFile(to);
      moved.push({ from: toCurrentPath(from), to: toCurrentPath(to) });
    }

    return createSuccess({ moved }, "VFS files moved");
  });
}, {
  batchFromArgs: (rawArgs) => {
    const typed = getTypedArgs("vfs_move", rawArgs);
    return { total: typed.moves.length };
  },
});

registerToolHandlerWithStructuredErrors(VFS_DELETE_TOOL, (args, ctx) => {
  const typedArgs = getTypedArgs("vfs_delete", args);

  return withAtomicSession(ctx, (draft) => {
    const deleted: string[] = [];
    const withDeleteBatchError = (
      error: ToolCallError,
      pathIndex: number,
      path: string,
    ): ToolCallError =>
      withToolErrorDetails(error, "vfs_delete", {
        batch: {
          index: pathIndex + 1,
          total: typedArgs.paths.length,
          operation: "delete",
          path,
        },
      });

    for (const [pathIndex, path] of typedArgs.paths.entries()) {
      const resolved = resolveCurrentPath(path);
      if (isPathResolveError(resolved)) {
        return withDeleteBatchError(resolved.error, pathIndex, path);
      }

      const finishGuard = ensureNotFinishGuardedMutation(resolved.path, "vfs_delete");
      if (finishGuard) {
        return withDeleteBatchError(finishGuard, pathIndex, path);
      }

      const normalized = normalizeVfsPath(resolved.path);
      const seenError = requireToolSeenForExistingFile(draft, normalized, "delete");
      if (seenError) {
        return withDeleteBatchError(seenError, pathIndex, path);
      }

      try {
        draft.deleteFile(normalized);
      } catch (error) {
        if (error instanceof VfsWriteAccessError) {
          return withDeleteBatchError(
            createError(error.message, error.code),
            pathIndex,
            path,
          );
        }
        const message = error instanceof Error ? error.message : String(error);
        return withDeleteBatchError(
          createError(message, "NOT_FOUND"),
          pathIndex,
          path,
        );
      }
      draft.noteToolAccessFile(normalized);
      draft.forgetToolSeenPath(normalized);
      deleted.push(toCurrentPath(normalized));
    }

    return createSuccess({ deleted }, "VFS files deleted");
  });
}, {
  batchFromArgs: (rawArgs) => {
    const typed = getTypedArgs("vfs_delete", rawArgs);
    return { total: typed.paths.length };
  },
});

registerToolHandlerWithStructuredErrors(VFS_COMMIT_TURN_TOOL, (args, ctx) => {
  const typedArgs = getTypedArgs("vfs_commit_turn", args);

  return withAtomicSession(
    ctx,
    (draft) => {
      const normalizedRetconAck =
        typedArgs.retconAck &&
        typeof typedArgs.retconAck.hash === "string" &&
        typeof typedArgs.retconAck.summary === "string"
          ? {
              hash: typedArgs.retconAck.hash,
              summary: typedArgs.retconAck.summary,
            }
          : undefined;

      if (typedArgs.retconAck && !normalizedRetconAck) {
        return createError(
          "vfs_commit_turn: retconAck must include hash and summary strings",
          "INVALID_DATA",
        );
      }

      const retconAckResult = applyCustomRulesRetconAck(draft, normalizedRetconAck);
      if (retconAckResult.ok === false) {
        return createError(retconAckResult.message, retconAckResult.code);
      }

      const existingIndex = ensureConversationIndex(draft, { operation: "finish_commit" });

      const forkId = existingIndex.activeForkId ?? 0;
      const forkKey = String(forkId);
      const order = existingIndex.turnOrderByFork?.[forkKey] ?? [];
      const latestFromIndex = existingIndex.latestTurnNumberByFork?.[forkKey];
      const latestFromOrder = order.reduce((max, id) => {
        const match = /fork-(\d+)\/turn-(\d+)/.exec(id);
        if (!match) return max;
        const turn = Number(match[2]);
        return Number.isFinite(turn) ? Math.max(max, turn) : max;
      }, -1);
      const latest =
        typeof latestFromIndex === "number" ? latestFromIndex : latestFromOrder;

      const turnNumber = latest + 1;
      const turnId = buildTurnId(forkId, turnNumber);

      const parentTurnId =
        typeof existingIndex.activeTurnId === "string" &&
        existingIndex.activeTurnId.length > 0
          ? existingIndex.activeTurnId
          : order.length > 0
            ? order[order.length - 1]
            : null;

      writeTurnFile(
        draft,
        forkId,
        turnNumber,
        {
          turnId,
          forkId,
          turnNumber,
          parentTurnId,
          createdAt: Date.now(),
          userAction: typedArgs.userAction,
          assistant: typedArgs.assistant as {
            narrative: string;
            choices: unknown[];
            narrativeTone?: string;
            atmosphere?: unknown;
            ending?: string;
            forceEnd?: boolean;
          },
        },
        { operation: "finish_commit" },
      );

      const nextOrder = order.includes(turnId) ? order : [...order, turnId];

      writeConversationIndex(
        draft,
        {
          ...existingIndex,
          activeForkId: forkId,
          activeTurnId: turnId,
          rootTurnIdByFork:
            existingIndex.rootTurnIdByFork?.[forkKey] != null
              ? existingIndex.rootTurnIdByFork
              : { ...existingIndex.rootTurnIdByFork, [forkKey]: turnId },
          latestTurnNumberByFork: {
            ...existingIndex.latestTurnNumberByFork,
            [forkKey]: turnNumber,
          },
          turnOrderByFork: {
            ...existingIndex.turnOrderByFork,
            [forkKey]: nextOrder,
          },
        },
        { operation: "finish_commit" },
      );

      return createSuccess({ turnId, forkId, turnNumber }, "Turn committed");
    },
    {
      writeContext: resolveAiWriteContext(ctx, { allowFinishGuardedWrite: true }),
    },
  );
});

registerToolHandlerWithStructuredErrors(VFS_COMMIT_SUMMARY_TOOL, (args, ctx) => {
  const typedArgs = getTypedArgs("vfs_commit_summary", args);
  const runtime = args as Record<string, unknown>;

  if ("id" in runtime || "createdAt" in runtime) {
    return createError(
      "vfs_commit_summary: runtime fields id/createdAt are system-managed and must not be provided by AI.",
      "INVALID_DATA",
    );
  }

  const nodeRangeRaw = runtime.nodeRange as
    | { fromIndex?: unknown; toIndex?: unknown }
    | undefined;
  const lastSummarizedIndexRaw = runtime.lastSummarizedIndex;

  const fromIndex =
    typeof nodeRangeRaw?.fromIndex === "number" &&
    Number.isFinite(nodeRangeRaw.fromIndex)
      ? Math.floor(nodeRangeRaw.fromIndex)
      : null;
  const toIndex =
    typeof nodeRangeRaw?.toIndex === "number" &&
    Number.isFinite(nodeRangeRaw.toIndex)
      ? Math.floor(nodeRangeRaw.toIndex)
      : null;
  const lastSummarizedIndex =
    typeof lastSummarizedIndexRaw === "number" && Number.isFinite(lastSummarizedIndexRaw)
      ? Math.floor(lastSummarizedIndexRaw)
      : null;

  if (fromIndex === null || toIndex === null || lastSummarizedIndex === null) {
    return createError(
      "vfs_commit_summary: runtime fields nodeRange and lastSummarizedIndex are required. They must be injected by summary loop.",
      "INVALID_DATA",
    );
  }

  if (lastSummarizedIndex !== toIndex + 1) {
    return createError(
      `vfs_commit_summary: lastSummarizedIndex must equal nodeRange.toIndex + 1 (expected ${toIndex + 1}, got ${lastSummarizedIndex})`,
      "INVALID_DATA",
    );
  }

  return withAtomicSession(
    ctx,
    (draft) => {
      const existingFile = draft.readFile("summary/state.json");
      const parsed = existingFile ? safeParseJson(existingFile.content) : null;
      const existingState = parsed as any;
      const existingSummaries = Array.isArray(existingState?.summaries)
        ? existingState.summaries
        : [];

      const maxId = existingSummaries.reduce((max: number, summary: any) => {
        const id = summary?.id;
        return typeof id === "number" && Number.isFinite(id) ? Math.max(max, id) : max;
      }, -1);
      const nextId = maxId + 1;

      const summary = {
        id: nextId,
        createdAt: Date.now(),
        displayText: typedArgs.displayText,
        visible: typedArgs.visible,
        hidden: typedArgs.hidden,
        timeRange: typedArgs.timeRange ?? null,
        nodeRange: {
          fromIndex,
          toIndex,
        },
        nextSessionReferencesMarkdown:
          typedArgs.nextSessionReferencesMarkdown ?? null,
      };

      const nextSummaries = [...existingSummaries, summary];
      draft.mergeJson(
        "summary/state.json",
        {
          summaries: nextSummaries,
          lastSummarizedIndex,
        },
        { operation: "finish_summary" },
      );

      return createSuccess(
        { summary, path: "current/summary/state.json" },
        "Summary committed",
      );
    },
    {
      writeContext: resolveAiWriteContext(ctx, { allowFinishGuardedWrite: true }),
    },
  );
});

const OUTLINE_PHASE_SCHEMAS = [
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

const formatOutlineCommitValidationError = (error: unknown): string => {
  const err = error as any;
  const issues = err?.issues;
  if (!Array.isArray(issues)) {
    return String(err?.message ?? error);
  }
  return issues
    .slice(0, 12)
    .map((issue: any) => {
      const path = Array.isArray(issue?.path)
        ? issue.path
            .map((part: unknown) =>
              typeof part === "number" ? `[${part}]` : String(part),
            )
            .join(".")
            .replace(/\.\[/g, "[")
        : "";
      const message = typeof issue?.message === "string" ? issue.message : "Invalid";
      return path ? `${path}: ${message}` : message;
    })
    .join("; ");
};

const OUTLINE_COMMIT_DEFS = VFS_COMMIT_OUTLINE_PHASE_TOOLS.map((tool, phase) => ({
  tool,
  phase,
  schema: OUTLINE_PHASE_SCHEMAS[phase],
}));

for (const { tool, phase, schema } of OUTLINE_COMMIT_DEFS) {
  registerToolHandlerWithStructuredErrors(tool, (args, ctx) => {
    const parsedArgs = tool.parameters.safeParse(args);
    if (!parsedArgs.success) {
      return createError(
        `${tool.name}: invalid arguments: ${formatOutlineCommitValidationError(parsedArgs.error)}`,
        "INVALID_DATA",
      );
    }

    const parsedData = schema.safeParse(parsedArgs.data.data);
    if (!parsedData.success) {
      return createError(
        `${tool.name}: schema validation failed: ${formatOutlineCommitValidationError(parsedData.error)}`,
        "INVALID_DATA",
      );
    }

    return withAtomicSession(
      ctx,
      (draft) => {
        const path = `outline/phases/phase${phase}.json`;
        draft.writeFile(path, JSON.stringify(parsedData.data), "application/json");

        let planPath: string | undefined;
        if (phase === 1) {
          const storyPlanMarkdown = (parsedData.data as any)?.storyPlanMarkdown;
          if (typeof storyPlanMarkdown === "string") {
            writeOutlineStoryPlan(draft, storyPlanMarkdown);
            planPath = toCurrentPath("outline/story_outline/plan.md");
          }
        }

        return createSuccess(
          planPath
            ? { phase, path: toCurrentPath(path), planPath }
            : { phase, path: toCurrentPath(path) },
          `Outline phase ${phase} committed`,
        );
      },
      {
        writeContext: resolveAiWriteContext(ctx),
      },
    );
  });
}
