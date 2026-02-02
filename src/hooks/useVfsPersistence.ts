import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { GameState, SaveSlot, EmbeddingIndex } from "../types";
import {
  saveMetadata,
  loadMetadata,
  getStorageEstimate,
  clearDatabase,
} from "../utils/indexedDB";
import { sessionManager } from "../services/ai/sessionManager";
import { VfsSession } from "../services/vfs/vfsSession";
import { IndexedDbVfsStore } from "../services/vfs/store";
import { deriveGameStateFromVfs } from "../services/vfs/derivations";
import { mergeDerivedViewState } from "./vfsViewState";
import {
  restoreVfsSessionFromSnapshot,
  saveVfsSessionSnapshot,
} from "../services/vfs/persistence";
import { seedVfsSessionFromDefaults } from "../services/vfs/seed";

export const useVfsPersistence = (
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  view: string,
) => {
  const [saveSlots, setSaveSlots] = useState<SaveSlot[]>([]);
  const [currentSlotId, setCurrentSlotId] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [skipNextSave, setSkipNextSave] = useState(false);
  const [triggerSaveCount, setTriggerSaveCount] = useState(0);
  const isSavingRef = useRef(false);
  const vfsStoreRef = useRef(new IndexedDbVfsStore());
  const vfsSessionRef = useRef(new VfsSession());
  const { t } = useTranslation();

  const latestSlotId = useMemo(() => {
    if (saveSlots.length === 0) return null;
    const sorted = [...saveSlots].sort((a, b) => b.timestamp - a.timestamp);
    return sorted[0].id;
  }, [saveSlots]);

  const triggerSave = useCallback(() => {
    setTriggerSaveCount((prev) => prev + 1);
  }, []);

  const saveSnapshot = useCallback(
    async (slotId: string, state?: GameState) => {
      const forkId = state?.forkId ?? gameState.forkId ?? 0;
      const turn = state?.turnNumber ?? gameState.turnNumber ?? 0;

      if (Object.keys(vfsSessionRef.current.snapshot()).length === 0) {
        seedVfsSessionFromDefaults(vfsSessionRef.current);
      }

      await saveVfsSessionSnapshot(vfsStoreRef.current, vfsSessionRef.current, {
        saveId: slotId,
        forkId,
        turn,
      });
    },
    [gameState.forkId, gameState.turnNumber],
  );

  const saveToSlot = useCallback(
    async (slotId: string, state: GameState) => {
      try {
        await saveSnapshot(slotId, state);
        return true;
      } catch (error) {
        console.error("[VFS Persistence] Manual save failed:", error);
        return false;
      }
    },
    [saveSnapshot],
  );

  // Load slots and latest snapshot
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await sessionManager.initialize();

        const slots = await loadMetadata("slots");
        if (slots && Array.isArray(slots)) {
          setSaveSlots(slots);

          let lastSlotId = await loadMetadata("currentSlot");
          if (!lastSlotId && slots.length > 0) {
            lastSlotId = [...slots].sort((a, b) => b.timestamp - a.timestamp)[0]
              .id;
          }

          if (lastSlotId && typeof lastSlotId === "string") {
            const indexes = await vfsStoreRef.current.listSnapshots(
              lastSlotId,
              0,
            );
            const latest = indexes[indexes.length - 1];
            if (latest) {
              const snapshot = await vfsStoreRef.current.loadSnapshot(
                latest.saveId,
                latest.forkId,
                latest.turn,
              );
              if (snapshot) {
                restoreVfsSessionFromSnapshot(vfsSessionRef.current, snapshot);
                const derived = deriveGameStateFromVfs(
                  vfsSessionRef.current.snapshot(),
                );
                setGameState((prev) =>
                  mergeDerivedViewState(prev, derived, { resetRuntime: true }),
                );
                setCurrentSlotId(lastSlotId);
              }
            }
          }
        }

        const estimate = await getStorageEstimate();
        if (estimate?.usage && estimate?.quota) {
          const usageMB = (estimate.usage / (1024 * 1024)).toFixed(2);
          const quotaMB = (estimate.quota / (1024 * 1024)).toFixed(2);
          console.log(`Storage: ${usageMB} MB / ${quotaMB} MB`);
        }
      } catch (error: any) {
        console.error("Failed to load saves from IndexedDB", error);
        setPersistenceError(error?.message || "Unknown IndexedDB error");
      }
    };

    loadInitialData();
  }, [setGameState]);

  // Persist current slot ID
  useEffect(() => {
    const saveCurrentSlot = async () => {
      try {
        await saveMetadata("currentSlot", currentSlotId ?? null);
      } catch (error) {
        console.error("Failed to save current slot:", error);
      }
    };
    saveCurrentSlot();
  }, [currentSlotId]);

  // Auto-save on trigger
  useEffect(() => {
    if (view !== "game" || !currentSlotId || skipNextSave) {
      if (skipNextSave) {
        setSkipNextSave(false);
      }
      return;
    }

    if (gameState.isProcessing) {
      return;
    }

    if (isSavingRef.current) {
      return;
    }

    if (triggerSaveCount === 0) {
      return;
    }

    const runSave = async () => {
      isSavingRef.current = true;
      setIsAutoSaving(true);
      try {
        await saveSnapshot(currentSlotId, gameState);
      } catch (error) {
        console.error("[VFS Persistence] Auto-save failed:", error);
      } finally {
        setIsAutoSaving(false);
        isSavingRef.current = false;
      }
    };

    runSave();
  }, [
    currentSlotId,
    gameState,
    saveSnapshot,
    skipNextSave,
    triggerSaveCount,
    view,
  ]);

  const createSaveSlot = (theme: string) => {
    const id = Date.now().toString();
    const newSlot: SaveSlot = {
      id,
      name: `Save ${saveSlots.length + 1}`,
      timestamp: Date.now(),
      theme,
      summary: t("new-game"),
    };
    const newSlots = [...saveSlots, newSlot];
    setSaveSlots(newSlots);
    saveMetadata("slots", newSlots).catch((err) => {
      console.error("Failed to save slots metadata:", err);
    });
    return id;
  };

  const loadSlot = async (
    id: string,
  ): Promise<{
    success: boolean;
    embeddingIndex?: EmbeddingIndex;
    embeddingModelMismatch?: boolean;
    savedModelId?: string;
    hasOutline?: boolean;
    hasOutlineConversation?: boolean;
  }> => {
    try {
      const indexes = await vfsStoreRef.current.listSnapshots(id, 0);
      const latest = indexes[indexes.length - 1];
      if (latest) {
        const snapshot = await vfsStoreRef.current.loadSnapshot(
          latest.saveId,
          latest.forkId,
          latest.turn,
        );
        if (snapshot) {
          restoreVfsSessionFromSnapshot(vfsSessionRef.current, snapshot);
          const derived = deriveGameStateFromVfs(
            vfsSessionRef.current.snapshot(),
          );
          setGameState((prev) =>
            mergeDerivedViewState(prev, derived, { resetRuntime: true }),
          );
        }
      }
      setCurrentSlotId(id);
      return { success: true };
    } catch (error) {
      console.error("[VFS Persistence] Failed to load slot:", error);
      return { success: false };
    }
  };

  const deleteSlot = async (id: string) => {
    const filteredSlots = saveSlots.filter((slot) => slot.id !== id);
    setSaveSlots(filteredSlots);
    if (currentSlotId === id) {
      setCurrentSlotId(null);
    }
    saveMetadata("slots", filteredSlots).catch((err) => {
      console.error("Failed to update slots metadata:", err);
    });
  };

  const clearAllSaves = async () => {
    try {
      await clearDatabase();
      setSaveSlots([]);
      setCurrentSlotId(null);
    } catch (error) {
      console.error("Failed to clear saves:", error);
    }
  };

  const hardReset = async () => {
    try {
      await clearDatabase();
      localStorage.clear();
      window.location.reload();
    } catch (error) {
      console.error("Failed to hard reset:", error);
      window.location.reload();
    }
  };

  const refreshSlots = async (): Promise<SaveSlot[]> => {
    try {
      const slots = await loadMetadata("slots");
      if (slots && Array.isArray(slots)) {
        setSaveSlots(slots);
        return slots;
      }
      return saveSlots;
    } catch (error) {
      console.error("Failed to refresh slots:", error);
      return saveSlots;
    }
  };

  return {
    saveSlots,
    currentSlotId,
    setCurrentSlotId,
    createSaveSlot,
    loadSlot,
    deleteSlot,
    clearAllSaves,
    isAutoSaving,
    persistenceError,
    hardReset,
    saveToSlot,
    setSkipNextSave,
    triggerSave,
    refreshSlots,
    vfsSession: vfsSessionRef.current,
    latestSlotId,
    seedFromDefaults: () => seedVfsSessionFromDefaults(vfsSessionRef.current),
  };
};
