import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { GameState, SaveSlot } from "../types";
import {
  saveGameState,
  loadGameState,
  deleteGameState,
  saveMetadata,
  loadMetadata,
  getStorageEstimate,
  clearDatabase,
} from "../utils/indexedDB";
import { resetEmbeddingManager } from "../services/embedding/embeddingManager";

// Auto-save debounce time in milliseconds
const AUTO_SAVE_DEBOUNCE_MS = 3000;
// Minimum interval between saves (to prevent too frequent saves)
const MIN_SAVE_INTERVAL_MS = 5000;

// Default nextIds structure for recovery
const DEFAULT_NEXT_IDS = {
  item: 1,
  npc: 1,
  location: 1,
  knowledge: 1,
  quest: 1,
  faction: 1,
  timeline: 1,
  causalChain: 1,
  skill: 1,
  condition: 1,
  hiddenTrait: 1,
};

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
  // Refs for debounce and throttle
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveTimeRef = useRef<number>(0);
  const lastSavedNodeIdRef = useRef<string | null>(null);

  // Use memo for latest slot ID
  const latestSlotId = useMemo(() => {
    if (saveSlots.length === 0) return null;
    const sorted = [...saveSlots].sort((a, b) => b.timestamp - a.timestamp);
    return sorted[0].id;
  }, [saveSlots]);

  /**
   * Comprehensive state sanitization and repair.
   * Called when loading a save to fix any corrupted or incomplete state.
   */
  const sanitizeState = useCallback(
    (parsed: Record<string, any>): GameState => {
      const repairLog: string[] = [];

      // === 1. Reset transient processing states ===
      parsed.isProcessing = false;
      parsed.isImageGenerating = false;
      parsed.generatingNodeId = null;
      parsed.error = null;

      // === 1b. Fix atmosphere and time if missing ===
      // These are essential for consistent visual theming
      if (!parsed.atmosphere || typeof parsed.atmosphere !== "object") {
        // Try to extract from the latest node's stateSnapshot or atmosphere field
        let foundAtmosphere: { envTheme?: string; ambience?: string } | null = null;
        if (parsed.activeNodeId && parsed.nodes?.[parsed.activeNodeId]) {
          const activeNode = parsed.nodes[parsed.activeNodeId];
          foundAtmosphere =
            activeNode.atmosphere ||
            activeNode.stateSnapshot?.atmosphere ||
            null;
        }
        if (foundAtmosphere && typeof foundAtmosphere === "object") {
          parsed.atmosphere = foundAtmosphere;
          repairLog.push(
            `Repaired: atmosphere extracted from active node: ${JSON.stringify(foundAtmosphere)}`,
          );
        } else {
          parsed.atmosphere = { envTheme: "fantasy", ambience: "quiet" };
          repairLog.push("Repaired: atmosphere defaulted to { envTheme: fantasy, ambience: quiet }");
        }
      }
      if (!parsed.time || typeof parsed.time !== "string") {
        parsed.time = "Day 1";
        repairLog.push("Repaired: time defaulted to Day 1");
      }

      // === 2. Fix missing or corrupted nextIds ===
      if (!parsed.nextIds || typeof parsed.nextIds !== "object") {
        repairLog.push("Repaired: missing nextIds");
        parsed.nextIds = { ...DEFAULT_NEXT_IDS };
      } else {
        // Ensure all fields exist
        for (const [key, defaultVal] of Object.entries(DEFAULT_NEXT_IDS)) {
          if (typeof parsed.nextIds[key] !== "number") {
            repairLog.push(`Repaired: nextIds.${key} was invalid`);
            parsed.nextIds[key] = defaultVal;
          }
        }
      }

      // === 3. Recalculate nextIds based on actual data to prevent ID collisions ===
      const recalculateNextId = (
        items: any[] | undefined,
        prefix: string,
        field: keyof typeof DEFAULT_NEXT_IDS,
      ) => {
        if (!items || !Array.isArray(items)) return;
        let maxId = 0;
        for (const item of items) {
          if (
            item.id &&
            typeof item.id === "string" &&
            item.id.startsWith(`${prefix}:`)
          ) {
            const num = parseInt(item.id.split(":")[1], 10);
            if (!isNaN(num) && num > maxId) maxId = num;
          }
        }
        if (maxId >= parsed.nextIds[field]) {
          parsed.nextIds[field] = maxId + 1;
          repairLog.push(
            `Repaired: nextIds.${field} recalculated to ${maxId + 1}`,
          );
        }
      };

      recalculateNextId(parsed.inventory, "inv", "item");
      recalculateNextId(parsed.relationships, "npc", "npc");
      recalculateNextId(parsed.locations, "loc", "location");
      recalculateNextId(parsed.knowledge, "know", "knowledge");
      recalculateNextId(parsed.quests, "quest", "quest");
      recalculateNextId(parsed.factions, "fac", "faction");
      recalculateNextId(parsed.timeline, "evt", "timeline");
      recalculateNextId(parsed.causalChains, "chain", "causalChain");

      // Skills, conditions, and hiddenTraits are nested in character
      if (parsed.character) {
        recalculateNextId(parsed.character.skills, "skill", "skill");
        recalculateNextId(parsed.character.conditions, "cond", "condition");
        recalculateNextId(
          parsed.character.hiddenTraits,
          "trait",
          "hiddenTrait",
        );
      }

      // === 4. Fix dangling user node (crash during generation) ===
      if (
        parsed.activeNodeId &&
        parsed.nodes &&
        parsed.nodes[parsed.activeNodeId]
      ) {
        const lastNode = parsed.nodes[parsed.activeNodeId];
        if (lastNode.role === "user") {
          repairLog.push("Repaired: removed dangling user node");
          if (lastNode.parentId && parsed.nodes[lastNode.parentId]) {
            // Remove the dangling user node and revert to parent
            delete parsed.nodes[parsed.activeNodeId];
            parsed.activeNodeId = lastNode.parentId;
          }
        }
      }

      // === 5. Ensure essential arrays exist ===
      const ensureArray = (field: string) => {
        if (!Array.isArray(parsed[field])) {
          repairLog.push(`Repaired: ${field} was not an array`);
          parsed[field] = [];
        }
      };

      ensureArray("inventory");
      ensureArray("relationships");
      ensureArray("quests");
      ensureArray("locations");
      ensureArray("knowledge");
      ensureArray("factions");
      ensureArray("timeline");
      ensureArray("causalChains");
      ensureArray("summaries");
      ensureArray("logs");

      // === 6. Ensure nodes object exists ===
      if (!parsed.nodes || typeof parsed.nodes !== "object") {
        repairLog.push("Repaired: nodes was invalid");
        parsed.nodes = {};
      }

      // === 7. Fix character structure ===
      if (!parsed.character || typeof parsed.character !== "object") {
        repairLog.push("Repaired: character was invalid");
        parsed.character = {
          name: "Unknown",
          background: "",
          motivation: "",
          skills: [],
          conditions: [],
          hiddenTraits: [],
        };
      } else {
        // Ensure character sub-arrays exist
        if (!Array.isArray(parsed.character.skills))
          parsed.character.skills = [];
        if (!Array.isArray(parsed.character.conditions))
          parsed.character.conditions = [];
        if (!Array.isArray(parsed.character.hiddenTraits))
          parsed.character.hiddenTraits = [];
      }

      // === 8. Validate activeNodeId points to an existing node ===
      if (parsed.activeNodeId && !parsed.nodes[parsed.activeNodeId]) {
        repairLog.push("Repaired: activeNodeId pointed to non-existent node");
        // Try to find any valid node
        const nodeIds = Object.keys(parsed.nodes);
        if (nodeIds.length > 0) {
          // Find the most recent node
          const sortedNodes = nodeIds
            .map((id) => parsed.nodes[id])
            .filter((n) => n && n.timestamp)
            .sort((a, b) => b.timestamp - a.timestamp);
          if (sortedNodes.length > 0) {
            parsed.activeNodeId = sortedNodes[0].id;
          } else {
            parsed.activeNodeId = nodeIds[0];
          }
        } else {
          parsed.activeNodeId = null;
        }
      }

      // === 9. Fix rootNodeId ===
      if (parsed.rootNodeId && !parsed.nodes[parsed.rootNodeId]) {
        repairLog.push("Repaired: rootNodeId pointed to non-existent node");
        // Find a node with no parent
        const rootCandidates = Object.values(parsed.nodes).filter(
          (n: any) => !n.parentId,
        );
        if (rootCandidates.length > 0) {
          parsed.rootNodeId = (rootCandidates[0] as any).id;
        } else {
          parsed.rootNodeId = null;
        }
      }

      // Log repairs if any
      if (repairLog.length > 0) {
        console.warn("[Save Repair]", repairLog);
      }

      // Fix initial prompt if missing
      if (typeof parsed.initialPrompt !== "string") {
        parsed.initialPrompt = "Continue the story";
      }

      return parsed as GameState;
    },
    [],
  );

  /**
   * Manually save the current state to a slot.
   * Use this for explicit save points (e.g., after outline generation).
   */
  const saveToSlot = useCallback(async (slotId: string, state: GameState) => {
    try {
      await saveGameState(slotId, state);
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
        // Load save slots metadata
        const slots = await loadMetadata("slots");
        if (slots && Array.isArray(slots)) {
          setSaveSlots(slots);

          // Try to restore last active session
          let lastSlotId = await loadMetadata("currentSlot");

          // If no last slot, select the latest
          if (!lastSlotId) {
            lastSlotId = latestSlotId;
          }

          if (lastSlotId && typeof lastSlotId === "string") {
            const data = await loadGameState(lastSlotId);
            if (data) {
              const sanitized = sanitizeState(data);
              setGameState(sanitized);
              setCurrentSlotId(lastSlotId);
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

  // Auto-Save Logic using IndexedDB
  // SAVE ONLY IN THESE SCENARIOS:
  // 1. Story Outline generation complete (outline exists but rootNodeId just appeared)
  // 2. AI turn complete (activeNodeId changed to a model node)
  // 3. User action complete (triggerSave called manually after user choice)
  // 4. /god or /unlock commands (triggerSave called manually)
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

    // Determine if we should save
    let shouldSave = false;
    let saveReason = "";

    // Case 1: Manual trigger (from triggerSave callback)
    if (triggerSaveCount > 0) {
      shouldSave = true;
      saveReason = "manual trigger";
    }
    // Case 2: Active node changed to a model node (AI turn complete)
    else if (
      gameState.activeNodeId &&
      gameState.activeNodeId !== lastSavedActiveNodeRef.current
    ) {
      const activeNode = gameState.nodes[gameState.activeNodeId];
      // Only save if it's a model node (AI response)
      if (activeNode && activeNode.role === "model") {
        shouldSave = true;
        saveReason = "AI turn complete";
      }
    }

    if (!shouldSave) {
      return;
    }

    // Clear any pending debounce timer
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce the save operation
    saveTimeoutRef.current = setTimeout(async () => {
      // Throttle: check if enough time has passed since last save
      const now = Date.now();
      const timeSinceLastSave = now - lastSaveTimeRef.current;

      // Apply throttle only for non-manual saves
      if (timeSinceLastSave < MIN_SAVE_INTERVAL_MS && triggerSaveCount === 0) {
        // Schedule another attempt
        saveTimeoutRef.current = setTimeout(() => {
          lastSavedActiveNodeRef.current = null; // Reset to allow retry
        }, MIN_SAVE_INTERVAL_MS - timeSinceLastSave);
        return;
      }

      try {
        console.log(`[AutoSave] Saving game state (reason: ${saveReason})`);

        // Save game state to IndexedDB
        await saveGameState(currentSlotId, gameState);
        lastSaveTimeRef.current = now;
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
      }
    }, AUTO_SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [
    gameState.activeNodeId,
    gameState.isProcessing,
    gameState.rootNodeId,
    currentSlotId,
    view,
    skipNextSave,
    triggerSaveCount,
    gameState,
    saveSlots,
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
      summary: "New Game",
    };
    const newSlots = [...saveSlots, newSlot];
    setSaveSlots(newSlots);

    // Save to IndexedDB asynchronously
    saveMetadata("slots", newSlots).catch((err) => {
      console.error("Failed to save slots metadata:", err);
    });

    return id;
  };

  const loadSlot = async (id: string): Promise<boolean> => {
    try {
      const data = await loadGameState(id);
      if (data) {
        // Reset embedding manager when switching saves
        // The embedding index will be rebuilt for the new game state
        resetEmbeddingManager();

        const sanitized = sanitizeState(data);
        setGameState(sanitized);
        setCurrentSlotId(id);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to load slot:", error);
      return false;
    }
  };

  const deleteSlot = (id: string) => {
    const newSlots = saveSlots.filter((s) => s.id !== id);
    setSaveSlots(newSlots);

    // Update IndexedDB asynchronously
    Promise.all([saveMetadata("slots", newSlots), deleteGameState(id)]).catch(
      (error) => {
        console.error("Failed to delete slot:", error);
      },
    );

    if (currentSlotId === id) {
      setCurrentSlotId(latestSlotId);
    }
  };

  const clearAllSaves = async () => {
    try {
      // Clear all save data from IndexedDB
      for (const slot of saveSlots) {
        await deleteGameState(slot.id);
      }

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
  };
};
