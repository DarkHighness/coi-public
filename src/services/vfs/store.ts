import type { VfsFileMap, VfsIndex, VfsIndexEntry, VfsSnapshot } from "./types";

export interface VfsStore {
  saveSnapshot(snapshot: VfsSnapshot): Promise<void>;
  loadSnapshot(
    saveId: string,
    forkId: number,
    turn: number,
  ): Promise<VfsSnapshot | null>;
  listSnapshots(saveId: string, forkId: number): Promise<VfsIndex[]>;
}

const cloneSnapshot = (snapshot: VfsSnapshot): VfsSnapshot =>
  JSON.parse(JSON.stringify(snapshot)) as VfsSnapshot;

const buildVfsIndexEntries = (files: VfsFileMap): VfsIndexEntry[] =>
  Object.values(files)
    .map((file) => ({
      path: file.path,
      hash: file.hash,
      size: file.size,
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

export const buildVfsIndex = (
  files: VfsFileMap,
  meta: { saveId: string; forkId: number; turn: number; createdAt: number } = {
    saveId: "",
    forkId: 0,
    turn: 0,
    createdAt: 0,
  },
): VfsIndex => ({
  saveId: meta.saveId,
  forkId: meta.forkId,
  turn: meta.turn,
  createdAt: meta.createdAt,
  files: buildVfsIndexEntries(files),
});

export class InMemoryVfsStore implements VfsStore {
  private snapshots = new Map<string, VfsSnapshot>();
  private indexes = new Map<string, VfsIndex>();

  async saveSnapshot(snapshot: VfsSnapshot): Promise<void> {
    const key = this.snapshotKey(snapshot.saveId, snapshot.forkId, snapshot.turn);
    const storedSnapshot = cloneSnapshot(snapshot);
    this.snapshots.set(key, storedSnapshot);
    this.indexes.set(
      key,
      buildVfsIndex(storedSnapshot.files, {
        saveId: storedSnapshot.saveId,
        forkId: storedSnapshot.forkId,
        turn: storedSnapshot.turn,
        createdAt: storedSnapshot.createdAt,
      }),
    );
  }

  async loadSnapshot(
    saveId: string,
    forkId: number,
    turn: number,
  ): Promise<VfsSnapshot | null> {
    const key = this.snapshotKey(saveId, forkId, turn);
    const snapshot = this.snapshots.get(key);
    return snapshot ? cloneSnapshot(snapshot) : null;
  }

  async listSnapshots(saveId: string, forkId: number): Promise<VfsIndex[]> {
    return Array.from(this.indexes.values())
      .filter((entry) => entry.saveId === saveId && entry.forkId === forkId)
      .sort((a, b) => a.turn - b.turn)
      .map((entry) => ({
        ...entry,
        files: entry.files.map((file) => ({ ...file })),
      }));
  }

  private snapshotKey(saveId: string, forkId: number, turn: number): string {
    return `${saveId}:${forkId}:${turn}`;
  }
}
