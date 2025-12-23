import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { repairGameState } from "../services/stateRepair";
import {
  GameState,
  SaveSlot,
  VersionedGameState,
  EmbeddingIndex,
} from "../types";
import {
  saveGameState,
  loadGameState,
  deleteGameState,
  saveMetadata,
  loadMetadata,
  getStorageEstimate,
  clearDatabase,
  getAllSaveIds,
} from "../utils/indexedDB";
import { deleteImagesBySaveId, saveImage } from "../utils/imageStorage";
import { getRAGService } from "../services/rag";
import { sessionManager } from "../services/ai/sessionManager";
import { useTranslation } from "react-i18next";
import { createThemeConfig } from "../services/ai/utils";
import { getMigrationManager } from "../services/migrationManager";
import { CURRENT_SAVE_VERSION } from "../types";

export const useGamePersistence = (
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  view: string,
) => {
  const [saveSlots, setSaveSlots] = useState<SaveSlot[]>([]);
  const [currentSlotId, setCurrentSlotId] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  // Track if we should skip the next auto-save (e.g., during error recovery)
  const [skipNextSave, setSkipNextSave] = useState(false);
  const lastSaveTimeRef = useRef<number>(0);
  const lastSavedNodeIdRef = useRef<string | null>(null);

  // Use memo for latest slot ID
  const latestSlotId = useMemo(() => {
    if (saveSlots.length === 0) return null;
    const sorted = [...saveSlots].sort((a, b) => b.timestamp - a.timestamp);
    return sorted[0].id;
  }, [saveSlots]);

  const { t } = useTranslation();

  /**
   * Manually save the current state to a slot.
   * Use this for explicit save points (e.g., after outline generation).
   */
  const saveToSlot = useCallback(async (slotId: string, state: GameState) => {
    try {
      // Create versioned state
      // Note: RAG embeddings are now stored in PGlite via the RAG SharedWorker,
      // not in the game save anymore
      const stateToSave: VersionedGameState = {
        ...state,
        _saveVersion: {
          version: CURRENT_SAVE_VERSION,
          createdAt: Date.now(),
        },
      };

      await saveGameState(slotId, stateToSave);
      console.log(`[Persistence] Saved to slot ${slotId}`);
      return true;
    } catch (error) {
      console.error("[Persistence] Manual save failed:", error);
      return false;
    }
  }, []);

  // Load Slots and Current Game on Mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Initialize session manager for persistent history cache
        await sessionManager.initialize();

        // Load save slots metadata
        let slots = await loadMetadata("slots");
        if (slots && Array.isArray(slots)) {
          // === CLEANUP: Remove empty saves (ghost slots) ===
          // If a slot exists in metadata but has no game state in DB, it means
          // the game was started but never reached the first auto-save (no stage completed).
          const existingSaveIds = await getAllSaveIds();
          const validSlots = slots.filter((slot) =>
            existingSaveIds.includes(slot.id),
          );

          if (validSlots.length !== slots.length) {
            console.log(
              `[Persistence] Cleaned up ${slots.length - validSlots.length} empty save slots`,
            );
            await saveMetadata("slots", validSlots);
            slots = validSlots;
          }

          setSaveSlots(slots);

          // Try to restore last active session
          let lastSlotId = await loadMetadata("currentSlot");

          // If no last slot, select the latest from loaded slots (not from memo)
          if (!lastSlotId && slots.length > 0) {
            const sorted = [...slots].sort((a, b) => b.timestamp - a.timestamp);
            lastSlotId = sorted[0].id;
          }

          if (lastSlotId && typeof lastSlotId === "string") {
            const data = (await loadGameState(
              lastSlotId,
            )) as VersionedGameState | null;
            if (data) {
              // Centered migration and repair
              const migrationManager = getMigrationManager();
              const migrated = await migrationManager.migrate(data, lastSlotId);
              const sanitized = migrationManager.repairState(
                migrated,
              ) as GameState;

              // Extract embedding index
              const embeddingIndex = (migrated as VersionedGameState)
                ._embeddingIndex;

              // Ensure themeConfig is updated with the latest translations
              if (sanitized.theme && t) {
                sanitized.themeConfig = createThemeConfig(sanitized.theme, t);
              }

              // Repair state using cleanup utility (fixes duplicate IDs and syncs nextId)
              const repairedState = repairGameState(sanitized);

              setGameState(repairedState);
              setCurrentSlotId(lastSlotId);

              // Log embedding index availability for debugging
              if (embeddingIndex) {
                console.log(
                  `[Persistence] Save has embedding index with ${embeddingIndex.documents.length} documents, ` +
                    `model: ${embeddingIndex.modelId}`,
                );
              }
            }
          }
        }

        // Log storage usage
        const estimate = await getStorageEstimate();
        if (estimate && estimate.usage && estimate.quota) {
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
  }, []);

  const [triggerSaveCount, setTriggerSaveCount] = useState(0);

  const triggerSave = useCallback(() => {
    setTriggerSaveCount((prev) => prev + 1);
  }, []);

  // Track the last saved node to prevent duplicate saves
  const lastSavedActiveNodeRef = useRef<string | null>(null);
  const isSavingRef = useRef<boolean>(false);
  // Skip save on initial load/continue game
  const skipSaveOnLoadRef = useRef<boolean>(false);

  // Auto-Save Logic using IndexedDB
  // SAVE ONLY IN THESE SCENARIOS:
  // 1. Manual trigger (outline phase complete, outline fully parsed, /god commands, etc.)
  // 2. AI turn complete (activeNodeId changed to a model node)
  //
  // IMPORTANT: Do NOT save when user makes a choice!
  // If user action is the last saved state and game crashes, the save repair tool
  // should rollback to the previous AI turn so user can re-choose.
  useEffect(() => {
    // Basic skip conditions - must be in game with a valid slot and game started
    if (
      view !== "game" ||
      !currentSlotId ||
      !gameState.rootNodeId ||
      skipNextSave
    ) {
      if (skipNextSave) {
        setSkipNextSave(false);
      }
      return;
    }

    // Skip if currently processing (AI is generating)
    if (gameState.isProcessing) {
      return;
    }

    // Skip if already saving
    if (isSavingRef.current) {
      return;
    }

    // Skip save immediately after loading a slot (continue game)
    if (skipSaveOnLoadRef.current) {
      skipSaveOnLoadRef.current = false;
      return;
    }

    // Determine if we should save
    let shouldSave = false;
    let saveReason = "";

    // Case 1: Manual trigger (from triggerSave callback)
    // Used for: outline phase saves, outline complete, /god commands
    if (triggerSaveCount > 0) {
      shouldSave = true;
      saveReason = "manual trigger";
    }
    // Case 2: Active node changed to a model node (AI turn complete)
    // Only save after AI responds, NOT after user chooses
    else if (
      gameState.activeNodeId &&
      gameState.activeNodeId !== lastSavedActiveNodeRef.current
    ) {
      const activeNode = gameState.nodes[gameState.activeNodeId];
      // Only save if it's a model node (AI response)
      // User choice creates a "user" role node - we explicitly skip saving that
      if (activeNode && activeNode.role === "model") {
        shouldSave = true;
        saveReason = "AI turn complete";
      }
    }

    if (!shouldSave) {
      return;
    }

    // Execute save immediately (no debounce needed - we only trigger on specific events)
    const executeSave = async () => {
      // Double-check to prevent race conditions
      if (isSavingRef.current) {
        return;
      }
      isSavingRef.current = true;

      try {
        console.log(`[AutoSave] Saving game state (reason: ${saveReason})`);

        // Create versioned state
        // Note: RAG embeddings are now stored in PGlite via the RAG SharedWorker,
        // not in the game save anymore
        const stateToSave: VersionedGameState = {
          ...gameState,
          _saveVersion: {
            version: CURRENT_SAVE_VERSION,
            createdAt: Date.now(),
          },
        };

        // Save game state to IndexedDB
        await saveGameState(currentSlotId, stateToSave);
        lastSaveTimeRef.current = Date.now();
        lastSavedActiveNodeRef.current = gameState.activeNodeId;
        lastSavedNodeIdRef.current = gameState.activeNodeId;

        // Reset trigger count after successful save
        if (triggerSaveCount > 0) {
          setTriggerSaveCount(0);
        }

        // Update Slot Meta
        const activeNode = gameState.activeNodeId
          ? gameState.nodes[gameState.activeNodeId]
          : null;
        const summaryText = activeNode
          ? activeNode.text.substring(0, 60) + "..."
          : "In Progress";

        // Find the latest image for preview
        let previewImage: string | undefined;
        if (activeNode) {
          let curr: typeof activeNode | null = activeNode;
          let steps = 0;
          while (curr && steps < 5) {
            if (curr.imageUrl) {
              previewImage = curr.imageUrl;
              break;
            }
            if (curr.parentId) {
              curr = gameState.nodes[curr.parentId];
            } else {
              curr = null;
            }
            steps++;
          }
        }

        const updatedSlots = saveSlots.map((s) =>
          s.id === currentSlotId
            ? {
                ...s,
                timestamp: Date.now(),
                theme: gameState.theme,
                summary: summaryText,
                previewImage,
              }
            : s,
        );

        if (JSON.stringify(updatedSlots) !== JSON.stringify(saveSlots)) {
          setSaveSlots(updatedSlots);
          await saveMetadata("slots", updatedSlots);
        }

        // Show saving indicator briefly
        setIsAutoSaving(true);
        setTimeout(() => setIsAutoSaving(false), 1500);
      } catch (error: unknown) {
        console.error("Failed to save game to IndexedDB:", error);
        if (error instanceof Error && error.name === "QuotaExceededError") {
          alert("QuotaExceededError");
        }
      } finally {
        isSavingRef.current = false;
      }
    };

    executeSave();
  }, [
    gameState.activeNodeId,
    gameState.isProcessing,
    gameState.rootNodeId,
    currentSlotId,
    view,
    skipNextSave,
    triggerSaveCount,
  ]);

  // Persist Current Slot ID to IndexedDB
  useEffect(() => {
    const saveCurrentSlot = async () => {
      try {
        if (currentSlotId) {
          await saveMetadata("currentSlot", currentSlotId);
        } else {
          await saveMetadata("currentSlot", null);
        }
      } catch (error) {
        console.error("Failed to save current slot:", error);
      }
    };

    saveCurrentSlot();
  }, [currentSlotId]);

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

    // Save to IndexedDB asynchronously
    saveMetadata("slots", newSlots).catch((err) => {
      console.error("Failed to save slots metadata:", err);
    });

    return id;
  };

  /**
   * Load a save slot and restore embedding index if available.
   * Returns an object with success status and optional embedding index.
   */
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
      const data = (await loadGameState(id)) as VersionedGameState | null;
      if (data) {
        // Switch RAG context to this save
        // The RAG SharedWorker maintains its own PGlite database,
        // so we just need to tell it which save we're loading
        const ragService = getRAGService();
        if (ragService) {
          // Will be fully initialized when game starts
          console.log(`[Persistence] RAG service available for save ${id}`);
        }

        const migrationManager = getMigrationManager();
        const migrated = await migrationManager.migrate(data, id);
        const sanitized = migrationManager.repairState(migrated) as GameState;

        // Extract embedding index
        const embeddingIndex = (migrated as VersionedGameState)._embeddingIndex;

        // Ensure themeConfig is updated with the latest translations
        if (sanitized.theme && t) {
          sanitized.themeConfig = createThemeConfig(sanitized.theme, t);
        }

        // Set skip flag BEFORE updating state to prevent race condition
        skipSaveOnLoadRef.current = true;
        lastSavedActiveNodeRef.current = sanitized.activeNodeId;
        lastSavedNodeIdRef.current = sanitized.activeNodeId;

        // Repair state using cleanup utility (fixes duplicate IDs and syncs nextId)
        const repairedState = repairGameState(sanitized);

        setGameState(repairedState);
        setCurrentSlotId(id);

        // Update slot timestamp to now so it becomes the latest save
        const updatedSlots = saveSlots.map((s) =>
          s.id === id ? { ...s, timestamp: Date.now() } : s,
        );
        setSaveSlots(updatedSlots);
        saveMetadata("slots", updatedSlots).catch((err) =>
          console.error("Failed to update slot timestamp:", err),
        );

        return {
          success: true,
          embeddingIndex,
          savedModelId: embeddingIndex?.modelId,
          hasOutline: !!sanitized.outline,
          hasOutlineConversation: !!sanitized.outlineConversation,
        };
      }
      return { success: false };
    } catch (error) {
      console.error("Failed to load slot:", error);
      return { success: false };
    }
  };

  const deleteSlot = (id: string) => {
    const newSlots = saveSlots.filter((s) => s.id !== id);
    setSaveSlots(newSlots);

    // Update IndexedDB asynchronously, including session cache cleanup
    Promise.all([
      saveMetadata("slots", newSlots),
      deleteGameState(id),
      deleteImagesBySaveId(id),
      sessionManager.deleteSlotSessions(id),
    ]).catch((error) => {
      console.error("Failed to delete slot:", error);
    });

    if (currentSlotId === id) {
      setCurrentSlotId(latestSlotId);
    }
  };

  const clearAllSaves = async () => {
    try {
      // Clear all save data from IndexedDB
      for (const slot of saveSlots) {
        await deleteGameState(slot.id);
        await deleteImagesBySaveId(slot.id);
      }

      // Clear session cache
      await sessionManager.clearAll();

      // Clear metadata
      await saveMetadata("slots", []);
      await saveMetadata("currentSlot", null);

      // Update state
      setSaveSlots([]);
      setCurrentSlotId(null);

      return true;
    } catch (error) {
      console.error("Failed to clear all saves:", error);
      return false;
    }
  };

  const hardReset = async () => {
    try {
      await clearDatabase();
      localStorage.clear();
      window.location.reload();
    } catch (error) {
      console.error("Failed to hard reset:", error);
      // Force reload anyway
      window.location.reload();
    }
  };

  /**
   * Refresh the save slots list from IndexedDB
   * Called after import to update the list without reloading
   */
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
    saveToSlot, // Manual save for explicit save points
    setSkipNextSave, // Skip next auto-save (for error recovery)
    triggerSave, // Force save
    refreshSlots, // Refresh slots list after import
  };
};
