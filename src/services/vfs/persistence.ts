import type { VfsStore } from "./store";
import type { VfsFileMap, VfsSnapshot } from "./types";
import { VfsSession } from "./vfsSession";
import { normalizeVfsPath } from "./utils";
import {
  isForkedSnapshotPath,
  isSharedMutablePath,
  partitionVfsFileMapByScope,
} from "./pathScopes";

export interface VfsSnapshotMeta {
  saveId: string;
  forkId: number;
  turn: number;
  createdAt?: number;
}

export const buildTurnRoot = (forkId: number, turn: number): string =>
  `turns/fork-${forkId}/turn-${turn}`;

const prefixSnapshotFiles = (files: VfsFileMap, root: string): VfsFileMap => {
  const prefixed: VfsFileMap = {};
  const normalizedRoot = normalizeVfsPath(root);

  for (const file of Object.values(files)) {
    const normalizedPath = normalizeVfsPath(file.path);
    const prefixedPath = normalizeVfsPath(
      `${normalizedRoot}/${normalizedPath}`,
    );
    prefixed[prefixedPath] = { ...file, path: prefixedPath };
  }

  return prefixed;
};

const stripSnapshotPrefix = (files: VfsFileMap, root: string): VfsFileMap => {
  const stripped: VfsFileMap = {};
  const normalizedRoot = normalizeVfsPath(root);

  for (const file of Object.values(files)) {
    const normalizedPath = normalizeVfsPath(file.path);
    if (!normalizedPath.startsWith(`${normalizedRoot}/`)) {
      continue;
    }
    const relative = normalizedPath.slice(normalizedRoot.length + 1);
    stripped[relative] = { ...file, path: relative };
  }

  return stripped;
};

export const createVfsSnapshot = (
  session: VfsSession,
  meta: VfsSnapshotMeta,
): VfsSnapshot => ({
  saveId: meta.saveId,
  forkId: meta.forkId,
  turn: meta.turn,
  createdAt: meta.createdAt ?? Date.now(),
  files: prefixSnapshotFiles(
    partitionVfsFileMapByScope(session.snapshot()).forked,
    buildTurnRoot(meta.forkId, meta.turn),
  ),
});

export const buildSharedMutableStateFromSession = (
  session: VfsSession,
): VfsFileMap => partitionVfsFileMapByScope(session.snapshot()).sharedMutable;

export const applySharedMutableStateToSession = (
  session: VfsSession,
  sharedMutable: VfsFileMap,
): void => {
  const normalizedShared: VfsFileMap = {};
  for (const file of Object.values(sharedMutable)) {
    const normalizedPath = normalizeVfsPath(file.path);
    if (!isSharedMutablePath(normalizedPath)) {
      continue;
    }
    normalizedShared[normalizedPath] = { ...file, path: normalizedPath };
  }

  const current = session.snapshot();
  const merged: VfsFileMap = {};

  for (const file of Object.values(current)) {
    const normalizedPath = normalizeVfsPath(file.path);
    if (isSharedMutablePath(normalizedPath)) {
      continue;
    }
    merged[normalizedPath] = { ...file, path: normalizedPath };
  }

  for (const file of Object.values(normalizedShared)) {
    merged[file.path] = { ...file };
  }

  session.restore(merged);
};

export const extractSharedMutableStateFromSnapshot = (
  snapshot: VfsSnapshot,
): VfsFileMap => {
  const root = buildTurnRoot(snapshot.forkId, snapshot.turn);
  const stripped = stripSnapshotPrefix(snapshot.files, root);
  const shared: VfsFileMap = {};

  for (const file of Object.values(stripped)) {
    const normalizedPath = normalizeVfsPath(file.path);
    if (!isSharedMutablePath(normalizedPath)) {
      continue;
    }
    shared[normalizedPath] = { ...file, path: normalizedPath };
  }

  return shared;
};

export const saveVfsSessionSnapshot = async (
  store: VfsStore,
  session: VfsSession,
  meta: VfsSnapshotMeta,
): Promise<VfsSnapshot> => {
  const snapshot = createVfsSnapshot(session, meta);
  await store.saveSnapshot(snapshot);
  return snapshot;
};

export const restoreVfsSessionFromSnapshot = (
  session: VfsSession,
  snapshot: VfsSnapshot,
): void => {
  const root = buildTurnRoot(snapshot.forkId, snapshot.turn);
  const stripped = stripSnapshotPrefix(snapshot.files, root);
  const forkedOnly: VfsFileMap = {};
  for (const file of Object.values(stripped)) {
    const normalizedPath = normalizeVfsPath(file.path);
    if (!isForkedSnapshotPath(normalizedPath)) {
      continue;
    }
    forkedOnly[normalizedPath] = { ...file, path: normalizedPath };
  }
  session.setActiveForkId(snapshot.forkId);
  session.restore(forkedOnly);
  session.beginReadEpoch("snapshot_restore");
};
