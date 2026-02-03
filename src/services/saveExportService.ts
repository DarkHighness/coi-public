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
  GameStateSnapshot,
} from "../types";
import { CURRENT_EXPORT_VERSION, CURRENT_SAVE_VERSION } from "../types";
import {
  loadGameState,
  saveGameState,
  saveMetadata,
  loadMetadata,
  openVfsDB,
  VFS_META_STORE,
} from "../utils/indexedDB";
import {
  getImagesBySaveId,
  saveImage,
  StoredImage,
  deleteImagesBySaveId,
} from "../utils/imageStorage";
import { getMigrationManager } from "./migrationManager";
import { getRAGService } from "./rag";
import type { RAGExportData } from "./rag/types";
import { IndexedDbVfsStore } from "./vfs/store";
import type { VfsSnapshot } from "./vfs/types";
import { VfsSession } from "./vfs/vfsSession";
import { restoreVfsSessionFromSnapshot, saveVfsSessionSnapshot } from "./vfs/persistence";
import { deriveGameStateFromVfs } from "./vfs/derivations";
import { seedVfsSessionFromGameState } from "./vfs/seed";
import { writeOutlineFile, writeOutlineProgress } from "./vfs/outline";
import {
  buildTurnId,
  writeConversationIndex,
  writeForkTree,
  writeTurnFile,
} from "./vfs/conversation";

// App version for export metadata
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";

// Current export format version
const EXPORT_FORMAT_VERSION = CURRENT_EXPORT_VERSION;

type VfsLatestMeta = { forkId: number; turn: number };

interface VfsExportIndexEntry {
  forkId: number;
  turn: number;
  createdAt: number;
}

interface VfsExportBundleIndex {
  version: number;
  latest: VfsLatestMeta | null;
  snapshots: VfsExportIndexEntry[];
}

const isValidLatestMeta = (value: unknown): value is VfsLatestMeta => {
  if (!value || typeof value !== "object") return false;
  const forkId = (value as any).forkId;
  const turn = (value as any).turn;
  return typeof forkId === "number" && typeof turn === "number";
};

const loadLatestVfsMeta = async (saveId: string): Promise<VfsLatestMeta | null> => {
  try {
    const meta = await loadMetadata<unknown>(`vfs_latest:${saveId}`);
    if (isValidLatestMeta(meta)) {
      return meta;
    }
  } catch (error) {
    console.warn("[SaveExport] Failed to load vfs_latest metadata:", error);
  }

  try {
    const entries = await listVfsSnapshotIndexEntries(saveId);
    if (entries.length === 0) return null;
    const latest = entries.reduce((best, entry) => {
      if (!best) return entry;
      if (entry.createdAt > best.createdAt) return entry;
      return best;
    }, null as VfsExportIndexEntry | null);
    return latest ? { forkId: latest.forkId, turn: latest.turn } : null;
  } catch (error) {
    console.warn("[SaveExport] Failed to infer latest VFS snapshot:", error);
    return null;
  }
};

const listVfsSnapshotIndexEntries = async (
  saveId: string,
): Promise<VfsExportIndexEntry[]> => {
  const db = await openVfsDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([VFS_META_STORE], "readonly");
    const store = transaction.objectStore(VFS_META_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const rows = (request.result as any[] | undefined) ?? [];
      const filtered = rows
        .filter(
          (row) =>
            row &&
            typeof row.saveId === "string" &&
            row.saveId === saveId &&
            typeof row.forkId === "number" &&
            typeof row.turn === "number",
        )
        .map((row) => ({
          forkId: row.forkId as number,
          turn: row.turn as number,
          createdAt: typeof row.createdAt === "number" ? row.createdAt : 0,
        }))
        .sort((a, b) => a.forkId - b.forkId || a.turn - b.turn);

      resolve(filtered);
    };

    request.onerror = () => reject(request.error);
  });
};

const loadDerivedStateFromLatestVfsSnapshot = async (
  saveId: string,
): Promise<{ state: VersionedGameState; latest: VfsLatestMeta } | null> => {
  const latest = await loadLatestVfsMeta(saveId);
  if (!latest) return null;

  const store = new IndexedDbVfsStore();
  const snapshot = await store.loadSnapshot(saveId, latest.forkId, latest.turn);
  if (!snapshot) {
    return null;
  }

  const session = new VfsSession();
  restoreVfsSessionFromSnapshot(session, snapshot);
  const derived = deriveGameStateFromVfs(session.snapshot()) as VersionedGameState;
  if (!derived._saveVersion) {
    derived._saveVersion = {
      version: CURRENT_SAVE_VERSION,
      createdAt: Date.now(),
    };
  }

  return { state: derived, latest };
};

const writeVfsSnapshotsToZip = async (
  zip: JSZip,
  saveId: string,
): Promise<{
  snapshotCount: number;
  latest: VfsLatestMeta | null;
}> => {
  const indexEntries = await listVfsSnapshotIndexEntries(saveId);
  if (indexEntries.length === 0) {
    return { snapshotCount: 0, latest: null };
  }

  const latest = await loadLatestVfsMeta(saveId);
  const store = new IndexedDbVfsStore();

  const bundle: VfsExportBundleIndex = {
    version: 1,
    latest,
    snapshots: indexEntries,
  };

  zip.file("vfs/index.json", JSON.stringify(bundle, null, 2));

  const snapshotsRoot = zip.folder("vfs")?.folder("snapshots");
  if (!snapshotsRoot) {
    console.warn("[SaveExport] Failed to create vfs/snapshots folder in ZIP");
    return { snapshotCount: 0, latest };
  }

  let written = 0;
  for (const entry of indexEntries) {
    try {
      const snapshot = await store.loadSnapshot(saveId, entry.forkId, entry.turn);
      if (!snapshot) {
        console.warn(
          `[SaveExport] Missing VFS snapshot for fork=${entry.forkId} turn=${entry.turn}`,
        );
        continue;
      }
      const forkFolder = snapshotsRoot.folder(`fork-${entry.forkId}`);
      forkFolder?.file(
        `turn-${entry.turn}.json`,
        JSON.stringify(snapshot, null, 2),
      );
      written += 1;
    } catch (error) {
      console.warn(
        `[SaveExport] Failed to export VFS snapshot fork=${entry.forkId} turn=${entry.turn}:`,
        error,
      );
    }
  }

  return { snapshotCount: written, latest };
};

type LegacyParsedNodeId =
  | { kind: "turn"; role: "model" | "user"; forkId: number; turn: number }
  | { kind: "turnId"; forkId: number; turn: number };

const parseLegacyNodeId = (id: string): LegacyParsedNodeId | null => {
  if (typeof id !== "string") return null;
  const match = /^(model|user)-fork-(\d+)\/turn-(\d+)$/.exec(id);
  if (match) {
    return {
      kind: "turn",
      role: match[1] === "model" ? "model" : "user",
      forkId: Number(match[2]),
      turn: Number(match[3]),
    };
  }
  const bare = /^fork-(\d+)\/turn-(\d+)$/.exec(id);
  if (bare) {
    return {
      kind: "turnId",
      forkId: Number(bare[1]),
      turn: Number(bare[2]),
    };
  }
  return null;
};

type LegacyTurnSegments = { user?: StorySegment; model?: StorySegment };

const buildLegacyTurnsIndex = (
  nodes: Record<string, StorySegment> | undefined,
): Map<number, Map<number, LegacyTurnSegments>> => {
  const byFork = new Map<number, Map<number, LegacyTurnSegments>>();
  if (!nodes) return byFork;

  for (const [id, node] of Object.entries(nodes)) {
    const parsed = parseLegacyNodeId(id);
    if (!parsed || parsed.kind !== "turn") continue;
    const { forkId, turn, role } = parsed;
    if (!Number.isFinite(forkId) || !Number.isFinite(turn)) continue;

    const forkMap = byFork.get(forkId) ?? new Map<number, LegacyTurnSegments>();
    const entry = forkMap.get(turn) ?? {};
    if (role === "model") entry.model = node;
    if (role === "user") entry.user = node;
    forkMap.set(turn, entry);
    byFork.set(forkId, forkMap);
  }

  return byFork;
};

const createVfsSnapshotsFromLegacyState = async (
  store: IndexedDbVfsStore,
  newSaveId: string,
  state: VersionedGameState,
): Promise<{ snapshotCount: number; latest: VfsLatestMeta | null }> => {
  const turnsIndex = buildLegacyTurnsIndex(state.nodes as any);
  if (turnsIndex.size === 0) {
    console.warn("[SaveImport] No legacy nodes found to seed VFS");
    return { snapshotCount: 0, latest: null };
  }

  const latestTurnByFork = new Map<number, number>();
  for (const [forkId, turns] of turnsIndex.entries()) {
    const turnNumbers = Array.from(turns.keys()).filter((t) => Number.isFinite(t));
    const maxTurn = turnNumbers.length > 0 ? Math.max(...turnNumbers) : -1;
    if (maxTurn >= 0) latestTurnByFork.set(forkId, maxTurn);
  }

  const forkIds = Array.from(latestTurnByFork.keys()).sort((a, b) => a - b);
  if (forkIds.length === 0) {
    return { snapshotCount: 0, latest: null };
  }

  // Build a stable view of turn files for all forks (final state).
  const turnFiles: Array<{ forkId: number; turn: number; file: any }> = [];
  for (const forkId of forkIds) {
    const maxTurn = latestTurnByFork.get(forkId) ?? -1;
    for (let turn = 0; turn <= maxTurn; turn += 1) {
      const segments = turnsIndex.get(forkId)?.get(turn);
      const model = segments?.model;
      if (!model) continue;
      const userAction = segments?.user?.text ?? "";
      turnFiles.push({
        forkId,
        turn,
        file: {
          turnId: buildTurnId(forkId, turn),
          forkId,
          turnNumber: turn,
          parentTurnId: turn === 0 ? null : buildTurnId(forkId, turn - 1),
          createdAt: typeof model.timestamp === "number" ? model.timestamp : Date.now(),
          userAction,
          assistant: {
            narrative: model.text || "",
            choices: model.choices || [],
            narrativeTone: model.narrativeTone,
            atmosphere: model.atmosphere,
            ending: model.ending,
            forceEnd: model.forceEnd,
          },
        },
      });
    }
  }

  const rootTurnIdByFork: Record<string, string> = {};
  const latestTurnNumberByFork: Record<string, number> = {};
  const turnOrderByFork: Record<string, string[]> = {};

  for (const forkId of forkIds) {
    const maxTurn = latestTurnByFork.get(forkId) ?? 0;
    rootTurnIdByFork[String(forkId)] = buildTurnId(forkId, 0);
    latestTurnNumberByFork[String(forkId)] = maxTurn;
    const order: string[] = [];
    for (let turn = 0; turn <= maxTurn; turn += 1) {
      const segments = turnsIndex.get(forkId)?.get(turn);
      if (!segments?.model) continue;
      order.push(buildTurnId(forkId, turn));
    }
    turnOrderByFork[String(forkId)] = order;
  }

  const activeParsed = parseLegacyNodeId(state.activeNodeId ?? "");
  const activeForkId =
    activeParsed && (activeParsed.kind === "turn" || activeParsed.kind === "turnId")
      ? activeParsed.forkId
      : typeof state.forkId === "number"
        ? state.forkId
        : forkIds[0];
  const activeTurn =
    activeParsed && (activeParsed.kind === "turn" || activeParsed.kind === "turnId")
      ? activeParsed.turn
      : typeof state.turnNumber === "number"
        ? state.turnNumber
        : latestTurnByFork.get(activeForkId) ?? 0;

  const fallbackLatest: VfsLatestMeta = {
    forkId: activeForkId,
    turn: activeTurn,
  };

  let written = 0;

  for (const forkId of forkIds) {
    const maxTurn = latestTurnByFork.get(forkId) ?? -1;
    for (let turn = 0; turn <= maxTurn; turn += 1) {
      const segments = turnsIndex.get(forkId)?.get(turn);
      const model = segments?.model;
      if (!model) continue;

      const session = new VfsSession();

      const snapshotState = (model.stateSnapshot as GameStateSnapshot | undefined) ?? null;
      const worldState: GameState = {
        ...(state as any),
        ...(snapshotState ? (snapshotState as any) : {}),
        theme: state.theme,
        playerProfile: (state as any).playerProfile,
        customContext: (state as any).customContext,
        language: (state as any).language,
        narrativeScale: (state as any).narrativeScale,
        seedImageId: (state as any).seedImageId,
        forkId,
        turnNumber: turn,
      };

      seedVfsSessionFromGameState(session, worldState);

      if ((state as any).outline) {
        writeOutlineFile(session, (state as any).outline);
      }
      if ((state as any).outlineConversation) {
        writeOutlineProgress(session, (state as any).outlineConversation ?? null);
      }

      writeForkTree(session, (state as any).forkTree);

      const latestForSnapshot: Record<string, number> = {};
      const orderForSnapshot: Record<string, string[]> = {};

      for (const id of forkIds) {
        const fullLatest = latestTurnByFork.get(id) ?? 0;
        const latest = id === forkId ? turn : fullLatest;
        latestForSnapshot[String(id)] = latest;
        orderForSnapshot[String(id)] =
          (turnOrderByFork[String(id)] || []).filter((turnId) => {
            const match = /fork-(\d+)\/turn-(\d+)/.exec(turnId);
            if (!match) return false;
            const parsedTurn = Number(match[2]);
            return Number.isFinite(parsedTurn) && parsedTurn <= latest;
          });
      }

      for (const entry of turnFiles) {
        const limit = latestForSnapshot[String(entry.forkId)];
        if (typeof limit === "number" && entry.turn > limit) {
          continue;
        }
        writeTurnFile(session, entry.forkId, entry.turn, entry.file);
      }

      writeConversationIndex(session, {
        activeForkId: forkId,
        activeTurnId: buildTurnId(forkId, turn),
        rootTurnIdByFork,
        latestTurnNumberByFork: latestForSnapshot,
        turnOrderByFork: orderForSnapshot,
      });

      await saveVfsSessionSnapshot(store, session, {
        saveId: newSaveId,
        forkId,
        turn,
        createdAt: typeof model.timestamp === "number" ? model.timestamp : Date.now(),
      });
      written += 1;
    }
  }

  return { snapshotCount: written, latest: fallbackLatest };
};

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Get statistics about what would be exported
 */
export async function getExportStats(
  slotId: string,
): Promise<ExportStats | null> {
  try {
    const derived = await loadDerivedStateFromLatestVfsSnapshot(slotId);
    let gameState = derived?.state ?? null;
    if (!gameState) {
      gameState = await loadGameState<VersionedGameState>(slotId);
    }
    if (!gameState) return null;

    const nodeCount = Object.keys(gameState.nodes || {}).length;

    // Get images for this save
    const images = await getImagesBySaveId(slotId);
    const imageCount = images.length;

    // Get log count
    const logCount = gameState.logs?.length || 0;

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
      logCount,
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
  options: ExportOptions,
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

  // Clear logs if not included
  if (!options.includeLogs) {
    cleanState.logs = [];
  }

  return cleanState;
}

/**
 * Export a save to a ZIP file
 */
export async function exportSave(
  slotId: string,
  slot: SaveSlot,
  options: ExportOptions,
): Promise<Blob | null> {
  try {
    console.log(`[SaveExport] Starting export for slot ${slotId}`);

    // Load the full game state
    const derived = await loadDerivedStateFromLatestVfsSnapshot(slotId);
    let gameState = derived?.state ?? null;
    if (!gameState) {
      gameState = await loadGameState<VersionedGameState>(slotId);
    }
    if (!gameState) {
      console.error("[SaveExport] Failed to load game state (legacy + VFS)");
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
            const ext =
              image.blob.type === "image/png"
                ? "png"
                : image.blob.type === "image/jpeg"
                  ? "jpg"
                  : "webp";
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
            imagesFolder.file(
              `${image.id}.meta.json`,
              JSON.stringify(metadata, null, 2),
            );
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
        console.warn(
          "[SaveExport] Failed to export embeddings (RAG may not be initialized):",
          error,
        );
      }
    }

    // Clean slot for export (remove previewImage if images not included)
    const exportSlot: SaveSlot = { ...slot };
    if (!options.includeImages) {
      delete exportSlot.previewImage;
    }

    // Get log count for manifest
    const logCount = options.includeLogs ? cleanedState.logs?.length || 0 : 0;

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
        logs: options.includeLogs && logCount > 0,
      },
      stats: {
        nodeCount,
        imageCount,
        embeddingCount,
        logCount,
      },
      checksum,
    };

    zip.file("manifest.json", JSON.stringify(manifest, null, 2));

    // Add VFS snapshots if present (required for VFS-based restores/forking).
    try {
      const { snapshotCount } = await writeVfsSnapshotsToZip(zip, slotId);
      console.log(`[SaveExport] Exported ${snapshotCount} VFS snapshots`);
    } catch (error) {
      console.warn("[SaveExport] Failed to export VFS snapshots:", error);
    }

    // Generate ZIP blob
    const blob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    console.log(
      `[SaveExport] Export complete: ${(blob.size / 1024).toFixed(2)} KB`,
    );
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
      warnings.push(
        `Export version ${manifest.version} is newer than supported ${EXPORT_FORMAT_VERSION}. Some features may not work.`,
      );
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
      warnings.push(
        `Save requires migration from version ${migrationManager.getSaveVersion(saveData)} to ${CURRENT_SAVE_VERSION}.`,
      );
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
        warnings.push(
          "Images were marked as included but images folder is missing.",
        );
      }
    }

    // VFS snapshots are required for correct restore/fork behavior in newer builds.
    // If missing, we'll attempt to reconstruct from save.json during import.
    const hasVfsIndex = !!zip.file("vfs/index.json");
    if (!hasVfsIndex) {
      warnings.push(
        "This export does not include VFS snapshot history. The app will reconstruct VFS state from save.json during import; advanced restore/fork features may be limited.",
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      manifest,
      requiresMigration,
    };
  } catch (error) {
    errors.push(
      `Failed to parse import file: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
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
      errors.push(
        "This appears to be an old metadata-only export. It does not contain actual game data and cannot be imported.",
      );
      return { valid: false, errors, warnings };
    }

    // Check if it's a full game state
    if (data.nodes && data.inventory) {
      warnings.push(
        "This is a legacy JSON export. Some features may be missing.",
      );

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
          logs: false,
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
  const existingIds = new Set(existingSlots.map((s) => s.id));
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
  existingSlots: SaveSlot[],
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

      // Seed VFS so the save works with VFS-based persistence.
      try {
        const store = new IndexedDbVfsStore();
        const { snapshotCount, latest } = await createVfsSnapshotsFromLegacyState(
          store,
          newSlotId,
          saveData,
        );
        if (latest) {
          await saveMetadata(`vfs_latest:${newSlotId}`, {
            ...latest,
            updatedAt: Date.now(),
          });
        }
        console.log(`[SaveImport] Seeded ${snapshotCount} VFS snapshots from legacy JSON`);
      } catch (error) {
        console.warn("[SaveImport] Failed to seed VFS snapshots from legacy JSON:", error);
      }

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
        originalVersion: validation.requiresMigration
          ? getMigrationManager().getSaveVersion(JSON.parse(text))
          : undefined,
      };
    }

    // Handle ZIP format
    const zip = await JSZip.loadAsync(file);

    // Load save data
    const saveFile = zip.file("save.json");
    if (!saveFile) {
      return { success: false, error: "Missing save.json" };
    }

    let saveData = JSON.parse(
      await saveFile.async("text"),
    ) as VersionedGameState;

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
          const importResult = await getRAGService().importSaveData(
            embeddingsData,
            newSlotId,
          );
          console.log(
            `[SaveImport] Imported ${importResult.imported} RAG documents`,
          );
        } catch (error) {
          console.warn("[SaveImport] Failed to import embeddings:", error);
          warnings.push(
            "Failed to import embeddings. They will be regenerated.",
          );
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
    saveData._saveVersion.migratedFrom = validation.requiresMigration
      ? getMigrationManager().getSaveVersion(saveData)
      : undefined;

    // Save to IndexedDB
    await saveGameState(newSlotId, saveData);

    // Import VFS snapshot history (preferred) or reconstruct it from save.json (fallback).
    try {
      const store = new IndexedDbVfsStore();
      const vfsIndexFile = zip.file("vfs/index.json");
      if (vfsIndexFile) {
        const indexJson = await vfsIndexFile.async("text");
        const bundle = JSON.parse(indexJson) as VfsExportBundleIndex;
        const latestMeta = bundle?.latest ?? null;
        const snapshots = Array.isArray(bundle?.snapshots) ? bundle.snapshots : [];

        let imported = 0;
        for (const entry of snapshots) {
          if (
            !entry ||
            typeof entry.forkId !== "number" ||
            typeof entry.turn !== "number"
          ) {
            continue;
          }
          const snapshotFile = zip.file(
            `vfs/snapshots/fork-${entry.forkId}/turn-${entry.turn}.json`,
          );
          if (!snapshotFile) continue;
          const snapshotJson = await snapshotFile.async("text");
          const snapshot = JSON.parse(snapshotJson) as VfsSnapshot;
          if (!snapshot || typeof snapshot !== "object") continue;
          snapshot.saveId = newSlotId;
          await store.saveSnapshot(snapshot);
          imported += 1;
        }

        if (latestMeta && isValidLatestMeta(latestMeta)) {
          await saveMetadata(`vfs_latest:${newSlotId}`, {
            forkId: latestMeta.forkId,
            turn: latestMeta.turn,
            updatedAt: Date.now(),
          });
        } else if (imported > 0) {
          // Best-effort: use the latest by createdAt.
          const indexes = await listVfsSnapshotIndexEntries(newSlotId);
          const best = indexes.reduce((acc, item) => {
            if (!acc) return item;
            return item.createdAt > acc.createdAt ? item : acc;
          }, null as VfsExportIndexEntry | null);
          if (best) {
            await saveMetadata(`vfs_latest:${newSlotId}`, {
              forkId: best.forkId,
              turn: best.turn,
              updatedAt: Date.now(),
            });
          }
        }

        console.log(`[SaveImport] Imported ${imported} VFS snapshots`);
      } else {
        const { snapshotCount, latest } = await createVfsSnapshotsFromLegacyState(
          store,
          newSlotId,
          saveData,
        );
        if (latest) {
          await saveMetadata(`vfs_latest:${newSlotId}`, {
            ...latest,
            updatedAt: Date.now(),
          });
        }
        console.log(
          `[SaveImport] Reconstructed ${snapshotCount} VFS snapshots from save.json`,
        );
      }
    } catch (error) {
      console.warn("[SaveImport] Failed to import/reconstruct VFS snapshots:", error);
      warnings.push(
        "VFS snapshots failed to import. Restore/fork features may not work for this save until it is re-saved.",
      );
    }

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
      originalVersion: validation.requiresMigration
        ? validation.manifest?.saveVersion
        : undefined,
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
  newSaveId: string,
): Promise<Map<string, string>> {
  const mapping = new Map<string, string>();

  const files = Object.keys(imagesFolder.files);
  const imageFiles = files.filter(
    (f) => !f.endsWith(".meta.json") && !f.endsWith("/"),
  );

  for (const filename of imageFiles) {
    try {
      const file = imagesFolder.file(filename);
      if (!file) continue;

      // Extract old ID from filename
      const oldId = filename
        .replace(/\.(png|jpg|jpeg|webp)$/i, "")
        .split("/")
        .pop()!;

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
  mapping: Map<string, string>,
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
function generateUniqueName(
  baseName: string,
  existingSlots: SaveSlot[],
): string {
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
  return hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}
