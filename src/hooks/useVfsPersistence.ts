import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { EmbeddingIndex, ForkTree, GameState, SaveSlot } from "../types";
import {
  saveMetadata,
  loadMetadata,
  deleteMetadata,
  getStorageEstimate,
  clearDatabase,
  getAllVfsSaveIds,
  deleteVfsSave,
} from "../utils/indexedDB";
import { sessionManager } from "../services/ai/sessionManager";
import { VfsSession } from "../services/vfs/vfsSession";
import { IndexedDbVfsStore } from "../services/vfs/store";
import { deriveGameStateFromVfs } from "../services/vfs/derivations";
import {
  applySharedMutableStateToSession,
  buildSharedMutableStateFromSession,
  extractSharedMutableStateFromSnapshot,
  restoreVfsSessionFromSnapshot,
  saveVfsSessionSnapshot,
} from "../services/vfs/persistence";
import { seedVfsSessionFromDefaults } from "../services/vfs/seed";
import { deleteImagesBySaveId } from "../utils/imageStorage";
import { getRAGService } from "../services/rag";
import { loadRuntimeStats, persistRuntimeStats } from "./runtimeStatsStore";
import { buildRestoredGameState } from "./vfsRestoreState";

const GENERATED_SAVE_NAME_PATTERN = /^save(?:\s+\d+)?$/i;
const PLACEHOLDER_SLOT_NAMES = new Set([
  "unknown",
  "未知",
  "untitled",
  "无标题",
  "loading...",
  "加载中",
  "initializing...",
  "初始化中",
  "pending",
  "待定",
]);

export const normalizeSlotName = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

export const isPlaceholderSlotName = (value: unknown): boolean => {
  const normalized = normalizeSlotName(value);
  if (!normalized) return true;
  return PLACEHOLDER_SLOT_NAMES.has(normalized.toLowerCase());
};

export const shouldReplaceGeneratedSlotName = (value: unknown): boolean => {
  const normalized = normalizeSlotName(value);
  if (!normalized) return true;
  if (GENERATED_SAVE_NAME_PATTERN.test(normalized)) return true;
  return isPlaceholderSlotName(normalized);
};

export const deriveSlotNameFromState = (
  state: Pick<GameState, "outline" | "currentLocation"> | null | undefined,
): string | null => {
  const outlineTitle = normalizeSlotName(state?.outline?.title);
  if (outlineTitle && !isPlaceholderSlotName(outlineTitle)) return outlineTitle;

  const currentLocation = normalizeSlotName(state?.currentLocation);
  if (currentLocation && !isPlaceholderSlotName(currentLocation)) {
    return currentLocation;
  }

  return null;
};

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

  const saveSharedMutableState = useCallback(async (saveId: string) => {
    const shared = buildSharedMutableStateFromSession(vfsSessionRef.current);
    await saveMetadata(`vfs_shared:${saveId}`, {
      files: shared,
      updatedAt: Date.now(),
    });
  }, []);

  const loadSharedMutableState = useCallback(async (saveId: string) => {
    const data = await loadMetadata<{
      files?: unknown;
    }>(`vfs_shared:${saveId}`);
    const files = data?.files;
    if (!files || typeof files !== "object") {
      return null;
    }
    return files as Record<string, any>;
  }, []);

  const ensureSharedLayerForSave = useCallback(
    async (saveId: string, snapshot: { files: Record<string, any> }) => {
      const existing = await loadSharedMutableState(saveId);
      if (existing) {
        return existing;
      }

      const inferred = extractSharedMutableStateFromSnapshot(snapshot as any);
      await saveMetadata(`vfs_shared:${saveId}`, {
        files: inferred,
        updatedAt: Date.now(),
        migratedFromSnapshot: true,
      });
      return inferred;
    },
    [loadSharedMutableState],
  );

  const loadLatestSnapshotForSaveId = useCallback(async (saveId: string) => {
    const latestMeta = await loadMetadata<{
      forkId?: unknown;
      turn?: unknown;
    }>(`vfs_latest:${saveId}`);

    if (
      latestMeta &&
      typeof latestMeta.forkId === "number" &&
      typeof latestMeta.turn === "number"
    ) {
      const snapshot = await vfsStoreRef.current.loadSnapshot(
        saveId,
        latestMeta.forkId,
        latestMeta.turn,
      );
      if (snapshot) return snapshot;
    }

    const indexes = await vfsStoreRef.current.listSnapshots(saveId, 0);
    const latest = indexes[indexes.length - 1];
    if (!latest) return null;

    return await vfsStoreRef.current.loadSnapshot(
      latest.saveId,
      latest.forkId,
      latest.turn,
    );
  }, []);

  const latestSlotId = useMemo(() => {
    if (saveSlots.length === 0) return null;
    const sorted = [...saveSlots].sort((a, b) => b.timestamp - a.timestamp);
    return sorted[0].id;
  }, [saveSlots]);

  const mergeUiState = useCallback(
    (base: GameState["uiState"], stored: unknown): GameState["uiState"] => {
      const isRecord = (value: unknown): value is Record<string, unknown> =>
        typeof value === "object" && value !== null;

      const isStringArray = (value: unknown): value is string[] =>
        Array.isArray(value) &&
        value.every((entry) => typeof entry === "string");

      const isListState = (
        value: unknown,
      ): value is {
        pinnedIds: string[];
        customOrder: string[];
        hiddenIds?: string[];
      } => {
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

      const sections = [
        "inventory",
        "locations",
        "npcs",
        "knowledge",
        "quests",
      ] as const;
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
      const snapshotState = state ?? gameState;
      const forkId = snapshotState.forkId ?? 0;
      const turn = snapshotState.turnNumber ?? 0;

      if (Object.keys(vfsSessionRef.current.snapshot()).length === 0) {
        seedVfsSessionFromDefaults(vfsSessionRef.current);
      }

      await saveVfsSessionSnapshot(vfsStoreRef.current, vfsSessionRef.current, {
        saveId: slotId,
        forkId,
        turn,
      });

      await saveSharedMutableState(slotId);

      // Track the latest VFS snapshot per save slot so we can restore the correct
      // fork+turn (not just fork-0) on reload.
      await saveMetadata(`vfs_latest:${slotId}`, {
        forkId,
        turn,
        updatedAt: Date.now(),
      });

      await persistRuntimeStats(slotId, snapshotState);

      // Update slots metadata so StartScreen "Continue" reflects real progress.
      // Keep it best-effort and lightweight.
      try {
        const now = Date.now();
        const derivedName = deriveSlotNameFromState(snapshotState);
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
                  name:
                    derivedName && shouldReplaceGeneratedSlotName(slot.name)
                      ? derivedName
                      : slot.name,
                  theme: slot.theme || snapshotState.theme || "fantasy",
                  summary: summary || slot.summary,
                  previewImage:
                    slot.previewImage ||
                    snapshotState.seedImageId ||
                    snapshotState.nodes?.[snapshotState.activeNodeId || ""]
                      ?.imageId,
                }
              : slot,
          );
          saveMetadata("slots", updated).catch((err) => {
            console.warn(
              "[VFS Persistence] Failed to persist updated slots:",
              err,
            );
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

        const shared = await ensureSharedLayerForSave(saveId, snapshot as any);
        if (shared) {
          applySharedMutableStateToSession(
            vfsSessionRef.current,
            shared as any,
          );
        }

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
            new Set([...(await getAllVfsSaveIds())]),
          );
          if (candidateIds.length === 0) return [];

          const inferred: SaveSlot[] = [];

          for (const saveId of candidateIds) {
            try {
              const snapshot = await loadLatestSnapshotForSaveId(saveId);

              if (snapshot) {
                const shared = await ensureSharedLayerForSave(
                  saveId,
                  snapshot as any,
                );
                if (shared) {
                  const session = new VfsSession();
                  restoreVfsSessionFromSnapshot(session, snapshot as any);
                  applySharedMutableStateToSession(session, shared as any);
                  const derived = deriveGameStateFromVfs(session.snapshot());
                  const theme = derived?.theme || "fantasy";
                  const title =
                    deriveSlotNameFromState(derived) ||
                    t("saves.title", "Save");

                  const summary =
                    derived?.outline?.premise ||
                    (derived?.outline?.openingNarrative?.narrative
                      ? derived.outline.openingNarrative.narrative.slice(0, 120)
                      : t("continueLastAdventure", "Continue your adventure"));

                  inferred.push({
                    id: saveId,
                    name: title,
                    timestamp: (snapshot as any)?.createdAt || Date.now(),
                    theme,
                    summary,
                    previewImage: derived?.seedImageId,
                  });
                  continue;
                }
              }

              const derived = snapshot
                ? (() => {
                    const session = new VfsSession();
                    restoreVfsSessionFromSnapshot(session, snapshot as any);
                    return deriveGameStateFromVfs(session.snapshot());
                  })()
                : null;

              const theme = derived?.theme || "fantasy";
              const title =
                deriveSlotNameFromState(derived) || t("saves.title", "Save");

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
              console.warn(
                "[VFS Persistence] Failed to infer slot:",
                saveId,
                error,
              );
            }
          }

          inferred.sort((a, b) => b.timestamp - a.timestamp);
          if (inferred.length > 0) {
            try {
              await saveMetadata("slots", inferred);
            } catch (error) {
              console.warn(
                "[VFS Persistence] Failed to persist inferred slots:",
                error,
              );
            }
          }
          return inferred;
        };

        const hydratePlaceholderSlotNames = async (
          existingSlots: SaveSlot[],
        ): Promise<SaveSlot[]> => {
          let changed = false;

          const updatedSlots = await Promise.all(
            existingSlots.map(async (slot) => {
              if (!slot || !shouldReplaceGeneratedSlotName(slot.name)) {
                return slot;
              }

              try {
                const snapshot = await loadLatestSnapshotForSaveId(slot.id);
                if (!snapshot) return slot;

                const shared = await ensureSharedLayerForSave(
                  slot.id,
                  snapshot as any,
                );
                const session = new VfsSession();
                restoreVfsSessionFromSnapshot(session, snapshot as any);
                if (shared) {
                  applySharedMutableStateToSession(session, shared as any);
                }
                const derived = deriveGameStateFromVfs(session.snapshot());
                const derivedName = deriveSlotNameFromState(derived);
                if (!derivedName || derivedName === slot.name) {
                  return slot;
                }

                changed = true;
                return {
                  ...slot,
                  name: derivedName,
                };
              } catch (error) {
                console.warn(
                  "[VFS Persistence] Failed to hydrate slot title:",
                  slot.id,
                  error,
                );
                return slot;
              }
            }),
          );

          if (changed) {
            try {
              await saveMetadata("slots", updatedSlots);
            } catch (error) {
              console.warn(
                "[VFS Persistence] Failed to persist hydrated slot titles:",
                error,
              );
            }
          }

          return updatedSlots;
        };

        let slots = await loadMetadata("slots");
        if (!slots || !Array.isArray(slots) || slots.length === 0) {
          slots = await inferSlotsIfMissing();
        }
        if (slots && Array.isArray(slots) && slots.length > 0) {
          slots = await hydratePlaceholderSlotNames(slots);
        }

        // Cleanup: remove ghost slots that have no backing data in VFS.
        if (slots && Array.isArray(slots) && slots.length > 0) {
          try {
            const existingIds = new Set<string>(await getAllVfsSaveIds());
            const validSlots = slots.filter(
              (slot: any) =>
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
            console.warn(
              "[VFS Persistence] Failed to cleanup ghost slots:",
              error,
            );
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
            const snapshot = await loadLatestSnapshotForSaveId(lastSlotId);

            if (snapshot) {
              restoreVfsSessionFromSnapshot(vfsSessionRef.current, snapshot);
              const shared = await ensureSharedLayerForSave(
                lastSlotId,
                snapshot as any,
              );
              if (shared) {
                applySharedMutableStateToSession(
                  vfsSessionRef.current,
                  shared as any,
                );
              }
              const derived = deriveGameStateFromVfs(
                vfsSessionRef.current.snapshot(),
              );
              const storedUiState = await loadMetadata(
                `ui_state:${lastSlotId}`,
              );
              const runtimeStats = await loadRuntimeStats(lastSlotId);
              setGameState((prev) =>
                buildRestoredGameState({
                  previous: prev,
                  derived,
                  storedUiState,
                  runtimeStats,
                  mergeUiState,
                }),
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
                const derivedName = deriveSlotNameFromState(derived);

                if (summary || derivedName) {
                  const now = Date.now();
                  setSaveSlots((prev) => {
                    const updated = prev.map((slot) =>
                      slot.id === lastSlotId
                        ? {
                            ...slot,
                            timestamp:
                              snapshot.createdAt || slot.timestamp || now,
                            theme: slot.theme || derived.theme || "fantasy",
                            name:
                              (derivedName &&
                              shouldReplaceGeneratedSlotName(slot.name)
                                ? derivedName
                                : slot.name) ||
                              derivedName ||
                              t("saves.title", "Save"),
                            summary: summary || slot.summary,
                            previewImage:
                              slot.previewImage ||
                              derived.seedImageId ||
                              derived.nodes?.[derived.activeNodeId || ""]
                                ?.imageId,
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
  }, [loadLatestSnapshotForSaveId, mergeUiState, setGameState]);

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

  const renameSlot = useCallback(async (id: string, nextName: string) => {
    const normalizedName = normalizeSlotName(nextName);
    if (!normalizedName) return false;

    let hasTarget = false;
    let changed = false;
    let updatedSlots: SaveSlot[] | null = null;

    setSaveSlots((prev) => {
      const updated = prev.map((slot) => {
        if (slot.id !== id) return slot;
        hasTarget = true;
        if (slot.name === normalizedName) {
          return slot;
        }
        changed = true;
        return {
          ...slot,
          name: normalizedName,
        };
      });

      if (changed) {
        updatedSlots = updated;
      }

      return changed ? updated : prev;
    });

    if (!hasTarget) return false;
    if (!changed || !updatedSlots) return true;

    try {
      await saveMetadata("slots", updatedSlots);
      return true;
    } catch (error) {
      console.error("[VFS Persistence] Failed to rename slot:", error);
      return false;
    }
  }, []);

  const loadSlot = async (
    id: string,
  ): Promise<{
    success: boolean;
    embeddingIndex?: EmbeddingIndex;
    embeddingModelMismatch?: boolean;
    savedModelId?: string;
    hasOutline?: boolean;
    hasOutlineConversation?: boolean;
    forkId?: number;
    forkTree?: ForkTree;
  }> => {
    try {
      isRestoringRef.current = true;
      const snapshot = await loadLatestSnapshotForSaveId(id);

      if (!snapshot) {
        console.warn("[VFS Persistence] No snapshot found for slot:", id);
        return { success: false };
      }

      restoreVfsSessionFromSnapshot(vfsSessionRef.current, snapshot);
      const shared = await ensureSharedLayerForSave(id, snapshot as any);
      if (shared) {
        applySharedMutableStateToSession(vfsSessionRef.current, shared as any);
      }
      const derived = deriveGameStateFromVfs(vfsSessionRef.current.snapshot());
      const storedUiState = await loadMetadata(`ui_state:${id}`);
      const runtimeStats = await loadRuntimeStats(id);
      setGameState((prev) =>
        buildRestoredGameState({
          previous: prev,
          derived,
          storedUiState,
          runtimeStats,
          mergeUiState,
        }),
      );

      setCurrentSlotId(id);

      const derivedName = deriveSlotNameFromState(derived);
      if (derivedName) {
        setSaveSlots((prev) => {
          let changed = false;
          const updated = prev.map((slot) => {
            if (slot.id !== id) return slot;
            if (!shouldReplaceGeneratedSlotName(slot.name)) return slot;
            if (slot.name === derivedName) return slot;
            changed = true;
            return {
              ...slot,
              name: derivedName,
            };
          });

          if (changed) {
            saveMetadata("slots", updated).catch((error) => {
              console.warn(
                "[VFS Persistence] Failed to persist slot title on load:",
                error,
              );
            });
            return updated;
          }

          return prev;
        });
      }

      return {
        success: true,
        hasOutline: Boolean(derived.outline),
        hasOutlineConversation: Boolean(derived.outlineConversation),
        savedModelId: derived.outlineConversation?.modelId,
        forkId: typeof derived.forkId === "number" ? derived.forkId : 0,
        forkTree: derived.forkTree,
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
        console.warn(
          '[VFS Persistence] Failed to delete metadata "currentSlot"',
          err,
        );
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

    // Cleanup per-save metadata keys.
    const metaKeys = [
      `vfs_latest:${id}`,
      `vfs_shared:${id}`,
      `ui_state:${id}`,
      `runtime_stats:${id}`,
    ];
    for (const key of metaKeys) {
      try {
        await deleteMetadata(key);
      } catch (err) {
        console.warn(
          `[VFS Persistence] Failed to delete metadata "${key}"`,
          err,
        );
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
      console.warn(
        "[VFS Persistence] Failed to delete RAG docs for save:",
        err,
      );
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
    renameSlot,
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
