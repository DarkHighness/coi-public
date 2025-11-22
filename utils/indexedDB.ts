/**
 * IndexedDB wrapper for game save data
 * Provides much larger storage capacity than localStorage
 */

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
export const saveGameState = async (id: string, data: any): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SAVES_STORE], "readwrite");
    const store = transaction.objectStore(SAVES_STORE);
    const request = store.put({ id, data, timestamp: Date.now() });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Load game state from IndexedDB
 */
export const loadGameState = async (id: string): Promise<any | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SAVES_STORE], "readonly");
    const store = transaction.objectStore(SAVES_STORE);
    const request = store.get(id);

    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? result.data : null);
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
export const saveMetadata = async (key: string, data: any): Promise<void> => {
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
export const loadMetadata = async (key: string): Promise<any | null> => {
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
