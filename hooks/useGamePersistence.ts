import { useState, useEffect } from "react";
import { GameState, SaveSlot } from "../types";
import {
  saveGameState,
  loadGameState,
  deleteGameState,
  saveMetadata,
  loadMetadata,
  getStorageEstimate,
} from "../utils/indexedDB";

export const useGamePersistence = (
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  view: string,
) => {
  const [saveSlots, setSaveSlots] = useState<SaveSlot[]>([]);
  const [currentSlotId, setCurrentSlotId] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Helper to sanitize and fix state on load
  const sanitizeState = (parsed: any): GameState => {
    // Migrations
    if (!parsed.logs) parsed.logs = [];
    if (!parsed.totalTokens) parsed.totalTokens = 0;
    if (!parsed.explicitLine)
      parsed.explicitLine = { primary: "Survive", secondary: "Find your way." };
    if (!parsed.implicitLine)
      parsed.implicitLine = { content: "Unknown forces are watching." };

    // Migration: accumulatedSummary -> summaries
    if (
      parsed.accumulatedSummary &&
      (!parsed.summaries || parsed.summaries.length === 0)
    ) {
      parsed.summaries = [parsed.accumulatedSummary];
      delete parsed.accumulatedSummary;
    }
    if (!parsed.summaries) parsed.summaries = [];

    // Ensure theme exists
    if (!parsed.theme) {
      parsed.theme = "fantasy";
    }

    // Reset processing state on load to prevent stuck state
    parsed.isProcessing = false;
    // Always clear image generation state on load
    // If an image was generating when saved, consider it failed
    parsed.isImageGenerating = false;
    parsed.error = null;

    // Fix Dangling User Node (Crash/Exit during generation)
    // If the last node is a 'user' node, it means we never got a response.
    // Revert to parent so the user can try again.
    if (parsed.activeNodeId && parsed.nodes[parsed.activeNodeId]) {
      const lastNode = parsed.nodes[parsed.activeNodeId];
      if (lastNode.role === "user") {
        console.warn(
          "Detected dangling user node (crash recovery). Reverting to parent.",
        );
        if (lastNode.parentId) {
          parsed.activeNodeId = lastNode.parentId;
        }
      }
    }
    return parsed as GameState;
  };

  // Load Slots and Current Game on Mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load save slots metadata
        const slots = await loadMetadata("slots");
        if (slots && Array.isArray(slots)) {
          setSaveSlots(slots);

          // Try to restore last active session
          const lastSlotId = await loadMetadata("currentSlot");
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
      } catch (error) {
        console.error("Failed to load saves from IndexedDB", error);
      }
    };

    loadInitialData();
  }, []);

  // Auto-Save Logic using IndexedDB
  useEffect(() => {
    if (view === "game" && currentSlotId && gameState.rootNodeId) {
      const performSave = async () => {
        try {
          // Save game state to IndexedDB
          await saveGameState(currentSlotId, gameState);

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
            // Look back up to 5 steps for an image
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

          // Only update if changed to avoid loops
          if (JSON.stringify(updatedSlots) !== JSON.stringify(saveSlots)) {
            setSaveSlots(updatedSlots);
            await saveMetadata("slots", updatedSlots);
          }

          setIsAutoSaving(true);
          const timer = setTimeout(() => setIsAutoSaving(false), 2000);
          return () => clearTimeout(timer);
        } catch (error: any) {
          console.error("Failed to save game to IndexedDB:", error);
          // Show user-friendly error
          if (error.name === "QuotaExceededError") {
            alert("QuotaExceededError");
          }
        }
      };

      performSave();
    }
  }, [gameState, currentSlotId, view]);

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
      name: `Chronicle ${saveSlots.length + 1}`,
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
      setCurrentSlotId(null);
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

  return {
    saveSlots,
    currentSlotId,
    setCurrentSlotId,
    createSaveSlot,
    loadSlot,
    deleteSlot,
    clearAllSaves,
    isAutoSaving,
  };
};
