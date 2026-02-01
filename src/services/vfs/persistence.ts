import type { VfsStore } from "./store";
import type { VfsFileMap, VfsSnapshot } from "./types";
import { VfsSession } from "./vfsSession";
import { normalizeVfsPath } from "./utils";

export interface VfsSnapshotMeta {
  saveId: string;
  forkId: number;
  turn: number;
  createdAt?: number;
}

export const buildTurnRoot = (forkId: number, turn: number): string =>
  `turns/fork-${forkId}/turn-${turn}`;

const prefixSnapshotFiles = (
  files: VfsFileMap,
  root: string,
): VfsFileMap => {
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

const stripSnapshotPrefix = (
  files: VfsFileMap,
  root: string,
): VfsFileMap => {
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
    session.snapshot(),
    buildTurnRoot(meta.forkId, meta.turn),
  ),
});

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
  session.restore(stripSnapshotPrefix(snapshot.files, root));
};
