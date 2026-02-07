import { applyPatch } from "fast-json-patch";
import type { Operation } from "fast-json-patch";
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
import { buildGlobalVfsSkills } from "./globalSkills";
import { buildGlobalVfsRefs } from "./globalRefs";
import { vfsPathRegistry } from "./core/pathRegistry";
import { vfsPolicyEngine } from "./core/policyEngine";
import type { VfsWriteContext } from "./core/types";

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

const DEFAULT_SYSTEM_WRITE_CONTEXT: VfsWriteContext = {
  actor: "system",
  mode: "normal",
  allowFinishGuardedWrite: true,
};

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
  private readonlyFiles: VfsFileMap = mergeFiles(
    buildGlobalVfsSkills(),
    buildGlobalVfsRefs(),
  );
  private semanticIndexer?: VfsSemanticIndexer;
  private currentReadEpoch = 0;
  private seenByEpoch = new Map<string, number>();
  private boundConversationSessionId: string | null = null;
  private outOfBandReadInvalidations = new Map<
    string,
    "added" | "deleted" | "modified"
  >();
  private activeWriteContext: VfsWriteContext | null = null;

  constructor(options?: { semanticIndexer?: VfsSemanticIndexer }) {
    this.semanticIndexer = options?.semanticIndexer;
  }

  public noteToolSeen(path: string): void {
    const normalized = normalizeVfsPath(path);
    this.seenByEpoch.set(normalized, this.currentReadEpoch);
    this.outOfBandReadInvalidations.delete(normalized);
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
    const normalized = normalizeVfsPath(path);
    return this.seenByEpoch.get(normalized) === this.currentReadEpoch;
  }

  public snapshotToolSeenPaths(): string[] {
    const paths: string[] = [];
    for (const [path, epoch] of this.seenByEpoch.entries()) {
      if (epoch === this.currentReadEpoch) {
        paths.push(path);
      }
    }
    return paths;
  }

  public restoreToolSeenPaths(paths: string[]): void {
    this.seenByEpoch.clear();
    for (const path of paths) {
      const normalized = normalizeVfsPath(path);
      this.seenByEpoch.set(normalized, this.currentReadEpoch);
    }
  }

  public snapshotReadFenceState(): VfsReadFenceState {
    const seenByEpoch: Record<string, number> = {};
    for (const [path, epoch] of this.seenByEpoch.entries()) {
      seenByEpoch[path] = epoch;
    }
    return {
      currentReadEpoch: this.currentReadEpoch,
      seenByEpoch,
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
    for (const [path, epoch] of Object.entries(state.seenByEpoch ?? {})) {
      if (typeof epoch !== "number" || !Number.isFinite(epoch)) {
        continue;
      }
      this.seenByEpoch.set(normalizeVfsPath(path), Math.floor(epoch));
    }

    this.outOfBandReadInvalidations.clear();
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
    const normalizedFrom = normalizeVfsPath(from);
    const normalizedTo = normalizeVfsPath(to);
    const epoch = this.seenByEpoch.get(normalizedFrom);
    if (epoch === undefined) {
      return;
    }
    this.seenByEpoch.delete(normalizedFrom);
    this.seenByEpoch.set(normalizedTo, epoch);
  }

  public forgetToolSeenPath(path: string): void {
    this.seenByEpoch.delete(normalizeVfsPath(path));
  }

  public noteOutOfBandMutation(
    path: string,
    changeType: "added" | "deleted" | "modified",
  ): void {
    const normalized = normalizeVfsPath(path);
    if (!normalized) {
      return;
    }

    if (!this.hasToolSeenInCurrentEpoch(normalized)) {
      return;
    }

    this.seenByEpoch.delete(normalized);
    this.outOfBandReadInvalidations.set(normalized, changeType);
  }

  public drainOutOfBandReadInvalidations(): Array<{
    path: string;
    changeType: "added" | "deleted" | "modified";
  }> {
    const drained = Array.from(this.outOfBandReadInvalidations.entries())
      .map(([path, changeType]) => ({ path, changeType }))
      .sort((a, b) => a.path.localeCompare(b.path));
    this.outOfBandReadInvalidations.clear();
    return drained;
  }

  public withWriteContext<T>(context: VfsWriteContext, action: () => T): T {
    const previous = this.activeWriteContext;
    this.activeWriteContext = context;
    try {
      return action();
    } finally {
      this.activeWriteContext = previous;
    }
  }

  private resolveWriteContext(override?: VfsWriteContext): VfsWriteContext {
    if (override) {
      return override;
    }
    if (this.activeWriteContext) {
      return this.activeWriteContext;
    }
    return DEFAULT_SYSTEM_WRITE_CONTEXT;
  }

  private isImmutableReadOnlyPath(path: string): boolean {
    return vfsPathRegistry.isImmutableReadonly(path);
  }

  private assertWritablePath(path: string, options?: VfsWriteOptions): void {
    const normalized = normalizeVfsPath(path);
    const decision = vfsPolicyEngine.canWrite(
      normalized,
      this.resolveWriteContext(options?.writeContext),
    );

    if (!decision.allowed) {
      const errorCode =
        decision.code === "OK" ? "IMMUTABLE_READONLY" : decision.code;
      throw new VfsWriteAccessError(
        errorCode,
        `${decision.reason} (${normalized})`,
      );
    }
  }

  public writeFile(
    path: string,
    content: string,
    contentType: VfsContentType,
    options?: VfsWriteOptions,
  ) {
    this.assertWritablePath(path, options);
    const normalized = normalizeVfsPath(path);
    const hash = hashContent(content);
    this.files[normalized] = {
      path: normalized,
      content,
      contentType,
      hash,
      size: content.length,
      updatedAt: Date.now(),
    };
  }

  public readFile(path: string): VfsFile | null {
    const normalized = normalizeVfsPath(path);
    const file = this.files[normalized] ?? this.readonlyFiles[normalized];
    return file ? { ...file } : null;
  }

  public snapshot(): VfsFileMap {
    return cloneFiles(this.files);
  }

  /**
   * Returns a snapshot including read-only virtual files (e.g. `skills/**`).
   * This is intended for read-only tooling (ls/stat/glob/search), NOT persistence.
   */
  public snapshotAll(): VfsFileMap {
    return mergeFiles(this.readonlyFiles, this.files);
  }

  public restore(snapshot: VfsFileMap): void {
    const next = cloneFiles(snapshot);
    for (const path of Object.keys(next)) {
      if (this.isImmutableReadOnlyPath(path)) {
        delete next[path];
      }
    }
    this.files = next;
  }

  public renameFile(from: string, to: string, options?: VfsWriteOptions): void {
    this.assertWritablePath(from, options);
    this.assertWritablePath(to, options);
    const normalizedFrom = normalizeVfsPath(from);
    const normalizedTo = normalizeVfsPath(to);
    const file = this.files[normalizedFrom];
    if (!file) {
      throw new Error(`File not found: ${normalizedFrom}`);
    }
    if (normalizedFrom === normalizedTo) {
      return;
    }
    this.files[normalizedTo] = {
      ...file,
      path: normalizedTo,
      updatedAt: Date.now(),
    };
    delete this.files[normalizedFrom];
  }

  public deleteFile(path: string, options?: VfsWriteOptions): void {
    this.assertWritablePath(path, options);
    const normalized = normalizeVfsPath(path);
    if (!this.files[normalized]) {
      throw new Error(`File not found: ${normalized}`);
    }
    delete this.files[normalized];
  }

  public applyJsonPatch(
    path: string,
    patchOps: Operation[],
    options?: VfsWriteOptions,
  ): void {
    this.assertWritablePath(path, options);
    const file = this.readFile(path);
    if (!file) {
      throw new Error(`File not found: ${normalizeVfsPath(path)}`);
    }

    if (file.contentType !== "application/json") {
      throw new Error(`File is not JSON: ${file.path}`);
    }

    let document: unknown;
    try {
      document = JSON.parse(file.content);
    } catch (error) {
      throw new Error(`Invalid JSON content: ${file.path}`, { cause: error });
    }

    const patched = applyPatch(document, patchOps, true, false).newDocument;
    const schema = getSchemaForPath(file.path);
    const strictSchema =
      schema instanceof z.ZodObject ? schema.strict() : schema;
    const validated = strictSchema.parse(patched);

    if (hasUnknownKeys(patched, validated)) {
      throw new Error(`Unknown keys found after validation: ${file.path}`);
    }

    this.writeFile(file.path, JSON.stringify(validated), file.contentType, options);
  }

  public mergeJson(
    path: string,
    content: Record<string, unknown>,
    options?: VfsWriteOptions,
  ): void {
    this.assertWritablePath(path, options);
    if (Array.isArray(content) || content === null || typeof content !== "object") {
      throw new Error("Merge content must be a JSON object");
    }

    const normalized = normalizeVfsPath(path);
    const file = this.readFile(normalized);
    let document: unknown = {};
    let contentType: VfsContentType = "application/json";

    if (file) {
      if (file.contentType !== "application/json") {
        throw new Error(`File is not JSON: ${file.path}`);
      }

      try {
        document = JSON.parse(file.content);
      } catch (error) {
        throw new Error(`Invalid JSON content: ${file.path}`, { cause: error });
      }
      contentType = file.contentType;
    }

    const merged = deepMergeJson(document, content);
    const schema = getSchemaForPath(normalized);
    const strictSchema =
      schema instanceof z.ZodObject ? schema.strict() : schema;
    const validated = strictSchema.parse(merged);

    if (hasUnknownKeys(merged, validated)) {
      throw new Error(`Unknown keys found after validation: ${normalized}`);
    }

    this.writeFile(normalized, JSON.stringify(validated), contentType, options);
  }

  public list(path: string): string[] {
    const normalized = normalizeVfsPath(path);
    if (normalized === "") {
      const entries = Object.keys(this.snapshotAll()).map((p) => p.split("/")[0]);
      return Array.from(new Set(entries));
    }

    const prefix = normalized.replace(/\/$/, "");
    const entries = Object.keys(this.snapshotAll())
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

  public searchText(query: string, options: VfsSearchOptions = {}): VfsSearchMatch[] {
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

    return collectMatches(this.files, path, (line) => line.includes(query), limit);
  }

  public grep(regex: RegExp, options: VfsGrepOptions = {}): VfsSearchMatch[] {
    const { path, limit = 20 } = options;
    if (limit <= 0) {
      return [];
    }
    return collectMatches(this.files, path, makeRegexMatcher(regex), limit);
  }
}
