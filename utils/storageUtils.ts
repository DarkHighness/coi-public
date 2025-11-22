/**
 * Utility functions for managing IndexedDB storage
 * These can be called from the browser console for debugging/maintenance
 */

/**
 * Clear all game saves from IndexedDB
 * WARNING: This will delete all save data!
 */
export const clearAllSaves = async (): Promise<void> => {
  if (!confirm("⚠️ This will DELETE ALL save data! Are you sure?")) {
    return;
  }

  try {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase("ChroniclesOfInfinity");
      request.onsuccess = () => {
        console.log("✅ All saves cleared from IndexedDB");
        resolve();
      };
      request.onerror = () => reject(request.error);
    });

    // Also clear migration flag
    localStorage.removeItem("chronicles_migrated_to_indexeddb");
    console.log("✅ Migration flag cleared");
  } catch (error) {
    console.error("❌ Failed to clear saves:", error);
  }
};

/**
 * Get detailed storage information
 */
export const getStorageInfo = async (): Promise<void> => {
  if ("storage" in navigator && "estimate" in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    if (estimate.usage && estimate.quota) {
      const usageMB = (estimate.usage / (1024 * 1024)).toFixed(2);
      const quotaMB = (estimate.quota / (1024 * 1024)).toFixed(2);
      const percentage = ((estimate.usage / estimate.quota) * 100).toFixed(1);

      console.log("📊 Storage Information:");
      console.log(`   Usage: ${usageMB} MB`);
      console.log(`   Quota: ${quotaMB} MB`);
      console.log(`   Usage: ${percentage}%`);

      if (estimate.usage / estimate.quota > 0.8) {
        console.warn(
          "⚠️ Storage is over 80% full! Consider deleting old saves.",
        );
      }
    }
  } else {
    console.log("❌ Storage estimation not supported in this browser");
  }
};

/**
 * Export all saves to a downloadable JSON file
 */
export const exportAllSaves = async (): Promise<void> => {
  try {
    const { loadMetadata, loadGameState, getAllSaveIds } = await import(
      "./indexedDB"
    );

    const slots = await loadMetadata("slots");
    const currentSlot = await loadMetadata("currentSlot");
    const saveIds = await getAllSaveIds();

    const saves: Record<string, any> = {};
    for (const id of saveIds) {
      const data = await loadGameState(id);
      if (data) {
        saves[id] = data;
      }
    }

    const exportData = {
      version: 1,
      exportDate: new Date().toISOString(),
      slots,
      currentSlot,
      saves,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chronicles_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    console.log("✅ Saves exported successfully");
  } catch (error) {
    console.error("❌ Failed to export saves:", error);
  }
};

/**
 * List all saved games with details
 */
export const listAllSaves = async (): Promise<void> => {
  try {
    const { loadMetadata, getAllSaveIds } = await import("./indexedDB");

    const slots = await loadMetadata("slots");
    const saveIds = await getAllSaveIds();

    console.log("📚 All Saved Games:");
    console.log(`   Total saves: ${saveIds.length}`);
    console.log("");

    if (slots && Array.isArray(slots)) {
      slots.forEach((slot: any, index: number) => {
        console.log(`${index + 1}. ${slot.name}`);
        console.log(`   ID: ${slot.id}`);
        console.log(`   Theme: ${slot.theme}`);
        console.log(`   Summary: ${slot.summary}`);
        console.log(
          `   Last Modified: ${new Date(slot.timestamp).toLocaleString()}`,
        );
        console.log("");
      });
    }
  } catch (error) {
    console.error("❌ Failed to list saves:", error);
  }
};

/**
 * Initialize storage utilities and make them globally accessible
 * Call this manually from the application if you want console access
 */
export const initStorageUtilities = (): void => {
  if (typeof window !== "undefined") {
    (window as any).chroniclesStorage = {
      clearAllSaves,
      getStorageInfo,
      exportAllSaves,
      listAllSaves,
    };

    console.log("📦 Chronicles Storage Utilities loaded!");
    console.log("   Available commands:");
    console.log("   - chroniclesStorage.getStorageInfo()");
    console.log("   - chroniclesStorage.listAllSaves()");
    console.log("   - chroniclesStorage.exportAllSaves()");
    console.log("   - chroniclesStorage.clearAllSaves()");
  }
};

// Auto-initialize in development for convenience
if (typeof window !== "undefined" && import.meta.env.DEV) {
  initStorageUtilities();
}
