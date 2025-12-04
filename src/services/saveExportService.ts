/**
 * Save Export/Import Service
 *
 * Handles exporting and importing game saves in ZIP format
 * with optional images, embeddings, and proper version migration
 */

import JSZip from "jszip";
import type {
  GameState,
  SaveSlot,
  VersionedGameState,
  ExportManifest,
  ExportOptions,
  ExportStats,
  ImportResult,
  ImportValidation,
  StorySegment,
  CURRENT_EXPORT_VERSION,
} from "../types";
import { CURRENT_SAVE_VERSION } from "../types";
import { loadGameState, saveGameState, saveMetadata, loadMetadata } from "../utils/indexedDB";
import { getImagesBySaveId, saveImage, StoredImage, deleteImagesBySaveId } from "../utils/imageStorage";
import { getMigrationManager } from "./migrationManager";
import { getRAGService } from "./rag";
import type { RAGExportData } from "./rag/types";

// App version for export metadata
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";

// Current export format version
const EXPORT_FORMAT_VERSION = 2;

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Get statistics about what would be exported
 */
export async function getExportStats(slotId: string): Promise<ExportStats | null> {
  try {
    const gameState = await loadGameState<VersionedGameState>(slotId);
    if (!gameState) return null;

    const nodeCount = Object.keys(gameState.nodes || {}).length;

    // Get images for this save
    const images = await getImagesBySaveId(slotId);
    const imageCount = images.length;

    // Get RAG document count for this save
    let embeddingCount = 0;
    try {
      const saveStats = await getRAGService().getSaveStats(slotId);
      if (saveStats) {
        embeddingCount = saveStats.totalDocuments;
      }
    } catch (e) {
      // RAG might not be initialized, ignore
      console.warn("[SaveExport] Could not get RAG stats:", e);
    }

    // Calculate estimated size
    let estimatedSize = JSON.stringify(gameState).length;
    for (const img of images) {
      estimatedSize += img.blob.size;
    }
    // Estimate embedding size (rough estimate: 1KB per document)
    estimatedSize += embeddingCount * 1024;

    return {
      nodeCount,
      imageCount,
      embeddingCount,
      estimatedSize,
    };
  } catch (error) {
    console.error("[SaveExport] Failed to get export stats:", error);
    return null;
  }
}

/**
 * Clean up game state for export based on options
 */
function cleanupStateForExport(
  state: VersionedGameState,
  options: ExportOptions
): VersionedGameState {
  // Deep clone the state to avoid mutating the original
  const cleanState = JSON.parse(JSON.stringify(state)) as VersionedGameState;

  // Remove transient fields
  cleanState.isProcessing = false;
  cleanState.isImageGenerating = false;
  cleanState.generatingNodeId = null;
  cleanState.error = null;

  // Remove embedding index (it's regenerated on import)
  delete cleanState._embeddingIndex;

  // Clean up nodes if images are not included
  if (!options.includeImages) {
    const nodes = cleanState.nodes || {};
    for (const nodeId in nodes) {
      const node = nodes[nodeId] as StorySegment;
      // Remove image references
      delete node.imageUrl;
      delete node.imageId;
    }
  }

  // Remove RAG queries and other ephemeral data
  delete cleanState.ragQueries;
  cleanState.logs = []; // Clear API logs to reduce size

  return cleanState;
}

/**
 * Export a save to a ZIP file
 */
export async function exportSave(
  slotId: string,
  slot: SaveSlot,
  options: ExportOptions
): Promise<Blob | null> {
  try {
    console.log(`[SaveExport] Starting export for slot ${slotId}`);

    // Load the full game state
    const gameState = await loadGameState<VersionedGameState>(slotId);
    if (!gameState) {
      console.error("[SaveExport] Failed to load game state");
      return null;
    }

    // Clean up state based on options
    const cleanedState = cleanupStateForExport(gameState, options);

    // Create ZIP
    const zip = new JSZip();

    // Add save.json
    const saveJson = JSON.stringify(cleanedState, null, 2);
    zip.file("save.json", saveJson);

    // Calculate checksum (simple hash for integrity check)
    const checksum = await computeChecksum(saveJson);

    // Gather stats
    const nodeCount = Object.keys(cleanedState.nodes || {}).length;
    let imageCount = 0;
    let embeddingCount = 0;

    // Add images if requested
    if (options.includeImages) {
      const images = await getImagesBySaveId(slotId);
      if (images.length > 0) {
        const imagesFolder = zip.folder("images");
        if (imagesFolder) {
          for (const image of images) {
            // Determine file extension from blob type
            const ext = image.blob.type === "image/png" ? "png" :
                       image.blob.type === "image/jpeg" ? "jpg" : "webp";
            imagesFolder.file(`${image.id}.${ext}`, image.blob);

            // Also store metadata
            const metadata = {
              id: image.id,
              saveId: image.saveId,
              forkId: image.forkId,
              turnIdx: image.turnIdx,
              imagePrompt: image.imagePrompt,
              timestamp: image.timestamp,
              storyTitle: image.storyTitle,
              location: image.location,
              storyTime: image.storyTime,
            };
            imagesFolder.file(`${image.id}.meta.json`, JSON.stringify(metadata, null, 2));
          }
          imageCount = images.length;
        }
      }
    }

    // Add embeddings if requested
    let ragExportData: RAGExportData | null = null;
    if (options.includeEmbeddings) {
      try {
        ragExportData = await getRAGService().exportSaveData(slotId);
        if (ragExportData && ragExportData.documents.length > 0) {
          zip.file("embeddings.json", JSON.stringify(ragExportData, null, 2));
          embeddingCount = ragExportData.documents.length;
          console.log(`[SaveExport] Exported ${embeddingCount} RAG documents`);
        }
      } catch (error) {
        console.warn("[SaveExport] Failed to export embeddings (RAG may not be initialized):", error);
      }
    }

    // Clean slot for export (remove previewImage if images not included)
    const exportSlot: SaveSlot = { ...slot };
    if (!options.includeImages) {
      delete exportSlot.previewImage;
    }

    // Create manifest
    const manifest: ExportManifest = {
      version: EXPORT_FORMAT_VERSION,
      exportDate: new Date().toISOString(),
      appVersion: APP_VERSION,
      saveVersion: cleanedState._saveVersion?.version || CURRENT_SAVE_VERSION,
      slot: exportSlot,
      includes: {
        images: options.includeImages,
        embeddings: options.includeEmbeddings && embeddingCount > 0,
      },
      stats: {
        nodeCount,
        imageCount,
        embeddingCount,
      },
      checksum,
    };

    zip.file("manifest.json", JSON.stringify(manifest, null, 2));

    // Generate ZIP blob
    const blob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    console.log(`[SaveExport] Export complete: ${(blob.size / 1024).toFixed(2)} KB`);
    return blob;

  } catch (error) {
    console.error("[SaveExport] Export failed:", error);
    return null;
  }
}

/**
 * Download export as file
 */
export function downloadExport(blob: Blob, slotName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;

  // Sanitize filename
  const safeName = slotName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const date = new Date().toISOString().split("T")[0];
  link.download = `chronicles-${safeName}-${date}.zip`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// Import Functions
// ============================================================================

/**
 * Validate an import file
 */
export async function validateImport(file: File): Promise<ImportValidation> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Check file type
    if (!file.name.endsWith(".zip") && !file.name.endsWith(".json")) {
      errors.push("Invalid file type. Expected .zip or .json file.");
      return { valid: false, errors, warnings };
    }

    // Handle legacy JSON format
    if (file.name.endsWith(".json")) {
      return validateLegacyJson(file);
    }

    // Parse ZIP
    const zip = await JSZip.loadAsync(file);

    // Check for manifest
    const manifestFile = zip.file("manifest.json");
    if (!manifestFile) {
      errors.push("Missing manifest.json in export file.");
      return { valid: false, errors, warnings };
    }

    const manifestJson = await manifestFile.async("text");
    let manifest: ExportManifest;
    try {
      manifest = JSON.parse(manifestJson);
    } catch {
      errors.push("Invalid manifest.json format.");
      return { valid: false, errors, warnings };
    }

    // Validate manifest version
    if (!manifest.version || manifest.version > EXPORT_FORMAT_VERSION) {
      warnings.push(`Export version ${manifest.version} is newer than supported ${EXPORT_FORMAT_VERSION}. Some features may not work.`);
    }

    // Check for save.json
    const saveFile = zip.file("save.json");
    if (!saveFile) {
      errors.push("Missing save.json in export file.");
      return { valid: false, errors, warnings };
    }

    // Validate save data
    const saveJson = await saveFile.async("text");
    let saveData: VersionedGameState;
    try {
      saveData = JSON.parse(saveJson);
    } catch {
      errors.push("Invalid save.json format.");
      return { valid: false, errors, warnings };
    }

    // Check checksum if present
    if (manifest.checksum) {
      const actualChecksum = await computeChecksum(saveJson);
      if (actualChecksum !== manifest.checksum) {
        warnings.push("Checksum mismatch. Save data may have been modified.");
      }
    }

    // Check if migration is needed
    const migrationManager = getMigrationManager();
    const requiresMigration = migrationManager.needsMigration(saveData);
    if (requiresMigration) {
      warnings.push(`Save requires migration from version ${migrationManager.getSaveVersion(saveData)} to ${CURRENT_SAVE_VERSION}.`);
    }

    // Validate required fields
    const validation = migrationManager.validateState(saveData);
    if (!validation.valid) {
      for (const err of validation.errors) {
        errors.push(`Save validation: ${err}`);
      }
    }

    // Check if images folder exists if images were included
    if (manifest.includes.images) {
      const imagesFolder = zip.folder("images");
      if (!imagesFolder) {
        warnings.push("Images were marked as included but images folder is missing.");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      manifest,
      requiresMigration,
    };

  } catch (error) {
    errors.push(`Failed to parse import file: ${error instanceof Error ? error.message : "Unknown error"}`);
    return { valid: false, errors, warnings };
  }
}

/**
 * Validate legacy JSON format (from old broken export)
 */
async function validateLegacyJson(file: File): Promise<ImportValidation> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    // Check if it's a SaveSlot (old broken format)
    if (data.id && data.name && data.timestamp && data.theme && !data.nodes) {
      errors.push("This appears to be an old metadata-only export. It does not contain actual game data and cannot be imported.");
      return { valid: false, errors, warnings };
    }

    // Check if it's a full game state
    if (data.nodes && data.inventory) {
      warnings.push("This is a legacy JSON export. Some features may be missing.");

      const migrationManager = getMigrationManager();
      const requiresMigration = migrationManager.needsMigration(data);

      // Create a pseudo-manifest for legacy format
      const manifest: ExportManifest = {
        version: 1,
        exportDate: new Date().toISOString(),
        appVersion: "legacy",
        saveVersion: migrationManager.getSaveVersion(data),
        slot: {
          id: Date.now().toString(),
          name: "Imported Save",
          timestamp: Date.now(),
          theme: data.theme || "unknown",
          summary: "Imported from legacy format",
        },
        includes: {
          images: false,
          embeddings: false,
        },
        stats: {
          nodeCount: Object.keys(data.nodes || {}).length,
          imageCount: 0,
          embeddingCount: 0,
        },
      };

      return {
        valid: true,
        errors,
        warnings,
        manifest,
        requiresMigration,
      };
    }

    errors.push("Unrecognized file format.");
    return { valid: false, errors, warnings };

  } catch {
    errors.push("Failed to parse JSON file.");
    return { valid: false, errors, warnings };
  }
}

/**
 * Generate a unique slot ID that doesn't conflict with existing slots
 */
function generateUniqueSlotId(existingSlots: SaveSlot[]): string {
  const existingIds = new Set(existingSlots.map(s => s.id));
  let newId = Date.now().toString();

  // Ensure uniqueness by appending random suffix if needed
  while (existingIds.has(newId)) {
    newId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  return newId;
}

/**
 * Import a save from file
 */
export async function importSave(
  file: File,
  existingSlots: SaveSlot[]
): Promise<ImportResult> {
  try {
    // First validate
    const validation = await validateImport(file);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join("; "),
        warnings: validation.warnings,
      };
    }

    const manifest = validation.manifest!;
    const warnings = [...validation.warnings];

    // Generate new slot ID with uniqueness guarantee
    const newSlotId = generateUniqueSlotId(existingSlots);
    console.log(`[SaveImport] Generated unique slot ID: ${newSlotId}`);

    // Handle legacy JSON format
    if (file.name.endsWith(".json")) {
      const text = await file.text();
      let saveData = JSON.parse(text);

      // Apply migrations if needed
      if (validation.requiresMigration) {
        const migrationManager = getMigrationManager();
        saveData = await migrationManager.migrate(saveData);
      }

      // Clean the state
      saveData = cleanupImportedState(saveData);

      // Add version info if missing
      if (!saveData._saveVersion) {
        saveData._saveVersion = {
          version: CURRENT_SAVE_VERSION,
          createdAt: Date.now(),
        };
      }

      // Save to IndexedDB
      await saveGameState(newSlotId, saveData);

      // Create new slot metadata
      const newSlot: SaveSlot = {
        id: newSlotId,
        name: generateUniqueName(manifest.slot.name, existingSlots),
        timestamp: Date.now(),
        theme: saveData.theme || manifest.slot.theme,
        summary: manifest.slot.summary || "Imported save",
      };

      // Update slots metadata
      const updatedSlots = [...existingSlots, newSlot];
      await saveMetadata("slots", updatedSlots);

      return {
        success: true,
        slotId: newSlotId,
        warnings,
        migrated: validation.requiresMigration,
        originalVersion: validation.requiresMigration ?
          getMigrationManager().getSaveVersion(JSON.parse(text)) : undefined,
      };
    }

    // Handle ZIP format
    const zip = await JSZip.loadAsync(file);

    // Load save data
    const saveFile = zip.file("save.json");
    if (!saveFile) {
      return { success: false, error: "Missing save.json" };
    }

    let saveData = JSON.parse(await saveFile.async("text")) as VersionedGameState;

    // Apply migrations if needed
    if (validation.requiresMigration) {
      const migrationManager = getMigrationManager();
      saveData = await migrationManager.migrate(saveData);
    }

    // Clean the state
    saveData = cleanupImportedState(saveData);

    // Import images if present
    if (manifest.includes.images) {
      const imagesFolder = zip.folder("images");
      if (imagesFolder) {
        const imageMapping = await importImages(imagesFolder, newSlotId);

        // Update node image references
        updateImageReferences(saveData, imageMapping);
      }
    } else {
      // Clear any existing image references since images weren't exported
      clearImageReferences(saveData);
    }

    // Import embeddings if present
    if (manifest.includes.embeddings) {
      const embeddingsFile = zip.file("embeddings.json");
      if (embeddingsFile) {
        try {
          const embeddingsJson = await embeddingsFile.async("text");
          const embeddingsData: RAGExportData = JSON.parse(embeddingsJson);

          // Import to RAG service with new save ID
          const importResult = await getRAGService().importSaveData(embeddingsData, newSlotId);
          console.log(`[SaveImport] Imported ${importResult.imported} RAG documents`);
        } catch (error) {
          console.warn("[SaveImport] Failed to import embeddings:", error);
          warnings.push("Failed to import embeddings. They will be regenerated.");
        }
      }
    }

    // Add version info if missing
    if (!saveData._saveVersion) {
      saveData._saveVersion = {
        version: CURRENT_SAVE_VERSION,
        createdAt: Date.now(),
      };
    }

    // Add import metadata
    saveData._saveVersion.migratedFrom = validation.requiresMigration ?
      getMigrationManager().getSaveVersion(saveData) : undefined;

    // Save to IndexedDB
    await saveGameState(newSlotId, saveData);

    // Create new slot metadata
    const newSlot: SaveSlot = {
      id: newSlotId,
      name: generateUniqueName(manifest.slot.name, existingSlots),
      timestamp: Date.now(),
      theme: saveData.theme || manifest.slot.theme,
      summary: manifest.slot.summary || "Imported save",
      previewImage: manifest.slot.previewImage,
    };

    // Update slots metadata
    const updatedSlots = [...existingSlots, newSlot];
    await saveMetadata("slots", updatedSlots);

    console.log(`[SaveImport] Import complete: slot ${newSlotId}`);

    return {
      success: true,
      slotId: newSlotId,
      warnings,
      migrated: validation.requiresMigration,
      originalVersion: validation.requiresMigration ?
        validation.manifest?.saveVersion : undefined,
    };

  } catch (error) {
    console.error("[SaveImport] Import failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown import error",
    };
  }
}

/**
 * Clean up imported state
 */
function cleanupImportedState(state: VersionedGameState): VersionedGameState {
  // Reset transient fields
  state.isProcessing = false;
  state.isImageGenerating = false;
  state.generatingNodeId = null;
  state.error = null;

  // Clear RAG queries (will be regenerated)
  delete state.ragQueries;

  // Clear embedding index (will be regenerated)
  delete state._embeddingIndex;

  // Repair any missing fields
  const migrationManager = getMigrationManager();
  const repairedState = migrationManager.repairState(state);

  return repairedState;
}

/**
 * Import images from ZIP folder
 * Returns mapping of old ID -> new ID
 */
async function importImages(
  imagesFolder: JSZip,
  newSaveId: string
): Promise<Map<string, string>> {
  const mapping = new Map<string, string>();

  const files = Object.keys(imagesFolder.files);
  const imageFiles = files.filter(
    (f) => !f.endsWith(".meta.json") && !f.endsWith("/")
  );

  for (const filename of imageFiles) {
    try {
      const file = imagesFolder.file(filename);
      if (!file) continue;

      // Extract old ID from filename
      const oldId = filename.replace(/\.(png|jpg|jpeg|webp)$/i, "").split("/").pop()!;

      // Load metadata if present
      const metaFile = imagesFolder.file(`${oldId}.meta.json`);
      let metadata: any = {};
      if (metaFile) {
        try {
          metadata = JSON.parse(await metaFile.async("text"));
        } catch {
          // Ignore metadata parse errors
        }
      }

      // Load image blob
      const blob = await file.async("blob");

      // Save with new saveId
      const newId = await saveImage(blob, {
        saveId: newSaveId,
        forkId: metadata.forkId || 0,
        turnIdx: metadata.turnIdx || 0,
        imagePrompt: metadata.imagePrompt,
        storyTitle: metadata.storyTitle,
        location: metadata.location,
        storyTime: metadata.storyTime,
      });

      mapping.set(oldId, newId);

    } catch (error) {
      console.warn(`[SaveImport] Failed to import image ${filename}:`, error);
    }
  }

  console.log(`[SaveImport] Imported ${mapping.size} images`);
  return mapping;
}

/**
 * Update image references in nodes with new IDs
 */
function updateImageReferences(
  state: VersionedGameState,
  mapping: Map<string, string>
): void {
  const nodes = state.nodes || {};

  for (const nodeId in nodes) {
    const node = nodes[nodeId] as StorySegment;
    if (node.imageId && mapping.has(node.imageId)) {
      node.imageId = mapping.get(node.imageId)!;
      // Clear imageUrl as it will be regenerated from imageId
      delete node.imageUrl;
    }
  }
}

/**
 * Clear all image references in nodes
 */
function clearImageReferences(state: VersionedGameState): void {
  const nodes = state.nodes || {};

  for (const nodeId in nodes) {
    const node = nodes[nodeId] as StorySegment;
    delete node.imageId;
    delete node.imageUrl;
  }
}

/**
 * Generate a unique name for imported save
 */
function generateUniqueName(baseName: string, existingSlots: SaveSlot[]): string {
  const existingNames = new Set(existingSlots.map((s) => s.name));

  if (!existingNames.has(baseName)) {
    return baseName;
  }

  let counter = 1;
  let newName = `${baseName} (${counter})`;
  while (existingNames.has(newName)) {
    counter++;
    newName = `${baseName} (${counter})`;
  }

  return newName;
}

/**
 * Compute a simple checksum for data integrity
 */
async function computeChecksum(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}
