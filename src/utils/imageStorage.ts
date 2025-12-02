import { openDB, IMAGES_STORE } from "./indexedDB";
import { generateUUID } from "./uuid";

export interface ImageMetadata {
  saveId: string;
  forkId: number;
  turnIdx: number;
  imagePrompt?: string;
  timestamp: number;
}

export interface StoredImage extends ImageMetadata {
  id: string;
  blob: Blob;
}

/**
 * Save an image to IndexedDB
 * @returns The unique ID of the saved image
 */
export const saveImage = async (
  blob: Blob,
  metadata: Omit<ImageMetadata, "timestamp">,
): Promise<string> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([IMAGES_STORE], "readwrite");
    const store = transaction.objectStore(IMAGES_STORE);
    const index = store.index("segment_unique");

    // Check if image already exists for this segment
    const checkRequest = index.get([
      metadata.saveId,
      metadata.forkId,
      metadata.turnIdx,
    ]);

    checkRequest.onsuccess = () => {
      const existingImage = checkRequest.result as StoredImage | undefined;

      if (existingImage) {
        // Delete existing image to force a new ID generation
        // This ensures React components detect the change (since ID changes)
        const deleteRequest = store.delete(existingImage.id);

        deleteRequest.onsuccess = () => {
          // Create new image with new ID
          const id = generateUUID();
          const newImage: StoredImage = {
            id,
            blob,
            ...metadata,
            timestamp: Date.now(),
          };
          const addRequest = store.add(newImage);
          addRequest.onsuccess = () => resolve(id);
          addRequest.onerror = () => reject(addRequest.error);
        };
        deleteRequest.onerror = () => reject(deleteRequest.error);
      } else {
        // Create new image
        const id = generateUUID();
        const newImage: StoredImage = {
          id,
          blob,
          ...metadata,
          timestamp: Date.now(),
        };
        const addRequest = store.add(newImage);
        addRequest.onsuccess = () => resolve(id);
        addRequest.onerror = () => reject(addRequest.error);
      }
    };

    checkRequest.onerror = () => reject(checkRequest.error);
  });
};

/**
 * Get an image blob by ID
 */
export const getImage = async (id: string): Promise<Blob | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([IMAGES_STORE], "readonly");
    const store = transaction.objectStore(IMAGES_STORE);
    const request = store.get(id);

    request.onsuccess = () => {
      const result = request.result as StoredImage | undefined;
      resolve(result ? result.blob : null);
    };
    request.onerror = () => reject(request.error);
  });
};

/**
 * Delete an image by ID
 */
export const deleteImage = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([IMAGES_STORE], "readwrite");
    const store = transaction.objectStore(IMAGES_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Delete all images associated with a specific save ID
 */
export const deleteImagesBySaveId = async (saveId: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([IMAGES_STORE], "readwrite");
    const store = transaction.objectStore(IMAGES_STORE);
    const index = store.index("saveId");
    const request = index.openKeyCursor(IDBKeyRange.only(saveId));

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get storage statistics for images
 */
export const getImageStorageStats = async (): Promise<{
  count: number;
  size: number;
}> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([IMAGES_STORE], "readonly");
    const store = transaction.objectStore(IMAGES_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const images = request.result as StoredImage[];
      const count = images.length;
      const size = images.reduce((acc, img) => acc + img.blob.size, 0);
      resolve({ count, size });
    };
    request.onerror = () => reject(request.error);
  });
};

/**
 * Delete all images from the store
 */
export const clearAllImages = async (): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([IMAGES_STORE], "readwrite");
    const store = transaction.objectStore(IMAGES_STORE);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
