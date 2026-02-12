import type { VfsFileMap } from "./types";
import { VfsSession, type VfsWriteOptions } from "./vfsSession";
import { normalizeVfsPath } from "./utils";
import { canonicalToLogicalVfsPath, toCanonicalVfsPath } from "./core/pathResolver";
import type { ForkTree, TokenUsage } from "@/types";

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
  media?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

const INDEX_PATH = "conversation/index.json";
const FORK_TREE_PATH = "conversation/fork_tree.json";
const TURN_ROOT = "conversation/turns";
export const SESSION_JSONL_PATH = "conversation/session.jsonl";

export const buildTurnId = (forkId: number, turn: number): string =>
  `fork-${forkId}/turn-${turn}`;

export const buildTurnPath = (forkId: number, turn: number): string =>
  `${TURN_ROOT}/${buildTurnId(forkId, turn)}.json`;

const resolveRelativePath = (path: string): string => normalizeVfsPath(path);

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
): TurnFile | null =>
  parseJson<TurnFile>(files, buildTurnPath(forkId, turn));

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

export const writeSessionHistoryJsonl = (
  session: VfsSession,
  entries: unknown[],
  options?: VfsWriteOptions,
): void => {
  const content =
    entries.length > 0
      ? entries.map((entry, index) => toJsonlLine(entry, index)).join("\n")
      : "";

  session.writeFile(
    resolveRelativePath(SESSION_JSONL_PATH),
    content,
    "application/jsonl",
    options,
  );
};

export const readSessionHistoryJsonl = (files: VfsFileMap): unknown[] => {
  const file = findFile(files, SESSION_JSONL_PATH);
  if (!file || file.contentType !== "application/jsonl") {
    return [];
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
        `[VFS] Failed to parse session.jsonl line ${index + 1}:`,
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
