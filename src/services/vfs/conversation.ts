import type { VfsFileMap } from "./types";
import { VfsSession } from "./vfsSession";
import { stripCurrentPath } from "./currentAlias";
import { normalizeVfsPath } from "./utils";

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
  };
  media?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

const INDEX_PATH = "current/conversation/index.json";
const TURN_ROOT = "current/conversation/turns";

export const buildTurnId = (forkId: number, turn: number): string =>
  `fork-${forkId}/turn-${turn}`;

export const buildTurnPath = (forkId: number, turn: number): string =>
  `${TURN_ROOT}/${buildTurnId(forkId, turn)}.json`;

const resolveRelativePath = (path: string): string =>
  normalizeVfsPath(stripCurrentPath(path));

const parseJson = <T>(files: VfsFileMap, path: string): T | null => {
  const file = files[resolveRelativePath(path)];
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
