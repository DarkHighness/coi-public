import type { VfsFileMap, VfsIndex, VfsIndexEntry, VfsSnapshot } from "./types";
import {
  openVfsDB,
  VFS_META_STORE,
  VFS_SNAPSHOTS_STORE,
} from "../../utils/indexedDB";

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

interface IndexedDbVfsAdapter {
  saveSnapshot(snapshot: VfsSnapshot, index: VfsIndex): Promise<void>;
  loadSnapshot(
    saveId: string,
    forkId: number,
    turn: number,
  ): Promise<VfsSnapshot | null>;
  listSnapshots(saveId: string, forkId: number): Promise<VfsIndex[]>;
}

type VfsSnapshotRecord = VfsSnapshot & { id: string };
type VfsIndexRecord = VfsIndex & { id: string };

const snapshotKey = (saveId: string, forkId: number, turn: number): string =>
  `${saveId}:${forkId}:${turn}`;

class IndexedDbVfsAdapterImpl implements IndexedDbVfsAdapter {
  async saveSnapshot(snapshot: VfsSnapshot, index: VfsIndex): Promise<void> {
    const db = await openVfsDB();
    const id = snapshotKey(snapshot.saveId, snapshot.forkId, snapshot.turn);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [VFS_SNAPSHOTS_STORE, VFS_META_STORE],
        "readwrite",
      );
      const snapshotStore = transaction.objectStore(VFS_SNAPSHOTS_STORE);
      const metaStore = transaction.objectStore(VFS_META_STORE);

      snapshotStore.put({ ...snapshot, id });
      metaStore.put({ ...index, id });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  async loadSnapshot(
    saveId: string,
    forkId: number,
    turn: number,
  ): Promise<VfsSnapshot | null> {
    const db = await openVfsDB();
    const id = snapshotKey(saveId, forkId, turn);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([VFS_SNAPSHOTS_STORE], "readonly");
      const store = transaction.objectStore(VFS_SNAPSHOTS_STORE);
      const request = store.get(id);

      request.onsuccess = () => {
        const result = request.result as VfsSnapshotRecord | undefined;
        if (!result) {
          resolve(null);
          return;
        }
        const { id: _, ...snapshot } = result;
        resolve(snapshot);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async listSnapshots(saveId: string, forkId: number): Promise<VfsIndex[]> {
    const db = await openVfsDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([VFS_META_STORE], "readonly");
      const store = transaction.objectStore(VFS_META_STORE);
      const index = store.index("saveFork");
      const range = IDBKeyRange.only([saveId, forkId]);
      const request = index.getAll(range);

      request.onsuccess = () => {
        const results = (request.result as VfsIndexRecord[] | undefined) ?? [];
        resolve(
          results
            .map(({ id: _, ...entry }) => entry)
            .sort((a, b) => a.turn - b.turn),
        );
      };
      request.onerror = () => reject(request.error);
    });
  }
}

export class InMemoryVfsStore implements VfsStore {
  private snapshots = new Map<string, VfsSnapshot>();
  private indexes = new Map<string, VfsIndex>();

  async saveSnapshot(snapshot: VfsSnapshot): Promise<void> {
    const key = this.snapshotKey(
      snapshot.saveId,
      snapshot.forkId,
      snapshot.turn,
    );
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

export class IndexedDbVfsStore implements VfsStore {
  private adapter: IndexedDbVfsAdapter;

  constructor(adapter: IndexedDbVfsAdapter = new IndexedDbVfsAdapterImpl()) {
    this.adapter = adapter;
  }

  async saveSnapshot(snapshot: VfsSnapshot): Promise<void> {
    const storedSnapshot = cloneSnapshot(snapshot);
    const index = buildVfsIndex(storedSnapshot.files, {
      saveId: storedSnapshot.saveId,
      forkId: storedSnapshot.forkId,
      turn: storedSnapshot.turn,
      createdAt: storedSnapshot.createdAt,
    });
    await this.adapter.saveSnapshot(storedSnapshot, index);
  }

  async loadSnapshot(
    saveId: string,
    forkId: number,
    turn: number,
  ): Promise<VfsSnapshot | null> {
    const snapshot = await this.adapter.loadSnapshot(saveId, forkId, turn);
    return snapshot ? cloneSnapshot(snapshot) : null;
  }

  async listSnapshots(saveId: string, forkId: number): Promise<VfsIndex[]> {
    const indexes = await this.adapter.listSnapshots(saveId, forkId);
    return indexes.map((entry) => ({
      ...entry,
      files: entry.files.map((file) => ({ ...file })),
    }));
  }
}
