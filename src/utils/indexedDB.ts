// Compression Helpers
const compress = async (str: string): Promise<ArrayBuffer> => {
  const stream = new Blob([str]).stream();
  const compressedStream = stream.pipeThrough(new CompressionStream("gzip"));
  return new Response(compressedStream).arrayBuffer();
};

const decompress = async (buffer: ArrayBuffer): Promise<string> => {
  const stream = new Blob([buffer]).stream();
  const decompressedStream = stream.pipeThrough(
    new DecompressionStream("gzip"),
  );
  return new Response(decompressedStream).text();
};

/**
 * IndexedDB wrapper for game save data
 * Provides much larger storage capacity than localStorage
 */

import { getMigrationManager } from "../services/migrationManager";

const DB_NAME = "ChroniclesOfInfinity";
const DB_VERSION = 4;
export const SAVES_STORE = "saves";
export const META_STORE = "meta";
export const AUDIO_STORE = "audio";
export const IMAGES_STORE = "images";
export const VFS_DB_NAME = "ChroniclesOfInfinityVFS";
const VFS_DB_VERSION = 1;
export const VFS_SNAPSHOTS_STORE = "vfs_snapshots";
export const VFS_META_STORE = "vfs_meta";

interface DBConnection {
  db: IDBDatabase;
}

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
    };
  });

  return vfsDbPromise;
};

/**
 * Save game state to IndexedDB
 */
export const saveGameState = async <T>(id: string, data: T): Promise<void> => {
  // Compress BEFORE opening transaction to prevent auto-commit during async compression
  const jsonString = JSON.stringify(data);
  const compressed = await compress(jsonString);

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SAVES_STORE], "readwrite");
    const store = transaction.objectStore(SAVES_STORE);

    const request = store.put({
      id,
      data: compressed,
      isCompressed: true,
      compressionMethod: "gzip",
      timestamp: Date.now(),
    });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Load game state from IndexedDB
 * Automatically applies version migrations if needed
 */
export const loadGameState = async <T = any>(
  id: string,
  options?: { skipMigration?: boolean },
): Promise<T | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SAVES_STORE], "readonly");
    const store = transaction.objectStore(SAVES_STORE);
    const request = store.get(id);

    request.onsuccess = async () => {
      const result = request.result;
      if (!result) {
        resolve(null);
        return;
      }

      try {
        let finalData = result.data;

        // Handle compression
        if (result.isCompressed) {
          // Method 1: Native GZIP (ArrayBuffer)
          if (
            result.data instanceof ArrayBuffer ||
            (result.data && result.data.byteLength !== undefined)
          ) {
            try {
              const json = await decompress(result.data);
              finalData = JSON.parse(json);
            } catch (e) {
              console.error("GZIP Decompression failed", e);
              resolve(null);
              return;
            }
          } else if (typeof result.data === "string") {
            finalData = JSON.parse(result.data);
          }
        }

        // Apply version migrations if needed
        if (!options?.skipMigration && finalData) {
          const migrationManager = getMigrationManager();
          if (migrationManager.needsMigration(finalData)) {
            console.log(`[IndexedDB] Save ${id} needs migration`);
            try {
              finalData = await migrationManager.migrate(finalData);
              // Auto-save the migrated state
              await saveGameState(id, finalData);
              console.log(`[IndexedDB] Save ${id} migrated and saved`);
            } catch (migrationError) {
              console.error(
                `[IndexedDB] Migration failed for ${id}:`,
                migrationError,
              );
              // Continue with unmigrated data
            }
          }
        }

        resolve(finalData);
      } catch (e) {
        console.error("Error parsing save data:", e);
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

/**
 * Delete a save from IndexedDB
 */
export const deleteGameState = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SAVES_STORE], "readwrite");
    const store = transaction.objectStore(SAVES_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get all save IDs
 */
export const getAllSaveIds = async (): Promise<string[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SAVES_STORE], "readonly");
    const store = transaction.objectStore(SAVES_STORE);
    const request = store.getAllKeys();

    request.onsuccess = () => resolve(request.result as string[]);
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
