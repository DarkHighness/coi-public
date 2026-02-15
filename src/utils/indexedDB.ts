/**
 * IndexedDB wrapper for game save data
 * Provides much larger storage capacity than localStorage
 */

const DB_NAME = "ChroniclesOfInfinity";
const DB_VERSION = 4;
export const SAVES_STORE = "saves";
export const META_STORE = "meta";
export const AUDIO_STORE = "audio";
export const IMAGES_STORE = "images";
export const VFS_DB_NAME = "ChroniclesOfInfinityVFS";
const VFS_DB_VERSION = 2;
export const VFS_SNAPSHOTS_STORE = "vfs_snapshots";
export const VFS_META_STORE = "vfs_meta";
export const VFS_BLOBS_STORE = "vfs_blobs";

let dbPromise: Promise<IDBDatabase> | null = null;
let vfsDbPromise: Promise<IDBDatabase> | null = null;

/**
 * Initialize and open the IndexedDB database
 */
export const openDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("Failed to open IndexedDB:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create saves store if it doesn't exist
      if (!db.objectStoreNames.contains(SAVES_STORE)) {
        db.createObjectStore(SAVES_STORE, { keyPath: "id" });
      }

      // Create meta store if it doesn't exist
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }

      // Create audio store if it doesn't exist
      if (!db.objectStoreNames.contains(AUDIO_STORE)) {
        db.createObjectStore(AUDIO_STORE);
      }

      // Create images store if it doesn't exist
      if (!db.objectStoreNames.contains(IMAGES_STORE)) {
        const store = db.createObjectStore(IMAGES_STORE, { keyPath: "id" });
        // Create index for saveId to allow bulk deletion
        store.createIndex("saveId", "saveId", { unique: false });
        // Create compound index for uniqueness
        store.createIndex("segment_unique", ["saveId", "forkId", "turnIdx"], {
          unique: true,
        });
      } else {
        // Upgrade existing store
        const store = (
          event.target as IDBOpenDBRequest
        ).transaction!.objectStore(IMAGES_STORE);
        if (!store.indexNames.contains("segment_unique")) {
          store.createIndex("segment_unique", ["saveId", "forkId", "turnIdx"], {
            unique: true,
          });
        }
      }
    };
  });

  return dbPromise;
};

/**
 * Initialize and open the VFS IndexedDB database
 */
export const openVfsDB = (): Promise<IDBDatabase> => {
  if (vfsDbPromise) return vfsDbPromise;

  vfsDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(VFS_DB_NAME, VFS_DB_VERSION);

    request.onerror = () => {
      console.error("Failed to open VFS IndexedDB:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(VFS_SNAPSHOTS_STORE)) {
        db.createObjectStore(VFS_SNAPSHOTS_STORE, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(VFS_META_STORE)) {
        const store = db.createObjectStore(VFS_META_STORE, { keyPath: "id" });
        store.createIndex("saveFork", ["saveId", "forkId"], { unique: false });
      } else {
        const store = (
          event.target as IDBOpenDBRequest
        ).transaction!.objectStore(VFS_META_STORE);
        if (!store.indexNames.contains("saveFork")) {
          store.createIndex("saveFork", ["saveId", "forkId"], {
            unique: false,
          });
        }
      }

      if (!db.objectStoreNames.contains(VFS_BLOBS_STORE)) {
        const store = db.createObjectStore(VFS_BLOBS_STORE, { keyPath: "id" });
        store.createIndex("saveId", "saveId", { unique: false });
      } else {
        const store = (
          event.target as IDBOpenDBRequest
        ).transaction!.objectStore(VFS_BLOBS_STORE);
        if (!store.indexNames.contains("saveId")) {
          store.createIndex("saveId", "saveId", { unique: false });
        }
      }
    };
  });

  return vfsDbPromise;
};

/**
 * Get all VFS save IDs (derived from VFS metadata store).
 * Useful for recovering saves when the `slots` metadata is missing/corrupted.
 */
export const getAllVfsSaveIds = async (): Promise<string[]> => {
  const db = await openVfsDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([VFS_META_STORE], "readonly");
    const store = transaction.objectStore(VFS_META_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const rows = (request.result as any[] | undefined) ?? [];
      const ids = new Set<string>();
      for (const row of rows) {
        if (row && typeof row.saveId === "string") {
          ids.add(row.saveId);
        }
      }
      resolve(Array.from(ids));
    };
    request.onerror = () => reject(request.error);
  });
};

/**
 * Save metadata (save slots info)
 */
export const saveMetadata = async <T>(key: string, data: T): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([META_STORE], "readwrite");
    const store = transaction.objectStore(META_STORE);
    const request = store.put(data, key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Load metadata
 */
export const loadMetadata = async <T = any>(key: string): Promise<T | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([META_STORE], "readonly");
    const store = transaction.objectStore(META_STORE);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Delete a metadata entry
 */
export const deleteMetadata = async (key: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([META_STORE], "readwrite");
    const store = transaction.objectStore(META_STORE);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Delete all VFS snapshots and metadata for a given saveId.
 * This is required so deleted saves don't get re-inferred from VFS state on reload.
 */
export const deleteVfsSave = async (saveId: string): Promise<void> => {
  const db = await openVfsDB();
  const prefix = `${saveId}:`;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      [VFS_META_STORE, VFS_SNAPSHOTS_STORE, VFS_BLOBS_STORE],
      "readwrite",
    );
    const metaStore = transaction.objectStore(VFS_META_STORE);
    const snapshotsStore = transaction.objectStore(VFS_SNAPSHOTS_STORE);
    const blobsStore = transaction.objectStore(VFS_BLOBS_STORE);

    // 1) Delete any rows we can identify via VFS meta records.
    const metaCursorReq = metaStore.openCursor();
    metaCursorReq.onsuccess = () => {
      const cursor = metaCursorReq.result as IDBCursorWithValue | null;
      if (!cursor) {
        // 2) Delete blobs for this save.
        if (blobsStore.indexNames.contains("saveId")) {
          const blobIndex = blobsStore.index("saveId");
          const blobCursorReq = blobIndex.openKeyCursor(IDBKeyRange.only(saveId));
          blobCursorReq.onsuccess = () => {
            const blobCursor = blobCursorReq.result as IDBCursor | null;
            if (!blobCursor) {
              return;
            }
            blobsStore.delete(blobCursor.primaryKey);
            blobCursor.continue();
          };
          blobCursorReq.onerror = () => reject(blobCursorReq.error);
        } else {
          const blobCursorReq = blobsStore.openKeyCursor();
          blobCursorReq.onsuccess = () => {
            const blobCursor = blobCursorReq.result as IDBCursor | null;
            if (!blobCursor) {
              return;
            }
            const key = String(blobCursor.primaryKey ?? "");
            if (key.startsWith(prefix)) {
              blobsStore.delete(blobCursor.primaryKey);
            }
            blobCursor.continue();
          };
          blobCursorReq.onerror = () => reject(blobCursorReq.error);
        }

        // 3) Also delete orphan snapshot rows (if any) by key prefix.
        const snapCursorReq = snapshotsStore.openKeyCursor();
        snapCursorReq.onsuccess = () => {
          const snapCursor = snapCursorReq.result as IDBCursor | null;
          if (!snapCursor) {
            return;
          }
          const key = String(snapCursor.primaryKey ?? "");
          if (key.startsWith(prefix)) {
            snapshotsStore.delete(snapCursor.primaryKey);
          }
          snapCursor.continue();
        };
        snapCursorReq.onerror = () => reject(snapCursorReq.error);
        return;
      }

      const row = cursor.value as any;
      if (row && typeof row.saveId === "string" && row.saveId === saveId) {
        const id = cursor.primaryKey;
        metaStore.delete(id);
        snapshotsStore.delete(id);
      }
      cursor.continue();
    };
    metaCursorReq.onerror = () => reject(metaCursorReq.error);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
};

/**
 * Save audio blob
 */
export const saveAudio = async (key: string, data: Blob): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([AUDIO_STORE], "readwrite");
    const store = transaction.objectStore(AUDIO_STORE);
    const request = store.put(data, key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Load audio blob
 */
export const loadAudio = async (key: string): Promise<Blob | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([AUDIO_STORE], "readonly");
    const store = transaction.objectStore(AUDIO_STORE);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get storage usage estimate (if available)
 */
export const getStorageEstimate = async (): Promise<{
  usage?: number;
  quota?: number;
} | null> => {
  if ("storage" in navigator && "estimate" in navigator.storage) {
    return await navigator.storage.estimate();
  }
  return null;
};

/**
 * Clear the entire database (Hard Reset)
 */
export const clearDatabase = async (): Promise<void> => {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }

  if (vfsDbPromise) {
    try {
      const vfsDb = await vfsDbPromise;
      vfsDb.close();
    } catch {
      // Ignore failed open; still attempt deletion below.
    }
    vfsDbPromise = null;
  }

  const deleteDb = (name: string): Promise<void> =>
    new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(name);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => {
        console.warn(`Delete database blocked: ${name}`);
        // Try to resolve anyway as we can't do much else
        resolve();
      };
    });

  await deleteDb(DB_NAME);
  await deleteDb(VFS_DB_NAME);
};
