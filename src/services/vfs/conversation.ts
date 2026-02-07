import type { VfsFileMap } from "./types";
import { VfsSession } from "./vfsSession";
import { stripCurrentPath } from "./currentAlias";
import { normalizeVfsPath } from "./utils";
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

const INDEX_PATH = "current/conversation/index.json";
const FORK_TREE_PATH = "current/conversation/fork_tree.json";
const TURN_ROOT = "current/conversation/turns";

export const buildTurnId = (forkId: number, turn: number): string =>
  `fork-${forkId}/turn-${turn}`;

export const buildTurnPath = (forkId: number, turn: number): string =>
  `${TURN_ROOT}/${buildTurnId(forkId, turn)}.json`;

const resolveRelativePath = (path: string): string =>
  normalizeVfsPath(stripCurrentPath(path));

const findFile = (files: VfsFileMap, path: string) => {
  const normalized = normalizeVfsPath(path);
  const relative = resolveRelativePath(path);
  const candidates = new Set<string>([relative, normalized]);
  if (normalized.startsWith("current/")) {
    candidates.add(normalizeVfsPath(stripCurrentPath(normalized)));
  } else {
    candidates.add(normalizeVfsPath(`current/${normalized}`));
  }

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
): void => {
  session.writeFile(
    resolveRelativePath(INDEX_PATH),
    JSON.stringify(index),
    "application/json",
  );
};

export const readConversationIndex = (
  files: VfsFileMap,
): ConversationIndex | null => parseJson<ConversationIndex>(files, INDEX_PATH);

export const writeForkTree = (session: VfsSession, tree: ForkTree): void => {
  session.writeFile(
    resolveRelativePath(FORK_TREE_PATH),
    JSON.stringify(tree),
    "application/json",
  );
};

export const readForkTree = (files: VfsFileMap): ForkTree | null =>
  parseJson<ForkTree>(files, FORK_TREE_PATH);

export const writeTurnFile = (
  session: VfsSession,
  forkId: number,
  turn: number,
  data: TurnFile,
): void => {
  session.writeFile(
    resolveRelativePath(buildTurnPath(forkId, turn)),
    JSON.stringify(data),
    "application/json",
  );
};

export const readTurnFile = (
  files: VfsFileMap,
  forkId: number,
  turn: number,
): TurnFile | null =>
  parseJson<TurnFile>(files, buildTurnPath(forkId, turn));

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
