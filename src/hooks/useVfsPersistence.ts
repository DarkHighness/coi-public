import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { GameState, SaveSlot, EmbeddingIndex } from "../types";
import {
  saveMetadata,
  loadMetadata,
  deleteMetadata,
  getStorageEstimate,
  clearDatabase,
  getAllSaveIds,
  getAllVfsSaveIds,
  deleteGameState,
  deleteVfsSave,
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
import { deleteImagesBySaveId } from "../utils/imageStorage";
import { getRAGService } from "../services/rag";

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
  const isRestoringRef = useRef(false);
  const uiStateSaveTimeoutRef = useRef<number | null>(null);
  const { t } = useTranslation();

  const latestSlotId = useMemo(() => {
    if (saveSlots.length === 0) return null;
    const sorted = [...saveSlots].sort((a, b) => b.timestamp - a.timestamp);
    return sorted[0].id;
  }, [saveSlots]);

  const mergeUiState = useCallback(
    (
      base: GameState["uiState"],
      stored: unknown,
    ): GameState["uiState"] => {
      const isRecord = (value: unknown): value is Record<string, unknown> =>
        typeof value === "object" && value !== null;

      const isStringArray = (value: unknown): value is string[] =>
        Array.isArray(value) && value.every((entry) => typeof entry === "string");

      const isListState = (
        value: unknown,
      ): value is { pinnedIds: string[]; customOrder: string[]; hiddenIds?: string[] } => {
        if (!isRecord(value)) return false;
        if (!isStringArray(value.pinnedIds)) return false;
        if (!isStringArray(value.customOrder)) return false;
        if (value.hiddenIds !== undefined && !isStringArray(value.hiddenIds))
          return false;
        return true;
      };

      if (!isRecord(stored)) {
        return base;
      }

      const sections = ["inventory", "locations", "npcs", "knowledge", "quests"] as const;
      const merged: GameState["uiState"] = { ...base };

      for (const section of sections) {
        const incoming = (stored as Record<string, unknown>)[section];
        if (!isListState(incoming)) {
          continue;
        }
        merged[section] = {
          ...base[section],
          ...incoming,
        };
      }

      for (const key of Object.keys(stored)) {
        if (sections.includes(key as (typeof sections)[number])) {
          continue;
        }
        (merged as any)[key] = (stored as any)[key];
      }

      return merged;
    },
    [],
  );

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

      // Track the latest VFS snapshot per save slot so we can restore the correct
      // fork+turn (not just fork-0) on reload.
      await saveMetadata(`vfs_latest:${slotId}`, {
        forkId,
        turn,
        updatedAt: Date.now(),
      });

      // Update slots metadata so StartScreen "Continue" reflects real progress.
      // Keep it best-effort and lightweight.
      try {
        const now = Date.now();
        const snapshotState = state ?? gameState;
        const currentFork = snapshotState.currentFork ?? [];
        const lastModel = [...currentFork]
          .reverse()
          .find((seg) => seg.role === "model");

        const rawSummary =
          snapshotState.outline?.premise ||
          lastModel?.text ||
          snapshotState.outline?.openingNarrative?.narrative ||
          "";

        const normalizedFull = rawSummary.replace(/\s+/g, " ").trim();
        const truncated = normalizedFull.slice(0, 160);
        const summary = truncated
          ? `${truncated}${normalizedFull.length > 160 ? "…" : ""}`
          : "";

        setSaveSlots((prev) => {
          const updated = prev.map((slot) =>
            slot.id === slotId
              ? {
                  ...slot,
                  timestamp: now,
                  theme: slot.theme || snapshotState.theme || "fantasy",
                  summary: summary || slot.summary,
                  previewImage:
                    slot.previewImage ||
                    snapshotState.seedImageId ||
                    snapshotState.nodes?.[snapshotState.activeNodeId || ""]?.imageId,
                }
              : slot,
          );
          saveMetadata("slots", updated).catch((err) => {
            console.warn("[VFS Persistence] Failed to persist updated slots:", err);
          });
          return updated;
        });
      } catch (error) {
        console.warn("[VFS Persistence] Failed to update slot summary:", error);
      }
    },
    [gameState.forkId, gameState.turnNumber, gameState],
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

  const restoreVfsToTurn = useCallback(
    async (saveId: string, forkId: number, turn: number): Promise<boolean> => {
      try {
        const snapshot = await vfsStoreRef.current.loadSnapshot(
          saveId,
          forkId,
          turn,
        );
        if (!snapshot) {
          return false;
        }
        restoreVfsSessionFromSnapshot(vfsSessionRef.current, snapshot);
        return true;
      } catch (error) {
        console.error("[VFS Persistence] Restore snapshot failed:", error);
        return false;
      }
    },
    [],
  );

  // Load slots and latest snapshot
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        isRestoringRef.current = true;
        await sessionManager.initialize();

        const inferSlotsIfMissing = async (): Promise<SaveSlot[]> => {
          const candidateIds = Array.from(
            new Set([
              ...(await getAllVfsSaveIds()),
              ...(await getAllSaveIds()),
            ]),
          );
          if (candidateIds.length === 0) return [];

          const inferred: SaveSlot[] = [];

          for (const saveId of candidateIds) {
            try {
              const latestMeta = await loadMetadata<{
                forkId?: unknown;
                turn?: unknown;
              }>(`vfs_latest:${saveId}`);

              let snapshot = null as Awaited<
                ReturnType<typeof vfsStoreRef.current.loadSnapshot>
              >;

              if (
                latestMeta &&
                typeof latestMeta.forkId === "number" &&
                typeof latestMeta.turn === "number"
              ) {
                snapshot = await vfsStoreRef.current.loadSnapshot(
                  saveId,
                  latestMeta.forkId,
                  latestMeta.turn,
                );
              }

              if (!snapshot) {
                const indexes = await vfsStoreRef.current.listSnapshots(saveId, 0);
                const latest = indexes[indexes.length - 1];
                if (latest) {
                  snapshot = await vfsStoreRef.current.loadSnapshot(
                    latest.saveId,
                    latest.forkId,
                    latest.turn,
                  );
                }
              }

              const derived =
                snapshot ? deriveGameStateFromVfs(snapshot.files) : null;

              const theme = derived?.theme || "fantasy";
              const title =
                derived?.outline?.title ||
                derived?.currentLocation ||
                t("saves.title", "Save");

              const summary =
                derived?.outline?.premise ||
                (derived?.outline?.openingNarrative?.narrative
                  ? derived.outline.openingNarrative.narrative.slice(0, 120)
                  : t("continueLastAdventure", "Continue your adventure"));

              inferred.push({
                id: saveId,
                name: title,
                timestamp: snapshot?.createdAt || Date.now(),
                theme,
                summary,
                previewImage: derived?.seedImageId,
              });
            } catch (error) {
              console.warn("[VFS Persistence] Failed to infer slot:", saveId, error);
            }
          }

          inferred.sort((a, b) => b.timestamp - a.timestamp);
          if (inferred.length > 0) {
            try {
              await saveMetadata("slots", inferred);
            } catch (error) {
              console.warn("[VFS Persistence] Failed to persist inferred slots:", error);
            }
          }
          return inferred;
        };

        let slots = await loadMetadata("slots");
        if (!slots || !Array.isArray(slots) || slots.length === 0) {
          slots = await inferSlotsIfMissing();
        }

        // Cleanup: remove ghost slots that have no backing data in either VFS or legacy save store.
        if (slots && Array.isArray(slots) && slots.length > 0) {
          try {
            const existingIds = new Set<string>([
              ...(await getAllVfsSaveIds()),
              ...(await getAllSaveIds()),
            ]);
            const validSlots = slots.filter((slot: any) =>
              slot && typeof slot.id === "string" && existingIds.has(slot.id),
            );
            if (validSlots.length !== slots.length) {
              console.log(
                `[VFS Persistence] Cleaned up ${slots.length - validSlots.length} ghost save slots`,
              );
              await saveMetadata("slots", validSlots);
              slots = validSlots;
            }
          } catch (error) {
            console.warn("[VFS Persistence] Failed to cleanup ghost slots:", error);
          }
        }

        if (slots && Array.isArray(slots)) {
          setSaveSlots(slots);

          let lastSlotId = await loadMetadata("currentSlot");
          if (!lastSlotId && slots.length > 0) {
            lastSlotId = [...slots].sort((a, b) => b.timestamp - a.timestamp)[0]
              .id;
          }

          if (lastSlotId && typeof lastSlotId === "string") {
            const latestMeta = await loadMetadata<{
              forkId?: unknown;
              turn?: unknown;
            }>(`vfs_latest:${lastSlotId}`);

            let snapshot = null as Awaited<
              ReturnType<typeof vfsStoreRef.current.loadSnapshot>
            >;

            if (
              latestMeta &&
              typeof latestMeta.forkId === "number" &&
              typeof latestMeta.turn === "number"
            ) {
              snapshot = await vfsStoreRef.current.loadSnapshot(
                lastSlotId,
                latestMeta.forkId,
                latestMeta.turn,
              );
            }

            // Fallback for older saves: default to fork-0 latest.
            if (!snapshot) {
              const indexes = await vfsStoreRef.current.listSnapshots(
                lastSlotId,
                0,
              );
              const latest = indexes[indexes.length - 1];
              if (latest) {
                snapshot = await vfsStoreRef.current.loadSnapshot(
                  latest.saveId,
                  latest.forkId,
                  latest.turn,
                );
              }
            }

            if (snapshot) {
              restoreVfsSessionFromSnapshot(vfsSessionRef.current, snapshot);
              const derived = deriveGameStateFromVfs(
                vfsSessionRef.current.snapshot(),
              );
              const storedUiState = await loadMetadata(
                `ui_state:${lastSlotId}`,
              );
              setGameState((prev) =>
                mergeDerivedViewState(
                  { ...prev, uiState: mergeUiState(prev.uiState, storedUiState) },
                  derived,
                  { resetRuntime: true },
                ),
              );
              setCurrentSlotId(lastSlotId);

              // Refresh slot metadata from actual derived state (covers cases where
              // a slot was created with placeholder summary like "旅程尚未开始...").
              try {
                const currentFork = derived.currentFork ?? [];
                const lastModel = [...currentFork]
                  .reverse()
                  .find((seg) => seg.role === "model");

                const rawSummary =
                  derived.outline?.premise ||
                  lastModel?.text ||
                  derived.outline?.openingNarrative?.narrative ||
                  derived.outline?.title ||
                  "";

                const normalizedFull = rawSummary.replace(/\s+/g, " ").trim();
                const truncated = normalizedFull.slice(0, 160);
                const summary = truncated
                  ? `${truncated}${normalizedFull.length > 160 ? "…" : ""}`
                  : "";

                if (summary) {
                  const now = Date.now();
                  setSaveSlots((prev) => {
                    const updated = prev.map((slot) =>
                      slot.id === lastSlotId
                        ? {
                            ...slot,
                            timestamp: snapshot.createdAt || slot.timestamp || now,
                            theme: slot.theme || derived.theme || "fantasy",
                            name:
                              slot.name ||
                              derived.outline?.title ||
                              derived.currentLocation ||
                              t("saves.title", "Save"),
                            summary,
                            previewImage:
                              slot.previewImage ||
                              derived.seedImageId ||
                              derived.nodes?.[derived.activeNodeId || ""]?.imageId,
                          }
                        : slot,
                    );

                    saveMetadata("slots", updated).catch((err) => {
                      console.warn(
                        "[VFS Persistence] Failed to persist refreshed slots:",
                        err,
                      );
                    });

                    return updated;
                  });
                }
              } catch (error) {
                console.warn(
                  "[VFS Persistence] Failed to refresh slot metadata:",
                  error,
                );
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
      } finally {
        isRestoringRef.current = false;
      }
    };

    loadInitialData();
  }, [mergeUiState, setGameState]);

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

  // Persist UI state per save slot (sorting/pins/collapsed widths, etc.)
  useEffect(() => {
    if (isRestoringRef.current) {
      return;
    }
    if (view !== "game" || !currentSlotId) {
      return;
    }

    if (uiStateSaveTimeoutRef.current) {
      window.clearTimeout(uiStateSaveTimeoutRef.current);
      uiStateSaveTimeoutRef.current = null;
    }

    uiStateSaveTimeoutRef.current = window.setTimeout(() => {
      saveMetadata(`ui_state:${currentSlotId}`, gameState.uiState).catch(
        (error) => {
          console.error("[VFS Persistence] Failed to save UI state:", error);
        },
      );
      uiStateSaveTimeoutRef.current = null;
    }, 250);

    return () => {
      if (uiStateSaveTimeoutRef.current) {
        window.clearTimeout(uiStateSaveTimeoutRef.current);
        uiStateSaveTimeoutRef.current = null;
      }
    };
  }, [currentSlotId, gameState.uiState, view]);

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
      isRestoringRef.current = true;
      const latestMeta = await loadMetadata<{
        forkId?: unknown;
        turn?: unknown;
      }>(`vfs_latest:${id}`);

      let snapshot = null as Awaited<
        ReturnType<typeof vfsStoreRef.current.loadSnapshot>
      >;

      if (
        latestMeta &&
        typeof latestMeta.forkId === "number" &&
        typeof latestMeta.turn === "number"
      ) {
        snapshot = await vfsStoreRef.current.loadSnapshot(
          id,
          latestMeta.forkId,
          latestMeta.turn,
        );
      }

      // Fallback for older saves: default to fork-0 latest.
      if (!snapshot) {
        const indexes = await vfsStoreRef.current.listSnapshots(id, 0);
        const latest = indexes[indexes.length - 1];
        if (latest) {
          snapshot = await vfsStoreRef.current.loadSnapshot(
            latest.saveId,
            latest.forkId,
            latest.turn,
          );
        }
      }

      if (!snapshot) {
        console.warn("[VFS Persistence] No snapshot found for slot:", id);
        return { success: false };
      }

      restoreVfsSessionFromSnapshot(vfsSessionRef.current, snapshot);
      const derived = deriveGameStateFromVfs(vfsSessionRef.current.snapshot());
      const storedUiState = await loadMetadata(`ui_state:${id}`);
      setGameState((prev) =>
        mergeDerivedViewState(
          { ...prev, uiState: mergeUiState(prev.uiState, storedUiState) },
          derived,
          { resetRuntime: true },
        ),
      );

      setCurrentSlotId(id);
      return {
        success: true,
        hasOutline: Boolean(derived.outline),
        hasOutlineConversation: Boolean(derived.outlineConversation),
        savedModelId: derived.outlineConversation?.modelId,
      };
    } catch (error) {
      console.error("[VFS Persistence] Failed to load slot:", error);
      return { success: false };
    } finally {
      isRestoringRef.current = false;
    }
  };

  const deleteSlot = async (id: string) => {
    const filteredSlots = saveSlots.filter((slot) => slot.id !== id);

    // Optimistic UI update first.
    setSaveSlots(filteredSlots);
    if (currentSlotId === id) {
      setCurrentSlotId(null);
      // Ensure persisted pointer doesn't keep referencing a deleted slot.
      try {
        await deleteMetadata("currentSlot");
      } catch (err) {
        console.warn('[VFS Persistence] Failed to delete metadata "currentSlot"', err);
      }
    }

    // Persist slots list update.
    try {
      await saveMetadata("slots", filteredSlots);
    } catch (err) {
      console.error("[VFS Persistence] Failed to update slots metadata:", err);
    }

    // Delete underlying data so the save doesn't reappear on reload.
    try {
      await deleteVfsSave(id);
    } catch (err) {
      console.warn("[VFS Persistence] Failed to delete VFS save:", err);
    }

    // Delete legacy save store entries if present (older builds may have both).
    try {
      await deleteGameState(id);
    } catch (err) {
      console.warn("[VFS Persistence] Failed to delete legacy save:", err);
    }

    // Cleanup per-save metadata keys.
    const metaKeys = [`vfs_latest:${id}`, `ui_state:${id}`];
    for (const key of metaKeys) {
      try {
        await deleteMetadata(key);
      } catch (err) {
        console.warn(`[VFS Persistence] Failed to delete metadata "${key}"`, err);
      }
    }

    // Cleanup images for this save.
    try {
      await deleteImagesBySaveId(id);
    } catch (err) {
      console.warn("[VFS Persistence] Failed to delete images for save:", err);
    }

    // Cleanup session cache (outline + story sessions).
    try {
      await sessionManager.deleteSlotSessions(id);
    } catch (err) {
      console.warn("[VFS Persistence] Failed to delete slot sessions:", err);
    }

    // Cleanup RAG documents (best effort).
    try {
      const rag = getRAGService();
      if (rag) {
        await rag.deleteDocuments({ saveId: id });
      }
    } catch (err) {
      console.warn("[VFS Persistence] Failed to delete RAG docs for save:", err);
    }
  };

  const clearAllSaves = async (): Promise<boolean> => {
    try {
      await clearDatabase();
      setSaveSlots([]);
      setCurrentSlotId(null);
      return true;
    } catch (error) {
      console.error("Failed to clear saves:", error);
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
    restoreVfsToTurn,
  };
};
