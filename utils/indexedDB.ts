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
const DB_VERSION = 2;
const SAVES_STORE = "saves";
const META_STORE = "meta";
const AUDIO_STORE = "audio";

interface DBConnection {
  db: IDBDatabase;
}

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Initialize and open the IndexedDB database
 */
const openDB = (): Promise<IDBDatabase> => {
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
    };
  });

  return dbPromise;
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
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      console.warn("Delete database blocked");
      // Try to resolve anyway as we can't do much else
      resolve();
    };
  });
};
