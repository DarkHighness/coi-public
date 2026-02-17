import type {
  VfsBlobRecord,
  VfsFile,
  VfsFileMap,
  VfsIndex,
  VfsIndexEntry,
  VfsSnapshot,
  VfsSnapshotFileRefMap,
  VfsStoredSnapshot,
  VfsStoredSnapshotV2,
} from "./types";
import { computeBlobId } from "./blobHash";
import { hashContent } from "./utils";
import {
  openVfsDB,
  VFS_BLOBS_STORE,
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

const cloneStoredSnapshot = (snapshot: VfsStoredSnapshot): VfsStoredSnapshot =>
  JSON.parse(JSON.stringify(snapshot)) as VfsStoredSnapshot;

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

const isStoredSnapshotV2 = (
  snapshot: VfsStoredSnapshot | null | undefined,
): snapshot is VfsStoredSnapshotV2 =>
  Boolean(
    snapshot &&
    typeof snapshot === "object" &&
    (snapshot as VfsStoredSnapshotV2).version === 2 &&
    (snapshot as VfsStoredSnapshotV2).fileRefs &&
    typeof (snapshot as VfsStoredSnapshotV2).fileRefs === "object",
  );

const snapshotKey = (saveId: string, forkId: number, turn: number): string =>
  `${saveId}:${forkId}:${turn}`;

const blobKey = (saveId: string, blobId: string): string =>
  `${saveId}:${blobId}`;

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const countFileRefs = (
  fileRefs: VfsSnapshotFileRefMap,
): Map<string, number> => {
  const counts = new Map<string, number>();

  for (const fileRef of Object.values(fileRefs)) {
    counts.set(fileRef.blobId, (counts.get(fileRef.blobId) ?? 0) + 1);
  }

  return counts;
};

const buildStoredSnapshotV2 = async (
  snapshot: VfsSnapshot,
): Promise<{
  stored: VfsStoredSnapshotV2;
  blobCandidates: Map<string, VfsBlobRecord>;
}> => {
  const fileRefs: VfsSnapshotFileRefMap = {};
  const blobCandidates = new Map<string, VfsBlobRecord>();

  for (const file of Object.values(snapshot.files)) {
    const blobId = await computeBlobId(file.contentType, file.content);
    const id = blobKey(snapshot.saveId, blobId);

    if (!blobCandidates.has(blobId)) {
      blobCandidates.set(blobId, {
        id,
        saveId: snapshot.saveId,
        blobId,
        content: file.content,
        contentType: file.contentType,
        size: file.size,
        refCount: 0,
        updatedAt: Date.now(),
      });
    }

    fileRefs[file.path] = {
      path: file.path,
      blobId,
      contentType: file.contentType,
      size: file.size,
      updatedAt: file.updatedAt,
      legacyHash: file.hash,
    };
  }

  return {
    stored: {
      version: 2,
      saveId: snapshot.saveId,
      forkId: snapshot.forkId,
      turn: snapshot.turn,
      createdAt: snapshot.createdAt,
      fileRefs,
    },
    blobCandidates,
  };
};

const restoreSnapshotFromStoredV2 = (
  stored: VfsStoredSnapshotV2,
  blobsById: Map<string, VfsBlobRecord>,
): VfsSnapshot => {
  const files: VfsFileMap = {};

  for (const fileRef of Object.values(stored.fileRefs)) {
    const blob = blobsById.get(fileRef.blobId);
    if (!blob) {
      console.warn(
        `[VFS Store] Missing blob ${fileRef.blobId} for ${stored.saveId}:${stored.forkId}:${stored.turn}`,
      );
      continue;
    }

    const content = blob.content;
    const file: VfsFile = {
      path: fileRef.path,
      content,
      contentType: fileRef.contentType,
      hash: fileRef.legacyHash ?? hashContent(content),
      size: fileRef.size ?? content.length,
      updatedAt: fileRef.updatedAt ?? blob.updatedAt,
    };
    files[file.path] = file;
  }

  return {
    saveId: stored.saveId,
    forkId: stored.forkId,
    turn: stored.turn,
    createdAt: stored.createdAt,
    files,
  };
};

interface IndexedDbVfsAdapter {
  saveSnapshot(snapshot: VfsSnapshot, index: VfsIndex): Promise<void>;
  loadSnapshot(
    saveId: string,
    forkId: number,
    turn: number,
  ): Promise<VfsSnapshot | null>;
  listSnapshots(saveId: string, forkId: number): Promise<VfsIndex[]>;
}

type VfsSnapshotRecord = VfsStoredSnapshot & { id: string };
type VfsIndexRecord = VfsIndex & { id: string };

class IndexedDbVfsAdapterImpl implements IndexedDbVfsAdapter {
  async saveSnapshot(snapshot: VfsSnapshot, index: VfsIndex): Promise<void> {
    const db = await openVfsDB();
    const id = snapshotKey(snapshot.saveId, snapshot.forkId, snapshot.turn);
    const { stored, blobCandidates } = await buildStoredSnapshotV2(snapshot);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [VFS_SNAPSHOTS_STORE, VFS_META_STORE, VFS_BLOBS_STORE],
        "readwrite",
      );
      const snapshotStore = transaction.objectStore(VFS_SNAPSHOTS_STORE);
      const metaStore = transaction.objectStore(VFS_META_STORE);
      const blobStore = transaction.objectStore(VFS_BLOBS_STORE);

      let settled = false;
      const settleError = (error: unknown) => {
        if (settled) return;
        settled = true;
        reject(error);
      };

      transaction.oncomplete = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      transaction.onerror = () => settleError(transaction.error);
      transaction.onabort = () => settleError(transaction.error);

      (async () => {
        const existingRequest = snapshotStore.get(id);
        const existingRecord = (await requestToPromise(existingRequest)) as
          | VfsSnapshotRecord
          | undefined;

        const nextRefCounts = countFileRefs(stored.fileRefs);
        const previousRefCounts = isStoredSnapshotV2(existingRecord)
          ? countFileRefs(existingRecord.fileRefs)
          : new Map<string, number>();

        const blobIds = new Set<string>([
          ...nextRefCounts.keys(),
          ...previousRefCounts.keys(),
        ]);

        for (const blobId of blobIds) {
          const delta =
            (nextRefCounts.get(blobId) ?? 0) -
            (previousRefCounts.get(blobId) ?? 0);

          if (delta === 0) {
            continue;
          }

          const blobIdKey = blobKey(snapshot.saveId, blobId);
          const blobRecordRequest = blobStore.get(blobIdKey);
          const current = (await requestToPromise(blobRecordRequest)) as
            | VfsBlobRecord
            | undefined;
          const currentRefCount =
            typeof current?.refCount === "number" ? current.refCount : 0;
          const nextRefCount = currentRefCount + delta;

          if (nextRefCount <= 0) {
            blobStore.delete(blobIdKey);
            continue;
          }

          const candidate = blobCandidates.get(blobId);
          if (!current) {
            if (!candidate) {
              console.warn(
                `[VFS Store] Missing blob candidate for ${blobId} while writing snapshot ${id}`,
              );
              continue;
            }

            blobStore.put({
              ...candidate,
              refCount: nextRefCount,
              updatedAt: Date.now(),
            });
            continue;
          }

          blobStore.put({
            ...current,
            refCount: nextRefCount,
            updatedAt: Date.now(),
          });
        }

        snapshotStore.put({ ...stored, id });
        metaStore.put({ ...index, id });
      })().catch((error) => {
        settleError(error);
        try {
          transaction.abort();
        } catch {
          // Ignore abort race.
        }
      });
    });
  }

  async loadSnapshot(
    saveId: string,
    forkId: number,
    turn: number,
  ): Promise<VfsSnapshot | null> {
    const db = await openVfsDB();
    const id = snapshotKey(saveId, forkId, turn);

    const record = await new Promise<VfsSnapshotRecord | null>(
      (resolve, reject) => {
        const transaction = db.transaction([VFS_SNAPSHOTS_STORE], "readonly");
        const store = transaction.objectStore(VFS_SNAPSHOTS_STORE);
        const request = store.get(id);

        request.onsuccess = () =>
          resolve((request.result as VfsSnapshotRecord | undefined) ?? null);
        request.onerror = () => reject(request.error);
      },
    );

    if (!record) {
      return null;
    }

    if (!isStoredSnapshotV2(record)) {
      console.warn(
        `[VFS Store] Unexpected non-v2 snapshot row at ${saveId}:${forkId}:${turn}`,
      );
      return null;
    }

    const blobIds = Array.from(
      new Set(Object.values(record.fileRefs).map((fileRef) => fileRef.blobId)),
    );

    const blobRows = await new Promise<VfsBlobRecord[]>((resolve, reject) => {
      const transaction = db.transaction([VFS_BLOBS_STORE], "readonly");
      const blobStore = transaction.objectStore(VFS_BLOBS_STORE);

      const blobs: VfsBlobRecord[] = [];
      let pending = blobIds.length;

      if (pending === 0) {
        resolve([]);
        return;
      }

      for (const blobId of blobIds) {
        const request = blobStore.get(blobKey(saveId, blobId));
        request.onsuccess = () => {
          const row = request.result as VfsBlobRecord | undefined;
          if (row) blobs.push(row);
          pending -= 1;
          if (pending === 0) {
            resolve(blobs);
          }
        };
        request.onerror = () => reject(request.error);
      }
    });

    const blobsById = new Map<string, VfsBlobRecord>(
      blobRows.map((row) => [row.blobId, row]),
    );

    const { id: _, ...storedSnapshot } = record;
    return cloneSnapshot(
      restoreSnapshotFromStoredV2(storedSnapshot, blobsById),
    );
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
  private snapshots = new Map<string, VfsStoredSnapshot>();
  private indexes = new Map<string, VfsIndex>();
  private blobs = new Map<string, VfsBlobRecord>();

  async saveSnapshot(snapshot: VfsSnapshot): Promise<void> {
    const key = this.snapshotKey(
      snapshot.saveId,
      snapshot.forkId,
      snapshot.turn,
    );
    const storedSnapshot = cloneSnapshot(snapshot);
    const { stored, blobCandidates } =
      await buildStoredSnapshotV2(storedSnapshot);

    const existing = this.snapshots.get(key);
    const previousRefCounts = existing
      ? countFileRefs(existing.fileRefs)
      : new Map<string, number>();
    const nextRefCounts = countFileRefs(stored.fileRefs);

    const blobIds = new Set<string>([
      ...previousRefCounts.keys(),
      ...nextRefCounts.keys(),
    ]);

    for (const blobId of blobIds) {
      const delta =
        (nextRefCounts.get(blobId) ?? 0) - (previousRefCounts.get(blobId) ?? 0);
      if (delta === 0) {
        continue;
      }

      const blobIdKey = blobKey(snapshot.saveId, blobId);
      const current = this.blobs.get(blobIdKey);
      const currentRefCount = current?.refCount ?? 0;
      const nextRefCount = currentRefCount + delta;

      if (nextRefCount <= 0) {
        this.blobs.delete(blobIdKey);
        continue;
      }

      if (!current) {
        const candidate = blobCandidates.get(blobId);
        if (!candidate) continue;

        this.blobs.set(blobIdKey, {
          ...candidate,
          refCount: nextRefCount,
          updatedAt: Date.now(),
        });
        continue;
      }

      this.blobs.set(blobIdKey, {
        ...current,
        refCount: nextRefCount,
        updatedAt: Date.now(),
      });
    }

    this.snapshots.set(key, cloneStoredSnapshot(stored));
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
    const stored = this.snapshots.get(key);
    if (!stored) {
      return null;
    }

    const blobsById = new Map<string, VfsBlobRecord>();
    for (const fileRef of Object.values(stored.fileRefs)) {
      const blob = this.blobs.get(blobKey(saveId, fileRef.blobId));
      if (blob) {
        blobsById.set(fileRef.blobId, blob);
      }
    }
    return cloneSnapshot(restoreSnapshotFromStoredV2(stored, blobsById));
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
