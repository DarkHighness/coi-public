import React, { createContext, useContext, useCallback } from "react";
import {
  saveImage,
  getImage,
  deleteImage,
  deleteImagesBySaveId,
  ImageMetadata,
} from "../utils/imageStorage";

interface ImageStorageContextType {
  saveImage: (
    blob: Blob,
    metadata: Omit<ImageMetadata, "timestamp">,
  ) => Promise<string>;
  getImage: (id: string) => Promise<Blob | null>;
  deleteImage: (id: string) => Promise<void>;
  deleteImagesBySaveId: (saveId: string) => Promise<void>;
}

const ImageStorageContext = createContext<ImageStorageContextType | null>(null);

export const ImageStorageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Simple LRU Cache: Map<imageId, { blob: Blob, timestamp: number }>
  const cacheRef = React.useRef<Map<string, { blob: Blob; lastUsed: number }>>(
    new Map(),
  );
  const CACHE_LIMIT = 50; // Max number of images to keep in memory

  const getCachedImage = useCallback((id: string) => {
    const cache = cacheRef.current;
    const entry = cache.get(id);
    if (entry) {
      // Update last used timestamp
      entry.lastUsed = Date.now();
      // Re-insert to update order (for LRU) if we were using a Map iterator,
      // but here we just track timestamp.
      // Actually, for a true LRU with Map, deleting and re-setting puts it at the end.
      cache.delete(id);
      cache.set(id, entry);
      return entry.blob;
    }
    return null;
  }, []);

  const cacheImage = useCallback((id: string, blob: Blob) => {
    const cache = cacheRef.current;

    // If cache is full, remove least recently used
    if (cache.size >= CACHE_LIMIT) {
      // Map.keys() returns iterator in insertion order.
      // Since we re-insert on access, the first item is the LRU.
      const lruId = cache.keys().next().value;
      if (lruId) cache.delete(lruId);
    }

    cache.set(id, { blob, lastUsed: Date.now() });
  }, []);

  const getImageWithCache = useCallback(
    async (id: string) => {
      // 1. Check Cache
      const cached = getCachedImage(id);
      if (cached) {
        return cached;
      }

      // 2. Fetch from IDB
      const blob = await getImage(id);

      // 3. Update Cache
      if (blob) {
        cacheImage(id, blob);
      }

      return blob;
    },
    [getCachedImage, cacheImage],
  );

  const saveImageWithCache = useCallback(
    async (blob: Blob, metadata: Omit<ImageMetadata, "timestamp">) => {
      const id = await saveImage(blob, metadata);
      cacheImage(id, blob);
      return id;
    },
    [cacheImage],
  );

  const deleteImageWithCache = useCallback(async (id: string) => {
    await deleteImage(id);
    cacheRef.current.delete(id);
  }, []);

  const deleteImagesBySaveIdWithCache = useCallback(async (saveId: string) => {
    await deleteImagesBySaveId(saveId);
    // We can't easily know which images belong to the saveId without querying IDB or storing metadata in cache.
    // For simplicity, we might clear the whole cache or just accept that some dead entries might remain until evicted.
    // Clearing cache is safer to avoid stale data.
    cacheRef.current.clear();
  }, []);

  const value = {
    saveImage: saveImageWithCache,
    getImage: getImageWithCache,
    deleteImage: deleteImageWithCache,
    deleteImagesBySaveId: deleteImagesBySaveIdWithCache,
  };

  return (
    <ImageStorageContext.Provider value={value}>
      {children}
    </ImageStorageContext.Provider>
  );
};

export const useImageStorageContext = () => {
  const context = useContext(ImageStorageContext);
  if (!context) {
    throw new Error(
      "useImageStorageContext must be used within an ImageStorageProvider",
    );
  }
  return context;
};
