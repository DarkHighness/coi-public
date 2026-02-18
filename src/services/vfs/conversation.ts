import type { VfsFileMap } from "./types";
import { VfsSession, type VfsWriteOptions } from "./vfsSession";
import { normalizeVfsPath } from "./utils";
import {
  canonicalToLogicalVfsPath,
  toCanonicalVfsPath,
} from "./core/pathResolver";
import type { ForkTree, PlayerRate, TokenUsage } from "@/types";

export interface ConversationIndex {
  activeForkId: number;
  activeTurnId: string;
  rootTurnIdByFork: Record<string, string>;
  latestTurnNumberByFork: Record<string, number>;
  turnOrderByFork: Record<string, string[]>;
}

export interface TurnFile {
  turnId: string;
  forkId: number;
  turnNumber: number;
  parentTurnId: string | null;
  createdAt: number;
  userAction: string;
  assistant: {
    narrative: string;
    choices: unknown[];
    narrativeTone?: string;
    atmosphere?: unknown;
    ending?: string;
    forceEnd?: boolean;
    usage?: TokenUsage;
  };
  media?: JsonObject;
  meta?: {
    playerRate?: PlayerRate;
    [key: string]: unknown;
  };
}

export interface SessionLineageNode {
  uid: string;
  sessionId: string;
  parentPath: string | null;
  createdAt: number;
}

export interface SessionLineageState {
  version: 1;
  activePath: string | null;
  latestPathBySessionId: Record<string, string>;
  nodesByPath: Record<string, SessionLineageNode>;
}

export interface SessionHistoryWriteOptions extends VfsWriteOptions {
  path?: string;
  sessionId?: string;
}

export interface SessionHistoryReadOptions {
  path?: string;
  sessionId?: string;
}

export interface EnsureSessionHistoryPathResult {
  path: string;
  parentPath: string | null;
  created: boolean;
}

const INDEX_PATH = "conversation/index.json";
const FORK_TREE_PATH = "conversation/fork_tree.json";
const TURN_ROOT = "conversation/turns";
export const LEGACY_SESSION_JSONL_PATH = "conversation/session.jsonl";
export const SESSION_JSONL_PATH = LEGACY_SESSION_JSONL_PATH;
export const SESSION_HISTORY_ROOT = "session";
export const SESSION_LINEAGE_PATH = "session/lineage.json";
export const DEFAULT_SESSION_HISTORY_LRU_LIMIT = 64;

let sessionHistoryLruLimit = DEFAULT_SESSION_HISTORY_LRU_LIMIT;

const SESSION_HISTORY_PATH_RE = /^session\/([^/]+)\.jsonl$/;

const EMPTY_SESSION_LINEAGE: SessionLineageState = {
  version: 1,
  activePath: null,
  latestPathBySessionId: {},
  nodesByPath: {},
};

export const getSessionHistoryLruLimit = (): number => sessionHistoryLruLimit;

export const setSessionHistoryLruLimit = (limit: number): void => {
  if (!Number.isFinite(limit) || limit < 1) {
    return;
  }
  sessionHistoryLruLimit = Math.max(1, Math.floor(limit));
};

export const buildTurnId = (forkId: number, turn: number): string =>
  `fork-${forkId}/turn-${turn}`;

export const buildTurnPath = (forkId: number, turn: number): string =>
  `${TURN_ROOT}/${buildTurnId(forkId, turn)}.json`;

export const buildSessionHistoryPath = (uid: string): string =>
  `${SESSION_HISTORY_ROOT}/${uid}.jsonl`;

const resolveRelativePath = (path: string): string => normalizeVfsPath(path);

const normalizeWriteOptions = (
  options?: SessionHistoryWriteOptions,
): VfsWriteOptions | undefined => {
  if (!options) return undefined;
  return {
    ...(options.writeContext ? { writeContext: options.writeContext } : {}),
    ...(options.operation ? { operation: options.operation } : {}),
  };
};

const isRecord = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const findFile = (files: VfsFileMap, path: string) => {
  const normalized = normalizeVfsPath(path);
  const canonical = toCanonicalVfsPath(normalized, { activeForkId: 0 });
  const logical = canonicalToLogicalVfsPath(canonical, {
    activeForkId: 0,
    looseFork: true,
  });

  const candidates = Array.from(
    new Set([
      normalized,
      logical,
      canonical,
      normalizeVfsPath(`current/${normalized}`),
      normalizeVfsPath(`current/${logical}`),
    ]),
  ).filter(Boolean);

  for (const candidate of candidates) {
    const file = files[candidate];
    if (file) return file;
  }
  return null;
};

const parseJson = <T>(files: VfsFileMap, path: string): T | null => {
  const file = findFile(files, path);
  if (!file || file.contentType !== "application/json") {
    return null;
  }
  try {
    return JSON.parse(file.content) as T;
  } catch (error) {
    console.warn(`[VFS] Failed to parse JSON for ${file.path}`, error);
    return null;
  }
};

const isSessionHistoryPath = (path: string): boolean =>
  SESSION_HISTORY_PATH_RE.test(normalizeVfsPath(path));

const extractSessionUidFromPath = (path: string): string | null => {
  const match = SESSION_HISTORY_PATH_RE.exec(normalizeVfsPath(path));
  return match?.[1] ?? null;
};

const nextSessionLineageTimestamp = (lineage: SessionLineageState): number => {
  const now = Date.now();
  let maxSeen = 0;
  for (const node of Object.values(lineage.nodesByPath)) {
    if (Number.isFinite(node.createdAt)) {
      maxSeen = Math.max(maxSeen, Math.floor(node.createdAt));
    }
  }
  return Math.max(now, maxSeen + 1);
};

const sanitizeSessionHistorySlug = (sessionId: string): string => {
  const normalized = sessionId
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!normalized) {
    return "session";
  }
  return normalized.slice(0, 24);
};

const generateSessionHistoryUid = (sessionId: string): string => {
  const base = sanitizeSessionHistorySlug(sessionId);
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${base}-${ts}-${rand}`;
};

const normalizeSessionLineage = (
  lineage: unknown,
): SessionLineageState => {
  if (!isRecord(lineage)) {
    return {
      ...EMPTY_SESSION_LINEAGE,
      latestPathBySessionId: {},
      nodesByPath: {},
    };
  }

  const latestPathBySessionId: Record<string, string> = {};
  const rawLatest = lineage.latestPathBySessionId;
  if (isRecord(rawLatest)) {
    for (const [sessionId, rawPath] of Object.entries(rawLatest)) {
      if (typeof rawPath !== "string") continue;
      const path = normalizeVfsPath(rawPath);
      if (!isSessionHistoryPath(path)) continue;
      latestPathBySessionId[sessionId] = path;
    }
  }

  const nodesByPath: Record<string, SessionLineageNode> = {};
  const rawNodes = lineage.nodesByPath;
  if (isRecord(rawNodes)) {
    for (const [rawPath, rawNode] of Object.entries(rawNodes)) {
      if (!isRecord(rawNode)) continue;
      const path = normalizeVfsPath(rawPath);
      if (!isSessionHistoryPath(path)) continue;
      const uid =
        typeof rawNode.uid === "string" && rawNode.uid.trim().length > 0
          ? rawNode.uid
          : extractSessionUidFromPath(path) ?? generateSessionHistoryUid("session");
      const sessionId =
        typeof rawNode.sessionId === "string" && rawNode.sessionId.trim().length > 0
          ? rawNode.sessionId
          : "unknown";
      const parentPath =
        typeof rawNode.parentPath === "string" &&
        isSessionHistoryPath(rawNode.parentPath)
          ? normalizeVfsPath(rawNode.parentPath)
          : null;
      const createdAt =
        typeof rawNode.createdAt === "number" && Number.isFinite(rawNode.createdAt)
          ? Math.floor(rawNode.createdAt)
          : Date.now();
      nodesByPath[path] = {
        uid,
        sessionId,
        parentPath,
        createdAt,
      };
    }
  }

  const activePath =
    typeof lineage.activePath === "string" && isSessionHistoryPath(lineage.activePath)
      ? normalizeVfsPath(lineage.activePath)
      : null;

  return {
    version: 1,
    activePath,
    latestPathBySessionId,
    nodesByPath,
  };
};

const pruneSessionLineageByLru = (
  session: VfsSession,
  lineage: SessionLineageState,
  options?: VfsWriteOptions,
): void => {
  const limit = getSessionHistoryLruLimit();
  const nodeEntries = Object.entries(lineage.nodesByPath);
  if (nodeEntries.length <= limit) {
    return;
  }

  const sortedByRecent = [...nodeEntries].sort((left, right) => {
    const byCreatedAt = right[1].createdAt - left[1].createdAt;
    if (byCreatedAt !== 0) {
      return byCreatedAt;
    }
    return left[0].localeCompare(right[0]);
  });

  const keepPaths = new Set<string>();
  const normalizedActivePath =
    lineage.activePath && isSessionHistoryPath(lineage.activePath)
      ? normalizeVfsPath(lineage.activePath)
      : null;

  if (
    normalizedActivePath &&
    Object.prototype.hasOwnProperty.call(lineage.nodesByPath, normalizedActivePath)
  ) {
    keepPaths.add(normalizedActivePath);
  }

  for (const [path] of sortedByRecent) {
    if (keepPaths.size >= limit) {
      break;
    }
    keepPaths.add(normalizeVfsPath(path));
  }

  for (const [path] of nodeEntries) {
    const normalizedPath = normalizeVfsPath(path);
    if (keepPaths.has(normalizedPath)) {
      continue;
    }

    delete lineage.nodesByPath[normalizedPath];
    if (lineage.activePath === normalizedPath) {
      lineage.activePath = null;
    }

    for (const [sessionId, latestPath] of Object.entries(
      lineage.latestPathBySessionId,
    )) {
      if (normalizeVfsPath(latestPath) === normalizedPath) {
        delete lineage.latestPathBySessionId[sessionId];
      }
    }

    try {
      session.deleteFile(normalizedPath, {
        ...options,
        operation: options?.operation ?? "finish_commit",
      });
    } catch {
      // Best-effort pruning: lineage cleanup is still authoritative.
    }
  }

  if (!lineage.activePath) {
    const remainingMostRecent = Object.entries(lineage.nodesByPath).sort(
      (left, right) => right[1].createdAt - left[1].createdAt,
    )[0];
    lineage.activePath = remainingMostRecent?.[0] ?? null;
  }
};

export const readSessionLineage = (files: VfsFileMap): SessionLineageState =>
  normalizeSessionLineage(parseJson<SessionLineageState>(files, SESSION_LINEAGE_PATH));

export const writeSessionLineage = (
  session: VfsSession,
  lineage: SessionLineageState,
  options?: VfsWriteOptions,
): void => {
  session.writeFile(
    resolveRelativePath(SESSION_LINEAGE_PATH),
    JSON.stringify(lineage),
    "application/json",
    options,
  );
};

export const getSessionHistoryPathForSession = (
  files: VfsFileMap,
  sessionId: string,
): string | null => {
  const lineage = readSessionLineage(files);
  const path = lineage.latestPathBySessionId[sessionId];
  if (!path || !isSessionHistoryPath(path)) {
    return null;
  }
  return path;
};

export const getActiveSessionHistoryPath = (files: VfsFileMap): string | null => {
  const lineage = readSessionLineage(files);
  if (lineage.activePath && isSessionHistoryPath(lineage.activePath)) {
    return lineage.activePath;
  }
  if (findFile(files, LEGACY_SESSION_JSONL_PATH)) {
    return LEGACY_SESSION_JSONL_PATH;
  }
  return null;
};

export const getParentSessionHistoryPath = (
  files: VfsFileMap,
  path: string,
): string | null => {
  const lineage = readSessionLineage(files);
  const normalized = normalizeVfsPath(path);
  const node = lineage.nodesByPath[normalized];
  return node?.parentPath ?? null;
};

export const ensureSessionHistoryPath = (
  session: VfsSession,
  sessionId: string,
  options?: VfsWriteOptions,
): EnsureSessionHistoryPathResult => {
  const snapshot = session.snapshot();
  const lineage = readSessionLineage(snapshot);
  const existingPath = lineage.latestPathBySessionId[sessionId];

  if (existingPath && isSessionHistoryPath(existingPath)) {
    const normalizedPath = normalizeVfsPath(existingPath);
    let node = lineage.nodesByPath[normalizedPath];
    if (!node) {
      node = {
        uid:
          extractSessionUidFromPath(normalizedPath) ??
          generateSessionHistoryUid(sessionId),
        sessionId,
        parentPath: lineage.activePath && lineage.activePath !== normalizedPath
          ? lineage.activePath
          : null,
        createdAt: nextSessionLineageTimestamp(lineage),
      };
      lineage.nodesByPath[normalizedPath] = node;
    }
    node.createdAt = nextSessionLineageTimestamp(lineage);

    if (lineage.activePath !== normalizedPath) {
      lineage.activePath = normalizedPath;
    }
    pruneSessionLineageByLru(session, lineage, options);
    writeSessionLineage(session, lineage, options);

    return {
      path: normalizedPath,
      parentPath: node.parentPath ?? null,
      created: false,
    };
  }

  const uid = generateSessionHistoryUid(sessionId);
  const path = buildSessionHistoryPath(uid);
  const parentPath =
    lineage.activePath && isSessionHistoryPath(lineage.activePath)
      ? lineage.activePath
      : null;

  lineage.activePath = path;
  lineage.latestPathBySessionId[sessionId] = path;
  lineage.nodesByPath[path] = {
    uid,
    sessionId,
    parentPath,
    createdAt: nextSessionLineageTimestamp(lineage),
  };

  pruneSessionLineageByLru(session, lineage, options);
  writeSessionLineage(session, lineage, options);

  return {
    path,
    parentPath,
    created: true,
  };
};

export const writeConversationIndex = (
  session: VfsSession,
  index: ConversationIndex,
  options?: VfsWriteOptions,
): void => {
  session.setActiveForkId(index.activeForkId ?? 0);
  session.writeFile(
    resolveRelativePath(INDEX_PATH),
    JSON.stringify(index),
    "application/json",
    options,
  );
};

export const readConversationIndex = (
  files: VfsFileMap,
): ConversationIndex | null => parseJson<ConversationIndex>(files, INDEX_PATH);

export const writeForkTree = (
  session: VfsSession,
  tree: ForkTree,
  options?: VfsWriteOptions,
): void => {
  session.writeFile(
    resolveRelativePath(FORK_TREE_PATH),
    JSON.stringify(tree),
    "application/json",
    options,
  );
};

export const readForkTree = (files: VfsFileMap): ForkTree | null =>
  parseJson<ForkTree>(files, FORK_TREE_PATH);

export const writeTurnFile = (
  session: VfsSession,
  forkId: number,
  turn: number,
  data: TurnFile,
  options?: VfsWriteOptions,
): void => {
  session.writeFile(
    resolveRelativePath(buildTurnPath(forkId, turn)),
    JSON.stringify(data),
    "application/json",
    options,
  );
};

export const readTurnFile = (
  files: VfsFileMap,
  forkId: number,
  turn: number,
): TurnFile | null => parseJson<TurnFile>(files, buildTurnPath(forkId, turn));

const toJsonlLine = (entry: unknown, index: number): string => {
  try {
    const line = JSON.stringify(entry);
    if (typeof line !== "string") {
      throw new Error("JSON.stringify returned undefined");
    }
    return line;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to serialize provider-native history entry at index ${index}: ${message}`,
    );
  }
};

export const resolveSessionHistoryReadPath = (
  files: VfsFileMap,
  options?: SessionHistoryReadOptions,
): string | null => {
  if (options?.path) {
    return normalizeVfsPath(options.path);
  }

  if (options?.sessionId) {
    const bySession = getSessionHistoryPathForSession(files, options.sessionId);
    if (bySession) {
      return bySession;
    }
  }

  return getActiveSessionHistoryPath(files);
};

export const writeSessionHistoryJsonl = (
  session: VfsSession,
  entries: unknown[],
  options?: SessionHistoryWriteOptions,
): void => {
  const content =
    entries.length > 0
      ? entries.map((entry, index) => toJsonlLine(entry, index)).join("\n")
      : "";

  const targetPath = (() => {
    if (options?.path) {
      return normalizeVfsPath(options.path);
    }
    if (options?.sessionId) {
      return ensureSessionHistoryPath(session, options.sessionId, options).path;
    }
    return getActiveSessionHistoryPath(session.snapshot()) ?? LEGACY_SESSION_JSONL_PATH;
  })();

  session.writeFile(
    resolveRelativePath(targetPath),
    content,
    "application/jsonl",
    normalizeWriteOptions(options),
  );
};

export const readSessionHistoryJsonl = (
  files: VfsFileMap,
  options?: SessionHistoryReadOptions,
): unknown[] => {
  const targetPath = resolveSessionHistoryReadPath(files, options);
  if (!targetPath) {
    throw new Error("Session history jsonl path is not available");
  }

  const file = findFile(files, targetPath);
  if (!file) {
    throw new Error(`Session history jsonl file not found: ${targetPath}`);
  }
  if (file.contentType !== "application/jsonl") {
    throw new Error(
      `Session history path is not jsonl: ${targetPath} (got ${file.contentType})`,
    );
  }

  const lines = file.content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const entries: unknown[] = [];
  for (const [index, line] of lines.entries()) {
    try {
      entries.push(JSON.parse(line) as unknown);
    } catch (error) {
      console.warn(
        `[VFS] Failed to parse session jsonl line ${index + 1}:`,
        error,
      );
    }
  }

  return entries;
};

export const forkConversation = (
  session: VfsSession,
  options: {
    sourceForkId: number;
    sourceTurnNumber: number;
    newForkId: number;
  },
): ConversationIndex => {
  const { sourceForkId, sourceTurnNumber, newForkId } = options;
  const snapshot = session.snapshot();
  const index = readConversationIndex(snapshot);
  if (!index) {
    throw new Error("Conversation index is missing");
  }

  const forkKey = String(newForkId);
  if (index.turnOrderByFork?.[forkKey] || index.rootTurnIdByFork?.[forkKey]) {
    throw new Error(`Fork already exists in conversation index: ${newForkId}`);
  }

  if (!Number.isFinite(sourceTurnNumber) || sourceTurnNumber < 0) {
    throw new Error(`Invalid source turn number: ${sourceTurnNumber}`);
  }

  const newOrder: string[] = [];

  for (let turn = 0; turn <= sourceTurnNumber; turn += 1) {
    const existing = readTurnFile(snapshot, sourceForkId, turn);
    if (!existing) {
      throw new Error(
        `Missing source turn file: fork-${sourceForkId}/turn-${turn}`,
      );
    }

    const turnId = buildTurnId(newForkId, turn);
    const parentTurnId = turn === 0 ? null : buildTurnId(newForkId, turn - 1);

    writeTurnFile(session, newForkId, turn, {
      ...existing,
      turnId,
      forkId: newForkId,
      turnNumber: turn,
      parentTurnId,
    });

    newOrder.push(turnId);
  }

  const nextIndex: ConversationIndex = {
    ...index,
    activeForkId: newForkId,
    activeTurnId: buildTurnId(newForkId, sourceTurnNumber),
    rootTurnIdByFork: {
      ...index.rootTurnIdByFork,
      [forkKey]: buildTurnId(newForkId, 0),
    },
    latestTurnNumberByFork: {
      ...index.latestTurnNumberByFork,
      [forkKey]: sourceTurnNumber,
    },
    turnOrderByFork: {
      ...index.turnOrderByFork,
      [forkKey]: newOrder,
    },
  };

  writeConversationIndex(session, nextIndex);
  return nextIndex;
};
