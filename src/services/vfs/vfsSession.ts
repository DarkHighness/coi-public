import { applyPatch as applyJsonPatch } from "fast-json-patch/module/core.mjs";
import * as lzStringModule from "lz-string";
import { z } from "zod";
import { getSchemaForPath } from "./schemas";
import {
  VfsFile,
  VfsFileMap,
  VfsContentType,
  VfsReadFenceState,
  VfsReadEpochReason,
} from "./types";
import { normalizeVfsPath, hashContent } from "./utils";
import { deepMergeJson } from "./merge";
import { toCurrentPath } from "./currentAlias";
import { buildGlobalVfsSkills } from "./globalSkills";
import { buildGlobalVfsRefs } from "./globalRefs";
import { vfsPathRegistry } from "./core/pathRegistry";
import { vfsPolicyEngine } from "./core/policyEngine";
import {
  canonicalToLogicalVfsPath,
  resolveVfsPath,
  toCanonicalVfsPath,
} from "./core/pathResolver";
import type { VfsWriteContext, VfsWriteOperation } from "./core/types";
import {
  formatJsonValidationSummary,
  summarizeJsonValidationError,
} from "./jsonValidationSummary";
import type { Operation } from "./jsonPatchTypes";

type ApplyPatchFn = (
  document: unknown,
  patch: Operation[],
  validateOperation?: boolean,
  mutateDocument?: boolean,
) => { newDocument: unknown };

type LzStringApi = {
  compressToUTF16: (input: string) => string;
  decompressFromUTF16: (input: string) => string | null;
};

const lzStringApi: LzStringApi =
  (
    lzStringModule as unknown as {
      default?: Partial<LzStringApi>;
    }
  ).default &&
  typeof (
    lzStringModule as unknown as {
      default?: Partial<LzStringApi>;
    }
  ).default?.compressToUTF16 === "function"
    ? (lzStringModule as unknown as { default: LzStringApi }).default
    : (lzStringModule as unknown as LzStringApi);

const { compressToUTF16, decompressFromUTF16 } = lzStringApi;

const cloneFiles = (files: VfsFileMap): VfsFileMap => {
  const cloned: VfsFileMap = {};
  for (const [path, file] of Object.entries(files)) {
    cloned[path] = { ...file };
  }
  return cloned;
};

const mergeFiles = (a: VfsFileMap, b: VfsFileMap): VfsFileMap => {
  const merged: VfsFileMap = {};
  for (const [path, file] of Object.entries(a)) {
    merged[path] = { ...file };
  }
  for (const [path, file] of Object.entries(b)) {
    merged[path] = { ...file };
  }
  return merged;
};

const canonicalizeFileMap = (
  files: VfsFileMap,
  activeForkId: number,
): VfsFileMap => {
  const canonical: VfsFileMap = {};
  for (const file of Object.values(files)) {
    const canonicalPath = toCanonicalVfsPath(file.path, { activeForkId });
    canonical[canonicalPath] = {
      ...file,
      path: canonicalPath,
    };
  }
  return canonical;
};

const toDisplayFileMap = (
  files: VfsFileMap,
  activeForkId: number,
): VfsFileMap => {
  const display: VfsFileMap = {};
  for (const file of Object.values(files)) {
    const displayPath = canonicalToLogicalVfsPath(file.path, {
      activeForkId,
    });
    const normalizedDisplayPath = normalizeVfsPath(displayPath || file.path);
    display[normalizedDisplayPath] = {
      ...file,
      path: normalizedDisplayPath,
    };
  }
  return display;
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

  for (const key of Object.keys(input as JsonObject)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      return true;
    }

    if (!Object.prototype.hasOwnProperty.call(parsed, key)) {
      return true;
    }
    if (
      hasUnknownKeys((input as JsonObject)[key], (parsed as JsonObject)[key])
    ) {
      return true;
    }
  }

  return false;
};

const VIEW_ENTITY_ID_PATH_PATTERN =
  /^world\/characters\/[^/]+\/views\/(quests|knowledge|timeline|locations|factions|causal_chains)\/([^/]+)\.json$/;

const PROFILE_PATH_PATTERN = /^world\/characters\/[^/]+\/profile\.json$/;
const TOP_LEVEL_UNLOCK_PATH_PATTERNS: RegExp[] = [
  PROFILE_PATH_PATTERN,
  /^world\/characters\/[^/]+\/inventory\/[^/]+\.json$/,
  /^world\/characters\/[^/]+\/skills\/[^/]+\.json$/,
  /^world\/characters\/[^/]+\/conditions\/[^/]+\.json$/,
  /^world\/characters\/[^/]+\/traits\/[^/]+\.json$/,
  /^world\/characters\/[^/]+\/views\/(quests|knowledge|timeline|locations|factions|causal_chains)\/[^/]+\.json$/,
];
const WORLD_INFO_VIEW_PATH_PATTERN =
  /^world\/characters\/[^/]+\/views\/world_info\.json$/;

const ENTITY_LOGICAL_WORLD_PATH_PATTERNS: RegExp[] = [
  /^world\/world_info\.json$/,
  /^world\/characters\/[^/]+\/profile\.json$/,
  /^world\/characters\/[^/]+\/(skills|conditions|traits|inventory)\/[^/]+\.json$/,
  /^world\/locations\/[^/]+\.json$/,
  /^world\/locations\/[^/]+\/items\/[^/]+\.json$/,
  /^world\/(quests|knowledge|timeline|factions|causal_chains)\/[^/]+\.json$/,
];

const CANONICAL_WORLD_PATH_PATTERN = /^forks\/([^/]+)\/story\/(world\/.+)$/;
const CANONICAL_SESSION_JSONL_PATH_PATTERN =
  /^forks\/[^/]+\/runtime\/session\/[^/]+\.jsonl$/;
const COMPRESSED_SESSION_PREFIX = "__vfs_lz16__:";

const isEntityLogicalWorldPath = (path: string): boolean =>
  ENTITY_LOGICAL_WORLD_PATH_PATTERNS.some((pattern) => pattern.test(path));

const toPlaceholderDraftLogicalCandidates = (
  logicalWorldPath: string,
): string[] => {
  const normalized = normalizeVfsPath(logicalWorldPath);
  if (!isEntityLogicalWorldPath(normalized)) {
    return [];
  }

  if (normalized.startsWith("world/placeholders/")) {
    return [];
  }

  if (!normalized.endsWith(".json")) {
    return [];
  }

  const rest = normalized.slice("world/".length, -".json".length);
  const candidates = new Set<string>([`world/placeholders/${rest}.md`]);
  const segments = rest.split("/").filter(Boolean);
  if (segments.length === 0) {
    return Array.from(candidates);
  }

  if (rest.endsWith("/profile")) {
    const withoutProfile = rest.slice(0, -"/profile".length);
    if (withoutProfile.length > 0) {
      candidates.add(`world/placeholders/${withoutProfile}.md`);
    }
  }

  let entityId = segments[segments.length - 1] ?? "";
  if (entityId === "profile" && segments.length >= 2) {
    entityId = segments[segments.length - 2] ?? "";
  }

  if (entityId.length > 0) {
    candidates.add(`world/placeholders/${entityId}.md`);
    if (segments.length >= 2) {
      candidates.add(`world/placeholders/${segments[0]}/${entityId}.md`);
    }
  }

  return Array.from(candidates);
};

const toPlaceholderDraftCanonicalCandidates = (
  canonicalEntityPath: string,
): string[] => {
  const normalized = normalizeVfsPath(canonicalEntityPath);
  const match = CANONICAL_WORLD_PATH_PATTERN.exec(normalized);
  if (!match) {
    return [];
  }

  const forkId = match[1];
  const logicalWorldPath = match[2];
  if (!forkId || !logicalWorldPath) {
    return [];
  }

  const storyPrefix = `forks/${forkId}/story`;
  return toPlaceholderDraftLogicalCandidates(logicalWorldPath).map((path) =>
    normalizeVfsPath(`${storyPrefix}/${path}`),
  );
};

const toObjectRecord = (value: unknown): JsonObject | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as JsonObject;
};

const readBoolean = (value: unknown): boolean | null =>
  typeof value === "boolean" ? value : null;

const readJsonObjectFromFile = (file: VfsFile | undefined): unknown => {
  if (!file || file.contentType !== "application/json") {
    return null;
  }
  try {
    return JSON.parse(file.content) as unknown;
  } catch {
    return null;
  }
};

const DEFAULT_SYSTEM_WRITE_CONTEXT: VfsWriteContext = {
  actor: "system",
  mode: "normal",
  allowFinishGuardedWrite: true,
};

const applyPatchFn: ApplyPatchFn = (
  document,
  patch,
  validateOperation,
  mutateDocument,
) =>
  applyJsonPatch(
    document,
    patch as Parameters<typeof applyJsonPatch>[1],
    validateOperation,
    mutateDocument,
  );

const normalizeErrorWhitespace = (message: string): string =>
  message.replace(/\s+/g, " ").trim();

const shouldCompressSessionJsonl = (
  canonicalPath: string,
  contentType: VfsContentType,
): boolean =>
  contentType === "application/jsonl" &&
  CANONICAL_SESSION_JSONL_PATH_PATTERN.test(canonicalPath);

const tryCompressSessionContent = (
  canonicalPath: string,
  contentType: VfsContentType,
  content: string,
): string => {
  if (!shouldCompressSessionJsonl(canonicalPath, contentType)) {
    return content;
  }

  try {
    const compressed = compressToUTF16(content);
    if (typeof compressed !== "string" || compressed.length === 0) {
      return content;
    }
    return `${COMPRESSED_SESSION_PREFIX}${compressed}`;
  } catch (error) {
    console.warn(
      `[VfsSession] Failed to compress session jsonl (${canonicalPath}), using plain text.`,
      error,
    );
    return content;
  }
};

const tryDecompressSessionContent = (
  canonicalPath: string,
  contentType: VfsContentType,
  storedContent: string,
): string => {
  if (!shouldCompressSessionJsonl(canonicalPath, contentType)) {
    return storedContent;
  }
  if (!storedContent.startsWith(COMPRESSED_SESSION_PREFIX)) {
    return storedContent;
  }

  const payload = storedContent.slice(COMPRESSED_SESSION_PREFIX.length);
  try {
    const decompressed = decompressFromUTF16(payload);
    if (typeof decompressed !== "string") {
      return storedContent;
    }
    return decompressed;
  } catch (error) {
    console.warn(
      `[VfsSession] Failed to decompress session jsonl (${canonicalPath}), falling back to stored content.`,
      error,
    );
    return storedContent;
  }
};

const stripJsonPatchTreeDump = (message: string): string =>
  message.replace(/\s+tree:\s+\{[\s\S]*$/i, "").trim();

const extractJsonPatchPointer = (message: string): string | null => {
  const pointerMatch = message.match(/"path"\s*:\s*"([^"]+)"/);
  if (pointerMatch && pointerMatch[1]) {
    return pointerMatch[1];
  }
  const inlineMatch = message.match(/\bpath:\s*([^\s,;]+)/i);
  if (inlineMatch && inlineMatch[1]) {
    return inlineMatch[1].replace(/^"|"$/g, "");
  }
  return null;
};

const formatJsonPatchApplyError = (
  canonicalPath: string,
  rawMessage: string,
): string => {
  const compact = normalizeErrorWhitespace(stripJsonPatchTreeDump(rawMessage));

  if (
    /OPERATION_PATH_UNRESOLVABLE/i.test(compact) ||
    /Cannot perform the operation at a path that does not exist/i.test(compact)
  ) {
    const pointer = extractJsonPatchPointer(compact) ?? "(unknown pointer)";
    return (
      `JSON patch failed for ${canonicalPath}: pointer "${pointer}" does not exist in the target document. ` +
      "Read the file and patch a valid pointer path."
    );
  }

  return `JSON patch failed for ${canonicalPath}: ${compact}`;
};

type OutOfBandPathChangeType = "added" | "deleted" | "modified";

export type OutOfBandReadInvalidation =
  | { path: string; changeType: OutOfBandPathChangeType }
  | { from: string; to: string; changeType: "moved" };

export class VfsWriteAccessError extends Error {
  public readonly code:
    | "IMMUTABLE_READONLY"
    | "ELEVATION_REQUIRED"
    | "FINISH_GUARD_REQUIRED"
    | "EDITOR_CONFIRM_REQUIRED";

  constructor(
    code:
      | "IMMUTABLE_READONLY"
      | "ELEVATION_REQUIRED"
      | "FINISH_GUARD_REQUIRED"
      | "EDITOR_CONFIRM_REQUIRED",
    message: string,
  ) {
    super(message);
    this.name = "VfsWriteAccessError";
    this.code = code;
  }
}

export interface VfsWriteOptions {
  writeContext?: VfsWriteContext;
  operation?: VfsWriteOperation;
}

export interface VfsSearchMatch {
  path: string;
  line: number;
  text: string;
}

export interface VfsSearchOptions {
  path?: string;
  limit?: number;
  semantic?: boolean;
}

export interface VfsGrepOptions {
  path?: string;
  limit?: number;
}

export type VfsSemanticIndexer = (
  query: string,
  options: Omit<VfsSearchOptions, "semantic">,
) => VfsSearchMatch[];

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
): VfsSearchMatch[] => {
  const matches: VfsSearchMatch[] = [];

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

export class VfsSession {
  private files: VfsFileMap = {};
  private activeForkId = 0;
  private readonlyFiles: VfsFileMap = canonicalizeFileMap(
    mergeFiles(buildGlobalVfsSkills(), buildGlobalVfsRefs()),
    0,
  );
  private semanticIndexer?: VfsSemanticIndexer;
  private currentReadEpoch = 0;
  private seenByEpoch = new Map<string, number>();
  private accessedFilesByEpoch = new Map<string, number>();
  private accessedScopesByEpoch = new Map<string, number>();
  private boundConversationSessionId: string | null = null;
  private outOfBandReadInvalidations = new Map<
    string,
    OutOfBandPathChangeType
  >();
  private outOfBandMoveInvalidations = new Map<
    string,
    { from: string; to: string }
  >();
  private activeWriteContext: VfsWriteContext | null = null;

  constructor(options?: { semanticIndexer?: VfsSemanticIndexer }) {
    this.semanticIndexer = options?.semanticIndexer;
  }

  public setActiveForkId(forkId: number): void {
    this.activeForkId =
      Number.isFinite(forkId) && forkId >= 0 ? Math.floor(forkId) : 0;
  }

  public getActiveForkId(): number {
    return this.activeForkId;
  }

  private resolveCanonicalPath(
    path: string,
    override?: VfsWriteContext,
  ): string {
    const context =
      override ?? this.activeWriteContext ?? DEFAULT_SYSTEM_WRITE_CONTEXT;
    const activeForkId =
      typeof context.activeForkId === "number"
        ? context.activeForkId
        : this.activeForkId;
    return toCanonicalVfsPath(path, { activeForkId });
  }

  private toDisplayPath(path: string): string {
    return normalizeVfsPath(
      canonicalToLogicalVfsPath(path, {
        activeForkId: this.activeForkId,
      }) || path,
    );
  }

  private toReadableContent(file: VfsFile): string {
    return tryDecompressSessionContent(
      file.path,
      file.contentType,
      file.content,
    );
  }

  private toReadableFile(file: VfsFile, pathOverride?: string): VfsFile {
    const content = this.toReadableContent(file);
    return {
      ...file,
      path: pathOverride ?? file.path,
      content,
      size: content.length,
      hash: hashContent(content),
    };
  }

  public noteToolSeen(path: string): void {
    const canonicalPath = this.resolveCanonicalPath(path);
    this.seenByEpoch.set(canonicalPath, this.currentReadEpoch);
    this.outOfBandReadInvalidations.delete(canonicalPath);
  }

  public noteToolAccessFile(path: string): void {
    const canonicalPath = this.resolveCanonicalPath(path);
    this.accessedFilesByEpoch.set(canonicalPath, this.currentReadEpoch);
    this.outOfBandReadInvalidations.delete(canonicalPath);
    for (const [key, move] of this.outOfBandMoveInvalidations.entries()) {
      if (move.from === canonicalPath || move.to === canonicalPath) {
        this.outOfBandMoveInvalidations.delete(key);
      }
    }
  }

  public noteToolAccessScope(path: string): void {
    const normalizedScope = normalizeVfsPath(path);
    const canonicalScope = normalizedScope
      ? this.resolveCanonicalPath(normalizedScope)
      : "";
    this.accessedScopesByEpoch.set(canonicalScope, this.currentReadEpoch);
  }

  public noteToolSeenMany(paths: string[]): void {
    for (const path of paths) {
      this.noteToolSeen(path);
    }
  }

  public hasToolSeen(path: string): boolean {
    return this.hasToolSeenInCurrentEpoch(path);
  }

  public hasToolSeenInCurrentEpoch(path: string): boolean {
    const canonicalPath = this.resolveCanonicalPath(path);
    return this.seenByEpoch.get(canonicalPath) === this.currentReadEpoch;
  }

  public hasToolAccessedInCurrentEpoch(path: string): boolean {
    const canonicalPath = this.resolveCanonicalPath(path);
    if (
      this.accessedFilesByEpoch.get(canonicalPath) === this.currentReadEpoch
    ) {
      return true;
    }

    for (const [scopePath, epoch] of this.accessedScopesByEpoch.entries()) {
      if (epoch !== this.currentReadEpoch) {
        continue;
      }
      if (
        scopePath === "" ||
        canonicalPath === scopePath ||
        canonicalPath.startsWith(`${scopePath}/`)
      ) {
        return true;
      }
    }

    return false;
  }

  public snapshotToolSeenPaths(): string[] {
    const paths: string[] = [];
    for (const [path, epoch] of this.seenByEpoch.entries()) {
      if (epoch === this.currentReadEpoch) {
        paths.push(this.toDisplayPath(path));
      }
    }
    return paths;
  }

  public restoreToolSeenPaths(paths: string[]): void {
    this.seenByEpoch.clear();
    for (const path of paths) {
      const canonicalPath = this.resolveCanonicalPath(path);
      this.seenByEpoch.set(canonicalPath, this.currentReadEpoch);
    }
  }

  public snapshotReadFenceState(): VfsReadFenceState {
    const seenByEpoch: Record<string, number> = {};
    const accessedFilesByEpoch: Record<string, number> = {};
    const accessedScopesByEpoch: Record<string, number> = {};
    for (const [path, epoch] of this.seenByEpoch.entries()) {
      seenByEpoch[path] = epoch;
    }
    for (const [path, epoch] of this.accessedFilesByEpoch.entries()) {
      accessedFilesByEpoch[path] = epoch;
    }
    for (const [path, epoch] of this.accessedScopesByEpoch.entries()) {
      accessedScopesByEpoch[path] = epoch;
    }
    return {
      currentReadEpoch: this.currentReadEpoch,
      seenByEpoch,
      accessedFilesByEpoch,
      accessedScopesByEpoch,
      boundConversationSessionId: this.boundConversationSessionId,
    };
  }

  public restoreReadFenceState(state: VfsReadFenceState): void {
    this.currentReadEpoch =
      typeof state.currentReadEpoch === "number" &&
      Number.isFinite(state.currentReadEpoch) &&
      state.currentReadEpoch >= 0
        ? Math.floor(state.currentReadEpoch)
        : 0;
    this.boundConversationSessionId =
      typeof state.boundConversationSessionId === "string" &&
      state.boundConversationSessionId.trim().length > 0
        ? state.boundConversationSessionId
        : null;

    this.seenByEpoch.clear();
    this.accessedFilesByEpoch.clear();
    this.accessedScopesByEpoch.clear();
    for (const [path, epoch] of Object.entries(state.seenByEpoch ?? {})) {
      if (typeof epoch !== "number" || !Number.isFinite(epoch)) {
        continue;
      }
      const canonicalPath = this.resolveCanonicalPath(path);
      this.seenByEpoch.set(canonicalPath, Math.floor(epoch));
    }
    for (const [path, epoch] of Object.entries(
      state.accessedFilesByEpoch ?? {},
    )) {
      if (typeof epoch !== "number" || !Number.isFinite(epoch)) {
        continue;
      }
      const canonicalPath = this.resolveCanonicalPath(path);
      this.accessedFilesByEpoch.set(canonicalPath, Math.floor(epoch));
    }
    for (const [path, epoch] of Object.entries(
      state.accessedScopesByEpoch ?? {},
    )) {
      if (typeof epoch !== "number" || !Number.isFinite(epoch)) {
        continue;
      }
      const normalizedScope = normalizeVfsPath(path);
      const canonicalPath = normalizedScope
        ? this.resolveCanonicalPath(normalizedScope)
        : "";
      this.accessedScopesByEpoch.set(canonicalPath, Math.floor(epoch));
    }

    this.outOfBandReadInvalidations.clear();
    this.outOfBandMoveInvalidations.clear();
  }

  public beginReadEpoch(_reason: VfsReadEpochReason): void {
    this.currentReadEpoch += 1;
  }

  public bindConversationSession(sessionId: string): { changed: boolean } {
    const normalized = sessionId.trim();
    if (!normalized) {
      return { changed: false };
    }
    if (this.boundConversationSessionId === normalized) {
      return { changed: false };
    }
    this.boundConversationSessionId = normalized;
    this.beginReadEpoch("session_switch");
    return { changed: true };
  }

  public renameToolSeenPath(from: string, to: string): void {
    const canonicalFrom = this.resolveCanonicalPath(from);
    const canonicalTo = this.resolveCanonicalPath(to);
    const epoch = this.seenByEpoch.get(canonicalFrom);
    if (epoch === undefined) {
      return;
    }
    this.seenByEpoch.delete(canonicalFrom);
    this.seenByEpoch.set(canonicalTo, epoch);
  }

  public forgetToolSeenPath(path: string): void {
    this.seenByEpoch.delete(this.resolveCanonicalPath(path));
  }

  public noteOutOfBandMutation(
    path: string,
    changeType: OutOfBandPathChangeType,
  ): void {
    const canonicalPath = this.resolveCanonicalPath(path);
    if (!canonicalPath) {
      return;
    }

    this.seenByEpoch.delete(canonicalPath);
    this.accessedFilesByEpoch.delete(canonicalPath);
    this.outOfBandReadInvalidations.set(canonicalPath, changeType);
  }

  public noteOutOfBandMove(from: string, to: string): void {
    const canonicalFrom = this.resolveCanonicalPath(from);
    const canonicalTo = this.resolveCanonicalPath(to);
    if (!canonicalFrom || !canonicalTo || canonicalFrom === canonicalTo) {
      return;
    }

    this.seenByEpoch.delete(canonicalFrom);
    this.seenByEpoch.delete(canonicalTo);
    this.accessedFilesByEpoch.delete(canonicalFrom);
    this.accessedFilesByEpoch.delete(canonicalTo);
    this.outOfBandReadInvalidations.delete(canonicalFrom);
    this.outOfBandReadInvalidations.delete(canonicalTo);
    this.outOfBandMoveInvalidations.set(`${canonicalFrom}->${canonicalTo}`, {
      from: canonicalFrom,
      to: canonicalTo,
    });
  }

  public drainOutOfBandReadInvalidations(): OutOfBandReadInvalidation[] {
    const pathInvalidations: OutOfBandReadInvalidation[] = Array.from(
      this.outOfBandReadInvalidations.entries(),
    ).map(([path, changeType]) => ({
      path: this.toDisplayPath(path),
      changeType,
    }));
    const movedInvalidations: OutOfBandReadInvalidation[] = Array.from(
      this.outOfBandMoveInvalidations.values(),
    ).map((move) => ({
      from: this.toDisplayPath(move.from),
      to: this.toDisplayPath(move.to),
      changeType: "moved" as const,
    }));
    const drained = [...pathInvalidations, ...movedInvalidations].sort(
      (a, b) => {
        const left = "path" in a ? a.path : `${a.from}->${a.to}`;
        const right = "path" in b ? b.path : `${b.from}->${b.to}`;
        return left.localeCompare(right);
      },
    );
    this.outOfBandReadInvalidations.clear();
    this.outOfBandMoveInvalidations.clear();
    return drained;
  }

  public withWriteContext<T>(context: VfsWriteContext, action: () => T): T {
    const previous = this.activeWriteContext;
    const previousForkId = this.activeForkId;
    this.activeWriteContext = context;
    if (typeof context.activeForkId === "number") {
      this.activeForkId = context.activeForkId;
    }
    try {
      return action();
    } finally {
      this.activeWriteContext = previous;
      this.activeForkId = previousForkId;
    }
  }

  private resolveWriteContext(override?: VfsWriteContext): VfsWriteContext {
    if (override) {
      return {
        ...override,
        activeForkId:
          typeof override.activeForkId === "number"
            ? override.activeForkId
            : this.activeForkId,
      };
    }
    if (this.activeWriteContext) {
      return {
        ...this.activeWriteContext,
        activeForkId:
          typeof this.activeWriteContext.activeForkId === "number"
            ? this.activeWriteContext.activeForkId
            : this.activeForkId,
      };
    }
    return {
      ...DEFAULT_SYSTEM_WRITE_CONTEXT,
      activeForkId: this.activeForkId,
    };
  }

  private isImmutableReadOnlyPath(path: string): boolean {
    const canonicalPath = this.resolveCanonicalPath(path);
    return vfsPathRegistry.isImmutableReadonly(canonicalPath, {
      activeForkId: this.activeForkId,
    });
  }

  private assertWritablePath(
    path: string,
    options?: VfsWriteOptions,
    fallbackOperation: VfsWriteOperation = "write",
  ): string {
    const writeContext = this.resolveWriteContext(options?.writeContext);
    const canonicalPath = this.resolveCanonicalPath(path, writeContext);
    const requestedOperation =
      options?.operation ?? writeContext.operation ?? fallbackOperation;
    const decision = vfsPolicyEngine.canWrite(canonicalPath, {
      ...writeContext,
      operation: requestedOperation,
      activeForkId:
        typeof writeContext.activeForkId === "number"
          ? writeContext.activeForkId
          : this.activeForkId,
    });

    if (!decision.allowed) {
      const errorCode =
        decision.code === "OK" ? "IMMUTABLE_READONLY" : decision.code;
      const displayPath = toCurrentPath(canonicalPath, {
        activeForkId:
          typeof writeContext.activeForkId === "number"
            ? writeContext.activeForkId
            : this.activeForkId,
      });
      throw new VfsWriteAccessError(
        errorCode,
        `${decision.reason} (${displayPath})`,
      );
    }

    return canonicalPath;
  }

  private normalizeJsonDocumentForPath(
    canonicalPath: string,
    value: unknown,
  ): unknown {
    const normalizedPath = normalizeVfsPath(
      canonicalToLogicalVfsPath(canonicalPath, {
        activeForkId: this.activeForkId,
        looseFork: true,
      }) || canonicalPath,
    );
    const viewMatch = VIEW_ENTITY_ID_PATH_PATTERN.exec(normalizedPath);
    if (!viewMatch) {
      return value;
    }

    const record = toObjectRecord(value);
    if (!record) {
      return value;
    }

    if (Object.prototype.hasOwnProperty.call(record, "entityId")) {
      return value;
    }

    const entityId = viewMatch[2];
    return {
      ...record,
      entityId,
    };
  }

  private assertUnlockRegressionForbidden(
    canonicalPath: string,
    previous: unknown,
    next: unknown,
  ): void {
    const normalizedPath = normalizeVfsPath(
      canonicalToLogicalVfsPath(canonicalPath, {
        activeForkId: this.activeForkId,
        looseFork: true,
      }) || canonicalPath,
    );
    const previousRecord = toObjectRecord(previous);
    const nextRecord = toObjectRecord(next);
    if (!previousRecord || !nextRecord) {
      return;
    }

    const violations: string[] = [];

    const shouldCheckTopLevelUnlock = TOP_LEVEL_UNLOCK_PATH_PATTERNS.some(
      (pattern) => pattern.test(normalizedPath),
    );
    if (shouldCheckTopLevelUnlock) {
      const previousUnlocked = readBoolean(previousRecord.unlocked);
      const nextUnlocked = readBoolean(nextRecord.unlocked);
      if (previousUnlocked === true && nextUnlocked === false) {
        violations.push("unlocked");
      }
    }

    if (PROFILE_PATH_PATTERN.test(normalizedPath)) {
      const previousRelations = Array.isArray(previousRecord.relations)
        ? (previousRecord.relations as unknown[])
        : [];
      const nextRelations = Array.isArray(nextRecord.relations)
        ? (nextRecord.relations as unknown[])
        : [];

      const nextById = new Map<string, JsonObject>();
      for (const relation of nextRelations) {
        const relationRecord = toObjectRecord(relation);
        if (!relationRecord) continue;
        const relationId = relationRecord.id;
        if (typeof relationId !== "string" || relationId.trim().length === 0) {
          continue;
        }
        nextById.set(relationId, relationRecord);
      }

      for (const relation of previousRelations) {
        const previousRelation = toObjectRecord(relation);
        if (!previousRelation) continue;
        const relationId = previousRelation.id;
        if (typeof relationId !== "string" || relationId.trim().length === 0) {
          continue;
        }
        const previousUnlocked = readBoolean(previousRelation.unlocked);
        if (previousUnlocked !== true) continue;
        const nextRelation = nextById.get(relationId);
        if (!nextRelation) continue;
        const nextUnlocked = readBoolean(nextRelation.unlocked);
        if (nextUnlocked === false) {
          violations.push(`relations[id=${relationId}].unlocked`);
        }
      }
    }

    if (WORLD_INFO_VIEW_PATH_PATTERN.test(normalizedPath)) {
      const previousWorldSettingUnlocked = readBoolean(
        previousRecord.worldSettingUnlocked,
      );
      const nextWorldSettingUnlocked = readBoolean(
        nextRecord.worldSettingUnlocked,
      );
      if (
        previousWorldSettingUnlocked === true &&
        nextWorldSettingUnlocked === false
      ) {
        violations.push("worldSettingUnlocked");
      }

      const previousMainGoalUnlocked = readBoolean(
        previousRecord.mainGoalUnlocked,
      );
      const nextMainGoalUnlocked = readBoolean(nextRecord.mainGoalUnlocked);
      if (previousMainGoalUnlocked === true && nextMainGoalUnlocked === false) {
        violations.push("mainGoalUnlocked");
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `Unlock regression is not allowed for ${canonicalPath}: ${violations.join(", ")} cannot change from true to false.`,
      );
    }
  }

  private removePlaceholderDraftsForPromotedEntity(
    canonicalPath: string,
  ): void {
    const candidates = toPlaceholderDraftCanonicalCandidates(canonicalPath);
    for (const draftCanonicalPath of candidates) {
      if (!this.files[draftCanonicalPath]) {
        continue;
      }
      delete this.files[draftCanonicalPath];
      this.seenByEpoch.delete(draftCanonicalPath);
      this.accessedFilesByEpoch.delete(draftCanonicalPath);
      this.outOfBandReadInvalidations.delete(draftCanonicalPath);
    }
  }

  public writeFile(
    path: string,
    content: string,
    contentType: VfsContentType,
    options?: VfsWriteOptions,
  ) {
    const canonicalPath = this.assertWritablePath(path, options, "write");
    let normalizedContent = content;

    if (contentType === "application/json") {
      let parsedNext: unknown;
      try {
        parsedNext = JSON.parse(content) as unknown;
      } catch (error) {
        throw new Error(`Invalid JSON content: ${canonicalPath}`, {
          cause: error,
        });
      }

      const normalizedNext = this.normalizeJsonDocumentForPath(
        canonicalPath,
        parsedNext,
      );
      const existing =
        this.files[canonicalPath] ?? this.readonlyFiles[canonicalPath];
      const parsedPrevious = readJsonObjectFromFile(existing);
      this.assertUnlockRegressionForbidden(
        canonicalPath,
        parsedPrevious,
        normalizedNext,
      );

      normalizedContent = JSON.stringify(normalizedNext);
    }

    const hash = hashContent(normalizedContent);
    const storedContent = tryCompressSessionContent(
      canonicalPath,
      contentType,
      normalizedContent,
    );
    this.files[canonicalPath] = {
      path: canonicalPath,
      content: storedContent,
      contentType,
      hash,
      size: normalizedContent.length,
      updatedAt: Date.now(),
    };

    if (contentType === "application/json") {
      this.removePlaceholderDraftsForPromotedEntity(canonicalPath);
    }
  }

  public readFile(path: string): VfsFile | null {
    const canonicalPath = this.resolveCanonicalPath(path);
    const file = this.files[canonicalPath] ?? this.readonlyFiles[canonicalPath];
    if (!file) {
      return null;
    }

    const normalizedInput = normalizeVfsPath(path);
    const pathForRead =
      normalizedInput.startsWith("shared/") ||
      normalizedInput.startsWith("forks/")
        ? canonicalPath
        : this.toDisplayPath(canonicalPath);

    return this.toReadableFile(file, pathForRead);
  }

  public snapshot(): VfsFileMap {
    const display: VfsFileMap = {};
    for (const file of Object.values(this.files)) {
      const displayPath = this.toDisplayPath(file.path);
      display[displayPath] = this.toReadableFile(file, displayPath);
    }
    return display;
  }

  public snapshotCanonical(): VfsFileMap {
    const canonical: VfsFileMap = {};
    for (const file of Object.values(this.files)) {
      canonical[file.path] = this.toReadableFile(file, file.path);
    }
    return canonical;
  }

  /**
   * Returns a snapshot including read-only virtual files (e.g. `skills/**`).
   * This is intended for read-only tooling (ls/stat/glob/search), NOT persistence.
   */
  public snapshotAll(): VfsFileMap {
    const readonlyDisplay = toDisplayFileMap(
      this.readonlyFiles,
      this.activeForkId,
    );
    return mergeFiles(readonlyDisplay, this.snapshot());
  }

  public snapshotAllCanonical(): VfsFileMap {
    return mergeFiles(this.readonlyFiles, this.snapshotCanonical());
  }

  public restore(snapshot: VfsFileMap): void {
    const next: VfsFileMap = {};
    for (const file of Object.values(snapshot)) {
      const canonicalPath = this.resolveCanonicalPath(file.path);
      if (this.isImmutableReadOnlyPath(canonicalPath)) {
        continue;
      }

      const normalizedContent = file.content;
      const storedContent = tryCompressSessionContent(
        canonicalPath,
        file.contentType,
        normalizedContent,
      );

      next[canonicalPath] = {
        ...file,
        path: canonicalPath,
        content: storedContent,
        hash: hashContent(normalizedContent),
        size: normalizedContent.length,
      };
    }
    this.files = next;
  }

  public renameFile(from: string, to: string, options?: VfsWriteOptions): void {
    const canonicalFrom = this.assertWritablePath(from, options, "move");
    const canonicalTo = this.assertWritablePath(to, options, "move");
    const file = this.files[canonicalFrom];
    if (!file) {
      throw new Error(`File not found: ${canonicalFrom}`);
    }
    if (canonicalFrom === canonicalTo) {
      return;
    }
    const readableContent = this.toReadableContent(file);
    const storedContent = tryCompressSessionContent(
      canonicalTo,
      file.contentType,
      readableContent,
    );
    this.files[canonicalTo] = {
      ...file,
      path: canonicalTo,
      content: storedContent,
      hash: hashContent(readableContent),
      size: readableContent.length,
      updatedAt: Date.now(),
    };
    delete this.files[canonicalFrom];
    if (file.contentType === "application/json") {
      this.removePlaceholderDraftsForPromotedEntity(canonicalTo);
    }
  }

  public deleteFile(path: string, options?: VfsWriteOptions): void {
    const canonicalPath = this.assertWritablePath(path, options, "delete");
    if (!this.files[canonicalPath]) {
      throw new Error(`File not found: ${canonicalPath}`);
    }
    delete this.files[canonicalPath];
  }

  public applyJsonPatch(
    path: string,
    patchOps: Operation[],
    options?: VfsWriteOptions,
  ): void {
    const canonicalPath = this.assertWritablePath(path, options, "json_patch");
    const file = this.files[canonicalPath] ?? this.readonlyFiles[canonicalPath];
    if (!file) {
      throw new Error(`File not found: ${canonicalPath}`);
    }

    if (file.contentType !== "application/json") {
      throw new Error(`File is not JSON: ${canonicalPath}`);
    }

    let document: unknown;
    try {
      document = JSON.parse(file.content);
    } catch (error) {
      throw new Error(`Invalid JSON content: ${canonicalPath}`, {
        cause: error,
      });
    }

    let patched: unknown;
    try {
      patched = applyPatchFn(document, patchOps, true, false).newDocument;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(formatJsonPatchApplyError(canonicalPath, message));
    }
    const normalizedPatched = this.normalizeJsonDocumentForPath(
      canonicalPath,
      patched,
    );
    const schema = getSchemaForPath(canonicalPath);
    const strictSchema =
      schema instanceof z.ZodObject ? schema.strict() : schema;
    let validated: unknown;
    try {
      validated = strictSchema.parse(normalizedPatched);
    } catch (error) {
      const compactIssues = summarizeJsonValidationError(
        error,
        normalizedPatched,
      );
      if (compactIssues && compactIssues.length > 0) {
        throw new Error(
          `Schema validation failed for ${canonicalPath}: ${formatJsonValidationSummary(compactIssues)}`,
        );
      }
      throw error;
    }

    if (hasUnknownKeys(normalizedPatched, validated)) {
      throw new Error(`Unknown keys found after validation: ${canonicalPath}`);
    }

    this.writeFile(canonicalPath, JSON.stringify(validated), file.contentType, {
      ...options,
      operation: options?.operation ?? "json_patch",
    });
  }

  public mergeJson(
    path: string,
    content: JsonObject,
    options?: VfsWriteOptions,
  ): void {
    const canonicalPath = this.assertWritablePath(path, options, "json_merge");
    if (
      Array.isArray(content) ||
      content === null ||
      typeof content !== "object"
    ) {
      throw new Error("Merge content must be a JSON object");
    }

    const file = this.files[canonicalPath] ?? this.readonlyFiles[canonicalPath];
    let document: unknown = {};
    let contentType: VfsContentType = "application/json";

    if (file) {
      if (file.contentType !== "application/json") {
        throw new Error(`File is not JSON: ${canonicalPath}`);
      }

      try {
        document = JSON.parse(file.content);
      } catch (error) {
        throw new Error(`Invalid JSON content: ${canonicalPath}`, {
          cause: error,
        });
      }
      contentType = file.contentType;
    }

    const merged = deepMergeJson(document, content);
    const normalizedMerged = this.normalizeJsonDocumentForPath(
      canonicalPath,
      merged,
    );
    const schema = getSchemaForPath(canonicalPath);
    const strictSchema =
      schema instanceof z.ZodObject ? schema.strict() : schema;
    let validated: unknown;
    try {
      validated = strictSchema.parse(normalizedMerged);
    } catch (error) {
      const compactIssues = summarizeJsonValidationError(
        error,
        normalizedMerged,
      );
      if (compactIssues && compactIssues.length > 0) {
        throw new Error(
          `Schema validation failed for ${canonicalPath}: ${formatJsonValidationSummary(compactIssues)}`,
        );
      }
      throw error;
    }

    if (hasUnknownKeys(normalizedMerged, validated)) {
      throw new Error(`Unknown keys found after validation: ${canonicalPath}`);
    }

    this.writeFile(canonicalPath, JSON.stringify(validated), contentType, {
      ...options,
      operation: options?.operation ?? "json_merge",
    });
  }

  public list(path: string): string[] {
    const displaySnapshot = this.snapshotAll();
    const normalized = normalizeVfsPath(path);
    const resolvedPrefix =
      normalized === ""
        ? ""
        : canonicalToLogicalVfsPath(this.resolveCanonicalPath(normalized), {
            activeForkId: this.activeForkId,
          }) || normalized;

    if (!resolvedPrefix) {
      const entries = Object.keys(displaySnapshot).map((p) => p.split("/")[0]);
      return Array.from(new Set(entries));
    }

    const prefix = normalizeVfsPath(resolvedPrefix).replace(/\/$/, "");
    const entries = Object.keys(displaySnapshot)
      .filter((p) => p.startsWith(prefix + "/"))
      .map((p) => p.slice(prefix.length + 1))
      .map((p) => p.split("/")[0])
      .filter(Boolean);
    return Array.from(new Set(entries));
  }

  public setSemanticIndexer(indexer?: VfsSemanticIndexer): void {
    this.semanticIndexer = indexer;
  }

  public searchSemantic(
    query: string,
    options: Omit<VfsSearchOptions, "semantic"> = {},
  ): VfsSearchMatch[] {
    if (!this.semanticIndexer) {
      return [];
    }
    return this.semanticIndexer(query, options);
  }

  public searchText(
    query: string,
    options: VfsSearchOptions = {},
  ): VfsSearchMatch[] {
    const { path, limit = 20, semantic } = options;
    if (limit <= 0) {
      return [];
    }

    if (semantic) {
      const semanticMatches = this.searchSemantic(query, { path, limit });
      if (semanticMatches.length > 0) {
        return semanticMatches.slice(0, limit);
      }
    }

    const displaySnapshot = this.snapshot();
    const scopePath =
      typeof path === "string" && path.trim().length > 0
        ? canonicalToLogicalVfsPath(this.resolveCanonicalPath(path), {
            activeForkId: this.activeForkId,
          })
        : undefined;

    return collectMatches(
      displaySnapshot,
      scopePath,
      (line) => line.includes(query),
      limit,
    );
  }

  public grep(regex: RegExp, options: VfsGrepOptions = {}): VfsSearchMatch[] {
    const { path, limit = 20 } = options;
    if (limit <= 0) {
      return [];
    }
    const displaySnapshot = this.snapshot();
    const scopePath =
      typeof path === "string" && path.trim().length > 0
        ? canonicalToLogicalVfsPath(this.resolveCanonicalPath(path), {
            activeForkId: this.activeForkId,
          })
        : undefined;
    return collectMatches(
      displaySnapshot,
      scopePath,
      makeRegexMatcher(regex),
      limit,
    );
  }
}
